import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  User,
  Sparkles,
  KeyRound,
  Volume2,
  Video,
  Download,
  RefreshCw,
  MessageSquareHeart,
  Check,
  Heart,
  ShieldCheck,
  Trash2,
  Activity,
  Database,
  Search,
  Palette,
  Globe,
  Sliders,
  Plus,
  Edit2,
  FileText,
  FileDown,
  Eye,
  EyeOff,
  Lock,
  Mic,
  MicOff,
  VolumeX,
  AlertCircle,
  ChevronRight,
  Layers,
  Zap,
  Smartphone,
  Compass,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  X,
  Upload,
  Clock,
  Play,
  Square,
  Wifi,
  Cpu,
} from "lucide-react";
import {
  AppConfig,
  NavTab,
  AppTheme,
  FontSize,
  CornerStyle,
  LanguagePreference,
  PersonaPreset,
  ConversationMode,
  MemoryFact,
  AppState,
} from "../types";
import { FEMALE_VOICES } from "./VoiceSelectorModal";
import { DEFAULT_PROMPT } from "./SetupScreen";
import SettingToggleCard from "./SettingToggleCard";
import {
  loadMemoryFacts,
  saveMemoryFacts,
  addMemoryFact,
  updateMemoryFact,
  deleteMemoryFact,
  clearAllMemories,
  resetToDefaultMemories,
  exportMemoriesAsJSON,
  exportMemoriesAsText,
  parseMemoriesJSON,
  importMemories,
} from "../utils/memoryManager";
import {
  saveSecureApiKey,
  getSecureApiKey,
  clearSecureApiKey,
  testApiKeyAndQuota,
  ApiKeyTestResult,
} from "../utils/security";
import { saveVideoToIndexedDB, deleteVideoFromIndexedDB, validateVideoFile } from "../utils/db";
import {
  ApiKeyRecord,
  KeyProvider,
  KeyValidationResult,
  getRegisteredKeys,
  addApiKey,
  deleteApiKey,
  clearAllKeys,
  getKeyVaultSettings,
  saveKeyVaultSettings,
  validateApiKey,
  maskKey,
  reorderApiKey,
} from "../services/keyManager";
import { IMPLEMENTED_FEATURES } from "../services/appRegistry";
import { getInstalledSkills, toggleSkillActive, SkillManifest } from "../services/skillManifest";

interface SettingsTabProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onOpenVoiceModal: () => void;
  videoSrc: string | null;
  onVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveVideo: () => void;
  isInstalled: boolean;
  onInstallApp: () => void;
  onForceUpdate: () => void;
  updatingPWA: boolean;
  onClearMemory: () => void;
  onNavigateTab: (tab: NavTab) => void;
  messagesCount: number;
  appState?: AppState;
  isSessionActive?: boolean;
  isMicHearing?: boolean;
  isMuted?: boolean;
  volume?: number;
  voiceErrorMsg?: string | null;
  onToggleListening?: () => void;
}

export type SettingsCategory =
  | "all"
  | "profile"
  | "conversation"
  | "memory"
  | "appearance"
  | "audio"
  | "tools"
  | "providers"
  | "agents"
  | "diagnostics"
  | "about";

