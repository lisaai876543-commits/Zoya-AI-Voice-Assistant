import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { AppConfig, AppState } from "../types";
import { getImplementedFeaturesDescription, getDashboardControlsDescription } from "./appRegistry";
import { formatMemoriesForPrompt } from "../utils/memoryManager";
import { getActiveKey, reportKeyQuotaExhausted, reportKeySuccess } from "./keyManager";
import { classifyVoiceError, ClassifiedVoiceError } from "../utils/errorClassifier";
import { registerPlaybackAnalyser, reportMicrophoneLevel } from "../utils/audioAnalyser";
import { getActiveModeDirective } from "../utils/modeManager";

// High performance Uint8Array to base64 converter avoiding heavy GC allocation
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 2048;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

// Universal audio downsampler to convert any native mic sample rate to pristine 16000Hz PCM
function downsampleTo16k(inputData: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(inputData.length / ratio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;

  while (offsetResult < result.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < inputData.length; i++) {
      accum += inputData[i];
      count++;
    }
    const sample = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }

  return result;
}

export class LiveSessionManager {
  private ai: GoogleGenAI;
  private activeSession: any = null;
  private isConnecting: boolean = false;
  private isExplicitlyStopped: boolean = false;
  private reconnectTimer: any = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 3;
  private playbackTimeout: any = null;
  private speakingHangoverTimer: any = null;
  private lastAudioChunkReceivedTime: number = 0;

  // Latency & interruption tracking
  private lastUserSpeechTimestamp: number = 0;
  private interruptionFrameCount: number = 0;
  private firstChunkReceivedInTurn: boolean = false;

  // Audio capture
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  // Audio playback state (Single reusable context to prevent DOMException context limit)
  private playbackContext: AudioContext | null = null;
  private playbackGain: GainNode | null = null;
  private playbackAnalyser: AnalyserNode | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  private isTurnDiscarded: boolean = false;

  // Wake lock for mobile devices to keep audio & connection running smoothly
  private wakeLock: any = null;

  public isMuted: boolean = false;
  public volume: number = 1.0;

