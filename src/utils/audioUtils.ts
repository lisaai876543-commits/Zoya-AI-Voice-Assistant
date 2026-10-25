import { registerPlaybackAnalyser } from "./audioAnalyser";

let activeAudioCtx: AudioContext | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
let activePlayResolve: (() => void) | null = null;

export function stopPCM(): void {
  try {
    registerPlaybackAnalyser(null);
    if (activePlayResolve) {
      const resolve = activePlayResolve;
      activePlayResolve = null;
      resolve();
    }
    if (activeSourceNode) {
      activeSourceNode.onended = null;
      try {
        activeSourceNode.stop();
      } catch {}
      try {
        activeSourceNode.disconnect();
      } catch {}
      activeSourceNode = null;
    }
    if (activeAudioCtx) {
      activeAudioCtx.close().catch(() => {});
      activeAudioCtx = null;
    }
  } catch (e) {
    // Ignore already stopped/closed errors safely
  }
}

export async function playPCM(base64Data: string, volume: number = 1.0): Promise<void> {
  // Always stop previous audio before playing a new response so old speech never overlaps
  stopPCM();

  if (!base64Data || !base64Data.trim()) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("AudioContext not supported");
      return;
    }
    const audioCtx = new AudioContextClass({ sampleRate: 24000 });
    activeAudioCtx = audioCtx;

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = new Int16Array(bytes.buffer);
    const audioBuffer = audioCtx.createBuffer(1, buffer.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      channelData[i] = buffer[i] / 32768.0;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    activeSourceNode = source;
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.6;
    registerPlaybackAnalyser(analyser);
    
    source.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    source.start();
    
    return new Promise<void>(resolve => {
      activePlayResolve = resolve;
      source.onended = () => {
        registerPlaybackAnalyser(null);
        if (activePlayResolve === resolve) {
          activePlayResolve = null;
        }
        if (activeSourceNode === source) {
          activeSourceNode = null;
        }
        if (activeAudioCtx === audioCtx) {
          activeAudioCtx = null;
        }
        try {
          audioCtx.close().catch(() => {});
        } catch {}
        resolve();
      };
    });
  } catch (error) {
    console.error("Error playing audio:", error);
  }
}
