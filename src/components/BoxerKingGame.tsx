import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  ArrowLeft, 
  Zap, 
  Flame, 
  TrendingUp, 
  ShieldCheck,
  RefreshCw,
  Play,
  History as HistoryIcon,
  Coins,
  Star,
  Gift,
  Info
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { UserData } from '../types';
import { toBengaliNumber, formatBengaliCurrency } from '../utils';
import confetti from 'canvas-confetti';

interface BoxerKingGameProps {
  user: any;
  userData: UserData | null;
  onBack: () => void;
}

const SYMBOLS = [
  { id: 'king', name: 'KING', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-01.png', value: 100, weight: 10 },
  { id: 'master', name: 'MASTER', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-02.png', value: 60, weight: 10 },
  { id: 'glove_regular', name: 'GLOVE', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-03.png', value: 40, weight: 10 },
  { id: 'strike', name: 'STRIKE', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-04.png', value: 30, weight: 10 },
  { id: 'wild', name: 'WILD', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-05.png', value: 0, isWild: true, weight: 5 },
  // Rare Cards (Weight set low for rarity)
  { id: 'free_card', name: 'FREE', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-01.png', isFreeSpin: true, weight: 0.7 },
  { id: 'scatter', name: 'SCATTER', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-03.png', isScatter: true, weight: 0.5 },
  { id: 'bell', name: 'BELL', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-07.png', value: 20, weight: 10 },
  { id: 'q', name: 'Q', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-11.png', value: 10, weight: 12 },
  { id: 'j', name: 'J', img: 'https://clashofslots.com/wp-content/uploads/2023/09/boxing-king-12.png', value: 5, weight: 15 },
];

const BET_VALUES = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

const REEL_COUNT = 5;
const ROW_COUNT = 3;

export default function BoxerKingGame({ user, userData, onBack }: BoxerKingGameProps) {
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    audioRef.current = {
      bg: new Audio('https://assets.mixkit.co/music/preview/mixkit-arcade-retro-changing-223.mp3'),
      spin: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-mechanical-spin-wheel-1534.mp3'),
      win: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3'),
      bigWin: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-clapping-and-cheering-crowd-451.mp3'),
      freeSpin: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-magic-marimba-2820.mp3'),
      punch: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-boxing-punch-2051.mp3'),
      pop: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-pop-item-in-game-433.mp3')
    };
    audioRef.current.bg.loop = true;
    audioRef.current.bg.volume = 0.3;
    
    // Play background music on mount (user interaction required usually, but we can try)
    const playBg = () => {
      audioRef.current.bg.play().catch(() => {});
      window.removeEventListener('click', playBg);
    };
    window.addEventListener('click', playBg);

    return () => {
      Object.values(audioRef.current).forEach((a) => {
        const audio = a as HTMLAudioElement;
        audio.pause();
        audio.currentTime = 0;
      });
      window.removeEventListener('click', playBg);
    };
  }, []);

  const playSound = (key: string) => {
    const sound = audioRef.current[key];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  };

  const [bet, setBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [showBetPopup, setShowBetPopup] = useState(false);
  const [celebration, setCelebration] = useState<'free' | 'scatter' | null>(null);
  const [boxerAction, setBoxerAction] = useState<'idle' | 'punch' | 'win'>('idle');
  const [reels, setReels] = useState<any[][]>([]);
  const [winningCells, setWinningCells] = useState<boolean[][]>(Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false)));
  const [isPopping, setIsPopping] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [showBigWin, setShowBigWin] = useState(false);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [freeSpins, setFreeSpins] = useState(0);

  const [showError, setShowError] = useState<string | null>(null);

  const getRandomSymbol = () => {
    const totalWeight = SYMBOLS.reduce((acc, s) => acc + s.weight, 0);
    let random = Math.random() * totalWeight;
    for (const s of SYMBOLS) {
      if (random < s.weight) return s;
      random -= s.weight;
    }
    return SYMBOLS[SYMBOLS.length - 1];
  };

  // Initialize reels
  useEffect(() => {
    const initialReels = Array(REEL_COUNT).fill(null).map(() => 
      Array(ROW_COUNT).fill(null).map(() => getRandomSymbol())
    );
    setReels(initialReels);
  }, []);

  const handleSpin = useCallback(async () => {
    if (!user || !userData || isSpinning) return;
    if (bet > userData.balance && freeSpins === 0) {
      setShowError('আপনার ব্যালেন্স পর্যাপ্ত নয়!');
      setTimeout(() => setShowError(null), 3000);
      setIsAuto(false);
      return;
    }

    setIsSpinning(true);
    setShowBigWin(false);
    setCelebration(null);
    setWinAmount(0);
    setBoxerAction('idle');
    setWinningCells(Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false)));
    playSound('spin');

    // Deduct bet if not free spin
    if (freeSpins === 0) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(-bet),
          turnover: increment(bet)
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'users');
        setIsSpinning(false);
        return;
      }
    } else {
      setFreeSpins(prev => prev - 1);
    }

    const spinDuration = isTurbo ? 600 : 1500;

    // Spin Logic
    setTimeout(async () => {
      const newReels = Array(REEL_COUNT).fill(null).map(() => 
        Array(ROW_COUNT).fill(null).map(() => getRandomSymbol())
      );
      setReels(newReels);

      let currentWin = 0;
      const newWinningCells = Array(REEL_COUNT).fill(null).map(() => Array(ROW_COUNT).fill(false));
      
      // 1. Regular Win Detection
      for (let r = 0; r < ROW_COUNT; r++) {
        const first = newReels[0][r];
        let matchCount = 1;
        for (let c = 1; c < REEL_COUNT; c++) {
          if (newReels[c][r].id === first.id || newReels[c][r].isWild || first.isWild) matchCount++;
          else break;
        }
        if (matchCount >= 3 && first.value) {
          currentWin += first.value * matchCount * (bet / 10);
          for (let c = 0; c < matchCount; c++) newWinningCells[c][r] = true;
        }
      }

      if (currentWin > 0) {
        setWinningCells(newWinningCells);
        playSound('win');
        setBoxerAction('punch');
        playSound('punch');
        
        await new Promise(r => setTimeout(r, 800));
        setIsPopping(true);
        playSound('pop');
        await new Promise(r => setTimeout(r, 400));
        setIsPopping(false);

        setWinAmount(currentWin);
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            balance: increment(currentWin)
          });

          if (currentWin >= bet * 10) {
            playSound('bigWin');
            setShowBigWin(true);
            setBoxerAction('win');
            confetti({ 
              particleCount: 250, 
              spread: 100, 
              origin: { y: 0.6 } 
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'users');
        }
      }

      // 2. Special Card Logic (Free Spin / Scatter)
      let freeCardCount = 0;
      let scatterCount = 0;
      newReels.forEach(col => col.forEach(s => {
        if (s.isFreeSpin) freeCardCount++;
        if (s.isScatter) scatterCount++;
      }));

      if (freeCardCount >= 3) {
        setCelebration('free');
        playSound('freeSpin');
        const spins = freeCardCount === 3 ? 5 : freeCardCount === 4 ? 7 : 10;
        setTimeout(() => {
          setFreeSpins(f => f + spins);
          setCelebration(null);
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#fbbf24', '#d97706', '#ffffff']
          });
        }, 3000);
      } else if (scatterCount >= 3) {
        setCelebration('scatter');
        playSound('freeSpin');
        const spins = scatterCount >= 5 ? 15 : 10;
        setTimeout(() => {
          setFreeSpins(f => f + spins);
          setCelebration(null);
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#fbbf24', '#d97706', '#ffffff']
          });
        }, 3000);
      }

      // Log bet
      try {
        await addDoc(collection(db, 'bets'), {
          uid: user.uid,
          gameName: 'Boxer King Pro',
          amount: freeSpins > 0 ? 0 : bet,
          profit: currentWin - (freeSpins > 0 ? 0 : bet),
          status: currentWin > 0 ? 'win' : 'loss',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Error logging bet:', err);
      }

      setGameHistory(prev => [
        { id: Date.now(), amount: bet, win: currentWin, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9)
      ]);

      setIsSpinning(false);
    }, spinDuration);
  }, [user, userData, isSpinning, bet, freeSpins, isTurbo]);

  useEffect(() => {
    if (isAuto && !isSpinning) {
      const timer = setTimeout(handleSpin, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuto, isSpinning, handleSpin]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-hidden flex flex-col font-sans select-none" onClick={() => audioRef.current.bg?.play().catch(() => {})}>
      {/* Error Toast */}
      <AnimatePresence>
        {showError && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-4"
          >
            <div className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold shadow-2xl border border-red-400/50 backdrop-blur-md">
              {showError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Button */}
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 z-[60] p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-all"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Bet Selection Popup */}
      <AnimatePresence>
        {showBetPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-end justify-center"
            onClick={() => setShowBetPopup(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-zinc-900 border-t border-red-900/50 p-6 rounded-t-[40px] w-full max-w-[500px] shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6 opacity-50" />
              <h3 className="text-2xl font-black mb-8 text-center text-red-500 italic tracking-widest">SELECT YOUR BET</h3>
              <div className="grid grid-cols-3 gap-4">
                {BET_VALUES.map(v => (
                  <button
                    key={v}
                    onClick={() => { setBet(v); setShowBetPopup(false); }}
                    className={`py-4 rounded-2xl font-black text-xl transition-all border-2 ${bet === v ? 'bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] scale-105' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                    {toBengaliNumber(v)}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowBetPopup(false)}
                className="w-full mt-8 py-4 bg-zinc-800 rounded-2xl font-black text-zinc-500 hover:text-white transition-colors tracking-widest"
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-screen w-full flex justify-center items-center p-2 bg-black">
        <div className="w-full h-full max-w-[500px] bg-[#0a0010] relative overflow-hidden flex flex-col border-2 border-red-900/50 rounded-[32px] shadow-2xl">
          
          {/* Boxer Area */}
          <div className="flex-1 relative flex items-end justify-center">
            <motion.div 
              animate={
                boxerAction === 'punch' ? { x: [0, 20, 0], scale: 1.1 } :
                boxerAction === 'win' ? { y: [0, -30, 0], scale: 1.2 } :
                isSpinning ? { y: [0, -10, 0] } : { y: [0, -5, 0] }
              }
              transition={{ 
                duration: boxerAction === 'punch' ? 0.2 : 2, 
                repeat: boxerAction === 'idle' || isSpinning ? Infinity : 0 
              }}
              className="w-full h-full flex items-end justify-center"
            >
              <img 
                src="https://supremeking.live/wp-content/uploads/2024/08/picks-image.png" 
                className="w-full h-[90%] object-contain object-bottom drop-shadow-[0_20px_60px_rgba(255,0,0,0.8)]" 
                referrerPolicy="no-referrer"
              />
              {boxerAction === 'punch' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }} 
                  animate={{ opacity: 1, scale: 2 }} 
                  className="absolute top-1/2 text-6xl font-black text-yellow-500 italic z-20"
                >
                  POW!
                </motion.div>
              )}
            </motion.div>

            <AnimatePresence>
              {celebration && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-center p-6"
                >
                  <motion.h2 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ repeat: Infinity, duration: 0.5 }} 
                    className="text-6xl font-black italic text-yellow-500 uppercase drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                  >
                    {celebration === 'free' ? 'FREE SPINS!' : 'SCATTER WIN!'}
                  </motion.h2>
                  <p className="text-xl mt-4 text-white uppercase tracking-widest font-bold">PREPARE FOR THE NEXT ROUND!</p>
                  <div className="mt-8 w-24 h-24 bg-red-600 rounded-full flex items-center justify-center animate-bounce text-4xl shadow-[0_0_30px_rgba(220,38,38,0.6)]">🥊</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Big Win Celebration Overlay */}
            <AnimatePresence>
              {showBigWin && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: 'spring' }} 
                    className="text-center"
                  >
                    <motion.h2 
                      animate={{ scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] }} 
                      transition={{ repeat: Infinity, duration: 0.4 }}
                      className="text-6xl sm:text-8xl font-black italic uppercase tracking-tighter big-win-title drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    >
                      MEGA WIN!
                    </motion.h2>
                    <motion.div 
                      animate={{ y: [0, -20, 0] }} 
                      transition={{ repeat: Infinity, duration: 0.6 }} 
                      className="text-5xl sm:text-7xl font-black text-white mt-10 drop-shadow-2xl"
                    >
                      ৳{formatBengaliCurrency(winAmount)}
                    </motion.div>
                    <button 
                      onClick={() => setShowBigWin(false)} 
                      className="mt-12 bg-gradient-to-r from-red-600 to-orange-600 px-16 py-4 rounded-full font-black text-2xl tracking-widest shadow-2xl active:scale-95 transition-transform border-b-4 border-red-800"
                    >
                      COLLECT
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Slot Grid */}
          <div className="px-4 py-3 bg-zinc-950/90 backdrop-blur-xl border-t border-red-900/20">
            <div className="grid grid-cols-5 gap-1.5 bg-black p-2 rounded-2xl border-2 border-zinc-800 relative shadow-inner">
              {reels.map((reel, c) => (
                <div key={c} className="flex flex-col gap-1.5 overflow-hidden h-48 reel-container">
                  <motion.div 
                    animate={isSpinning ? { y: [-1000, 0] } : { y: 0 }}
                    transition={{ repeat: isSpinning ? Infinity : 0, duration: 0.1, ease: "linear" }}
                    className={isSpinning ? 'reel-blur' : ''}
                  >
                    {reel.map((s, r) => (
                      <div 
                        key={r} 
                        className={`h-16 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${winningCells[c][r] ? (isPopping ? 'symbol-pop' : 'win-glow bg-yellow-400/20 border-yellow-500/50') : 'border-white/5 bg-zinc-900'}`}
                      >
                        <img 
                          src={s.img} 
                          className="w-12 h-12 object-contain drop-shadow-md" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* Control Panel */}
          <div className="p-6 bg-gradient-to-t from-black to-zinc-900 border-t border-zinc-800">
            <div className="flex justify-between items-center mb-6 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-inner">
              <div className="text-center">
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Balance</p>
                <p className="text-yellow-500 font-black text-xl">৳{userData ? formatBengaliCurrency(userData.balance) : toBengaliNumber(0)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Win</p>
                <p className="text-emerald-400 font-black text-xl">৳{toBengaliNumber(winAmount)}</p>
              </div>
              <div className="text-center cursor-pointer active:scale-95 transition-transform group" onClick={() => setShowBetPopup(true)}>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Bet</p>
                <div className="relative">
                  <p className="text-white font-black text-xl">{toBengaliNumber(bet)}</p>
                  <motion.p 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-[8px] text-red-500 font-bold whitespace-nowrap"
                  >
                    পরিবর্তন করতে চাপুন
                  </motion.p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center items-center gap-6">
              <button 
                onClick={() => setIsTurbo(!isTurbo)} 
                className={`px-4 py-2 rounded-lg font-black text-[10px] border-2 transition-all tracking-widest ${isTurbo ? 'bg-orange-500 border-orange-300 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
              >
                TURBO
              </button>

              <button 
                onClick={() => setBet(b => Math.max(10, b - 10))} 
                disabled={isSpinning}
                className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 font-black text-xl flex items-center justify-center hover:bg-zinc-700 active:scale-90 transition-all disabled:opacity-50 text-zinc-400"
              >
                -
              </button>
              
              <motion.button 
                whileTap={{ scale: 0.9 }} 
                onClick={handleSpin} 
                disabled={isSpinning} 
                className={`w-24 h-24 rounded-full font-black text-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] border-4 border-red-400 transition-all ${isSpinning ? 'bg-zinc-700 grayscale' : 'bg-gradient-to-br from-red-500 to-red-800 hover:scale-105 active:shadow-none'}`}
              >
                {freeSpins > 0 ? (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl">{toBengaliNumber(freeSpins)}</span>
                    <span className="text-[10px] opacity-70">FREE</span>
                  </div>
                ) : (
                  isSpinning ? '...' : 'SPIN'
                )}
              </motion.button>
              
              <button 
                onClick={() => setBet(b => b + 10)} 
                disabled={isSpinning}
                className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 font-black text-xl flex items-center justify-center hover:bg-zinc-700 active:scale-90 transition-all disabled:opacity-50 text-zinc-400"
              >
                +
              </button>

              <button 
                onClick={() => setIsAuto(!isAuto)} 
                className={`px-4 py-2 rounded-lg font-black text-[10px] border-2 transition-all tracking-widest ${isAuto ? 'bg-emerald-500 border-emerald-300 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
              >
                AUTO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
