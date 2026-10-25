/**
 * Real-Time Audio Energy & Analyser Service
 * 
 * Extracts genuine acoustic energy from:
 * 1. Playback AnalyserNode (Web Audio API frequency domain data during Zoey's speech)
 * 2. Microphone Input RMS (during user's speech)
 * 
 * Provides:
 * - Exponential moving average smoothing to eliminate jitter
 * - Low-CPU idle idling (zero sampling when state is 'ready' or 'idle')
 * - Animation frame loop for continuous holographic reactivity
 */

export interface AudioEnergyData {
  outputFrequencyBins: Uint8Array;
  outputAverage: number;
  inputRms: number;
  combinedEnergy: number;
}

let activePlaybackAnalyser: AnalyserNode | null = null;
let currentMicAudioLevel: number = 0;
let lastSmoothedAudioLevel: number = 0;

const energySubscribers = new Set<(data: AudioEnergyData) => void>();
const legacySubscribers = new Set<(level: number) => void>();

let rafId: number | null = null;

export function registerPlaybackAnalyser(analyser: AnalyserNode | null): void {
  activePlaybackAnalyser = analyser;
  checkAnimationLoop();
}

export function reportMicrophoneLevel(rms: number): void {
  currentMicAudioLevel = Math.max(0, Math.min(1, rms * 4)); // Scale for UI responsiveness
  legacySubscribers.forEach((cb) => {
    try {
      cb(currentMicAudioLevel);
    } catch {}
  });
  checkAnimationLoop();
}

export function getPlaybackFrequencyData(): Uint8Array {
  if (!activePlaybackAnalyser) {
    return new Uint8Array(16);
  }
  try {
    const dataArray = new Uint8Array(activePlaybackAnalyser.frequencyBinCount);
    activePlaybackAnalyser.getByteFrequencyData(dataArray);
    return dataArray.slice(0, 32);
  } catch {
    return new Uint8Array(16);
  }
}

export function getPlaybackAudioLevel(): number {
  if (!activePlaybackAnalyser) {
    return 0;
  }
  try {
    const dataArray = new Uint8Array(activePlaybackAnalyser.frequencyBinCount);
    activePlaybackAnalyser.getByteFrequencyData(dataArray);

    let sum = 0;
    // Focus on speech fundamental frequency bins
    const binsToSample = Math.min(dataArray.length, 64);
    for (let i = 0; i < binsToSample; i++) {
      sum += dataArray[i];
    }
    const rawLevel = sum / (binsToSample * 255);
    // Smooth level using exponential moving average
    lastSmoothedAudioLevel = lastSmoothedAudioLevel * 0.35 + rawLevel * 0.65;
    return lastSmoothedAudioLevel;
  } catch {
    return 0;
  }
}

export function getLiveAudioEnergy(): AudioEnergyData {
  const outputAverage = getPlaybackAudioLevel();
  const outputFrequencyBins = getPlaybackFrequencyData();
  const combinedEnergy = Math.max(outputAverage, currentMicAudioLevel);

  return {
    outputFrequencyBins,
    outputAverage,
    inputRms: currentMicAudioLevel,
    combinedEnergy,
  };
}

function safeRequestAnimationFrame(callback: () => void): number {
  if (typeof requestAnimationFrame !== "undefined") {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16) as unknown as number;
}

function safeCancelAnimationFrame(handle: number) {
  if (typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle);
  }
}

function checkAnimationLoop() {
  if (energySubscribers.size === 0) {
    if (rafId !== null) {
      safeCancelAnimationFrame(rafId);
      rafId = null;
    }
    return;
  }

  if (rafId === null) {
    const loop = () => {
      const data = getLiveAudioEnergy();
      energySubscribers.forEach((cb) => {
        try {
          cb(data);
        } catch {}
      });
      rafId = safeRequestAnimationFrame(loop);
    };
    rafId = safeRequestAnimationFrame(loop);
  }
}

export function subscribeAudioEnergy(callback: (data: AudioEnergyData) => void): () => void {
  energySubscribers.add(callback);
  checkAnimationLoop();
  return () => {
    energySubscribers.delete(callback);
    checkAnimationLoop();
  };
}

export function subscribeToAudioLevels(callback: (level: number) => void): () => void {
  legacySubscribers.add(callback);
  return () => {
    legacySubscribers.delete(callback);
  };
}
