import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserData, SiteSettings, GameItem } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useLanguage } from './context/LanguageContext';
import { haptics } from './utils/haptics';

// Components
import TK333Header from './components/TK333Header';
import TK333BottomNav from './components/TK333BottomNav';
import FloatingSupport from './components/FloatingSupport';
import Auth from './components/Auth';
import Home from './components/Home';
import PromotionView from './components/PromotionView';
import AgentView from './components/AgentView';
import PrizeCenter from './components/PrizeCenter';
import MemberProfile from './components/MemberProfile';
import Transactions from './components/Transactions';
import HistoryPage from './components/History';
import AdminPanel from './components/admin/AdminPanel';
import AdminLogin from './components/admin/AdminLogin';
import GameSearchOverlay from './components/GameSearchOverlay';

// Fullscreen Interactive Games
import BoxerKingGame from './components/BoxerKingGame';
import PokieSuperAceGame from './components/PokieSuperAceGame';
import AviatorJetGame from './components/AviatorJetGame';
import MinesGame from './components/MinesGame';
import RouletteGame from './components/RouletteGame';
import CoinflipGame from './components/CoinflipGame';
import GameStatusGuard from './components/GameStatusGuard';

// Aviator Signal Ecosystem
import AviatorSignalApp from './components/signal/AviatorSignalApp';
import AviatorSignalCMS from './components/signal/AviatorSignalCMS';

export type Page = 
  | 'home' 
  | 'promotion' 
  | 'agent' 
  | 'prize' 
  | 'member' 
  | 'transactions' 
  | 'history' 
  | 'free-spin' 
  | 'captcha' 
  | 'profile' 
  | 'admin' 
  | 'admin-login'
  | 'game' 
  | 'boxer-king' 
  | 'pokie-super-ace' 
  | 'aviator-jet' 
  | 'mines' 
  | 'roulette' 
  | 'coinflip'
  | 'aviator-signal'
  | 'aviator-signal-cms';