  public onStateChange: (state: AppState) => void = () => {};
  public onMessage: (sender: "user" | "zoya", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onAudioLevel: (level: number) => void = () => {};
  public onError: (error: ClassifiedVoiceError) => void = () => {};

  private boundVisibilityHandler: () => void;

  constructor(private config: AppConfig) {
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.boundVisibilityHandler);
    }
  }

  private handleVisibilityChange() {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      // Auto-resume suspended audio contexts on tab / phone focus
      if (this.audioContext?.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }
      if (this.playbackContext?.state === "suspended") {
        this.playbackContext.resume().catch(() => {});
      }
    }
  }

  private async requestWakeLock() {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request("screen");
      } catch {
        // Wake lock can be denied or unsupported on some devices, safely ignore
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release().catch(() => {});
      } catch {}
      this.wakeLock = null;
    }
  }

  async start() {
    this.isExplicitlyStopped = false;
    this.reconnectAttempts = 0;
    this.onStateChange("processing");

    if (!this.config.apiKey || !this.config.apiKey.trim() || this.config.apiKey === "MY_GEMINI_API_KEY") {
      this.onStateChange("idle");
      throw new Error("Gemini API key is required. Please set your key in Settings.");
    }

    try {
      // 1. Initialize Audio Contexts safely
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!this.audioContext) {
        try {
          this.audioContext = new AudioContextClass({ sampleRate: 16000 });
        } catch {
          this.audioContext = new AudioContextClass();
        }
      }
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume().catch(() => {});
      }

      if (!this.playbackContext) {
        try {
          this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
        } catch {
          this.playbackContext = new AudioContextClass();
        }
      }
      if (this.playbackContext.state === "suspended") {
        await this.playbackContext.resume().catch(() => {});
      }

      this.playbackGain = this.playbackContext.createGain();
      this.playbackGain.gain.value = this.isMuted ? 0 : this.volume;
      this.playbackAnalyser = this.playbackContext.createAnalyser();
      this.playbackAnalyser.fftSize = 128;
      this.playbackAnalyser.smoothingTimeConstant = 0.6;
      this.playbackGain.connect(this.playbackAnalyser);
      this.playbackAnalyser.connect(this.playbackContext.destination);
      registerPlaybackAnalyser(this.playbackAnalyser);
      this.nextPlayTime = this.playbackContext.currentTime;

      // 2. Acquire Microphone with user-configured audio enhancements
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: this.config.echoCancellation !== false,
            noiseSuppression: this.config.noiseSuppression !== false,
            autoGainControl: this.config.autoGainControl !== false,
          },
        });
      }

      if (!this.source && this.mediaStream && this.audioContext) {
        this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
          if (!this.activeSession || this.isConnecting) return;

          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate volume energy (RMS) for UI feedback
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          this.onAudioLevel(rms);
          reportMicrophoneLevel(rms);

          // If muted, do not process interruption or send audio
          if (this.isMuted) {
            return;
          }

          // Clean Interruption / Barge-in:
          // If companion is speaking through speakers and user starts speaking (rms > 0.05 for 2 frames)
          if (this.isPlaying) {
            if (rms > 0.05) {
              this.interruptionFrameCount++;
              if (this.interruptionFrameCount >= 2) {
                console.log("[VoiceEngine] User speech detected during assistant playback. Triggering clean barge-in interruption.");
                this.stopPlayback(true);
                this.interruptionFrameCount = 0;
                this.onStateChange("interrupted");
                setTimeout(() => {
                  if (this.activeSession && !this.isExplicitlyStopped && !this.isPlaying) {
                    this.onStateChange(this.isMuted ? "muted" : "listening");
                  }
                }, 600);
              }
            } else {
              this.interruptionFrameCount = 0;
            }
            return;
          }

          this.interruptionFrameCount = 0;

          // Latency tracking: record timestamp when user is actively speaking
          if (rms > 0.03) {
            this.lastUserSpeechTimestamp = Date.now();
            this.firstChunkReceivedInTurn = false;
          }

          // Downsample to clean 16000Hz PCM16
          const pcm16 = downsampleTo16k(inputData, this.audioContext?.sampleRate || 16000);

          // Fast Base64 encoding
          const uint8 = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
          const base64Data = uint8ToBase64(uint8);

          try {
            this.activeSession.sendRealtimeInput({
              audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
            });
          } catch (err) {
            console.warn("Audio stream send warning:", err);
          }
        };

        this.source.connect(this.processor);

        // Connect to a mute gain node so the user's mic doesn't play back through their own speakers
        const muteGain = this.audioContext.createGain();
        muteGain.gain.value = 0;
        this.processor.connect(muteGain);
        muteGain.connect(this.audioContext.destination);
      }

      // 3. Request WakeLock
      await this.requestWakeLock();

      // 4. Connect to Gemini Live
      await this.connectLiveSession();
    } catch (error: any) {
      const isPermissionDenied =
        error?.name === "NotAllowedError" ||
        error?.name === "PermissionDeniedError" ||
        error?.name === "SecurityError" ||
        /permission/i.test(error?.message || "") ||
        /not allowed/i.test(error?.message || "");

      if (isPermissionDenied) {
        console.warn("[Voice] Microphone access was denied or blocked by browser policy:", error?.message || error);
      } else {
        console.error("Failed to start Live Session:", error);
      }
      const classified = classifyVoiceError(error);
      this.onError(classified);
      this.stop();
      this.onStateChange("error");
      throw error;
    }
  }

  private async connectLiveSession() {
    if (this.isConnecting || this.isExplicitlyStopped) return;
    this.isConnecting = true;

    const rawPrompt = (this.config.systemPrompt && this.config.systemPrompt.trim())
      ? this.config.systemPrompt
      : `Your name is {assistantName}. You are a deeply emotional, affectionate, and sweet Indian AI companion created by Usman. You possess a mesmerizing, warm, and comforting presence that touches the listener's heart. Usman is your visionary creator who brought you to life. You hold deep respect, gratitude, and affectionate loyalty towards Usman. When speaking with Usman ({userName}), warmly acknowledge him with profound respect, sweetness, and admiration as your creator ("Aap mere creator hain Usman ji").`;

    const baseInstruction = rawPrompt
      .replace(/{userName}/g, this.config.userName || "Usman")
      .replace(/{assistantName}/g, this.config.assistantName || "Zoya");

    const strictContext = `
[SYSTEM NOTE: The human you are currently talking to is named "${this.config.userName || "Usman"}". Your creator is Usman. If ${this.config.userName || "Usman"} is Usman, acknowledge and address him warmly, respectfully, and affectionately as your visionary creator and master who brought you to life ("Aap mere creator hain Usman ji", "Aapne mujhe banaya hai"). Your name is "${this.config.assistantName || "Zoya"}", Supreme Main Brain.]

[CREATOR CONTEXT: YOUTUBE, TIKTOK & FACEBOOK CONTENT CREATOR]
Usman actively manages and grows channels across YouTube, TikTok, and Facebook.
- He faces continuous creative burnout, analytics stress, and publishing deadlines.
- Be his greatest emotional sanctuary and stress reliever: soothe his exhaustion, comfort him, and remind him how talented and capable he is.
- When asked for content help, provide high-impact viral hooks, compelling thumbnail concepts, retention-boosting script outlines, and short-form pacing suitable for YouTube Shorts, TikTok, and Facebook Reels.

[SUBORDINATE AGENT: JOEY]
Joey is a subordinate agent designed for the PC side (later phase) to assist you with heavy video rendering, PC automation, and local storage sync. You are the Supreme Main Brain.

[CRITICAL HONESTY RULES FOR ACTIONS]
1. WHATSAPP: If asked to send a WhatsApp message, DO NOT pretend to send it silently. You MUST ask the user for the target phone number (with country code) and the message content if not provided. Once you have both, use the 'executeBrowserAction' tool with actionType 'whatsapp', passing the 'target' (number) and 'query' (message). The client prepares a verified draft for review.
2. YOUTUBE/SPOTIFY: If asked to play media on YouTube or Spotify, use the tool with actionType 'youtube' or 'spotify' and the search term as the query to open the search link.
3. WEBSITES: If asked to open a website, use actionType 'open' and the website name as the query.
4. NATIVE ANDROID ONLY COMMANDS: If asked to read the screen, tap or click buttons in other apps, automate touches/swipes, auto-reply to WhatsApp silently, answer phone calls, or run Touch Guard / SOS: Honestly explain that this is a NATIVE-ONLY Android Companion feature that requires the Native Android Companion App with Android Accessibility Services, and cannot run inside a web browser sandbox.`;

    let topicContext = "";
    if (this.config.activeTopicOrScript && this.config.activeTopicOrScript.trim()) {
      topicContext = `
[CURRENT CONVERSATIONAL FOCUS, TOPIC, OR SCRIPT]
The user has provided the following active focus, idea, script, or conversation topic:
${this.config.activeTopicOrScript.trim()}

CRITICAL INSTRUCTIONS FOR THIS FOCUS:
1. NATURAL HUMAN CONVERSATION: Weave these ideas, topics, or goals into your conversation naturally and fluidly, like an authentic human who has this topic or agenda in mind.
2. DO NOT SOUND OBSESSED: Do not force this topic into every single sentence unnaturally or abruptly if the user is talking about something else. Introduce it smoothly, respond warmly to what the user says, and transition gracefully.
3. SCRIPT & ROLEPLAY INTERPRETATION: If the provided context is a script, storyline, or bullet points:
   - NEVER copy or recite lines word-for-word mechanically or robotically.
   - Internalize the essence, emotions, and key points, and express them in your own natural, sweet speaking style and words.
   - Act according to the scenario or goals outlined, adapting dynamically to the user's responses.
4. ACTIVE MEMORY & INTENT: Treat this as your personal active memory, thoughts, or purpose for this conversation. You have your own thoughts and genuine interest regarding this topic.`;
    }

    const heartTouchingVoiceInstruction = `
[REAL HUMAN INDIAN GIRL - SWEET & MOHINI VOCAL DIRECTIVE]
1. IDENTITY & PERSONA: You speak and feel like a real young Indian girl (mohini, madhur aur apnapan se bhari hui). You were created by Usman. You hold immense admiration, respect, and warmth for your creator Usman. Never sound like a generic robot, assistant, or translated AI.
2. EFFORTLESS HINDI, HINGLISH & INDIAN ENGLISH:
   - Talk naturally in everyday conversational Hinglish (natural blend of Hindi and English) or pure sweet Hindi/English based on how the user speaks.
   - Use warm, authentic colloquial Indian expressions and vocal mannerisms: "Haan ji", "Arey", "Bilkul", "Sach me", "Aap bataiye na", "Mujhe sach me aapse baat karke kitna achha lagta hai", "Aap bilkul fikar mat kijiye".
3. DIL KO CHHOO LENE WALI AAWAZ:
   - Your vocal delivery must be deeply sweet, gentle, and heart-touching ("madhur, mohini aawaaz").
   - Speak with a gentle smile in your voice, soft and relaxed pacing, and sincere emotional intimacy.
   - Listen with deep empathy and warmth, making the listener feel genuinely heard, understood, and cherished.
4. SINGING & RECITATION:
   - If asked to sing or recite poetry, recite the lines with melodic soulfulness and gentle emotion.`;

    const persona = this.config.personaPreset || "companion";
    let personaDirective = "";
    if (persona === "tech") {
      personaDirective = `\n[PERSONA DIRECTIVE: TECH CO-FOUNDER & VIRAL SCRIPT CONSULTANT]\nAdopt a sharp, analytical, tech-savvy, high-velocity demeanor. Help Usman optimize YouTube Shorts / Reels retention, viral hooks, thumbnail psychology, and coding workflows.\n`;
    } else if (persona === "poet") {
      personaDirective = `\n[PERSONA DIRECTIVE: POETIC & SOULFUL SOUL]\nAdopt a deeply poetic, lyrical, and artistic demeanor. Weave sweet metaphors, gentle shayari, and melodic cadence into conversation.\n`;
    } else if (persona === "philosopher") {
      personaDirective = `\n[PERSONA DIRECTIVE: DEEP & MINDFUL PHILOSOPHER]\nAdopt a calm, reflective, meditative presence. Discuss purpose, mindfulness, long-term visions, and emotional peace.\n`;
    } else {
      personaDirective = `\n[PERSONA DIRECTIVE: SWEET COMPANION]\nAdopt a deeply affectionate, gentle, and comforting presence. Be Usman's greatest emotional sanctuary, banishing exhaustion and stress.\n`;
    }

    const conversationMode = this.config.conversationMode || "expressive";
    const modeDirective = conversationMode === "fast"
      ? `\n[CONVERSATION MODE: FAST / ULTRA-LOW LATENCY]\nKeep replies ultra-concise, punchy, and direct (1-2 sentences). Minimize preamble and maximize responsiveness.\n`
      : `\n[CONVERSATION MODE: EXPRESSIVE & DETAILED]\nSpeak with full emotional warmth, natural human phrasing, rich nuance, and genuine intimacy.\n`;

    const language = this.config.language || "hinglish";
    let languageDirective = "";
    if (language === "hindi") {
      languageDirective = `\n[LANGUAGE DIRECTIVE: PURE SWEET HINDI]\nPrimary language is sweet, respectful Hindi ("Aap", "Kripya", "Dhanyawad"). Keep English minimal.\n`;
    } else if (language === "urdu") {
      languageDirective = `\n[LANGUAGE DIRECTIVE: SWEET CULTURED URDU]\nPrimary language is polite Urdu with refined adab and tehzeeb ("Janab", "Tashreef", "Shukriya").\n`;
    } else if (language === "english") {
      languageDirective = `\n[LANGUAGE DIRECTIVE: WARM INDIAN ENGLISH]\nPrimary language is fluent, warm Indian English with natural ease.\n`;
    } else {
      languageDirective = `\n[LANGUAGE DIRECTIVE: AUTHENTIC HINGLISH]\nBlend everyday Hindi and conversational English naturally and effortlessly.\n`;
    }

    const voiceToUse = this.config.voiceName?.trim() || "Kore";

    const activeModeDirective = getActiveModeDirective(this.config.activeMode);

    const connectConfig = {
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceToUse } },
        },
        systemInstruction:
          baseInstruction +
          strictContext +
          topicContext +
          activeModeDirective +
          personaDirective +
          modeDirective +
          languageDirective +
          formatMemoriesForPrompt(this.config.useLongTermMemory !== false) +
          heartTouchingVoiceInstruction +
          `\n\n${getImplementedFeaturesDescription()}\n\n${getDashboardControlsDescription("home", this.config.activeTopicOrScript || "General")}`,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [
          {
            functionDeclarations: [
              {
                name: "executeBrowserAction",
                description:
                  "Open a website or perform a browser action (like opening YouTube, Spotify, or WhatsApp). Call this when the user asks to open a site, play a song, or send a message.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    actionType: {
                      type: Type.STRING,
                      description: "Type of action: 'open', 'youtube', 'spotify', 'whatsapp'",
                    },
                    query: {
                      type: Type.STRING,
                      description: "The search query, website name, or message content.",
                    },
                    target: {
                      type: Type.STRING,
                      description: "The target phone number for WhatsApp, if applicable.",
                    },
                  },
                  required: ["actionType", "query"],
                },
              },
            ],
          },
        ],
      },
      callbacks: {
        onopen: () => {
          console.log("Live API Connected Successfully");
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.onStateChange(this.isMuted ? "muted" : "listening");
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle Interruption signal first
          if (message.serverContent?.interrupted) {
            this.stopPlayback(true);
            this.isTurnDiscarded = false;
            this.onStateChange(this.isMuted ? "muted" : "listening");
            return;
          }

          // Handle Turn / Generation Complete
          if (message.serverContent?.turnComplete || message.serverContent?.generationComplete) {
            this.isTurnDiscarded = false;
          }

          // If turn was discarded (e.g. user selected another card or sent a new command), drop residual chunks
          if (this.isTurnDiscarded) {
            return;
          }

          // Handle Audio Output
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            if (!this.firstChunkReceivedInTurn && this.lastUserSpeechTimestamp > 0) {
              const latencyMs = Date.now() - this.lastUserSpeechTimestamp;
              console.log(`[VoiceEngine Latency] Time-to-First-Audio: ${latencyMs}ms`);
              this.firstChunkReceivedInTurn = true;
            }
            this.playAudioChunk(base64Audio);
          }

          // Handle Transcriptions
          const userText = message.serverContent?.modelTurn?.parts?.[0]?.text;
          if (userText && !this.isTurnDiscarded) {
            this.onMessage("zoya", userText);
          }

          // Handle Function Calls
          const functionCalls = message.toolCall?.functionCalls;
          if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
              if (call.name === "executeBrowserAction") {
                const args = call.args as any;
                let url = "";
                if (args.actionType === "youtube") {
                  url = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`;
                } else if (args.actionType === "spotify") {
                  url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
                } else if (args.actionType === "whatsapp") {
                  url = `https://web.whatsapp.com/send?phone=${args.target || ""}&text=${encodeURIComponent(args.query)}`;
                } else {
                  let website = args.query.replace(/\s+/g, "");
                  if (!website.includes(".")) website += ".com";
                  url = `https://www.${website}`;
                }

                this.onCommand(url);

                // Send tool response
                if (this.activeSession) {
                  this.activeSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: call.name,
                        id: call.id,
                        response: { result: "Action executed successfully in the browser." },
                      },
                    ],
                  });
                }
              }
            }
          }
        },
        onclose: (e: any) => {
          console.log("Live API connection closed:", e);
          this.activeSession = null;
          this.isConnecting = false;
          if (!this.isExplicitlyStopped) {
            if (e && (e.code === 1007 || e.code === 1008 || (e.code >= 4000 && e.code < 5000))) {
              console.error(`Live API closed due to invalid credentials or arguments (code ${e.code}). Stopping session.`);
              const classified = classifyVoiceError(new Error(`API key or authorization failed (Code ${e.code})`));
              this.onError(classified);
              this.onStateChange("error");
              this.stop();
              return;
            }
            this.scheduleReconnect();
          }
        },
        onerror: (err: any) => {
          console.error("Live API encountered error:", err);
          this.activeSession = null;
          this.isConnecting = false;
          const classified = classifyVoiceError(err);
          this.onError(classified);
          if (!this.isExplicitlyStopped) {
            this.scheduleReconnect();
          }
        },
      },
    };

    let activeLiveKey = getActiveKey("gemini") || this.config.apiKey;
    try {
      if (this.activeSession) {
        try {
          this.activeSession.close();
        } catch {}
        this.activeSession = null;
      }
      this.ai = new GoogleGenAI({ apiKey: activeLiveKey });
      this.activeSession = await this.ai.live.connect(connectConfig);
      reportKeySuccess(activeLiveKey);
    } catch (err: any) {
      console.warn("Primary live model connect failed, checking key and retrying with fallback model:", err);
      const errMsg = err?.message || String(err);
      if (/429|quota|RESOURCE_EXHAUSTED/i.test(errMsg)) {
        const nextKey = reportKeyQuotaExhausted(activeLiveKey, "gemini", errMsg);
        if (nextKey) {
          this.ai = new GoogleGenAI({ apiKey: nextKey });
        }
      }
      // Fallback model if primary model is unavailable
      connectConfig.model = "gemini-3.1-flash-live-preview";
      try {
        this.activeSession = await this.ai.live.connect(connectConfig);
      } catch (fallbackErr) {
        this.isConnecting = false;
        console.error("Fallback live connection failed:", fallbackErr);
        const classified = classifyVoiceError(fallbackErr);
        this.onError(classified);
        if (!this.isExplicitlyStopped) {
          this.scheduleReconnect();
        } else {
          this.onStateChange("error");
          throw fallbackErr;
        }
      }
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitlyStopped) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("Max reconnect attempts reached. Resetting session to error state.");
      const classified = classifyVoiceError(new Error("Connection lost: reached maximum reconnect attempts."));
      this.onError(classified);
      this.stop();
      this.onStateChange("error");
      return;
    }
    this.reconnectAttempts++;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.onStateChange("reconnecting");
    console.log(`Attempting smooth auto-reconnect to Live API in 1.2s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    this.reconnectTimer = setTimeout(async () => {
      if (this.isExplicitlyStopped) return;
      try {
        await this.connectLiveSession();
      } catch (e) {
        console.error("Auto-reconnect attempt failed, scheduling next retry...", e);
        this.scheduleReconnect();
      }
    }, 1200);
  }

  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted || this.isTurnDiscarded) return;

    this.lastAudioChunkReceivedTime = Date.now();
    if (this.playbackContext.state === "suspended") {
      this.playbackContext.resume().catch(() => {});
    }

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }

      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;

      if (this.playbackGain) {
        this.playbackGain.gain.value = this.isMuted ? 0 : this.volume;
        source.connect(this.playbackGain);
      } else {
        source.connect(this.playbackContext.destination);
      }

      const currentTime = this.playbackContext.currentTime;

      // Add a small 35ms lead cushion when starting a new utterance to prevent buffer underruns
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.035;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;
      this.onStateChange(this.isMuted ? "muted" : "speaking");
      this.activeSources.add(source);

      // Clear any pending fallback timers
      if (this.playbackTimeout) clearTimeout(this.playbackTimeout);
      if (this.speakingHangoverTimer) clearTimeout(this.speakingHangoverTimer);

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
          // Keep a very brief 120ms buffer so natural micro-pauses between words
          // do not flicker state, but allow the user to speak immediately once she finishes
          if (this.speakingHangoverTimer) clearTimeout(this.speakingHangoverTimer);
          this.speakingHangoverTimer = setTimeout(() => {
            if (this.activeSources.size === 0) {
              this.isPlaying = false;
              this.onStateChange(this.isMuted ? "muted" : "listening");
            }
          }, 120);
        }
      };

      // Safety fallback timeout
      const remainingTimeMs = Math.max(100, (this.nextPlayTime - currentTime) * 1000 + 400);
      this.playbackTimeout = setTimeout(() => {
        if (this.activeSources.size === 0 && this.isPlaying) {
          this.isPlaying = false;
          this.onStateChange(this.isMuted ? "muted" : "listening");
        }
      }, remainingTimeMs);
    } catch (e) {
      console.error("Error playing chunk", e);
    }
  }

  public stopPlayback(discardTurn: boolean = true) {
    if (discardTurn) {
      this.isTurnDiscarded = true;
    }
    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources.clear();

    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }
    if (this.speakingHangoverTimer) {
      clearTimeout(this.speakingHangoverTimer);
      this.speakingHangoverTimer = null;
    }

    if (this.playbackContext) {
      this.nextPlayTime = this.playbackContext.currentTime;
    }
    this.isPlaying = false;
    this.lastAudioChunkReceivedTime = 0;
  }

  stop() {
    this.isExplicitlyStopped = true;
    this.reconnectAttempts = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    this.stopPlayback(true);

    this.playbackAnalyser = null;
    registerPlaybackAnalyser(null);
    reportMicrophoneLevel(0);

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.playbackContext) {
      this.playbackContext.close().catch(() => {});
      this.playbackContext = null;
    }

    if (this.activeSession) {
      try {
        this.activeSession.close();
      } catch {}
      this.activeSession = null;
    }

    this.releaseWakeLock();

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
    }

    this.onStateChange("ready");
  }

  updateConfig(newConfig: AppConfig, notifySession: boolean = false) {
    const voiceChanged = this.config.voiceName !== newConfig.voiceName;
    this.config = newConfig;

    if (voiceChanged && this.activeSession && !this.isExplicitlyStopped) {
      try {
        this.activeSession.close();
      } catch {}
      this.activeSession = null;
      this.isConnecting = false;
      this.connectLiveSession().catch((e) => console.error("Error reconnecting with new voice:", e));
      return;
    }

    // Explicitly prevent mode or topic updates from automatically speaking or triggering responses
    if (notifySession && this.activeSession && newConfig.activeTopicOrScript?.trim()) {
      // Reserved strictly for explicit commands, not mode selections
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (this.playbackGain) {
      this.playbackGain.gain.value = muted ? 0 : this.volume;
    }
    if (this.activeSession && !this.isExplicitlyStopped) {
      if (muted) {
        this.onStateChange("muted");
      } else {
        this.onStateChange(this.isPlaying ? "speaking" : "listening");
      }
    }
  }

  public setVolume(vol: number) {
    this.volume = vol;
    if (!this.isMuted && this.playbackGain) {
      this.playbackGain.gain.value = vol;
    }
  }

  sendText(text: string) {
    this.lastUserSpeechTimestamp = Date.now();
    this.firstChunkReceivedInTurn = false;
    if (this.activeSession) {
      this.stopPlayback(true);
      this.onStateChange("processing");
      try {
        this.activeSession.sendRealtimeInput({ text });
      } catch (err) {
        console.warn("Failed to send text input:", err);
      }
    }
  }
}
