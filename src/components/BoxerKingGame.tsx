/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Info, 
  Volume2, 
  VolumeX, 
  Zap, 
  RotateCcw, 
  ChevronUp, 
  ArrowLeft,
  Trophy,
  Crown,
  Sparkles,
  Award,
  X,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import confetti from 'canvas-confetti';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { UserData } from '../types';
import { toBengaliNumber } from '../utils';
import { haptics } from '../utils/haptics';
import { evaluateServerWinRoll } from '../services/gameProbabilityService';
import { formatBDT } from '../config/currency';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants & Types ---

interface SymbolType {
  id: string;
  name: string;
  img: string;
  value: number;
  isWild?: boolean;
  isScatter?: boolean;
}

const SYMBOLS: SymbolType[] = [
  { id: 'king_card', name: 'BOXER KING', img: 'https://allslotsonline.casino/en/images/jili-games/boxing-king/symbols/icon-1071645790.webp', value: 50 },
  { id: 'wild', name: 'CHAMP WILD', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-05.png', value: 50, isWild: true },
  { id: 'glove_card', name: 'GLOVE SCATTER', img: 'https://allslotsonline.casino/en/images/jili-games/boxing-king/symbols/icon-1159747390.webp', value: 30, isScatter: true },
  { id: 'strike', name: 'KO STRIKE', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-04.png', value: 20 },
  { id: 'bell', name: 'ROUND BELL', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-07.png', value: 12 },
  { id: 'q', name: 'QUEEN', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-11.png', value: 6 },
  { id: 'j', name: 'JACK', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-12.png', value: 4 },
];

const PAYLINES = [
  { id: 1, name: 'Center Row', cells: [[0,1], [1,1], [2,1], [3,1], [4,1]] },
  { id: 2, name: 'Top Row', cells: [[0,0], [1,0], [2,0], [3,0], [4,0]] },
  { id: 3, name: 'Bottom Row', cells: [[0,2], [1,2], [2,2], [3,2], [4,2]] },
  { id: 4, name: 'V-Shape', cells: [[0,0], [1,1], [2,2], [3,1], [4,0]] },
  { id: 5, name: 'Inverted-V', cells: [[0,2], [1,1], [2,0], [3,1], [4,2]] }
];

const BET_VALUES = [10, 20, 50, 100, 200, 500, 1000, 2000];
const REEL_COUNT = 5;
const ROW_COUNT = 3;

// --- Sound Effects Manager ---
const playSound = (type: 'spin' | 'win' | 'bigWin' | 'punch' | 'pop', enabled: boolean) => {
  if (!enabled) return;
  const sounds = {
    spin: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
    win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    bigWin: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
    punch: 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3',
    pop: 'https://assets.mixkit.co/active_storage/sfx/2011/2011-preview.mp3'
  };
  const audio = new Audio(sounds[type]);
  audio.volume = 0.35;
  audio.play().catch(() => {}); 
};

interface ReelProps {
  isSpinning: boolean;
  targetSymbols: SymbolType[];
  isTurbo: boolean;
  onStop: () => void;
  colIndex: number;
  winningCells: boolean[];
  key?: React.Key;
}

const Reel = ({ 
  isSpinning, 
  targetSymbols, 
  isTurbo, 
  onStop, 
  colIndex,
  winningCells
}: ReelProps) => {
  const [offset, setOffset] = useState(0);
  const [displaySymbols, setDisplaySymbols] = useState<SymbolType[]>([]);
  const animationRef = useRef<any>(null);
  const symbolHeight = 64;
  
  useEffect(() => {
    const initial = Array(ROW_COUNT).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    setDisplaySymbols(initial);
  }, []);

  useEffect(() => {
    if (isSpinning) {
      const spinSpeed = isTurbo ? 50 : 35;
      const poolSize = 30;
      const pool = Array(poolSize).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      setDisplaySymbols(pool);
      
      const startSpinOffset = -((poolSize - ROW_COUNT) * symbolHeight);
      setOffset(startSpinOffset);

      const animateSpin = () => {
        setOffset(prev => {
          const next = prev + spinSpeed;
          if (next >= 0) {
            return startSpinOffset;
          }
          return next;
        });
        animationRef.current = requestAnimationFrame(animateSpin);
      };

      animationRef.current = requestAnimationFrame(animateSpin);

      // Simultaneous Reel Stop: all reels stop at the exact same coordinated timestamp
      const stopTimer = setTimeout(() => {
        cancelAnimationFrame(animationRef.current);
        
        const paddingCount = 12;
        const padding = Array(paddingCount).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
        const finalStrip = [...targetSymbols, ...padding];
        setDisplaySymbols(finalStrip);
        
        const initialStopOffset = -(paddingCount * symbolHeight);
        const overshoot = symbolHeight * 0.25;
        const startPos = initialStopOffset - overshoot;
        
        let start: number | null = null;
        const duration = isTurbo ? 260 : 480;

        const animateStop = (timestamp: number) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentOffset = startPos * (1 - easeOut);
          
          setOffset(currentOffset);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animateStop);
          } else {
            setOffset(0);
            setDisplaySymbols(targetSymbols);
            onStop();
          }
        };

        animationRef.current = requestAnimationFrame(animateStop);
      }, isTurbo ? 300 : 600);

      return () => {
        cancelAnimationFrame(animationRef.current);
        clearTimeout(stopTimer);
      };
    }
  }, [isSpinning, targetSymbols, isTurbo, colIndex, onStop]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950/70 border-r border-zinc-800/80 last:border-r-0">
      <div 
        className="flex flex-col"
        style={{ transform: `translateY(${offset}px)` }}
      >
        {displaySymbols.map((symbol, i) => (
          <div key={i} className="h-16 w-full shrink-0">
            <SymbolIcon 
              symbol={symbol} 
              isWinning={!isSpinning && displaySymbols.length === ROW_COUNT && winningCells[i]} 
            />
          </div>
        ))}
      </div>
      
      {isSpinning && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none z-20" />
      )}
      
      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none z-10" />
    </div>
  );
};

// High-Fidelity Symbol Icon with Guaranteed Vector Fallback
const SymbolIcon = ({ symbol, isWinning }: { symbol: SymbolType; isWinning?: boolean }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={cn(
      "h-16 w-full flex items-center justify-center relative border border-white/5 transition-all duration-300 p-0.5",
      symbol.isScatter ? "bg-purple-950/30" : "bg-zinc-900/60",
      isWinning && "scale-105 z-10 border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
    )}>
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
        {/* Vector Fallbacks if image fails or while loading */}
        {imgError ? (
          <div className="flex flex-col items-center justify-center text-center p-1 w-full h-full">
            {symbol.id === 'king_card' && (
              <div className="flex flex-col items-center">
                <Crown size={24} className="text-amber-400 animate-pulse" />
                <span className="text-[9px] font-black font-chakra text-amber-300">KING</span>
              </div>
            )}
            {symbol.id === 'glove_card' && (
              <div className="flex flex-col items-center">
                <Flame size={24} className="text-rose-500" />
                <span className="text-[9px] font-black font-chakra text-rose-300">GLOVE</span>
              </div>
            )}
            {symbol.id === 'strike' && (
              <div className="flex flex-col items-center">
                <Zap size={24} className="text-blue-400" />
                <span className="text-[9px] font-black font-chakra text-blue-300">STRIKE</span>
              </div>
            )}
            {symbol.id === 'wild' && (
              <div className="flex flex-col items-center bg-gradient-to-r from-amber-500 to-rose-500 px-2 py-1 rounded">
                <span className="text-xs font-black font-chakra text-white">WILD</span>
              </div>
            )}
            {symbol.id === 'bell' && (
              <div className="flex flex-col items-center">
                <Award size={24} className="text-yellow-400" />
                <span className="text-[9px] font-black font-chakra text-yellow-300">BELL</span>
              </div>
            )}
            {symbol.id === 'q' && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black font-chakra text-rose-400">Q</span>
              </div>
            )}
            {symbol.id === 'j' && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black font-chakra text-cyan-400">J</span>
              </div>
            )}
          </div>
        ) : (
          <img 
            src={symbol.img} 
            alt={symbol.name}
            onError={() => setImgError(true)}
            className={cn(
              "w-full h-full object-contain p-1 transform transition-transform duration-200",
              isWinning && "scale-115 filter drop-shadow-[0_0_12px_#fbbf24]"
            )}
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  );
};

