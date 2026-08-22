/**
 * TK333 Mobile Haptic & Tactile Feedback Engine
 * Provides native navigator.vibrate patterns with audio click fallback
 * for interactive buttons, game spins, crashouts, and wins.
 */

export type HapticType =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'win'
  | 'jackpot'
  | 'error'
  | 'warning'
  | 'tick'
  | 'impact'
  | 'cashout'
  | 'heartbeat';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  selection: 12,
  light: 16,
  medium: 32,
  heavy: 55,
  success: [25, 50, 35],
  win: [35, 45, 50, 45, 70, 50, 100],
  jackpot: [50, 40, 70, 40, 90, 50, 120, 60, 160],
  error: [45, 55, 45, 55, 45],
  warning: [35, 70, 35],
  tick: 10,
  impact: 40,
  cashout: [30, 45, 35, 45, 60],
  heartbeat: [35, 90, 35]
};

// Check localStorage for user preference
const STORAGE_KEY = 'tk333_haptics_enabled';

export const isHapticSupported = (): boolean => {
  return typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
};

export const getHapticsEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return true; // Default enabled
    return saved === 'true';
  } catch {
    return true;
  }
};

export const setHapticsEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    if (enabled) {
      // Trigger a light confirmation vibration
      triggerHaptic('success');
    }
  } catch {
    // Ignore storage issues
  }
};

// Web Audio micro-click synthesizer for supplemental tactile feel
let audioCtx: AudioContext | null = null;

const playTactileAudio = (freq = 200, duration = 0.02, gainVal = 0.04) => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Audio context may be restricted or unsupported
  }
};

/**
 * Triggers haptic vibration and tactile response
 */
export const triggerHaptic = (type: HapticType = 'selection'): boolean => {
  if (!getHapticsEnabled()) return false;

  const pattern = HAPTIC_PATTERNS[type] || 15;

  if (isHapticSupported()) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration failures
    }
  }

  // Play subtle micro-click tone based on event intensity
  switch (type) {
    case 'selection':
    case 'light':
      playTactileAudio(220, 0.015, 0.03);
      break;
    case 'medium':
      playTactileAudio(180, 0.025, 0.05);
      break;
    case 'heavy':
    case 'impact':
      playTactileAudio(140, 0.04, 0.07);
      break;
    case 'tick':
      playTactileAudio(300, 0.01, 0.02);
      break;
    default:
      break;
  }

  return true;
};

/**
 * Convenience methods for direct invocation
 */
export const haptics = {
  selection: () => triggerHaptic('selection'),
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  win: () => triggerHaptic('win'),
  jackpot: () => triggerHaptic('jackpot'),
  error: () => triggerHaptic('error'),
  warning: () => triggerHaptic('warning'),
  tick: () => triggerHaptic('tick'),
  impact: () => triggerHaptic('impact'),
  cashout: () => triggerHaptic('cashout'),
  heartbeat: () => triggerHaptic('heartbeat'),
  custom: (pattern: number | number[]) => {
    if (!getHapticsEnabled() || !isHapticSupported()) return false;
    try {
      navigator.vibrate(pattern);
      return true;
    } catch {
      return false;
    }
  },
  isSupported: isHapticSupported,
  getEnabled: getHapticsEnabled,
  setEnabled: setHapticsEnabled
};

export default haptics;
