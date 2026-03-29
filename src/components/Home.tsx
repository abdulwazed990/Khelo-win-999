import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserData } from '../types';
import { toBengaliNumber, formatBengaliCurrency } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, 
  TrendingUp, 
  Zap, 
  Star, 
  Flame, 
  Trophy, 
  ChevronRight,
  Play,
  Lock,
  Gift,
  RefreshCw,
  XCircle
} from 'lucide-react';
import Auth from './Auth';
import PromoPopup from './PromoPopup';

import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface HomeProps {
  user: User | null;
  userData: UserData | null;
  setCurrentPage: (page: any) => void;
  onAuthTrigger: (mode: 'login' | 'signup') => void;
}

export default function Home({ user, userData, setCurrentPage, onAuthTrigger }: HomeProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [playingGame, setPlayingGame] = useState<any>(null);
  const [betAmount, setBetAmount] = useState('10');

  const handlePlayGame = async (game: any) => {
    console.log('handlePlayGame called', game);
    if (!user || !userData) {
      console.log('User or userData missing', { user: !!user, userData: !!userData });
      return;
    }
    if (game.id === 1) {
      console.log('Setting page to aviator-jet');
      setCurrentPage('aviator-jet');
    } else if (game.id === 7) {
      console.log('Setting page to game');
      setCurrentPage('game');
    } else if (game.id === 8) {
      console.log('Setting page to pokie-super-ace');
      setCurrentPage('pokie-super-ace');
    } else {
      console.log('Setting playingGame', game.name);
      setPlayingGame(game);
    }
  };

  const handleBet = async () => {
    if (!user || !userData || !playingGame) return;
    const amount = Number(betAmount);
    if (amount > userData.balance) {
      alert('Insufficient balance!');
      return;
    }

    try {
      // Simple win/loss logic (50/50)
      const isWin = Math.random() > 0.5;
      const profit = isWin ? amount : -amount;

      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(profit),
        turnover: increment(amount)
      });

      // Add to history
      await addDoc(collection(db, 'bets'), {
        uid: user.uid,
        gameName: playingGame.name,
        amount: amount,
        profit: profit,
        status: isWin ? 'win' : 'loss',
        createdAt: serverTimestamp()
      });

      alert(isWin ? `You won ৳${amount}!` : `You lost ৳${amount}.`);
      setPlayingGame(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const bannerImages = [
    {
      url: "https://images.pexels.com/photos/18739724/pexels-photo-18739724.jpeg?auto=compress&cs=tinysrgb&w=1920",
      title: "লগইন করলেই ২৩০০ টাকা বোনাস!",
      subtitle: "এখনই যোগ দিন এবং আপনার ওয়েলকাম বোনাস দাবি করুন",
      cta: "বোনাস নিন",
      position: "center 35%"
    },
    {
      url: "https://images.pexels.com/photos/2701275/pexels-photo-2701275.jpeg?auto=compress&cs=tinysrgb&w=1920",
      title: "লাইভ ক্যাসিনো স্টুডিও",
      subtitle: "সেরা ডিলারদের সাথে খেলুন এবং জিতুন আনলিমিটেড",
      cta: "খেলুন এখন",
      position: "center 40%"
    },
    {
      url: "https://images.pexels.com/photos/14771683/pexels-photo-14771683.jpeg?auto=compress&cs=tinysrgb&w=1920",
      title: "বিশাল জয়ের মহোৎসব",
      subtitle: "প্রতিদিন জিতুন আকর্ষণীয় পুরস্কার এবং মেগা জ্যাকপট",
      cta: "অংশ নিন",
      position: "center 45%"
    },
    {
      url: "https://images.pexels.com/photos/11483296/pexels-photo-11483296.jpeg?auto=compress&cs=tinysrgb&w=1920",
      title: "ভিআইপি মেম্বারশিপ",
      subtitle: "এক্সক্লুসিভ সুবিধা এবং স্পেশাল রিওয়ার্ড উপভোগ করুন",
      cta: "যোগ দিন",
      position: "center 35%"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIsImageLoaded(false);
      setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length);
    }, 6000);

    // Show promo popup on mount
    const promoTimer = setTimeout(() => {
      setShowPromo(true);
    }, 1000);

    return () => {
      clearInterval(timer);
      clearTimeout(promoTimer);
    };
  }, [bannerImages.length]);

  const categories = [
    { id: 'hot', name: 'Hot Games', icon: <Flame className="text-orange-500" /> },
    { id: 'slots', name: 'Slot Games', icon: <Zap className="text-yellow-500" /> },
    { id: 'crash', name: 'Crash Games', icon: <TrendingUp className="text-red-500" /> },
  ];

  const games = [
    { id: 1, name: 'Aviator Jet', category: 'crash', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpKjTKvw4mF4Svf4auEcum45bF7CEIGJpJ0KmxDdK3ryOdClwFBnc0WxjP&s=10', players: '12.5k' },
    { id: 2, name: 'Sweet Bonanza', category: 'slots', image: 'https://picsum.photos/seed/slots1/400/300', players: '800' },
    { id: 3, name: 'Gates of Olympus', category: 'slots', image: 'https://picsum.photos/seed/slots2/400/300', players: '2.5k' },
    { id: 4, name: 'Crazy Time', category: 'hot', image: 'https://picsum.photos/seed/hot1/400/300', players: '5k' },
    { id: 5, name: 'Plinko', category: 'hot', image: 'https://picsum.photos/seed/hot2/400/300', players: '1.5k' },
    { id: 6, name: 'Mines', category: 'crash', image: 'https://picsum.photos/seed/crash2/400/300', players: '900' },
    { id: 7, name: 'Boxer King pro', category: 'hot', image: 'https://assets.slotslaunch.com/11342/552x380_EN_GAMEID_77.png', players: '3.8k' },
    { id: 8, name: 'Pokie Super Ace', category: 'slots', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWE2t3sqSfrhEKxAXVSMCyWCKt1C7Fbftinw&s', players: '10.5k' },
  ];

  const ads = [
    { id: 1, title: '৳2300 Welcome Bonus!', description: 'Sign up today and get ৳2300 instantly in your wallet.', image: 'https://picsum.photos/seed/ad1/800/400' },
    { id: 2, title: 'Daily Captcha Rewards', description: 'Complete simple captchas and earn up to ৳15 daily.', image: 'https://picsum.photos/seed/ad2/800/400' },
  ];

  return (
    <div className="space-y-12">
      {/* Hero / Cover Photo Slider */}
      <section className="relative aspect-[16/10] sm:aspect-[21/9] md:aspect-[21/7] rounded-[32px] overflow-hidden bg-black shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: isImageLoaded ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={bannerImages[currentImageIndex].url}
              alt={bannerImages[currentImageIndex].title}
              onLoad={() => setIsImageLoaded(true)}
              className="w-full h-full object-cover"
              style={{ objectPosition: bannerImages[currentImageIndex].position }}
              referrerPolicy="no-referrer"
            />
            {isImageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent flex flex-col justify-center px-6 sm:px-12 md:px-20 space-y-4 overflow-hidden">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="w-fit shrink-0"
                >
                  <div className="bg-yellow-500/20 backdrop-blur-xl border border-yellow-500/40 text-yellow-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-2xl">
                    Exclusive Reward
                  </div>
                </motion.div>
                <div className="max-w-xl sm:max-w-2xl space-y-4 shrink-0">
                  <motion.h2 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] drop-shadow-2xl break-words"
                  >
                    {bannerImages[currentImageIndex].title}
                  </motion.h2>
                  <motion.p 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-xs sm:text-base md:text-lg text-gray-200 max-w-md font-bold leading-relaxed drop-shadow-lg line-clamp-3 sm:line-clamp-none"
                  >
                    {bannerImages[currentImageIndex].subtitle}
                  </motion.p>
                </div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="pt-4 shrink-0"
                >
                  <button
                    onClick={() => onAuthTrigger('signup')}
                    className="group relative overflow-hidden px-8 py-3.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(234,179,8,0.4)] active:scale-95"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {bannerImages[currentImageIndex].cta}
                      <TrendingUp className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Promo Popup */}
      <AnimatePresence>
        {showPromo && (
          <PromoPopup onClose={() => setShowPromo(false)} />
        )}
      </AnimatePresence>

      {/* Stats for Logged In Users */}
      {user && userData && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-600 p-8 rounded-[32px] text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform text-white">
              <Trophy size={48} />
            </div>
            <p className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-2">Total Balance</p>
            <h3 className="text-4xl font-black mb-6">৳{userData ? formatBengaliCurrency(userData.balance) : toBengaliNumber(0)}</h3>
            <div className="flex gap-3">
              <button 
                onClick={() => setCurrentPage('transactions')}
                className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm backdrop-blur-md transition-all"
              >
                Deposit
              </button>
              <button 
                onClick={() => setCurrentPage('transactions')}
                className="flex-1 py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-bold text-sm transition-all"
              >
                Withdraw
              </button>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-100 flex flex-col justify-between">
            <div>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Daily Bonus</p>
              <h3 className="text-2xl font-black text-gray-900">Claim ৳2300</h3>
            </div>
            <button 
              onClick={() => setCurrentPage('bonus')}
              className="w-full py-3 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Gift size={18} />
              View Bonus
            </button>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-100 flex flex-col justify-between">
            <div>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Captcha Reward</p>
              <h3 className="text-2xl font-black text-gray-900">Earn ৳15/Day</h3>
            </div>
            <button 
              onClick={() => setCurrentPage('captcha')}
              className="w-full py-3 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Gamepad2 size={18} />
              Play Captcha
            </button>
          </div>
        </section>
      )}

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Gamepad2 className="text-blue-600" />
            Game Categories
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <button 
              key={cat.id}
              className="flex items-center gap-4 p-6 bg-white border border-gray-100 rounded-3xl shadow-lg shadow-gray-50 hover:shadow-blue-100 hover:border-blue-100 transition-all group"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                {cat.icon}
              </div>
              <span className="font-bold text-lg text-gray-900">{cat.name}</span>
              <ChevronRight className="ml-auto text-gray-300 group-hover:text-blue-600 transition-colors" />
            </button>
          ))}
        </div>
      </section>

      {/* Game Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Flame className="text-orange-500" />
            Featured Games
          </h2>
          <button className="text-blue-600 font-bold text-sm hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">
          {games.map((game) => (
            <div key={game.id} className="group cursor-pointer" onClick={() => user ? handlePlayGame(game) : onAuthTrigger('login')}>
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden mb-3 shadow-lg group-hover:shadow-blue-200 transition-all">
                <img 
                  src={game.image} 
                  alt={game.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {user ? (
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                      <Play size={24} fill="currentColor" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white">
                      <Lock size={24} />
                      <span className="text-[10px] font-bold uppercase">Login to Play</span>
                    </div>
                  )}
                </div>
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  {game.players} Playing
                </div>
              </div>
              <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{game.name}</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{game.category}</p>
            </div>
          ))}
        </div>
      </section>
      {/* Game Play Modal */}
      <AnimatePresence>
        {playingGame && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPlayingGame(null)}></div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl"
            >
              <button 
                onClick={() => setPlayingGame(null)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                  <img src={playingGame.image} alt={playingGame.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-blue-900">{playingGame.name}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{playingGame.category}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bet Amount (৳)</label>
                  <div className="flex gap-2">
                    {['10', '50', '100', '500'].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setBetAmount(amt)}
                        className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                          betAmount === amt ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Your Balance</span>
                    <span className="text-lg font-black text-blue-900">৳{userData ? formatBengaliCurrency(userData.balance) : toBengaliNumber(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Potential Win</span>
                    <span className="text-lg font-black text-green-600">৳{formatBengaliCurrency(Number(betAmount) * 2)}</span>
                  </div>
                </div>

                <button 
                  onClick={handleBet}
                  className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                >
                  <Play size={20} fill="currentColor" />
                  PLACE BET
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
