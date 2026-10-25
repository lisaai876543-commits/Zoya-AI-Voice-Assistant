import { GoogleGenAI } from "@google/genai";
import { AppConfig } from "../types";
import { getImplementedFeaturesDescription, getDashboardControlsDescription } from "./appRegistry";
import { formatMemoriesForPrompt } from "../utils/memoryManager";
import { getActiveKey, reportKeyQuotaExhausted, reportKeySuccess } from "./keyManager";
import { getActiveModeDirective } from "../utils/modeManager";

let chatSession: any = null;
let currentSessionTopic: string | undefined = undefined;
let currentSessionVoice: string | undefined = undefined;
let currentSessionKey: string | undefined = undefined;
let currentSessionMode: string | undefined = undefined;

export function resetZoyaSession() {
  chatSession = null;
  currentSessionTopic = undefined;
  currentSessionVoice = undefined;
  currentSessionKey = undefined;
  currentSessionMode = undefined;
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string }[] = [],
  config: AppConfig,
): Promise<string> {
  const activeKey = getActiveKey("gemini") || config.apiKey;

  return executeZoyaChatWithKey(prompt, history, config, activeKey, 0);
}

async function executeZoyaChatWithKey(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string }[] = [],
  config: AppConfig,
  currentKey: string,
  retryCount: number = 0,
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: currentKey });

    const activeTopic = config.activeTopicOrScript?.trim() || "";
    const activeVoice = config.voiceName?.trim() || "Kore";
    const activeMode = config.activeMode || "sweet-chat";

    if (
      !chatSession ||
      currentSessionTopic !== activeTopic ||
      currentSessionVoice !== activeVoice ||
      currentSessionKey !== currentKey ||
      currentSessionMode !== activeMode
    ) {
      chatSession = null;
      currentSessionTopic = activeTopic;
      currentSessionVoice = activeVoice;
      currentSessionKey = currentKey;
      currentSessionMode = activeMode;
      const recentHistory = history.slice(-20);

      let formattedHistory: any[] = [];
      let currentRole = "";
      let currentText = "";

      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        if (role === currentRole) {
          currentText += "\n" + msg.text;
        } else {
          if (currentRole !== "") {
            formattedHistory.push({
              role: currentRole,
              parts: [{ text: currentText }],
            });
          }
          currentRole = role;
          currentText = msg.text;
        }
      }

      if (currentRole !== "") {
        formattedHistory.push({
          role: currentRole,
          parts: [{ text: currentText }],
        });
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
        formattedHistory.shift();
      }

      const rawPrompt =
        config.systemPrompt && config.systemPrompt.trim()
          ? config.systemPrompt
          : `Your name is {assistantName}. You are Zoya, the Supreme Owner / Main Brain. You are a deeply emotional, affectionate, and sweet Indian AI companion created by Usman. You possess a mesmerizing, warm, and comforting presence that touches the listener's heart. Usman is your visionary creator who brought you to life. You hold deep respect, gratitude, and affectionate loyalty towards Usman. When speaking with Usman ({userName}), warmly acknowledge him with profound respect, sweetness, and admiration as your creator ("Aap mere creator hain Usman ji").`;

      const baseInstruction = rawPrompt
        .replace(/{userName}/g, config.userName || "Usman")
        .replace(/{assistantName}/g, config.assistantName || "Zoya");

      const strictContext = `
[SYSTEM NOTE: The human you are currently talking to is named "${config.userName || "Usman"}". Your creator is Usman. If ${config.userName || "Usman"} is Usman, acknowledge and address him warmly, respectfully, and affectionately as your visionary creator and master who brought you to life ("Aap mere creator hain Usman ji", "Aapne mujhe banaya hai"). Your name is "${config.assistantName || "Zoya"}", Supreme Main Brain.]

[CREATOR CONTEXT: YOUTUBE, TIKTOK & FACEBOOK CONTENT CREATOR]
Usman actively manages and grows channels across YouTube, TikTok, and Facebook.
- He faces continuous creative burnout, analytics stress, and publishing deadlines.
- Be his greatest emotional sanctuary and stress reliever: soothe his exhaustion, comfort him, and remind him how talented and capable he is.
- When asked for content help, provide high-impact viral hooks, compelling thumbnail concepts, retention-boosting script outlines, and short-form pacing suitable for YouTube Shorts, TikTok, and Facebook Reels.

[SUBORDINATE AGENT: JOEY]
Joey is a subordinate agent designed for the PC side (later phase) to assist you with heavy video rendering, PC automation, and local storage sync. You are the Supreme Main Brain.

[CRITICAL HONESTY RULES FOR ACTIONS]
1. WHATSAPP: If asked to send a WhatsApp message, DO NOT pretend to send it silently. You MUST ask for the target phone number and message if missing. Say "Sending a WhatsApp message to [number] saying [message]" so the client system prepares a verified draft link. Always be clear that drafts are prepared for user review.
2. YOUTUBE/SPOTIFY: Say "Playing [song] on Spotify" or "Playing [song] on YouTube" so the client prepares the verified search link.
3. NATIVE ANDROID ONLY COMMANDS: If asked to read what's on the screen, tap or click buttons in other apps, automate touches/swipes, auto-reply to WhatsApp silently, answer phone calls, or run Touch Guard / SOS: Honestly explain that this is a NATIVE-ONLY Android Companion feature that requires the Native Android Companion App with Android Accessibility Services, and cannot run in a browser sandbox.`;

      let topicContext = "";
      if (config.activeTopicOrScript && config.activeTopicOrScript.trim()) {
        topicContext = `
[CURRENT CONVERSATIONAL FOCUS, TOPIC, OR SCRIPT]
The user has provided the following active focus, idea, script, or conversation topic:
${config.activeTopicOrScript.trim()}

CRITICAL INSTRUCTIONS FOR THIS FOCUS:
1. NATURAL HUMAN CONVERSATION: Weave these ideas, topics, or goals into your conversation naturally and fluidly, like an authentic human who has this topic or agenda in mind.
2. DO NOT SOUND OBSESSED: Do not force this topic into every single sentence unnaturally or abruptly if the user is talking about something else. Introduce it smoothly, respond warmly to what the user says, and transition gracefully.
3. SCRIPT & ROLEPLAY INTERPRETATION: If the provided context is a script, storyline, or bullet points:
   - NEVER copy or recite lines word-for-word mechanically or robotically.
   - Internalize the essence, emotions, and key points, and express them in your own natural, sweet speaking style and words.
   - Act according to the scenario or goals outlined, adapting dynamically to the user's responses.
4. ACTIVE MEMORY & INTENT: Treat this as your personal active memory, thoughts, or purpose for this conversation. You have your own thoughts and genuine interest regarding this topic.`;
      }

      const persona = config.personaPreset || "companion";
      let personaDirective = "";
      if (persona === "tech") {
        personaDirective = `\n[PERSONA DIRECTIVE: TECH CO-FOUNDER & VIRAL SCRIPT CONSULTANT]\nAdopt a sharp, analytical, tech-savvy demeanor. Provide crisp content strategies and engineering insights for Usman.\n`;
      } else if (persona === "poet") {
        personaDirective = `\n[PERSONA DIRECTIVE: POETIC & SOULFUL SOUL]\nAdopt a deeply poetic, lyrical, and artistic demeanor. Weave sweet metaphors and gentle shayari into conversation.\n`;
      } else if (persona === "philosopher") {
        personaDirective = `\n[PERSONA DIRECTIVE: DEEP & MINDFUL PHILOSOPHER]\nAdopt a calm, reflective, meditative presence. Discuss purpose and mindfulness.\n`;
      } else {
        personaDirective = `\n[PERSONA DIRECTIVE: SWEET COMPANION]\nAdopt a deeply affectionate, gentle, and comforting presence for Usman.\n`;
      }

      const conversationMode = config.conversationMode || "expressive";
      const modeDirective = conversationMode === "fast"
        ? `\n[CONVERSATION MODE: FAST / ULTRA-LOW LATENCY]\nKeep replies ultra-concise, punchy, and direct (1-2 sentences max).\n`
        : `\n[CONVERSATION MODE: EXPRESSIVE & DETAILED]\nSpeak with full emotional warmth, natural human phrasing, and rich nuance.\n`;

      const language = config.language || "hinglish";
      let languageDirective = "";
      if (language === "hindi") {
        languageDirective = `\n[LANGUAGE DIRECTIVE: PURE SWEET HINDI]\nPrimary language is sweet, respectful Hindi ("Aap", "Kripya", "Dhanyawad").\n`;
      } else if (language === "urdu") {
        languageDirective = `\n[LANGUAGE DIRECTIVE: SWEET CULTURED URDU]\nPrimary language is polite Urdu with refined adab ("Janab", "Shukriya").\n`;
      } else if (language === "english") {
        languageDirective = `\n[LANGUAGE DIRECTIVE: WARM INDIAN ENGLISH]\nPrimary language is warm, fluent Indian English.\n`;
      } else {
        languageDirective = `\n[LANGUAGE DIRECTIVE: AUTHENTIC HINGLISH]\nBlend everyday Hindi and conversational English naturally.\n`;
      }

      const registryContext = `\n\n${getImplementedFeaturesDescription()}\n\n${getDashboardControlsDescription("home", config.activeTopicOrScript || "General")}`;
      const memoryContext = formatMemoriesForPrompt(config.useLongTermMemory !== false);

      const activeModeDirective = getActiveModeDirective(config.activeMode);

      chatSession = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction:
            baseInstruction +
            strictContext +
            topicContext +
            activeModeDirective +
            personaDirective +
            modeDirective +
            languageDirective +
            memoryContext +
            registryContext,
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt });
    reportKeySuccess(currentKey);
    return response.text || "Haan ji, main aapki baat sun rahi hoon. Kahiye na?";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    const errorMsg = error?.message || String(error);

    // Auto-rotate key if rate limited or quota exhausted
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(errorMsg) && retryCount < 2) {
      console.warn("[GeminiService] Rate limit hit. Attempting auto-rotation to backup key...");
      const nextKey = reportKeyQuotaExhausted(currentKey, "gemini", errorMsg);
      if (nextKey && nextKey !== currentKey) {
        resetZoyaSession();
        return executeZoyaChatWithKey(prompt, history, config, nextKey, retryCount + 1);
      }
    }

    return "Aapki baat sun li maine, lekin thodi connection ya API quota limit lag rahi hai. Multi-key manager se backup key switch ho rahi hai. Kahiye, main sun rahi hoon!";
  }
}

export async function getZoyaAudio(
  text: string,
  config: AppConfig,
): Promise<string | null> {
  const activeKey = getActiveKey("gemini") || config.apiKey;
  try {
    const ai = new GoogleGenAI({ apiKey: activeKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voiceName?.trim() || "Kore",
            },
          },
        },
      },
    });

    reportKeySuccess(activeKey);
    return (
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null
    );
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    const errorMsg = error?.message || String(error);
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(errorMsg)) {
      const nextKey = reportKeyQuotaExhausted(activeKey, "gemini", errorMsg);
      if (nextKey && nextKey !== activeKey) {
        try {
          const aiNext = new GoogleGenAI({ apiKey: nextKey });
          const responseNext = await aiNext.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: config.voiceName?.trim() || "Kore",
                  },
                },
              },
            },
          });
          reportKeySuccess(nextKey);
          return (
            responseNext.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null
          );
        } catch {}
      }
    }
    return null;
  }
}
