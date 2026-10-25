import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Volume2, X, Check, Heart, CheckCircle2, Play, Square, Loader2, Sparkles } from 'lucide-react';
import { AppConfig } from '../types';
import { getZoyaAudio } from '../services/geminiService';
import { playPCM, stopPCM } from '../utils/audioUtils';

interface VoiceSelectorModalProps {
  assistantName?: string;
  currentVoice?: string;
  config?: AppConfig | null;
  onSelectVoice: (voiceName: string) => void;
  onClose: () => void;
}

export const FEMALE_VOICES = [
  {
    id: "Kore",
    name: "Kore",
    hindiName: "कोरे (Mohini)",
    badge: "Sabse Meethi 💖",
    tagline: "Most Sweet & Heart-Touching",
    desc: "Bahut hi meethi, komal aur dil ko chhoo lene wali aawaaz. Caring Indian ladki ka apnapan aur atoot garmahat.",
    recommended: true,
    isDefault: true,
    languages: "Hindi • Hinglish • English (India)",
    vibe: "Warm, Sweet & Emotional",
    icon: "🌸",
    previewText: "Assalam-o-Alaikum! Main Kore hoon, aapki sweet aur mohini aawaaz."
  },
  {
    id: "Aoede",
    name: "Aoede",
    hindiName: "आयडे (Surili)",
    badge: "Madhur 🎶",
    tagline: "Melodic & Expressive",
    desc: "Khuli, surili aur expressive aawaaz. Natural human flow aur bina ruke fluent pyara andaaz.",
    recommended: false,
    isDefault: false,
    languages: "Hindi • Hinglish • English",
    vibe: "Clear, Melodic & Bright",
    icon: "✨",
    previewText: "Assalam-o-Alaikum! Main Aoede hoon, ek surili aur melodic aawaaz."
  },
  {
    id: "Leda",
    name: "Leda",
    hindiName: "लीडा (Komal)",
    badge: "Masoom 🌷",
    tagline: "Youthful & Innocent",
    desc: "Ek pyari, masoom aur halki meethi aawaaz. Bilkul ek sweet, soft-spoken real girl jaisi baat-cheet.",
    recommended: false,
    isDefault: false,
    languages: "Hindi • Hinglish • English",
    vibe: "Gentle, Soft & Innocent",
    icon: "🕊️",
    previewText: "Assalam-o-Alaikum! Main Leda hoon, masoom aur komal baat-cheet ke liye."
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    hindiName: "ज़ेफिर (Sukoon)",
    badge: "Whisper-Soft 🌙",
    tagline: "Calm & Intimate",
    desc: "Dheemi, shaant aur sukoon dene wali aawaaz. Raat ki baaton aur dil ke raaz share karne ke liye shandar.",
    recommended: false,
    isDefault: false,
    languages: "Hindi • Hinglish • English",
    vibe: "Intimate, Whisper & Peaceful",
    icon: "🌌",
    previewText: "Assalam-o-Alaikum! Main Zephyr hoon, dheemi aur sukoon bhari aawaaz."
  },
  {
    id: "Callirrhoe",
    name: "Callirrhoe",
    hindiName: "कैलीरो (Pyari)",
    badge: "Affectionate ☀️",
    tagline: "Warm & Friendly",
    desc: "Garmahat bhari, cheerful aur supportive aawaaz. Ek caring best-friend ladki jo har baat samjhe.",
    recommended: false,
    isDefault: false,
    languages: "Hindi • Hinglish • English",
    vibe: "Friendly, Caring & Cheerful",
    icon: "💫",
    previewText: "Assalam-o-Alaikum! Main Callirrhoe hoon, cheerful aur caring aawaaz."
  },
  {
    id: "Despina",
    name: "Despina",
    hindiName: "डेसपिना (Nazakat)",
    badge: "Graceful 🥀",
    tagline: "Elegant & Poetic",
    desc: "Tehzeeb aur adab se bhari graceful aawaaz. Poetry, shayari aur gehri baaton ke liye behad dilkash.",
    recommended: false,
    isDefault: false,
    languages: "Hindi • Hinglish • English",
    vibe: "Graceful, Elegant & Gentle",
    icon: "🪷",
    previewText: "Assalam-o-Alaikum! Main Despina hoon, tehzeeb aur adab se bhari aawaaz."
  },
];