export default function App() {
  const { lang } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [signalToken, setSignalToken] = useState<string>('');

  // Read URL on initial mount and setup popstate/hashchange listener
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
      const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
      const searchParams = new URLSearchParams(window.location.search);
      const isQueryAdmin = searchParams.get('page') === 'admin' || searchParams.has('admin');

      if (path === 'admin' || path === 'admin/dashboard' || path === 'admin-dashboard' || hash === 'admin' || isQueryAdmin) {
        setCurrentPage('admin');
      } else if (
        path === 'signal' || 
        hash === 'signal' || 
        path === 'aviator-signal' || 
        hash === 'aviator-signal' || 
        path.startsWith('signal') || 
        hash.startsWith('signal') || 
        searchParams.get('page') === 'signal' ||
        searchParams.has('signal')
      ) {
        setCurrentPage('aviator-signal');
      } else if (path === 'signal-cms' || hash === 'signal-cms' || path === 'signal-admin' || hash === 'signal-admin') {
        setCurrentPage('admin');
      } else if (path === 'admin/login' || path === 'admin-login' || hash === 'admin-login') {
        setCurrentPage('admin-login');
      } else if (path === 'promotion' || path === 'promotions' || hash === 'promotion') {
        setCurrentPage('promotion');
      } else if (path === 'agent' || path === 'affiliate' || hash === 'agent') {
        setCurrentPage('agent');
      } else if (path === 'prize' || path === 'rewards' || hash === 'prize') {
        setCurrentPage('prize');
      } else if (path === 'member' || path === 'profile' || hash === 'member') {
        setCurrentPage('member');
      } else if (path === 'transactions' || path === 'deposit' || path === 'withdraw' || hash === 'transactions') {
        setCurrentPage('transactions');
      } else if (path === 'history' || hash === 'history') {
        setCurrentPage('history');
      } else if (
        path === 'aviator' || 
        path === 'aviator-jet' || 
        hash === 'aviator' || 
        hash === 'aviator-jet' || 
        searchParams.get('game') === 'aviator' || 
        searchParams.get('game') === 'aviator-jet' ||
        searchParams.get('page') === 'aviator'
      ) {
        setCurrentPage('aviator-jet');
      } else if (
        path === 'super-ace' || 
        path === 'pokie-super-ace' || 
        hash === 'super-ace' || 
        hash === 'pokie-super-ace' ||
        searchParams.get('game') === 'super-ace' ||
        searchParams.get('game') === 'pokie-super-ace'
      ) {
        setCurrentPage('pokie-super-ace');
      } else if (
        path === 'boxer-king' || 
        hash === 'boxer-king' ||
        searchParams.get('game') === 'boxer-king'
      ) {
        setCurrentPage('boxer-king');
      } else if (
        path === 'mines' || 
        hash === 'mines' ||
        searchParams.get('game') === 'mines'
      ) {
        setCurrentPage('mines');
      } else if (
        path === 'roulette' || 
        hash === 'roulette' ||
        searchParams.get('game') === 'roulette'
      ) {
        setCurrentPage('roulette');
      } else if (
        path === 'coinflip' || 
        hash === 'coinflip' ||
        searchParams.get('game') === 'coinflip'
      ) {
        setCurrentPage('coinflip');
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
    };
  }, []);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setUserData(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // 2. User Data Listener
  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        setLoading(false);
      });
      return unsubscribe;
    }
  }, [user]);

  // 3. Site Settings Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SiteSettings);
      }
    });
    return unsubscribe;
  }, []);

  const handleRefreshBalance = useCallback(async () => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    }
  }, [user]);

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    haptics.selection();
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleNavigate = (page: string) => {
    haptics.selection();
    const targetPage = page as Page;
    setCurrentPage(targetPage);
    
    // Update browser URL smoothly without reloading
    const path = targetPage === 'home' ? '/' : `/${targetPage}`;
    window.history.pushState(null, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaunchGame = (game: GameItem) => {
    haptics.medium();
    setShowSearchModal(false);
    
    // Match interactive game IDs
    const title = (game.title || game.titleBn || '').toLowerCase();
    if (title.includes('aviator') || title.includes('jet') || game.id.includes('aviator')) {
      handleNavigate('aviator-jet');
    } else if (title.includes('ace') || game.id.includes('super-ace')) {
      handleNavigate('pokie-super-ace');
    } else if (title.includes('boxer') || game.id.includes('boxer-king')) {
      handleNavigate('boxer-king');
    } else if (title.includes('mine') || game.id.includes('mines')) {
      handleNavigate('mines');
    } else if (title.includes('roulette') || game.id.includes('roulette')) {
      handleNavigate('roulette');
    } else if (title.includes('coin') || game.id.includes('coinflip')) {
      handleNavigate('coinflip');
    } else {
      // Default to Boxer King or Super Ace
      handleNavigate('pokie-super-ace');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#070b14] text-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 animate-pulse shadow-[0_0_25px_rgba(245,158,11,0.5)]">
          <div className="w-full h-full bg-[#070b14] rounded-[14px] flex items-center justify-center font-chakra font-black text-xl gold-gradient-text">
            TK
          </div>
        </div>
        <span className="font-chakra font-bold text-xs text-amber-400 mt-4 tracking-widest uppercase animate-pulse">
          LOADING TK333 VIP CASINO...
        </span>
      </div>
    );
  }

  // Dedicated Aviator Signal Ecosystem views
  if (currentPage === 'aviator-signal') {
    return (
      <div className="fixed inset-0 z-[100] bg-black overflow-y-auto">
        <AviatorSignalApp
          onOpenAviatorGame={() => handleNavigate('aviator-jet')}
          onOpenCMS={() => handleNavigate('admin')}
        />
      </div>
    );
  }

  if (currentPage === 'aviator-signal-cms') {
    return (
      <div className="fixed inset-0 z-[100] bg-black overflow-y-auto">
        <AviatorSignalCMS
          onBackToGame={() => handleNavigate('aviator-jet')}
          onOpenSignalApp={() => {
            handleNavigate('aviator-signal');
          }}
        />
      </div>
    );
  }

  // Fullscreen Interactive Games
  const isFullscreenGame = 
    currentPage === 'game' || 
    currentPage === 'boxer-king' || 
    currentPage === 'pokie-super-ace' || 
    currentPage === 'aviator-jet' ||
    currentPage === 'mines' ||
    currentPage === 'roulette' ||
    currentPage === 'coinflip';

  if (isFullscreenGame) {
    return (
      <div className="fixed inset-0 z-[100] bg-black overflow-hidden select-none">
        {currentPage === 'aviator-jet' && (
          <GameStatusGuard gameId="aviator-jet" fallbackTitle="Aviator Jet" onBack={() => handleNavigate('home')}>
            <AviatorJetGame 
              user={user} 
              userData={userData} 
              onBack={() => handleNavigate('home')} 
            />
          </GameStatusGuard>
        )}
        {currentPage === 'pokie-super-ace' && (
          <GameStatusGuard gameId="super-ace" fallbackTitle="Super Ace" onBack={() => handleNavigate('home')}>
            <PokieSuperAceGame user={user} userData={userData} onBack={() => handleNavigate('home')} />
          </GameStatusGuard>
        )}
        {(currentPage === 'game' || currentPage === 'boxer-king') && (
          <GameStatusGuard gameId="boxer-king" fallbackTitle="Boxer King" onBack={() => handleNavigate('home')}>
            <BoxerKingGame user={user} userData={userData} onBack={() => handleNavigate('home')} />
          </GameStatusGuard>
        )}
        {currentPage === 'mines' && (
          <GameStatusGuard gameId="mines" fallbackTitle="Mines" onBack={() => handleNavigate('home')}>
            <MinesGame user={user} userData={userData} onBack={() => handleNavigate('home')} />
          </GameStatusGuard>
        )}
        {currentPage === 'roulette' && (
          <GameStatusGuard gameId="roulette" fallbackTitle="Roulette" onBack={() => handleNavigate('home')}>
            <RouletteGame user={user} userData={userData} onBack={() => handleNavigate('home')} />
          </GameStatusGuard>
        )}
        {currentPage === 'coinflip' && (
          <GameStatusGuard gameId="coinflip" fallbackTitle="Coin Flip" onBack={() => handleNavigate('home')}>
            <CoinflipGame user={user} userData={userData} onBack={() => handleNavigate('home')} />
          </GameStatusGuard>
        )}
      </div>
    );
  }

  // Admin Route Handler
  const hasAdminSession = typeof window !== 'undefined' && (
    sessionStorage.getItem('tk333_admin_auth') === 'true' || 
    localStorage.getItem('tk333_admin_auth') === 'true'
  );
  const isAdmin = userData?.role === 'admin' || user?.email === 'mohammadabdulwazed1@gmail.com' || hasAdminSession;

  if (currentPage === 'admin-login') {
    return (
      <AdminLogin 
        onSuccess={() => handleNavigate('admin')} 
        onBackToSite={() => handleNavigate('home')} 
      />
    );
  }

  if (currentPage === 'admin') {
    // If not authenticated as admin, prompt Admin Login
    if (!isAdmin) {
      return (
        <AdminLogin 
          onSuccess={() => handleNavigate('admin')} 
          onBackToSite={() => handleNavigate('home')} 
        />
      );
    }

    // Authenticated Admin -> Show AdminPanel
    return (
      <AdminPanel 
        user={user} 
        userData={userData} 
        onBack={() => handleNavigate('home')} 
      />
    );
  }

  const renderCurrentView = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home
            user={user}
            userData={userData}
            setCurrentPage={handleNavigate}
            onAuthTrigger={handleOpenAuth}
            searchQuery=""
            onOpenSearch={() => setShowSearchModal(true)}
          />
        );
      case 'promotion':
        return <PromotionView userData={userData} onNavigate={handleNavigate} />;
      case 'agent':
        return <AgentView userData={userData} onNavigate={handleNavigate} />;
      case 'prize':
      case 'free-spin':
      case 'captcha':
        return <PrizeCenter userData={userData} />;
      case 'member':
      case 'profile':
        return <MemberProfile user={user} userData={userData} onNavigate={handleNavigate} />;
      case 'transactions':
        return (
          <div className="max-w-md mx-auto pb-10">
            <Transactions userData={userData} />
          </div>
        );
      case 'history':
        return (
          <div className="max-w-md mx-auto pb-10">
            <HistoryPage userData={userData} />
          </div>
        );
      default:
        return (
          <Home
            user={user}
            userData={userData}
            setCurrentPage={handleNavigate}
            onAuthTrigger={handleOpenAuth}
            onOpenSearch={() => setShowSearchModal(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col selection:bg-blue-600 selection:text-white max-w-full overflow-x-hidden">
      {/* 1. Fixed Top Header */}
      <TK333Header
        user={user}
        userData={userData}
        settings={settings}
        onOpenAuth={handleOpenAuth}
        onNavigate={handleNavigate}
        onRefreshBalance={handleRefreshBalance}
        onOpenSearch={() => setShowSearchModal(true)}
      />

      {/* 2. Main Page Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4 pb-20 sm:pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            {renderCurrentView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Floating Support / Contact Action */}
      <FloatingSupport settings={settings} />

      {/* 4. Fixed 5-Item Mobile Bottom Navigation */}
      <TK333BottomNav
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      {/* 5. Real-Time Game Search Modal with Bengali / English Support & Instant Play */}
      <GameSearchOverlay
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectGame={handleLaunchGame}
      />

      {/* 6. Auth Modal */}
      <AnimatePresence>
        {showAuth && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowAuth(false)}
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative z-10 w-full max-w-sm"
            >
              <Auth initialMode={authMode} onSuccess={() => setShowAuth(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
