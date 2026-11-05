import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { UserData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Wallet, 
  RotateCw, 
  Trophy, 
  Trash2, 
  History, 
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { haptics } from '../utils/haptics';
import { generateRouletteWinningNumber } from '../services/gameProbabilityService';
import { formatBDT } from '../config/currency';

interface RouletteGameProps {
  user: User | null;
  userData: UserData | null;
  onBack: () => void;
}

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export default function RouletteGame({ user, userData, onBack }: RouletteGameProps) {
  const [balance, setBalance] = useState<number>(() => userData?.balance ?? 500);
  const [selectedChip, setSelectedChip] = useState<number>(50);
  const [bets, setBets] = useState<{ [key: string]: number }>({});
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [ballRotation, setBallRotation] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [history, setHistory] = useState<number[]>([7, 22, 0, 31, 14, 18, 9]);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);
  const [lastProfit, setLastProfit] = useState<number | null>(null);

  const wheelSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const chipSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (userData?.balance !== undefined) {
      setBalance(userData.balance);
    }
  }, [userData?.balance]);

  useEffect(() => {
    wheelSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    winSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
    chipSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
  }, []);

  const playSfx = (audio: HTMLAudioElement | null) => {
    if (!isMuted && audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  const totalBet = (Object.values(bets) as number[]).reduce((acc, curr) => acc + curr, 0);

  const placeBet = (betKey: string) => {
    if (isSpinning) return;
    if (balance < totalBet + selectedChip) {
      haptics.error();
      alert('Insufficient balance for this chip!');
      return;
    }
    haptics.selection();
    playSfx(chipSound.current);
    setBets(prev => ({
      ...prev,
      [betKey]: (prev[betKey] || 0) + selectedChip
    }));
  };

  const clearBets = () => {
    if (isSpinning) return;
    haptics.light();
    setBets({});
  };

  const doubleBets = () => {
    if (isSpinning || totalBet === 0) return;
    if (balance < totalBet * 2) {
      haptics.error();
      alert('Insufficient balance to double all bets!');
      return;
    }
    haptics.medium();
    const doubled: { [key: string]: number } = {};
    Object.keys(bets).forEach(k => {
      doubled[k] = bets[k] * 2;
    });
    setBets(doubled);
  };

  const spinWheel = async () => {
    if (isSpinning || totalBet === 0 || !user || !userData) return;
    if (balance < totalBet) {
      haptics.error();
      alert('Insufficient balance!');
      return;
    }

    haptics.medium();

    try {
      // Optimistic balance deduction
      setBalance(prev => Math.max(0, prev - totalBet));

      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-totalBet),
        turnover: increment(totalBet)
      });

      setIsSpinning(true);
      setLastWinAmount(null);
      setLastProfit(null);
      setWinningNumber(null);
      playSfx(wheelSound.current);

      // Authoritative outcome calculation based on centralized Global Win Probability
      const { outcomeIndex, outcomeNumber } = generateRouletteWinningNumber(
        bets,
        RED_NUMBERS,
        ROULETTE_NUMBERS
      );

      // Calculate wheel rotation and ball rotation
      const segmentAngle = 360 / 37;
      const targetWheelAngle = 360 * 5 + (outcomeIndex * segmentAngle);
      // Ball spins in opposite direction
      const targetBallAngle = -(360 * 7 + (outcomeIndex * segmentAngle));

      setWheelRotation(prev => prev + targetWheelAngle);
      setBallRotation(prev => prev + targetBallAngle);

      setTimeout(async () => {
        setIsSpinning(false);
        setWinningNumber(outcomeNumber);
        setHistory(prev => [outcomeNumber, ...prev.slice(0, 8)]);

        // Calculate payout
        let win = 0;
        const isRed = RED_NUMBERS.includes(outcomeNumber);
        const isBlack = outcomeNumber !== 0 && !isRed;
        const isEven = outcomeNumber !== 0 && outcomeNumber % 2 === 0;
        const isOdd = outcomeNumber !== 0 && outcomeNumber % 2 !== 0;
        const isLow = outcomeNumber >= 1 && outcomeNumber <= 18;
        const isHigh = outcomeNumber >= 19 && outcomeNumber <= 36;

        // Inside Straight Bet (35:1 payout + original chip = 36x)
        if (bets[`num_${outcomeNumber}`]) {
          win += bets[`num_${outcomeNumber}`] * 36;
        }

        // Outside Bets (1:1 payout + original chip = 2x)
        if (isRed && bets['red']) win += bets['red'] * 2;
        if (isBlack && bets['black']) win += bets['black'] * 2;
        if (isEven && bets['even']) win += bets['even'] * 2;
        if (isOdd && bets['odd']) win += bets['odd'] * 2;
        if (isLow && bets['low']) win += bets['low'] * 2;
        if (isHigh && bets['high']) win += bets['high'] * 2;

        // Dozen Bets (2:1 payout = 3x)
        if (outcomeNumber >= 1 && outcomeNumber <= 12 && bets['doz_1']) win += bets['doz_1'] * 3;
        if (outcomeNumber >= 13 && outcomeNumber <= 24 && bets['doz_2']) win += bets['doz_2'] * 3;
        if (outcomeNumber >= 25 && outcomeNumber <= 36 && bets['doz_3']) win += bets['doz_3'] * 3;

        // Column Bets (2:1 payout = 3x)
        if (outcomeNumber > 0) {
          const colRemainder = outcomeNumber % 3;
          if (colRemainder === 1 && bets['col_1']) win += bets['col_1'] * 3;
          if (colRemainder === 2 && bets['col_2']) win += bets['col_2'] * 3;
          if (colRemainder === 0 && bets['col_3']) win += bets['col_3'] * 3;
        }

        setLastWinAmount(win);
        const profit = win - totalBet;
        setLastProfit(profit);

        if (win > 0) {
          haptics.win();
          playSfx(winSound.current);
          setBalance(prev => prev + win);
          confetti({
            particleCount: 110,
            spread: 70,
            origin: { y: 0.6 }
          });
        } else {
          haptics.heavy();
        }

        try {
          if (win > 0) {
            await updateDoc(doc(db, 'users', user.uid), {
              balance: increment(win)
            });
          }

          await addDoc(collection(db, 'bets'), {
            uid: user.uid,
            gameName: 'TK333 Roulette',
            amount: totalBet,
            profit: profit,
            status: win > 0 ? 'win' : 'loss',
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'users');
        }
      }, 3500);

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const chips = [
    { value: 10, color: 'bg-blue-600 border-blue-400 text-white' },
    { value: 50, color: 'bg-amber-600 border-amber-300 text-white' },
    { value: 100, color: 'bg-emerald-600 border-emerald-400 text-white' },
    { value: 500, color: 'bg-purple-600 border-purple-400 text-white' },
    { value: 1000, color: 'bg-rose-700 border-rose-400 text-white' }
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-white font-sans flex flex-col max-w-6xl mx-auto border-x border-slate-800/80 select-none shadow-2xl">
      {/* 1. Header Bar */}
      <header className="px-3 sm:px-6 py-2.5 bg-[#0b1120] border-b border-slate-800 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-chakra font-black active:scale-95 transition-all"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">EXIT</span>
          </button>

          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-xl">
            <RotateCw size={15} className="text-amber-400" />
            <span className="font-chakra font-black text-sm tracking-wider bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent uppercase">
              TK333 EUROPEAN ROULETTE
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

      {/* 2. Last Winning Numbers Strip */}
      <div className="bg-[#090e1a] px-3 py-1.5 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] font-chakra font-bold text-slate-400 uppercase flex items-center gap-1 shrink-0">
          <History size={13} />
          <span>HISTORY:</span>
        </span>
        <div className="flex items-center gap-1.5">
          {history.map((num, idx) => {
            const isRed = RED_NUMBERS.includes(num);
            const isZero = num === 0;
            return (
              <span
                key={idx}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-black border shadow-sm ${
                  isZero
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : isRed
                    ? 'bg-rose-600 text-white border-rose-400'
                    : 'bg-slate-900 text-white border-slate-600'
                }`}
              >
                {num}
              </span>
            );
          })}
        </div>
      </div>

      {/* 3. Main Arena: Responsive Side-by-Side (Wheel on left, Table on right) */}
      <div className="flex-1 p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 bg-[#070b14] items-center">
        {/* Left: Luxury 3D European Roulette Wheel (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full p-2 bg-gradient-to-tr from-[#2a170c] via-[#4d2c18] to-[#1c0f08] border-8 border-[#8b5e3c] shadow-[0_0_50px_rgba(0,0,0,0.9)] flex items-center justify-center">
            {/* Outer Brass Ball Track */}
            <div className="absolute inset-3 rounded-full border-2 border-amber-600/50 pointer-events-none" />

            {/* Rotating Wheel Pocket Ring */}
            <motion.div
              animate={{ rotate: wheelRotation }}
              transition={{ duration: 3.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full h-full rounded-full relative overflow-hidden flex items-center justify-center shadow-inner"
              style={{
                background: 'conic-gradient(#059669 0deg 9.73deg, #1e293b 9.73deg 19.46deg, #dc2626 19.46deg 29.19deg, #1e293b 29.19deg 38.92deg, #dc2626 38.92deg 48.65deg, #1e293b 48.65deg 58.38deg, #dc2626 58.38deg 68.11deg, #1e293b 68.11deg 77.84deg, #dc2626 77.84deg 87.57deg, #1e293b 87.57deg 97.3deg, #dc2626 97.3deg 107.03deg, #1e293b 107.03deg 116.76deg, #dc2626 116.76deg 126.49deg, #1e293b 126.49deg 136.22deg, #dc2626 136.22deg 145.95deg, #1e293b 145.95deg 155.68deg, #dc2626 155.68deg 165.41deg, #1e293b 165.41deg 175.14deg, #dc2626 175.14deg 184.87deg, #1e293b 184.87deg 194.6deg, #dc2626 194.6deg 204.33deg, #1e293b 204.33deg 214.06deg, #dc2626 214.06deg 223.79deg, #1e293b 223.79deg 233.52deg, #dc2626 233.52deg 243.25deg, #1e293b 243.25deg 252.98deg, #dc2626 252.98deg 262.71deg, #1e293b 262.71deg 272.44deg, #dc2626 272.44deg 282.17deg, #1e293b 282.17deg 291.9deg, #dc2626 291.9deg 301.63deg, #1e293b 301.63deg 311.36deg, #dc2626 311.36deg 321.09deg, #1e293b 321.09deg 330.82deg, #dc2626 330.82deg 340.55deg, #1e293b 340.55deg 350.28deg, #dc2626 350.28deg 360deg)'
              }}
            >
              {/* Pocket Numbers overlay */}
              {ROULETTE_NUMBERS.map((n, i) => {
                const angle = (i * 360) / 37;
                return (
                  <div
                    key={n}
                    className="absolute top-1 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex flex-col items-center pt-1"
                    style={{ transform: `rotate(${angle + 4.86}deg)` }}
                  >
                    <span className="text-[9px] sm:text-[10px] font-mono font-black text-white drop-shadow">
                      {n}
                    </span>
                  </div>
                );
              })}
            </motion.div>

            {/* Orbiting Ball Ring */}
            <motion.div
              animate={{ rotate: ballRotation }}
              transition={{ duration: 3.5, ease: [0.15, 0.9, 0.3, 1] }}
              className="absolute inset-5 rounded-full pointer-events-none flex items-start justify-center"
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-slate-200 via-white to-slate-300 shadow-[0_0_10px_#fff] border border-slate-300" />
            </motion.div>

            {/* Brass Center Turret */}
            <div className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 border-4 border-amber-200 shadow-xl flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 shadow-inner flex items-center justify-center">
                <span className="font-chakra font-black text-[10px] text-amber-950">TK333</span>
              </div>
            </div>
          </div>

          {/* Winning Spotlight Ribbon */}
          {winningNumber !== null && !isSpinning && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-3 px-5 py-2 rounded-2xl bg-slate-900 border border-amber-500/60 shadow-xl flex items-center gap-3"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-mono font-black shadow-lg ${
                  winningNumber === 0
                    ? 'bg-emerald-600 text-white'
                    : RED_NUMBERS.includes(winningNumber)
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-950 text-white border border-slate-700'
                }`}
              >
                {winningNumber}
              </div>
              <div>
                <span className="text-[10px] font-chakra font-black uppercase text-amber-400 block">
                  WINNING NUMBER
                </span>
                <span className="font-rajdhani font-black text-lg text-white">
                  {lastWinAmount && lastWinAmount > 0
                    ? `Won: +${formatBDT(lastWinAmount)} (Profit: +${formatBDT(lastProfit || 0)})`
                    : 'No Winning Bets'}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Authentic Casino Felt Betting Grid (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-[#063319] rounded-3xl border-4 border-[#8b5e3c] p-3 sm:p-5 shadow-2xl space-y-4">
          {/* Numbers Grid */}
          <div className="space-y-1">
            {/* Zero (0) Top Cell */}
            <button
              disabled={isSpinning}
              onClick={() => placeBet('num_0')}
              className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 border border-emerald-400 font-mono font-black text-lg text-white flex items-center justify-center relative shadow-sm cursor-pointer active:scale-98"
            >
              <span>0 (GREEN ZERO)</span>
              {bets['num_0'] && (
                <span className="absolute right-3 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black shadow">
                  ৳{bets['num_0']}
                </span>
              )}
            </button>

            {/* 36 Numbers in 12 Rows of 3 */}
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 36 }).map((_, idx) => {
                const num = idx + 1;
                const isRed = RED_NUMBERS.includes(num);
                const betKey = `num_${num}`;
                const hasBet = bets[betKey];

                return (
                  <button
                    key={num}
                    disabled={isSpinning}
                    onClick={() => placeBet(betKey)}
                    className={`h-11 sm:h-12 rounded-lg font-mono font-black text-base sm:text-lg flex items-center justify-center relative border transition-all active:scale-95 cursor-pointer ${
                      isRed
                        ? 'bg-rose-700 hover:bg-rose-600 border-rose-500 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <span>{num}</span>
                    {hasBet && (
                      <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center shadow">
                        ৳{hasBet}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Column Bets (2:1) */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              {['col_1', 'col_2', 'col_3'].map((col, idx) => (
                <button
                  key={col}
                  disabled={isSpinning}
                  onClick={() => placeBet(col)}
                  className="py-1.5 rounded-lg bg-[#0a4823] hover:bg-[#0d592b] border border-emerald-500/60 font-chakra font-black text-xs text-amber-300 flex items-center justify-center relative cursor-pointer"
                >
                  <span>2:1 (COL {idx + 1})</span>
                  {bets[col] && (
                    <span className="absolute right-1 text-[9px] bg-amber-400 text-black px-1 rounded-full font-black">
                      ৳{bets[col]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Dozens Bets (1st 12, 2nd 12, 3rd 12) */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { key: 'doz_1', label: '1ST 12 (1-12)' },
              { key: 'doz_2', label: '2ND 12 (13-24)' },
              { key: 'doz_3', label: '3RD 12 (25-36)' }
            ].map(d => (
              <button
                key={d.key}
                disabled={isSpinning}
                onClick={() => placeBet(d.key)}
                className="py-2 rounded-xl bg-[#0a4823] hover:bg-[#0d592b] border border-emerald-500/60 font-chakra font-black text-xs text-white relative cursor-pointer"
              >
                <span>{d.label}</span>
                {bets[d.key] && (
                  <span className="absolute right-1 text-[9px] bg-amber-400 text-black px-1 rounded-full font-black">
                    ৳{bets[d.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Outside Even Money Bets (1-18, Even, Red, Black, Odd, 19-36) */}
          <div className="grid grid-cols-6 gap-1">
            {[
              { key: 'low', label: '1-18' },
              { key: 'even', label: 'EVEN' },
              { key: 'red', label: 'RED', color: 'bg-rose-700 hover:bg-rose-600 border-rose-500' },
              { key: 'black', label: 'BLACK', color: 'bg-slate-900 hover:bg-slate-800 border-slate-700' },
              { key: 'odd', label: 'ODD' },
              { key: 'high', label: '19-36' }
            ].map(b => (
              <button
                key={b.key}
                disabled={isSpinning}
                onClick={() => placeBet(b.key)}
                className={`py-2 rounded-xl font-chakra font-black text-[11px] relative cursor-pointer border ${
                  b.color || 'bg-[#0a4823] hover:bg-[#0d592b] border-emerald-500/60 text-white'
                }`}
              >
                <span>{b.label}</span>
                {bets[b.key] && (
                  <span className="absolute top-0.5 right-0.5 text-[8px] bg-amber-400 text-black px-1 rounded-full font-black">
                    ৳{bets[b.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Chips Selector & Action Deck */}
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-emerald-600/40 flex flex-wrap items-center justify-between gap-3">
            {/* Chips */}
            <div className="flex items-center gap-1.5">
              {chips.map(chip => (
                <button
                  key={chip.value}
                  disabled={isSpinning}
                  onClick={() => {
                    haptics.selection();
                    setSelectedChip(chip.value);
                  }}
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full font-rajdhani font-black text-xs sm:text-sm border-2 flex items-center justify-center transition-all ${
                    chip.color
                  } ${
                    selectedChip === chip.value
                      ? 'scale-115 shadow-[0_0_15px_#ffd700] ring-2 ring-amber-300'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  ৳{chip.value}
                </button>
              ))}
            </div>

            {/* Quick Actions (Clear, Double, Spin) */}
            <div className="flex items-center gap-2">
              <button
                disabled={isSpinning || totalBet === 0}
                onClick={clearBets}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 active:scale-95 disabled:opacity-40"
                title="Clear all bets"
              >
                <Trash2 size={16} />
              </button>

              <button
                disabled={isSpinning || totalBet === 0}
                onClick={doubleBets}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-chakra font-black text-xs border border-slate-700 active:scale-95 disabled:opacity-40"
              >
                2X DOUBLE
              </button>

              <button
                disabled={isSpinning || totalBet === 0}
                onClick={spinWheel}
                className={`px-5 py-2.5 rounded-xl font-chakra font-black text-sm uppercase tracking-wider shadow-xl transition-all ${
                  isSpinning || totalBet === 0
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer active:scale-95'
                }`}
              >
                {isSpinning ? 'SPINNING...' : `SPIN (৳${totalBet})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
