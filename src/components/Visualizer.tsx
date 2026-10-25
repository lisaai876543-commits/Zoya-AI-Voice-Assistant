import InfinityHologram from "./InfinityHologram";
import ZoeyHologram from "./ZoeyHologram";
import { AppState } from "../types";

interface VisualizerProps {
  state: AppState;
  isMuted?: boolean;
}

/**
 * Visualizer Component
 * 
 * Renders the upgraded Infinity Core Hologram for Zoey AI, directly styled
 * after the reference images with gyroscopic orbital rings, luminous
 * infinity core, soft particle trails, and audio-reactive pulses.
 */
export default function Visualizer({ state, isMuted = false }: VisualizerProps) {
  return <InfinityHologram state={state} isMuted={isMuted} />;
}

export { InfinityHologram, ZoeyHologram };
