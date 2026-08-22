import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { GameItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';
import { Search, X, Play, Star, Sparkles, Gamepad2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_GAMES } from '../services/seedData';

interface GameSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (game: GameItem) => void;
}

export default function GameSearchOverlay({
  isOpen,
  onClose,
  onSelectGame
}: GameSearchOverlayProps) {
  const { lang, t, getLocalizedText } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real games from Firestore
  useEffect(() => {
    const q = query(collection(db, 'games'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const list: GameItem[] = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as GameItem));
        setGames(list.filter(g => g.status !== 'inactive'));
      } else {
        setGames(INITIAL_GAMES.map((g, i) => ({ id: `g_${i}`, ...g })));
      }
      setLoading(false);
    }, () => {
      setGames(INITIAL_GAMES.map((g, i) => ({ id: `g_${i}`, ...g })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter games based on Bengali & English search query
  const filteredGames = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return games.filter(g => g.hot || g.popular || g.featured).slice(0, 12);

    return games.filter((game) => {
      const bnName = (game.nameBn || game.titleBn || '').toLowerCase();
      const enName = (game.nameEn || game.name || game.title || '').toLowerCase();
      const provider = (game.provider || '').toLowerCase();
      const category = (game.category || '').toLowerCase();
      const slug = (game.slug || game.route || '').toLowerCase();

      return (
        bnName.includes(q) ||
        enName.includes(q) ||
        provider.includes(q) ||
        category.includes(q) ||
        slug.includes(q)
      );
    });
  }, [games, searchTerm]);

  const popularSearches = [
    { label: 'Super Ace', query: 'Super Ace' },
    { label: 'Mines', query: 'Mines' },
    { label: 'Aviator Jet', query: 'Aviator' },
    { label: 'Boxer King', query: 'Boxer' },
    { label: 'Roulette', query: 'Roulette' },
    { label: 'সুপার এস', query: 'সুপার এস' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-900/60 backdrop-blur-xs max-w-full overflow-hidden">
      {/* Search Sheet Container */}
      <div className="w-full max-w-2xl mx-auto bg-white min-h-screen flex flex-col shadow-2xl">
        {/* Top Search Header */}
        <div className="w-full bg-white border-b border-slate-200 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2.5 bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5">
              <Search size={18} className="text-blue-600 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === 'bn' ? 'গেম খুঁজুন...' : 'Search games...'}
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    haptics.selection();
                    setSearchTerm('');
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                haptics.selection();
                onClose();
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          </div>

          {/* Quick Keywords */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">
              {lang === 'bn' ? 'জনপ্রিয়:' : 'Popular:'}
            </span>
            {popularSearches.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  haptics.selection();
                  setSearchTerm(item.query);
                }}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 text-[11px] font-bold whitespace-nowrap active:scale-95 transition-all"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {searchTerm 
                ? (lang === 'bn' ? `ফলাফল (${filteredGames.length})` : `Results (${filteredGames.length})`) 
                : (lang === 'bn' ? 'সুপার হিট গেমস' : 'Trending Hot Games')}
            </h3>
          </div>

          {filteredGames.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Gamepad2 size={40} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">
                {lang === 'bn' ? 'কোনো গেম খুঁজে পাওয়া যায়নি' : 'No games found matching your query'}
              </p>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'ভিন্ন কীওয়ার্ড দিয়ে চেষ্টা করুন' : 'Try searching for provider or game title'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredGames.map((game) => {
                const title = getLocalizedText(game, 'title') || getLocalizedText(game, 'name') || game.name || game.title || 'Game';
                const provider = game.provider || 'TK333';
                const isHot = game.hot || game.popular;

                return (
                  <motion.div
                    key={game.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      haptics.medium();
                      onSelectGame(game);
                      onClose();
                    }}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md cursor-pointer transition-all group flex flex-col"
                  >
                    <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden">
                      <img
                        src={game.imageUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {isHot && (
                        <span className="absolute top-1.5 left-1.5 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs uppercase">
                          HOT
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase block truncate">
                          {provider}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 font-chakra truncate leading-tight mt-0.5">
                          {title}
                        </h4>
                      </div>

                      <button className="w-full mt-2 py-1.5 bg-blue-600 group-hover:bg-blue-700 text-white font-chakra font-black text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-xs transition-colors">
                        <Play size={12} fill="currentColor" />
                        <span>{lang === 'bn' ? 'প্লে করুন' : 'PLAY'}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
