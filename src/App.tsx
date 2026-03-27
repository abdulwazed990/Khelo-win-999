import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, updateDoc, collection, query, where, orderBy } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserData, Transaction, Bet } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home as HomeIcon, 
  Gift, 
  User as UserIcon, 
  History, 
  Wallet, 
  RefreshCw, 
  LogOut, 
  LogIn, 
  UserPlus,
  Gamepad2,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { format } from 'date-fns';

// Components
import Auth from './components/Auth';
import Home from './components/Home';
import Bonus from './components/Bonus';
import Captcha from './components/Captcha';
import Profile from './components/Profile';
import Transactions from './components/Transactions';
import HistoryPage from './components/History';

export type Page = 'home' | 'bonus' | 'captcha' | 'profile' | 'transactions' | 'history';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

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

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        setLoading(false);
      });
      return unsubscribe;
    }
  }, [user]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderPage = () => {
    if (!user) return <Home user={null} userData={null} setCurrentPage={setCurrentPage} onAuthTrigger={(mode) => { setAuthMode(mode); setShowAuth(true); }} />;
    
    switch (currentPage) {
      case 'home': return <Home user={user} userData={userData} setCurrentPage={setCurrentPage} onAuthTrigger={(mode) => { setAuthMode(mode); setShowAuth(true); }} />;
      case 'bonus': return <Bonus userData={userData} />;
      case 'captcha': return <Captcha userData={userData} />;
      case 'profile': return <Profile userData={userData} onSignOut={() => signOut(auth)} setCurrentPage={setCurrentPage} />;
      case 'transactions': return <Transactions userData={userData} />;
      case 'history': return <HistoryPage userData={userData} />;
      default: return <Home user={user} userData={userData} setCurrentPage={setCurrentPage} onAuthTrigger={(mode) => { setAuthMode(mode); setShowAuth(true); }} />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
              K
            </div>
            <span className="text-xl font-black tracking-tighter text-blue-900">KHELO WIN <span className="text-blue-600">999</span></span>
          </div>

          {user ? (
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-blue-400 leading-none">Balance</span>
                  <span className="text-lg font-black text-blue-900">৳{userData?.balance.toLocaleString()}</span>
                </div>
                <button 
                  onClick={handleRefreshBalance}
                  className="p-1.5 hover:bg-blue-100 rounded-full transition-colors text-blue-600"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
              <nav className="flex items-center gap-1">
                <NavButton active={currentPage === 'home'} onClick={() => setCurrentPage('home')} icon={<HomeIcon size={20} />} label="Home" />
                <NavButton active={currentPage === 'bonus'} onClick={() => setCurrentPage('bonus')} icon={<Gift size={20} />} label="Bonus" />
                <NavButton active={currentPage === 'captcha'} onClick={() => setCurrentPage('captcha')} icon={<Gamepad2 size={20} />} label="Captcha" />
                <NavButton active={currentPage === 'history'} onClick={() => setCurrentPage('history')} icon={<History size={20} />} label="History" />
                <NavButton active={currentPage === 'profile'} onClick={() => setCurrentPage('profile')} icon={<UserIcon size={20} />} label="Profile" />
              </nav>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setAuthMode('login'); setShowAuth(true); }} 
                className="px-5 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-full transition-all"
              >
                Login
              </button>
              <button 
                onClick={() => { setAuthMode('signup'); setShowAuth(true); }} 
                className="px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                Join Now
              </button>
            </div>
          )}

          {user && (
            <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-40 bg-white pt-20 px-4"
          >
            <div className="flex flex-col gap-2">
              <MobileNavButton active={currentPage === 'home'} onClick={() => { setCurrentPage('home'); setIsMenuOpen(false); }} icon={<HomeIcon />} label="Home" />
              <MobileNavButton active={currentPage === 'bonus'} onClick={() => { setCurrentPage('bonus'); setIsMenuOpen(false); }} icon={<Gift />} label="Bonus" />
              <MobileNavButton active={currentPage === 'captcha'} onClick={() => { setCurrentPage('captcha'); setIsMenuOpen(false); }} icon={<Gamepad2 />} label="Captcha" />
              <MobileNavButton active={currentPage === 'history'} onClick={() => { setCurrentPage('history'); setIsMenuOpen(false); }} icon={<History />} label="History" />
              <MobileNavButton active={currentPage === 'profile'} onClick={() => { setCurrentPage('profile'); setIsMenuOpen(false); }} icon={<UserIcon />} label="Profile" />
              <div className="mt-4 p-4 bg-blue-50 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-blue-900">Total Balance</span>
                <span className="text-xl font-black text-blue-600">৳{userData?.balance.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage + (user ? 'auth' : 'noauth')}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAuth(false)}></div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 w-full max-w-md"
            >
              <button 
                onClick={() => setShowAuth(false)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-blue-400 transition-colors"
              >
                <XCircle size={32} />
              </button>
              <Auth initialMode={authMode} onSuccess={() => setShowAuth(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">K</div>
              <span className="text-lg font-black tracking-tighter text-blue-900">KHELO WIN 999</span>
            </div>
            <p className="text-gray-500 text-sm max-w-md">
              The most trusted gaming platform in Bangladesh. Play your favorite games, claim bonuses, and win big with Khelo Win 999.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="hover:text-blue-600 cursor-pointer">Terms & Conditions</li>
              <li className="hover:text-blue-600 cursor-pointer">Privacy Policy</li>
              <li className="hover:text-blue-600 cursor-pointer">Responsible Gaming</li>
              <li className="hover:text-blue-600 cursor-pointer">Contact Us</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Payment Methods</h4>
            <div className="flex gap-4 grayscale opacity-50">
              <img src="https://images.seeklogo.com/logo-png/35/1/nagad-logo-png_seeklogo-355240.png" className="h-6" alt="Nagad" />
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQN0UOeKLg08B-5oj_6s8k6URzU6BUlk93wz7YeeQdrqi6znNUZgkKMhjA0&s=10" className="h-6" alt="Bkash" />
              <img src="https://static.vecteezy.com/system/resources/thumbnails/068/706/013/small_2x/rocket-color-logo-mobile-banking-icon-free-png.png" className="h-6" alt="Rocket" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-gray-200 text-center text-gray-400 text-xs">
          © 2026 Khelo Win 999. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold text-sm ${
        active ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-2xl transition-all font-bold ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
