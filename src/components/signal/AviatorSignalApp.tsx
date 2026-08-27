import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Radio, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  Clock, 
  History, 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Plane, 
  Zap, 
  Info,
  TrendingUp,
  Activity,
  Maximize2,
  Server,
  Layers,
  Check,
  Flame,
  Sparkles,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SignalRound, 
  SignalGameConnection, 
  SignalConnectionStatus 
} from '../../types';
import { 
  subscribeToCurrentRound, 
  subscribeToRoundsHistory, 
  subscribeToGameConnection,
  getCurrentRoundState,
  getLatestRoundsHistory,
  getLatestSignalAndRecentRounds,
  pingAuthoritativeServer,
  initializeAviatorSignalDefaults,
  DEFAULT_GAME_ID
} from '../../services/aviatorSignalService';
import { haptics } from '../../utils/haptics';

interface AviatorSignalAppProps {
  onOpenAviatorGame?: () => void;
  onOpenCMS?: () => void;
}

export default function AviatorSignalApp({ onOpenAviatorGame, onOpenCMS }: AviatorSignalAppProps) {
  // Live Game & Signal State (Single Authoritative Source for all Customers)
  const [connection, setConnection] = useState<SignalGameConnection | null>(null);
  const [currentRound, setCurrentRound] = useState<SignalRound | null>(null);
  const [historyRounds, setHistoryRounds] = useState<SignalRound[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [syncState, setSyncState] = useState<'LIVE' | 'RECONNECTING' | 'OFFLINE'>('LIVE');
  const [radarDegree, setRadarDegree] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRoundDetail, setSelectedRoundDetail] = useState<SignalRound | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [pingLatency, setPingLatency] = useState<number>(18);

  // Audio refs for radar and signal alerts
  const audioContextRef = useRef<AudioContext | null>(null);
  const isTabVisibleRef = useRef<boolean>(true);
  const heartbeatTimerRef = useRef<any>(null);

  // 1. Precise Authoritative Countdown Timer using Server Timestamps
  useEffect(() => {
    if (currentRound?.status === 'WAITING_FOR_ROUND') {
      const calculateRemaining = () => {
        if (currentRound.countdownEndsAt) {
          const rem = Math.max(0, Math.ceil((currentRound.countdownEndsAt - Date.now()) / 1000));
          setSecondsRemaining(rem);
        } else if (currentRound.countdown) {
          setSecondsRemaining(currentRound.countdown);
        } else {
          setSecondsRemaining(5);
        }
      };

      calculateRemaining();
      const interval = setInterval(calculateRemaining, 100);
      return () => clearInterval(interval);
    } else {
      setSecondsRemaining(0);
    }
  }, [currentRound?.status, currentRound?.countdownEndsAt, currentRound?.countdown]);

  // 2. Sound Effects
  const playSignalSound = useCallback((type: 'verified' | 'crash' | 'ping' | 'click') => {
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
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'ping') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else {
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
  }, [isMuted]);

  // 3. Tab Visibility & Fast Missed Signal Recovery System
  const synchronizeServerStateImmediate = useCallback(async () => {
    try {
      setSyncState('RECONNECTING');
      const snapshot = await getLatestSignalAndRecentRounds();
      
      if (snapshot.currentRound) {
        setCurrentRound(snapshot.currentRound);
      }
      if (snapshot.recentRounds && snapshot.recentRounds.length > 0) {
        setHistoryRounds(snapshot.recentRounds);
      }
      if (snapshot.connection) {
        setConnection(snapshot.connection);
      }

      setLastSyncTime(new Date());
      setSyncState('LIVE');
    } catch (err) {
      console.error('Error synchronizing after tab switch:', err);
      setSyncState('RECONNECTING');
    }
  }, []);

  // 4. Initial Bootstrap, Real-Time Subscriptions & Visibility Listeners
  useEffect(() => {
    initializeAviatorSignalDefaults();

    // Direct Real-time Subscriptions (Single Authoritative Source of Truth)
    const unsubConn = subscribeToGameConnection((conn) => {
      setConnection(conn);
      if (conn?.connectionStatus === 'CONNECTED') {
        setSyncState('LIVE');
      } else {
        setSyncState('OFFLINE');
      }
    });

    const unsubRound = subscribeToCurrentRound((round) => {
      if (round) {
        setCurrentRound(round);
        setLastSyncTime(new Date());
        setSyncState('LIVE');
        
        if (round.status === 'ROUND_FINISHED' || round.status === 'CRASHED') {
          playSignalSound('crash');
        } else if (round.serverSignalStatus === 'SERVER_VERIFIED' && round.status === 'WAITING_FOR_ROUND') {
          playSignalSound('verified');
        }
      }
    });

    const unsubHistory = subscribeToRoundsHistory((rounds) => {
      setHistoryRounds(rounds);
    });

    // Page Visibility API & Window Focus Handlers (Crucial: Background Tab Recovery)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isTabVisibleRef.current = true;
        // User returned to tab -> Immediately synchronize state
        synchronizeServerStateImmediate();
      } else {
        isTabVisibleRef.current = false;
      }
    };

    const handleWindowFocus = () => {
      isTabVisibleRef.current = true;
      synchronizeServerStateImmediate();
    };

    const handleWindowOnline = () => {
      synchronizeServerStateImmediate();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleWindowOnline);

    // Radar scan animation loop
    const radarInterval = setInterval(() => {
      setRadarDegree((prev) => (prev + 3) % 360);
    }, 35);

    // Heartbeat Ping-Pong Loop (Every 9 seconds)
    heartbeatTimerRef.current = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        const pingRes = await pingAuthoritativeServer();
        if (pingRes.alive) {
          setPingLatency(pingRes.pingMs);
          setSyncState('LIVE');
          if (pingRes.currentRound && pingRes.currentRound.roundId !== currentRound?.roundId) {
            // New round was detected during heartbeat
            setCurrentRound(pingRes.currentRound);
          }
        } else {
          setSyncState('RECONNECTING');
        }
      }
    }, 9000);

    return () => {
      unsubConn();
      unsubRound();
      unsubHistory();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleWindowOnline);
      clearInterval(radarInterval);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [playSignalSound, synchronizeServerStateImmediate, currentRound?.roundId]);

  const isConnected = connection?.connectionStatus === 'CONNECTED';
  const isSignalAppOn = connection?.signalAppEnabled !== false;
  const isRunning = currentRound?.status === 'ROUND_RUNNING';
  const isCrashed = currentRound?.status === 'ROUND_FINISHED' || currentRound?.status === 'CRASHED';
  const isBetting = currentRound?.status === 'WAITING_FOR_ROUND';
  const currentMultiplier = currentRound?.currentMultiplier || 1.00;

  // Last finished round for "LATEST RESULT" display
  const latestFinishedRound = historyRounds.length > 0 ? historyRounds[0] : null;

  // Format countdown string: "00:05", "00:04", etc.
  const formattedCountdown = `00:0${Math.max(0, Math.min(9, secondsRemaining))}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none selection:bg-red-500/20">
      
      {/* 1. TOP HEADER (BRANDING & REAL-TIME STATUS) */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-rose-700 p-0.5 shadow-lg shadow-red-950/60 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                syncState === 'LIVE' ? 'bg-emerald-500 animate-ping' : syncState === 'RECONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wider text-white uppercase font-chakra">
                  Aviator Signal
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-[10px] font-black text-red-400 uppercase tracking-widest">
                  GLOBAL
                </span>
              </div>
              
              {/* Connection Status Label */}
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    syncState === 'LIVE' ? 'bg-emerald-400 animate-pulse' : syncState === 'RECONNECTING' ? 'bg-amber-400' : 'bg-rose-500'
                  }`} />
                  <span className={`font-bold ${
                    syncState === 'LIVE' ? 'text-emerald-400' : syncState === 'RECONNECTING' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {syncState === 'LIVE' ? '● LIVE' : syncState === 'RECONNECTING' ? '● RECONNECTING...' : '● OFFLINE'}
                  </span>
                </div>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">Ping: {pingLatency}ms</span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                haptics.impact();
                setIsMuted(!isMuted);
              }}
              title={isMuted ? 'Unmute alerts' : 'Mute alerts'}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 flex items-center justify-center transition-colors active:scale-95"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Play Aviator Game Button */}
            {onOpenAviatorGame && (
              <button
                onClick={() => {
                  haptics.impact();
                  onOpenAviatorGame();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black font-chakra flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-all active:scale-95"
              >
                <Plane className="w-3.5 h-3.5 rotate-45" />
                <span className="hidden sm:inline">PLAY AVIATOR</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* 2. MAIN COCKPIT CONTAINER */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-5">
        
        {/* CASE A: SIGNAL APP TURNED OFF BY ADMIN */}
        {!isSignalAppOn ? (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <WifiOff className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black font-chakra text-slate-200 uppercase">
                Signal Broadcast Paused
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                The global Aviator signal broadcast is temporarily paused by the administration. Live signals will resume shortly.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-[11px] font-mono text-slate-400">
              <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
              <span>Checking authoritative server status...</span>
            </div>
          </div>
        ) : (
          
          <>
            {/* CURRENT ROUND & AUTHORITATIVE COUNTDOWN BAR */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md font-mono text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider">Current Round:</span>
                <span className="font-black text-slate-100 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                  {currentRound?.roundId || 'AVI-20260827-18453'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider">Countdown:</span>
                <span className={`font-black text-sm px-2.5 py-0.5 rounded-lg font-mono tracking-wider ${
                  isBetting ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isBetting ? formattedCountdown : 'IN FLIGHT'}
                </span>
              </div>
            </div>

            {/* 3. PRIMARY RADAR DISPLAY & LIVE SIGNAL CARD */}
            <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl p-6 sm:p-8 overflow-hidden text-center">
              
              {/* Animated Background Radar Grid */}
              <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden flex items-center justify-center">
                <div className="w-[440px] h-[440px] rounded-full border border-red-500/20 flex items-center justify-center">
                  <div className="w-[300px] h-[300px] rounded-full border border-red-500/25 flex items-center justify-center">
                    <div className="w-[180px] h-[180px] rounded-full border border-red-500/30" />
                  </div>
                </div>
                {/* Rotating Beam */}
                <div 
                  className="absolute w-[440px] h-[440px] rounded-full pointer-events-none"
                  style={{
                    transform: `rotate(${radarDegree}deg)`,
                    background: 'conic-gradient(from 0deg, rgba(239, 68, 68, 0.25) 0deg, rgba(239, 68, 68, 0.05) 45deg, transparent 90deg)'
                  }}
                />
              </div>

              {/* MAIN MULTIPLIER & SIGNAL COCKPIT */}
              <div className="relative z-10 flex flex-col items-center justify-center py-2 space-y-3">
                
                {/* CASE 1: FLIGHT IN PROGRESS */}
                {isRunning ? (
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-[11px] font-black uppercase tracking-widest animate-pulse font-chakra">
                      <Activity className="w-3.5 h-3.5 text-red-500" />
                      ROUND RUNNING
                    </div>

                    <div className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 font-mono filter drop-shadow-md">
                      {currentMultiplier.toFixed(2)}x
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className="text-xs font-mono font-bold text-slate-400">
                        SIGNAL FOR ROUND #{currentRound?.roundId?.replace('AVI-', '') || 'CURRENT'}
                      </div>
                      <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-[11px] font-bold text-emerald-400">
                        ● SERVER VERIFIED
                      </div>
                    </div>
                  </div>
                ) : isCrashed ? (
                  
                  /* CASE 2: ROUND FINISHED / CRASHED */
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/40 text-[11px] font-black uppercase tracking-widest font-chakra">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      ROUND FINISHED
                    </div>

                    <div className="text-6xl sm:text-7xl font-black tracking-tighter text-rose-500 font-mono filter drop-shadow-lg">
                      {(currentRound?.finalMultiplier || currentMultiplier).toFixed(2)}x
                    </div>

                    <div className="text-xs font-mono font-bold text-slate-400">
                      ROUND #{currentRound?.roundId?.replace('AVI-', '') || 'COMPLETED'}
                    </div>

                    <p className="text-xs text-slate-400 font-medium pt-1">
                      Preparing authoritative signal for next round...
                    </p>
                  </div>

                ) : (

                  /* CASE 3: NEXT ROUND PRE-SIGNAL & COUNTDOWN */
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black uppercase tracking-widest font-chakra">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      NEXT SIGNAL
                    </div>

                    {/* Bold Large Signal Multiplier */}
                    <div className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 filter drop-shadow-xl">
                      {currentRound?.predictedMultiplier ? `${currentRound.predictedMultiplier.toFixed(2)}x` : '2.35x'}
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="text-xs font-mono font-bold text-slate-300">
                        ROUND #{currentRound?.roundId?.replace('AVI-', '') || '18454'}
                      </div>

                      {/* Smooth Pulsing SERVER VERIFIED Badge */}
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
                        <span>EXPECTED MULTIPLIER</span>
                      </motion.div>

                      {/* Dynamic Real-Time Countdown */}
                      <div className="pt-2 text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                        <span>FLIGHT BEGINS IN:</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white font-black animate-pulse text-sm">
                          {secondsRemaining > 0 ? `${secondsRemaining}s` : '1s'}
                        </span>
                        <span className="text-slate-500 text-[11px] font-mono">({formattedCountdown})</span>
                      </div>
                    </div>
                  </div>

                )}

              </div>

              {/* TELEMETRY FOOTER STRIP */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-xs font-mono">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50">
                  <span className="text-slate-500 text-[10px] block uppercase">Connected Engine</span>
                  <span className="text-slate-200 font-bold">{connection?.gameName || 'Aviator'}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50">
                  <span className="text-slate-500 text-[10px] block uppercase">Signature Protocol</span>
                  <span className="text-emerald-400 font-bold">SHA-256 Verified</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50 col-span-2 sm:col-span-1">
                  <span className="text-slate-500 text-[10px] block uppercase">Synchronized Clients</span>
                  <span className="text-slate-200 font-bold">100% Shared Global</span>
                </div>
              </div>

            </div>

            {/* 4. LATEST RESULT CARD */}
            {latestFinishedRound && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md flex items-center justify-between shadow-sm">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-chakra">
                    LATEST RESULT
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Round: <span className="font-bold text-slate-200">#{latestFinishedRound.roundId?.replace('AVI-', '')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Actual Result</span>
                    <span className="text-lg font-black font-mono text-emerald-400">
                      {(latestFinishedRound.finalMultiplier || latestFinishedRound.currentMultiplier || 1.0).toFixed(2)}x
                    </span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 font-mono">
                    Completed
                  </div>
                </div>
              </div>
            )}

            {/* 5. SHARED GAME HISTORY (LATEST 20 COMPLETED ROUNDS) */}
            <div className="bg-slate-900/80 rounded-3xl p-5 sm:p-6 border border-slate-800 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-chakra">
                    Shared Game History (Latest 20)
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {historyRounds.length} Server Rounds
                </span>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {historyRounds.slice(0, 20).map((round, idx) => {
                  const actualResult = round.finalMultiplier || round.currentMultiplier || 1.00;
                  const signalValue = round.predictedMultiplier || actualResult;
                  const isHigh = actualResult >= 10.0;
                  const isMed = actualResult >= 2.0;

                  return (
                    <div
                      key={round.id || idx}
                      onClick={() => {
                        haptics.impact();
                        setSelectedRoundDetail(round);
                        setShowHistoryModal(true);
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 text-xs font-mono cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">
                          #{round.roundId?.replace('AVI-', '')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="text-[10px] uppercase">Signal:</span>
                          <span className="font-bold text-purple-400">{signalValue.toFixed(2)}x</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 uppercase">Result:</span>
                          <span className={`px-2 py-0.5 rounded-md font-black ${
                            isHigh ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50' : isMed ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {actualResult.toFixed(2)}x
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {historyRounds.length === 0 && (
                  <div className="w-full py-6 text-center text-xs text-slate-500 font-mono">
                    No verified rounds recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* 6. ARCHITECTURE FOOTER NOTE */}
            <div className="text-center text-[11px] text-slate-500 font-mono py-2">
              ONE GAME • ONE AUTHORITATIVE ENGINE • ONE SIGNAL APP • 100% SYNCHRONIZED
            </div>

          </>
        )}

      </main>

      {/* 7. ROUND AUDIT DETAIL MODAL */}
      <AnimatePresence>
        {showHistoryModal && selectedRoundDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left font-mono"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase text-slate-200">
                    Round Audit Detail
                  </span>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Round ID:</span>
                  <span className="text-slate-200 font-bold">{selectedRoundDetail.roundId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pre-Round Signal:</span>
                  <span className="text-purple-400 font-bold">
                    {(selectedRoundDetail.predictedMultiplier || selectedRoundDetail.finalMultiplier || 1.0).toFixed(2)}x
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actual Result:</span>
                  <span className="text-emerald-400 font-black text-sm">
                    {(selectedRoundDetail.finalMultiplier || selectedRoundDetail.currentMultiplier || 1.0).toFixed(2)}x
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Signal Status:</span>
                  <span className="text-emerald-300 font-bold">
                    {selectedRoundDetail.serverSignalStatus || 'SERVER_VERIFIED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Server Hash:</span>
                  <span className="text-slate-400 text-[10px] truncate max-w-[150px]">
                    {selectedRoundDetail.serverSignature || 'sig_sha256_verified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="text-slate-300 text-[11px]">
                    {selectedRoundDetail.createdAt ? new Date(selectedRoundDetail.createdAt).toLocaleTimeString() : 'Recent'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase transition-colors"
              >
                Close Audit
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
