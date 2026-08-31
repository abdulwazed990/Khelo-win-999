import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { UserData, BannerItem, GameItem, CategoryItem, AnnouncementItem, HomeAdItem, PromotionItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Gamepad2, 
  Rocket, 
  Dice5, 
  Tv, 
  Trophy, 
  Fish, 
  Crosshair, 
  Volume2, 
  Sparkles, 
  Search, 
  Play, 
  Lock, 
  ChevronRight, 
  Star,
  Zap,
  TrendingUp,
  XCircle,
  Users,
  Award,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Coins,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { INITIAL_BANNERS, INITIAL_GAMES, INITIAL_CATEGORIES, INITIAL_PROMOTIONS, INITIAL_ANNOUNCEMENT, seedInitialFirestoreData } from '../services/seedData';
import { haptics } from '../utils/haptics';
import { normalizeGameStatus, isGameStatusAvailable, NormalizedGameStatus } from '../services/gameStatusService';
import GameMaintenanceScreen from './GameMaintenanceScreen';
import { SiteSettings } from '../types';

interface HomeProps {
  user: User | null;
  userData: UserData | null;
  settings?: SiteSettings | null;
  setCurrentPage: (page: string) => void;
  onAuthTrigger: (mode: 'login' | 'signup') => void;
  searchQuery?: string;
  onOpenSearch?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  hot: <Flame size={15} className="text-orange-500" />,
  slots: <Gamepad2 size={15} className="text-blue-600" />,
  crash: <Rocket size={15} className="text-rose-500" />,
  table: <Dice5 size={15} className="text-emerald-600" />,
  live: <Tv size={15} className="text-indigo-600" />,
  sports: <Trophy size={15} className="text-amber-500" />,
  fish: <Fish size={15} className="text-cyan-600" />,
  esports: <Crosshair size={15} className="text-purple-600" />,
};

export default function Home({
  user,
  userData,
  settings,
  setCurrentPage,
  onAuthTrigger,
  searchQuery = '',
  onOpenSearch
}: HomeProps) {
  const { lang, t, getLocalizedText } = useLanguage();

  // Data States initialized with local cache / default fallbacks
  const [banners, setBanners] = useState<BannerItem[]>(() => {
    try {
      const c = localStorage.getItem('tk333_cached_banners');
      if (c) return JSON.parse(c);
    } catch (e) {}
    return INITIAL_BANNERS.map((b, i) => ({ id: `b_${i}`, ...b }));
  });

  const [games, setGames] = useState<GameItem[]>(() => {
    try {
      const c = localStorage.getItem('tk333_cached_games');
      if (c) return JSON.parse(c);
    } catch (e) {}
    return INITIAL_GAMES.map((g, i) => ({ id: `g_${i}`, ...g }));
  });

  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const c = localStorage.getItem('tk333_cached_categories');
      if (c) return JSON.parse(c);
    } catch (e) {}
    return INITIAL_CATEGORIES.map((c, i) => ({ id: `cat_${c.slug || i}`, ...c } as CategoryItem));
  });

  const [homeAds, setHomeAds] = useState<HomeAdItem[]>(() => {
    try {
      const c = localStorage.getItem('tk333_cached_ads');
      if (c) return JSON.parse(c);
    } catch (e) {}
    return [];
  });

  const [promotions, setPromotions] = useState<PromotionItem[]>(() => {
    try {
      const c = localStorage.getItem('tk333_cached_promos');
      if (c) return JSON.parse(c);
    } catch (e) {}
    return INITIAL_PROMOTIONS.map((p, i) => ({ id: `promo_${i}`, ...p }));
  });

  const [announcementObj, setAnnouncementObj] = useState<AnnouncementItem | null>(() => {
    try {
      const c = localStorage.getItem('tk333_cached_announcement');
      if (c) return JSON.parse(c);
    } catch (e) {}
    return { id: 'main_marquee', ...INITIAL_ANNOUNCEMENT };
  });

  // UI States
  const [activeCategory, setActiveCategory] = useState<string>('hot');
  const [activeProvider, setActiveProvider] = useState<string>('all');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [playingSimGame, setPlayingSimGame] = useState<GameItem | null>(null);
  const [blockedGame, setBlockedGame] = useState<{ game: GameItem; status: NormalizedGameStatus; reason?: string } | null>(null);
  const [simBetAmount, setSimBetAmount] = useState('50');
  const [simPlaying, setSimPlaying] = useState(false);
  const [simResult, setSimResult] = useState<{ won: boolean; winAmount: number } | null>(null);

  // 1. Listen to Firestore collections with local cache & quota protection
  useEffect(() => {
    seedInitialFirestoreData();

    // Banners Listener
    const unsubBanners = onSnapshot(collection(db, 'banners'), (snapshot) => {
      if (!snapshot.empty) {
        const list: BannerItem[] = [];
        snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as BannerItem));
        list.sort((a, b) => (Number(a.order ?? 999) - Number(b.order ?? 999)));
        const active = list.filter(b => b.active !== false && b.isActive !== false);
        const finalList = active.length > 0 ? active : list;
        setBanners(finalList);
        try { localStorage.setItem('tk333_cached_banners', JSON.stringify(finalList)); } catch (e) {}
      }
    }, () => {
      // Fallback on quota error
      setBanners(prev => prev.length ? prev : INITIAL_BANNERS.map((b, i) => ({ id: `b_${i}`, ...b })));
    });

    // Categories Listener
    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      if (!snapshot.empty) {
        const list: CategoryItem[] = [];
        snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as CategoryItem));
        list.sort((a, b) => (Number(a.order ?? 999) - Number(b.order ?? 999)));
        const active = list.filter(c => c.active !== false && c.isActive !== false);
        const finalList = active.length > 0 ? active : list;
        setCategories(finalList);
        try { localStorage.setItem('tk333_cached_categories', JSON.stringify(finalList)); } catch (e) {}
      }
    }, () => {
      setCategories(prev => prev.length ? prev : INITIAL_CATEGORIES.map((c, i) => ({ id: `cat_${c.slug || i}`, ...c } as CategoryItem)));
    });

    // Games Listener
    const unsubGames = onSnapshot(collection(db, 'games'), (snapshot) => {
      if (!snapshot.empty) {
        const list: GameItem[] = [];
        snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as GameItem));
        list.sort((a, b) => (Number(a.order ?? 999) - Number(b.order ?? 999)));
        const active = list.filter(g => g.status !== 'inactive' && g.isActive !== false);
        const finalList = active.length > 0 ? active : list;
        setGames(finalList);
        try { localStorage.setItem('tk333_cached_games', JSON.stringify(finalList)); } catch (e) {}
      }
    }, () => {
      setGames(prev => prev.length ? prev : INITIAL_GAMES.map((g, i) => ({ id: `g_${i}`, ...g })));
    });

    // Home Ads Listener
    const unsubAds = onSnapshot(collection(db, 'home_ads'), (snapshot) => {
      if (!snapshot.empty) {
        const list: HomeAdItem[] = [];
        snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as HomeAdItem));
        list.sort((a, b) => (Number(a.order ?? 999) - Number(b.order ?? 999)));
        const finalList = list.filter(a => a.active !== false && a.isActive !== false);
        setHomeAds(finalList);
        try { localStorage.setItem('tk333_cached_ads', JSON.stringify(finalList)); } catch (e) {}
      }
    }, () => {});

    // Promotions Listener
    const unsubPromo = onSnapshot(collection(db, 'promotions'), (snapshot) => {
      if (!snapshot.empty) {
        const list: PromotionItem[] = [];
        snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as PromotionItem));
        list.sort((a, b) => (Number(a.order ?? 999) - Number(b.order ?? 999)));
        const finalList = list.filter(p => p.active !== false && p.isActive !== false);
        setPromotions(finalList);
        try { localStorage.setItem('tk333_cached_promos', JSON.stringify(finalList)); } catch (e) {}
      }
    }, () => {});

    // Announcement Listener
    const announceQ = query(collection(db, 'announcements'));
    const unsubAnnounce = onSnapshot(announceQ, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data() as AnnouncementItem;
        setAnnouncementObj(docData);
        try { localStorage.setItem('tk333_cached_announcement', JSON.stringify(docData)); } catch (e) {}
      }
    }, () => {});

    return () => {
      unsubBanners();
      unsubCats();
      unsubGames();
      unsubAds();
      unsubPromo();
      unsubAnnounce();
    };
  }, []);

  // 2. Banner auto-rotation
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Provider list derived from loaded games
  const providers = useMemo(() => {
    const set = new Set<string>();
    games.forEach(g => {
      if (g.provider) set.add(g.provider);
    });
    return Array.from(set);
  }, [games]);

  // Filtered games based on active category & provider
  const filteredGames = useMemo(() => {
    return games.filter(g => {
      const matchCat = activeCategory === 'hot' 
        ? (g.hot || g.popular || g.featured || g.category === 'hot') 
        : g.category === activeCategory;
      const matchProvider = activeProvider === 'all' || g.provider === activeProvider;
      return matchCat && matchProvider;
    });
  }, [games, activeCategory, activeProvider]);

  // Game click / launcher handler
  const handleGameClick = (game: GameItem) => {
    haptics.selection();

    // Check authoritative game availability status first!
    const normStatus = normalizeGameStatus(game.status);
    if (!isGameStatusAvailable(game.status)) {
      setBlockedGame({
        game,
        status: normStatus,
        reason: game.statusReason
      });
      return;
    }

    if (!user) {
      onAuthTrigger('login');
      return;
    }

    const title = (game.title || game.name || game.titleBn || '').toLowerCase();
    const gameId = (game.id || '').toLowerCase();

    if (title.includes('aviator') || title.includes('jet') || gameId.includes('aviator')) {
      setCurrentPage('aviator-jet');
    } else if (title.includes('super ace') || title.includes('ace') || gameId.includes('super-ace')) {
      setCurrentPage('pokie-super-ace');
    } else if (title.includes('boxer') || gameId.includes('boxer-king')) {
      setCurrentPage('boxer-king');
    } else if (title.includes('mines') || gameId.includes('mines')) {
      setCurrentPage('mines');
    } else if (title.includes('roulette') || gameId.includes('roulette')) {
      setCurrentPage('roulette');
    } else if (title.includes('coin') || gameId.includes('coinflip')) {
      setCurrentPage('coinflip');
    } else {
      // Open instant simulated mobile slot / card runner
      setPlayingSimGame(game);
      setSimResult(null);
    }
  };

  const handleSimSpin = async () => {
    if (!user || !userData || !playingSimGame) return;
    const bet = Number(simBetAmount);
    if (!bet || bet <= 0) return;
    if (userData.balance < bet) {
      haptics.error();
      alert(lang === 'bn' ? 'অপর্যাপ্ত ব্যালেন্স! অনুগ্রহ করে ডিপোজিট করুন।' : 'Insufficient balance! Please deposit.');
      return;
    }

    haptics.medium();
    setSimPlaying(true);
    setSimResult(null);

    // Deduct bet
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: increment(-bet),
        turnover: increment(bet)
      });

      setTimeout(async () => {
        const isWin = Math.random() > 0.45;
        const multiplier = isWin ? (Math.random() > 0.8 ? 3.5 : 1.8) : 0;
        const winAmount = Math.round(bet * multiplier);

        if (isWin && winAmount > 0) {
          await updateDoc(userRef, {
            balance: increment(winAmount)
          });
        }

        // Record bet
        await addDoc(collection(db, 'bets'), {
          uid: user.uid,
          gameName: playingSimGame.title || playingSimGame.name || 'Game',
          amount: bet,
          profit: winAmount - bet,
          status: isWin ? 'win' : 'loss',
          createdAt: new Date().toISOString()
        });

        haptics.success();
        setSimResult({ won: isWin, winAmount });
        setSimPlaying(false);
      }, 1200);
    } catch (err) {
      setSimPlaying(false);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const currentBanner = banners[currentBannerIndex] || banners[0];

  const marqueeText = announcementObj 
    ? (lang === 'bn' ? (announcementObj.textBn || announcementObj.text) : (announcementObj.textEn || announcementObj.text))
    : (lang === 'bn' 
      ? '🎉 TK333 ভিআইপি ক্যাসিনোতে স্বাগতম! বিকাশ ও নগদে অটো ডিপোজিট ও মাত্র ৫ মিনিটে সুপার ফাস্ট উইথড্র সুবিধা।'
      : '🎉 Welcome to TK333 VIP Casino! 24/7 instant deposit & lightning fast payouts in 5 minutes.');

  return (
    <div className="space-y-3.5 max-w-full overflow-hidden">
      {/* 1. Hero Carousel Banner with Light Frame */}
      {banners.length > 0 && (
        <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-200 border border-slate-200 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner?.id || currentBannerIndex}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="relative w-full h-full cursor-pointer"
              onClick={() => {
                haptics.selection();
                if (currentBanner?.ctaLink) {
                  setCurrentPage(currentBanner.ctaLink);
                } else {
                  setCurrentPage('promotion');
                }
              }}
            >
              <img
                src={currentBanner?.imageUrl}
                alt={currentBanner?.title || 'TK333 Banner'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />

              {/* Light Subtle Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent flex flex-col justify-end p-3 sm:p-5">
                <div className="max-w-md">
                  {currentBanner?.badge && (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500 text-black text-[9px] sm:text-[10px] font-black font-chakra uppercase tracking-wider mb-1 shadow-sm">
                      {currentBanner.badge}
                    </span>
                  )}
                  <h2 className="text-white text-xs sm:text-base md:text-lg font-chakra font-black leading-tight drop-shadow-md">
                    {lang === 'bn' && currentBanner?.titleBn ? currentBanner.titleBn : currentBanner?.title}
                  </h2>
                  <p className="text-slate-200 text-[9px] sm:text-xs font-medium line-clamp-1 drop-shadow-sm mt-0.5">
                    {lang === 'bn' && currentBanner?.subtitleBn ? currentBanner.subtitleBn : currentBanner?.subtitle}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator */}
          {banners.length > 1 && (
            <div className="absolute bottom-2 right-3 flex items-center gap-1 z-10">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    haptics.selection();
                    setCurrentBannerIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentBannerIndex 
                      ? 'w-5 bg-amber-400' 
                      : 'w-1.5 bg-white/60 hover:bg-white'
                  }`}
                  aria-label={`Banner ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Announcement Marquee Bar (Light Theme) */}
      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-slate-800">
        <div className="p-1 rounded-lg bg-blue-50 text-blue-600 shrink-0">
          <Volume2 size={15} />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="inline-block whitespace-nowrap text-xs font-medium text-slate-700 animate-marquee">
            {marqueeText}
          </div>
        </div>
      </div>

      {/* 3. Quick Action Feature Badges */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => {
            haptics.selection();
            setCurrentPage('transactions');
          }}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-sm active:scale-95 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-xs">
            <ArrowDownLeft size={18} />
          </div>
          <span className="text-[11px] font-chakra font-black text-slate-800 tracking-tight">
            {t('nav.deposit', 'ডিপোজিট')}
          </span>
          <span className="text-[8px] text-blue-600 font-bold uppercase">অটো</span>
        </button>

        <button
          onClick={() => {
            haptics.selection();
            setCurrentPage('transactions');
          }}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-sm active:scale-95 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-xs">
            <ArrowUpRight size={18} />
          </div>
          <span className="text-[11px] font-chakra font-black text-slate-800 tracking-tight">
            {lang === 'bn' ? 'উইথড্র' : 'Withdraw'}
          </span>
          <span className="text-[8px] text-emerald-600 font-bold uppercase">৫ মিনিট</span>
        </button>

        <button
          onClick={() => {
            haptics.selection();
            setCurrentPage('prize');
          }}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-sm active:scale-95 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-xs">
            <Trophy size={18} />
          </div>
          <span className="text-[11px] font-chakra font-black text-slate-800 tracking-tight">
            {lang === 'bn' ? 'ফ্রি স্পিন' : 'Free Spin'}
          </span>
          <span className="text-[8px] text-amber-600 font-bold uppercase">৳৮৮৮ ফ্রি</span>
        </button>

        <button
          onClick={() => {
            haptics.selection();
            setCurrentPage('promotion');
          }}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-sm active:scale-95 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-xs">
            <Gift size={18} />
          </div>
          <span className="text-[11px] font-chakra font-black text-slate-800 tracking-tight">
            {lang === 'bn' ? 'প্রমোশন' : 'Offers'}
          </span>
          <span className="text-[8px] text-rose-600 font-bold uppercase">১০০% বোনাস</span>
        </button>
      </div>

      {/* 4. Active Home Advertisement Card from Firestore (Dynamic) */}
      {homeAds.length > 0 && (
        <div className="w-full">
          {homeAds.slice(0, 1).map((ad) => (
            <div
              key={ad.id}
              onClick={() => {
                haptics.selection();
                if (ad.linkUrl) setCurrentPage(ad.linkUrl);
                else setCurrentPage('promotion');
              }}
              className="relative w-full rounded-2xl overflow-hidden border border-amber-200 bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <img
                src={ad.imageUrl}
                alt={ad.title || 'Special Promotion'}
                className="w-full h-24 sm:h-32 object-cover"
                referrerPolicy="no-referrer"
              />
              {(ad.titleBn || ad.title) && (
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent p-3 flex flex-col justify-center text-white">
                  {ad.badgeBn && (
                    <span className="bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded w-max uppercase mb-1">
                      {ad.badgeBn}
                    </span>
                  )}
                  <h4 className="text-xs sm:text-sm font-black font-chakra leading-tight">
                    {lang === 'bn' ? (ad.titleBn || ad.title) : (ad.titleEn || ad.title)}
                  </h4>
                  <p className="text-[10px] text-slate-200">
                    {lang === 'bn' ? ad.subtitleBn : ad.subtitleEn}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 5. Game Categories Navigation (Clean Light Theme Horizontal Slider) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black font-chakra uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            {lang === 'bn' ? 'গেম ক্যাটাগরি' : 'Game Categories'}
          </h3>
          <span className="text-[10px] font-bold text-slate-500">
            {filteredGames.length} {lang === 'bn' ? 'টি গেম' : 'Games'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat, idx) => {
            const isCatActive = activeCategory === (cat.slug || cat.id);
            const icon = CATEGORY_ICONS[cat.slug || cat.id] || <Gamepad2 size={15} />;
            const catName = lang === 'bn' && cat.nameBn ? cat.nameBn : cat.name;

            return (
              <button
                key={cat.id || cat.slug || `cat_${idx}`}
                onClick={() => {
                  haptics.selection();
                  setActiveCategory(cat.slug || cat.id);
                  setActiveProvider('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-chakra font-black whitespace-nowrap transition-all select-none border ${
                  isCatActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-102'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className={isCatActive ? 'text-white' : ''}>{icon}</span>
                <span>{catName}</span>
              </button>
            );
          })}
        </div>

        {/* Optional Provider Sub-Filters */}
        {providers.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
            <button
              onClick={() => {
                haptics.selection();
                setActiveProvider('all');
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeProvider === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'bn' ? 'সকল প্রোভাইডার' : 'All Providers'}
            </button>
            {providers.map((p, idx) => (
              <button
                key={p || `prov_${idx}`}
                onClick={() => {
                  haptics.selection();
                  setActiveProvider(p);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap uppercase ${
                  activeProvider === p
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 6. Main 3-Column Light Game Cards Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {filteredGames.map((game, idx) => {
          const gameTitle = lang === 'bn' && game.titleBn ? game.titleBn : (game.title || game.name || 'Game');
          const isHot = game.hot || game.popular;
          const normStatus = normalizeGameStatus(game.status);
          const isNotActive = normStatus !== 'ACTIVE';

          return (
            <motion.div
              key={game.id || game.slug || `game_${idx}`}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleGameClick(game)}
              className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group relative ${
                normStatus === 'SERVER_ERROR' 
                  ? 'border-rose-300 ring-1 ring-rose-500/30' 
                  : normStatus === 'MAINTENANCE' 
                  ? 'border-amber-300 ring-1 ring-amber-500/30' 
                  : 'border-slate-200'
              }`}
            >
              {/* Game Cover Image */}
              <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src={game.imageUrl || game.thumbnailUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80'}
                  alt={gameTitle}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                    isNotActive ? 'grayscale-[40%] contrast-90' : ''
                  }`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />

                {/* Hot / Feature Badge */}
                {isHot && !isNotActive && (
                  <div className="absolute top-1 left-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm">
                    {lang === 'bn' ? 'হট' : 'HOT'}
                  </div>
                )}

                {/* Prominent Server Error / Maintenance Ribbon */}
                {isNotActive ? (
                  <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                    normStatus === 'SERVER_ERROR' 
                      ? 'bg-rose-600 text-white animate-pulse' 
                      : normStatus === 'MAINTENANCE' 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    <span>
                      {normStatus === 'SERVER_ERROR' 
                        ? '🔴 SERVER ERROR' 
                        : normStatus === 'MAINTENANCE' 
                        ? '🟠 MAINTENANCE' 
                        : '⚫ UNAVAILABLE'}
                    </span>
                  </div>
                ) : (
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/90 text-white shadow-2xs">
                    ACTIVE
                  </div>
                )}

                {/* Play / Notice Button Overlay on Hover / Active */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className={`px-2.5 py-1 rounded-full flex items-center justify-center gap-1 shadow-lg text-white text-[9px] font-black uppercase tracking-wider ${
                    normStatus === 'SERVER_ERROR' ? 'bg-rose-600' : normStatus === 'MAINTENANCE' ? 'bg-amber-500' : normStatus === 'DISABLED' ? 'bg-slate-700' : 'bg-blue-600'
                  }`}>
                    {normStatus === 'SERVER_ERROR' ? (
                      <span>🔴 SERVER ERROR</span>
                    ) : normStatus === 'MAINTENANCE' ? (
                      <span>🟠 MAINTENANCE</span>
                    ) : normStatus === 'DISABLED' ? (
                      <span>⚫ UNAVAILABLE</span>
                    ) : (
                      <>
                        <Play size={10} className="fill-white ml-0.5" />
                        <span>🟢 PLAY NOW</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Game Details Footer */}
              <div className="p-1.5 sm:p-2 bg-white flex flex-col justify-between flex-1">
                <div>
                  <h4 className="text-[11px] sm:text-xs font-black font-chakra text-slate-900 leading-tight truncate">
                    {gameTitle}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase truncate">
                    {game.provider || 'TK333'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                  <span className="flex items-center gap-0.5 text-[9px] text-amber-600 font-bold">
                    <Star size={10} className="fill-amber-500 text-amber-500" />
                    {game.rating || '9.8'}
                  </span>
                  <span className={`text-[9px] font-black uppercase ${
                    normStatus === 'SERVER_ERROR' ? 'text-rose-600' : normStatus === 'MAINTENANCE' ? 'text-amber-600' : normStatus === 'DISABLED' ? 'text-slate-500' : 'text-emerald-600'
                  }`}>
                    {normStatus === 'SERVER_ERROR' 
                      ? '🔴 SERVER ERROR'
                      : normStatus === 'MAINTENANCE' 
                      ? '🟠 MAINTENANCE'
                      : normStatus === 'DISABLED'
                      ? '⚫ UNAVAILABLE'
                      : '🟢 PLAY NOW'}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredGames.length === 0 && (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
          {lang === 'bn' ? 'কোনো গেম খুঁজে পাওয়া যায়নি।' : 'No games found in this category.'}
        </div>
      )}

      {/* 7. Live Big Winners / Community Ticker (Light Theme) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black font-chakra text-slate-900">
            <Award size={15} className="text-amber-500" />
            <span>{lang === 'bn' ? 'সাম্প্রতিক বড় জয় (লাইভ উইনার)' : 'Recent Big Winners'}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { user: '017***492', game: 'Super Ace', win: '৳৪৫,২০০' },
            { user: '018***811', game: 'Aviator Jet', win: '৳৮২,৫০০' },
            { user: '019***304', game: 'Boxer King', win: '৳২৮,৪০০' }
          ].map((w, idx) => (
            <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="truncate">
                <span className="font-mono text-[10px] text-slate-500 block truncate">{w.user}</span>
                <span className="font-bold text-[11px] text-slate-800 truncate block">{w.game}</span>
              </div>
              <span className="font-black text-emerald-600 font-rajdhani text-xs shrink-0">
                {w.win}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Trust & Payment Methods Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[11px] font-bold font-chakra text-slate-700 uppercase tracking-wider">
            {lang === 'bn' ? 'নিরাপদ পেমেন্ট মেথড ও অটো ডিপোজিট' : 'Secure Payment Methods'}
          </span>
          <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            24/7 LIVE
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {[
            { name: 'bKash', color: 'bg-[#D12053]/10 text-[#D12053] border-[#D12053]/30' },
            { name: 'Nagad', color: 'bg-[#E31B23]/10 text-[#E31B23] border-[#E31B23]/30' },
            { name: 'Rocket', color: 'bg-[#8A257D]/10 text-[#8A257D] border-[#8A257D]/30' },
            { name: 'Upay', color: 'bg-[#005BAC]/10 text-[#005BAC] border-[#005BAC]/30' },
            { name: 'USDT (TRC20)', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' }
          ].map((pm, idx) => (
            <div key={idx} className={`py-2 px-1 rounded-xl text-center font-chakra font-black text-[10px] sm:text-xs border ${pm.color} flex items-center justify-center`}>
              {pm.name}
            </div>
          ))}
        </div>
      </div>

      {/* 9. Official Brand Footer */}
      <footer className="mt-4 pt-4 border-t border-slate-200/80 text-center space-y-3 pb-4">
        {/* Support Channels */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {settings?.supportWhatsapp && (
            <a
              href={`https://wa.me/${settings.supportWhatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 font-bold font-chakra flex items-center gap-1.5 transition-all text-[11px]"
            >
              WhatsApp Support
            </a>
          )}
          {settings?.telegramChannel && (
            <a
              href={settings.telegramChannel.startsWith('http') ? settings.telegramChannel : `https://t.me/${settings.telegramChannel.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 font-bold font-chakra flex items-center gap-1.5 transition-all text-[11px]"
            >
              Telegram Official
            </a>
          )}
        </div>

        {/* Custom Footer Description */}
        <p className="text-[11px] text-slate-500 max-w-xl mx-auto leading-relaxed">
          {lang === 'bn' 
            ? (settings?.footerTextBn || 'TK333 বাংলাদেশের বিশ্বস্ত প্রিমিয়াম লাইভ ক্যাসিনো ও এভিয়েটর গেমিং প্ল্যাটফর্ম। ১৮ বছরের ঊর্ধ্বে খেলোয়াড়দের জন্য অনুমোদিত।')
            : (settings?.footerTextEn || 'TK333 is Bangladesh’s most trusted online casino & gaming platform. Strictly 18+. Play responsibly.')}
        </p>

        {/* Badges */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 font-medium">
          <span className="flex items-center gap-1 bg-slate-200/60 px-2 py-0.5 rounded-full text-slate-600 font-bold">
            🔞 18+ Only
          </span>
          <span className="flex items-center gap-1 bg-slate-200/60 px-2 py-0.5 rounded-full text-slate-600 font-bold">
            🛡️ SSL Encrypted
          </span>
          <span className="flex items-center gap-1 bg-slate-200/60 px-2 py-0.5 rounded-full text-slate-600 font-bold">
            ⚡ Anti-Reset Active
          </span>
        </div>

        <div className="text-[10px] font-mono text-slate-400">
          © {new Date().getFullYear()} {settings?.brandName || 'TK333'}. All rights reserved.
        </div>
      </footer>

      {/* 10. Interactive Slot Simulator Modal for Unrouted Games */}
      <AnimatePresence>
        {playingSimGame && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 text-slate-900"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Gamepad2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-chakra font-black text-sm text-slate-900">
                      {playingSimGame.title || playingSimGame.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">{playingGameProvider(playingSimGame)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setPlayingSimGame(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Reel Screen Simulation */}
              <div className="w-full aspect-[16/10] bg-slate-900 rounded-2xl border-2 border-amber-400 p-3 flex flex-col justify-between items-center text-white relative overflow-hidden shadow-inner">
                <div className="text-[10px] font-chakra text-amber-400 tracking-widest uppercase">
                  {playingSimGame.title} • 98.6% RTP
                </div>

                <div className="flex items-center justify-center gap-3 my-auto">
                  <div className={`w-16 h-20 bg-slate-800 rounded-xl flex items-center justify-center text-3xl font-black border border-slate-700 shadow ${simPlaying ? 'animate-bounce' : ''}`}>
                    {simPlaying ? '🎰' : (simResult?.won ? '7️⃣' : '👑')}
                  </div>
                  <div className={`w-16 h-20 bg-slate-800 rounded-xl flex items-center justify-center text-3xl font-black border border-slate-700 shadow ${simPlaying ? 'animate-bounce' : ''}`}>
                    {simPlaying ? '💎' : (simResult?.won ? '7️⃣' : '💎')}
                  </div>
                  <div className={`w-16 h-20 bg-slate-800 rounded-xl flex items-center justify-center text-3xl font-black border border-slate-700 shadow ${simPlaying ? 'animate-bounce' : ''}`}>
                    {simPlaying ? '⭐' : (simResult?.won ? '7️⃣' : '🍒')}
                  </div>
                </div>

                {simResult && (
                  <div className={`text-xs font-black font-chakra ${simResult.won ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`}>
                    {simResult.won ? `🎉 জয়াভিমুখী! ৳${simResult.winAmount} জয়!` : '😢 পরবর্তীতে আবার চেষ্টা করুন!'}
                  </div>
                )}
              </div>

              {/* Bet Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">{lang === 'bn' ? 'বাজির পরিমাণ:' : 'Bet Amount:'}</span>
                  <span className="font-rajdhani font-black text-emerald-600 text-sm">৳{simBetAmount}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {['20', '50', '100', '500'].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSimBetAmount(amt)}
                      className={`py-1 rounded-xl text-xs font-rajdhani font-black border ${
                        simBetAmount === amt
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSimSpin}
                disabled={simPlaying}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-chakra font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {simPlaying ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>{lang === 'bn' ? 'স্পিন করুন (SPIN)' : 'SPIN NOW'}</span>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Authoritative Game Server Error / Maintenance Modal Overlay */}
      {blockedGame && (
        <GameMaintenanceScreen
          game={blockedGame.game}
          status={blockedGame.status}
          reason={blockedGame.reason}
          onBackToLobby={() => setBlockedGame(null)}
          onStatusResolved={(newStatus) => {
            if (newStatus === 'ACTIVE') {
              const g = blockedGame.game;
              setBlockedGame(null);
              handleGameClick(g);
            }
          }}
        />
      )}
    </div>
  );
}

function playingGameProvider(game: GameItem) {
  return game.provider || 'TK333 VIP';
}
