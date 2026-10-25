import React, { useState, useEffect } from 'react';
import { Sparkles, ScrollText, Trash2, Lightbulb, CheckCircle2 } from 'lucide-react';
import { AppConfig } from '../types';
import { PRESETS } from './TopicScriptModal';

interface TopicsViewProps {
  config: AppConfig;
  onUpdateTopic: (topic: string) => void;
  isSessionActive: boolean;
}

export default function TopicsView({
  config,
  onUpdateTopic,
  isSessionActive,
}: TopicsViewProps) {
  const [topicText, setTopicText] = useState(config.activeTopicOrScript || "");
  const [savedBadge, setSavedBadge] = useState(false);
  const badgeTimerRef = React.useRef<any>(null);

  // Sync state if activeTopicOrScript is updated from outside (e.g. quick chips)
  useEffect(() => {
    setTopicText(config.activeTopicOrScript || "");
  }, [config.activeTopicOrScript]);

  useEffect(() => {
    return () => {
      if (badgeTimerRef.current) {
        clearTimeout(badgeTimerRef.current);
      }
    };
  }, []);

  const showSavedBadge = () => {
    setSavedBadge(true);
    if (badgeTimerRef.current) {
      clearTimeout(badgeTimerRef.current);
    }
    badgeTimerRef.current = setTimeout(() => {
      setSavedBadge(false);
    }, 2000);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateTopic(topicText.trim());
    showSavedBadge();
  };

  const handleClear = () => {
    setTopicText("");
    onUpdateTopic("");
    showSavedBadge();
  };

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    if (!preset || !preset.text) return;
    const text = preset.text.trim();
    setTopicText(text);
    onUpdateTopic(text);
    showSavedBadge();
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full overflow-hidden bg-[#0A0C10] relative">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 sm:px-6 border-b border-white/10 bg-[#141620] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ScrollText size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide">
                Topic & Roleplay Focus
              </h2>
              {config.activeTopicOrScript?.trim() && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/50">
              Guide {config.assistantName}'s conversational thoughts and roleplay intent
            </p>
          </div>
        </div>

        {savedBadge && (
          <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle2 size={13} />
            <span>Saved!</span>
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
        {/* Active Session Notice */}
        {isSessionActive && (
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-2xl p-3 text-xs text-pink-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
              <span>Voice session active: changes will immediately influence {config.assistantName}!</span>
            </div>
          </div>
        )}

        {/* Quick Suggestion Cards */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
            <Lightbulb size={14} className="text-amber-400" />
            Quick Inspiration Presets (Tap to activate)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Array.isArray(PRESETS) ? PRESETS : []).map((preset) => {
              const isActive = (config.activeTopicOrScript || "").trim() === (preset.text || "").trim();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 active:scale-[0.99] touch-manipulation pointer-events-auto select-none ${
                    isActive
                      ? "bg-amber-500/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/30"
                      : "bg-[#141620] border-white/10 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <span className="text-xl select-none shrink-0">{preset.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>{preset.title}</span>
                      {isActive && <span className="text-[10px] text-amber-300 font-normal">Active</span>}
                    </div>
                    <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2 mt-0.5">
                      {preset.text}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Input */}
        <form onSubmit={handleSave} className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-white/70">
            <label className="font-medium flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              Custom Idea / Storyline / Script
            </label>
            <span className="text-[10px] text-white/40">{topicText.length} characters</span>
          </div>

          <textarea
            value={topicText}
            onChange={(e) => setTopicText(e.target.value)}
            placeholder="Type any roleplay scenario, script notes, or discussion topic here...&#10;&#10;Example:&#10;'We are sitting on a terrace looking at stars, talking about old memories in gentle sweet Hinglish.'"
            rows={6}
            className="w-full bg-[#141620] border border-white/10 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed resize-y min-h-[140px]"
          />

          <div className="flex items-center justify-between pt-1">
            {topicText.trim() ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear Focus</span>
              </button>
            ) : (
              <span className="text-[11px] text-white/40">Free conversation active</span>
            )}

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Apply Focus</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
