import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { taskAnimationService, TaskEnergyEvent } from '../services/taskAnimationService';
import { getActiveTheme, subscribeThemeChange, ZoyaTheme } from '../utils/themeManager';
import { Sparkles, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function TaskEnergyStreamer() {
  const [activeTask, setActiveTask] = useState<TaskEnergyEvent | null>(null);
  const [theme, setTheme] = useState<ZoyaTheme>(() => getActiveTheme());
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Subscribe to theme
  useEffect(() => {
    return subscribeThemeChange((newTheme) => setTheme(newTheme));
  }, []);

  // Update element positions
  const updateGeometry = useCallback((task: TaskEnergyEvent) => {
    // 1. Resolve source (Hologram center)
    let source: Point = { x: window.innerWidth / 2, y: window.innerHeight * 0.38 };
    const holoElem = document.getElementById('zoya-hologram-anchor') || document.getElementById('hologram-visualizer-container');
    if (holoElem) {
      const rect = holoElem.getBoundingClientRect();
      source = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    } else if (task.sourceCoords) {
      source = task.sourceCoords;
    }
    setStartPoint(source);

    // 2. Resolve target element
    let target: TargetRect | null = null;
    if (task.targetId) {
      const el = document.getElementById(task.targetId) || document.querySelector(`[data-task-target="${task.targetId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        target = {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        };
      }
    } else if (task.targetSelector) {
      const el = document.querySelector(task.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        target = {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        };
      }
    } else if (task.targetCoords) {
      target = {
        x: task.targetCoords.x,
        y: task.targetCoords.y,
        width: task.targetCoords.width || 40,
        height: task.targetCoords.height || 40,
      };
    }

    setTargetRect(target);
  }, []);

  // Subscribe to task events
  useEffect(() => {
    const unsub = taskAnimationService.subscribe((task) => {
      setActiveTask(task);
      if (task) {
        startTimeRef.current = Date.now();
        setProgress(0);
        updateGeometry(task);

        const duration = task.duration || 2600;
        const tick = () => {
          const elapsed = Date.now() - startTimeRef.current;
          const p = Math.min(1, elapsed / duration);
          setProgress(p);
          if (p < 1) {
            animFrameRef.current = requestAnimationFrame(tick);
          }
        };
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
      }
    });

    const handleResize = () => {
      const current = taskAnimationService.getCurrentTask();
      if (current) {
        updateGeometry(current);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      unsub();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [updateGeometry]);

  if (!activeTask || !startPoint || !targetRect) {
    return null;
  }

  // Calculate target center
  const targetCenter: Point = {
    x: targetRect.x + targetRect.width / 2,
    y: targetRect.y + targetRect.height / 2,
  };

  // Compute curved Bézier control point for futuristic organic arc
  const dx = targetCenter.x - startPoint.x;
  const dy = targetCenter.y - startPoint.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Curve control point with natural upward or side arc
  const curveFactor = Math.min(60, dist * 0.25);
  const midX = (startPoint.x + targetCenter.x) / 2;
  const midY = (startPoint.y + targetCenter.y) / 2;
  // Perpendicular offset
  const perpX = -dy / (dist || 1);
  const perpY = dx / (dist || 1);
  const cpX = midX + perpX * curveFactor;
  const cpY = midY + perpY * curveFactor;

  // Path data
  const pathD = `M ${startPoint.x} ${startPoint.y} Q ${cpX} ${cpY} ${targetCenter.x} ${targetCenter.y}`;

  // Travelling particle positions along quadratic bezier at various offsets
  const getBezierPoint = (t: number) => {
    const clampedT = Math.max(0, Math.min(1, t));
    const invT = 1 - clampedT;
    const x = invT * invT * startPoint.x + 2 * invT * clampedT * cpX + clampedT * clampedT * targetCenter.x;
    const y = invT * invT * startPoint.y + 2 * invT * clampedT * cpY + clampedT * clampedT * targetCenter.y;
    return { x, y };
  };

  const headT = Math.min(1, progress * 1.8);
  const headPos = getBezierPoint(headT);
  const tail1Pos = getBezierPoint(Math.max(0, headT - 0.12));
  const tail2Pos = getBezierPoint(Math.max(0, headT - 0.24));
  const tail3Pos = getBezierPoint(Math.max(0, headT - 0.36));

  const isEnergized = headT >= 0.85;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden select-none">
      <svg className="w-full h-full absolute inset-0">
        <defs>
          {/* Linear gradient along beam */}
          <linearGradient id="taskEnergyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.primary} stopOpacity="0.2" />
            <stop offset="40%" stopColor={theme.primary} stopOpacity="0.85" />
            <stop offset="85%" stopColor={theme.glow} stopOpacity="1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </linearGradient>

          {/* Radial impact halo */}
          <radialGradient id="targetImpactGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={theme.glow} stopOpacity="0.8" />
            <stop offset="50%" stopColor={theme.primary} stopOpacity="0.3" />
            <stop offset="100%" stopColor={theme.primary} stopOpacity="0" />
          </radialGradient>

          {/* Glow filter */}
          <filter id="energyGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Base luminous conduit trail */}
        <path
          d={pathD}
          fill="none"
          stroke={theme.primary}
          strokeWidth="6"
          strokeOpacity="0.25"
          filter="url(#energyGlowFilter)"
        />

        {/* 2. Core high-energy laser stream */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#taskEnergyGrad)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
          className="animate-[dash_1s_linear_infinite]"
          filter="url(#energyGlowFilter)"
        />

        {/* 3. Travelling Stardust Energy Packets */}
        {headT > 0 && (
          <>
            {/* Trail Spark 3 */}
            <circle
              cx={tail3Pos.x}
              cy={tail3Pos.y}
              r="2.5"
              fill={theme.primary}
              opacity="0.45"
            />
            {/* Trail Spark 2 */}
            <circle
              cx={tail2Pos.x}
              cy={tail2Pos.y}
              r="3.5"
              fill={theme.secondary}
              opacity="0.65"
              filter="url(#energyGlowFilter)"
            />
            {/* Trail Spark 1 */}
            <circle
              cx={tail1Pos.x}
              cy={tail1Pos.y}
              r="4.5"
              fill={theme.glow}
              opacity="0.85"
              filter="url(#energyGlowFilter)"
            />
            {/* Lead Energy Head */}
            <circle
              cx={headPos.x}
              cy={headPos.y}
              r="7"
              fill="#FFFFFF"
              filter="url(#energyGlowFilter)"
            />
            <circle
              cx={headPos.x}
              cy={headPos.y}
              r="12"
              fill="none"
              stroke={theme.glow}
              strokeWidth="2"
              opacity="0.75"
              className="animate-ping"
            />
          </>
        )}
      </svg>

      {/* Target Element Orbital Pulsing Highlight Box */}
      <div
        className="absolute transition-all duration-300 rounded-3xl"
        style={{
          left: targetRect.x - 6,
          top: targetRect.y - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          border: `2px solid ${theme.glow}`,
          boxShadow: isEnergized
            ? `0 0 35px rgba(${theme.rgb.glow}, 0.75), inset 0 0 20px rgba(${theme.rgb.primary}, 0.45)`
            : `0 0 18px rgba(${theme.rgb.glow}, 0.35)`,
          background: isEnergized ? `rgba(${theme.rgb.primary}, 0.12)` : 'transparent',
        }}
      >
        {/* Orbital Corner Reticles */}
        <span
          className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 rounded-tl-sm animate-pulse"
          style={{ borderColor: theme.glow }}
        />
        <span
          className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 rounded-tr-sm animate-pulse"
          style={{ borderColor: theme.glow }}
        />
        <span
          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 rounded-bl-sm animate-pulse"
          style={{ borderColor: theme.glow }}
        />
        <span
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 rounded-br-sm animate-pulse"
          style={{ borderColor: theme.glow }}
        />

        {/* Concentric Energy Pulse Wave */}
        <span
          className="absolute inset-0 rounded-3xl animate-ping opacity-40 pointer-events-none"
          style={{ border: `1.5px solid ${theme.primary}` }}
        />
      </div>

      {/* Floating Holographic Task HUD Badge */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute z-50 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl shadow-2xl pointer-events-none border text-xs font-semibold"
          style={{
            left: Math.max(16, Math.min(window.innerWidth - 240, targetCenter.x - 110)),
            top: targetRect.y > 90 ? targetRect.y - 38 : targetRect.y + targetRect.height + 10,
            backgroundColor: 'rgba(9, 11, 20, 0.92)',
            borderColor: theme.glow,
            boxShadow: `0 0 25px rgba(${theme.rgb.glow}, 0.45)`,
            color: '#FFFFFF',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: theme.glow }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: theme.glow }}
              />
            </span>
            <span
              className="font-bold tracking-wide text-[11px] uppercase truncate max-w-[140px]"
              style={{ color: theme.glow }}
            >
              {activeTask.title}
            </span>
          </div>

          <div
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1"
            style={{
              backgroundColor: `rgba(${theme.rgb.primary}, 0.25)`,
              color: theme.primary,
            }}
          >
            {isEnergized ? (
              <>
                <CheckCircle2 size={10} className="shrink-0" />
                <span>Active</span>
              </>
            ) : (
              <>
                <Zap size={10} className="shrink-0 animate-pulse" />
                <span>Working...</span>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
