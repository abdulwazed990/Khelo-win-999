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
  ChevronRight, 
  ChevronLeft, 
  Trophy,
  ChevronUp,
  ArrowLeft
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import confetti from 'canvas-confetti';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { UserData } from '../types';
import { toBengaliNumber, formatBengaliCurrency } from '../utils';
import { haptics } from '../utils/haptics';
import { evaluateServerWinRoll } from '../services/gameProbabilityService';

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
  { id: 'king_card', name: 'KING', img: 'https://allslotsonline.casino/en/images/jili-games/boxing-king/symbols/icon-1071645790.webp', value: 50, isScatter: true },
  { id: 'glove_card', name: 'GLOVE', img: 'https://allslotsonline.casino/en/images/jili-games/boxing-king/symbols/icon-1159747390.webp', value: 30, isScatter: true },
  { id: 'strike', name: 'STRIKE', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-04.png', value: 15 },
  { id: 'wild', name: 'WILD', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-05.png', value: 0, isWild: true },
  { id: 'bell', name: 'BELL', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-07.png', value: 10 },
  { id: 'q', name: 'Q', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-11.png', value: 5 },
  { id: 'j', name: 'J', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-12.png', value: 2 },
];

const BET_VALUES = [10, 20, 50, 100, 200, 500, 1000, 2000];
const REEL_COUNT = 5;
const ROW_COUNT = 3;

// --- Components ---

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
  audio.volume = 0.3;
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
  const symbolHeight = 64; // h-16 = 64px
  
  // Initialize with random symbols
  useEffect(() => {
    const initial = Array(ROW_COUNT).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    setDisplaySymbols(initial);
  }, []);

  useEffect(() => {
    if (isSpinning) {
      // Start spinning (Top to Bottom)
      const spinSpeed = isTurbo ? 50 : 35;
      const staggerDelay = colIndex * (isTurbo ? 80 : 150);
      const minSpinTime = (isTurbo ? 400 : 1000) + staggerDelay;

      // Create a very long list for seamless infinite spinning
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

      const stopTimer = setTimeout(() => {
        cancelAnimationFrame(animationRef.current);
        
        const paddingCount = 15;
        const padding = Array(paddingCount).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
        const finalStrip = [...targetSymbols, ...padding];
        setDisplaySymbols(finalStrip);
        
        const initialStopOffset = -(paddingCount * symbolHeight);
        const overshoot = symbolHeight * 0.3;
        const startPos = initialStopOffset - overshoot;
        
        let start: number | null = null;
        const duration = isTurbo ? 350 : 700;

        const animateStop = (timestamp: number) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          
          const easeOut = 1 - Math.pow(1 - progress, 4);
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
      }, minSpinTime);

      return () => {
        cancelAnimationFrame(animationRef.current);
        clearTimeout(stopTimer);
      };
    }
  }, [isSpinning, targetSymbols, isTurbo]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950/60">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-transparent to-black/90 pointer-events-none z-20" />
      )}
      
      <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,1)] pointer-events-none z-10" />
    </div>
  );
};

