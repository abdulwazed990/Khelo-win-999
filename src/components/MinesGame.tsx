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
  History,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { haptics } from '../utils/haptics';
import { evaluateServerWinRoll } from '../services/gameProbabilityService';
import { formatBDT } from '../config/currency';

interface MinesGameProps {
  user: User | null;
  userData: UserData | null;
  onBack: () => void;
}

type TileState = 'hidden' | 'gem' | 'mine';

export default function MinesGame({ user, userData, onBack }: MinesGameProps) {
  const [balance, setBalance] = useState<number>(() => userData?.balance ?? 500);
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
  const [recentMultipliers, setRecentMultipliers] = useState<number[]>([1.45, 2.12, 1.85, 3.40, 1.15, 5.20, 2.80]);
  const [lastWinProfit, setLastWinProfit] = useState<number | null>(null);

  const clickSound = useRef<HTMLAudioElement | null>(null);
  const gemSound = useRef<HTMLAudioElement | null>(null);
  const bombSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (userData?.balance !== undefined) {
      setBalance(userData.balance);
    }
  }, [userData?.balance]);

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

  const nextMultiplier = calculateMultiplier(mineCount, gemsFound + 1);
  const currentCashout = Math.round(betAmount * currentMultiplier * 100) / 100;
  const currentProfit = currentCashout - betAmount;
  const nextCashout = Math.round(betAmount * nextMultiplier * 100) / 100;

  const handleStartGame = async () => {
    if (!user || !userData) return;
    if (balance < betAmount) {
      haptics.error();
      alert('Insufficient balance! Please deposit to play.');
      return;
    }

    haptics.medium();
    playSfx(clickSound.current);

    try {
      // Optimistic balance update
      setBalance(prev => Math.max(0, prev - betAmount));

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
      setLastWinProfit(null);
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
    // Authoritative check based on centralized Global Win Probability
    if (currentGrid[index] === 'mine' && evaluateServerWinRoll()) {
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
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'bets');
        }
      }
    } else {
      // Found a GEM
      haptics.light();
      playSfx(gemSound.current);
      const nextFound = gemsFound + 1;
      setGemsFound(nextFound);

      const nextMult = calculateMultiplier(mineCount, nextFound);
      setCurrentMultiplier(nextMult);

      // Check if all gems uncovered
      if (nextFound === 25 - mineCount) {
        // Auto cashout on total clear
        handleCashOut(nextMult);
      }
    }
  };

  const handleCashOut = async (overrideMultiplier?: number) => {
    if (!gameActive || gemsFound === 0 || gameOver || !user) return;

    const finalMult = overrideMultiplier || currentMultiplier;
    const winAmount = Math.round(betAmount * finalMult * 100) / 100;
    const profit = winAmount - betAmount;

    haptics.win();
    playSfx(winSound.current);
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });

    setGameWon(true);
    setGameOver(true);
    setGameActive(false);
    setRevealed(Array(25).fill(true));
    setLastWinProfit(profit);
    setBalance(prev => prev + winAmount);
    setRecentMultipliers(prev => [finalMult, ...prev.slice(0, 6)]);

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

  const quickBets = [20, 50, 100, 200, 500, 1000];

  return (
    <div className="min-h-[100dvh] bg-[#070b14] text-white font-sans flex flex-col max-w-5xl mx-auto border-x border-slate-800/80 select-none shadow-2xl overflow-x-hidden">
      {/* 1. Header Bar */}
      <header className="px-3 sm:px-6 py-3 bg-[#0b1120] border-b border-slate-800 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-chakra font-black active:scale-95 transition-all"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">EXIT</span>
          </button>

          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-xl">
            <Gem size={15} className="text-emerald-400 animate-pulse" />
            <span className="font-chakra font-black text-sm tracking-wider bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent uppercase">
              TK333 VAULT MINES
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-slate-300 border border-slate-700 active:scale-95 transition-all"
          >
            {isMuted ? <VolumeX size={16} className="text-rose-400" /> : <Volume2 size={16} className="text-emerald-400" />}
          </button>

          <div className="flex items-center gap-2 bg-gradient-to-r from-slate-900 to-[#0e172a] px-3.5 py-1.5 rounded-xl border border-emerald-500/40">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Balance</span>
            <span className="font-rajdhani font-black text-emerald-400 text-base sm:text-lg">
              {formatBDT(balance)}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Recent Multipliers Ribbon */}
      <div className="bg-[#090e1a] px-4 py-1.5 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] font-chakra font-bold text-slate-400 uppercase flex items-center gap-1 shrink-0">
          <History size={13} />
          <span>VAULT HISTORY:</span>
        </span>
        <div className="flex items-center gap-1.5">
          {recentMultipliers.map((m, idx) => (
            <span
              key={idx}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-rajdhani font-black tracking-tight shrink-0 border ${
                m >= 3.0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : m >= 1.5
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {m.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>

      {/* 3. Main Body: Tactical Control Left & 5x5 Grid Right */}
      <div className="flex-1 p-2 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 bg-[#070b14] items-center w-full max-w-5xl mx-auto overflow-y-auto">
        {/* Command & Bet Station (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#0f172a] rounded-2xl border border-slate-800 p-3 sm:p-4 space-y-2.5 sm:space-y-3.5 shadow-xl">
          {/* Mine Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-chakra font-black text-slate-300">
              <span className="flex items-center gap-1.5">
                <Bomb size={14} className="text-rose-500" />
                NUMBER OF MINES
              </span>
              <span className="font-rajdhani font-black text-rose-400 text-base">{mineCount} MINES</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[1, 3, 5, 10, 15, 20, 24].slice(0, 5).map(cnt => (
                <button
                  key={cnt}
                  disabled={gameActive}
                  onClick={() => {
                    haptics.selection();
                    setMineCount(cnt);
                  }}
                  className={`py-2 rounded-xl text-xs font-rajdhani font-black border transition-all disabled:opacity-40 ${
                    mineCount === cnt
                      ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>

          {/* Bet Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-chakra font-black text-slate-300">
              <span className="flex items-center gap-1.5">
                <Wallet size={14} className="text-amber-400" />
                BET AMOUNT
              </span>
              <span className="font-rajdhani font-black text-emerald-400 text-base">৳{betAmount}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-900 rounded-xl border border-slate-700/80 p-1">
              <button
                disabled={gameActive}
                onClick={() => {
                  haptics.selection();
                  setBetAmount(prev => Math.max(10, Math.floor(prev / 2)));
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-rajdhani font-black text-xs disabled:opacity-40"
              >
                ½
              </button>

              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-amber-400">৳</span>
                <input
                  type="number"
                  disabled={gameActive}
                  value={betAmount}
                  onChange={e => setBetAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                  className="bg-transparent text-center font-rajdhani font-black text-lg text-white w-24 outline-none disabled:opacity-50"
                />
              </div>

              <button
                disabled={gameActive}
                onClick={() => {
                  haptics.selection();
                  setBetAmount(prev => prev * 2);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-rajdhani font-black text-xs disabled:opacity-40"
              >
                2X
              </button>
            </div>

            {/* Quick Chips */}
            <div className="grid grid-cols-6 gap-1">
              {quickBets.map(amt => (
                <button
                  key={amt}
                  disabled={gameActive}
                  onClick={() => {
                    haptics.selection();
                    setBetAmount(amt);
                  }}
                  className={`py-1 rounded-lg text-[10px] font-rajdhani font-black border transition-all disabled:opacity-40 ${
                    betAmount === amt
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  ৳{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Next Tile Telemetry Forecast Card */}
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Gems Cleared:</span>
              <span className="font-rajdhani font-black text-emerald-400">{gemsFound} / {25 - mineCount}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Current Payout:</span>
              <span className="font-rajdhani font-black text-white">{currentMultiplier.toFixed(2)}x (৳{currentCashout.toFixed(2)})</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <TrendingUp size={12} />
                Next Gem Multiplier:
              </span>
              <span className="font-rajdhani font-black text-amber-300">{nextMultiplier.toFixed(2)}x (৳{nextCashout.toFixed(2)})</span>
            </div>
          </div>

          {/* Action Button: Start vs Cash Out */}
          <div>
            {gameActive ? (
              <button
                disabled={gemsFound === 0}
                onClick={() => handleCashOut()}
                className={`w-full py-4 rounded-xl font-chakra font-black text-base flex flex-col items-center justify-center gap-0.5 shadow-xl transition-all ${
                  gemsFound > 0
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-98 animate-pulse cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <span className="tracking-wider uppercase">CASH OUT (৳{currentCashout.toFixed(2)})</span>
                <span className="text-xs text-emerald-100 font-normal">
                  Profit: +৳{currentProfit.toFixed(2)}
                </span>
              </button>
            ) : (
              <button
                onClick={handleStartGame}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-chakra font-black text-base uppercase tracking-wider shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={18} />
                <span>START GAME (৳{betAmount})</span>
              </button>
            )}
          </div>
        </div>

        {/* 5x5 Heavy Vault Grid (order-first on mobile so player sees board immediately) */}
        <div className="order-first lg:order-last lg:col-span-7 flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[420px] aspect-square bg-[#0b1120] p-2 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 border-slate-800 shadow-[0_0_40px_rgba(0,0,0,0.8)] relative mx-auto">
            {/* Corner Decorative Rivets */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-slate-700" />
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-700" />
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-slate-700" />
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-slate-700" />

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full h-full">
              {grid.map((state, idx) => {
                const isRevealed = revealed[idx];
                const isGem = state === 'gem';
                const isMine = state === 'mine';

                return (
                  <motion.button
                    key={idx}
                    whileHover={gameActive && !isRevealed ? { scale: 1.05 } : {}}
                    whileTap={gameActive && !isRevealed ? { scale: 0.94 } : {}}
                    onClick={() => handleTileClick(idx)}
                    disabled={!gameActive || isRevealed}
                    className={`relative rounded-xl flex items-center justify-center transition-all duration-200 overflow-hidden ${
                      isRevealed
                        ? isGem
                          ? 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                          : 'bg-gradient-to-br from-rose-950 via-rose-900 to-slate-950 border-2 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-shake'
                        : 'bg-gradient-to-br from-slate-800 via-[#1e293b] to-slate-900 border border-slate-700 hover:border-slate-500 shadow-md cursor-pointer'
                    }`}
                  >
                    {/* Unrevealed Vault Plate Pattern */}
                    {!isRevealed && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <div className="w-4 h-4 rounded-full border border-slate-500" />
                      </div>
                    )}

                    {/* Revealed Content with Micro-Animations */}
                    <AnimatePresence>
                      {isRevealed && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                          className="flex items-center justify-center"
                        >
                          {isGem ? (
                            <div className="relative flex items-center justify-center">
                              <Gem size={28} className="text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse" />
                              <Sparkles size={14} className="absolute -top-1 -right-1 text-yellow-300" />
                            </div>
                          ) : (
                            <div className="relative flex items-center justify-center">
                              <Bomb size={28} className="text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,1)] animate-bounce" />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Game Over / Win State Banner */}
          {gameOver && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 px-6 py-2.5 rounded-2xl border text-center font-chakra font-black ${
                gameWon
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                  : 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
              }`}
            >
              {gameWon ? (
                <div>
                  <span className="text-xs uppercase tracking-widest block text-emerald-200">VICTORY CASHOUT</span>
                  <span className="text-xl font-rajdhani text-white">
                    +{formatBDT(currentCashout)} (Profit: +{formatBDT(lastWinProfit || 0)})
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-xs uppercase tracking-widest block text-rose-300">MINE DETONATED</span>
                  <span className="text-sm font-medium text-slate-300">Better luck on the next vault run!</span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