interface BoxerKingGameProps {
  user: any;
  userData: UserData | null;
  onBack: () => void;
}

export default function BoxerKingGame({ user, userData, onBack }: BoxerKingGameProps) {
  const [balance, setBalance] = useState<number>(() => userData?.balance ?? 500);
  const [bet, setBet] = useState(50);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [freeSpins, setFreeSpins] = useState(0);
  const [isTurbo, setIsTurbo] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showBigWin, setShowBigWin] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [winBreakdown, setWinBreakdown] = useState<{ lineName: string; symName: string; matches: number; win: number }[]>([]);

  const [reels, setReels] = useState<SymbolType[][]>(Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(SYMBOLS[0])));
  const [targetReels, setTargetReels] = useState<SymbolType[][]>(Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(SYMBOLS[0])));
  const [reelSpinning, setReelSpinning] = useState<boolean[]>(Array(REEL_COUNT).fill(false));
  const [winningCells, setWinningCells] = useState<boolean[][]>(Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false)));

  const reelsStoppedCount = useRef(0);

  useEffect(() => {
    if (userData?.balance !== undefined) {
      setBalance(userData.balance);
    }
  }, [userData?.balance]);

  const handleSpin = useCallback(async () => {
    if (isSpinning) return;
    if (balance < bet && freeSpins === 0) {
      haptics.error();
      setShowInsufficientBalance(true);
      return;
    }

    haptics.medium();
    setIsSpinning(true);
    setWinAmount(0);
    setWinBreakdown([]);
    setComboMultiplier(1);
    playSound('spin', isSoundEnabled);

    // Balance deduction
    if (freeSpins === 0) {
      setBalance(prev => Math.max(0, prev - bet));
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(-bet),
          turnover: increment(bet)
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'users');
      }
    } else {
      setFreeSpins(prev => prev - 1);
    }

    setWinningCells(Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false)));

    // Weighted Symbol Spawner supporting all valid symbols
    const getWeightedSymbol = () => {
      const weights = [
        { id: 'king_card', weight: 8 },
        { id: 'wild', weight: 6 },
        { id: 'glove_card', weight: 5 },
        { id: 'strike', weight: 15 },
        { id: 'bell', weight: 18 },
        { id: 'q', weight: 24 },
        { id: 'j', weight: 24 },
      ];
      const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
      let rand = Math.random() * totalWeight;
      for (const w of weights) {
        if (rand < w.weight) {
          return SYMBOLS.find(s => s.id === w.id)!;
        }
        rand -= w.weight;
      }
      return SYMBOLS.find(s => s.id === 'j')!;
    };

    const newReels: SymbolType[][] = [];
    for (let c = 0; c < REEL_COUNT; c++) {
      newReels.push(Array(ROW_COUNT).fill(null).map(() => getWeightedSymbol()));
    }

    // Authoritative outcome check (Global Win Probability)
    const isWin = evaluateServerWinRoll();
    if (isWin) {
      // Connect matching symbols along a payline (e.g. Center Row)
      const eligibleWinSymbols = SYMBOLS.filter(s => !s.isScatter);
      const winSym = eligibleWinSymbols[Math.floor(Math.random() * eligibleWinSymbols.length)];
      const matchCount = Math.random() > 0.6 ? 5 : (Math.random() > 0.35 ? 4 : 3);
      for (let c = 0; c < matchCount; c++) {
        // Occasionally mix in a Wild on winning lines to verify Wild substitution
        const useWild = Math.random() < 0.25;
        newReels[c][1] = useWild ? SYMBOLS.find(s => s.isWild)! : winSym;
      }
    }

    setTargetReels(newReels);
    reelsStoppedCount.current = 0;
    setReelSpinning(Array(REEL_COUNT).fill(true));
  }, [isSpinning, balance, bet, freeSpins, isSoundEnabled, user.uid]);

  const handleReelStop = useCallback((colIndex: number) => {
    setReelSpinning(prev => {
      const next = [...prev];
      next[colIndex] = false;
      return next;
    });

    reelsStoppedCount.current += 1;
    if (reelsStoppedCount.current === REEL_COUNT) {
      // All reels stopped simultaneously -> evaluate authoritative wins
      setReels(targetReels);

      let totalWin = 0;
      const newWinningCells = Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false));
      const breakdownList: { lineName: string; symName: string; matches: number; win: number }[] = [];

      // 1. Evaluate All 5 Paylines with complete Wild substitution & Pure Wild payout
      for (const payline of PAYLINES) {
        const candidateSymbols = [
          SYMBOLS.find(s => s.isWild)!,
          ...SYMBOLS.filter(s => !s.isScatter && !s.isWild)
        ];

        let bestCandidateWin = 0;
        let bestCandidateName = '';
        let bestCandidateMatches = 0;
        let bestCandidateCells: number[][] = [];

        for (const candidate of candidateSymbols) {
          let matches = 0;
          const matchedCells: number[][] = [];

          for (let i = 0; i < payline.cells.length; i++) {
            const [c, r] = payline.cells[i];
            const sym = targetReels[c][r];

            if (candidate.isWild) {
              if (sym.isWild) {
                matches++;
                matchedCells.push([c, r]);
              } else {
                break;
              }
            } else {
              // Wild card substitutes for eligible regular candidate
              if (sym.id === candidate.id || sym.isWild) {
                matches++;
                matchedCells.push([c, r]);
              } else {
                break;
              }
            }
          }

          if (matches >= 3) {
            const mult = matches === 5 ? 6.0 : (matches === 4 ? 2.5 : 1.0);
            const lineWin = Math.round((bet / 5) * (candidate.value / 10) * mult);
            if (lineWin > bestCandidateWin) {
              bestCandidateWin = lineWin;
              bestCandidateName = candidate.name;
              bestCandidateMatches = matches;
              bestCandidateCells = matchedCells;
            }
          }
        }

        if (bestCandidateWin > 0) {
          totalWin += bestCandidateWin;
          bestCandidateCells.forEach(([c, r]) => {
            newWinningCells[c][r] = true;
          });
          breakdownList.push({
            lineName: payline.name,
            symName: bestCandidateName,
            matches: bestCandidateMatches,
            win: bestCandidateWin
          });
        }
      }

      // 2. Evaluate Dedicated Glove Scatters (Free Spins Trigger)
      let scatterCount = 0;
      for (let c = 0; c < REEL_COUNT; c++) {
        for (let r = 0; r < ROW_COUNT; r++) {
          if (targetReels[c][r].isScatter) {
            scatterCount++;
            newWinningCells[c][r] = true;
          }
        }
      }

      if (scatterCount >= 3) {
        const bonusSpins = scatterCount === 3 ? 5 : (scatterCount === 4 ? 10 : 15);
        setFreeSpins(prev => prev + bonusSpins);
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.5 } });
      }

      // Apply combo strike multiplier
      if (totalWin > 0) {
        totalWin = Math.round(totalWin * comboMultiplier);
      }

      setWinningCells(newWinningCells);
      setWinBreakdown(breakdownList);

      if (totalWin > 0) {
        haptics.win();
        playSound('win', isSoundEnabled);
        setWinAmount(totalWin);
        setComboMultiplier(prev => Math.min(5, prev + 1));
        setBalance(prev => prev + totalWin);

        if (totalWin >= bet * 5) {
          setShowBigWin(true);
          playSound('bigWin', isSoundEnabled);
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }

        updateDoc(doc(db, 'users', user.uid), {
          balance: increment(totalWin)
        }).catch(() => {});

        addDoc(collection(db, 'bets'), {
          uid: user.uid,
          gameName: 'TK333 Boxer King',
          amount: bet,
          profit: totalWin - bet,
          status: 'win',
          createdAt: serverTimestamp()
        }).catch(() => {});
      } else {
        setComboMultiplier(1);
        if (freeSpins === 0) {
          addDoc(collection(db, 'bets'), {
            uid: user.uid,
            gameName: 'TK333 Boxer King',
            amount: bet,
            profit: -bet,
            status: 'loss',
            createdAt: serverTimestamp()
          }).catch(() => {});
        }
      }

      setIsSpinning(false);
    }
  }, [targetReels, bet, comboMultiplier, freeSpins, isSoundEnabled, user.uid]);

  // Auto spin handler
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAuto && !isSpinning && (balance >= bet || freeSpins > 0)) {
      timer = setTimeout(handleSpin, 800);
    }
    return () => clearTimeout(timer);
  }, [isAuto, isSpinning, balance, bet, freeSpins, handleSpin]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#070b14] text-white font-sans flex flex-col max-w-4xl mx-auto border-x border-slate-800 select-none shadow-2xl overflow-hidden">
      {/* 1. Header Bar */}
      <header className="px-3 sm:px-6 py-2 bg-[#0b1120] border-b border-slate-800 flex items-center justify-between sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-chakra font-black active:scale-95 transition-all"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">EXIT</span>
          </button>

          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-rose-500/10 to-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-xl">
            <Flame size={15} className="text-rose-500 animate-bounce" />
            <span className="font-chakra font-black text-xs sm:text-sm tracking-wider bg-gradient-to-r from-amber-300 via-rose-400 to-amber-300 bg-clip-text text-transparent uppercase">
              TK333 BOXER KING
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-1.5 sm:p-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-slate-300 border border-slate-700 active:scale-95 transition-all"
          >
            {isSoundEnabled ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} className="text-rose-400" />}
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-slate-900 to-[#0e172a] px-3 py-1 sm:py-1.5 rounded-xl border border-emerald-500/40">
            <span className="text-[9px] sm:text-[10px] uppercase font-mono font-bold text-slate-400">Balance</span>
            <span className="font-rajdhani font-black text-emerald-400 text-sm sm:text-lg">
              {formatBDT(balance)}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Top Combo Multiplier Championship Bar (1x -> 2x -> 3x -> 5x) */}
      <div className="bg-[#090e1a] px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
        <span className="text-[9px] sm:text-[10px] font-chakra font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
          <Award size={13} className="text-amber-400" />
          COMBO MULTIPLIER:
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {[1, 2, 3, 5].map(m => (
            <span
              key={m}
              className={`px-3 py-0.5 rounded-full font-rajdhani font-black text-xs border transition-all ${
                comboMultiplier === m
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-black border-amber-300 shadow-[0_0_12px_#fbbf24] scale-110'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {m}X
            </span>
          ))}
        </div>
      </div>

      {/* 3. Slot Machine Reels Arena */}
      <div className="flex-1 p-1.5 sm:p-4 flex flex-col items-center justify-between min-h-0 overflow-hidden space-y-1.5 sm:space-y-3">
        {/* Championship Boxing Ring Frame */}
        <div className="w-full max-w-xl bg-gradient-to-b from-[#1e1124] via-[#0f0b18] to-[#08050e] p-1.5 sm:p-3 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.2)] relative">
          {/* Top Championship Belt Plaque & Free Spins Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30">
            <div className="bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 px-3 py-0.5 rounded-full border border-amber-200 text-black font-chakra font-black text-[9px] sm:text-[10px] tracking-widest uppercase shadow-md flex items-center gap-1">
              <Trophy size={11} />
              WBC WORLD TITLE REELS
            </div>
            {freeSpins > 0 && (
              <div className="bg-gradient-to-r from-rose-600 to-red-600 text-white px-2.5 py-0.5 rounded-full border border-rose-300 font-chakra font-black text-[9px] sm:text-[10px] tracking-wider uppercase shadow-[0_0_12px_#ef4444] animate-pulse flex items-center gap-1">
                <Flame size={11} />
                FREE: {freeSpins}
              </div>
            )}
          </div>

          {/* 5x3 Reels Grid */}
          <div 
            onClick={() => {
              if (!isSpinning && freeSpins === 0) {
                haptics.selection();
                handleSpin();
              }
            }}
            className="grid grid-cols-5 gap-1 bg-black rounded-xl sm:rounded-2xl overflow-hidden border border-zinc-800 p-0.5 sm:p-1 h-[155px] sm:h-[195px] cursor-pointer active:scale-[0.99] transition-transform select-none"
            title="Tap reels to spin"
          >
            {reels.map((_, colIndex) => (
              <Reel 
                key={colIndex}
                colIndex={colIndex}
                isSpinning={reelSpinning[colIndex]}
                targetSymbols={targetReels[colIndex]}
                isTurbo={isTurbo}
                onStop={() => handleReelStop(colIndex)}
                winningCells={winningCells[colIndex]}
              />
            ))}
          </div>
        </div>

        {/* Winning Lines Breakdown HUD Overlay */}
        <AnimatePresence>
          {winBreakdown.length > 0 && !isSpinning && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="w-full max-w-xl flex items-center justify-center gap-1 flex-wrap px-1"
            >
              {winBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/50 text-[10px] font-black text-amber-300 shadow-md backdrop-blur-sm"
                >
                  <Sparkles size={11} className="text-amber-400" />
                  <span className="text-white">{item.lineName}:</span>
                  <span>{item.matches}x {item.symName}</span>
                  <span className="text-emerald-400 font-mono">+{formatBDT(item.win)}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win Telemetry Bar */}
        <div className="w-full max-w-xl bg-slate-900/90 rounded-xl sm:rounded-2xl border border-slate-800 px-3 py-1.5 sm:py-2 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-chakra font-black text-slate-400 uppercase block leading-tight">Active Bet</span>
            <span className="font-rajdhani font-black text-white text-base sm:text-lg leading-tight">৳{bet}</span>
          </div>

          <div className="text-center">
            {winAmount > 0 ? (
              <div className="animate-pulse">
                <span className="text-[9px] font-chakra font-black text-emerald-400 uppercase block leading-tight">KO VICTORY WIN</span>
                <span className="font-rajdhani font-black text-emerald-300 text-lg sm:text-2xl leading-tight">+{formatBDT(winAmount)}</span>
              </div>
            ) : (
              <div>
                <span className="text-[9px] font-chakra font-black text-slate-500 uppercase block leading-tight">Ready for KO</span>
                <span className="text-[10px] sm:text-xs font-mono text-slate-400">5 Reels • 243 Ways</span>
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="text-[9px] font-chakra font-black text-slate-400 uppercase block leading-tight">Free Spins</span>
            <span className="font-rajdhani font-black text-amber-400 text-base sm:text-lg leading-tight">{freeSpins}</span>
          </div>
        </div>

        {/* 4. Betting Panel & Spin Controls */}
        <div className="w-full max-w-xl bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-slate-800 p-2 sm:p-3.5 space-y-2 sm:space-y-3 shadow-xl shrink-0">
          {/* Quick Bet Chips */}
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-0.5">
              <span className="text-[9px] sm:text-[10px] font-chakra font-black text-slate-400 uppercase tracking-wider block">
                QUICK BET SELECTION:
              </span>
              <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-emerald-500/40">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Balance:</span>
                <span className="font-rajdhani font-black text-emerald-400 text-xs sm:text-sm">৳{balance.toLocaleString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
              {BET_VALUES.map(val => (
                <button
                  key={val}
                  disabled={isSpinning}
                  onClick={() => {
                    haptics.selection();
                    setBet(val);
                  }}
                  className={`py-1 rounded-lg font-rajdhani font-black text-[11px] sm:text-xs border transition-all ${
                    bet === val
                      ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_8px_#fbbf24] scale-105'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  ৳{val}
                </button>
              ))}
            </div>
          </div>

          {/* Action Row: Turbo, Spin, Auto */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
            {/* Turbo Toggle */}
            <button
              onClick={() => {
                haptics.selection();
                setIsTurbo(!isTurbo);
              }}
              className={`p-2 sm:p-2.5 rounded-xl border flex items-center gap-1 transition-all ${
                isTurbo
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Zap size={16} className={isTurbo ? 'fill-amber-400 text-amber-400' : ''} />
              <span className="text-[10px] sm:text-xs font-chakra font-black uppercase hidden sm:inline">TURBO</span>
            </button>

            {/* Huge Primary Spin Button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSpin}
              disabled={isSpinning}
              className={`flex-1 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-chakra font-black text-sm sm:text-base uppercase tracking-wider shadow-2xl flex items-center justify-center gap-2 transition-all min-h-[48px] sm:min-h-[54px] ${
                isSpinning
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-[0_0_25px_rgba(225,29,72,0.5)] cursor-pointer active:scale-98'
              }`}
            >
              {isSpinning ? (
                <div className="flex items-center gap-2">
                  <RotateCcw size={18} className="animate-spin" />
                  <span>SPINNING...</span>
                </div>
              ) : (
                <span>SPIN NOW (৳{bet})</span>
              )}
            </motion.button>

            {/* Auto Spin Toggle */}
            <button
              onClick={() => {
                haptics.selection();
                setIsAuto(!isAuto);
              }}
              className={`p-2 sm:p-2.5 rounded-xl border flex items-center gap-1 transition-all ${
                isAuto
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <RotateCcw size={16} className={isAuto ? 'animate-spin text-emerald-400' : ''} />
              <span className="text-[10px] sm:text-xs font-chakra font-black uppercase hidden sm:inline">AUTO</span>
            </button>
          </div>
        </div>
      </div>

      {/* Paytable Modal */}
      <AnimatePresence>
        {showPaytable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f172a] border border-amber-500/50 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="text-amber-400" size={20} />
                  <h3 className="font-chakra font-black text-sm uppercase text-white">
                    BOXER KING PAYTABLE
                  </h3>
                </div>
                <button
                  onClick={() => setShowPaytable(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {SYMBOLS.map(sym => (
                  <div key={sym.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-chakra font-black text-amber-300">{sym.name}</span>
                    <span className="font-mono text-slate-300">
                      {sym.isWild ? 'Wild (Replaces Any)' : `${sym.value}x Multiplier`}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowPaytable(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-chakra font-black text-xs uppercase"
              >
                CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Insufficient Balance Modal */}
      <AnimatePresence>
        {showInsufficientBalance && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f172a] border-2 border-amber-500/70 rounded-2xl p-5 max-w-xs w-full text-center space-y-3.5 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="font-chakra font-black text-white text-base">পর্যাপ্ত ব্যালেন্স নেই</h4>
                <p className="text-xs text-slate-400 mt-1">স্পিন করার জন্য ন্যূনতম ৳{bet} প্রয়োজন। আপনার বর্তমান ব্যালেন্স ৳{balance.toLocaleString()}।</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setShowInsufficientBalance(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-chakra font-bold transition-colors cursor-pointer"
                >
                  বন্ধ করুন
                </button>
                <button
                  onClick={() => {
                    setShowInsufficientBalance(false);
                    onBack();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xs font-chakra font-black shadow-md hover:from-emerald-500 hover:to-emerald-600 transition-colors cursor-pointer"
                >
                  ডিপোজিট করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
