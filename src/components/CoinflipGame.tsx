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
  Coins
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { haptics } from '../utils/haptics';
import { generateCoinflipOutcome } from '../services/gameProbabilityService';

interface CoinflipGameProps {
  user: User | null;
  userData: UserData | null;
  onBack: () => void;
}

export default function CoinflipGame({ user, userData, onBack }: CoinflipGameProps) {
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [betAmount, setBetAmount] = useState<number>(100);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [flipRotation, setFlipRotation] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [history, setHistory] = useState<('heads' | 'tails')[]>(['heads', 'tails', 'heads', 'heads']);
  const [lastWin, setLastWin] = useState<boolean | null>(null);

  const flipSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const lossSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    flipSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
    winSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
    lossSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3');
  }, []);

  const playSfx = (audio: HTMLAudioElement | null) => {
    if (!isMuted && audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  const handleFlip = async () => {
    if (isFlipping || !user || !userData) return;
    if (userData.balance < betAmount) {
      haptics.error();
      alert('Insufficient balance! Please deposit to play.');
      return;
    }

    haptics.medium();

    try {
      // Deduct bet
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-betAmount),
        turnover: increment(betAmount)
      });

      setIsFlipping(true);
      setLastWin(null);
      setResult(null);
      playSfx(flipSound.current);

      // Authoritative outcome based on centralized Global Win Probability (Fixed 5%)
      const { outcome, won } = generateCoinflipOutcome(selectedSide);

      // Animate rotation (at least 5 full 360 flips + side orientation)
      const targetDeg = 360 * 6 + (outcome === 'tails' ? 180 : 0);
      setFlipRotation(prev => prev + targetDeg);

      setTimeout(async () => {
        setIsFlipping(false);
        setResult(outcome);
        setLastWin(won);
        setHistory(prev => [outcome, ...prev.slice(0, 5)]);

        const multiplier = 1.96;
        const winAmount = won ? Math.floor(betAmount * multiplier) : 0;
        const profit = won ? winAmount - betAmount : -betAmount;

        if (won) {
          haptics.win();
          setStreak(s => s + 1);
          playSfx(winSound.current);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        } else {
          haptics.heavy();
          setStreak(0);
          playSfx(lossSound.current);
        }

        try {
          if (won) {
            await updateDoc(doc(db, 'users', user.uid), {
              balance: increment(winAmount)
            });
          }

          await addDoc(collection(db, 'bets'), {
            uid: user.uid,
            gameName: 'TK333 Coinflip',
            amount: betAmount,
            profit: profit,
            status: won ? 'win' : 'loss',
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'users');
        }
      }, 2000);

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
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
          <span className="font-chakra font-bold text-sm gold-gradient-text tracking-wider">TK333 COINFLIP</span>
        </div>

        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="p-1.5 bg-slate-800/80 rounded-lg text-slate-300 border border-slate-700"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </header>

      {/* Balance & Streak Bar */}
      <div className="px-4 py-2 bg-[#090f1d] border-b border-blue-950/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Wallet size={14} className="text-emerald-400" />
          <span>Balance:</span>
          <span className="font-bold text-emerald-400 font-rajdhani text-sm">
            ৳{userData?.balance?.toLocaleString() || 0}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-amber-400 font-bold">STREAK: {streak}🔥</span>
          <div className="flex items-center gap-1">
            {history.map((h, idx) => (
              <span 
                key={idx} 
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  h === 'heads' ? 'bg-amber-500 text-black' : 'bg-cyan-500 text-black'
                }`}
              >
                {h === 'heads' ? 'H' : 'T'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Coin Animation Stage */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 px-4">
        <div className="relative w-40 h-40 flex items-center justify-center [perspective:1000px]">
          <motion.div
            animate={{ rotateY: flipRotation }}
            transition={{ duration: 2, ease: [0.2, 0.8, 0.2, 1] }}
            className="w-36 h-36 rounded-full relative [transform-style:preserve-3d] shadow-[0_0_40px_rgba(245,158,11,0.35)]"
          >
            {/* Heads (Front) */}
            <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 border-4 border-yellow-200 flex flex-col items-center justify-center text-black font-black [backface-visibility:hidden]">
              <Coins size={36} className="text-black/80 drop-shadow" />
              <span className="font-chakra text-lg font-black tracking-wider mt-1">HEADS</span>
              <span className="text-[9px] font-bold text-black/70">TK333 VIP</span>
            </div>

            {/* Tails (Back) */}
            <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-700 border-4 border-cyan-200 flex flex-col items-center justify-center text-black font-black [transform:rotateY(180deg)] [backface-visibility:hidden]">
              <Coins size={36} className="text-black/80 drop-shadow" />
              <span className="font-chakra text-lg font-black tracking-wider mt-1">TAILS</span>
              <span className="text-[9px] font-bold text-black/70">TK333 VIP</span>
            </div>
          </motion.div>
        </div>

        {/* Win/Loss Result Text */}
        <div className="h-10 mt-4 flex items-center justify-center">
          {lastWin !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`px-5 py-1.5 rounded-full font-rajdhani font-black text-sm border ${
                lastWin 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.5)]' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {lastWin ? `🎉 YOU WON +৳${Math.floor(betAmount * 1.96).toLocaleString()}!` : '❌ LOST THIS FLIP'}
            </motion.div>
          )}
        </div>

        {/* Multiplier Tag */}
        <div className="text-center mt-2">
          <span className="text-xs text-slate-400 font-medium">Win Payout: </span>
          <span className="text-sm font-bold text-amber-400 font-rajdhani">1.96x Bet</span>
        </div>
      </div>

      {/* Side Selection & Bet Controls */}
      <div className="px-4 py-4 bg-[#0c1222] border-t border-blue-900/40 space-y-3">
        {/* Choose Side */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              haptics.selection();
              setSelectedSide('heads');
            }}
            disabled={isFlipping}
            className={`py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-black font-chakra transition-all ${
              selectedSide === 'heads'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 border-yellow-200 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-[1.02]'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Coins size={18} /> HEADS
          </button>

          <button
            onClick={() => {
              haptics.selection();
              setSelectedSide('tails');
            }}
            disabled={isFlipping}
            className={`py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-black font-chakra transition-all ${
              selectedSide === 'tails'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-600 border-cyan-200 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)] scale-[1.02]'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Coins size={18} /> TAILS
          </button>
        </div>

        {/* Bet Amount Chips */}
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Bet Amount (BDT)</label>
          <div className="grid grid-cols-4 gap-2">
            {[50, 100, 200, 500].map(b => (
              <button
                key={b}
                onClick={() => {
                  haptics.selection();
                  setBetAmount(b);
                }}
                disabled={isFlipping}
                className={`py-2 rounded-xl text-xs font-bold font-rajdhani border transition-all ${
                  betAmount === b
                    ? 'bg-amber-500 text-black font-black border-amber-300 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ৳{b}
              </button>
            ))}
          </div>
        </div>

        {/* Flip Button */}
        <button
          onClick={handleFlip}
          disabled={isFlipping}
          className={`w-full py-3.5 rounded-xl font-black font-chakra text-base uppercase tracking-wider shadow-xl transition-all active:scale-[0.98] ${
            !isFlipping
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          {isFlipping ? 'FLIPPING COIN...' : `FLIP COIN (৳${betAmount})`}
        </button>
      </div>
    </div>
  );
}
