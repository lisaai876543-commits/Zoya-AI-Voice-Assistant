import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, Volume2, Loader2, AlertCircle, Sparkles, Zap } from "lucide-react";
import { AppState } from "../types";
import { subscribeAudioEnergy, AudioEnergyData } from "../utils/audioAnalyser";
import { getActiveTheme, subscribeThemeChange, ZoyaTheme } from "../utils/themeManager";

interface InfinityHologramProps {
  state: AppState;
  isMuted?: boolean;
}

export default function InfinityHologram({ state, isMuted = false }: InfinityHologramProps) {
  const effectiveState: AppState = isMuted && (state === "listening" || state === "processing") ? "muted" : state;

  const [theme, setTheme] = useState<ZoyaTheme>(() => getActiveTheme());
  const [audioEnergy, setAudioEnergy] = useState<AudioEnergyData>({
    outputFrequencyBins: new Uint8Array(16),
    outputAverage: 0,
    inputRms: 0,
    combinedEnergy: 0,
  });

  // Track theme changes dynamically
  useEffect(() => {
    const unsubTheme = subscribeThemeChange((newTheme) => {
      setTheme(newTheme);
    });
    return () => unsubTheme();
  }, []);

  // Track real Web Audio API frequency domain and RMS energy
  useEffect(() => {
    const unsubAudio = subscribeAudioEnergy((data) => {
      setAudioEnergy(data);
    });
    return () => unsubAudio();
  }, []);

  // Audio reactivity calculation
  const reactiveEnergy = useMemo(() => {
    if (effectiveState === "speaking") {
      return audioEnergy.outputAverage * 1.4;
    }
    if (effectiveState === "listening") {
      return audioEnergy.inputRms * 1.6;
    }
    if (effectiveState === "processing") {
      return 0.25;
    }
    return 0;
  }, [effectiveState, audioEnergy]);

  // Overall core scale mod (reacts directly to audio volume)
  const coreScale = 1 + Math.min(0.28, reactiveEnergy * 0.45);

  // Speed of gyroscopic rotation depending on state
  const rotationSpeeds = useMemo(() => {
    switch (effectiveState) {
      case "speaking":
        return { ring1: 8, ring2: 11, ring3: 14 };
      case "processing":
        return { ring1: 4, ring2: 6, ring3: 8 };
      case "listening":
        return { ring1: 14, ring2: 18, ring3: 22 };
      case "interrupted":
        return { ring1: 3, ring2: 4, ring3: 5 };
      case "muted":
        return { ring1: 30, ring2: 38, ring3: 45 };
      case "error":
        return { ring1: 25, ring2: 30, ring3: 35 };
      default: // idle / ready
        return { ring1: 22, ring2: 28, ring3: 34 };
    }
  }, [effectiveState]);

  // Status badge metadata
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
          icon: <Sparkles size={13} style={{ color: theme.primary }} />,
        };
    }
  };

  const meta = getStateMeta();

  // Distinctive stardust particle positions
  const particles = useMemo(() => [
    { x: -75, y: -45, r: 1.5, o: 0.8, d: 3 },
    { x: 80, y: -50, r: 2.0, o: 0.7, d: 4.2 },
    { x: -90, y: 35, r: 1.2, o: 0.6, d: 3.5 },
    { x: 70, y: 60, r: 1.8, o: 0.85, d: 2.8 },
    { x: -30, y: -80, r: 2.2, o: 0.9, d: 4.5 },
    { x: 45, y: -75, r: 1.4, o: 0.65, d: 3.8 },
    { x: -60, y: 80, r: 1.6, o: 0.75, d: 3.2 },
    { x: 35, y: 85, r: 2.0, o: 0.8, d: 4.0 },
    { x: 0, y: -95, r: 1.5, o: 0.9, d: 2.5 },
    { x: 0, y: 95, r: 1.5, o: 0.7, d: 3.6 },
  ], []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none pointer-events-none [perspective:1400px]">
      
      {/* 1. Deep Atmospheric Nebula Glow (Layered Multi-Stop Radial) */}
      <div
        className="absolute w-[270px] h-[270px] sm:w-[320px] sm:h-[320px] rounded-full blur-3xl pointer-events-none transition-all duration-700 ease-out"
        style={{
          background: `radial-gradient(circle, rgba(${theme.rgb.primary}, ${0.35 + reactiveEnergy * 0.25}) 0%, rgba(${theme.rgb.secondary}, 0.2) 45%, rgba(${theme.rgb.glow}, 0.08) 65%, transparent 80%)`,
          transform: `scale(${coreScale * 1.08})`,
        }}
      />

      {/* 2. Gyroscopic Orbital Space Container */}
      <div className="relative w-[270px] h-[270px] sm:w-[310px] sm:h-[310px] flex items-center justify-center [transform-style:preserve-3d]">
        
        {/* Layer 1: Outer Primary Celestial Ring with Orbital Nodes */}
        <motion.div
          animate={{ rotateZ: 360 }}
          transition={{ duration: rotationSpeeds.ring1, repeat: Infinity, ease: "linear" }}
          className="absolute w-[240px] h-[240px] sm:w-[275px] sm:h-[275px] rounded-full pointer-events-none"
          style={{
            transform: "rotateX(68deg) rotateY(18deg)",
            transformStyle: "preserve-3d",
            border: `1.5px solid rgba(${theme.rgb.primary}, 0.45)`,
            boxShadow: `0 0 20px rgba(${theme.rgb.primary}, 0.25), inset 0 0 15px rgba(${theme.rgb.glow}, 0.15)`,
          }}
        >
          {/* Glowing Orbital Bead Node 1 */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{
              backgroundColor: theme.glow,
              boxShadow: `0 0 14px ${theme.glow}, 0 0 28px ${theme.primary}`,
            }}
          />
          {/* Subtle Counter-Node */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full"
            style={{
              backgroundColor: theme.secondary,
              boxShadow: `0 0 10px ${theme.secondary}`,
            }}
          />
        </motion.div>

        {/* Layer 2: Counter-Rotating Secondary Gyro Ring */}
        <motion.div
          animate={{ rotateZ: -360 }}
          transition={{ duration: rotationSpeeds.ring2, repeat: Infinity, ease: "linear" }}
          className="absolute w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] rounded-full pointer-events-none"
          style={{
            transform: "rotateX(72deg) rotateY(-42deg)",
            transformStyle: "preserve-3d",
            border: `1.5px solid rgba(${theme.rgb.secondary}, 0.4)`,
            boxShadow: `0 0 16px rgba(${theme.rgb.secondary}, 0.25)`,
          }}
        >
          {/* Orbital Bead Node 2 */}
          <div
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: theme.primary,
              boxShadow: `0 0 12px ${theme.primary}`,
            }}
          />
        </motion.div>

        {/* Layer 3: Inclined Fast Gyro Ring with Stardust Nodes */}
        <motion.div
          animate={{ rotateZ: 360 }}
          transition={{ duration: rotationSpeeds.ring3, repeat: Infinity, ease: "linear" }}
          className="absolute w-[190px] h-[190px] sm:w-[220px] sm:h-[220px] rounded-full pointer-events-none"
          style={{
            transform: "rotateX(78deg) rotateY(85deg)",
            transformStyle: "preserve-3d",
            border: `1px dashed rgba(${theme.rgb.glow}, 0.5)`,
          }}
        >
          <div
            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{
              backgroundColor: theme.glow,
              boxShadow: `0 0 8px ${theme.glow}`,
            }}
          />
        </motion.div>

        {/* Layer 4: Fine Stardust Particle Field (matches reference image dots) */}
        {particles.map((p, idx) => (
          <motion.div
            key={idx}
            animate={{
              opacity: [p.o * 0.5, p.o, p.o * 0.5],
              scale: [0.9, 1.25, 0.9],
            }}
            transition={{
              duration: p.d,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: `${p.r * 2}px`,
              height: `${p.r * 2}px`,
              transform: `translate(${p.x}px, ${p.y}px)`,
              backgroundColor: theme.glow,
              boxShadow: `0 0 ${p.r * 5}px ${theme.primary}`,
            }}
          />
        ))}

        {/* Layer 5: Central Luminous Infinity Core (The True Figure-8 Plasma Core) */}
        <motion.div
          animate={{
            scale: coreScale,
            // Gentle organic breathing animation during idle/ready
            y: effectiveState === "speaking" ? [0, -3, 0] : [0, -2, 0],
          }}
          transition={{
            y: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 0.12, ease: "easeOut" },
          }}
          className="relative w-[170px] h-[110px] sm:w-[200px] sm:h-[130px] flex items-center justify-center z-20 pointer-events-none"
        >
          <svg
            viewBox="0 0 240 140"
            className="w-full h-full overflow-visible filter"
            style={{
              filter: `drop-shadow(0 0 25px rgba(${theme.rgb.glow}, 0.75)) drop-shadow(0 0 45px rgba(${theme.rgb.primary}, 0.5))`,
            }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Infinity Primary-to-Secondary Linear Gradient */}
              <linearGradient id="infinityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={theme.primary} />
                <stop offset="50%" stopColor={theme.glow} />
                <stop offset="100%" stopColor={theme.secondary} />
              </linearGradient>

              {/* White-Hot Intense Core Highlight */}
              <linearGradient id="infinityWhiteCore" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.7)" />
              </linearGradient>

              {/* Soft Ambient Core Filter */}
              <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="8" result="blur1" />
                <feGaussianBlur stdDeviation="4" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Infinity Path Data (Curved Lemniscate of Bernoulli) */}
            {/* 1. Deep outer luminous plasma tube */}
            <path
              d="M 120 70 C 145 35, 205 35, 205 70 C 205 105, 145 105, 120 70 C 95 35, 35 35, 35 70 C 35 105, 95 105, 120 70 Z"
              stroke={`rgba(${theme.rgb.primary}, 0.35)`}
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#softGlow)"
            />

            {/* 2. Vibrant colored energy loop */}
            <path
              d="M 120 70 C 145 35, 205 35, 205 70 C 205 105, 145 105, 120 70 C 95 35, 35 35, 35 70 C 35 105, 95 105, 120 70 Z"
              stroke="url(#infinityGrad)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />

            {/* 3. Intense white-hot inner energy conduit */}
            <path
              d="M 120 70 C 145 35, 205 35, 205 70 C 205 105, 145 105, 120 70 C 95 35, 35 35, 35 70 C 35 105, 95 105, 120 70 Z"
              stroke="url(#infinityWhiteCore)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />

            {/* 4. Audio-Reactive Lemniscate Energy Sparks at the intersection */}
            <circle
              cx="120"
              cy="70"
              r={3 + reactiveEnergy * 6}
              fill="#ffffff"
              filter="url(#softGlow)"
              style={{
                boxShadow: `0 0 15px #ffffff, 0 0 30px ${theme.glow}`,
              }}
            />
            <circle
              cx="68"
              cy="70"
              r={2 + reactiveEnergy * 3.5}
              fill={theme.glow}
            />
            <circle
              cx="172"
              cy="70"
              r={2 + reactiveEnergy * 3.5}
              fill={theme.primary}
            />
          </svg>
        </motion.div>
      </div>

      {/* 3. Persistent Visual State Indicator Pill */}
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
