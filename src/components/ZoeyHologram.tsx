import React, { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, Volume2, Loader2, AlertCircle, Sparkles, Zap } from "lucide-react";
import { AppState } from "../types";
import { subscribeAudioEnergy, AudioEnergyData } from "../utils/audioAnalyser";

interface ZoeyHologramProps {
  state: AppState;
  isMuted?: boolean;
}

export default function ZoeyHologram({ state, isMuted = false }: ZoeyHologramProps) {
  const effectiveState: AppState = isMuted && (state === "listening" || state === "processing") ? "muted" : state;

  const [audioEnergy, setAudioEnergy] = useState<AudioEnergyData>({
    outputFrequencyBins: new Uint8Array(16),
    outputAverage: 0,
    inputRms: 0,
    combinedEnergy: 0,
  });

  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<any>(null);

  // Subscribe to real-time Web Audio API energy measurements
  useEffect(() => {
    const unsubscribe = subscribeAudioEnergy((data) => {
      setAudioEnergy(data);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Natural spontaneous eye blink cycle
  useEffect(() => {
    let mounted = true;
    const scheduleNextBlink = () => {
      const delay = Math.random() * 3200 + 2800; // Blink every 2.8 - 6.0 seconds
      blinkTimeoutRef.current = setTimeout(() => {
        if (!mounted) return;
        setIsBlinking(true);
        setTimeout(() => {
          if (!mounted) return;
          setIsBlinking(false);
          scheduleNextBlink();
        }, 160);
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      mounted = false;
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, []);

  // Dynamic reactive scale calculation
  const reactiveEnergy = effectiveState === "speaking" 
    ? audioEnergy.outputAverage 
    : (effectiveState === "listening" ? audioEnergy.inputRms * 1.5 : 0);

  const baseScale = 1 + Math.min(0.22, reactiveEnergy * 0.35);

  // Orbit rotation speeds based on state
  const getOrbitSpeed = () => {
    switch (effectiveState) {
      case "speaking": return 4;
      case "processing": return 2.2;
      case "listening": return 7;
      case "reconnecting": return 3;
      case "interrupted": return 1.5;
      case "muted": return 16;
      case "error": return 14;
      default: return 12; // idle / ready
    }
  };

  // State metadata for the status pill
  const getStateMeta = () => {
    switch (effectiveState) {
      case "listening":
        return {
          label: "Listening to you...",
          badgeColor: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
          dotColor: "bg-emerald-400 animate-ping",
          icon: <Mic size={13} className="text-emerald-400" />,
        };
      case "processing":
        return {
          label: "Thinking...",
          badgeColor: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]",
          dotColor: "bg-cyan-400 animate-pulse",
          icon: <Loader2 size={13} className="animate-spin text-cyan-400" />,
        };
      case "speaking":
        return {
          label: "Zoya Speaking...",
          badgeColor: "bg-pink-500/25 border-pink-500/50 text-pink-200 shadow-[0_0_15px_rgba(236,72,153,0.35)]",
          dotColor: "bg-pink-400 animate-ping",
          icon: <Volume2 size={13} className="text-pink-400 animate-pulse" />,
        };
      case "interrupted":
        return {
          label: "Interrupted",
          badgeColor: "bg-violet-500/25 border-violet-500/50 text-violet-200 shadow-[0_0_15px_rgba(139,92,246,0.35)]",
          dotColor: "bg-violet-400",
          icon: <Zap size={13} className="text-violet-400" />,
        };
      case "muted":
        return {
          label: "Microphone Muted",
          badgeColor: "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
          dotColor: "bg-amber-400",
          icon: <MicOff size={13} className="text-amber-400" />,
        };
      case "reconnecting":
        return {
          label: "Reconnecting Voice...",
          badgeColor: "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
          dotColor: "bg-amber-400 animate-spin",
          icon: <Loader2 size={13} className="animate-spin text-amber-400" />,
        };
      case "error":
        return {
          label: "Connection Alert",
          badgeColor: "bg-red-500/20 border-red-500/40 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
          dotColor: "bg-red-400",
          icon: <AlertCircle size={13} className="text-red-400" />,
        };
      default:
        return {
          label: "Ready • Tap to Talk",
          badgeColor: "bg-white/10 border-white/15 text-white/80 shadow-[0_0_15px_rgba(255,255,255,0.1)]",
          dotColor: "bg-cyan-400/80",
          icon: <Sparkles size={13} className="text-cyan-400" />,
        };
    }
  };

  const meta = getStateMeta();
  const orbitDuration = getOrbitSpeed();

  // Waveform heights for the audio mouth aperture
  const bins = audioEnergy.outputFrequencyBins;
  const mouthWavePoints = Array.from({ length: 9 }).map((_, i) => {
    if (effectiveState === "speaking") {
      const binVal = bins[i * 2] || 0;
      return Math.max(3, (binVal / 255) * 26);
    }
    if (effectiveState === "listening") {
      const rmsMod = audioEnergy.inputRms * 22;
      return Math.max(3, 4 + Math.sin(i * 0.8) * rmsMod);
    }
    return 3;
  });

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none pointer-events-none [perspective:1200px]">
      {/* Background Volumetric Glow */}
      <div 
        className="absolute w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] rounded-full blur-3xl pointer-events-none transition-all duration-700"
        style={{
          background: effectiveState === "speaking"
            ? "radial-gradient(circle, rgba(236,72,153,0.35) 0%, rgba(139,92,246,0.2) 50%, transparent 75%)"
            : effectiveState === "processing"
            ? "radial-gradient(circle, rgba(6,182,212,0.4) 0%, rgba(139,92,246,0.25) 50%, transparent 75%)"
            : effectiveState === "listening"
            ? "radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(6,182,212,0.2) 50%, transparent 75%)"
            : effectiveState === "interrupted"
            ? "radial-gradient(circle, rgba(168,85,247,0.45) 0%, rgba(236,72,153,0.25) 50%, transparent 75%)"
            : effectiveState === "muted"
            ? "radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(180,83,9,0.15) 50%, transparent 75%)"
            : effectiveState === "error"
            ? "radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 75%)"
            : "radial-gradient(circle, rgba(34,211,238,0.22) 0%, rgba(99,102,241,0.15) 50%, transparent 75%)",
          transform: `scale(${baseScale})`,
        }}
      />

      {/* Outer Hologram Container with 3D Preservation */}
      <div className="relative w-[260px] h-[260px] sm:w-[290px] sm:h-[290px] flex items-center justify-center [transform-style:preserve-3d]">
        
        {/* Layer 1: Outer Celestial Orbital Ring (Cyan / Neon) */}
        <motion.div
          animate={{ rotateZ: 360, rotateX: 68 }}
          transition={{ duration: orbitDuration * 2.2, repeat: Infinity, ease: "linear" }}
          className="absolute w-[240px] h-[240px] sm:w-[270px] sm:h-[270px] rounded-full border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)] pointer-events-none"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#22d3ee]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
        </motion.div>

        {/* Layer 2: Counter-Rotating Orbital Ring (Violet / Magenta) */}
        <motion.div
          animate={{ rotateZ: -360, rotateY: 55, rotateX: -60 }}
          transition={{ duration: orbitDuration * 2.8, repeat: Infinity, ease: "linear" }}
          className="absolute w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] rounded-full border border-pink-500/35 shadow-[0_0_15px_rgba(236,72,153,0.25)] pointer-events-none"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_10px_#ec4899]" />
        </motion.div>

        {/* Layer 3: Inclined Gyroscopic Orbital Ring (Ice-Blue / Lavender) */}
        <motion.div
          animate={{ rotateZ: 360, rotateX: 75, rotateY: 25 }}
          transition={{ duration: orbitDuration * 3.5, repeat: Infinity, ease: "linear" }}
          className="absolute w-[190px] h-[190px] sm:w-[215px] sm:h-[215px] rounded-full border border-indigo-400/30 pointer-events-none"
          style={{ transformStyle: "preserve-3d" }}
        />

        {/* Central Holographic Face Silhouette & Digital Features */}
        <motion.div
          animate={{
            scale: baseScale,
            y: effectiveState === "speaking" ? [0, -3, 0] : [0, -2, 0],
          }}
          transition={{
            y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 0.15 },
          }}
          className="relative w-[150px] h-[175px] sm:w-[165px] sm:h-[195px] flex flex-col items-center justify-center z-10"
        >
          {/* Hologram Vector Graphic */}
          <svg
            viewBox="0 0 160 190"
            className="w-full h-full filter drop-shadow-[0_0_12px_rgba(34,211,238,0.5)] overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Holographic Cyan-Ice Gradient */}
              <linearGradient id="holoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.85" />
              </linearGradient>

              {/* Face Silhouette Gradient */}
              <linearGradient id="faceShade" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
                <stop offset="60%" stopColor="#818cf8" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.02" />
              </linearGradient>

              {/* Eye Energy Gradient */}
              <radialGradient id="eyeEnergy" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>

              {/* Neural Node Glow */}
              <radialGradient id="neuralNodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="50%" stopColor="#ec4899" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Futuristic Head Halo / Tiara Line */}
            <path
              d="M 38 46 Q 80 18 122 46"
              stroke="url(#holoGlow)"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              opacity="0.7"
            />

            {/* Stylized Female Face Contour (Cheekbones, Chin, Jawline) */}
            <path
              d="M 44 65 C 40 85 43 118 64 142 C 72 152 80 156 80 156 C 80 156 88 152 96 142 C 117 118 120 85 116 65 C 113 46 98 32 80 32 C 62 32 47 46 44 65 Z"
              fill="url(#faceShade)"
              stroke="url(#holoGlow)"
              strokeWidth="1.5"
              className="transition-all duration-300"
            />

            {/* Subtle Cheek & Temple Light Filaments */}
            <path d="M 49 82 Q 58 108 72 128" stroke="#38bdf8" strokeWidth="0.8" opacity="0.45" />
            <path d="M 111 82 Q 102 108 88 128" stroke="#38bdf8" strokeWidth="0.8" opacity="0.45" />

            {/* Brow Line Structure */}
            <path d="M 52 74 Q 63 68 73 72" stroke="#67e8f9" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
            <path d="M 87 72 Q 97 68 108 74" stroke="#67e8f9" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />

            {/* Forehead Neural Crystal Node (Third Eye / AI Core Processor) */}
            <g transform="translate(80, 52)">
              <polygon
                points="0,-7 5,0 0,7 -5,0"
                fill="url(#neuralNodeGlow)"
                className={`transition-all duration-300 ${
                  effectiveState === "processing" ? "animate-pulse scale-125" : ""
                }`}
              />
              <circle cx="0" cy="0" r="2" fill="#ffffff" />
            </g>

            {/* Digital Holographic Eyes (With Natural Spontaneous Blinking) */}
            <g className={`transition-transform duration-100 ${isBlinking ? "scale-y-[0.08]" : "scale-y-100"}`} style={{ transformOrigin: "80px 86px" }}>
              {/* Left Eye */}
              <ellipse cx="62" cy="85" rx="7.5" ry="4.5" fill="none" stroke="#22d3ee" strokeWidth="1.2" />
              <ellipse cx="62" cy="85" rx="3.5" ry="3.5" fill="url(#eyeEnergy)" />
              <circle cx="63" cy="84" r="1.2" fill="#ffffff" />

              {/* Right Eye */}
              <ellipse cx="98" cy="85" rx="7.5" ry="4.5" fill="none" stroke="#22d3ee" strokeWidth="1.2" />
              <ellipse cx="98" cy="85" rx="3.5" ry="3.5" fill="url(#eyeEnergy)" />
              <circle cx="99" cy="84" r="1.2" fill="#ffffff" />
            </g>

            {/* Nose Bridge Suggestion */}
            <path d="M 80 84 L 80 102 L 77 105" stroke="#38bdf8" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />

            {/* Dynamic Audio-Reactive Mouth Aperture Wave */}
            <g transform="translate(80, 124)">
              {/* Horizontal Rest Lip Line */}
              <line x1="-16" y1="0" x2="16" y2="0" stroke="#38bdf8" strokeWidth="0.75" opacity="0.4" />
              
              {/* Audio Frequency Bars / Reactive Wave */}
              {mouthWavePoints.map((h, i) => {
                const xOffset = (i - 4) * 3.4;
                const strokeColor = effectiveState === "speaking" 
                  ? (i % 2 === 0 ? "#ec4899" : "#38bdf8")
                  : (effectiveState === "listening" ? "#34d399" : "#67e8f9");
                return (
                  <line
                    key={i}
                    x1={xOffset}
                    y1={-h / 2}
                    x2={xOffset}
                    y2={h / 2}
                    stroke={strokeColor}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    className="transition-all duration-75"
                  />
                );
              })}
            </g>
          </svg>
        </motion.div>

        {/* Ambient Orbit Particle Sparks */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[140px] h-[140px] rounded-full border border-white/5 animate-pulse" />
        </div>
      </div>

      {/* Persistent Visual State Indicator Pill */}
      <div className="absolute bottom-3 sm:bottom-4 z-30 pointer-events-auto">
        <motion.div
          key={effectiveState}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`px-3.5 py-1.5 rounded-full border backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-medium tracking-wide ${meta.badgeColor}`}
        >
          <span className="shrink-0 flex items-center">{meta.icon}</span>
          <span className="select-none">{meta.label}</span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dotColor}`} />
        </motion.div>
      </div>
    </div>
  );
}
