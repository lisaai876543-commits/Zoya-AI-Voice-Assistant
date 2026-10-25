import React from "react";
import { Check, ShieldCheck, Smartphone, Globe, Lock, AlertTriangle } from "lucide-react";

export interface SettingToggleCardProps {
  label: string;
  description: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  icon?: React.ReactNode;
  permissionNeeded?: string;
  onOffDifference?: {
    on: string;
    off: string;
  };
  environment: "web" | "native-only" | "permission-required";
  disabled?: boolean;
  nativeNote?: string;
}

export default function SettingToggleCard({
  label,
  description,
  checked,
  onChange,
  icon,
  permissionNeeded,
  onOffDifference,
  environment,
  disabled = false,
  nativeNote,
}: SettingToggleCardProps) {
  const isNative = environment === "native-only";

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isNative
          ? "bg-[#14121A]/80 border-amber-500/20 opacity-85"
          : checked
          ? "bg-[#181A26]/90 border-pink-500/30 shadow-lg shadow-pink-500/5"
          : "bg-[#141622]/70 border-white/10 hover:border-white/20"
      }`}
    >
      {/* Top Header: Icon, Label, Environment Badge & Toggle Switch */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isNative
                  ? "bg-amber-500/15 text-amber-300"
                  : checked
                  ? "bg-pink-500/20 text-pink-300"
                  : "bg-white/5 text-white/60"
              }`}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-white truncate">{label}</h4>
              {isNative ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                  <Smartphone size={10} />
                  <span>Android Native Only</span>
                </span>
              ) : environment === "permission-required" ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shrink-0">
                  <Lock size={10} />
                  <span>Permission Required</span>
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <Globe size={10} />
                  <span>Web Ready</span>
                </span>
              )}
            </div>
            <p className="text-xs text-white/65 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="shrink-0 pt-0.5">
          {isNative ? (
            <div
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] font-medium text-amber-300 flex items-center gap-1 cursor-not-allowed select-none"
              title="Requires Native Android Companion App with Accessibility Service"
            >
              <Lock size={11} />
              <span>Native Only</span>
            </div>
          ) : (
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange?.(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-rose-500"></div>
            </label>
          )}
        </div>
      </div>

      {/* Middle: Permission / Provider Needed */}
      {permissionNeeded && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-[11px] text-white/50">
          <ShieldCheck size={13} className="text-cyan-400 shrink-0" />
          <span>
            <strong className="text-white/70">Permission / Provider Needed:</strong> {permissionNeeded}
          </span>
        </div>
      )}

      {/* Bottom: Real ON/OFF Difference */}
      {onOffDifference && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
          <div
            className={`p-2 rounded-xl border flex items-start gap-1.5 ${
              checked && !isNative
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                : "bg-white/5 border-white/5 text-white/50"
            }`}
          >
            <span className="font-bold text-emerald-400 shrink-0">ON:</span>
            <span className="leading-snug">{onOffDifference.on}</span>
          </div>
          <div
            className={`p-2 rounded-xl border flex items-start gap-1.5 ${
              !checked || isNative
                ? "bg-white/5 border-white/10 text-white/70"
                : "bg-white/5 border-white/5 text-white/40"
            }`}
          >
            <span className="font-bold text-white/50 shrink-0">OFF:</span>
            <span className="leading-snug">{onOffDifference.off}</span>
          </div>
        </div>
      )}

      {/* Native Note if applicable */}
      {isNative && nativeNote && (
        <div className="mt-2.5 p-2 rounded-xl bg-amber-950/40 border border-amber-500/20 text-[11px] text-amber-200/90 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <span>{nativeNote}</span>
        </div>
      )}
    </div>
  );
}
