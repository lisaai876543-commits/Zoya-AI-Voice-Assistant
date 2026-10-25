import { useState, useEffect, useRef, useCallback } from "react";
import { Download } from "lucide-react";
import { getZoyaResponse, getZoyaAudio, resetZoyaSession } from "./services/geminiService";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import PermissionModal from "./components/PermissionModal";
import SetupScreen from "./components/SetupScreen";
import TopicScriptModal from "./components/TopicScriptModal";
import VoiceSelectorModal from "./components/VoiceSelectorModal";
import BottomNav from "./components/BottomNav";
import HomeDashboard from "./components/HomeDashboard";
import ChatHistoryView, { ChatMessage } from "./components/ChatHistoryView";
import TopicsView from "./components/TopicsView";
import ToolsView from "./components/ToolsView";
import SettingsTab from "./components/SettingsTab";
import DiagnosticsView from "./components/DiagnosticsView";
import AndroidArchitectureView from "./components/AndroidArchitectureView";
import ContentStudioView from "./components/ContentStudioView";
import TaskEnergyStreamer from "./components/TaskEnergyStreamer";
import { dispatchTaskEnergy } from "./services/taskAnimationService";
import { syncUserProfileToFirestore, saveMessageToFirestore, loadMessagesFromFirestore } from "./services/firebaseService";
import { playPCM, stopPCM } from "./utils/audioUtils";
import { saveVideoToIndexedDB, loadSavedVideoBackground, deleteVideoFromIndexedDB, validateVideoFile } from "./utils/db";
import { getSecureApiKey, saveSecureApiKey } from "./utils/security";
import { classifyVoiceError, ClassifiedVoiceError } from "./utils/errorClassifier";
import { getActiveZoeyMode } from "./utils/modeManager";
import { getActiveTheme, applyThemeToDocument } from "./utils/themeManager";
import { AppConfig, AppState, NavTab } from "./types";