export default function VoiceSelectorModal({
  assistantName,
  currentVoice = "Kore",
  config,
  onSelectVoice,
  onClose,
}: VoiceSelectorModalProps) {
  const [selectedVoice, setSelectedVoice] = useState(currentVoice || "Kore");
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      stopPCM();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const safeVoices = Array.isArray(FEMALE_VOICES) ? FEMALE_VOICES : [];
  const activeVoiceObj = safeVoices.find(v => v?.id === selectedVoice) || safeVoices[0] || { id: "Kore", name: "Kore" };

  const handleApplyVoice = (voiceId: string) => {
    stopPCM();
    setPreviewVoiceId(null);
    setSelectedVoice(voiceId);
    onSelectVoice(voiceId);
    setIsSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onClose();
    }, 350);
  };

  const handleConfirm = () => {
    stopPCM();
    setPreviewVoiceId(null);
    onSelectVoice(selectedVoice);
    setIsSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onClose();
    }, 350);
  };

  const handlePlayPreview = async (voice: typeof FEMALE_VOICES[0], e: React.MouseEvent) => {
    e.stopPropagation();

    if (previewVoiceId === voice.id) {
      stopPCM();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPreviewVoiceId(null);
      setIsLoadingPreview(false);
      return;
    }

    stopPCM();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setPreviewVoiceId(voice.id);
    setIsLoadingPreview(true);

    try {
      const activeCfg: AppConfig = config || {
        apiKey: "",
        userName: "Usman",
        assistantName: assistantName || "Zoya",
        systemPrompt: "",
        voiceName: voice.id,
      };

      const audioBase64 = await getZoyaAudio(voice.previewText, {
        ...activeCfg,
        voiceName: voice.id,
      });

      if (audioBase64) {
        setIsLoadingPreview(false);
        await playPCM(audioBase64, 1.0);
        setPreviewVoiceId(null);
      } else {
        // Fallback to Web Speech API so preview always delivers audible confirmation
        if (typeof window !== "undefined" && window.speechSynthesis) {
          setIsLoadingPreview(false);
          const utter = new SpeechSynthesisUtterance(voice.previewText);
          utter.lang = "hi-IN";
          utter.onend = () => setPreviewVoiceId(null);
          utter.onerror = () => setPreviewVoiceId(null);
          window.speechSynthesis.speak(utter);
        } else {
          setIsLoadingPreview(false);
          setPreviewVoiceId(null);
        }
      }
    } catch (err) {
      console.warn("Preview audio error:", err);
      setIsLoadingPreview(false);
      setPreviewVoiceId(null);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#141620] border border-white/15 rounded-t-[28px] sm:rounded-3xl shadow-2xl shadow-black/95 flex flex-col max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden relative"
      >
        {/* Mobile drag bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 blur-[100px] pointer-events-none rounded-full" />

        {/* 1. FIXED TOP HEADER */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-3.5 border-b border-white/10 bg-[#161824] flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
              <Volume2 className="text-white" size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate">
                  Sweet Female Voices (भारतीय आवाज़ें)
                </h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 shrink-0">
                  Only Female
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                Hindi, Hinglish & English me real Indian girl jaisi sweet aawaaz
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            title="Close"
            aria-label="Close"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* 2. SCROLLABLE MIDDLE BODY */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3 relative z-10">
          {/* Recommendation Banner */}
          <div className="bg-gradient-to-r from-pink-500/15 to-violet-500/10 border border-pink-500/30 rounded-xl sm:rounded-2xl p-3 space-y-1 text-xs text-white/85">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-pink-300 font-medium">
                <Heart size={14} className="text-pink-400 fill-pink-400 shrink-0" />
                <span>Usman Ji's Choice: Default Voice</span>
              </div>
              <span className="text-[10px] font-semibold bg-pink-500/30 text-pink-200 border border-pink-400/40 px-2 py-0.5 rounded-full shrink-0">
                Default: Kore (कोरे)
              </span>
            </div>
            <p className="text-white/70 leading-relaxed text-[11px] sm:text-xs pl-5">
              <strong>Kore (कोरे)</strong> is the default recommended companion voice: warm, gentle, affectionate, and deeply emotional.
            </p>
          </div>

          {/* Voices Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {FEMALE_VOICES.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              const isDefaultVoice = voice.id === "Kore";
              const isThisPreviewPlaying = previewVoiceId === voice.id && !isLoadingPreview;
              const isThisPreviewLoading = previewVoiceId === voice.id && isLoadingPreview;

              return (
                <div
                  key={voice.id}
                  onClick={() => handleApplyVoice(voice.id)}
                  className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2.5 active:scale-[0.99] ${
                    isSelected
                      ? "bg-pink-500/20 border-pink-500/70 shadow-lg shadow-pink-500/15 ring-1 ring-pink-500/40"
                      : "bg-black/40 border-white/10 hover:border-white/25 hover:bg-white/5"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            {voice.name}
                          </span>
                          <span className="text-xs text-pink-300 font-medium">
                            • {voice.hindiName}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/50 block">
                          {voice.tagline}
                        </span>
                      </div>

                      {/* Status Badges: Default vs Selected */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isDefaultVoice && (
                          <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles size={10} className="text-amber-400" />
                            <span>Default</span>
                          </span>
                        )}
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-[11px] text-pink-200 font-medium bg-pink-500/30 px-2 py-0.5 rounded-full border border-pink-500/40 shrink-0">
                            <Check size={12} className="stroke-[3]" />
                            <span>Selected</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/40 hover:text-white/80 transition-colors">
                            Select
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2">
                      {voice.desc}
                    </p>
                  </div>

                  {/* Card Bottom: Metadata + Audio Preview Button */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[10px] text-white/40 truncate">
                      <span className="text-emerald-300/80 font-medium truncate">
                        {voice.languages}
                      </span>
                    </div>

                    {/* Real Audio Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => handlePlayPreview(voice, e)}
                      title={isThisPreviewPlaying ? "Stop audio preview" : "Listen to voice preview"}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 ${
                        isThisPreviewPlaying
                          ? "bg-rose-500 text-white shadow-rose-500/30"
                          : isThisPreviewLoading
                          ? "bg-pink-500/30 text-pink-200 border border-pink-500/40"
                          : "bg-white/10 hover:bg-white/20 text-white/90 border border-white/15"
                      }`}
                    >
                      {isThisPreviewLoading ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-pink-300" />
                          <span>Loading...</span>
                        </>
                      ) : isThisPreviewPlaying ? (
                        <>
                          <Square size={11} className="fill-white" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play size={11} className="fill-white" />
                          <span>Preview</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. ALWAYS VISIBLE STICKY FOOTER */}
        <div className="shrink-0 bg-[#161824] border-t border-white/10 px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-3 safe-bottom z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-white/50 hidden xs:inline">Selected:</span>
            <span className="text-xs sm:text-sm font-semibold text-pink-300 truncate">
              {activeVoiceObj.name} ({activeVoiceObj.hindiName})
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white text-xs sm:text-sm font-medium border border-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-pink-500/25 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 size={16} className="text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Check size={15} className="stroke-[3]" />
                  <span>Save Voice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
