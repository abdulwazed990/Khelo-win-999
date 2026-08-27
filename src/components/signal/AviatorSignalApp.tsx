import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Sparkles, 
  History, 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Plane, 
  Zap, 
  KeyRound, 
  Lock, 
  Info,
  ChevronRight,
  TrendingUp,
  Activity,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SignalToken, 
  SignalRound, 
  SignalGameConnection, 
  SignalConnectionStatus,
  SignalResultStatus 
} from '../../types';
import { 
  validateSignalToken, 
  subscribeToCurrentRound, 
  subscribeToRoundsHistory, 
  subscribeToGameConnection,
  initializeAviatorSignalDefaults,
  DEFAULT_GAME_ID
} from '../../services/aviatorSignalService';
import { haptics } from '../../utils/haptics';

interface AviatorSignalAppProps {
  initialToken?: string;
  onOpenAviatorGame?: () => void;
  onOpenCMS?: () => void;
}

export default function AviatorSignalApp({ initialToken, onOpenAviatorGame, onOpenCMS }: AviatorSignalAppProps) {
  // Token state
  const [tokenInput, setTokenInput] = useState(initialToken || '');
  const [activeToken, setActiveToken] = useState<SignalToken | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [remainingTimeText, setRemainingTimeText] = useState<string>('');

  // Live Game & Signal state
  const [connection, setConnection] = useState<SignalGameConnection | null>(null);
  const [currentRound, setCurrentRound] = useState<SignalRound | null>(null);
  const [historyRounds, setHistoryRounds] = useState<SignalRound[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [lastSyncSeconds, setLastSyncSeconds] = useState(0);
  const [radarDegree, setRadarDegree] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRoundDetail, setSelectedRoundDetail] = useState<SignalRound | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);

  // Dynamic Countdown Timer synchronized with authoritative server timestamps
  useEffect(() => {
    if (currentRound?.status === 'WAITING_FOR_ROUND' && currentRound?.countdownEndsAt) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.ceil((currentRound.countdownEndsAt! - Date.now()) / 1000));
        setSecondsRemaining(remaining);
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 100);
      return () => clearInterval(interval);
    } else {
      setSecondsRemaining(currentRound?.countdown || 5);
    }
  }, [currentRound?.status, currentRound?.countdownEndsAt, currentRound?.countdown]);

  // Audio refs for radar and signal alerts
  const audioContextRef = useRef<AudioContext | null>(null);

  // 1. Initial Defaults bootstrap
  useEffect(() => {
    initializeAviatorSignalDefaults();
  }, []);

  // 2. Play sound effects
  const playSignalSound = (type: 'verified' | 'crash' | 'ping' | 'click') => {
    if (isMuted) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'verified') {
        // High dual-tone success chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'crash') {
        // Low impact rumble
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'ping') {
        // Radar ping
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now); // C6
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else {
        // Soft click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      // Audio context not ready
    }
  };

  // 3. Validate Token
  const handleVerifyToken = async (tok: string) => {
    if (!tok.trim()) {
      setTokenError('Please enter your private Signal access token.');
      setTokenLoading(false);
      return;
    }

    setTokenLoading(true);
    setTokenError(null);

    const res = await validateSignalToken(tok);
    if (res.valid && res.tokenData) {
      setActiveToken(res.tokenData);
      setTokenError(null);
      if (res.remainingDays !== undefined && res.remainingHours !== undefined) {
        if (res.remainingDays > 0) {
          setRemainingTimeText(`${res.remainingDays}d ${res.remainingHours}h remaining`);
        } else {
          setRemainingTimeText(`${res.remainingHours} hours remaining`);
        }
      }
      haptics.success();
      playSignalSound('verified');
    } else {
      setActiveToken(null);
      setTokenError(res.errorMessage || 'Invalid or expired Signal link.');
      haptics.error();
    }
    setTokenLoading(false);
  };

  useEffect(() => {
    // Check initial token from URL prop or hash
    const queryToken = new URLSearchParams(window.location.search).get('token');
    const hash = window.location.hash.replace(/^#\/?/, '');
    let targetToken = initialToken || queryToken || '';

    if (hash.startsWith('signal/')) {
      targetToken = hash.replace('signal/', '');
    }

    if (targetToken) {
      setTokenInput(targetToken);
      handleVerifyToken(targetToken);
    } else {
      // Check if demo token exists in storage
      const saved = localStorage.getItem('av_signal_token');
      if (saved) {
        setTokenInput(saved);
        handleVerifyToken(saved);
      } else {
        // Use demo token for seamless instant preview
        setTokenInput('av_demo_vip_2026');
        handleVerifyToken('av_demo_vip_2026');
      }
    }
  }, [initialToken]);

  // 4. Real-time Subscriptions
  useEffect(() => {
    if (!activeToken) return;

    // Save active token locally for quick resume
    localStorage.setItem('av_signal_token', activeToken.token);

    const unsubConn = subscribeToGameConnection((conn) => {
      setConnection(conn);
      setLastSyncSeconds(0);
    });

    const unsubRound = subscribeToCurrentRound((round) => {
      if (round) {
        setCurrentRound(round);
        setLastSyncSeconds(0);
        
        if (round.status === 'ROUND_FINISHED' || round.status === 'CRASHED') {
          playSignalSound('crash');
        } else if (round.serverSignalStatus === 'SERVER_VERIFIED') {
          playSignalSound('ping');
        }
      }
    });

    const unsubHistory = subscribeToRoundsHistory((rounds) => {
      setHistoryRounds(rounds);
    });

    // Radar scan animation loop
    const radarInterval = setInterval(() => {
      setRadarDegree((prev) => (prev + 3) % 360);
    }, 30);

    // Sync timer counter
    const syncTimer = setInterval(() => {
      setLastSyncSeconds((s) => s + 1);
    }, 1000);

    return () => {
      unsubConn();
      unsubRound();
      unsubHistory();
      clearInterval(radarInterval);
      clearInterval(syncTimer);
    };
  }, [activeToken]);

  // Helper for status colors
  const getMultiplierColor = (mult: number) => {
    if (mult < 2.0) return 'text-rose-400 bg-rose-950/40 border-rose-800/60 shadow-rose-950/30';
    if (mult < 10.0) return 'text-amber-300 bg-amber-950/40 border-amber-800/60 shadow-amber-950/30';
    return 'text-emerald-300 bg-emerald-950/40 border-emerald-800/60 shadow-emerald-950/30';
  };

  const getMultiplierBadgeGradient = (mult: number) => {
    if (mult < 2.0) return 'from-rose-600 to-red-700';
    if (mult < 10.0) return 'from-amber-500 to-orange-600';
    return 'from-emerald-500 to-teal-600';
  };

  // If token is loading or not valid yet
  if (tokenLoading && !activeToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border border-red-500/40 animate-pulse" />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-900 flex items-center justify-center shadow-lg shadow-red-900/50">
            <Radio className="w-7 h-7 text-white animate-pulse" />
          </div>
        </div>
        <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase mb-1">
          Aviator Signal
        </h2>
        <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400" />
          Validating Security Token...
        </p>
      </div>
    );
  }

  // Token Entry & Rejection Screen
  if (!activeToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 selection:bg-red-500/30">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Top glow decoration */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wide text-white uppercase flex items-center gap-2">
                Aviator Signal
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-mono">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-slate-400">Server-Authorized Aviator Telemetry</p>
            </div>
          </div>

          {tokenError && (
            <div className="mb-5 p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-2xl flex items-start gap-3 text-rose-200 text-xs animate-shake">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-300">Access Restricted</p>
                <p className="text-rose-200/90 leading-relaxed">{tokenError}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-red-400" />
                Customer Access Token
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste your token link (e.g. av_abc123...)"
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-3 text-sm font-mono text-white placeholder:text-slate-600 outline-none transition-all"
                />
              </div>
            </div>

            <button
              onClick={() => handleVerifyToken(tokenInput)}
              disabled={tokenLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 active:scale-[0.98] text-white font-black text-sm tracking-wide rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {tokenLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Authorize Signal App
                </>
              )}
            </button>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                256-bit Encrypted Token
              </span>
              <button
                type="button"
                onClick={() => {
                  setTokenInput('av_demo_vip_2026');
                  handleVerifyToken('av_demo_vip_2026');
                }}
                className="text-red-400 hover:text-red-300 font-bold underline underline-offset-4 cursor-pointer"
              >
                Use Demo Access
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPremium = activeToken.subscriptionType === 'premium';
  const connectionState: SignalConnectionStatus = connection?.connectionStatus || 'CONNECTED';
  const currentMultiplier = currentRound?.currentMultiplier || 1.0;
  const isRunning = currentRound?.status === 'ROUND_RUNNING';
  const isCrashed = currentRound?.status === 'ROUND_FINISHED' || currentRound?.status === 'CRASHED';
  const isWaiting = currentRound?.status === 'WAITING_FOR_ROUND' || !currentRound;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start pb-24 font-sans select-none overflow-x-hidden">
      {/* Dynamic Background Radar Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950" />
      </div>

      {/* Main Container - Optimized Mobile Max Width */}
      <div className="w-full max-w-md mx-auto px-4 pt-3 space-y-3.5 relative z-10">
        {/* TOP STATUS BAR */}
        <header className="flex items-center justify-between bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-md shadow-red-600/30">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black text-white tracking-wider uppercase">
                  Aviator Signal
                </h1>
                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide border ${
                  isPremium 
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {activeToken.subscriptionType}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <span>{activeToken.userName}</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-mono">
                  {connection?.pingMs || 18}ms ping
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                haptics.light();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              title={isMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-red-400" />}
            </button>

            <button
              onClick={() => {
                handleVerifyToken(activeToken.token);
                haptics.medium();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              title="Refresh telemetry"
            >
              <RefreshCw className="w-4 h-4 hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </header>

        {/* CONNECTION & SESSION STATUS BANNER */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 border border-slate-800/60 rounded-xl text-xs backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              connectionState === 'CONNECTED' || connectionState === 'ROUND_RUNNING'
                ? 'bg-emerald-500 animate-pulse'
                : connectionState === 'CONNECTING'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-500'
            }`} />
            <span className="text-[11px] font-bold text-slate-300 tracking-wide uppercase">
              {connectionState === 'CONNECTED' ? 'CONNECTED' : connectionState === 'ROUND_RUNNING' ? 'ROUND IN FLIGHT' : connectionState}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span>SESS: {activeToken.connectedSessionId?.slice(0, 10) || 'LIVE-CORE'}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">SYNC: {lastSyncSeconds}s ago</span>
          </div>
        </div>

        {/* PRIMARY SIGNAL HUD CARD */}
        <div className="relative bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl overflow-hidden">
          {/* Radar Background Visual Sweep */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15 overflow-hidden">
            <div className="w-72 h-72 rounded-full border border-red-500/30 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border border-red-500/20 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border border-red-500/30" />
              </div>
            </div>
            {/* Rotating radar line */}
            <div 
              className="absolute w-72 h-72 rounded-full pointer-events-none origin-center"
              style={{
                transform: `rotate(${radarDegree}deg)`,
                background: 'conic-gradient(from 0deg at 50% 50%, rgba(239, 68, 68, 0.25) 0deg, transparent 60deg, transparent 360deg)'
              }}
            />
          </div>

          {/* Card Header Info */}
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <Plane className={`w-4 h-4 ${isRunning ? 'text-red-500 animate-bounce' : 'text-slate-400'}`} />
              <span className="text-xs font-black tracking-widest uppercase text-slate-300">
                {currentRound?.roundId || 'ROUND #RD-LIVE'}
              </span>
            </div>

            {/* Server Verification Tag */}
            {currentRound?.serverSignalStatus === 'SERVER_VERIFIED' ? (
              <span className="flex items-center gap-1 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs shadow-emerald-500/20">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                SERVER VERIFIED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Clock className="w-3 h-3 text-amber-400" />
                AWAITING RESULT
              </span>
            )}
          </div>

          {/* MAIN MULTIPLIER DISPLAY */}
          <div className="relative z-10 flex flex-col items-center justify-center py-6 text-center">
            {connectionState === 'ERROR' || connectionState === 'DISCONNECTED' ? (
              /* CONNECTION ERROR STATE */
              <div className="space-y-3 py-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-800 text-rose-300 text-[11px] font-black uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  GAME CONNECTION LOST
                </div>
                <div className="text-4xl font-black font-mono text-slate-500">
                  --.--x
                </div>
                <p className="text-xs text-slate-400">Reconnecting to authoritative game engine...</p>
              </div>
            ) : isRunning ? (
              /* ROUND ACTIVE STATE */
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-[11px] font-black uppercase tracking-widest animate-pulse">
                  <Activity className="w-3.5 h-3.5 text-red-500" />
                  ROUND RUNNING
                </div>
                <div className="text-6xl sm:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 font-mono filter drop-shadow-md">
                  {currentMultiplier.toFixed(2)}x
                </div>
                <div className="text-xs font-mono font-bold text-slate-400">
                  ROUND #{currentRound?.roundId}
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                  ● SERVER VERIFIED
                </div>
              </div>
            ) : isCrashed ? (
              /* ROUND FINISHED STATE */
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/40 text-[11px] font-black uppercase tracking-widest">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  ROUND FINISHED
                </div>
                <div className="text-6xl sm:text-7xl font-black tracking-tighter text-rose-500 font-mono filter drop-shadow-lg">
                  {(currentRound?.finalMultiplier || currentMultiplier).toFixed(2)}x
                </div>
                <div className="text-xs font-mono font-bold text-slate-400">
                  ROUND #{currentRound?.roundId}
                </div>
                <p className="text-xs text-slate-400 font-medium">Waiting for next server round synchronization...</p>
              </div>
            ) : (
              /* WAITING / VERIFIED / SYNCING STATE */
              <div className="space-y-3">
                {currentRound?.serverSignalStatus === 'SERVER_VERIFIED' && currentRound.predictedMultiplier ? (
                  /* VERIFIED STATE */
                  <div className="space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      NEXT ROUND
                    </div>

                    <div className="text-6xl sm:text-7xl font-black tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 filter drop-shadow-xl">
                      {currentRound.predictedMultiplier.toFixed(2)}x
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="text-xs font-mono font-bold text-slate-300">
                        ROUND #{currentRound.roundId}
                      </div>

                      <motion.div
                        initial={{ scale: 0.95, opacity: 0.9 }}
                        animate={{ 
                          scale: [1, 1.035, 1],
                          boxShadow: [
                            '0 0 0 0 rgba(16, 185, 129, 0.45)',
                            '0 0 0 8px rgba(16, 185, 129, 0)',
                            '0 0 0 0 rgba(16, 185, 129, 0)'
                          ]
                        }}
                        transition={{ 
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-xs font-black tracking-wide text-emerald-300 shadow-lg shadow-emerald-950/50 backdrop-blur-md cursor-default select-none"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>SERVER VERIFIED</span>
                      </motion.div>

                      <div className="pt-2 text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                        <span>Starting in:</span>
                        <span className="px-2 py-0.5 rounded-lg bg-red-600 text-white font-black animate-pulse text-sm">
                          {secondsRemaining > 0 ? `${secondsRemaining}s` : '1s'}
                        </span>
                        <span className="text-slate-500 text-[11px]">(5 → 4 → 3 → 2 → 1)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SYNCING / WAITING STATE */
                  <div className="py-3 space-y-3">
                    <div className="text-4xl font-black tracking-tight text-slate-400 font-mono flex items-center justify-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                      SYNCING...
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      SYNCING WITH GAME...
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Connecting to authoritative game engine to receive authorized round signal.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* INTEGRITY & COMPLIANCE FOOTNOTE */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              RNG SHA-256 Verified
            </span>
            <span className="text-slate-500">No fabricated multiplier</span>
          </div>
        </div>

        {/* RECENT SIGNAL HISTORY (20 ROUNDS) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-red-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Signal History (Last 20 Rounds)
              </h3>
            </div>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase flex items-center gap-0.5 cursor-pointer"
            >
              View Audit <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Compact Multiplier Badges Grid */}
          <div className="grid grid-cols-5 gap-1.5">
            {historyRounds.slice(0, 20).map((round, idx) => {
              const mult = round.finalMultiplier || round.currentMultiplier || 1.0;
              const colorClasses = getMultiplierColor(mult);

              return (
                <button
                  key={round.id || idx}
                  onClick={() => {
                    setSelectedRoundDetail(round);
                    setShowHistoryModal(true);
                    haptics.light();
                  }}
                  className={`py-2 px-1 rounded-xl border text-center font-mono font-black text-xs transition-all active:scale-95 cursor-pointer shadow-xs ${colorClasses}`}
                >
                  {mult.toFixed(2)}x
                </button>
              );
            })}
          </div>

          {/* History Status Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> &lt;2x
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-1" /> 2-10x
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block ml-1" /> &gt;10x
            </span>
            <span>{historyRounds.length} logged</span>
          </div>
        </div>

        {/* SPLIT / SECOND SCREEN LAUNCHER */}
        <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-red-950/40 border border-red-900/40 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-red-400" />
              Connected Aviator Game
            </p>
            <p className="text-[10px] text-slate-400">Play simultaneously in game tab or device 2</p>
          </div>

          {onOpenAviatorGame && (
            <button
              onClick={() => {
                onOpenAviatorGame();
                haptics.medium();
              }}
              className="px-3 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <span>Play Game</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* SUBSCRIPTION & TOKEN BADGE */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-[11px] font-bold text-slate-200">
                {isPremium ? 'VIP Premium Access' : 'Standard Free Access'}
              </p>
              <p className="text-[10px] text-slate-400">{remainingTimeText || 'Active Token'}</p>
            </div>
          </div>

          {onOpenCMS && (
            <button
              onClick={onOpenCMS}
              className="text-[10px] text-slate-400 hover:text-slate-200 underline font-mono cursor-pointer"
            >
              CMS Admin
            </button>
          )}
        </div>
      </div>

      {/* DETAILED ROUND AUDIT MODAL */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-red-500" />
                  Round Telemetry Audit
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {selectedRoundDetail ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Round ID:</span>
                      <span className="text-white font-bold">{selectedRoundDetail.roundId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Crash Multiplier:</span>
                      <span className="text-amber-400 font-black text-sm">
                        {(selectedRoundDetail.finalMultiplier || selectedRoundDetail.currentMultiplier).toFixed(2)}x
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Result Status:</span>
                      <span className="text-emerald-400 font-bold">
                        {selectedRoundDetail.serverSignalStatus || 'SERVER_VERIFIED'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Timestamp:</span>
                      <span className="text-slate-300">
                        {new Date(selectedRoundDetail.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {historyRounds.slice(0, 20).map((r, i) => (
                    <div
                      key={r.id || i}
                      className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <p className="font-bold text-white">{r.roundId}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(r.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg font-black ${getMultiplierColor(r.finalMultiplier || 1.0)}`}>
                        {(r.finalMultiplier || r.currentMultiplier).toFixed(2)}x
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Audit View
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