export default function SettingsTab({
  config,
  onUpdateConfig,
  onOpenVoiceModal,
  videoSrc,
  onVideoUpload,
  onRemoveVideo,
  isInstalled,
  onInstallApp,
  onForceUpdate,
  updatingPWA,
  onClearMemory,
  onNavigateTab,
  messagesCount,
  appState = "idle",
  isSessionActive = false,
  isMicHearing = false,
  isMuted = false,
  volume = 1.0,
  voiceErrorMsg = null,
  onToggleListening,
}: SettingsTabProps) {
  // Navigation & Search
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("profile");
  const [searchQuery, setSearchQuery] = useState("");

  // Config States
  const [apiKey, setApiKey] = useState(getSecureApiKey() || config.apiKey);
  const [userName, setUserName] = useState(config.userName || "Usman");
  const [assistantName, setAssistantName] = useState(config.assistantName || "Zoya");
  const [voiceName, setVoiceName] = useState(config.voiceName || "Kore");
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || "");
  const [theme, setTheme] = useState<AppTheme>(config.theme || "midnight");
  const [fontSize, setFontSize] = useState<FontSize>(config.fontSize || "normal");
  const [cornerStyle, setCornerStyle] = useState<CornerStyle>(config.cornerStyle || "rounded-2xl");
  const [language, setLanguage] = useState<LanguagePreference>(config.language || "hinglish");
  const [personaPreset, setPersonaPreset] = useState<PersonaPreset>(config.personaPreset || "companion");
  const [conversationMode, setConversationMode] = useState<ConversationMode>(config.conversationMode || "expressive");
  const [useLongTermMemory, setUseLongTermMemory] = useState<boolean>(config.useLongTermMemory !== false);
  const [echoCancellation, setEchoCancellation] = useState<boolean>(config.echoCancellation !== false);
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(config.noiseSuppression !== false);
  const [autoGainControl, setAutoGainControl] = useState<boolean>(config.autoGainControl !== false);
  const [enableBrowserActions, setEnableBrowserActions] = useState<boolean>(config.enableBrowserActions !== false);
  const [enableDraftConfirmations, setEnableDraftConfirmations] = useState<boolean>(config.enableDraftConfirmations !== false);
  const [bgOpacity, setBgOpacity] = useState<number>(config.bgOpacity ?? 85);
  const [speechRate, setSpeechRate] = useState<number>(config.speechRate ?? 1.0);
  const [installedSkills, setInstalledSkills] = useState<SkillManifest[]>(() => getInstalledSkills());

  // Multi-Key Vault States
  const [registeredKeys, setRegisteredKeys] = useState<ApiKeyRecord[]>([]);
  const [keyVaultSettings, setKeyVaultSettings] = useState(() => getKeyVaultSettings());
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState<KeyProvider>("gemini");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeySecret, setNewKeySecret] = useState("");
  const [newKeyIsFree, setNewKeyIsFree] = useState(true);
  const [newKeyPriority, setNewKeyPriority] = useState<number>(1);
  const [newKeyBaseUrl, setNewKeyBaseUrl] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [keyValidatingId, setKeyValidatingId] = useState<string | null>(null);
  const [keyValidationResults, setKeyValidationResults] = useState<Record<string, KeyValidationResult>>({});
  const [showClearVaultConfirm, setShowClearVaultConfirm] = useState(false);

  // Structured Memory Vault States
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const [selectedMemoryCategory, setSelectedMemoryCategory] = useState<string>("all");
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [newMemKey, setNewMemKey] = useState("");
  const [newMemValue, setNewMemValue] = useState("");
  const [newMemCategory, setNewMemCategory] = useState<MemoryFact["category"]>("fact");
  const [editingMemory, setEditingMemory] = useState<MemoryFact | null>(null);
  const [showClearMemConfirm, setShowClearMemConfirm] = useState(false);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [importPreview, setImportPreview] = useState<{ valid: boolean; items: MemoryFact[]; error?: string } | null>(null);

  // Diagnostics States
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [liveMicLevel, setLiveMicLevel] = useState<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const micAnimFrameRef = useRef<number | null>(null);
  const [isPlayingSpeakerTest, setIsPlayingSpeakerTest] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiResult, setApiResult] = useState<ApiKeyTestResult | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  // UI Alerts
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);

  useEffect(() => {
    setMemories(loadMemoryFacts());
    setRegisteredKeys(getRegisteredKeys());
    setKeyVaultSettings(getKeyVaultSettings());

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      stopMicTest();
    };
  }, []);

  const activeVoiceObj = FEMALE_VOICES.find((v) => v.id === voiceName) || FEMALE_VOICES[0];

  // Auto-save setting changes
  const persistConfig = (partial: Partial<AppConfig>) => {
    const updated: AppConfig = {
      ...config,
      apiKey: apiKey.trim(),
      userName: userName.trim() || "Usman",
      assistantName: assistantName.trim() || "Zoya",
      voiceName,
      systemPrompt: systemPrompt.trim() || DEFAULT_PROMPT,
      theme,
      fontSize,
      cornerStyle,
      language,
      personaPreset,
      conversationMode,
      useLongTermMemory,
      echoCancellation,
      noiseSuppression,
      autoGainControl,
      enableBrowserActions,
      enableDraftConfirmations,
      bgOpacity,
      speechRate,
      ...partial,
    };
    onUpdateConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = apiKey.trim();
    saveSecureApiKey(cleanKey);
    persistConfig({});
  };

  // Memory Handlers
  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemKey.trim() || !newMemValue.trim()) return;
    addMemoryFact(newMemKey, newMemValue, newMemCategory);
    setMemories(loadMemoryFacts());
    setNewMemKey("");
    setNewMemValue("");
    setIsAddingMemory(false);
  };

  const handleSaveEditMemory = () => {
    if (!editingMemory || !editingMemory.key.trim() || !editingMemory.value.trim()) return;
    updateMemoryFact(editingMemory.id, editingMemory.key, editingMemory.value, editingMemory.category);
    setMemories(loadMemoryFacts());
    setEditingMemory(null);
  };

  const handleDeleteMemory = (id: string) => {
    deleteMemoryFact(id);
    setMemories(loadMemoryFacts());
  };

  const handleConfirmClearAllMemories = () => {
    if (confirmDeleteInput.trim().toUpperCase() !== "DELETE") {
      setValidationAlert("Please type 'DELETE' to confirm memory wipe.");
      return;
    }
    clearAllMemories();
    setMemories([]);
    setShowClearMemConfirm(false);
    setConfirmDeleteInput("");
  };

  const handleDownloadMemoriesJSON = () => {
    const data = exportMemoriesAsJSON();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zoya_memory_vault_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMemoriesTXT = () => {
    const text = exportMemoriesAsText();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zoya_memory_vault_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonChange = (text: string) => {
    setImportJsonText(text);
    if (!text.trim()) {
      setImportPreview(null);
      return;
    }
    const result = parseMemoriesJSON(text);
    setImportPreview(result);
  };

  const handleConfirmImport = () => {
    if (!importPreview?.valid || !importPreview.items.length) return;
    importMemories(importPreview.items, importMode);
    setMemories(loadMemoryFacts());
    setShowImportModal(false);
    setImportJsonText("");
    setImportPreview(null);
  };

  // Multi-Key Handlers
  const handleToggleFreeTierOnly = (val: boolean) => {
    const updated = {
      ...keyVaultSettings,
      onlyUseFreeTier: val,
    };
    setKeyVaultSettings(updated);
    saveKeyVaultSettings(updated);
  };

  const handleAddKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeySecret.trim()) return;

    const added = addApiKey(
      newKeyProvider,
      newKeyLabel.trim() || `${newKeyProvider.toUpperCase()} Key`,
      newKeySecret.trim(),
      newKeyIsFree,
      newKeyPriority,
      newKeyBaseUrl.trim() || undefined
    );

    setRegisteredKeys(getRegisteredKeys());
    setNewKeySecret("");
    setNewKeyLabel("");
    setNewKeyPriority(registeredKeys.length + 2);
    setIsAddingKey(false);

    setKeyValidatingId(added.id);
    const res = await validateApiKey(added.provider, added.key, added.baseUrl);
    setKeyValidationResults((prev) => ({ ...prev, [added.id]: res }));
    setKeyValidatingId(null);
  };

  const handleDeleteKey = (id: string) => {
    deleteApiKey(id);
    setRegisteredKeys(getRegisteredKeys());
  };

  const handleReorderKey = (id: string, dir: "up" | "down") => {
    reorderApiKey(id, dir);
    setRegisteredKeys(getRegisteredKeys());
  };

  const handleValidateSingleKey = async (record: ApiKeyRecord) => {
    setKeyValidatingId(record.id);
    const res = await validateApiKey(record.provider, record.key, record.baseUrl);
    setKeyValidationResults((prev) => ({ ...prev, [record.id]: res }));
    setKeyValidatingId(null);
  };

  const handleClearAllKeys = () => {
    clearAllKeys();
    clearSecureApiKey();
    setRegisteredKeys([]);
    setApiKey("");
    setShowClearVaultConfirm(false);
  };

  // Diagnostics Handlers
  const startMicTest = async () => {
    try {
      setIsTestingMic(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation,
          noiseSuppression,
          autoGainControl,
        },
      });
      micStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      micAudioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setLiveMicLevel(normalized);
        micAnimFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (err) {
      console.warn("Mic test error:", err);
      setIsTestingMic(false);
    }
  };

  const stopMicTest = () => {
    setIsTestingMic(false);
    setLiveMicLevel(0);
    if (micAnimFrameRef.current) {
      cancelAnimationFrame(micAnimFrameRef.current);
      micAnimFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micAudioCtxRef.current) {
      micAudioCtxRef.current.close().catch(() => {});
      micAudioCtxRef.current = null;
    }
  };

  const handlePlaySpeakerTest = () => {
    if (isPlayingSpeakerTest) return;
    try {
      setIsPlayingSpeakerTest(true);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      // Sweet melodic chime chord (A4 -> C#5 -> E5)
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.15);
      osc.frequency.setValueAtTime(659.25, now + 0.3);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.85);

      setTimeout(() => {
        setIsPlayingSpeakerTest(false);
        audioCtx.close().catch(() => {});
      }, 900);
    } catch {
      setIsPlayingSpeakerTest(false);
    }
  };

  const handleRunApiBenchmark = async () => {
    setIsTestingApi(true);
    setApiResult(null);
    try {
      const activeGeminiKey = registeredKeys.find((k) => k.provider === "gemini" && k.status === "active")?.key || apiKey;
      const res = await testApiKeyAndQuota(activeGeminiKey);
      setApiResult(res);
    } catch (e: any) {
      setApiResult({
        valid: false,
        model: "Failed",
        latencyMs: 0,
        quotaStatus: "invalid_key",
        message: e?.message || "Benchmark failed",
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Search Filter Helper
  const matchesSearch = (terms: string[]) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return terms.some((t) => t.toLowerCase().includes(q));
  };

  const categories: { id: SettingsCategory; label: string; icon: any; count?: number }[] = [
    { id: "all", label: "All Settings", icon: Sliders },
    { id: "profile", label: "Profile & Voice", icon: User },
    { id: "conversation", label: "Conversation & Persona", icon: MessageSquareHeart },
    { id: "memory", label: "Memory Vault", icon: Database, count: memories.length },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "audio", label: "Audio & Echo", icon: Volume2 },
    { id: "tools", label: "Tools & Actions", icon: Compass },
    { id: "providers", label: "Providers & Keys", icon: KeyRound, count: registeredKeys.length },
    { id: "agents", label: "Agents & Skills", icon: Layers },
    { id: "diagnostics", label: "Diagnostics", icon: Activity },
    { id: "about", label: "About & Status", icon: ShieldCheck },
  ];

  const filteredMemories = memories.filter((m) => {
    if (selectedMemoryCategory !== "all" && m.category !== selectedMemoryCategory) return false;
    if (searchQuery.trim()) {
      return matchesSearch([m.key, m.value, m.category]);
    }
    return true;
  });

  return (
    <div className="flex-1 w-full flex flex-col overflow-y-auto overscroll-contain p-3 sm:p-5 select-none relative pointer-events-auto">
      {/* 1. Header & Live Voice Engine Status */}
      <div className="max-w-4xl mx-auto w-full mb-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Settings & System Vault</h2>
              <p className="text-xs text-white/50">Comprehensive controls, local-first memory & capability transparency</p>
            </div>
          </div>

          {/* Voice Engine Status Pill */}
          <div className="flex items-center gap-2 bg-[#161824] border border-white/10 rounded-full px-3 py-1.5 shadow-md">
            <span className="text-[11px] text-white/60">Voice Engine:</span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                appState === "speaking"
                  ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                  : appState === "listening"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : appState === "muted"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : appState === "error"
                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                  : "bg-white/10 text-white/70"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  appState === "speaking"
                    ? "bg-pink-400 animate-pulse"
                    : appState === "listening"
                    ? "bg-emerald-400 animate-ping"
                    : appState === "muted"
                    ? "bg-amber-400"
                    : appState === "error"
                    ? "bg-red-400"
                    : "bg-emerald-400"
                }`}
              />
              <span className="capitalize">{appState}</span>
            </span>

            {onToggleListening && (
              <button
                type="button"
                onClick={onToggleListening}
                className="text-[11px] font-medium text-pink-400 hover:text-pink-300 ml-1 transition-colors cursor-pointer"
              >
                {isSessionActive ? "End Session" : "Start Live"}
              </button>
            )}
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings, toggles, memory keys, or capabilities..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-[#141622] border border-white/10 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-pink-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categories Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery("");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? "bg-pink-500/25 text-pink-300 border border-pink-500/50 shadow-sm"
                    : "bg-[#141622] hover:bg-white/10 text-white/70 border border-white/5"
                }`}
              >
                <Icon size={13} className={isActive ? "text-pink-300" : "text-white/50"} />
                <span>{cat.label}</span>
                {typeof cat.count === "number" && cat.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white/60">
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto w-full space-y-6 pb-12">
        {/* ========================================================================= */}
        {/* CATEGORY 1: Profile & Voice */}
        {/* ========================================================================= */}
        {(activeCategory === "all" || activeCategory === "profile") &&
          matchesSearch(["profile", "user", "creator", "usman", "name", "voice", "kore", "video", "background"]) && (
            <section className="bg-[#12141F] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-pink-400" />
                  <h3 className="text-base font-semibold text-white">Profile & Voice Identity</h3>
                </div>
                <span className="text-xs text-pink-300 bg-pink-500/10 border border-pink-500/20 px-2.5 py-0.5 rounded-full">
                  Creator: Usman
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-white/70 block mb-1">Your Name (Creator)</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => {
                      setUserName(e.target.value);
                      persistConfig({ userName: e.target.value });
                    }}
                    placeholder="Usman"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-pink-500/50"
                  />
                  <p className="text-[11px] text-white/40 mt-1">Zoya acknowledges you warmly as her visionary creator.</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70 block mb-1">Assistant Name</label>
                  <input
                    type="text"
                    value={assistantName}
                    onChange={(e) => {
                      setAssistantName(e.target.value);
                      persistConfig({ assistantName: e.target.value });
                    }}
                    placeholder="Zoya"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-pink-500/50"
                  />
                  <p className="text-[11px] text-white/40 mt-1">Supreme Owner / Main Brain persona.</p>
                </div>
              </div>

              {/* Voice Card */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white">
                    <Volume2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{activeVoiceObj.name}</span>
                      <span className="text-xs text-pink-300">• {activeVoiceObj.hindiName}</span>
                      {activeVoiceObj.isDefault && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.2 rounded-full font-semibold">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{activeVoiceObj.desc}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenVoiceModal}
                  className="px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Change Voice (6 Female Voices)
                </button>
              </div>

              {/* Video Background with Validation */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Video size={18} className="text-cyan-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Video Background (Local IndexedDB)</h4>
                      <p className="text-xs text-white/50">MP4, WebM, OGG up to 50MB. Stored locally on device.</p>
                    </div>
                  </div>
                  {videoSrc ? (
                    <button
                      type="button"
                      onClick={onRemoveVideo}
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium border border-red-500/30 cursor-pointer"
                    >
                      Remove Video
                    </button>
                  ) : null}
                </div>

                <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-white/20 hover:border-pink-500/50 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium cursor-pointer transition-colors">
                  <Upload size={14} />
                  <span>{videoSrc ? "Replace Background Video" : "Upload Video Background (<50MB)"}</span>
                  <input type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" onChange={onVideoUpload} className="hidden" />
                </label>
              </div>
            </section>
          )}

        {/* ========================================================================= */}
        {/* CATEGORY 2: Conversation & Persona */}
        {/* ========================================================================= */}
        {(activeCategory === "all" || activeCategory === "conversation") &&
          matchesSearch(["conversation", "persona", "companion", "tech", "poet", "philosopher", "prompt", "fast", "expressive", "language", "hindi", "urdu"]) && (
            <section className="bg-[#12141F] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquareHeart size={18} className="text-pink-400" />
                  <h3 className="text-base font-semibold text-white">Conversation & Persona Directive</h3>
                </div>
                <span className="text-xs text-white/50">Adaptive real-time intelligence</span>
              </div>

              {/* Persona Selector */}
              <div>
                <label className="text-xs font-semibold text-white/80 block mb-2">Persona Directive</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: "companion",
                      title: "💖 Sweet Companion",
                      hindi: "दिल से अपनापन",
                      desc: "Affectionate, warm, gentle sanctuary. Banishes creative burnout and stress for Usman.",
                    },
                    {
                      id: "tech",
                      title: "💡 Tech Co-Founder",
                      hindi: "वायरल स्क्रिप्ट लैब",
                      desc: "High-velocity, sharp co-founder. Focuses on YouTube Shorts hooks, retention, and scripts.",
                    },
                    {
                      id: "poet",
                      title: "🥀 Poetic & Soulful",
                      hindi: "शायराना अंदाज़",
                      desc: "Melodic cadence, gentle shayari, romantic metaphors, and delicate emotional intimacy.",
                    },
                    {
                      id: "philosopher",
                      title: "🌙 Mindful Thinker",
                      hindi: "गहन विचार",
                      desc: "Calm, contemplative, deep late-night reflections on meaning, mindfulness, and vision.",
                    },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPersonaPreset(p.id as PersonaPreset);
                        persistConfig({ personaPreset: p.id as PersonaPreset });
                      }}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        personaPreset === p.id
                          ? "bg-pink-500/20 border-pink-500/60 shadow-md shadow-pink-500/10 ring-1 ring-pink-500/40"
                          : "bg-black/30 border-white/10 hover:border-white/25 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{p.title}</span>
                        <span className="text-[10px] text-pink-300 font-medium">{p.hindi}</span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation Mode (Expressive vs Fast) */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-white">Conversation Mode (Pacing & Latency)</h4>
                    <p className="text-[11px] text-white/50">Choose between emotional depth and rapid-fire response time.</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setConversationMode("expressive");
                        persistConfig({ conversationMode: "expressive" });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        conversationMode === "expressive"
                          ? "bg-pink-600 text-white shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      💖 Expressive
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConversationMode("fast");
                        persistConfig({ conversationMode: "fast" });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        conversationMode === "fast"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      ⚡ Fast
                    </button>
                  </div>
                </div>

                {/* Latency Warning / Info Banner */}
                <div className="p-2.5 rounded-xl bg-[#1A1822] border border-white/5 text-[11px] text-white/70 leading-relaxed">
                  {conversationMode === "fast" ? (
                    <span className="text-amber-300 font-medium flex items-center gap-1.5">
                      <Zap size={13} className="shrink-0 text-amber-400" />
                      <strong>Fast Mode Active:</strong> Replies are condensed to 1-2 punchy sentences to minimize Time-to-First-Audio latency. Best for fast brainstorming.
                    </span>
                  ) : (
                    <span className="text-pink-300 font-medium flex items-center gap-1.5">
                      <Heart size={13} className="shrink-0 text-pink-400" />
                      <strong>Expressive Mode Active:</strong> Delivers full emotional storytelling, natural human pauses, and rich intimacy (~200ms extra buffer for voice quality).
                    </span>
                  )}
                </div>
              </div>

              {/* Language Preference */}
              <div>
                <label className="text-xs font-semibold text-white/80 block mb-2">Language Preference & Accent Expectation</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "hinglish", label: "Hinglish", desc: "Hindi + English Blend" },
                    { id: "hindi", label: "Pure Hindi", desc: "Shuddh Madhur Hindi" },
                    { id: "english", label: "Indian English", desc: "Fluent with Indian Warmth" },
                    { id: "urdu", label: "Sweet Urdu", desc: "Adab, Tehzeeb & Respect" },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setLanguage(l.id as LanguagePreference);
                        persistConfig({ language: l.id as LanguagePreference });
                      }}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        language === l.id
                          ? "bg-pink-500/20 border-pink-500/60 text-white"
                          : "bg-black/30 border-white/10 text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <div className="text-xs font-semibold">{l.label}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">{l.desc}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/40 mt-1.5">
                  Affects microphone phoneme expectations and companion vocal mannerisms.
                </p>
              </div>

              {/* Custom System Instruction Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white/80">Base System Instruction</label>
                  <button
                    type="button"
                    onClick={() => {
                      setSystemPrompt(DEFAULT_PROMPT);
                      persistConfig({ systemPrompt: DEFAULT_PROMPT });
                    }}
                    className="text-[11px] text-pink-400 hover:text-pink-300 cursor-pointer"
                  >
                    Reset to Default Prompt
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => {
                    setSystemPrompt(e.target.value);
                    persistConfig({ systemPrompt: e.target.value });
                  }}
                  className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-pink-500/50 leading-relaxed"
                />
              </div>
            </section>
          )}

        {/* ========================================================================= */}
        {/* CATEGORY 3: Structured Memory System */}
        {/* ========================================================================= */}
        {(activeCategory === "all" || activeCategory === "memory") &&
          matchesSearch(["memory", "vault", "fact", "structured", "export", "import", "creator", "project", "identity", "preference"]) && (
            <section className="bg-[#12141F] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Database size={18} className="text-cyan-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">Structured Long-Term Memory Vault</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Cloud Database Connected
                      </span>
                    </div>
                    <p className="text-xs text-white/50">{memories.length} facts memorized • Firestore Project: gen-lang-client-0221545482</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadMemoriesJSON}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileDown size={13} />
                    <span>Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>Import JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearMemConfirm(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium border border-red-500/20 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Memory Toggle */}
              <SettingToggleCard
                label="Inject Long-Term Memories into Voice & Chat"
                description="Intelligently appends personal knowledge, channel projects, and creator facts into Gemini system instructions."
                checked={useLongTermMemory}
                onChange={(val) => {
                  setUseLongTermMemory(val);
                  persistConfig({ useLongTermMemory: val });
                }}
                icon={<Database size={18} />}
                permissionNeeded="Local Storage (No external tracking or cloud leak)"
                onOffDifference={{
                  on: "Zoya recalls your channel projects, identity, and personal preferences.",
                  off: "Zero memory facts injected; companion starts clean each session.",
                }}
                environment="web"
              />

              {/* Memory Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {["all", "identity", "preference", "project", "fact", "instruction"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedMemoryCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs capitalize cursor-pointer transition-colors ${
                      selectedMemoryCategory === cat
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsAddingMemory(!isAddingMemory)}
                  className="px-3 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 text-xs font-medium flex items-center gap-1 ml-auto cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Fact</span>
                </button>
              </div>

              {/* Add Memory Inline Form */}
              {isAddingMemory && (
                <form onSubmit={handleAddMemorySubmit} className="p-4 rounded-2xl bg-black/40 border border-pink-500/30 space-y-3">
                  <div className="text-xs font-semibold text-pink-300">New Structured Memory Fact</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Key / Topic (e.g. Favorite Editor)"
                      value={newMemKey}
                      onChange={(e) => setNewMemKey(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500/50"
                      required
                    />
                    <select
                      value={newMemCategory}
                      onChange={(e) => setNewMemCategory(e.target.value as any)}
                      className="px-3 py-2 rounded-xl bg-[#181A24] border border-white/10 text-white text-xs focus:outline-none"
                    >
                      <option value="identity">Identity</option>
                      <option value="preference">Preference</option>
                      <option value="project">Project</option>
                      <option value="fact">Fact</option>
                      <option value="instruction">Instruction</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Detail / Memory Value"
                      value={newMemValue}
                      onChange={(e) => setNewMemValue(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500/50"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingMemory(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 text-white/60 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold cursor-pointer shadow-md"
                    >
                      Save to Vault
                    </button>
                  </div>
                </form>
              )}

              {/* Memory Facts List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredMemories.length === 0 ? (
                  <div className="text-center py-6 text-xs text-white/40">
                    No memories found in this category.
                  </div>
                ) : (
                  filteredMemories.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3 rounded-2xl bg-black/30 border border-white/5 hover:border-white/15 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white">{mem.key}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-white/10 text-cyan-300">
                            {mem.category}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {new Date(mem.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed break-words">{mem.value}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingMemory({ ...mem })}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(mem.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-300 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

        {/* ========================================================================= */}
        {/* CATEGORY 4: Appearance & Styling */}
        {/* ========================================================================= */}
        {(activeCategory === "all" || activeCategory === "appearance") &&
          matchesSearch(["appearance", "theme", "font", "size", "corner", "radius", "opacity", "styling"]) && (
            <section className="bg-[#12141F] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Palette size={18} className="text-pink-400" />
                  <h3 className="text-base font-semibold text-white">Appearance & UI Theming</h3>
                </div>
                <span className="text-xs text-white/50">Customizable local aesthetic</span>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="text-xs font-semibold text-white/80 block mb-2">Color Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "midnight", label: "Midnight", color: "bg-[#0A0C10]", border: "border-cyan-500/40", desc: "Deep Navy & Charcoal" },
                    { id: "rosegold", label: "Rose Gold", color: "bg-[#140C12]", border: "border-rose-500/40", desc: "Warm Dark Rose" },
                    { id: "cyberpunk", label: "Cyberpunk", color: "bg-[#070D12]", border: "border-cyan-400/40", desc: "Neon Cyan & Dark Slate" },
                    { id: "amethyst", label: "Amethyst", color: "bg-[#0E0A16]", border: "border-purple-500/40", desc: "Royal Dark Purple" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTheme(t.id as AppTheme);
                        persistConfig({ theme: t.id as AppTheme });
                      }}
                      className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                        theme === t.id
                          ? "bg-pink-500/20 border-pink-500/60 shadow-md ring-1 ring-pink-500/40"
                          : "bg-black/30 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-3.5 h-3.5 rounded-full ${t.color} border ${t.border}`} />
                        <span className="text-xs font-bold text-white">{t.label}</span>
                      </div>
                      <p className="text-[10px] text-white/50">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Corner Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/80 block mb-1.5">Font Scale</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "compact", label: "Compact" },
                      { id: "normal", label: "Normal" },
                      { id: "large", label: "Large" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setFontSize(f.id as FontSize);
                          persistConfig({ fontSize: f.id as FontSize });
                        }}
                        className={`py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-center ${
                          fontSize === f.id
                            ? "bg-pink-600 text-white shadow-sm"
                            : "bg-black/30 border border-white/10 text-white/60 hover:bg-white/5"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/80 block mb-1.5">Corner Radius</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "rounded-xl", label: "Rounded XL" },
                      { id: "rounded-2xl", label: "Rounded 2XL" },
                      { id: "rounded-3xl", label: "Rounded 3XL" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCornerStyle(c.id as CornerStyle);
                          persistConfig({ cornerStyle: c.id as CornerStyle });
                        }}
                        className={`py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-center ${
                          cornerStyle === c.id
                            ? "bg-pink-600 text-white shadow-sm"
                            : "bg-black/30 border border-white/10 text-white/60 hover:bg-white/5"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Background Video Opacity */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white/80">Background Overlay Darkness</span>
                  <span className="text-pink-300 font-mono">{bgOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={bgOpacity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setBgOpacity(val);
                    persistConfig({ bgOpacity: val });
                  }}
                  className="w-full h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer accent-pink-500"
                />
              </div>
            </section>
          )}

        {/* ========================================================================= */}
        {/* CATEGORY 5: Audio & Echo */}
        {/* ========================================================================= */}
        {(activeCategory === "all" || activeCategory === "audio") &&
          matchesSearch(["audio", "echo", "noise", "suppression", "gain", "speech", "rate", "volume", "sound", "microphone"]) && (
            <section className="bg-[#12141F] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Volume2 size={18} className="text-cyan-400" />
                  <h3 className="text-base font-semibold text-white">Audio Processing & Echo Controls</h3>
                </div>
                <span className="text-xs text-white/50">Web Audio API Pipeline</span>
              </div>

              <div className="space-y-3">
                <SettingToggleCard
                  label="Acoustic Echo Cancellation (AEC)"
                  description="Hardware DSP filter preventing speaker audio from re-entering your microphone during conversation."
                  checked={echoCancellation}
                  onChange={(val) => {
                    setEchoCancellation(val);
                    persistConfig({ echoCancellation: val });
                  }}
                  icon={<Volume2 size={18} />}
                  permissionNeeded="Browser getUserMedia audio track constraint"
                  onOffDifference={{
                    on: "Speaker sound is filtered so Zoya doesn't hear herself.",
                    off: "Raw capture; may cause loopback if not wearing headphones.",
                  }}
                  environment="web"
                />

                <SettingToggleCard
                  label="Hardware Noise Suppression"
                  description="Real-time browser digital filter dampening computer fans, background hums, and keyboard clicks."
                  checked={noiseSuppression}
                  onChange={(val) => {
                    setNoiseSuppression(val);
                    persistConfig({ noiseSuppression: val });
                  }}
                  icon={<Mic size={18} />}
                  permissionNeeded="Browser getUserMedia audio track constraint"
                  onOffDifference={{
                    on: "Filters ambient fan and street noise for crisp speech.",
                    off: "Captures full ambient room sound and quiet whispers.",
                  }}
                  environment="web"
                />

                <SettingToggleCard
                  label="Auto Gain Control (AGC)"
                  description="Dynamically balances user mic sensitivity so quiet and loud voices are heard clearly."
                  checked={autoGainControl}
                  onChange={(val) => {
                    setAutoGainControl(val);
                    persistConfig({ autoGainControl: val });
                  }}
                  icon={<Sliders size={18} />}
                  permissionNeeded="Browser getUserMedia audio track constraint"
                  onOffDifference={{
                    on: "Normalizes voice level automatically.",
                    off: "Maintains fixed hardware microphone level.",
                  }}
                  environment="web"
                />
              </div>

              {/* Speech Rate Slider */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Voice Speech Rate</span>
                  <span className="text-pink-300 font-mono">{speechRate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSpeechRate(val);
                    persistConfig({ speechRate: val });
                  }}
                  className="w-full h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-[10px] text-white/40">
                  <span>0.8x (Deliberate)</span>
                  <span>1.0x (Natural)</span>
                  <span>1.3x (Brisk)</span>
                </div>
              </div>
            </section>
          )}

        {/* ========================================================================= */}
        {/* CATEGORY 6: Tools & Browser Actions */}
        {/* ========================================================================= */}
        {(activeCategory === "all" || activeCategory === "tools") &&
          matchesSearch(["tools", "browser", "actions", "whatsapp", "youtube", "spotify", "screen", "click", "native", "android", "sos", "touch"]) && (
            <section className="bg-[#12141F] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Compass size={18} className="text-pink-400" />
                  <h3 className="text-base font-semibold text-white">Tools & Capability Transparency</h3>
                </div>
                <span className="text-xs text-white/50">Strict Web vs Native Honesty</span>
              </div>

              <div className="space-y-3">
                <SettingToggleCard
                  label="Browser External Actions (Media & Web)"
                  description="Enables Zoya to open verified search tabs on YouTube, Spotify, and prepare external draft links."
                  checked={enableBrowserActions}
                  onChange={(val) => {
                    setEnableBrowserActions(val);
                    persistConfig({ enableBrowserActions: val });
                  }}
                  icon={<Globe size={18} />}
                  permissionNeeded="Browser Popup / Tab Navigation"
                  onOffDifference={{
                    on: "Voice commands prepare verified draft URLs & search queries.",
                    off: "Actions are disabled; Zoya only replies with spoken text.",
                  }}
                  environment="web"
                />

                <SettingToggleCard
                  label="Draft Confirmation Safety Guard"
                  description="Always prepares a visible draft banner for review instead of opening external windows unexpectedly."
                  checked={enableDraftConfirmations}
                  onChange={(val) => {
                    setEnableDraftConfirmations(val);
                    persistConfig({ enableDraftConfirmations: val });
                  }}
                  icon={<ShieldCheck size={18} />}
                  permissionNeeded="None (Client Safety Protocol)"
                  onOffDifference={{
                    on: "Shows 'Draft Prepared' banner for manual user tap.",
                    off: "Attempts direct window.open if popups are permitted.",
                  }}
                  environment="web"
                />

                {/* Native Only Features with Strict Honesty */}
                <SettingToggleCard
                  label="Autonomous UI Clicking & Touch Swiping"
                  description="Directly taps buttons, fills forms, and scrolls inside third-party apps automatically."
                  checked={false}
                  icon={<Smartphone size={18} />}
                  permissionNeeded="Android Accessibility Service (AccessibilityNodeInfo & dispatchGesture)"
                  onOffDifference={{
                    on: "Available only in Native Android Companion App.",
                    off: "Disabled in browser sandbox to prevent security exploits.",
                  }}
                  environment="native-only"
                  nativeNote="Web browsers run in an isolated sandbox and cannot tap or click outside the current web page. This requires the Native Android companion."
                />

                <SettingToggleCard
                  label="Screen Text Reading & Visual UI Capture"
                  description="Inspects active screen contents of other apps to extract text and analyze context."
                  checked={false}
                  icon={<Eye size={18} />}
                  permissionNeeded="Android MediaProjection & AccessibilityService"
                  onOffDifference={{
                    on: "Available only in Native Android Companion App.",
                    off: "Web browsers cannot read user device screens or other apps.",
                  }}
                  environment="native-only"
                  nativeNote="For your privacy, web browsers do not permit reading other application screens. Requires Native Android version."
                />

                <SettingToggleCard
                  label="Silent Background WhatsApp Auto-Reply"
                  description="Replies to incoming WhatsApp messages silently in the background without opening the app."
                  checked={false}
                  icon={<Smartphone size={18} />}
                  permissionNeeded="Android NotificationListenerService & Accessibility"
                  onOffDifference={{
                    on: "Available only in Native Android Companion App.",
                    off: "On web, Zoya prepares a draft link for manual tap.",
                  }}
                  environment="native-only"
                  nativeNote="Web apps cannot intercept cellular notifications or send messages silently without user approval."
                />
              </div>
            </section>
          )}

        {/* ========================================================================= */}
        {/* CATEGORY 7: Providers & Keys (Multi-Key Manager) */}
        {/* ========================================================================= */}
        {(activeCategory === "all" || activeCategory === "providers") &&
          matchesSearch(["provider", "providers", "key", "keys", "gemini", "groq", "openrouter", "vault", "quota", "free", "tier", "api"]) && (
            <section className="bg-[#12141F] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-pink-400" />
                  <div>
                    <h3 className="text-base font-semibold text-white">Multi-Key Manager & Provider Vault</h3>
                    <p className="text-xs text-white/50">{registeredKeys.length} keys in priority rotation</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingKey(!isAddingKey)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md hover:from-pink-600 hover:to-rose-700 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add New Key</span>
                  </button>
                  {registeredKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearVaultConfirm(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium border border-red-500/20 cursor-pointer"
                    >
                      Clear Vault
                    </button>
                  )}
                </div>
              </div>

              {/* Free-Tier First Toggle */}
              <SettingToggleCard
                label="Enforce Free-Tier First Policy"
                description="Automatically prioritizes free quota keys and prevents unintentional paid token charges."
                checked={keyVaultSettings.onlyUseFreeTier}
                onChange={handleToggleFreeTierOnly}
                icon={<ShieldCheck size={18} />}
                permissionNeeded="Local Key Rotation Protocol"
                onOffDifference={{
                  on: "Strictly filters rotation to keys marked as Free-Tier.",
                  off: "Rotates across all keys in priority order.",
                }}
                environment="web"
              />

              {/* Add Key Form */}
              {isAddingKey && (
                <form onSubmit={handleAddKeySubmit} className="p-4 rounded-2xl bg-black/40 border border-pink-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-300">Add API Key to Rotation Vault</span>
                    <button type="button" onClick={() => setIsAddingKey(false)} className="text-white/40 hover:text-white text-xs">
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-white/60 block mb-1">Provider</label>
                      <select
                        value={newKeyProvider}
                        onChange={(e) => setNewKeyProvider(e.target.value as KeyProvider)}
                        className="w-full px-3 py-2 rounded-xl bg-[#181A24] border border-white/10 text-white text-xs focus:outline-none"
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="groq">Groq (Llama / Mixtral)</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="custom">Custom Proxy</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-white/60 block mb-1">Label (e.g. Free Tier #1)</label>
                      <input
                        type="text"
                        value={newKeyLabel}
                        onChange={(e) => setNewKeyLabel(e.target.value)}
                        placeholder="My Gemini Key"
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500/50"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-white/60 block mb-1">Priority Order (1 = Highest)</label>
                      <input
                        type="number"
                        min="1"
                        value={newKeyPriority}
                        onChange={(e) => setNewKeyPriority(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-white/60 block mb-1">API Key Secret</label>
                    <input
                      type="password"
                      value={newKeySecret}
                      onChange={(e) => setNewKeySecret(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-pink-500/50"
                      required
                    />
                  </div>

                  {newKeyProvider === "custom" && (
                    <div>
                      <label className="text-[11px] text-white/60 block mb-1">Custom Base URL</label>
                      <input
                        type="url"
                        value={newKeyBaseUrl}
                        onChange={(e) => setNewKeyBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newKeyIsFree}
                        onChange={(e) => setNewKeyIsFree(e.target.checked)}
                        className="accent-pink-500 rounded"
                      />
                      <span>Mark as Free-Tier Key (No billing risk)</span>
                    </label>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-semibold cursor-pointer shadow-md"
                    >
                      Save Key
                    </button>
                  </div>
                </form>
              )}

              {/* Registered Keys List */}
              <div className="space-y-2.5">
                {registeredKeys.length === 0 ? (
                  <div className="text-center py-6 text-xs text-white/40">
                    No API keys registered in vault. Primary key is used as fallback.
                  </div>
                ) : (
                  registeredKeys.map((record, index) => {
                    const isRevealed = revealedKeys[record.id];
                    const validation = keyValidationResults[record.id];
                    const isValidating = keyValidatingId === record.id;

                    return (
                      <div
                        key={record.id}
                        className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between gap-3 flex-wrap"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Priority controls */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleReorderKey(record.id, "up")}
                              disabled={index === 0}
                              className="p-1 rounded bg-white/5 hover:bg-white/15 text-white/60 disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorderKey(record.id, "down")}
                              disabled={index === registeredKeys.length - 1}
                              className="p-1 rounded bg-white/5 hover:bg-white/15 text-white/60 disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white uppercase">{record.provider}</span>
                              <span className="text-xs text-white/80">{record.label}</span>
                              <span className="text-[10px] font-semibold bg-white/10 text-white/60 px-2 py-0.2 rounded-full">
                                Priority #{record.priority}
                              </span>
                              {record.isFreeTier && (
                                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                                  Free Tier
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                                  record.status === "active"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : record.status === "cooldown"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                                }`}
                              >
                                {record.status === "cooldown" ? "Cooldown (429)" : record.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-mono text-white/60">
                                {isRevealed ? record.key : maskKey(record.key)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRevealedKeys((prev) => ({ ...prev, [record.id]: !isRevealed }))}
                                className="text-white/40 hover:text-white cursor-pointer"
                              >
                                {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>

                            {validation && (
                              <p
                                className={`text-[10px] mt-1 ${
                                  validation.valid ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                {validation.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleValidateSingleKey(record)}
                            disabled={isValidating}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium border border-white/10 cursor-pointer"
                          >
                            {isValidating ? "Testing..." : "Test Key"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKey(record.id)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-300 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

        {/* ========================================================================= */}
        {/* CATEGORY 8: Agents & Skills */}
        {/* ========================================================================= */}
        {(activeCategory === "all" || activeCategory === "agents") &&
          matchesSearch(["agents", "agent", "skills", "zoya", "joey", "architecture", "brain", "pc"]) && (
            <section className="bg-[#12141F] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-cyan-400" />
                  <h3 className="text-base font-semibold text-white">Agents & Skill Hierarchy</h3>
                </div>
                <span className="text-xs text-white/50">Multi-Agent System Architecture</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Zoya Brain */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-950/30 to-black/40 border border-pink-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-pink-300">ZOYA (Supreme Brain)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Supreme Main Brain. Handles emotional voice conversation, creator stress relief, script ideas, and real-time reasoning.
                  </p>
                  <div className="pt-2 border-t border-white/5 text-[10px] text-white/50">
                    Platform: Web PWA & Future Android Companion
                  </div>
                </div>

                {/* Joey Subordinate */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white/80">JOEY (Subordinate Agent)</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold border border-purple-500/30">
                      Planned
                    </span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Subordinate PC-side agent. Planned for heavy local rendering, FFmpeg export pipelines, and PC storage synchronization.
                  </p>
                  <div className="pt-2 border-t border-white/5 text-[10px] text-white/50">
                    Platform: PC Native Companion (Later Phase)
                  </div>
                </div>
              </div>

              {/* Content Creation Studio Launch Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-amber-400" />
                    <span className="text-sm font-bold text-white">Zoya Content Creation Studio</span>
                  </div>
                  <p className="text-xs text-white/70">
                    Daily trending research (YouTube/TikTok/Facebook), 60s viral scripts, and human approval queue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab("studio")}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all cursor-pointer shadow-lg"
                >
                  Open Content Studio
                </button>
              </div>

              {/* Verified Skill Manifests System */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Cryptographically Verified Skill Manifests ({installedSkills.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Root Signature Verified
                  </span>
                </div>

                <div className="space-y-2.5">
                  {installedSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{skill.name}</span>
                          <span className="text-[10px] text-white/40 font-mono">v{skill.version}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ED25519 VERIFIED
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-white/60">
                            <input
                              type="checkbox"
                              checked={skill.isActive}
                              onChange={(e) => {
                                toggleSkillActive(skill.id, e.target.checked);
                                setInstalledSkills(getInstalledSkills());
                              }}
                              className="accent-pink-500 rounded"
                            />
                            <span className="text-[11px]">{skill.isActive ? "Active" : "Disabled"}</span>
                          </label>
                        </div>
                      </div>

                      <p className="text-xs text-white/60 leading-relaxed">{skill.description}</p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                        <span className="text-white/40 font-semibold">Permissions:</span>
                        {skill.permissions.map((p, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-mono">
                            {p}
                          </span>
                        ))}
                        {skill.networkScopes.length > 0 && (
                          <>
                            <span className="text-white/40 font-semibold ml-1">Scopes:</span>
                            {skill.networkScopes.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                                {s}
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

        {/* ========================================================================= */}
        {/* CATEGORY 9: Diagnostics & Hardware Tests */}
        {/* ========================================================================= */}
        {(activeCategory === "all" || activeCategory === "diagnostics") &&
          matchesSearch(["diagnostics", "test", "mic", "microphone", "speaker", "latency", "benchmark", "network", "error", "status"]) && (
            <section className="bg-[#12141F] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-cyan-400" />
                  <h3 className="text-base font-semibold text-white">System Diagnostics & Audio Tests</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <Wifi size={14} />
                  <span>{isOnline ? "Network Online" : "Offline"}</span>
                </div>
              </div>

              {/* Live Hardware Mic Test */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white">Microphone Hardware Test</h4>
                    <p className="text-[11px] text-white/50">Verify browser audio stream capture and input levels.</p>
                  </div>
                  <button
                    type="button"
                    onClick={isTestingMic ? stopMicTest : startMicTest}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isTestingMic
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                    }`}
                  >
                    {isTestingMic ? <Square size={12} className="fill-current" /> : <Play size={12} className="fill-current" />}
                    <span>{isTestingMic ? "Stop Mic Test" : "Test Microphone"}</span>
                  </button>
                </div>

                {isTestingMic && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-white/60">
                      <span>Mic Input Level</span>
                      <span className="font-mono text-cyan-300">{liveMicLevel}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-pink-500 transition-all duration-75"
                        style={{ width: `${liveMicLevel}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Speaker Test */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-white">Speaker & AudioContext Output</h4>
                  <p className="text-[11px] text-white/50">Plays a synthesized test chord via Web Audio API.</p>
                </div>
                <button
                  type="button"
                  onClick={handlePlaySpeakerTest}
                  disabled={isPlayingSpeakerTest}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Volume2 size={14} />
                  <span>{isPlayingSpeakerTest ? "Chiming..." : "Test Chime"}</span>
                </button>
              </div>

              {/* API Benchmark */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white">Live API Benchmark & Quota Status</h4>
                    <p className="text-[11px] text-white/50">Measures roundtrip token latency and verifies key validity.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunApiBenchmark}
                    disabled={isTestingApi}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Activity size={13} />
                    <span>{isTestingApi ? "Benchmarking..." : "Benchmark API"}</span>
                  </button>
                </div>

                {apiResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      apiResult.valid ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200" : "bg-red-950/30 border-red-500/30 text-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>Status: {apiResult.valid ? "Healthy / Active" : "Failed"}</span>
                      {apiResult.valid && <span className="font-mono">{apiResult.latencyMs}ms Latency</span>}
                    </div>
                    <p className="text-[11px] opacity-80">{apiResult.message}</p>
                  </div>
                )}
              </div>

              {/* Last Error Display */}
              {voiceErrorMsg && (
                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-red-300 font-bold">
                    <AlertCircle size={16} />
                    <span>Active Voice Error Encountered</span>
                  </div>
                  <p className="text-red-200/90">{voiceErrorMsg}</p>
                  <div className="text-[11px] text-amber-200/90 bg-black/40 p-2.5 rounded-xl border border-red-500/20">
                    <strong>Recovery Step:</strong> Verify microphone permission in browser settings and ensure your Gemini API key is active.
                  </div>
                </div>
              )}
            </section>
          )}

        {/* ========================================================================= */}
        {/* CATEGORY 10: About & Capability Status */}
        {/* ========================================================================= */}
        {(activeCategory === "all" || activeCategory === "about") &&
          matchesSearch(["about", "status", "capability", "matrix", "version", "pwa", "update", "android"]) && (
            <section className="bg-[#12141F] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-pink-400" />
                  <h3 className="text-base font-semibold text-white">About & Capability Status</h3>
                </div>
                <span className="text-xs text-white/50">v2.5 Supreme Brain</span>
              </div>

              {/* Capability Matrix */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <h4 className="text-xs font-semibold text-white">Full Capability Matrix: Web vs Native Android</h4>
                <div className="space-y-1.5 text-xs">
                  {[
                    { name: "Live Real-time Voice Chat", env: "Web PWA", status: "Operational", ready: true },
                    { name: "Structured Local Memory Vault", env: "Web PWA", status: "Operational", ready: true },
                    { name: "Multi-Key Free-Tier Rotation", env: "Web PWA", status: "Operational", ready: true },
                    { name: "Video Background (IndexedDB)", env: "Web PWA", status: "Operational", ready: true },
                    { name: "WhatsApp Web Drafts", env: "Web PWA", status: "Operational", ready: true },
                    { name: "Autonomous Screen Reading", env: "Android App", status: "Requires Native OS", ready: false },
                    { name: "Cross-App Touch Automation", env: "Android App", status: "Requires Native OS", ready: false },
                    { name: "Silent WhatsApp Auto-Reply", env: "Android App", status: "Requires Native OS", ready: false },
                    { name: "Cellular Call Control", env: "Android App", status: "Requires Native OS", ready: false },
                    { name: "Touch Guard & SOS Auto Actions", env: "Android App", status: "Requires Native OS", ready: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs">
                      <span className="text-white/80">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40">{item.env}</span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${
                            item.ready ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* App Update & Install */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-xs font-semibold text-white">Application Maintenance</h4>
                  <p className="text-[11px] text-white/50">Clear service worker caches or trigger fresh PWA installation.</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={onInstallApp}
                      className="px-3.5 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-xs font-semibold border border-pink-500/40 cursor-pointer"
                    >
                      Install PWA
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onForceUpdate}
                    disabled={updatingPWA}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} className={updatingPWA ? "animate-spin" : ""} />
                    <span>{updatingPWA ? "Updating..." : "Force Update"}</span>
                  </button>
                </div>
              </div>

              {/* Creator Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-950/20 to-purple-950/20 border border-pink-500/20 text-xs text-white/70 space-y-1">
                <div className="font-semibold text-pink-300">Created for Usman</div>
                <p className="text-[11px] leading-relaxed">
                  Supreme Main Brain AI voice companion & YouTube/Shorts creative sanctuary. All rights reserved.
                </p>
              </div>
            </section>
          )}

        {/* Global Floating Save Bar if changes occur */}
        {savedSuccess && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-500 text-black font-semibold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
            <Check size={14} className="stroke-[3]" />
            <span>Settings Saved & Persisted!</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Edit Memory Modal */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161824] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Edit Memory Fact</h3>
              <button type="button" onClick={() => setEditingMemory(null)} className="text-white/40 hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">Key / Topic</label>
                <input
                  type="text"
                  value={editingMemory.key}
                  onChange={(e) => setEditingMemory({ ...editingMemory, key: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Category</label>
                <select
                  value={editingMemory.category}
                  onChange={(e) => setEditingMemory({ ...editingMemory, category: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[#181A24] border border-white/10 text-white text-xs"
                >
                  <option value="identity">Identity</option>
                  <option value="preference">Preference</option>
                  <option value="project">Project</option>
                  <option value="fact">Fact</option>
                  <option value="instruction">Instruction</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Value / Fact Content</label>
                <textarea
                  rows={3}
                  value={editingMemory.value}
                  onChange={(e) => setEditingMemory({ ...editingMemory, value: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMemory(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white/60 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditMemory}
                className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-md"
              >
                Save Fact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Memories Strong Confirmation Modal */}
      {showClearMemConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#181216] border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-200">Wipe All Memory Facts?</h3>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                This will permanently delete all {memories.length} structured memories. Zoya will forget all personal facts.
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] text-white/60">Type &quot;DELETE&quot; to confirm:</label>
              <input
                type="text"
                value={confirmDeleteInput}
                onChange={(e) => {
                  setConfirmDeleteInput(e.target.value);
                  setValidationAlert(null);
                }}
                placeholder="DELETE"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-red-500/30 text-white font-mono text-center text-xs tracking-widest uppercase focus:outline-none focus:border-red-500"
              />
              {validationAlert && <p className="text-[10px] text-red-400">{validationAlert}</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowClearMemConfirm(false);
                  setConfirmDeleteInput("");
                  setValidationAlert(null);
                }}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAllMemories}
                disabled={confirmDeleteInput.trim().toUpperCase() !== "DELETE"}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold shadow-lg cursor-pointer transition-colors"
              >
                Wipe Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Memories with Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#161824] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Import Memory JSON with Preview</h3>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                  setImportJsonText("");
                }}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-white/60 block mb-1">Paste JSON Array of Memory Facts:</label>
              <textarea
                rows={5}
                value={importJsonText}
                onChange={(e) => handleImportJsonChange(e.target.value)}
                placeholder='[{"key": "Creator", "value": "Usman", "category": "identity"}]'
                className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-pink-500/50"
              />
            </div>

            {/* Preview Status */}
            {importPreview && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  importPreview.valid
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                    : "bg-red-950/30 border-red-500/40 text-red-200"
                }`}
              >
                <div className="font-semibold">
                  {importPreview.valid
                    ? `✓ Valid JSON: ${importPreview.items.length} memory entries ready to import`
                    : `✗ Invalid JSON: ${importPreview.error}`}
                </div>
                {importPreview.valid && (
                  <div className="text-[11px] text-white/70 max-h-24 overflow-y-auto">
                    {importPreview.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="truncate">
                        • [{item.category}] <strong>{item.key}:</strong> {item.value}
                      </div>
                    ))}
                    {importPreview.items.length > 3 && (
                      <div className="text-white/40 italic">+ {importPreview.items.length - 3} more...</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Merge vs Replace Mode */}
            {importPreview?.valid && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-white/70">Import Strategy:</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === "merge"}
                      onChange={() => setImportMode("merge")}
                      className="accent-pink-500"
                    />
                    <span>Merge / Update</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="accent-pink-500"
                    />
                    <span>Replace All</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                  setImportJsonText("");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white/60 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!importPreview?.valid}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 disabled:opacity-40 text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                Import Facts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Key Vault Modal */}
      {showClearVaultConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#181216] border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
              <KeyRound size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-200">Clear Multi-Key Vault?</h3>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                This will remove all {registeredKeys.length} stored API keys from the secure vault on this device.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearVaultConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllKeys}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg cursor-pointer"
              >
                Clear All Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