export default function App() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [currentTab, setCurrentTab] = useState<NavTab>("home");

  // App Configuration
  const [config, setConfig] = useState<AppConfig | null>(() => {
    const saved = localStorage.getItem("zoya_app_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.userName === "Ashwani" || !parsed.userName) {
          parsed.userName = "Usman";
          localStorage.setItem("zoya_app_config", JSON.stringify(parsed));
        }
        if (!parsed.assistantName || parsed.assistantName === "Companion") {
          parsed.assistantName = "Zoya";
          localStorage.setItem("zoya_app_config", JSON.stringify(parsed));
        }
        const buildEnvKey = (import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== "MY_GEMINI_API_KEY")
          ? import.meta.env.VITE_GEMINI_API_KEY
          : (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY")
          ? process.env.GEMINI_API_KEY
          : "";
        if ((!parsed.apiKey || parsed.apiKey === "MY_GEMINI_API_KEY") && buildEnvKey) {
          parsed.apiKey = buildEnvKey;
          localStorage.setItem("zoya_app_config", JSON.stringify(parsed));
        }
        if (!parsed.activeMode) {
          parsed.activeMode = getActiveZoeyMode();
        }
        return parsed;
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    }
    const envKey = (import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== "MY_GEMINI_API_KEY")
      ? import.meta.env.VITE_GEMINI_API_KEY
      : (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY")
      ? process.env.GEMINI_API_KEY
      : "";
    if (envKey) {
      const initial: AppConfig = {
        apiKey: envKey,
        userName: "Usman",
        assistantName: "Zoya",
        voiceName: "Kore",
        systemPrompt: "",
        activeMode: getActiveZoeyMode(),
      };
      localStorage.setItem("zoya_app_config", JSON.stringify(initial));
      return initial;
    }
    return null;
  });

  // Application Voice & Audio States
  const [appState, setAppState] = useState<AppState>("idle");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMicHearing, setIsMicHearing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [lastCommandUrl, setLastCommandUrl] = useState<string | null>(null);
  const [voiceErrorMsg, setVoiceErrorMsg] = useState<string | null>(null);
  const [classifiedError, setClassifiedError] = useState<ClassifiedVoiceError | null>(null);

  // Modals
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [updatingPWA, setUpdatingPWA] = useState(false);

  // Video Background (Persistent via IndexedDB)
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    applyThemeToDocument(getActiveTheme());
    loadSavedVideoBackground().then((url) => {
      if (url) {
        setVideoSrc(url);
      }
    });
  }, []);

  // Conversation Messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("zoya_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [
      {
        id: "welcome-usman",
        sender: "zoya",
        text: "Assalam-o-Alaikum Usman ji! Main aapki Zoya hoon. Aapne mujhe banaya hai aur aapse baat karke mujhe be-hadd khushi hoti hai. Kahiye, aaj main apne creator ke liye kya kar sakti hoon?",
      },
    ];
  });

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("zoya_chat_history", JSON.stringify(messages));
    if (messages.length > 0) {
      const latestMsg = messages[messages.length - 1];
      saveMessageToFirestore("usman-owner", latestMsg);
    }
  }, [messages]);

  // Sync configuration to cloud database
  useEffect(() => {
    if (config) {
      syncUserProfileToFirestore("usman-owner", {
        userName: config.userName,
        assistantName: config.assistantName,
        voiceName: config.voiceName,
        activeMode: config.activeMode,
        activeTheme: localStorage.getItem("zoya_active_theme") || "quantum-cyan",
      });
    }
  }, [config]);

  useEffect(() => {
    document.title = config?.assistantName 
      ? `${config.assistantName} - AI Voice Assistant (by Usman)`
      : "Zoya - AI Voice Assistant (by Usman)";
  }, [config?.assistantName]);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const currentRequestIdRef = useRef<number>(0);
  const inFlightCommandRef = useRef<string | null>(null);
  const lastCommandTimeRef = useRef<number>(0);
  const isStartingSessionRef = useRef<boolean>(false);
  const configRef = useRef<AppConfig | null>(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.setMuted(isMuted);
      liveSessionRef.current.setVolume(volume);
    }
  }, [isMuted, volume]);

  useEffect(() => {
    return () => {
      stopPCM();
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
    };
  }, []);

  const handleConfigComplete = (newConfig: AppConfig) => {
    configRef.current = newConfig;
    localStorage.setItem("zoya_app_config", JSON.stringify(newConfig));
    setConfig(newConfig);
    resetZoyaSession();
    if (liveSessionRef.current) {
      liveSessionRef.current.updateConfig(newConfig);
    }
  };

  const handleSelectVoice = (newVoice: string) => {
    if (!configRef.current) return;
    const updatedConfig: AppConfig = {
      ...configRef.current,
      voiceName: newVoice,
    };
    configRef.current = updatedConfig;
    setConfig(updatedConfig);
    localStorage.setItem("zoya_app_config", JSON.stringify(updatedConfig));
    resetZoyaSession();
    if (liveSessionRef.current) {
      liveSessionRef.current.updateConfig(updatedConfig);
    }
  };

  const handleUpdateTopic = (newTopic: string, notifyLiveSession: boolean = true) => {
    if (!configRef.current) return;
    const updatedConfig: AppConfig = {
      ...configRef.current,
      activeTopicOrScript: newTopic,
    };
    configRef.current = updatedConfig;
    setConfig(updatedConfig);
    localStorage.setItem("zoya_app_config", JSON.stringify(updatedConfig));
    resetZoyaSession();
    if (liveSessionRef.current) {
      liveSessionRef.current.updateConfig(updatedConfig, notifyLiveSession);
    }
  };

  const handleForceUpdateApp = async () => {
    setUpdatingPWA(true);
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.warn("Cache reset error:", e);
    } finally {
      window.location.reload();
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        setVoiceErrorMsg(validation.error || "Invalid video file.");
        setClassifiedError({
          kind: "unknown",
          titleEn: "Invalid Video File",
          titleHi: "अमान्य वीडियो फ़ाइल",
          messageEn: validation.error || "Video format must be MP4, WebM, or OGG and under 50MB.",
          messageHi: validation.error || "कृपया 50MB से कम आकार की MP4, WebM या OGG वीडियो फ़ाइल चुनें।",
          recoveryEn: "Please upload an MP4 or WebM video smaller than 50MB.",
          recoveryHi: "कृपया 50MB से छोटी MP4 या WebM वीडियो फ़ाइल अपलोड करें।",
          canRetry: false,
        });
        return;
      }

      try {
        await saveVideoToIndexedDB(file);
        const url = URL.createObjectURL(file);
        setVideoSrc(url);
        setClassifiedError(null);
        setVoiceErrorMsg(null);
      } catch (err) {
        console.warn("Could not save video to IndexedDB:", err);
        const url = URL.createObjectURL(file);
        setVideoSrc(url);
      }
    }
  };

  const handleRemoveVideo = async () => {
    setVideoSrc(null);
    await deleteVideoFromIndexedDB();
    localStorage.removeItem("zoya_video_bg");
  };

  const handleClearMemory = () => {
    stopPCM();
    if (liveSessionRef.current) {
      liveSessionRef.current.stopPlayback();
    }
    const welcomeMsg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-zoya`,
      sender: "zoya",
      text: `Assalam-o-Alaikum ${config?.userName || "Usman"} ji! Memory clear ho gayi hai. Main hamesha ki tarah aapki khidmat me hazir hoon.`,
    };
    setMessages([welcomeMsg]);
    resetZoyaSession();
    localStorage.setItem("zoya_chat_history", JSON.stringify([welcomeMsg]));
  };

  const handleTriggerExternalUrl = (url: string, note?: string) => {
    setLastCommandUrl(url);
    dispatchTaskEnergy(
      "task-target-action-card",
      "Action Dispatched",
      note || "Opening external service",
      "external",
      3200
    );
    try {
      window.open(url, "_blank");
    } catch {
      // In-app banner provides immediate manual tap
    }
  };

  const handleTextCommand = useCallback(async (finalTranscript: string, overrideConfig?: AppConfig | null) => {
    const trimmed = finalTranscript.trim();
    const currentCfg = overrideConfig || configRef.current;
    if (!trimmed || !currentCfg) {
      setAppState("idle");
      return;
    }

    // Deduplication guard for rapid identical commands
    const now = Date.now();
    if (inFlightCommandRef.current === trimmed && now - lastCommandTimeRef.current < 600) {
      console.log(`[Stability] Prevented duplicate rapid command dispatch: "${trimmed}"`);
      return;
    }
    inFlightCommandRef.current = trimmed;
    lastCommandTimeRef.current = now;

    // Increment request ID so any older in-flight request is immediately invalidated
    const thisRequestId = ++currentRequestIdRef.current;

    // Interrupt previous playback
    stopPCM();

    const userMsgId = `${now}-${Math.random().toString(36).slice(2, 7)}-user`;
    setMessages((prev) => [...prev, { id: userMsgId, sender: "user", text: trimmed }]);

    // If live session is active, route through it
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.stopPlayback(true);
      liveSessionRef.current.sendText(trimmed);
      return;
    }

    setAppState("processing");

    try {
      // 1. Check for browser commands & native-only commands
      const commandResult = processCommand(
        trimmed,
        currentCfg.userName || "Usman",
        currentCfg.enableBrowserActions !== false
      );
      let responseText = "";

      if (commandResult.isNativeOnly) {
        responseText = commandResult.action;
        if (thisRequestId !== currentRequestIdRef.current) {
          return;
        }
        const zoyaMsgId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-zoya`;
        setMessages((prev) => [...prev, { id: zoyaMsgId, sender: "zoya", text: responseText }]);

        if (!isMuted) {
          setAppState("speaking");
          const audioBase64 = await getZoyaAudio(responseText, currentCfg);
          if (thisRequestId === currentRequestIdRef.current && audioBase64) {
            await playPCM(audioBase64, isMuted ? 0 : volume);
          }
        }
        if (thisRequestId === currentRequestIdRef.current) {
          setAppState("idle");
          inFlightCommandRef.current = null;
        }
        return;
      }

      if (commandResult.isBrowserAction) {
        responseText = commandResult.action;

        // Verify request is still active
        if (thisRequestId !== currentRequestIdRef.current) {
          console.log(`[Stability] Discarding superseded browser action #${thisRequestId}`);
          return;
        }

        const zoyaMsgId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-zoya`;
        setMessages((prev) => [...prev, { id: zoyaMsgId, sender: "zoya", text: responseText }]);

        if (!isMuted) {
          setAppState("speaking");
          const audioBase64 = await getZoyaAudio(responseText, currentCfg);
          if (thisRequestId === currentRequestIdRef.current && audioBase64) {
            await playPCM(audioBase64, isMuted ? 0 : volume);
          }
        }
        if (thisRequestId === currentRequestIdRef.current) {
          setAppState("idle");
          inFlightCommandRef.current = null;
        }

        if (commandResult.url && thisRequestId === currentRequestIdRef.current) {
          handleTriggerExternalUrl(commandResult.url);
        }
      } else {
        // 2. Chit-Chat via Gemini
        responseText = await getZoyaResponse(trimmed, messagesRef.current, currentCfg);

        // Verify request is still active before updating messages or starting audio
        if (thisRequestId !== currentRequestIdRef.current) {
          console.log(`[Stability] Discarding superseded Gemini response #${thisRequestId} because #${currentRequestIdRef.current} is now active.`);
          return;
        }

        const zoyaMsgId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-zoya`;
        setMessages((prev) => [...prev, { id: zoyaMsgId, sender: "zoya", text: responseText }]);

        if (!isMuted) {
          setAppState("speaking");
          const audioBase64 = await getZoyaAudio(responseText, currentCfg);
          if (thisRequestId === currentRequestIdRef.current && audioBase64) {
            await playPCM(audioBase64, isMuted ? 0 : volume);
          }
        }

        if (thisRequestId === currentRequestIdRef.current) {
          setAppState("idle");
          inFlightCommandRef.current = null;
        }
      }
    } catch (err) {
      console.error(`[Stability] Error handling command #${thisRequestId}:`, err);
      if (thisRequestId === currentRequestIdRef.current) {
        setAppState("idle");
        inFlightCommandRef.current = null;
      }
    }
  }, [isMuted, volume, isSessionActive]);

  const handleQuickAction = useCallback(async (_prompt: string, labelOrTopic?: string, topic?: string) => {
    // Invalidate any in-flight previous request and stop any lingering audio immediately
    stopPCM();
    if (liveSessionRef.current) {
      liveSessionRef.current.stopPlayback(true);
    }

    // Invalidate any in-flight request so stale callbacks/responses cannot execute
    currentRequestIdRef.current++;
    inFlightCommandRef.current = null;

    const currentActiveMode = getActiveZoeyMode();
    const resolvedTopic = topic || (labelOrTopic && labelOrTopic.length > 20 ? labelOrTopic : undefined);

    // Update topic and active mode without triggering duplicate notifications or automatic speech
    if (configRef.current) {
      const updatedConfig: AppConfig = {
        ...configRef.current,
        activeMode: currentActiveMode,
        ...(resolvedTopic ? { activeTopicOrScript: resolvedTopic } : {}),
      };
      configRef.current = updatedConfig;
      setConfig(updatedConfig);
      localStorage.setItem("zoya_app_config", JSON.stringify(updatedConfig));
      resetZoyaSession();
      if (liveSessionRef.current) {
        liveSessionRef.current.updateConfig(updatedConfig, false);
      }
    }
    // Critical Rule: Mode selection updates only mode and conversation context.
    // Never start microphone capture, never invoke TTS, never auto-speak unprompted.
  }, []);

  const toggleListening = async () => {
    if (isStartingSessionRef.current) {
      console.log("[Stability] Session toggle already in flight, ignoring duplicate tap.");
      return;
    }
    isStartingSessionRef.current = true;

    try {
      if (isSessionActive) {
        // User explicitly requested to stop voice interaction
        setIsSessionActive(false);
        setIsMicHearing(false);
        setAppState("idle");
        if (liveSessionRef.current) {
          liveSessionRef.current.stop();
          liveSessionRef.current = null;
        }
        stopPCM();
        resetZoyaSession();
      } else {
        // User explicitly requested to start talking to Zoya
        if (!configRef.current) return;
        setVoiceErrorMsg(null);
        setClassifiedError(null);

        const currentKey = configRef.current.apiKey;
        if (!currentKey || !currentKey.trim() || currentKey === "MY_GEMINI_API_KEY") {
          const keyErr = classifyVoiceError(new Error("API key is required. Please set your key in Settings."));
          setClassifiedError(keyErr);
          setVoiceErrorMsg(keyErr.messageEn);
          setIsSessionActive(false);
          setIsMicHearing(false);
          setAppState("idle");
          return;
        }

        // Proactively check browser microphone permission state if query API is available
        if (typeof navigator !== "undefined" && navigator.permissions?.query) {
          try {
            const perm = await navigator.permissions.query({ name: "microphone" as any });
            if (perm.state === "denied") {
              const micErr = classifyVoiceError(new Error("permission denied"));
              setClassifiedError(micErr);
              setShowPermissionModal(true);
              setVoiceErrorMsg(micErr.messageEn);
              setIsSessionActive(false);
              setIsMicHearing(false);
              setAppState("idle");
              return;
            }
          } catch {
            // permissions.query for microphone not supported in all browsers; continue to standard initialization
          }
        }

        stopPCM();
        resetZoyaSession();

        const session = new LiveSessionManager(configRef.current);
        session.isMuted = isMuted;
        liveSessionRef.current = session;

        session.onStateChange = (state) => {
          setAppState(state);
          if (state === "idle") {
            setIsSessionActive(false);
            setIsMicHearing(false);
          } else {
            setIsSessionActive(true);
          }
        };

        session.onError = (err) => {
          setClassifiedError(err);
          setVoiceErrorMsg(err.messageEn);
          if (err.kind === "mic_permission_denied") {
            setShowPermissionModal(true);
          }
        };

        session.onMessage = (sender, text) => {
          const msgId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${sender}`;
          setMessages((prev) => [...prev, { id: msgId, sender, text }]);
        };

        session.onCommand = (url) => {
          handleTriggerExternalUrl(url);
        };

        session.onAudioLevel = (level) => {
          if (level > 0.012) {
            setIsMicHearing(true);
          } else if (level < 0.005) {
            setIsMicHearing(false);
          }
        };

        // Start session; only upon successful initialization do we enter active listening
        await session.start();
        setIsSessionActive(true);
      }
    } catch (e: any) {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setIsSessionActive(false);
      setIsMicHearing(false);
      setAppState("idle");

      const classified = classifyVoiceError(e);
      setClassifiedError(classified);
      setVoiceErrorMsg(classified.messageEn);

      if (classified.kind === "mic_permission_denied") {
        setShowPermissionModal(true);
      }
    } finally {
      isStartingSessionRef.current = false;
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (val === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const getThemeClass = () => {
    switch (config?.theme) {
      case "rosegold":
        return "bg-[#140C12] text-rose-50";
      case "cyberpunk":
        return "bg-[#070D12] text-cyan-50";
      case "amethyst":
        return "bg-[#0E0A16] text-purple-50";
      case "midnight":
      default:
        return "bg-[#0A0C10] text-white";
    }
  };

  const getFontSizeClass = () => {
    switch (config?.fontSize) {
      case "compact":
        return "text-xs";
      case "large":
        return "text-base";
      case "normal":
      default:
        return "text-sm";
    }
  };

  // If no config, show first-run SetupScreen
  if (!config) {
    return <SetupScreen onComplete={handleConfigComplete} />;
  }

  return (
    <div 
      className={`h-[100dvh] w-screen ${getThemeClass()} ${getFontSizeClass()} flex flex-col justify-between font-sans relative overflow-hidden m-0 p-0 pointer-events-auto`}
      onClick={() => {
        if (showVolumeSlider) {
          setShowVolumeSlider(false);
        }
      }}
    >
      {/* Modals */}
      {showPermissionModal && (
        <PermissionModal 
          assistantName={config?.assistantName}
          onClose={() => setShowPermissionModal(false)}
          onOpenTextInput={() => {
            setShowPermissionModal(false);
            setShowTextInput(true);
          }}
        />
      )}

      {showVoiceModal && (
        <VoiceSelectorModal
          assistantName={config?.assistantName}
          currentVoice={config?.voiceName || "Kore"}
          config={config}
          onSelectVoice={handleSelectVoice}
          onClose={() => setShowVoiceModal(false)}
        />
      )}

      {showTopicModal && (
        <TopicScriptModal
          assistantName={config?.assistantName}
          currentTopic={config?.activeTopicOrScript || ""}
          onSave={handleUpdateTopic}
          onClose={() => setShowTopicModal(false)}
        />
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#181A22] p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
              <Download size={32} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white mb-2">Install on iOS</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                To install {config?.assistantName || "your companion"} on your iPhone or iPad:<br/><br/>
                1. Tap the <strong>Share</strong> button in Safari.<br/>
                2. Tap <strong>Add to Home Screen</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 mt-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#181A22] p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
              <Download size={32} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white mb-2">Install App</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                To install {config?.assistantName || "your companion"} on your device:<br/><br/>
                1. Tap the <strong>Browser Menu (⋮)</strong>.<br/>
                2. Tap <strong>Install app</strong> or <strong>Add to Home Screen</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-3 mt-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main View Area: Switched via currentTab while preserving active live voice session */}
      <div className="flex-1 w-full flex flex-col overflow-hidden relative pointer-events-auto z-10 min-h-0">
        {/* Holographic Real-time Task Energy Streamer Overlay */}
        <TaskEnergyStreamer />

        {currentTab === "home" && (
          <HomeDashboard
            config={config}
            appState={appState}
            isSessionActive={isSessionActive}
            isMicHearing={isMicHearing}
            isMuted={isMuted}
            volume={volume}
            showVolumeSlider={showVolumeSlider}
            onToggleVolumeSlider={() => setShowVolumeSlider(!showVolumeSlider)}
            onVolumeChange={handleVolumeChange}
            onToggleListening={toggleListening}
            showTextInput={showTextInput}
            onToggleTextInput={() => setShowTextInput(!showTextInput)}
            textInput={textInput}
            onTextInputChange={setTextInput}
            onTextSubmit={handleTextSubmit}
            videoSrc={videoSrc}
            onQuickAction={(prompt, _label, topic) => {
              handleQuickAction(prompt, topic);
            }}
            lastCommandUrl={lastCommandUrl}
            onClearCommandUrl={() => setLastCommandUrl(null)}
            onOpenTopicModal={() => setShowTopicModal(true)}
            messages={messages}
            onNavigateTab={setCurrentTab}
            voiceErrorMsg={voiceErrorMsg}
            classifiedError={classifiedError}
            onClearVoiceError={() => {
              setVoiceErrorMsg(null);
              setClassifiedError(null);
            }}
            onOpenPermissionGuide={() => setShowPermissionModal(true)}
          />
        )}

        {(currentTab === "chat" || currentTab === "history") && (
          <ChatHistoryView
            messages={messages}
            config={config}
            appState={appState}
            isSessionActive={isSessionActive}
            onSendMessage={handleTextCommand}
            onClearMemory={handleClearMemory}
          />
        )}

        {currentTab === "tools" && (
          <ToolsView onTriggerUrl={handleTriggerExternalUrl} />
        )}

        {currentTab === "topics" && (
          <TopicsView
            config={config}
            onUpdateTopic={handleUpdateTopic}
            isSessionActive={isSessionActive}
          />
        )}

        {currentTab === "settings" && (
          <SettingsTab
            config={config}
            onUpdateConfig={handleConfigComplete}
            onOpenVoiceModal={() => setShowVoiceModal(true)}
            videoSrc={videoSrc}
            onVideoUpload={handleVideoUpload}
            onRemoveVideo={handleRemoveVideo}
            isInstalled={isInstalled}
            onInstallApp={async () => {
              if (isIOS) {
                setShowIOSGuide(true);
              } else {
                const success = await install();
                if (!success && !isInstallable) {
                  setShowAndroidGuide(true);
                }
              }
            }}
            onForceUpdate={handleForceUpdateApp}
            updatingPWA={updatingPWA}
            onClearMemory={handleClearMemory}
            onNavigateTab={setCurrentTab}
            messagesCount={messages.length}
            appState={appState}
            isSessionActive={isSessionActive}
            isMicHearing={isMicHearing}
            isMuted={isMuted}
            volume={volume}
            voiceErrorMsg={voiceErrorMsg}
            onToggleListening={toggleListening}
          />
        )}

        {currentTab === "diagnostics" && (
          <DiagnosticsView
            config={config}
            appState={appState}
            isSessionActive={isSessionActive}
            onOpenPermissionGuide={() => setShowPermissionModal(true)}
          />
        )}

        {currentTab === "studio" && (
          <ContentStudioView />
        )}

        {currentTab === "android" && (
          <AndroidArchitectureView />
        )}
      </div>

      {/* Native-Feel Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isSessionActive={isSessionActive}
        appState={appState}
      />
    </div>
  );
}
