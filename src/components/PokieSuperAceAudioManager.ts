/**
 * WebAudioManager handles audio playback using the Web Audio API
 * to avoid system media controls/notifications and provide better performance.
 */

export class WebAudioManager {
  private static sharedContext: AudioContext | null = null;
  private static isGlobalMuted: boolean = false;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private url: string;
  private volume: number = 0.5;

  constructor(url: string) {
    this.url = url;
  }

  static setGlobalMute(muted: boolean) {
    this.isGlobalMuted = muted;
    const context = this.getContext();
    if (muted) {
      context.suspend().catch(() => {});
    } else {
      context.resume().catch(() => {});
    }
  }

  static getContext(): AudioContext {
    if (!this.sharedContext) {
      this.sharedContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.sharedContext;
  }

  private async initContext() {
    const context = WebAudioManager.getContext();
    if (!this.gainNode) {
      this.gainNode = context.createGain();
      this.gainNode.connect(context.destination);
      this.gainNode.gain.value = this.volume;
    }
    if (!WebAudioManager.isGlobalMuted && context.state === 'suspended') {
      await context.resume();
    }
  }

  async load() {
    try {
      const context = WebAudioManager.getContext();
      if (!this.buffer) {
        const response = await fetch(this.url);
        const arrayBuffer = await response.arrayBuffer();
        this.buffer = await context.decodeAudioData(arrayBuffer);
      }
    } catch (error) {
      console.error('Failed to load BGM:', error);
    }
  }

  async play() {
    if (this.isPlaying || WebAudioManager.isGlobalMuted) return;
    
    const context = WebAudioManager.getContext();
    await this.initContext();
    if (!this.buffer) {
      await this.load();
    }

    if (this.buffer) {
      try {
        this.source = context.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.loop = true;
        this.source.connect(this.gainNode!);
        this.source.start(0);
        this.isPlaying = true;
      } catch (e) {
        console.error('BGM play failed:', e);
      }
    }
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch (e) {
        // Source might already be stopped
      }
      this.source = null;
    }
    this.isPlaying = false;
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
  }

  async resume() {
    if (WebAudioManager.isGlobalMuted) return;
    const context = WebAudioManager.getContext();
    if (context.state === 'suspended') {
      await context.resume();
    }
  }

  suspend() {
    const context = WebAudioManager.getContext();
    if (context.state === 'running') {
      context.suspend();
    }
  }

  // Static helper to stop all audio immediately on component unmount / exit
  static stopAllSounds() {
    try {
      const context = this.sharedContext;
      if (context && context.state !== 'closed') {
        context.suspend().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio stop all failed:', e);
    }
  }

  private static bufferCache: Map<string, AudioBuffer> = new Map();

  // Static helper for one-shot sound effects
  static async playSFX(url: string, volume: number = 0.5) {
    if (this.isGlobalMuted) return;
    
    try {
      const context = this.getContext();
      if (context.state === 'suspended') {
        await context.resume();
      }
      
      let buffer = this.bufferCache.get(url);
      if (!buffer) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        buffer = await context.decodeAudioData(arrayBuffer);
        this.bufferCache.set(url, buffer);
      }
      
      const source = context.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = context.createGain();
      gainNode.gain.value = volume;
      
      source.connect(gainNode);
      gainNode.connect(context.destination);
      
      source.start(0);
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
    } catch (e) {
      console.warn('SFX play failed:', e);
    }
  }
}
