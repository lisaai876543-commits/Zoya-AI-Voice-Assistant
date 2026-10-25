import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, ExternalLink, Sparkles, MessageSquare, ChevronRight, AlertCircle, Activity, CheckCircle2, RotateCcw, Zap, Palette } from 'lucide-react';
import Visualizer from './Visualizer';
import { AppConfig, AppState, NavTab } from '../types';
import { PRESETS } from './TopicScriptModal';
import { ChatMessage } from './ChatHistoryView';
import { ClassifiedVoiceError } from '../utils/errorClassifier';
import { getActiveZoeyMode, setActiveZoeyMode, clearActiveZoeyMode, ZoeyActiveMode } from '../utils/modeManager';
import { getActiveTheme, subscribeThemeChange, setActiveTheme, getNextTheme, THEME_ORDER, ZOEY_THEMES, ZoyaTheme } from '../utils/themeManager';
import { dispatchTaskEnergy } from '../services/taskAnimationService';

interface HomeDashboardProps {
  config: AppConfig;
  appState: AppState;
  isSessionActive: boolean;
  isMicHearing: boolean;
  isMuted: boolean;
  volume: number;
  showVolumeSlider: boolean;
  onToggleVolumeSlider: () => void;
  onVolumeChange: (val: number) => void;
  onToggleListening: () => void;
  showTextInput: boolean;
  onToggleTextInput: () => void;
  textInput: string;
  onTextInputChange: (val: string) => void;
  onTextSubmit: (e: React.FormEvent) => void;
  videoSrc: string | null;
  onQuickAction: (prompt: string, label: string, topic?: string) => void;
  onQuickPreset?: (text: string) => void;
  lastCommandUrl: string | null;
  onClearCommandUrl: () => void;
  onOpenTopicModal: () => void;
  messages: ChatMessage[];
  onNavigateTab: (tab: NavTab) => void;
  voiceErrorMsg?: string | null;
  classifiedError?: ClassifiedVoiceError | null;
  onClearVoiceError?: () => void;
  onOpenPermissionGuide?: () => void;
}

