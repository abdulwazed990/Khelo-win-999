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
  Coins, 
  Flame, 
  History, 
  Crown, 
  ShieldCheck 
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { haptics } from '../utils/haptics';
import { generateCoinflipOutcome } from '../services/gameProbabilityService';
import { formatBDT } from '../config/currency';

interface CoinflipGameProps {
  user: User | null;
  userData: UserData | null;
  onBack: () => void;
}

export default function CoinflipGame({ user, userData, onBack }: CoinflipGameProps) {
  const [balance, setBalance] = useState<number>(() => userData?.balance ?? 500);
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [betAmount, setBetAmount] = useState<number>(100);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [flipRotation, setFlipRotation] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [history, setHistory] = useState<('heads' | 'tails')[]>(['heads', 'tails', 'heads', 'heads', 'tails']);
  const [lastWin, setLastWin] = useState<boolean | null>(null);

  const flipSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const lossSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (userData?.balance !== undefined) {
      setBalance(userData.balance);
    }
  }, [userData?.balance]);

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

  const multiplier = 1.96;
  const potentialPayout = Math.floor(betAmount * multiplier);
  const potentialProfit = potentialPayout - betAmount;

  const handleFlip = async () => {
    if (isFlipping || !user || !userData) return;
    if (balance < betAmount) {
      haptics.error();
      alert('Insufficient balance! Please deposit to play.');
      return;
    }

    haptics.medium();

    try {
      // Optimistic balance deduction
      setBalance(prev => Math.max(0, prev - betAmount));

      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-betAmount),
        turnover: increment(betAmount)
      });

      setIsFlipping(true);
      setLastWin(null);
      setResult(null);
      playSfx(flipSound.current);

      // Authoritative outcome based on centralized Global Win Probability
      const { outcome, won } = generateCoinflipOutcome(selectedSide);

      // Realistic 3D rotation: 6 full flips (2160 deg) plus target side orientation
      const targetDeg = 360 * 6 + (outcome === 'tails' ? 180 : 0);
      setFlipRotation(prev => prev + targetDeg);

      setTimeout(async () => {
        setIsFlipping(false);
        setResult(outcome);
        setLastWin(won);
        setHistory(prev => [outcome, ...prev.slice(0, 7)]);

        const winAmount = won ? potentialPayout : 0;
        const profit = won ? potentialProfit : -betAmount;

        if (won) {
          haptics.win();
          setStreak(s => s + 1);
          setBalance(prev => prev + winAmount);
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

  const quickBets = [20, 50, 100, 200, 500, 1000];

  return (
    <div className="min-h-screen bg-[#070b14] text-white font-sans flex flex-col max-w-4xl mx-auto border-x border-slate-800/80 select-none shadow-2xl">
      {/* 1. Header Bar */}
      <header className="px-4 sm:px-6 py-3 bg-[#0b1120] border-b border-slate-800 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-chakra font-black active:scale-95 transition-all"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">EXIT</span>
          </button>

          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-xl">
            <Coins size={15} className="text-amber-400" />
            <span className="font-chakra font-black text-sm tracking-wider bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent uppercase">
              TK333 ROYAL COINFLIP
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

      {/* 2. Streak & Live Flips Ribbon */}
      <div className="bg-[#090e1a] px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-chakra font-bold text-slate-400 uppercase flex items-center gap-1">
            <History size={13} />
            HISTORY:
          </span>
          <div className="flex items-center gap-1.5">
            {history.map((side, idx) => (
              <span
                key={idx}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black uppercase border shadow-sm ${
                  side === 'heads'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                }`}
              >
                {side === 'heads' ? 'H' : 'T'}
              </span>
            ))}
          </div>
        </div>

        {/* Win Streak Indicator */}
        <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
          <Flame size={14} className={streak > 0 ? 'text-orange-500 animate-pulse' : 'text-slate-600'} />
          <span className="text-[11px] font-mono text-slate-400">Streak:</span>
          <span className="font-rajdhani font-black text-amber-400 text-sm">{streak}W</span>
        </div>
      </div>

      {/* 3. Main Stage: 3D Flipping Arena & Betting Dock */}
      <div className="flex-1 p-4 sm:p-8 flex flex-col items-center justify-center space-y-6">
        {/* 3D Coin Arena */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center perspective-[1000px]">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

          {/* 3D Coin Element */}
          <motion.div
            animate={{ rotateY: flipRotation }}
            transition={{ duration: 2, ease: [0.25, 1, 0.5, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
            className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full relative cursor-pointer shadow-2xl transition-transform ${
              isFlipping ? 'scale-110' : 'hover:scale-102'
            }`}
          >
            {/* FRONT SIDE: HEADS (Regal Gold Sovereign) */}
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-700 p-2 shadow-inner border-4 border-amber-300 flex flex-col items-center justify-center backface-hidden text-black"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="w-full h-full rounded-full border-2 border-amber-600/60 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 flex flex-col items-center justify-center p-3 shadow-inner">
                <Crown size={52} className="text-amber-950 drop-shadow-md mb-1" />
                <span className="font-chakra font-black text-xl tracking-wider text-amber-950 uppercase drop-shadow-sm">
                  HEADS
                </span>
                <span className="text-[9px] font-bold font-mono tracking-widest text-amber-900/80 uppercase">
                  TK333 SOVEREIGN
                </span>
              </div>
            </div>

            {/* BACK SIDE: TAILS (Sterling Silver & Platinum Phoenix) */}
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200 via-cyan-200 to-slate-400 p-2 shadow-inner border-4 border-slate-300 flex flex-col items-center justify-center text-slate-900"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="w-full h-full rounded-full border-2 border-slate-500/60 bg-gradient-to-tr from-slate-300 via-white to-cyan-200 flex flex-col items-center justify-center p-3 shadow-inner">
                <Sparkles size={52} className="text-blue-950 drop-shadow-md mb-1" />
                <span className="font-chakra font-black text-xl tracking-wider text-blue-950 uppercase drop-shadow-sm">
                  TAILS
                </span>
                <span className="text-[9px] font-bold font-mono tracking-widest text-blue-900/80 uppercase">
                  TK333 PLATINUM
                </span>
              </div>
            </div>
          </motion.div>

          {/* Dropped Shadow underneath coin */}
          <div
            className={`absolute -bottom-4 w-40 h-4 bg-black/60 rounded-full blur-md transition-all duration-500 ${
              isFlipping ? 'scale-75 opacity-30' : 'scale-100 opacity-70'
            }`}
          />
        </div>

        {/* Outcome Display Announcement */}
        {result && !isFlipping && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`px-6 py-2 rounded-2xl border text-center font-chakra font-black ${
              lastWin
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                : 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.5)]'
            }`}
          >
            <span className="text-xs uppercase tracking-wider block">
              RESULT: {result.toUpperCase()}
            </span>
            <span className="font-rajdhani text-lg">
              {lastWin ? `+${formatBDT(potentialPayout)} (Profit: +${formatBDT(potentialProfit)})` : `-${formatBDT(betAmount)}`}
            </span>
          </motion.div>
        )}

        {/* 4. Betting Panel & Side Selector */}
        <div className="w-full max-w-lg bg-[#0f172a] rounded-3xl border border-slate-800 p-4 sm:p-6 space-y-5 shadow-2xl">
          {/* Side Pick Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={isFlipping}
              onClick={() => {
                haptics.selection();
                setSelectedSide('heads');
              }}
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 transition-all ${
                selectedSide === 'heads'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-102'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Crown size={20} className={selectedSide === 'heads' ? 'text-amber-400' : 'text-slate-500'} />
              <div className="text-left">
                <span className="font-chakra font-black text-sm block">HEADS (রাজা)</span>
                <span className="text-[10px] font-mono text-slate-400">Payout 1.96x</span>
              </div>
            </button>

            <button
              disabled={isFlipping}
              onClick={() => {
                haptics.selection();
                setSelectedSide('tails');
              }}
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 transition-all ${
                selectedSide === 'tails'
                  ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-102'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Sparkles size={20} className={selectedSide === 'tails' ? 'text-cyan-400' : 'text-slate-500'} />
              <div className="text-left">
                <span className="font-chakra font-black text-sm block">TAILS (পাখি)</span>
                <span className="text-[10px] font-mono text-slate-400">Payout 1.96x</span>
              </div>
            </button>
          </div>

          {/* Amount Stepper & Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-chakra font-black text-slate-300">
              <span>BET AMOUNT</span>
              <span className="font-rajdhani font-black text-emerald-400 text-base">৳{betAmount}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-900 rounded-xl border border-slate-700/80 p-1">
              <button
                disabled={isFlipping}
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
                  disabled={isFlipping}
                  value={betAmount}
                  onChange={e => setBetAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                  className="bg-transparent text-center font-rajdhani font-black text-lg text-white w-24 outline-none disabled:opacity-50"
                />
              </div>

              <button
                disabled={isFlipping}
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
                  disabled={isFlipping}
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

          {/* Telemetry Breakdown: Payout vs Net Profit */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Return</span>
              <span className="font-rajdhani font-black text-white text-base">৳{potentialPayout}</span>
            </div>
            <div className="text-right">
              <span className="text-emerald-400 block text-[10px] uppercase font-bold">Guaranteed Profit</span>
              <span className="font-rajdhani font-black text-emerald-400 text-base">+৳{potentialProfit}</span>
            </div>
          </div>

          {/* Action Flip Button */}
          <button
            disabled={isFlipping}
            onClick={handleFlip}
            className={`w-full py-4 rounded-2xl font-chakra font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl active:scale-98 transition-all ${
              isFlipping
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer'
            }`}
          >
            {isFlipping ? (
              <div className="flex items-center gap-2">
                <RotateCw size={18} className="animate-spin" />
                <span>FLIPPING COIN IN AIR...</span>
              </div>
            ) : (
              <span>FLIP COIN (৳{betAmount})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
