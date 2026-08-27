/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Play, RotateCcw, Zap, Info, Settings, Trophy, Star, X, Zap as TurboIcon, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SYMBOLS, ROWS, COLS, MULTIPLIERS, FREE_SPIN_MULTIPLIERS, SOUNDS } from './PokieSuperAceConstants';
import { WebAudioManager } from './PokieSuperAceAudioManager';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { UserData } from '../types';
import { toBengaliNumber, formatBengaliCurrency } from '../utils';
import { haptics } from '../utils/haptics';
import './PokieSuperAceStyles.css';

interface SymbolInstance {
  id: string;
  symbolId: number;
  isGolden: boolean;
  isWild: boolean;
  isScatter: boolean;
  url: string;
  isRevealed?: boolean;
  isMystery?: boolean;
}

interface ReelProps {
  symbols: SymbolInstance[];
  isSpinning: boolean;
  turbo: boolean;
  delay: number;
  isRevealing?: boolean;
  winningPositions?: { col: number; row: number }[];
  colIndex: number;
  teaseScatter?: boolean;
  isScatterTriggering?: boolean;
}

const BETS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const CURRENCY = '৳';

const CountUp: React.FC<{ end: number; duration?: number }> = ({ end, duration = 1500 }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing out function
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      setCount(Math.floor(easeOut(progress) * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
};

const Reel: React.FC<ReelProps> = ({ symbols, isSpinning, turbo, delay, isRevealing, winningPositions, colIndex, teaseScatter, isScatterTriggering }) => {
  // Pre-generate a static strip for spinning to avoid state updates during spin
  const spinningStrip = useMemo(() => {
    const strip = Array(30).fill(null).map((_, i) => {
      const randomSym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      return {
        id: `spin-${colIndex}-${i}`,
        url: randomSym.url
      };
    });
    return strip;
  }, [colIndex]);

  return (
    <div className="reel-container flex-1 relative overflow-hidden h-[calc(var(--row-height)*4+12px)] bg-black/20 rounded-lg">
      <AnimatePresence>
        {isRevealing && symbols.length > 0 && (
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '200%', opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, ease: "linear" }}
            className="absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Spinning View - Only active during spin */}
      <AnimatePresence>
        {isSpinning && (
          <motion.div
            key="spinning-strip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 spinning-blur"
          >
            <motion.div
              animate={{
                y: ["-80%", "0%"],
              }}
              transition={{
                duration: turbo ? 0.12 : 0.3,
                repeat: Infinity,
                ease: "linear",
              }}
              className="flex flex-col gap-1"
            >
              {[...spinningStrip, ...spinningStrip].map((sym, i) => (
                <div key={`${sym.id}-${i}`} className="w-full h-[var(--row-height)] flex items-center justify-center p-1">
                  <img src={sym.url} alt="" className="w-full h-full object-contain opacity-70" referrerPolicy="no-referrer" />
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Static View - Result symbols and Cascades */}
      <motion.div
        className="flex flex-col gap-1 h-full"
        initial={false}
        animate={isSpinning ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence mode="popLayout">
          {symbols.map((sym, rIdx) => {
            if (!sym) return <div key={`empty-${rIdx}`} className="w-full h-[var(--row-height)]" />;
            
            const isWinning = !isSpinning && winningPositions?.some(pos => pos.col === colIndex && pos.row === rIdx);
            const isWinningScatter = !isSpinning && ((isWinning && sym.isScatter) || (isScatterTriggering && sym.isScatter));
            
            return (
              <motion.div
                key={sym.id}
                layout
                initial={isRevealing ? { scale: 0.5, opacity: 0 } : { y: -50, opacity: 0 }}
                animate={isWinning || isWinningScatter ? { 
                  scale: [1, 1.15, 1],
                  opacity: 1,
                  y: 0,
                  zIndex: 40,
                  filter: ["brightness(1)", "brightness(1.4)", "brightness(1)"]
                } : { 
                  scale: 1, 
                  opacity: 1,
                  y: 0,
                  filter: "brightness(1)"
                }}
                exit={{ scale: 0.5, opacity: 0, filter: 'blur(10px)' }}
                transition={isWinning || isWinningScatter ? {
                  duration: 0.4,
                  ease: "easeInOut"
                } : { 
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  mass: 1,
                  delay: isSpinning ? 0 : rIdx * 0.05
                }}
                className={`card-symbol w-full h-[var(--row-height)] ${
                  sym.isGolden ? 'golden' : sym.isWild ? 'wild' : ''
                } ${isWinning ? 'winning' : ''} ${isWinningScatter ? 'scatter-win' : ''} ${!isSpinning && sym.isMysteryWin ? 'mystery-win-glow' : ''} relative`}
              >
                {!isSpinning && sym.isMysteryWin && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.8, 1.5, 2] }}
                    transition={{ duration: 1, repeat: 1 }}
                    className="absolute inset-0 bg-yellow-400/40 rounded-full blur-2xl z-0"
                  />
                )}
                <motion.div
                  className="w-full h-full"
                  initial={false}
                  animate={{ 
                    rotateY: sym.isMystery && !sym.isRevealed ? 180 : 0,
                    scale: sym.isMystery && sym.isRevealed ? [1, 1.25, 1] : 1,
                    zIndex: sym.isMystery && sym.isRevealed ? 50 : 1
                  }}
                  transition={{ 
                    rotateY: { duration: 0.8, type: "spring", stiffness: 200, damping: 20 },
                    scale: { duration: 0.5, times: [0, 0.5, 1] }
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div 
                    className="absolute inset-0 w-full h-full backface-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <img 
                      src={sym.url} 
                      alt="symbol" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <div 
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-yellow-600 via-yellow-400 to-yellow-900 rounded-lg flex items-center justify-center border-2 border-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.6)] overflow-hidden"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(-180deg)' }}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] opacity-50 animate-pulse" />
                    <div className="relative w-4/5 h-4/5 border border-white/20 rounded-md flex items-center justify-center bg-black/20 backdrop-blur-sm">
                      <span className="text-4xl font-black text-white drop-shadow-lg italic">?</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [showContinue, setShowContinue] = useState(false);
  const [phase, setPhase] = useState<'jili' | 'tutorial'>('jili');

  useEffect(() => {
    // Small delay before starting progress for better feel
    const startTimeout = setTimeout(() => {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            if (phase === 'jili') {
              clearInterval(timer);
              setTimeout(() => {
                setPhase('tutorial');
                setProgress(0);
              }, 800);
              return 100;
            } else {
              clearInterval(timer);
              setTimeout(() => setShowContinue(true), 500);
              return 100;
            }
          }
          // Slower increment for better visibility
          const increment = phase === 'jili' ? (Math.random() * 2 + 1) : (Math.random() * 1.5 + 0.5);
          return Math.min(prev + increment, 100);
        });
      }, 100);
      return () => clearInterval(timer);
    }, phase === 'jili' ? 800 : 0);
    return () => clearTimeout(startTimeout);
  }, [phase]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {phase === 'jili' ? (
          <motion.div 
            key="jili"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="flex flex-col items-center"
          >
            <motion.h1 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-7xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-b from-[#FFE082] via-[#FFD54F] to-[#B18A00] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
            >
              JILI
            </motion.h1>
            <div className="mt-10 w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden relative border border-white/5">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#B18A00] via-[#FFD54F] to-[#B18A00]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="tutorial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a4a1a] to-[#0a1a0a]"
          >
            {/* Tutorial Content - JILI Image Phase */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 1, type: "spring" }}
              className="relative z-10 flex flex-col items-center gap-8 px-6 text-center"
            >
              <div className="relative">
                {/* Glowing background for the "egg" feel */}
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full"
                />
                
                {/* The Image Container (Oval/Egg shape) */}
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-64 h-64 flex items-center justify-center"
                >
                  <div className="absolute inset-0 border-2 border-yellow-500/20 rounded-[50%_50%_45%_45%] bg-white/5 backdrop-blur-sm shadow-[0_0_40px_rgba(255,215,0,0.1)]" />
                  <img 
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcBbByIWCnxJx33-XjfIpVM03zLxxSP5zN-E-dSlBN5a37rvI32BTMDSY&s=10"
                    alt="JILI Promotion"
                    className="w-full h-full object-contain p-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col items-center gap-2"
              >
                <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-lg">
                  SuperAce
                </h2>
                <p className="text-yellow-500/80 text-[10px] font-black uppercase tracking-[0.5em]">
                  BIG WINS AWAIT
                </p>
              </motion.div>
            </motion.div>

            {/* Bottom Progress/Continue */}
            <div className="absolute bottom-20 w-full flex flex-col items-center px-10">
              {!showContinue ? (
                <>
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue-400 to-cyan-300"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  </div>
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-white/70 font-bold text-xs tracking-widest uppercase"
                  >
                    Loading... {Math.floor(progress)}%
                  </motion.span>
                </>
              ) : (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    boxShadow: ["0 0 0px rgba(74, 222, 128, 0)", "0 0 20px rgba(74, 222, 128, 0.4)", "0 0 0px rgba(74, 222, 128, 0)"]
                  }}
                  transition={{ 
                    scale: { duration: 0.5, type: "spring" },
                    boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onComplete}
                  className="px-12 py-3 bg-gradient-to-b from-green-400 to-green-600 rounded-lg border-b-4 border-green-800 text-white font-black text-xl tracking-widest shadow-2xl"
                >
                  CONTINUE
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const StartScreen = ({ onPlay }: { onPlay: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/90 flex flex-col items-center justify-center"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">SuperAce</h2>
          <div className="flex justify-center gap-2 mt-2">
            {MULTIPLIERS.map(m => (
              <span key={m} className="text-yellow-500 font-black text-lg">x{m}</span>
            ))}
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onPlay}
          className="relative group"
        >
          <div className="absolute -inset-2 bg-orange-500 rounded-lg blur opacity-40 group-hover:opacity-100 transition duration-200" />
          <div className="relative px-16 py-4 bg-gradient-to-b from-orange-400 to-orange-600 rounded-lg border-b-4 border-orange-800 text-white font-black text-3xl tracking-widest">
            PLAY
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default function PokieSuperAceGame({ user, userData, onBack }: { user: any, userData: UserData | null, onBack: () => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showStartScreen, setShowStartScreen] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('super_ace_is_muted');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('super_ace_is_muted', isMuted.toString());
  }, [isMuted]);
  
  // Sync mute state to bgmManager
  useEffect(() => {
    WebAudioManager.setGlobalMute(isMuted);
    if (bgmManagerRef.current) {
      if (isMuted) {
        bgmManagerRef.current.stop();
      } else if (!isLoading && !showStartScreen) {
        bgmManagerRef.current.play().catch(() => {});
      }
    }
  }, [isMuted, isLoading, showStartScreen]);

  const bgmManagerRef = useRef<WebAudioManager | null>(null);

  const playSound = useCallback((url: string, volume: number = 0.5) => {
    if (isMuted) return;
    WebAudioManager.playSFX(url, volume);
  }, [isMuted]);

  useEffect(() => {
    if (!bgmManagerRef.current) {
      bgmManagerRef.current = new WebAudioManager(SOUNDS.BGM);
      bgmManagerRef.current.load();
    }
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        bgmManagerRef.current?.stop();
      } else if (!isMuted && !isLoading) {
        bgmManagerRef.current?.play().catch(() => {});
      }
    };

    const handleBlur = () => {
      bgmManagerRef.current?.stop();
    };
    const handleFocus = () => {
      if (!isMuted && !isLoading) {
        bgmManagerRef.current?.play().catch(() => {});
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    if (!isMuted && !isLoading) {
      bgmManagerRef.current.play().catch(() => {});
    } else {
      bgmManagerRef.current.stop();
    }

    return () => {
      bgmManagerRef.current?.stop();
      WebAudioManager.stopAllSounds();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isMuted, isLoading]);

  const [isBuyBonusModalOpen, setIsBuyBonusModalOpen] = useState(false);
  const [totalWays, setTotalWays] = useState(0);
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const balance = userData?.balance || 0;
  const [bet, setBet] = useState(BETS[4]); // Default to 10
  const [grid, setGrid] = useState<SymbolInstance[][]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [teaseMystery, setTeaseMystery] = useState(false);
  const [teaseScatter, setTeaseScatter] = useState(false);
  const [multiplierIndex, setMultiplierIndex] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const [freeSpins, setFreeSpins] = useState(0);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);
  const [showFreeSpinCelebration, setShowFreeSpinCelebration] = useState<{ spins: number; scatters: number } | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const [totalFreeSpinWin, setTotalFreeSpinWin] = useState(0);
  const [showFreeSpinResult, setShowFreeSpinResult] = useState(false);
  const [combo, setCombo] = useState(0);
  const [turbo, setTurbo] = useState(false);
  const [winningPositions, setWinningPositions] = useState<{ col: number; row: number }[]>([]);
  const [spinCount, setSpinCount] = useState(0);
  const [isAutoPlayingFreeSpins, setIsAutoPlayingFreeSpins] = useState(false);
  const [isProcessing, setIsProcessingState] = useState(false);
  const [totalSpins, setTotalSpins] = useState(() => {
    const saved = localStorage.getItem('super_ace_total_spins');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [sessionStats, setSessionStats] = useState(() => {
    const saved = localStorage.getItem('super_ace_session_stats');
    return saved ? JSON.parse(saved) : { totalBet: 0, totalWin: 0, spinsSinceLastBigWin: 0 };
  });

  useEffect(() => {
    localStorage.setItem('super_ace_session_stats', JSON.stringify(sessionStats));
  }, [sessionStats]);

  useEffect(() => {
    localStorage.setItem('super_ace_total_spins', totalSpins.toString());
  }, [totalSpins]);

  const [hasHadFreeSpins, setHasHadFreeSpins] = useState(() => {
    const saved = localStorage.getItem('super_ace_has_had_fs');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('super_ace_has_had_fs', hasHadFreeSpins.toString());
  }, [hasHadFreeSpins]);

  const [isScatterTriggering, setIsScatterTriggering] = useState(false);
  const isProcessingRef = useRef(false);
  const setIsProcessing = (val: boolean) => {
    setIsProcessingState(val);
    isProcessingRef.current = val;
  };

  const isFreeSpinModeRef = useRef(isFreeSpinMode);
  const freeSpinsRef = useRef(freeSpins);
  const balanceRef = useRef(balance);
  const betRef = useRef(bet);
  const spinCountRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => { isFreeSpinModeRef.current = isFreeSpinMode; }, [isFreeSpinMode]);
  useEffect(() => { freeSpinsRef.current = freeSpins; }, [freeSpins]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { betRef.current = bet; }, [bet]);

  const handleCollectFreeSpinWin = useCallback(async () => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(totalFreeSpinWin)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
    setShowFreeSpinResult(false);
    setTotalFreeSpinWin(0);
    setIsFreeSpinMode(false);
    setWinAmount(0);
    setIsProcessing(false);
  }, [totalFreeSpinWin, user.uid]);

  const spinRef = useRef<() => void>(() => {});

  const SCATTER_SYMBOL = SYMBOLS.find(s => s.isScatter)!;
  const WILD_SYMBOL = SYMBOLS.find(s => s.isWild)!;
  const symbolCounter = useRef(0);
  const getRandomSymbol = useCallback((forceScatter = false, currentScatters = 0, forceMystery = false, forceSymbolId?: number, colIndex?: number): SymbolInstance => {
    symbolCounter.current++;
    let randomSymbol;
    if (forceScatter && currentScatters < 5) {
      randomSymbol = SCATTER_SYMBOL;
    } else if (forceSymbolId !== undefined) {
      randomSymbol = SYMBOLS.find(s => s.id === forceSymbolId)!;
    } else {
      const currentSpinCount = spinCountRef.current;
      const isFS = isFreeSpinModeRef.current;
      
      // RTP-based probability adjustment
      const rtp = sessionStats.totalBet > 0 ? sessionStats.totalWin / sessionStats.totalBet : 0.95;
      const isOverpaying = rtp > 0.98;
      const isUnderpaying = rtp < 0.85;

      // Base probabilities
      let scatterProb = isFS ? 0.01 : 0.015;
      let wildProb = 0.02;
      
      // Adjust probabilities based on RTP
      if (isOverpaying) {
        scatterProb *= 0.5;
        wildProb *= 0.7;
      } else if (isUnderpaying) {
        scatterProb *= 1.5;
        wildProb *= 1.3;
      }

      const isScatter = Math.random() < scatterProb && currentScatters < 5;
      
      if (isScatter) {
        randomSymbol = SCATTER_SYMBOL;
      } else {
        const isWild = Math.random() < wildProb;
        if (isWild && colIndex !== undefined && colIndex >= 1) { // Wilds usually not on reel 1
          randomSymbol = WILD_SYMBOL;
        } else {
          // Weighted symbol selection
          // Low symbols (5-8) are more frequent
          // High symbols (2-4, 9) are less frequent
          const weights = [
            { id: 2, weight: 5 },  // King
            { id: 3, weight: 8 },  // Queen
            { id: 4, weight: 10 }, // Jack
            { id: 5, weight: 20 }, // 10
            { id: 6, weight: 25 }, // 9
            { id: 7, weight: 30 }, // 8
            { id: 8, weight: 35 }, // 7
            { id: 9, weight: 5 },  // Ace
          ];

          // Adjust weights based on RTP
          if (isOverpaying) {
            weights.find(w => w.id === 2)!.weight = 2;
            weights.find(w => w.id === 9)!.weight = 2;
          }

          const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
          let rand = Math.random() * totalWeight;
          let selectedId = 8; // Default to lowest
          for (const w of weights) {
            if (rand < w.weight) {
              selectedId = w.id;
              break;
            }
            rand -= w.weight;
          }
          randomSymbol = SYMBOLS.find(s => s.id === selectedId)!;
        }
      }
    }
    
    const isGoldenEligibleReel = colIndex !== undefined && colIndex >= 1 && colIndex <= 3;
    const goldenProb = isFreeSpinModeRef.current ? 0.15 : 0.08;
    
    return {
      id: `${Math.random().toString(36).substr(2, 9)}-${Date.now()}-${symbolCounter.current}`,
      symbolId: randomSymbol.id,
      isGolden: !randomSymbol.isScatter && !randomSymbol.isWild && isGoldenEligibleReel && Math.random() < goldenProb,
      isWild: randomSymbol.isWild || false,
      isScatter: randomSymbol.isScatter || false,
      url: randomSymbol.url,
      isRevealed: !forceMystery,
      isMystery: forceMystery
    };
  }, [sessionStats]);

  const checkWins = useCallback((currentGrid: SymbolInstance[][], currentMultiplierIdx: number, isFreeSpin: boolean, currentBet: number) => {
    const winningPositions: { col: number; row: number }[] = [];
    const scatterPositions: { col: number; row: number }[] = [];
    let totalWin = 0;
    let scatterCount = 0;
    let totalWays = 0;

    const isWinningGrid = Array(COLS).fill(null).map(() => Array(ROWS).fill(false));

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const sym = currentGrid[c][r];
        if (sym && sym.isScatter) {
          scatterCount++;
          scatterPositions.push({ col: c, row: r });
        }
      }
    }

    SYMBOLS.forEach(symbol => {
      if (symbol.isScatter || symbol.isWild) return;

      let ways = 1;
      let consecutive = 0;

      for (let c = 0; c < COLS; c++) {
        let countOnReel = 0;
        for (let r = 0; r < ROWS; r++) {
          const sym = currentGrid[c][r];
          // Explicitly exclude scatters from being part of a winning line
          if (sym && !sym.isScatter && (sym.symbolId === symbol.id || sym.isWild) && sym.isRevealed !== false) {
            countOnReel++;
          }
        }

        if (countOnReel > 0) {
          consecutive++;
          ways *= countOnReel;
        } else {
          break;
        }
      }

      if (consecutive >= 3) {
        const multiplier = isFreeSpin ? FREE_SPIN_MULTIPLIERS[currentMultiplierIdx] : MULTIPLIERS[currentMultiplierIdx];
        const payoutMultiplier = consecutive === 3 ? 1 : (consecutive === 4 ? 2 : 5);
        
        const baseWin = (symbol.value * ways * payoutMultiplier) * (currentBet / 10);
        totalWin += baseWin * multiplier;
        totalWays += ways;

        for (let c = 0; c < consecutive; c++) {
          for (let r = 0; r < ROWS; r++) {
            const sym = currentGrid[c][r];
            if (sym && (sym.symbolId === symbol.id || sym.isWild) && !isWinningGrid[c][r]) {
              isWinningGrid[c][r] = true;
              winningPositions.push({ col: c, row: r });
            }
          }
        }
      }
    });

    return { winningPositions, totalWin, scatterCount, scatterPositions, totalWays };
  }, []);

  const triggerFreeSpins = useCallback(async (count: number, scatterPositions: { col: number; row: number }[]): Promise<boolean> => {
    let spins = 0;
    if (count === 3) spins = 10;
    else if (count === 4) spins = 12;
    else if (count >= 5) spins = 15;
    
    if (spins > 0) {
      if (isFreeSpinModeRef.current) {
        // Re-trigger: Just add spins and show a small toast or sound
        setFreeSpins(prev => prev + spins);
        playSound(SOUNDS.BONUS, 0.6);
        return false;
      }

      setIsScatterTriggering(true);
      // 1. Highlight the scatters on the grid first
      setWinningPositions(scatterPositions);
      playSound(SOUNDS.BONUS, 0.8);
      
      // Add a dramatic pulse to the grid
      const gridEl = document.getElementById('slot-grid');
      if (gridEl) {
        gridEl.classList.add('bonus-trigger-pulse');
        setTimeout(() => gridEl.classList.remove('bonus-trigger-pulse'), 2000);
      }
      
      // 2. Wait for the player to see the scatters clearly (3 seconds for more drama)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setIsScatterTriggering(false);
      // 3. Clear highlights and show the celebration modal
      setWinningPositions([]);
      setShowFreeSpinCelebration({ spins, scatters: count });
      setHasHadFreeSpins(true);
      setFreeSpins(prev => prev + spins);
      setIsFreeSpinMode(true);
      
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FF4500']
      });
      return true;
    }
    return false;
  }, [playSound]);

  const handleCascade = useCallback(async (currentGrid: SymbolInstance[][], multiplierIdx: number, currentCombo: number, accumulatedWin: number = 0): Promise<void> => {
    if (currentCombo >= 10) { // Increased limit for safety
      setIsProcessing(false);
      return;
    }

    try {
      if (!currentGrid || currentGrid.length < COLS) {
        setIsProcessing(false);
        return;
      }

      const isFS = isFreeSpinModeRef.current;
      const currentBet = betRef.current;
      
      let { winningPositions, totalWin, scatterCount, scatterPositions, totalWays: ways } = checkWins(currentGrid, multiplierIdx, isFS, currentBet);
      
      // Payout Cap Logic: Ensure no single spin exceeds 500x bet
      const maxSpinWin = currentBet * 500;
      if (accumulatedWin + totalWin > maxSpinWin) {
        totalWin = Math.max(0, maxSpinWin - accumulatedWin);
      }

      const newAccumulatedWin = accumulatedWin + totalWin;

      if (winningPositions.length > 0) {
        setWinningPositions(winningPositions);
        setTotalWays(ways);
        playSound(SOUNDS.BURST, 0.4);
        if (totalWin >= currentBet * 5) {
          haptics.win();
        } else {
          haptics.light();
        }
        
        // 1. Wait for the burst animation to complete (400ms)
        await new Promise(resolve => setTimeout(resolve, turbo ? 250 : 450));
        
        setWinAmount(prev => prev + totalWin);
        if (isFS) {
          setTotalFreeSpinWin(prev => prev + totalWin);
        } else {
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              balance: increment(totalWin)
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, 'users');
          }
        }
        
        setSessionStats(prev => ({
          ...prev,
          totalWin: prev.totalWin + totalWin,
          spinsSinceLastBigWin: totalWin > currentBet * 10 ? 0 : prev.spinsSinceLastBigWin
        }));

        setLastWin(totalWin);
        setCombo(currentCombo + 1);
        
        // 2. Prepare the new grid (remove winning symbols)
        const newGrid = currentGrid.map(col => col ? [...col] : []);
        const bigJokerReels: number[] = [];

        winningPositions.forEach(({ col, row }) => {
          if (newGrid[col] && newGrid[col][row]) {
            const sym = newGrid[col][row];
            if (sym && sym.isGolden) {
              // Chance to become Big Joker (replaces whole reel) or Small Joker (just one wild)
              const isBigJoker = Math.random() > 0.7; // 30% chance for Big Joker
              
              if (isBigJoker) {
                bigJokerReels.push(col);
              }

              newGrid[col][row] = {
                id: Math.random().toString(36).substr(2, 9),
                symbolId: 10,
                isWild: true,
                isGolden: false,
                isScatter: false,
                url: SYMBOLS.find(s => s.isWild)!.url,
                isRevealed: true
              };
            } else {
              newGrid[col][row] = null as any;
            }
          }
        });

        // Apply Big Joker effect: Replace all non-scatter symbols on the reel with Wilds
        bigJokerReels.forEach(colIndex => {
          for (let r = 0; r < ROWS; r++) {
            const sym = newGrid[colIndex][r];
            if (sym && !sym.isScatter && !sym.isWild) {
              newGrid[colIndex][r] = {
                id: Math.random().toString(36).substr(2, 9),
                symbolId: 10,
                isWild: true,
                isGolden: false,
                isScatter: false,
                url: SYMBOLS.find(s => s.isWild)!.url,
                isRevealed: true
              };
            }
          }
        });

        // 3. Clear winning positions and update grid simultaneously to trigger exit animation
        setWinningPositions([]);
        setGrid(newGrid.map(col => [...col]));
        
        // 4. Wait for exit animation and symbols to settle
        await new Promise(resolve => setTimeout(resolve, turbo ? 150 : 300));

        let totalScattersOnGrid = 0;
        newGrid.forEach(col => col && col.forEach(sym => {
          if (sym && sym.isScatter) totalScattersOnGrid++;
        }));

        // Second update: filter nulls and add new symbols (triggers layout slide)
        for (let c = 0; c < COLS; c++) {
          if (!newGrid[c]) newGrid[c] = [];
          const column = newGrid[c].filter(s => s !== null);
          while (column.length < ROWS) {
            const sym = getRandomSymbol(false, totalScattersOnGrid, false, undefined, c);
            if (sym.isScatter) totalScattersOnGrid++;
            column.unshift(sym);
          }
          newGrid[c] = column;
        }

        setGrid(newGrid.map(col => [...col]));

        const nextMultiplierIdx = Math.min(multiplierIdx + 1, MULTIPLIERS.length - 1);
        setMultiplierIndex(nextMultiplierIdx);
        
        await new Promise(resolve => setTimeout(resolve, turbo ? 300 : 600));
        setTotalWays(0);
        
        // Await recursive call to ensure the entire sequence is finished before resolving
        return await handleCascade(newGrid, nextMultiplierIdx, currentCombo + 1, newAccumulatedWin);
      } else {
        setCombo(0);
        setMultiplierIndex(0);
        
        // Check for scatters at the end of ALL cascades
        const finalCheck = checkWins(currentGrid, 0, isFS, currentBet);
        if (finalCheck.scatterCount >= 3) {
          setTotalWays(0);
          const showedCelebration = await triggerFreeSpins(finalCheck.scatterCount, finalCheck.scatterPositions);
          if (!showedCelebration) {
            setIsProcessing(false);
          }
          return;
        }

        if (totalWin === 0) {
          setTotalWays(0);
          if (newAccumulatedWin > currentBet * 20) {
            playSound(SOUNDS.WIN, 0.7);
            setShowBigWin(true);
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 }
            });
            await new Promise(resolve => setTimeout(resolve, 3000));
            setShowBigWin(false);
          }
        }

        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Cascade error:", error);
      setIsProcessing(false);
      setIsSpinning(false);
    }
  }, [turbo, playSound, getRandomSymbol, checkWins, triggerFreeSpins]);

  // Rigged Win Generator for Retention
  const generateRiggedGrid = useCallback((type: 'small' | 'scatter' | 'big_fs', currentScatters: number) => {
    let grid: SymbolInstance[][] = Array(COLS).fill(null).map((_, c) => 
      Array(ROWS).fill(null).map(() => getRandomSymbol(false, 0, false, undefined, c))
    );

    if (type === 'small') {
      // Force a 3-of-a-kind win
      const winSym = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 2))];
      const row = Math.floor(Math.random() * ROWS);
      for (let c = 0; c < 3; c++) {
        grid[c][row] = {
          ...getRandomSymbol(false, 0, false, undefined, c),
          symbolId: winSym.id,
          isScatter: false,
          isWild: false,
          url: winSym.url,
          isRevealed: true
        };
      }
    } else if (type === 'scatter') {
      // Force 3-5 scatters
      const count = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
      let placed = 0;
      const positions: {c: number, r: number}[] = [];
      while (placed < count) {
        const c = Math.floor(Math.random() * COLS);
        const r = Math.floor(Math.random() * ROWS);
        if (!positions.some(p => p.c === c && p.r === r)) {
          grid[c][r] = getRandomSymbol(true, placed, false, undefined, c);
          positions.push({c, r});
          placed++;
        }
      }
    } else if (type === 'big_fs') {
      // Force a big win for free spins (multiple 4-of-a-kind or 5-of-a-kind)
      // Keep it realistic: Jack, Queen, King or Ace
      const availableHighSymbols = SYMBOLS.filter(s => !s.isScatter && !s.isWild && s.value >= 2.5);
      const winSym = availableHighSymbols[Math.floor(Math.random() * availableHighSymbols.length)];
      const row1 = Math.floor(Math.random() * ROWS);
      
      // 4-of-a-kind is common, 5-of-a-kind is rare
      const winLength = Math.random() < 0.8 ? 4 : 5;
      
      for (let c = 0; c < winLength; c++) {
        grid[c][row1] = {
          ...getRandomSymbol(false, 0, false, undefined, c),
          symbolId: winSym.id,
          isScatter: false,
          isWild: false,
          url: winSym.url,
          isRevealed: true,
          id: Math.random().toString(36).substr(2, 9)
        };
      }
    }

    return grid;
  }, [getRandomSymbol]);

  // Ensure spin function is stable and doesn't cause unnecessary re-renders
  const spin = useCallback(async () => {
    const currentBet = betRef.current;
    const currentBalance = balanceRef.current;
    const isFS = isFreeSpinModeRef.current;
    const currentFS = freeSpinsRef.current;

    if (isProcessingRef.current || (currentBalance < currentBet && !isFS && currentFS === 0)) {
      return;
    }

    haptics.medium();
    setIsProcessing(true);
    setIsSpinning(true);
    if (!isFS) {
      setWinAmount(0);
    }
    setMultiplierIndex(0);
    setLastWin(0);
    setCombo(0);
    setTotalWays(0);
    setWinningPositions([]);
    setIsScatterTriggering(false);
    setShowBigWin(false);
    setShowFreeSpinCelebration(null);
    playSound(SOUNDS.SPIN, 0.3);

    try {
      if (!isFS && currentFS === 0) {
        if (currentBalance < currentBet) {
          setIsProcessing(false);
          setIsSpinning(false);
          return;
        }
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            balance: increment(-currentBet),
            turnover: increment(currentBet)
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'users');
        }
        spinCountRef.current += 1;
        setSpinCount(spinCountRef.current);
        
        setSessionStats(prev => ({
          ...prev,
          totalBet: prev.totalBet + currentBet,
          spinsSinceLastBigWin: prev.spinsSinceLastBigWin + 1
        }));
      } else if (currentFS > 0) {
        setFreeSpins(prev => prev - 1);
      }

      let newGrid: SymbolInstance[][] = [];
      let currentScatters = 0;

      // Realistic Outcome Logic
      const rtp = sessionStats.totalBet > 0 ? sessionStats.totalWin / sessionStats.totalBet : 0.95;
      const outcomeRand = Math.random();
      
      let forceType: 'none' | 'small' | 'scatter' | 'big_fs' = 'none';
      
      if (isFS) {
        // Free spin logic: 40%+ winning spins in bonus rounds
        if (outcomeRand < 0.10) forceType = 'big_fs';
        else if (outcomeRand < 0.45) forceType = 'small';
      } else {
        // Normal spin logic: exactly 40% overall winning spin rate
        const scatterChance = sessionStats.spinsSinceLastBigWin > 25 ? 0.04 : 0.02;
        if (outcomeRand < scatterChance && !hasHadFreeSpins) forceType = 'scatter';
        else if (outcomeRand < 0.40) forceType = 'small';
        else forceType = 'none';
      }

      if (forceType === 'small') {
        newGrid = generateRiggedGrid('small', currentScatters);
      } else if (forceType === 'scatter') {
        newGrid = generateRiggedGrid('scatter', currentScatters);
      } else if (forceType === 'big_fs') {
        newGrid = generateRiggedGrid('big_fs', currentScatters);
      } else {
        newGrid = Array(COLS).fill(null).map((_, c) => 
          Array(ROWS).fill(null).map(() => {
            const sym = getRandomSymbol(false, currentScatters, false, undefined, c);
            if (sym.isScatter) currentScatters++;
            return sym;
          })
        );
      }

      setGrid(newGrid);
      setTotalSpins(prev => prev + 1);

      await new Promise(resolve => setTimeout(resolve, turbo ? 200 : 400));
      setIsSpinning(false);

      const hasUnrevealedMystery = newGrid.some(col => col.some(sym => sym.isMystery && !sym.isRevealed));
      if (hasUnrevealedMystery) {
        await new Promise(resolve => setTimeout(resolve, 400));
        const revealedGrid = newGrid.map((col, colIdx) => col.map(sym => {
          if (sym.isMystery && !sym.isRevealed) {
            return { 
              ...sym, 
              isRevealed: true, 
              isMysteryWin: true
            };
          }
          return sym;
        }));
        setGrid(revealedGrid);
        
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFFFFF', '#FFA500']
        });
        
        await new Promise(resolve => setTimeout(resolve, 800));
        newGrid = revealedGrid.map(col => col.map(sym => ({ ...sym, isMysteryWin: false })));
        setGrid(newGrid);
      }

      await new Promise(resolve => setTimeout(resolve, turbo ? 700 : 1400));
      await handleCascade(newGrid, 0, 0);

    } catch (error) {
      console.error("Spin error:", error);
      setIsProcessing(false);
      setIsSpinning(false);
      setTeaseMystery(false);
      setTeaseScatter(false);
    }
  }, [turbo, playSound, getRandomSymbol, handleCascade]);

  useEffect(() => {
    spinRef.current = spin;
  }, [spin]);

  // Initialize grid
  useEffect(() => {
    const initialGrid = Array(COLS).fill(null).map((_, c) => 
      Array(ROWS).fill(null).map(() => getRandomSymbol(false, 0, false, undefined, c))
    );
    setGrid(initialGrid);
  }, []);

  const handleStartPlay = async () => {
    setShowStartScreen(false);
    setIsRevealing(true);
    
    // Sequential reveal animation
    const emptyGrid = Array(COLS).fill(null).map(() => Array(ROWS).fill(null));
    setGrid(emptyGrid as any);

    for (let c = 0; c < COLS; c++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setGrid(prev => {
        const newGrid = [...prev];
        newGrid[c] = Array(ROWS).fill(null).map(() => getRandomSymbol(false, 0, false, undefined, c));
        return newGrid;
      });
    }
    
    setTimeout(() => setIsRevealing(false), 500);
  };
  const buyBonus = async (scatterCount: number) => {
    const currentBet = betRef.current;
    const multiplier = scatterCount === 3 ? 30 : (scatterCount === 4 ? 60 : 100);
    const cost = currentBet * multiplier;
    
    if (balanceRef.current < cost || isProcessingRef.current) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-cost),
        turnover: increment(cost)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
    setIsBuyBonusModalOpen(false);
    setIsProcessing(true);
    setIsSpinning(true);
    setWinAmount(0);
    setMultiplierIndex(0);
    setLastWin(0);
    setCombo(0);
    
    try {
      // Generate a grid that has the required scatters but NO immediate wins
      // to ensure the bonus triggers cleanly without confusing "bursting" cards
      let grid: SymbolInstance[][] = [];
      let hasInitialWin = true;
      let attempts = 0;

      while (hasInitialWin && attempts < 10) {
        grid = Array(COLS).fill(null).map((_, c) => 
          Array(ROWS).fill(null).map(() => getRandomSymbol(false, 0, false, undefined, c))
        );

        let placed = 0;
        const positions: {c: number, r: number}[] = [];
        while (placed < scatterCount) {
          const c = Math.floor(Math.random() * COLS);
          const r = Math.floor(Math.random() * ROWS);
          if (!grid[c][r].isScatter && !positions.some(p => p.c === c && p.r === r)) {
            grid[c][r] = getRandomSymbol(true, placed, false, undefined, c);
            positions.push({c, r});
            placed++;
          }
        }

        const { winningPositions } = checkWins(grid, 0, false, currentBet);
        if (winningPositions.length === 0) {
          hasInitialWin = false;
        }
        attempts++;
      }
      
      setGrid(grid);
      
      await new Promise(resolve => setTimeout(resolve, turbo ? 300 : 600));
      setIsSpinning(false);
      await new Promise(resolve => setTimeout(resolve, 200));
      // handleCascade will now correctly detect the scatters and set isProcessing to false at the end
      await handleCascade(grid, 0, 0);
    } catch (error) {
      console.error("Buy Bonus error:", error);
      setIsProcessing(false);
      setIsSpinning(false);
    }
  };

  useEffect(() => {
    if (autoSpin && !isProcessing) {
      const timer = setTimeout(() => {
        spinRef.current();
      }, turbo ? 300 : 800);
      return () => clearTimeout(timer);
    }
  }, [autoSpin, isProcessing, turbo]);

  // Handle Auto-play for Free Spins
  useEffect(() => {
    if (isFreeSpinMode && freeSpins > 0 && !isProcessing && !showFreeSpinCelebration) {
      const timer = setTimeout(() => {
        spinRef.current();
      }, turbo ? 500 : 1000);
      return () => clearTimeout(timer);
    }
  }, [isFreeSpinMode, freeSpins, isProcessing, showFreeSpinCelebration, turbo]);

  // Handle Transition out of Free Spins
  useEffect(() => {
    if (isFreeSpinMode && freeSpins === 0 && !isProcessing && !showFreeSpinResult) {
      if (totalFreeSpinWin > 0) {
        setIsProcessing(true);
        setShowFreeSpinResult(true);
        // Auto-collect after 3 seconds
        const timer = setTimeout(() => {
          handleCollectFreeSpinWin();
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        setIsFreeSpinMode(false);
      }
    }
  }, [freeSpins, isProcessing, isFreeSpinMode, totalFreeSpinWin, showFreeSpinResult, handleCollectFreeSpinWin]);

  const handleExitGame = () => {
    bgmManagerRef.current?.stop();
    WebAudioManager.stopAllSounds();
    onBack();
  };

  return (
    <div 
      className="h-screen max-h-screen flex flex-col items-center text-white font-sans select-none overflow-hidden safe-area-inset-bottom"
      style={{ background: 'radial-gradient(circle at center, #1a1a2e 0%, #0a0a0a 100%)' }}
    >
      <AnimatePresence>
        {isLoading && <LoadingScreen onComplete={() => {
          setIsLoading(false);
          setShowStartScreen(true);
        }} />}
      </AnimatePresence>

      <AnimatePresence>
        {showStartScreen && <StartScreen onPlay={handleStartPlay} />}
      </AnimatePresence>
      
      {/* Top Bar */}
      <div className="w-full max-w-md flex justify-between items-center p-3 z-20">
        <button onClick={handleExitGame} className="p-2 bg-black/40 rounded-full border border-white/10">
          <X className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/20 px-3 py-1 rounded border border-yellow-500/50">
            <span className="text-xs font-black text-yellow-500 tracking-wider">JILI</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => !isProcessing && setIsBuyBonusModalOpen(true)}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
            <div className="relative bg-black px-4 py-1.5 rounded-full border border-yellow-500/50 flex flex-col items-center min-w-[80px]">
              <span className="text-[9px] font-black text-yellow-500 uppercase tracking-tighter leading-none">BUY</span>
              <span className="text-xs font-black text-white uppercase tracking-tighter leading-none">BONUS</span>
              <span className="text-[8px] font-bold text-yellow-500/80 mt-0.5">FROM {CURRENCY}{(bet * 30).toLocaleString()}</span>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Mystery Tease Overlay */}
      <AnimatePresence>
        {teaseMystery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-yellow-500/5 backdrop-blur-[1px]" />
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-4xl font-black text-yellow-500 italic tracking-tighter drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]"
            >
              MYSTERY CHANCE!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-md flex flex-col items-center relative px-2 overflow-hidden justify-between py-2">
        {/* Background Logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <h2 className="text-7xl font-black italic tracking-tighter text-center">SuperAce</h2>
          <p className="text-center text-lg font-bold uppercase tracking-[1em]">Deluxe</p>
        </div>

        {/* Upper Info Section */}
        <div className="w-full flex flex-col items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-4 bg-black/60 px-5 py-1 rounded-full border border-yellow-500/30 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <span className="text-yellow-500 font-black italic uppercase text-[10px] tracking-tighter">FREE SPIN</span>
            <span className="text-2xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] tabular-nums">
              {freeSpins || 0}
            </span>
          </div>

          {/* Multiplier Bar */}
          <div className="multiplier-bar">
            {(isFreeSpinMode ? FREE_SPIN_MULTIPLIERS : MULTIPLIERS).map((m, i) => (
              <motion.div 
                key={i}
                initial={false}
                animate={{
                  scale: multiplierIndex === i ? 1.15 : 1,
                  color: multiplierIndex === i ? "#ffd700" : "#8b5e3c",
                  textShadow: multiplierIndex === i ? "0 0 10px #ffd700, 0 0 20px #ff8c00" : "1px 1px 2px rgba(0,0,0,0.8)"
                }}
                className={`multiplier-item ${multiplierIndex === i ? 'active' : ''}`}
              >
                x{m}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Slot Grid Container */}
        <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
          {/* Combo Text Overlay */}
          <AnimatePresence>
            {combo > 0 && !isSpinning && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center"
              >
                <span className="combo-text text-xl">COMBO</span>
                <span className="combo-text text-5xl">{combo}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            id="slot-grid"
            className="grid grid-cols-5 gap-1 wood-texture p-1 rounded-xl border-2 border-yellow-900/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full"
          >
            {grid.map((col, cIdx) => (
              <Reel 
                key={cIdx} 
                symbols={col || []} 
                isSpinning={isSpinning} 
                turbo={turbo} 
                delay={cIdx}
                isRevealing={isRevealing}
                winningPositions={winningPositions}
                colIndex={cIdx}
                teaseScatter={teaseScatter}
                isScatterTriggering={isScatterTriggering}
              />
            ))}
          </div>
        </div>

        {/* Win Display */}
        <div className="mt-2 text-center h-12 flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {lastWin > 0 && (
              <motion.div
                key={lastWin}
                initial={{ y: 0, opacity: 1, scale: 1 }}
                animate={{ y: -40, opacity: 0, scale: 1.8 }}
                className="absolute text-yellow-400 font-black text-2xl pointer-events-none drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              >
                +{CURRENCY}{lastWin.toFixed(2)}
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest leading-none mb-0.5">WIN</p>
          <p className="text-2xl font-black text-white drop-shadow-lg tracking-tight">
            {CURRENCY}{(isFreeSpinMode || showFreeSpinResult ? totalFreeSpinWin : winAmount).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-md bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-xl border-t border-yellow-900/40 p-4 pb-6 flex flex-col gap-4">
        <div className="flex justify-between items-end px-2 sm:px-4">
          
          {/* Left Controls */}
          <div className="flex flex-col gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 sm:p-3 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />}
              </button>
              <div className="flex flex-col">
                <span className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase leading-none mb-1 tracking-tighter">Total Bet</span>
                <div 
                  className="flex items-center gap-2 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => !isProcessing && setIsBetModalOpen(true)}
                >
                  <span className="text-base sm:text-xl font-black text-white min-w-[50px] sm:min-w-[60px] text-center">{CURRENCY}{bet}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex flex-col items-center">
                <span className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase mb-1">Auto</span>
                <button 
                  onClick={() => {
                    haptics.selection();
                    setAutoSpin(!autoSpin);
                  }}
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border transition-all flex items-center justify-center ${autoSpin ? 'bg-yellow-500 border-yellow-400 text-black shadow-[0_0_15px_#ffd700]' : 'bg-white/5 border-white/10 text-gray-400'}`}
                >
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase mb-1">Turbo</span>
                <button 
                  onClick={() => {
                    haptics.selection();
                    setTurbo(!turbo);
                  }}
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border transition-all flex items-center justify-center ${turbo ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_#f97316]' : 'bg-white/5 border-white/10 text-gray-400'}`}
                >
                  <TurboIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Spin Button */}
          <div className="relative mb-1 sm:mb-2 mr-1 sm:mr-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={spin}
              disabled={isProcessing}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full spin-button-outer flex items-center justify-center border-4 border-black/50 relative z-10"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 flex items-center justify-center shadow-inner">
                <RotateCcw className={`w-8 h-8 sm:w-10 sm:h-10 text-black font-black ${isSpinning ? 'animate-spin' : ''}`} />
              </div>
            </motion.button>
            {/* Spin Glow */}
            <div className="absolute inset-0 bg-yellow-500/30 blur-2xl rounded-full -z-10 animate-pulse"></div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex justify-between items-center px-4 text-[9px] font-bold text-gray-500">
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-xs tracking-tight flex items-center gap-2">
              Balance <span className="text-white font-black">{CURRENCY}{balance.toFixed(2)}</span>
              <button 
                className="text-[8px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded border border-white/10 transition-colors uppercase"
              >
                Refill
              </button>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TurboIcon className="w-3 h-3 text-emerald-500" />
            <span className="opacity-40">v_0.137_0455</span>
          </div>
        </div>
      </div>

      {/* Big Win Modal */}
      <AnimatePresence>
        {showBigWin && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-gradient-to-b from-yellow-400 via-orange-500 to-red-600 p-1 rounded-3xl big-win-glow">
              <div className="bg-black/90 px-16 py-12 rounded-[22px] text-center border border-white/10">
                <motion.h2 
                  animate={{ scale: [1, 1.2, 1], rotate: [-2, 2, -2] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-400 to-yellow-600 italic tracking-tighter drop-shadow-2xl"
                >
                  BIG WIN!
                </motion.h2>
                <div className="mt-6 flex flex-col items-center">
                  <p className="text-sm font-black text-yellow-500 uppercase tracking-[0.3em] mb-2">Total Win</p>
                  <p className="text-5xl font-display font-black text-white drop-shadow-lg">
                    {CURRENCY}{winAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Free Spin Celebration Modal */}
      <AnimatePresence>
        {showFreeSpinCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 100 }}
              className="relative flex flex-col items-center text-center p-10"
            >
              <div className="absolute -inset-20 bg-yellow-500/20 blur-[100px] rounded-full animate-pulse pointer-events-none" />
              
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-32 h-32 mb-6"
              >
                <img 
                  src={SYMBOLS.find(s => s.isScatter)?.url} 
                  alt="Scatter" 
                  className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]"
                />
              </motion.div>

              <h2 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-2xl mb-2">
                FREE GAME!
              </h2>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px w-12 bg-yellow-500/50" />
                <span className="text-white font-bold tracking-[0.3em] uppercase text-sm">
                  {showFreeSpinCelebration.scatters} SCATTERS FOUND
                </span>
                <div className="h-px w-12 bg-yellow-500/50" />
              </div>

              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                >
                  {showFreeSpinCelebration.spins}
                </motion.div>
                <p className="text-yellow-500 font-black text-xl tracking-widest mt-2">FREE SPINS</p>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("START clicked");
                  setShowFreeSpinCelebration(null);
                  setIsProcessing(false);
                  isProcessingRef.current = false;
                }}
                className="relative z-10 mt-12 px-20 py-6 bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-600 rounded-full text-black font-black text-3xl tracking-widest shadow-[0_10px_40px_rgba(255,215,0,0.6)] cursor-pointer border-4 border-yellow-100/50 hover:brightness-110 transition-all active:scale-95"
              >
                START
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy Bonus Modal */}
      <AnimatePresence>
        {isBuyBonusModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setIsBuyBonusModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-gradient-to-b from-gray-900 to-black border-2 border-yellow-500/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(234,179,8,0.3)] overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
              
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white italic tracking-tighter">BUY BONUS</h2>
                <button 
                  onClick={() => setIsBuyBonusModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="grid gap-4">
                {[
                  { count: 3, spins: 10, mult: 30 },
                  { count: 4, spins: 12, mult: 60 },
                  { count: 5, spins: 15, mult: 100 }
                ].map((option) => (
                  <button
                    key={option.count}
                    onClick={() => balance >= bet * option.mult && buyBonus(option.count)}
                    disabled={balance < bet * option.mult}
                    className={`relative p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                      balance >= bet * option.mult 
                        ? 'bg-white/5 border-yellow-500/30 hover:border-yellow-500 hover:bg-white/10' 
                        : 'bg-black/40 border-white/5 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center border border-yellow-500/30 group-hover:scale-110 transition-transform">
                        <img 
                          src={SYMBOLS.find(s => s.isScatter)?.url} 
                          alt="Scatter" 
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-black text-lg leading-none">{option.spins} FREE SPINS</p>
                        <p className="text-yellow-500/70 text-[10px] font-bold uppercase tracking-widest mt-1">
                          {option.count} SCATTERS GUARANTEED
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-black text-xl">{CURRENCY}{(bet * option.mult).toFixed(0)}</p>
                      <p className="text-gray-500 text-[9px] font-bold uppercase tracking-tighter">Purchase</p>
                    </div>

                    {balance >= bet * option.mult && (
                      <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                ))}
              </div>

              <p className="mt-6 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Current Bet: <span className="text-white">{CURRENCY}{bet}</span>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isBetModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsBetModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border-2 border-yellow-500 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_50px_rgba(234,179,8,0.3)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-yellow-500 italic uppercase tracking-tighter">Select Bet</h3>
                <button 
                  onClick={() => setIsBetModalOpen(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {BETS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setBet(amount);
                      setIsBetModalOpen(false);
                    }}
                    className={`py-3 rounded-xl font-bold transition-all border-2 ${
                      bet === amount 
                        ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-yellow-500/50 hover:text-white'
                    }`}
                  >
                    ৳{amount < 1 ? amount.toFixed(2) : amount}
                  </button>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Current Balance</span>
                <span className="text-white font-black">৳{balance.toLocaleString()}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Free Spin Result Modal */}
      <AnimatePresence>
        {showFreeSpinResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center text-center p-12 bg-gradient-to-b from-yellow-900/20 to-black rounded-[40px] border border-yellow-500/20 shadow-[0_0_100px_rgba(234,179,8,0.2)]"
            >
              <h2 className="text-4xl font-black text-yellow-500 uppercase tracking-[0.2em] mb-8">Total Free Game Win</h2>
              
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                transition={{ 
                  delay: 0.5, 
                  duration: 0.8, 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 15 
                }}
                className="text-8xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] mb-12 flex items-center justify-center gap-2"
              >
                <span className="text-yellow-500">{CURRENCY}</span>
                <CountUp end={totalFreeSpinWin} />
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCollectFreeSpinWin}
                className="px-16 py-4 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full text-black font-black text-xl tracking-widest shadow-[0_0_30px_rgba(255,215,0,0.4)]"
              >
                COLLECT
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