export default function HomeDashboard({
  config,
  appState,
  isSessionActive,
  isMicHearing,
  isMuted,
  volume,
  showVolumeSlider,
  onToggleVolumeSlider,
  onVolumeChange,
  onToggleListening,
  showTextInput,
  onToggleTextInput,
  textInput,
  onTextInputChange,
  onTextSubmit,
  videoSrc,
  onQuickAction,
  onQuickPreset,
  lastCommandUrl,
  onClearCommandUrl,
  onOpenTopicModal,
  messages,
  onNavigateTab,
  voiceErrorMsg,
  classifiedError,
  onClearVoiceError,
  onOpenPermissionGuide,
}: HomeDashboardProps) {
  const [activeToast, setActiveToast] = useState<{ label: string; text: string; icon: string } | null>(null);
  const [activeMode, setActiveMode] = useState<ZoeyActiveMode>(() => {
    return config.activeMode || getActiveZoeyMode();
  });
  const [currentTheme, setCurrentTheme] = useState<ZoyaTheme>(() => getActiveTheme());
  const [showThemePicker, setShowThemePicker] = useState(false);
  const toastTimeoutRef = useRef<any>(null);
  const chipDebounceRef = useRef<{ id: string; time: number } | null>(null);

  // Subscribe to Theme Engine changes
  useEffect(() => {
    const unsub = subscribeThemeChange((newTheme) => {
      setCurrentTheme(newTheme);
    });
    return () => unsub();
  }, []);

  // Sync mode if config.activeMode updates from elsewhere
  useEffect(() => {
    if (config.activeMode && config.activeMode !== activeMode) {
      setActiveMode(config.activeMode);
    }
  }, [config.activeMode]);

  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const safePresets = Array.isArray(PRESETS) ? PRESETS : [];
  const sweetPreset = safePresets.find(p => p?.id === "sweet-encouragement")?.text || "Be an affectionate, caring companion. Ask me gently how my day went, listen warmly to whatever is on my mind, offer sweet comfort, and help me relax.";
  const brainstormPreset = safePresets.find(p => p?.id === "project-brainstorm")?.text || "We are brainstorming an exciting tech project together. Discuss innovative features, help me think through product challenges, and give inspiring creative feedback.";
  const lateNightPreset = safePresets.find(p => p?.id === "late-night")?.text || "Scenario: We are having a relaxed late-night chat. Speak in a soothing, gentle voice, share poetic thoughts, and talk about dreams, music, and peace.";
  const catchUpPreset = safePresets.find(p => p?.id === "catch-up")?.text || "Act like my close friend catching up after a busy day. Ask me how I've been doing in Hindi/Hinglish, share sweet little thoughts, and chat comfortably.";

  const quickPills = [
    {
      id: "sweet-chat",
      label: "Sweet chat",
      icon: "💖",
      prompt: "Let's have a sweet conversation, Zoya.",
      topic: sweetPreset,
    },
    {
      id: "brainstorm",
      label: "Brainstorm",
      icon: "💡",
      prompt: "Zoya, let's brainstorm some creative and brilliant ideas together!",
      topic: brainstormPreset,
    },
    {
      id: "late-night",
      label: "Late night",
      icon: "🌙",
      prompt: "It's late night, Zoya. Let's talk about something calming and deep.",
      topic: lateNightPreset,
    },
    {
      id: "sing-song",
      label: "Sing song",
      icon: "🎶",
      prompt: "Zoya, please sing or recite a melodious romantic Hindi song for me in your sweetest soulful voice.",
      topic: "Please sing or recite a melodious romantic Hindi song for me in your sweetest soulful voice.",
    },
    {
      id: "catch-up",
      label: "Catch up",
      icon: "☕",
      prompt: "Hey Zoya, let's catch up! How are you doing today?",
      topic: catchUpPreset,
    },
  ];

  const handleChipClick = (e: React.MouseEvent, pill: typeof quickPills[0]) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    // Guard against rapid duplicate clicks on the EXACT same chip within 400ms
    if (chipDebounceRef.current?.id === pill.id && now - chipDebounceRef.current.time < 400) {
      return;
    }
    chipDebounceRef.current = { id: pill.id, time: now };

    const modeId = (pill.id === "catch-up" ? "sweet-chat" : pill.id) as ZoeyActiveMode;
    setActiveMode(modeId);
    setActiveZoeyMode(modeId);
    setActiveToast({ label: pill.label, text: pill.prompt, icon: pill.icon });

    // Real-time energy line from hologram to clicked mode chip
    dispatchTaskEnergy(
      `task-target-mode-${pill.id}`,
      `Tuning: ${pill.label}`,
      `Zoya is adapting persona to ${pill.label}`,
      'mode',
      2400
    );

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    // Only toast disappears; the selected mode chip remains persistently active!
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 2800);

    // Dispatch onQuickAction with verified payload
    onQuickAction(pill.prompt, pill.label, pill.topic);
  };

  const handleClearMode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearActiveZoeyMode();
    setActiveMode("sweet-chat");
    setActiveToast({ label: "Mode Reset", text: "Returned to default Sweet Chat mode", icon: "💖" });

    dispatchTaskEnergy(
      "task-target-mode-clear",
      "Mode Reset",
      "Returning to default Sweet Chat mode",
      "mode",
      2200
    );

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 2400);
    onQuickAction("Mode reset to default.", "Sweet chat", sweetPreset);
  };

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div
      className="flex-1 w-full flex flex-col items-center justify-between overflow-hidden relative p-3 sm:p-5 pointer-events-auto min-h-0 select-none transition-colors duration-700"
      style={{
        background: `linear-gradient(180deg, ${currentTheme.bg} 0%, #030408 100%)`,
      }}
    >
      {/* Background Video Layer */}
      {videoSrc && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black flex items-center justify-center">
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-40 blur-2xl scale-110 pointer-events-none"
          />
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            className="relative w-full h-full object-contain opacity-90 z-10 pointer-events-none"
          />
        </div>
      )}

      {/* Top Bar: Brand, Assistant & Status */}
      <header className="w-full max-w-lg flex items-center justify-between z-30 shrink-0 relative pointer-events-auto">
        <div className="flex items-center gap-2">
          <h1
            className="text-lg sm:text-xl font-bold tracking-[0.25em] uppercase transition-colors duration-500"
            style={{
              color: currentTheme.glow,
              textShadow: `0 0 16px rgba(${currentTheme.rgb.glow}, 0.55)`,
            }}
          >
            {config.assistantName}
          </h1>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors duration-500"
            style={{
              color: currentTheme.primary,
              backgroundColor: currentTheme.glassBg,
              borderColor: currentTheme.borderColor,
            }}
          >
            {config.voiceName || "Kore"}
          </span>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {(appState === "error" || voiceErrorMsg) && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => onNavigateTab("diagnostics")}
                className="flex items-center gap-1.5 text-red-300 text-xs bg-red-950/80 border border-red-500/40 px-3 py-1 rounded-full backdrop-blur-md shadow-lg shadow-red-950/50 cursor-pointer"
                title={voiceErrorMsg || "Voice engine encountered an error"}
              >
                <AlertCircle size={13} className="text-red-400 shrink-0" />
                <span className="truncate max-w-[110px]">Error</span>
              </motion.div>
            )}

            {!(appState === "error" || voiceErrorMsg) &&
              (appState === "muted" || (isSessionActive && (isMuted || volume === 0))) && (
                <motion.div
                  key="muted"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-amber-300 text-xs bg-amber-950/80 border border-amber-500/40 px-3 py-1 rounded-full backdrop-blur-md shadow-lg shadow-amber-950/50"
                >
                  <VolumeX size={13} className="text-amber-400" />
                  <span>Muted</span>
                </motion.div>
              )}

            {!(appState === "error" || voiceErrorMsg) &&
              !(appState === "muted" || (isSessionActive && (isMuted || volume === 0))) &&
              appState === "processing" && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-cyan-300 text-xs bg-cyan-950/70 border border-cyan-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-lg shadow-cyan-950/50"
                >
                  <Loader2 size={13} className="animate-spin text-cyan-400" />
                  <span>Thinking...</span>
                </motion.div>
              )}

            {!(appState === "error" || voiceErrorMsg) &&
              !(appState === "muted" || (isSessionActive && (isMuted || volume === 0))) &&
              appState === "listening" && (
                <motion.div
                  key="listening"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-emerald-300 text-xs bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-lg shadow-emerald-950/50"
                >
                  <span
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      isMicHearing
                        ? "bg-emerald-300 scale-125 shadow-[0_0_10px_#34d399]"
                        : "bg-emerald-400 animate-pulse"
                    }`}
                  />
                  <span>{isMicHearing ? "Hearing voice..." : "Listening..."}</span>
                </motion.div>
              )}

            {!(appState === "error" || voiceErrorMsg) &&
              !(appState === "muted" || (isSessionActive && (isMuted || volume === 0))) &&
              appState === "speaking" && (
                <motion.div
                  key="speaking"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-pink-300 text-xs bg-pink-950/70 border border-pink-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-lg shadow-pink-950/50"
                >
                  <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
                  <span>Speaking...</span>
                </motion.div>
              )}

            {!(appState === "error" || voiceErrorMsg) &&
              !(appState === "muted" || (isSessionActive && (isMuted || volume === 0))) &&
              appState === "interrupted" && (
                <motion.div
                  key="interrupted"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-violet-300 text-xs bg-violet-950/80 border border-violet-500/40 px-3 py-1 rounded-full backdrop-blur-md shadow-lg shadow-violet-950/50"
                >
                  <Zap size={13} className="text-violet-400" />
                  <span>Interrupted</span>
                </motion.div>
              )}

            {!(appState === "error" || voiceErrorMsg) &&
              !(appState === "muted" || (isSessionActive && (isMuted || volume === 0))) &&
              appState === "reconnecting" && (
                <motion.div
                  key="reconnecting"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-amber-300 text-xs bg-amber-950/70 border border-amber-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-lg shadow-amber-950/50"
                >
                  <Loader2 size={13} className="animate-spin text-amber-400" />
                  <span>Reconnecting...</span>
                </motion.div>
              )}

            {!(appState === "error" || voiceErrorMsg) &&
              !(appState === "muted" || (isSessionActive && (isMuted || volume === 0))) &&
              (appState === "idle" || appState === "ready") && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-white/70 text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400/80" />
                  <span>Ready • Tap to Talk</span>
                </motion.div>
              )}
          </AnimatePresence>

          {/* Quick Diagnostics Icon Button */}
          <button
            id="task-target-diagnostics-btn"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dispatchTaskEnergy(
                "task-target-diagnostics-btn",
                "Diagnostics",
                "Analyzing voice engine & system health",
                "system",
                2000
              );
              onNavigateTab("diagnostics");
            }}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer touch-manipulation pointer-events-auto"
            title="System Diagnostics & Health"
          >
            <Activity size={14} />
          </button>

          {/* Quick Theme Switcher Button */}
          <button
            id="task-target-theme-btn"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dispatchTaskEnergy(
                "task-target-theme-btn",
                "Theme Spectrum",
                "10-Theme Quantum Engine",
                "settings",
                1800
              );
              setShowThemePicker((prev) => !prev);
            }}
            className="p-1.5 rounded-full border transition-all cursor-pointer active:scale-95 touch-manipulation pointer-events-auto flex items-center gap-1.5"
            style={{
              backgroundColor: currentTheme.glassBg,
              borderColor: currentTheme.borderColor,
              boxShadow: `0 0 10px rgba(${currentTheme.rgb.glow}, 0.3)`,
            }}
            title={`Active Theme: ${currentTheme.name} (Tap to change)`}
          >
            <Palette size={14} style={{ color: currentTheme.primary }} />
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: currentTheme.glow,
                boxShadow: `0 0 6px ${currentTheme.glow}`,
              }}
            />
          </button>
        </div>
      </header>

      {/* Theme Selection Modal Popup */}
      <AnimatePresence>
        {showThemePicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="w-full max-w-sm z-40 bg-[#0d101a]/95 border rounded-3xl p-4 shadow-2xl backdrop-blur-xl pointer-events-auto my-2"
            style={{ borderColor: currentTheme.borderColor }}
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Palette size={16} style={{ color: currentTheme.primary }} />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">
                  Color Themes (10)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = getNextTheme();
                    dispatchTaskEnergy(
                      "task-target-theme-btn",
                      `Next: ${next.name}`,
                      `Cycling to ${next.name}`,
                      "settings",
                      2200
                    );
                  }}
                  className="px-2.5 py-1 text-[11px] rounded-lg font-medium transition-colors cursor-pointer active:scale-95"
                  style={{
                    backgroundColor: currentTheme.glassBg,
                    border: `1px solid ${currentTheme.borderColor}`,
                    color: currentTheme.primary,
                  }}
                >
                  Next Theme ↻
                </button>
                <button
                  type="button"
                  onClick={() => setShowThemePicker(false)}
                  className="text-white/40 hover:text-white text-xs p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-hide">
              {THEME_ORDER.map((id) => {
                const t = ZOEY_THEMES[id];
                const isSelected = currentTheme.id === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveTheme(id);
                      dispatchTaskEnergy(
                        "task-target-theme-btn",
                        t.name,
                        `Activated ${t.name}`,
                        "settings",
                        2400
                      );
                      setShowThemePicker(false);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left border text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? "ring-2 scale-[1.02] shadow-md"
                        : "hover:bg-white/5 opacity-80 hover:opacity-100"
                    }`}
                    style={{
                      backgroundColor: isSelected ? t.glassBg : "rgba(255,255,255,0.03)",
                      borderColor: isSelected ? t.primary : "rgba(255,255,255,0.1)",
                      color: isSelected ? "#ffffff" : "rgba(255,255,255,0.85)",
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: t.primary,
                        boxShadow: `0 0 8px ${t.glow}`,
                      }}
                    />
                    <span className="truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* External Action Banner (Solves Mobile Popup Blockers) */}
      <AnimatePresence>
        {lastCommandUrl && (
          <motion.div
            id="task-target-action-card"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-sm mt-2 z-35 bg-violet-950/90 border border-violet-500/40 rounded-2xl p-3 text-xs text-white shadow-xl flex items-center justify-between gap-3 backdrop-blur-md pointer-events-auto"
          >
            <div className="flex items-center gap-2 truncate">
              <ExternalLink size={15} className="text-cyan-400 shrink-0" />
              <span className="truncate text-white/90 font-medium">Draft Prepared: Ready to Open</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={lastCommandUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClearCommandUrl}
                className="px-3 py-1 rounded-lg bg-cyan-500 text-black font-semibold text-xs hover:bg-cyan-400 transition-colors pointer-events-auto"
              >
                Open Draft
              </a>
              <button
                type="button"
                onClick={onClearCommandUrl}
                className="text-white/40 hover:text-white text-xs px-1 cursor-pointer pointer-events-auto"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instant Action Toast Notification */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="w-full max-w-sm mt-2 z-35 bg-gradient-to-r from-pink-950/95 via-[#181A26]/98 to-violet-950/95 border border-pink-500/50 rounded-2xl p-2.5 px-3.5 text-xs text-white shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md pointer-events-auto"
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className="text-base shrink-0">{activeToast.icon}</span>
              <div className="truncate">
                <span className="text-pink-300 font-semibold">{activeToast.label}:</span>{" "}
                <span className="text-white/90">Mode activated</span>
              </div>
            </div>
            <span className="text-[10px] text-pink-300 bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 rounded-full shrink-0 font-medium flex items-center gap-1">
              <CheckCircle2 size={11} className="text-pink-400" />
              <span>Active</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bilingual Voice Connection Error Banner */}
      <AnimatePresence>
        {(voiceErrorMsg || classifiedError) && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-sm mt-2 z-35 bg-[#1B1115]/95 border border-red-500/50 rounded-2xl p-3 text-xs shadow-2xl backdrop-blur-md pointer-events-auto flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-red-200 truncate">
                    {classifiedError?.titleHi || "त्रुटि"} • {classifiedError?.titleEn || "Voice Connection Error"}
                  </div>
                  <div className="text-[11px] text-red-300/80 leading-snug mt-0.5">
                    {classifiedError?.messageHi || voiceErrorMsg}
                  </div>
                  {classifiedError?.messageEn && (
                    <div className="text-[10px] text-white/50 italic mt-0.5">
                      {classifiedError.messageEn}
                    </div>
                  )}
                </div>
              </div>
              {onClearVoiceError && (
                <button
                  type="button"
                  onClick={onClearVoiceError}
                  className="text-white/40 hover:text-white text-xs p-1 cursor-pointer pointer-events-auto shrink-0"
                  title="Dismiss error"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Recovery Suggestion */}
            {classifiedError?.recoveryHi && (
              <div className="bg-red-950/60 border border-red-500/20 rounded-xl p-2 text-[10px] text-amber-200/90 leading-tight">
                <span className="font-semibold text-amber-300">समाधान / Fix: </span>
                <span>{classifiedError.recoveryHi}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
              {(classifiedError?.actionTab === "settings" || !classifiedError) && (
                <button
                  type="button"
                  onClick={() => {
                    if (onClearVoiceError) onClearVoiceError();
                    onNavigateTab("settings");
                  }}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-[11px] cursor-pointer pointer-events-auto transition-colors"
                >
                  Settings (API Keys)
                </button>
              )}

              {(classifiedError?.kind === "mic_permission_denied" || /permission|microphone|mic/i.test(voiceErrorMsg || "")) && onOpenPermissionGuide && (
                <button
                  type="button"
                  onClick={() => {
                    if (onClearVoiceError) onClearVoiceError();
                    onOpenPermissionGuide();
                  }}
                  className="px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-semibold text-[11px] cursor-pointer pointer-events-auto transition-colors"
                >
                  Fix Mic Guide
                </button>
              )}

              {classifiedError?.canRetry && (
                <button
                  type="button"
                  onClick={() => {
                    if (onClearVoiceError) onClearVoiceError();
                    onToggleListening();
                  }}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium border border-white/15 cursor-pointer pointer-events-auto transition-colors"
                >
                  Retry (पुनः प्रयास)
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center 3D Visualizer Card */}
      <main className="flex-1 w-full flex flex-col items-center justify-center relative z-20 my-1 pointer-events-auto min-h-0">
        <div
          id="zoya-hologram-anchor"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dispatchTaskEnergy(
              "task-target-talk-btn",
              isSessionActive ? "Ending Voice Session" : "Opening Voice Link",
              isSessionActive ? "Disconnecting mic audio channel" : "Connecting directly to Zoya audio engine",
              "action",
              2200
            );
            onToggleListening();
          }}
          title={isSessionActive ? "Tap to end session" : `Tap to talk with ${config.assistantName}`}
          className={`w-full max-w-[320px] sm:max-w-[380px] aspect-[4/4] sm:aspect-[4/4.2] max-h-[46vh] rounded-[36px] ${
            videoSrc ? "bg-[#0c0e18]/50 backdrop-blur-md" : "bg-[#0c0e18]/80"
          } border shadow-2xl relative overflow-hidden flex items-center justify-center cursor-pointer transition-all duration-500 hover:scale-[1.01] active:scale-[0.99] touch-manipulation pointer-events-auto`}
          style={{
            borderColor: currentTheme.borderColor,
            boxShadow: `0 0 40px rgba(${currentTheme.rgb.glow}, 0.18)`,
          }}
        >
          <Visualizer state={appState} isMuted={isMuted} />
        </div>
      </main>

      {/* Recent Conversation Preview Bar (Maya Style) */}
      {lastMessage && (
        <div 
          id="task-target-chat-preview"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dispatchTaskEnergy(
              "task-target-chat-preview",
              "Chat History",
              "Opening full conversation transcript",
              "navigation",
              1600
            );
            onNavigateTab("chat");
          }}
          className="w-full max-w-md z-30 shrink-0 bg-[#0e111a]/80 hover:bg-[#141724] active:scale-[0.99] border rounded-2xl p-2.5 px-3.5 flex items-center justify-between gap-2.5 cursor-pointer transition-all my-1 pointer-events-auto touch-manipulation shadow-md"
          style={{ borderColor: currentTheme.borderColor }}
        >
          <div className="flex items-center gap-2 truncate">
            <MessageSquare size={14} className="shrink-0" style={{ color: currentTheme.primary }} />
            <span className="text-xs text-white/80 truncate">
              <strong className="text-white font-medium">{lastMessage.sender === "zoya" ? config.assistantName : (config.userName || "Usman")}:</strong>{" "}
              {lastMessage.text}
            </span>
          </div>
          <ChevronRight size={14} className="text-white/40 shrink-0" />
        </div>
      )}

      {/* Quick Action Scenario Chips (Persistent Mode Selection) */}
      <div className="w-full max-w-md z-30 shrink-0 my-1 relative pointer-events-auto">
        <div className="flex items-center justify-between px-1 mb-1 select-none">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50">
            Persistent Mode Chips
          </span>
          {/* Interactive Live Task Demo Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/40 uppercase font-medium">Demo Tasks:</span>
            <button
              type="button"
              onClick={() => {
                dispatchTaskEnergy(
                  "task-target-action-card",
                  "YouTube: Kesariya",
                  "Zoya is playing music on YouTube",
                  "external",
                  3000
                );
              }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer font-medium"
              title="Test real-time energy line to YouTube action"
            >
              ▶ YouTube
            </button>
            <button
              type="button"
              onClick={() => {
                dispatchTaskEnergy(
                  "task-target-mode-late-night",
                  "Late Night Pulse",
                  "Streaming calm wavelength to Late Night",
                  "mode",
                  3000
                );
              }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-violet-300 border border-violet-500/30 transition-all cursor-pointer font-medium"
              title="Test real-time energy line to Late Night chip"
            >
              🌙 Mode
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1.5 px-1 touch-pan-x pointer-events-auto relative z-30">
          {quickPills.map((pill) => {
            const isSelected = activeMode === pill.id || (pill.id === "catch-up" && activeMode === "sweet-chat");
            return (
              <button
                key={pill.id}
                id={`task-target-mode-${pill.id}`}
                type="button"
                onClick={(e) => handleChipClick(e, pill)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer shadow-sm active:scale-95 touch-manipulation pointer-events-auto select-none ${
                  isSelected ? "scale-105" : "hover:scale-[1.02]"
                }`}
                style={{
                  backgroundColor: isSelected ? `rgba(${currentTheme.rgb.primary}, 0.22)` : currentTheme.glassBg,
                  borderColor: isSelected ? currentTheme.primary : "rgba(255, 255, 255, 0.12)",
                  color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
                  boxShadow: isSelected ? `0 0 16px rgba(${currentTheme.rgb.glow}, 0.4)` : "none",
                }}
                title={`Active Mode: ${pill.label}`}
              >
                <span className="text-sm select-none">{pill.icon}</span>
                <span>{pill.label}</span>
                {isSelected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse ml-0.5"
                    style={{ backgroundColor: currentTheme.glow, boxShadow: `0 0 6px ${currentTheme.glow}` }}
                  />
                )}
              </button>
            );
          })}
          <button
            id="task-target-mode-clear"
            type="button"
            onClick={handleClearMode}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white/60 hover:text-white text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-sm touch-manipulation pointer-events-auto select-none"
            title="Reset mode to default (Sweet Chat)"
          >
            <RotateCcw size={12} className="text-white/60" />
            <span>Clear</span>
          </button>
          <button
            id="task-target-mode-more"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dispatchTaskEnergy(
                "task-target-mode-more",
                "Persona Scripts",
                "Opening script library",
                "mode",
                1800
              );
              onOpenTopicModal();
            }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-sm active:scale-95 touch-manipulation pointer-events-auto select-none"
            style={{
              backgroundColor: currentTheme.glassBg,
              borderColor: currentTheme.borderColor,
              color: currentTheme.glow,
            }}
          >
            <Sparkles size={13} style={{ color: currentTheme.primary }} />
            <span>More</span>
          </button>
        </div>
      </div>

      {/* Collapsible Text Drawer */}
      <AnimatePresence>
        {showTextInput && (
          <motion.form
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            onSubmit={onTextSubmit}
            className="w-full max-w-md flex items-center gap-2 bg-[#161824] border border-white/15 rounded-full p-1 pl-4 backdrop-blur-md shadow-2xl z-30 shrink-0 my-1 relative pointer-events-auto"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => onTextInputChange(e.target.value)}
              placeholder={`Type a message to ${config.assistantName}...`}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-xs sm:text-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="p-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white disabled:opacity-40 active:scale-95 transition-all cursor-pointer pointer-events-auto"
            >
              <Send size={14} />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Floating Bottom Voice & Audio Controls */}
      <footer className="w-full max-w-md flex items-center justify-center gap-3 z-30 shrink-0 pt-1 pb-1 relative pointer-events-auto">
        {/* Keyboard Input Toggle */}
        <button
          id="task-target-text-toggle"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dispatchTaskEnergy(
              "task-target-text-toggle",
              "Keyboard Input",
              showTextInput ? "Closing text panel" : "Opening keyboard panel",
              "action",
              1600
            );
            onToggleTextInput();
          }}
          className={`p-3.5 sm:p-4 rounded-3xl border transition-all cursor-pointer shadow-lg active:scale-95 touch-manipulation pointer-events-auto ${
            showTextInput
              ? "bg-pink-500/20 border-pink-500/50 text-pink-300"
              : "bg-[#181A24] border-white/10 text-white/70 hover:bg-[#202330] hover:text-white active:bg-white/10"
          }`}
          title="Type message"
        >
          <Keyboard size={20} />
        </button>

        {/* Primary Call / Mic Button (Themed) */}
        <button
          id="task-target-talk-btn"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dispatchTaskEnergy(
              "task-target-talk-btn",
              isSessionActive ? "Disconnecting" : "Voice Link Active",
              isSessionActive ? "Stopping microphone & audio" : "Listening for voice input",
              "action",
              2400
            );
            onToggleListening();
          }}
          className="flex-1 relative flex items-center justify-center gap-2.5 py-4 sm:py-4.5 rounded-3xl font-semibold tracking-wide transition-all duration-300 shadow-xl cursor-pointer active:scale-[0.96] touch-manipulation pointer-events-auto select-none border group overflow-hidden"
          style={{
            background: isSessionActive ? "rgba(239, 68, 68, 0.25)" : currentTheme.buttonGradient,
            borderColor: isSessionActive ? "rgba(239, 68, 68, 0.6)" : currentTheme.borderColor,
            boxShadow: isSessionActive 
              ? "0 0 25px rgba(239, 68, 68, 0.45)" 
              : `0 0 32px rgba(${currentTheme.rgb.glow}, 0.42), inset 0 0 15px rgba(255, 255, 255, 0.25)`,
            color: "#ffffff",
          }}
        >
          {/* Subtle acoustic ripple behind talk button */}
          {!isSessionActive && (
            <span
              className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none animate-pulse"
              style={{
                boxShadow: `0 0 40px ${currentTheme.glow}`,
              }}
            />
          )}

          {appState === "reconnecting" ? (
            <>
              <Loader2 size={20} className="animate-spin text-amber-300" />
              <span className="text-sm text-amber-300">Reconnecting...</span>
            </>
          ) : isSessionActive ? (
            <>
              <MicOff size={20} className="text-red-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm text-red-200">End Voice Session</span>
            </>
          ) : (
            <>
              <Mic size={20} className="text-white group-hover:scale-110 transition-transform" />
              <span className="text-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] font-bold">Talk to {config.assistantName}</span>
            </>
          )}
        </button>

        {/* Volume Slider Popover */}
        <div className="relative flex items-center justify-center pointer-events-auto">
          <AnimatePresence>
            {showVolumeSlider && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-full mb-3 px-4 py-3 bg-[#181A24] border border-white/15 rounded-2xl shadow-2xl z-50 flex items-center justify-center min-w-[130px] pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-pink-500 pointer-events-auto"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            id="task-target-volume-btn"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dispatchTaskEnergy(
                "task-target-volume-btn",
                "Volume Level",
                "Master speaker volume control",
                "system",
                1600
              );
              onToggleVolumeSlider();
            }}
            className={`p-3.5 sm:p-4 rounded-3xl border transition-all cursor-pointer shadow-lg active:scale-95 touch-manipulation pointer-events-auto ${
              showVolumeSlider
                ? "bg-[#252836] border-white/20 text-white"
                : "bg-[#181A24] border-white/10 text-white/70 hover:bg-[#202330] hover:text-white active:bg-white/10"
            }`}
            title="Audio Volume"
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={20} className="text-white/40" />
            ) : (
              <Volume2 size={20} className="text-pink-300" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
