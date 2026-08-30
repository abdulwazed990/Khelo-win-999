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
  Trash2
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { haptics } from '../utils/haptics';
import { generateRouletteWinningNumber } from '../services/gameProbabilityService';

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
  const [selectedChip, setSelectedChip] = useState<number>(50);
  const [bets, setBets] = useState<{ [key: string]: number }>({});
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [history, setHistory] = useState<number[]>([7, 22, 0, 31, 14]);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  const wheelSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const chipSound = useRef<HTMLAudioElement | null>(null);

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
    if (!userData || userData.balance < totalBet + selectedChip) {
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

  const spinWheel = async () => {
    if (isSpinning || totalBet === 0 || !user || !userData) return;
    if (userData.balance < totalBet) {
      haptics.error();
      alert('Insufficient balance!');
      return;
    }

    haptics.medium();

    try {
      // Deduct Bet
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-totalBet),
        turnover: increment(totalBet)
      });

      setIsSpinning(true);
      setLastWinAmount(null);
      setWinningNumber(null);
      playSfx(wheelSound.current);

      // Authoritative outcome calculation based on centralized Global Win Probability (Fixed 5%)
      const { outcomeIndex, outcomeNumber } = generateRouletteWinningNumber(
        bets,
        RED_NUMBERS,
        ROULETTE_NUMBERS
      );

      // Calculate degrees: each segment is 360 / 37 ≈ 9.7297 deg
      const segmentAngle = 360 / 37;
      const targetAngle = 360 * 6 + (outcomeIndex * segmentAngle);
      setWheelRotation(prev => prev + targetAngle);

      setTimeout(async () => {
        setIsSpinning(false);
        setWinningNumber(outcomeNumber);
        setHistory(prev => [outcomeNumber, ...prev.slice(0, 5)]);

        // Calculate payout
        let win = 0;
        const isRed = RED_NUMBERS.includes(outcomeNumber);
        const isBlack = outcomeNumber !== 0 && !isRed;
        const isEven = outcomeNumber !== 0 && outcomeNumber % 2 === 0;
        const isOdd = outcomeNumber !== 0 && outcomeNumber % 2 !== 0;
        const isLow = outcomeNumber >= 1 && outcomeNumber <= 18;
        const isHigh = outcomeNumber >= 19 && outcomeNumber <= 36;

        // Inside Straight Bet
        if (bets[`num_${outcomeNumber}`]) {
          win += bets[`num_${outcomeNumber}`] * 36;
        }

        // Outside Bets
        if (isRed && bets['red']) win += bets['red'] * 2;
        if (isBlack && bets['black']) win += bets['black'] * 2;
        if (isEven && bets['even']) win += bets['even'] * 2;
        if (isOdd && bets['odd']) win += bets['odd'] * 2;
        if (isLow && bets['low']) win += bets['low'] * 2;
        if (isHigh && bets['high']) win += bets['high'] * 2;

        setLastWinAmount(win);

        if (win > 0) {
          haptics.win();
          playSfx(winSound.current);
          confetti({
            particleCount: 100,
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
            gameName: 'TK333 European Roulette',
            amount: totalBet,
            profit: win - totalBet,
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

  const getNumberColor = (num: number) => {
    if (num === 0) return 'bg-emerald-600 text-white';
    if (RED_NUMBERS.includes(num)) return 'bg-rose-600 text-white';
    return 'bg-slate-900 text-white border border-slate-700';
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white font-sans flex flex-col max-w-md mx-auto relative select-none">
      {/* Header */}
      <header className="px-4 py-3 bg-[#0c1222] border-b border-blue-900/40 flex items-center justify-between sticky top-0 z-50">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 active:scale-95 transition-all"
        >
          <ArrowLeft size={16} /> Exit
        </button>

        <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 px-3 py-1 rounded-full">
          <Sparkles size={14} className="text-amber-400" />
          <span className="font-chakra font-bold text-sm gold-gradient-text tracking-wider">TK333 ROULETTE</span>
        </div>

        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="p-1.5 bg-slate-800/80 rounded-lg text-slate-300 border border-slate-700"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </header>

      {/* Balance & Stats Bar */}
      <div className="px-4 py-2 bg-[#090f1d] border-b border-blue-950/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Wallet size={14} className="text-emerald-400" />
          <span>Balance:</span>
          <span className="font-bold text-emerald-400 font-rajdhani text-sm">
            ৳{userData?.balance?.toLocaleString() || 0}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 font-bold">HISTORY:</span>
          {history.map((num, i) => (
            <span
              key={i}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${getNumberColor(num)}`}
            >
              {num}
            </span>
          ))}
        </div>
      </div>

      {/* Wheel Section */}
      <div className="py-4 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#0a1020] to-[#070b14]">
        {/* Pointer */}
        <div className="absolute top-2 z-20 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]"></div>

        {/* Animated Rotating Wheel */}
        <div className="w-48 h-48 rounded-full border-4 border-amber-500/80 p-1 relative shadow-[0_0_30px_rgba(245,158,11,0.25)] bg-[#0f172a]">
          <motion.div 
            animate={{ rotate: wheelRotation }}
            transition={{ duration: 3.5, ease: [0.15, 0.9, 0.25, 1] }}
            className="w-full h-full rounded-full relative overflow-hidden flex items-center justify-center"
            style={{
              background: 'conic-gradient(#10b981 0deg 9.7deg, #dc2626 9.7deg 19.4deg, #0f172a 19.4deg 29.1deg, #dc2626 29.1deg 38.8deg, #0f172a 38.8deg 48.5deg, #dc2626 48.5deg 58.2deg, #0f172a 58.2deg 67.9deg, #dc2626 67.9deg 77.6deg, #0f172a 77.6deg 87.3deg, #dc2626 87.3deg 97deg, #0f172a 97deg 106.7deg, #dc2626 106.7deg 116.4deg, #0f172a 116.4deg 126.1deg, #dc2626 126.1deg 135.8deg, #0f172a 135.8deg 145.5deg, #dc2626 145.5deg 155.2deg, #0f172a 155.2deg 164.9deg, #dc2626 164.9deg 174.6deg, #0f172a 174.6deg 184.3deg, #dc2626 184.3deg 194deg, #0f172a 194deg 203.7deg, #dc2626 203.7deg 213.4deg, #0f172a 213.4deg 223.1deg, #dc2626 223.1deg 232.8deg, #0f172a 232.8deg 242.5deg, #dc2626 242.5deg 252.2deg, #0f172a 252.2deg 261.9deg, #dc2626 261.9deg 271.6deg, #0f172a 271.6deg 281.3deg, #dc2626 281.3deg 291deg, #0f172a 291deg 300.7deg, #dc2626 300.7deg 310.4deg, #0f172a 310.4deg 320.1deg, #dc2626 320.1deg 329.8deg, #0f172a 329.8deg 339.5deg, #dc2626 339.5deg 349.2deg, #0f172a 349.2deg 360deg)'
            }}
          >
            {/* Center Hub */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 border-2 border-yellow-200 shadow-xl flex items-center justify-center text-black font-black text-xs font-chakra">
              {winningNumber !== null ? (
                <span className="text-sm font-extrabold">{winningNumber}</span>
              ) : (
                <span>TK333</span>
              )}
            </div>
          </motion.div>
        </div>

        {/* Win/Loss Toast */}
        {lastWinAmount !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-2 px-4 py-1 rounded-full text-xs font-bold font-rajdhani border ${
              lastWinAmount > 0 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            {lastWinAmount > 0 ? `🎉 WON +৳${lastWinAmount.toLocaleString()}!` : 'NO WIN THIS ROUND'}
          </motion.div>
        )}
      </div>

      {/* Betting Board */}
      <div className="flex-1 px-3 py-2 space-y-2 overflow-y-auto no-scrollbar">
        {/* Outside Bets */}
        <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
          <button
            onClick={() => placeBet('low')}
            className={`py-2 rounded-lg border transition-all ${
              bets['low'] ? 'bg-blue-600 border-cyan-400 shadow-md' : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            1 - 18 {bets['low'] && <span className="block text-[10px] text-yellow-300">৳{bets['low']}</span>}
          </button>
          <button
            onClick={() => placeBet('even')}
            className={`py-2 rounded-lg border transition-all ${
              bets['even'] ? 'bg-blue-600 border-cyan-400 shadow-md' : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            EVEN {bets['even'] && <span className="block text-[10px] text-yellow-300">৳{bets['even']}</span>}
          </button>
          <button
            onClick={() => placeBet('red')}
            className={`py-2 rounded-lg border transition-all bg-rose-600 ${
              bets['red'] ? 'border-amber-400 shadow-[0_0_10px_rgba(244,63,94,0.6)]' : 'border-rose-700'
            }`}
          >
            RED (2x) {bets['red'] && <span className="block text-[10px] text-yellow-300">৳{bets['red']}</span>}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
          <button
            onClick={() => placeBet('black')}
            className={`py-2 rounded-lg border transition-all bg-slate-900 ${
              bets['black'] ? 'border-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.4)]' : 'border-slate-800'
            }`}
          >
            BLACK (2x) {bets['black'] && <span className="block text-[10px] text-yellow-300">৳{bets['black']}</span>}
          </button>
          <button
            onClick={() => placeBet('odd')}
            className={`py-2 rounded-lg border transition-all ${
              bets['odd'] ? 'bg-blue-600 border-cyan-400 shadow-md' : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            ODD {bets['odd'] && <span className="block text-[10px] text-yellow-300">৳{bets['odd']}</span>}
          </button>
          <button
            onClick={() => placeBet('high')}
            className={`py-2 rounded-lg border transition-all ${
              bets['high'] ? 'bg-blue-600 border-cyan-400 shadow-md' : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            19 - 36 {bets['high'] && <span className="block text-[10px] text-yellow-300">৳{bets['high']}</span>}
          </button>
        </div>

        {/* 0 and Numbers Grid */}
        <div className="space-y-1 mt-2">
          <button
            onClick={() => placeBet('num_0')}
            className={`w-full py-1.5 rounded-lg text-xs font-black bg-emerald-600 border ${
              bets['num_0'] ? 'border-amber-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'border-emerald-700'
            }`}
          >
            0 (36x) {bets['num_0'] && <span className="ml-2 text-yellow-300">৳{bets['num_0']}</span>}
          </button>

          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: 36 }, (_, i) => i + 1).map(num => {
              const key = `num_${num}`;
              const isRed = RED_NUMBERS.includes(num);
              return (
                <button
                  key={num}
                  onClick={() => placeBet(key)}
                  className={`py-1.5 rounded text-[11px] font-bold border transition-all relative ${
                    isRed ? 'bg-rose-600 border-rose-700' : 'bg-slate-900 border-slate-800'
                  } ${bets[key] ? 'ring-2 ring-amber-400 scale-[1.02]' : ''}`}
                >
                  {num}
                  {bets[key] && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[8px] font-black rounded-full px-1">
                      {bets[key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chip Selector & Spin Controls */}
      <div className="px-4 py-3 bg-[#0c1222] border-t border-blue-900/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {[20, 50, 100, 500].map(chip => (
              <button
                key={chip}
                onClick={() => {
                  haptics.selection();
                  setSelectedChip(chip);
                }}
                className={`w-10 h-10 rounded-full font-black text-xs flex items-center justify-center border-2 transition-all ${
                  selectedChip === chip 
                    ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-black border-white shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105' 
                    : 'bg-slate-800 text-slate-300 border-slate-600'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          <button
            onClick={clearBets}
            disabled={isSpinning || totalBet === 0}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg active:scale-95"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>

        <button
          onClick={spinWheel}
          disabled={isSpinning || totalBet === 0}
          className={`w-full py-3.5 rounded-xl font-black font-chakra text-base uppercase tracking-wider shadow-xl transition-all active:scale-[0.98] ${
            totalBet > 0 && !isSpinning
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          {isSpinning ? 'SPINNING WHEEL...' : `SPIN (TOTAL: ৳${totalBet})`}
        </button>
      </div>
    </div>
  );
}
