import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { UserData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Bomb, 
  Gem, 
  Sparkles, 
  Wallet, 
  RotateCcw,
  ShieldAlert,
  Flame,
  Trophy,
  History
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { haptics } from '../utils/haptics';

interface MinesGameProps {
  user: User | null;
  userData: UserData | null;
  onBack: () => void;
}

type TileState = 'hidden' | 'gem' | 'mine';

export default function MinesGame({ user, userData, onBack }: MinesGameProps) {
  const [mineCount, setMineCount] = useState<number>(3);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [grid, setGrid] = useState<TileState[]>(Array(25).fill('hidden'));
  const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [gemsFound, setGemsFound] = useState<number>(0);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [recentMultipliers, setRecentMultipliers] = useState<number[]>([1.45, 2.12, 1.85, 3.40, 1.15]);

  const clickSound = useRef<HTMLAudioElement | null>(null);
  const gemSound = useRef<HTMLAudioElement | null>(null);
  const bombSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    clickSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    gemSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
    bombSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3');
    winSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
  }, []);

  const playSfx = (audio: HTMLAudioElement | null) => {
    if (!isMuted && audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  // Multiplier formula based on mine count & gems found
  const calculateMultiplier = (mines: number, found: number): number => {
    if (found === 0) return 1.0;
    let prob = 1;
    for (let i = 0; i < found; i++) {
      prob *= (25 - mines - i) / (25 - i);
    }
    const houseEdge = 0.96; // 96% RTP
    const mult = (1 / prob) * houseEdge;
    return Math.max(1.01, parseFloat(mult.toFixed(2)));
  };

  const handleStartGame = async () => {
    if (!user || !userData) return;
    if (userData.balance < betAmount) {
      haptics.error();
      alert('Insufficient balance! Please deposit to play.');
      return;
    }

    haptics.medium();

    try {
      // Deduct balance
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-betAmount),
        turnover: increment(betAmount)
      });

      // Generate random mines
      const positions: number[] = [];
      while (positions.length < mineCount) {
        const r = Math.floor(Math.random() * 25);
        if (!positions.includes(r)) {
          positions.push(r);
        }
      }

      const initialGrid: TileState[] = Array(25).fill('gem');
      positions.forEach(pos => {
        initialGrid[pos] = 'mine';
      });

      setGrid(initialGrid);
      setRevealed(Array(25).fill(false));
      setMinePositions(positions);
      setGemsFound(0);
      setCurrentMultiplier(1.0);
      setGameActive(true);
      setGameOver(false);
      setGameWon(false);
      playSfx(clickSound.current);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleTileClick = async (index: number) => {
    if (!gameActive || revealed[index] || gameOver) return;

    const nextRevealed = [...revealed];
    nextRevealed[index] = true;
    setRevealed(nextRevealed);

    let currentGrid = [...grid];
    // Dynamic 60% win assistance on early picks
    if (currentGrid[index] === 'mine' && Math.random() < 0.60) {
      // Swap mine to another unrevealed spot
      const availableIndices = currentGrid
        .map((val, idx) => (!revealed[idx] && idx !== index && val === 'gem' ? idx : -1))
        .filter(idx => idx !== -1);

      if (availableIndices.length > 0) {
        const swapTarget = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        currentGrid[index] = 'gem';
        currentGrid[swapTarget] = 'mine';
        setGrid(currentGrid);
      }
    }

    if (currentGrid[index] === 'mine') {
      // Hit a mine -> LOSE
      haptics.heavy();
      playSfx(bombSound.current);
      setGameOver(true);
      setGameActive(false);
      // Reveal all tiles
      setRevealed(Array(25).fill(true));

      // Record Bet
      if (user) {
        try {
          await addDoc(collection(db, 'bets'), {
            uid: user.uid,
            gameName: 'TK333 Mines',
            amount: betAmount,
            profit: -betAmount,
            status: 'loss',
            createdAt: serverTimestamp()
          });
        } catch (e) {}
      }
    } else {
      // Found a Gem!
      haptics.light();
      playSfx(gemSound.current);
      const nextGems = gemsFound + 1;
      setGemsFound(nextGems);
      const nextMult = calculateMultiplier(mineCount, nextGems);
      setCurrentMultiplier(nextMult);

      // Check if all gems found
      if (nextGems === 25 - mineCount) {
        // Auto cashout max win
        handleCashout(nextMult);
      }
    }
  };

  const handleCashout = async (multOverride?: number) => {
    if (!gameActive || !user || gameOver) return;
    const finalMult = multOverride || currentMultiplier;
    const winAmount = Math.floor(betAmount * finalMult);
    const profit = winAmount - betAmount;

    haptics.win();
    setGameOver(true);
    setGameWon(true);
    setGameActive(false);
    setRevealed(Array(25).fill(true));
    playSfx(winSound.current);

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });

    setRecentMultipliers(prev => [finalMult, ...prev.slice(0, 4)]);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(winAmount)
      });

      await addDoc(collection(db, 'bets'), {
        uid: user.uid,
        gameName: 'TK333 Mines',
        amount: betAmount,
        profit: profit,
        status: 'win',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white font-sans flex flex-col max-w-md mx-auto relative select-none">
      {/* Top Header */}
      <header className="px-4 py-3 bg-[#0c1222] border-b border-blue-900/40 flex items-center justify-between sticky top-0 z-50">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 active:scale-95 transition-all"
        >
          <ArrowLeft size={16} /> Exit
        </button>

        <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 px-3 py-1 rounded-full">
          <Sparkles size={14} className="text-amber-400" />
          <span className="font-chakra font-bold text-sm gold-gradient-text tracking-wider">TK333 MINES</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="p-1.5 bg-slate-800/80 rounded-lg text-slate-300 border border-slate-700"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </header>

      {/* Game Balance & Multiplier History */}
      <div className="px-4 py-2 bg-[#090f1d] border-b border-blue-950/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Wallet size={14} className="text-emerald-400" />
          <span>Balance:</span>
          <span className="font-bold text-emerald-400 font-rajdhani text-sm">
            ৳{userData?.balance?.toLocaleString() || 0}
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {recentMultipliers.map((m, idx) => (
            <span 
              key={idx} 
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                m >= 2 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-blue-950/60 text-cyan-300 border border-blue-800/40'
              }`}
            >
              {m.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="flex-1 px-4 py-4 flex flex-col justify-center items-center">
        {/* Active Multiplier & Potential Cashout Display */}
        <div className="w-full bg-gradient-to-br from-[#0e172e] to-[#0a1020] border border-blue-900/40 rounded-2xl p-3 mb-4 shadow-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current Payout</div>
            <div className="text-2xl font-black font-rajdhani text-amber-400 tracking-tight flex items-baseline gap-1">
              {currentMultiplier.toFixed(2)}<span className="text-sm text-yellow-500">x</span>
            </div>
          </div>

          {gameActive && (
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cashout Value</div>
              <div className="text-xl font-bold font-rajdhani text-emerald-400">
                ৳{Math.floor(betAmount * currentMultiplier).toLocaleString()}
              </div>
            </div>
          )}

          {!gameActive && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Gems: <b className="text-emerald-400">{25 - mineCount}</b></span>
              <span className="text-xs text-slate-400 font-medium">Mines: <b className="text-rose-400">{mineCount}</b></span>
            </div>
          )}
        </div>

        {/* 5x5 Mines Grid */}
        <div className="w-full aspect-square max-w-[340px] grid grid-cols-5 gap-2 bg-[#0a1020] p-2.5 rounded-2xl border border-blue-900/50 shadow-2xl relative">
          {grid.map((tileType, idx) => {
            const isRev = revealed[idx];
            return (
              <motion.button
                key={idx}
                whileTap={gameActive && !isRev ? { scale: 0.92 } : {}}
                onClick={() => handleTileClick(idx)}
                disabled={!gameActive || isRev || gameOver}
                className={`w-full h-full rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-200 ${
                  isRev
                    ? tileType === 'gem'
                      ? 'bg-gradient-to-br from-emerald-500/30 to-teal-800/40 border-2 border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-gradient-to-br from-rose-600/40 to-red-900/60 border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                    : gameActive
                    ? 'bg-gradient-to-b from-[#18233e] to-[#10192e] border border-blue-700/50 hover:border-cyan-400 shadow-md active:bg-blue-900'
                    : 'bg-[#10182b] border border-slate-800/80 opacity-90'
                }`}
              >
                {isRev ? (
                  tileType === 'gem' ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    >
                      <Gem size={28} />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1.1 }}
                      className="text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]"
                    >
                      <Bomb size={28} />
                    </motion.div>
                  )
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500/20 border border-blue-400/30"></div>
                )}
              </motion.button>
            );
          })}

          {/* Game Over Banner Overlay */}
          <AnimatePresence>
            {gameOver && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 z-20 text-center"
              >
                {gameWon ? (
                  <>
                    <div className="w-12 h-12 bg-amber-500/20 border border-amber-400 rounded-full flex items-center justify-center mb-2">
                      <Trophy size={28} className="text-amber-400" />
                    </div>
                    <h3 className="text-xl font-black text-amber-300 font-chakra">YOU WON!</h3>
                    <p className="text-2xl font-extrabold font-rajdhani text-emerald-400 mt-1">
                      +৳{Math.floor(betAmount * currentMultiplier).toLocaleString()}
                    </p>
                    <span className="text-xs text-slate-300 mt-0.5">Multiplier: {currentMultiplier.toFixed(2)}x</span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-rose-500/20 border border-rose-500 rounded-full flex items-center justify-center mb-2">
                      <Bomb size={28} className="text-rose-500" />
                    </div>
                    <h3 className="text-xl font-black text-rose-400 font-chakra">BOOM! HIT A MINE</h3>
                    <p className="text-sm text-slate-400 mt-1">Better luck next round</p>
                  </>
                )}
                <button
                  onClick={handleStartGame}
                  className="mt-4 px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-sm rounded-xl shadow-lg active:scale-95 transition-all"
                >
                  PLAY AGAIN
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Game Controls Footer */}
      <div className="px-4 py-3 bg-[#0c1222] border-t border-blue-900/40 space-y-3">
        {/* Mine Selector & Bet Selector when inactive */}
        {!gameActive && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Mines Count</label>
              <div className="flex items-center gap-1 bg-[#090e1a] p-1 rounded-xl border border-slate-800">
                {[1, 3, 5, 10].map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      haptics.selection();
                      setMineCount(m);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      mineCount === m 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Bet (BDT)</label>
              <div className="flex items-center gap-1 bg-[#090e1a] p-1 rounded-xl border border-slate-800">
                {[50, 100, 200, 500].map(b => (
                  <button
                    key={b}
                    onClick={() => {
                      haptics.selection();
                      setBetAmount(b);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      betAmount === b 
                        ? 'bg-amber-500 text-black shadow-sm font-black' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Button: Bet or Cashout */}
        {gameActive ? (
          <button
            onClick={() => handleCashout()}
            disabled={gemsFound === 0}
            className={`w-full py-3.5 rounded-xl font-black font-chakra text-base uppercase tracking-wider shadow-xl transition-all active:scale-[0.98] ${
              gemsFound > 0
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {gemsFound > 0 ? `CASHOUT ৳${Math.floor(betAmount * currentMultiplier).toLocaleString()} (${currentMultiplier.toFixed(2)}x)` : 'PICK A TILE'}
          </button>
        ) : (
          <button
            onClick={handleStartGame}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black font-chakra text-base uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all"
          >
            BET ৳{betAmount} & START
          </button>
        )}
      </div>
    </div>
  );
}
