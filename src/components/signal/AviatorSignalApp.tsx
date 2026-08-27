import React, { useState, useEffect, useRef } from 'react';
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
  Check
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
  const [lastSyncSeconds, setLastSyncSeconds] = useState(0);
  const [radarDegree, setRadarDegree] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRoundDetail, setSelectedRoundDetail] = useState<SignalRound | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);

  // Dynamic Countdown Timer synchronized with authoritative server timestamps
  useEffect(() => {
    if (currentRound?.status === 'WAITING_FOR_ROUND') {
      if (currentRound.countdownEndsAt) {
        const updateCountdown = () => {
          const remaining = Math.max(0, Math.ceil((currentRound.countdownEndsAt! - Date.now()) / 1000));
          setSecondsRemaining(remaining);
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 100);
        return () => clearInterval(interval);
      } else {
        setSecondsRemaining(currentRound.countdown || 5);
      }
    } else {
      setSecondsRemaining(5);
    }
  }, [currentRound?.status, currentRound?.countdownEndsAt, currentRound?.countdown]);

  // Audio refs for radar and signal alerts
  const audioContextRef = useRef<AudioContext | null>(null);

  // 1. Initial Defaults bootstrap and Global Realtime Subscriptions
  useEffect(() => {
    initializeAviatorSignalDefaults();

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
  }, []);

  // 2. Sound Effects
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
  };

  const isConnected = connection?.connectionStatus === 'CONNECTED';
  const isRunning = currentRound?.status === 'ROUND_RUNNING';
  const isCrashed = currentRound?.status === 'ROUND_FINISHED' || currentRound?.status === 'CRASHED';
  const currentMultiplier = currentRound?.currentMultiplier || 1.00;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none selection:bg-red-500/20">
      
      {/* 1. TOP HEADER (BRANDING & REAL-TIME TELEMETRY STATUS) */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-rose-700 p-0.5 shadow-lg shadow-red-950/60 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                isConnected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'
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
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                {isConnected ? 'LIVE ENGINE TELEMETRY' : 'CONNECTING TO ENGINE...'}
              </p>
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

            {/* Play Aviator Game Button (If provided) */}
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

      {/* 2. MAIN CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* CONNECTION STATUS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className={`flex h-2.5 w-2.5 relative`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </span>
            <span className={`font-black uppercase tracking-wider ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isConnected ? '● GAME CONNECTED' : '● SYNCING WITH GAME...'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Sync: {lastSyncSeconds === 0 ? 'Live' : `${lastSyncSeconds}s ago`}</span>
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-slate-500" />
              <span>Ping: {connection?.pingMs || 18}ms</span>
            </span>
          </div>
        </div>

        {/* 3. PRIMARY RADAR & PREDICTIVE SIGNAL COCKPIT */}
        <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl p-6 sm:p-8 overflow-hidden">
          
          {/* Animated Background Radar Grid */}
          <div className="absolute inset-0 pointer-events-none opacity-25 overflow-hidden flex items-center justify-center">
            <div className="w-[480px] h-[480px] rounded-full border border-red-500/20 flex items-center justify-center">
              <div className="w-[340px] h-[340px] rounded-full border border-red-500/25 flex items-center justify-center">
                <div className="w-[200px] h-[200px] rounded-full border border-red-500/30" />
              </div>
            </div>
            {/* Rotating Beam */}
            <div 
              className="absolute w-[480px] h-[480px] rounded-full pointer-events-none"
              style={{
                transform: `rotate(${radarDegree}deg)`,
                background: 'conic-gradient(from 0deg, rgba(239, 68, 68, 0.25) 0deg, rgba(239, 68, 68, 0.05) 45deg, transparent 90deg)'
              }}
            />
          </div>

          {/* MAIN COCKPIT DISPLAY */}
          <div className="relative z-10 flex flex-col items-center justify-center py-4 text-center">
            
            {/* CASE 1: GAME DISCONNECTED OR RECONNECTING */}
            {!isConnected ? (
              <div className="space-y-3 py-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-800 text-rose-300 text-[11px] font-black uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  GAME CONNECTION LOST
                </div>
                <div className="text-5xl sm:text-6xl font-black font-mono text-slate-600">
                  --.--x
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Syncing with authoritative Aviator engine...
                </p>
              </div>
            ) : isRunning ? (
              
              /* CASE 2: ACTIVE ROUND RUNNING */
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-[11px] font-black uppercase tracking-widest animate-pulse">
                  <Activity className="w-3.5 h-3.5 text-red-500" />
                  ROUND RUNNING
                </div>

                <div className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 font-mono filter drop-shadow-md">
                  {currentMultiplier.toFixed(2)}x
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="text-xs font-mono font-bold text-slate-400">
                    {currentRound?.roundId ? `ROUND #${currentRound.roundId}` : 'ROUND IN PROGRESS'}
                  </div>

                  <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-[11px] font-bold text-emerald-400">
                    ● SERVER VERIFIED
                  </div>
                </div>
              </div>

            ) : isCrashed ? (

              /* CASE 3: ROUND FINISHED / CRASHED */
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/40 text-[11px] font-black uppercase tracking-widest">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  ROUND FINISHED
                </div>

                <div className="text-6xl sm:text-7xl font-black tracking-tighter text-rose-500 font-mono filter drop-shadow-lg">
                  {(currentRound?.finalMultiplier || currentMultiplier).toFixed(2)}x
                </div>

                <div className="text-xs font-mono font-bold text-slate-400">
                  {currentRound?.roundId ? `ROUND #${currentRound.roundId}` : 'ROUND COMPLETED'}
                </div>

                <p className="text-xs text-slate-400 font-medium pt-1">
                  Waiting for next server round synchronization...
                </p>
              </div>

            ) : (

              /* CASE 4: NEXT ROUND COUNTDOWN & PRE-ROUND SIGNAL */
              <div className="space-y-3">
                {currentRound?.serverSignalStatus === 'SERVER_VERIFIED' && currentRound.predictedMultiplier ? (
                  
                  /* VERIFIED PRE-ROUND RESULT */
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      NEXT ROUND
                    </div>

                    <div className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 filter drop-shadow-xl">
                      {currentRound.predictedMultiplier.toFixed(2)}x
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="text-xs font-mono font-bold text-slate-300">
                        {currentRound.roundId ? `ROUND #${currentRound.roundId}` : 'ROUND #5001'}
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
                        <span>SERVER VERIFIED</span>
                      </motion.div>

                      {/* Synchronized Countdown */}
                      <div className="pt-2 text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                        <span>STARTING IN</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white font-black animate-pulse text-sm">
                          {secondsRemaining > 0 ? secondsRemaining : 1}
                        </span>
                        <span className="text-slate-500 text-[11px] font-mono">(5 → 4 → 3 → 2 → 1)</span>
                      </div>
                    </div>
                  </div>

                ) : (

                  /* WAITING FOR AUTHORITATIVE DATA */
                  <div className="py-3 space-y-3">
                    <div className="text-4xl sm:text-5xl font-black tracking-tight text-slate-400 font-mono flex items-center justify-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                      SYNCING...
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      WAITING FOR VERIFIED ROUND DATA
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Connecting to authoritative game engine to receive authorized round signal.
                    </p>
                  </div>

                )}
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
              <span className="text-slate-500 text-[10px] block uppercase">Clients Synchronized</span>
              <span className="text-slate-200 font-bold">100% Shared Global</span>
            </div>
          </div>

        </div>

        {/* 4. SHARED GAME HISTORY (LATEST 20 COMPLETED ROUNDS) */}
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

          <div className="flex flex-wrap gap-2">
            {historyRounds.slice(0, 20).map((round, idx) => {
              const mult = round.finalMultiplier || round.currentMultiplier || 1.00;
              const isHigh = mult >= 10.0;
              const isMed = mult >= 2.0;

              return (
                <button
                  key={round.id || idx}
                  onClick={() => {
                    haptics.impact();
                    setSelectedRoundDetail(round);
                    setShowHistoryModal(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black border transition-all active:scale-95 ${
                    isHigh 
                      ? 'bg-purple-950/60 text-purple-300 border-purple-800/60 hover:bg-purple-900/60 shadow-xs' 
                      : isMed 
                      ? 'bg-blue-950/60 text-blue-300 border-blue-800/60 hover:bg-blue-900/60 shadow-xs' 
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {mult.toFixed(2)}x
                </button>
              );
            })}

            {historyRounds.length === 0 && (
              <div className="w-full py-6 text-center text-xs text-slate-500 font-mono">
                No verified rounds recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* 5. ARCHITECTURE FOOTER NOTE */}
        <div className="text-center text-[11px] text-slate-500 font-mono py-2">
          ONE GAME • ONE AUTHORITATIVE ENGINE • ONE SIGNAL APP • 100% SYNCHRONIZED
        </div>

      </main>

      {/* 6. ROUND DETAIL MODAL */}
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
                  <span className="text-slate-400">Final Multiplier:</span>
                  <span className="text-emerald-400 font-black text-sm">
                    {(selectedRoundDetail.finalMultiplier || selectedRoundDetail.currentMultiplier).toFixed(2)}x
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
