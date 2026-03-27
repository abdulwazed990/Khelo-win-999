import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserData } from '../types';
import { motion } from 'framer-motion';
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

interface HomeProps {
  user: User | null;
  userData: UserData | null;
  setCurrentPage: (page: any) => void;
  onAuthTrigger: (mode: 'login' | 'signup') => void;
}

export default function Home({ user, userData, setCurrentPage, onAuthTrigger }: HomeProps) {

  const categories = [
    { id: 'hot', name: 'Hot Games', icon: <Flame className="text-orange-500" /> },
    { id: 'slots', name: 'Slot Games', icon: <Zap className="text-yellow-500" /> },
    { id: 'crash', name: 'Crash Games', icon: <TrendingUp className="text-red-500" /> },
  ];

  const games = [
    { id: 1, name: 'Aviator', category: 'crash', image: 'https://picsum.photos/seed/aviator/400/300', players: '1.2k' },
    { id: 2, name: 'Sweet Bonanza', category: 'slots', image: 'https://picsum.photos/seed/slots1/400/300', players: '800' },
    { id: 3, name: 'Gates of Olympus', category: 'slots', image: 'https://picsum.photos/seed/slots2/400/300', players: '2.5k' },
    { id: 4, name: 'Crazy Time', category: 'hot', image: 'https://picsum.photos/seed/hot1/400/300', players: '5k' },
    { id: 5, name: 'Plinko', category: 'hot', image: 'https://picsum.photos/seed/hot2/400/300', players: '1.5k' },
    { id: 6, name: 'Mines', category: 'crash', image: 'https://picsum.photos/seed/crash2/400/300', players: '900' },
  ];

  const ads = [
    { id: 1, title: '৳2300 Welcome Bonus!', description: 'Sign up today and get ৳2300 instantly in your wallet.', image: 'https://picsum.photos/seed/ad1/800/400' },
    { id: 2, title: 'Daily Captcha Rewards', description: 'Complete simple captchas and earn up to ৳15 daily.', image: 'https://picsum.photos/seed/ad2/800/400' },
  ];

  return (
    <div className="space-y-12">
      {/* Hero / Cover Photo */}
      <section className="relative h-[300px] md:h-[450px] rounded-[40px] overflow-hidden shadow-2xl shadow-blue-100">
        <img 
          src="https://picsum.photos/seed/casino-banner/1920/1080" 
          alt="Banner" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-transparent flex items-center px-8 md:px-16">
          <div className="max-w-lg text-white space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
            >
              <Star size={14} /> New Season Live
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black leading-tight"
            >
              WIN BIG WITH <br /> <span className="text-blue-400">KHELO WIN 999</span>
            </motion.h1>
            {!user && (
              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => onAuthTrigger('signup')}
                className="px-8 py-4 bg-white text-blue-900 font-black rounded-2xl shadow-xl hover:bg-blue-50 transition-all flex items-center gap-3"
              >
                <Play size={20} fill="currentColor" />
                START PLAYING NOW
              </motion.button>
            )}
          </div>
        </div>
      </section>

      {/* Stats for Logged In Users */}
      {user && userData && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-600 p-8 rounded-[32px] text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <Trophy size={120} />
            </div>
            <p className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-2">Total Balance</p>
            <h3 className="text-4xl font-black mb-6">৳{userData.balance.toLocaleString()}</h3>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {games.map((game) => (
            <div key={game.id} className="group cursor-pointer" onClick={() => !user && onAuthTrigger('login')}>
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

      {/* Ads for Unlogged Users */}
      {!user && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {ads.map((ad) => (
            <div key={ad.id} className="relative h-[250px] rounded-[32px] overflow-hidden shadow-xl group">
              <img 
                src={ad.image} 
                alt={ad.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                <h3 className="text-2xl font-black text-white mb-2">{ad.title}</h3>
                <p className="text-gray-200 text-sm mb-4">{ad.description}</p>
                <button 
                  onClick={() => onAuthTrigger('signup')}
                  className="w-fit px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
                >
                  Claim Now
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

    </div>
  );
}