const SymbolIcon = ({ symbol, isWinning }: { symbol: SymbolType; isWinning?: boolean }) => (
  <div className={cn(
    "h-16 w-full flex items-center justify-center relative border border-white/5 rounded-sm overflow-hidden transition-all duration-300",
    symbol.isScatter ? "bg-purple-500/10" : "bg-zinc-900",
    isWinning && "scale-110 z-10 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
  )}>
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden group bg-zinc-900/30 rounded-lg">
      <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] pointer-events-none" />
      
      {symbol.isWild && (
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-400 to-orange-600 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}
      {symbol.isScatter && (
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500 to-pink-600 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}
      {symbol.id === 'strike' && (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500 to-blue-800 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}
      {symbol.id === 'glove_card' && (
        <div className="absolute inset-0 bg-gradient-to-b from-red-500 to-red-800 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}
      {symbol.id === 'king_card' && (
        <div className="absolute inset-0 bg-gradient-to-b from-red-600 to-orange-600 opacity-5 blur-xl group-hover:opacity-10 transition-opacity" />
      )}

      <div className="relative z-10 w-full h-full p-1 flex items-center justify-center">
        <img 
          src={symbol.img} 
          alt={symbol.name}
          className={cn(
            "w-full h-full object-contain transition-transform duration-300 group-hover:scale-110",
            (symbol.isWild || symbol.isScatter) && "animate-pulse"
          )}
          style={{ mixBlendMode: 'multiply', filter: 'contrast(1.2) brightness(1.1)' }}
          referrerPolicy="no-referrer"
        />
      </div>
      
      <div className="absolute bottom-0.5 right-1 text-[6px] font-bold text-white/20 uppercase italic tracking-widest">
        {symbol.name}
      </div>

      {isWinning && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.1, 1],
            borderColor: ['#eab308', '#facc15', '#eab308']
          }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="absolute inset-0 border-4 border-yellow-500 rounded-lg pointer-events-none z-30"
        />
      )}
    </div>
  </div>
);

interface BoxerKingGameProps {
  user: any;
  userData: UserData | null;
  onBack: () => void;
}

export default function BoxerKingGame({ user, userData, onBack }: BoxerKingGameProps) {
  const [balance, setBalance] = useState(userData?.balance || 0);
  const [bet, setBet] = useState(10);
  const [winAmount, setWinAmount] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);
  const [reels, setReels] = useState<SymbolType[][]>(
    Array(REEL_COUNT).fill(null).map(() => 
      Array(ROW_COUNT).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    )
  );
  const [winningCells, setWinningCells] = useState<boolean[][]>(
    Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false))
  );

  const [isTurbo, setIsTurbo] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [freeSpins, setFreeSpins] = useState(0);
  const [showFreeSpinIntro, setShowFreeSpinIntro] = useState(false);
  const [awardedSpinsCount, setAwardedSpinsCount] = useState(0);
  const [showBetMenu, setShowBetMenu] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [reelSpinning, setReelSpinning] = useState<boolean[]>(Array(REEL_COUNT).fill(false));
  const [targetReels, setTargetReels] = useState<SymbolType[][]>(reels);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const reelsStoppedCount = useRef(0);

  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgMusicRef.current = new Audio("https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3");
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.1;

    const playMusic = () => {
      if (isSoundEnabled && bgMusicRef.current) {
        bgMusicRef.current.play().catch(() => {});
      }
      window.removeEventListener('click', playMusic);
      window.removeEventListener('touchstart', playMusic);
    };

    window.addEventListener('click', playMusic);
    window.addEventListener('touchstart', playMusic);

    return () => {
      bgMusicRef.current?.pause();
      window.removeEventListener('click', playMusic);
      window.removeEventListener('touchstart', playMusic);
    };
  }, []);

  useEffect(() => {
    if (bgMusicRef.current) {
      if (isSoundEnabled) {
        bgMusicRef.current.play().catch(() => {});
      } else {
        bgMusicRef.current.pause();
      }
    }
  }, [isSoundEnabled]);

  // Rarity Counters
  const [kingSpinCount, setKingSpinCount] = useState(0);
  const [gloveSpinCount, setGloveSpinCount] = useState(0);
  const [kingThreshold] = useState(() => Math.floor(Math.random() * 6) + 25);
  const [gloveThreshold] = useState(() => Math.floor(Math.random() * 6) + 25);

  // Sync balance with userData
  useEffect(() => {
    if (userData) {
      setBalance(userData.balance);
    }
  }, [userData]);

  const handleSpin = useCallback(async () => {
    if (isSpinning || (balance < bet && freeSpins === 0)) return;
    setShowBetMenu(false);

    haptics.medium();
    setIsSpinning(true);
    setReelSpinning(Array(REEL_COUNT).fill(true));
    setShowBigWin(false);
    setWinAmount(0);
    playSound('spin', isSoundEnabled);
    
    // Deduct bet from Firestore
    if (freeSpins === 0) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(-bet),
          turnover: increment(bet)
        });
        setKingSpinCount(prev => prev + 1);
        setGloveSpinCount(prev => prev + 1);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'users');
        setIsSpinning(false);
        setReelSpinning(Array(REEL_COUNT).fill(false));
        return;
      }
    } else {
      setFreeSpins(prev => prev - 1);
    }

    setWinningCells(Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false)));

    // Outcome Generation based on centralized Global Win Probability (Fixed 5%)
    const isWin = evaluateServerWinRoll();
    let outcomeType: 'none' | 'small' | 'medium' | 'big' = 'none';
    
    if (isWin) {
      const tierRoll = Math.random();
      if (tierRoll < 0.15) outcomeType = 'big';
      else if (tierRoll < 0.45) outcomeType = 'medium';
      else outcomeType = 'small';
    } else {
      outcomeType = 'none';
    }

    const canTriggerKing = kingSpinCount >= kingThreshold || Math.random() < 0.005;
    const canTriggerGlove = gloveSpinCount >= gloveThreshold || Math.random() < 0.004;
    
    let kingCardsPlaced = 0;
    let gloveCardsPlaced = 0;

    const newReels: SymbolType[][] = [];
    const getStandardSymbol = () => {
      const standardSymbols = SYMBOLS.filter(s => s.id !== 'king_card' && s.id !== 'glove_card' && !s.isWild);
      return standardSymbols[Math.floor(Math.random() * standardSymbols.length)];
    };

    for (let c = 0; c < REEL_COUNT; c++) {
      newReels.push(Array(ROW_COUNT).fill(null).map(() => getStandardSymbol()));
    }

    if (outcomeType !== 'none') {
      const winRowCount = outcomeType === 'big' ? 3 : outcomeType === 'medium' ? 2 : 1;
      const winSymbolCount = outcomeType === 'big' ? 5 : outcomeType === 'medium' ? 4 : 3;
      
      const rowsToWin = Array.from({ length: ROW_COUNT }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, winRowCount);

      rowsToWin.forEach(rowIdx => {
        const winSym = getStandardSymbol();
        for (let c = 0; c < winSymbolCount; c++) {
          newReels[c][rowIdx] = winSym;
        }
      });
    } else {
      for (let r = 0; r < ROW_COUNT; r++) {
        if (newReels[0][r].id === newReels[1][r].id && newReels[1][r].id === newReels[2][r].id) {
          const currentId = newReels[1][r].id;
          newReels[2][r] = SYMBOLS.find(s => s.id !== currentId && s.id !== 'king_card' && s.id !== 'glove_card' && !s.isWild)!;
        }
      }
    }

    for (let c = 0; c < REEL_COUNT; c++) {
      for (let r = 0; r < ROW_COUNT; r++) {
        const rand = Math.random();
        if (canTriggerKing && kingCardsPlaced < 3 && rand < 0.01) {
          newReels[c][r] = SYMBOLS.find(s => s.id === 'king_card')!;
          kingCardsPlaced++;
        } else if (canTriggerGlove && gloveCardsPlaced < 5 && rand < 0.008) {
          newReels[c][r] = SYMBOLS.find(s => s.id === 'glove_card')!;
          gloveCardsPlaced++;
        } else if (rand < 0.01) {
          newReels[c][r] = SYMBOLS.find(s => s.isWild)!;
        }
      }
    }

    setTargetReels(newReels);
    reelsStoppedCount.current = 0;
    setReelSpinning(Array(REEL_COUNT).fill(true));
  }, [isSpinning, balance, bet, freeSpins, kingSpinCount, gloveSpinCount, kingThreshold, gloveThreshold, isTurbo, isSoundEnabled, user.uid]);

  const handleReelStop = useCallback((colIndex: number) => {
    setReelSpinning(prev => {
      const next = [...prev];
      next[colIndex] = false;
      return next;
    });
    
    reelsStoppedCount.current += 1;
    if (reelsStoppedCount.current === REEL_COUNT) {
      finalizeSpin(targetReels);
    }
  }, [targetReels]);

  const finalizeSpin = async (newReels: SymbolType[][]) => {
    setReels(newReels);

    let totalWin = 0;
    const newWinningCells = Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false));
    let hasWin = false;
    
    for (let r = 0; r < ROW_COUNT; r++) {
      const firstSymbol = newReels[0][r];
      if (firstSymbol.id === 'king_card' || firstSymbol.id === 'glove_card') continue;

      let count = 1;
      for (let c = 1; c < REEL_COUNT; c++) {
        if (newReels[c][r].id === firstSymbol.id || newReels[c][r].isWild || firstSymbol.isWild) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 3) {
        const winValue = (firstSymbol.isWild ? SYMBOLS[0].value : firstSymbol.value) * count * (bet / 10);
        totalWin += winValue;
        hasWin = true;
        for (let c = 0; c < count; c++) {
          newWinningCells[c][r] = true;
        }
      }
    }

    let kingCount = 0;
    let gloveCount = 0;
    newReels.flat().forEach(s => {
      if (s.id === 'king_card') kingCount++;
      if (s.id === 'glove_card') gloveCount++;
    });

    let awardedFreeSpins = 0;
    if (kingCount > 0) {
      if (kingCount === 1) awardedFreeSpins += 2;
      else if (kingCount === 2) awardedFreeSpins += 3;
      else if (kingCount >= 3) awardedFreeSpins += 7;
      setKingSpinCount(0);
    }

    if (gloveCount >= 3) {
      if (gloveCount === 3) awardedFreeSpins += 12;
      else if (gloveCount === 4) awardedFreeSpins += 15;
      else if (gloveCount >= 5) awardedFreeSpins += 20;
      setGloveSpinCount(0);
    }

    // Log bet to Firestore
    try {
      await addDoc(collection(db, 'bets'), {
        uid: user.uid,
        gameName: 'Boxer King 1.0',
        amount: freeSpins > 0 ? 0 : bet,
        profit: totalWin - (freeSpins > 0 ? 0 : bet),
        status: totalWin > 0 ? 'win' : 'loss',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error logging bet:', err);
    }

    if (hasWin || awardedFreeSpins > 0) {
      setIsHighlighting(true);
      setWinningCells(newWinningCells);
      playSound('win', isSoundEnabled);
      if (totalWin >= bet * 5 || awardedFreeSpins > 0) {
        haptics.win();
      } else {
        haptics.light();
      }

      setTimeout(async () => {
        setIsHighlighting(false);
        
        if (awardedFreeSpins > 0) {
          setAwardedSpinsCount(awardedFreeSpins);
          setFreeSpins(prev => prev + awardedFreeSpins);
          setShowFreeSpinIntro(true);
          setTimeout(() => setShowFreeSpinIntro(false), 3000);
        }

        if (totalWin > 0) {
          setWinAmount(totalWin);
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              balance: increment(totalWin)
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, 'users');
          }
          
          if (totalWin >= bet * 10) {
            setShowBigWin(true);
            playSound('bigWin', isSoundEnabled);
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#FFD700', '#FFA500', '#FF4500']
            });
          }
        }
        setIsSpinning(false);
      }, 1500);
    } else {
      setIsSpinning(false);
    }
  };

  useEffect(() => {
    let autoTimer: NodeJS.Timeout;
    if (isAuto && !isSpinning && (balance >= bet || freeSpins > 0)) {
      autoTimer = setTimeout(() => {
        handleSpin();
      }, 1000);
    }
    return () => clearTimeout(autoTimer);
  }, [isAuto, isSpinning, balance, bet, freeSpins, handleSpin]);

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] text-white font-sans overflow-hidden flex justify-center items-center p-0 md:p-4 select-none">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 z-[100] p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-all"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Main Game Container */}
      <div className="w-full h-full max-w-[500px] bg-black relative overflow-hidden flex flex-col shadow-[0_0_60px_rgba(255,0,0,0.7)] md:rounded-[20px] md:border md:border-red-900/30">
        
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#0a0010] z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#1a0033_0%,_#050005_100%)]" />
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-20 left-[-10%] w-[60%] h-[60%] bg-pink-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute top-20 right-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[140%] aspect-[2/1] opacity-30">
            <svg viewBox="0 0 800 400" className="w-full h-full">
              <path d="M50 200 Q400 50 750 200 Q400 350 50 200" fill="none" stroke="#444" strokeWidth="10" />
              <circle cx="150" cy="145" r="8" fill="#fff" />
              <circle cx="250" cy="135" r="8" fill="#fff" />
              <circle cx="400" cy="120" r="8" fill="#fff" />
              <circle cx="550" cy="135" r="8" fill="#fff" />
              <circle cx="650" cy="145" r="8" fill="#fff" />
            </svg>
          </div>
        </div>

        {/* Game Content */}
        <div className="relative z-10 flex flex-col h-full">
          
          {/* Header */}
          <div className="pt-6 pb-0 flex flex-col items-center shrink-0 relative z-50">
            <motion.h1 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black italic tracking-tighter bg-gradient-to-b from-yellow-200 via-yellow-500 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
            >
              BOXING KING
            </motion.h1>
            <div className="flex gap-1 mt-0.5">
              {[1, 2, 3].map(i => (
                <Flame key={i} className="w-2.5 h-2.5 text-orange-500 fill-current" />
              ))}
            </div>
          </div>

          {/* Character Area */}
          <div className="flex-1 relative flex items-center justify-center min-h-0">
            <div className="w-full h-full max-h-[44vh]">
              <div className="relative w-full h-full flex items-end justify-center">
                <motion.div 
                  animate={{ 
                    y: isSpinning ? [0, -5, 0] : 0,
                    filter: isSpinning ? 'brightness(1.2) contrast(1.1)' : 'brightness(1) contrast(1)'
                  }}
                  transition={{ repeat: isSpinning ? Infinity : 0, duration: 0.2 }}
                  className="relative z-10 w-full h-full flex items-end justify-center"
                >
                  <div className="relative w-full h-full flex items-end justify-center overflow-visible">
                    <img 
                      src="https://supremeking.live/wp-content/uploads/2024/08/picks-image.png" 
                      alt="Boxing King"
                      className="w-full h-full object-contain object-bottom drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] scale-115 origin-bottom"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent mix-blend-multiply" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Free Spins Trigger Overlay */}
            <AnimatePresence>
              {showFreeSpinIntro && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[110] flex items-center justify-center p-6 text-center bg-black/80 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="bg-gradient-to-b from-purple-600 to-indigo-900 p-8 rounded-3xl border-4 border-purple-400 shadow-[0_0_50px_rgba(168,85,247,0.5)]"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-6xl mb-4"
                    >
                      🎰
                    </motion.div>
                    <h2 className="text-4xl font-black text-white italic mb-2 tracking-tighter">FREE SPINS!</h2>
                    <p className="text-purple-200 font-bold text-lg mb-4 uppercase">YOU WON {toBengaliNumber(awardedSpinsCount)} ROUNDS</p>
                    <motion.div 
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="text-white font-bold text-xs uppercase tracking-[0.3em]"
                    >
                      Starting Now...
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Big Win Overlay */}
            <AnimatePresence>
              {showBigWin && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[120] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl overflow-hidden"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute w-[600px] h-[600px] bg-yellow-500/20 rounded-full blur-[120px]"
                  />
                  
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <motion.div 
                      initial={{ y: -100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute top-16 z-20 text-center"
                    >
                      <motion.h2 
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 2, -2, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-orange-700 italic tracking-tighter drop-shadow-[0_15px_40px_rgba(0,0,0,1)]"
                      >
                        BIG WIN!
                      </motion.h2>
                    </motion.div>

                    <motion.div 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="relative w-80 h-80 md:w-[450px] md:h-[450px] z-10"
                    >
                      <div className="w-full h-full rounded-full overflow-hidden border-8 border-yellow-500 shadow-[0_0_100px_rgba(255,215,0,0.7)] relative">
                        <img 
                          src="https://supremeking.live/wp-content/uploads/2024/08/picks-image.png" 
                          alt="Boxing King Big Win"
                          className="w-full h-full object-cover"
                          style={{ filter: 'brightness(1.2) contrast(1.2)' }}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute bottom-20 z-20 text-center"
                    >
                      <div className="text-7xl font-black text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]">
                        {toBengaliNumber(winAmount)} <span className="text-yellow-400 text-4xl">টাকা</span>
                      </div>
                      <div className="text-yellow-500 font-bold tracking-[0.6em] mt-3 text-base uppercase">
                        Mega Payout
                      </div>
                      <button 
                        onClick={() => setShowBigWin(false)}
                        className="mt-8 bg-gradient-to-r from-yellow-500 to-orange-600 px-12 py-3 rounded-full font-black text-xl tracking-widest shadow-2xl active:scale-95 transition-transform"
                      >
                        COLLECT
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Small Win Indicator */}
            <AnimatePresence>
              {winAmount > 0 && !showBigWin && (
                <motion.div 
                  initial={{ y: 50, opacity: 0, scale: 0 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -50, opacity: 0 }}
                  className="absolute z-30 font-black text-5xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-orange-500 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] italic tracking-tighter"
                >
                  WIN!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Slot Grid Area */}
          <div className="px-3 py-2 shrink-0">
            <div className="bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-xl border-2 border-zinc-700 p-1 shadow-xl relative">
              <div className="grid grid-cols-5 gap-0.5 bg-black rounded-lg overflow-hidden h-[192px] relative">
                {reels.map((reel, colIndex) => (
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
          </div>

          {/* Footer Controls */}
          <div className="bg-gradient-to-t from-black to-zinc-900 border-t border-zinc-800 p-3 pb-6 shrink-0">
            <div className="flex flex-col gap-3">
              
              {/* Stats Bar */}
              <div className="flex justify-between items-center bg-zinc-950/80 rounded-xl px-4 py-2 border border-zinc-800">
                <div className="flex flex-col">
                  <span className="text-[8px] text-zinc-500 uppercase font-bold">Balance</span>
                  <span className="font-mono text-sm font-bold text-yellow-500">{toBengaliNumber(balance.toFixed(2))} টাকা</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-zinc-500 uppercase font-bold">Win</span>
                  <span className="text-sm font-black text-emerald-400 italic">{toBengaliNumber(winAmount.toFixed(2))} টাকা</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] text-zinc-500 uppercase font-bold">Bet</span>
                  <span className="font-mono text-sm font-bold text-white">{toBengaliNumber(bet)} টাকা</span>
                </div>
              </div>

              {/* Main Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <button className="w-9 h-9 flex items-center justify-center bg-zinc-800 rounded-lg text-zinc-400">
                    <Info className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                    className="w-9 h-9 flex items-center justify-center bg-zinc-800 rounded-lg text-zinc-400"
                  >
                    {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      haptics.selection();
                      setIsTurbo(!isTurbo);
                    }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                      isTurbo ? "border-yellow-500 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" : "border-zinc-700 text-zinc-500"
                    )}
                  >
                    <Zap className={cn("w-5 h-5", isTurbo && "fill-current")} />
                  </button>
                  
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all relative group",
                      isSpinning ? "bg-zinc-800" : "bg-gradient-to-br from-red-500 via-red-600 to-red-800"
                    )}
                  >
                    <div className="absolute inset-1 rounded-full border border-white/20" />
                    <span className="font-black text-xl italic tracking-tighter text-center leading-none">
                      {isSpinning ? "..." : freeSpins > 0 ? `${toBengaliNumber(freeSpins)} FREE` : "SPIN"}
                    </span>
                  </motion.button>
                  
                  <button 
                    onClick={() => {
                      haptics.selection();
                      setIsAuto(!isAuto);
                    }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                      isAuto ? "border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "border-zinc-700 text-zinc-500"
                    )}
                  >
                    <RotateCcw className={cn("w-5 h-5", isAuto && "animate-spin")} />
                  </button>
                </div>

                <div className="relative">
                  <button 
                    onClick={() => {
                      haptics.selection();
                      setShowBetMenu(!showBetMenu);
                    }}
                    className="flex flex-col items-center bg-zinc-800 px-3 py-1 rounded-xl border border-zinc-700 hover:bg-zinc-700 transition-colors relative group"
                  >
                    <span className="text-[8px] text-zinc-500 uppercase font-bold">Bet</span>
                    <div className="flex items-center gap-1">
                      <span className="font-black text-sm text-yellow-500">{toBengaliNumber(bet)} টাকা</span>
                      <motion.div 
                        animate={{ y: [0, -4, 0] }} 
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        <ChevronUp className="w-4 h-4 text-red-500" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {showBetMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 right-0 z-[100] bg-zinc-900 border-2 border-yellow-600 rounded-xl p-2 shadow-2xl min-w-[220px]"
                      >
                        <div className="grid grid-cols-4 gap-1">
                          {BET_VALUES.map((val) => (
                            <button
                              key={val}
                              onClick={() => {
                                haptics.selection();
                                setBet(val);
                                setShowBetMenu(false);
                              }}
                              className={cn(
                                "py-2 rounded-lg font-mono font-bold text-[10px] transition-all",
                                bet === val 
                                  ? "bg-yellow-500 text-black scale-105" 
                                  : "bg-zinc-800 text-white hover:bg-zinc-700"
                              )}
                            >
                              {toBengaliNumber(val)}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
