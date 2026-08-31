import React, { useState } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { UserData, SiteSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';
import { 
  Menu, 
  X, 
  Search, 
  RotateCw, 
  Gift, 
  Users, 
  Trophy, 
  Gamepad2, 
  Sliders, 
  LogOut,
  ChevronRight,
  Sparkles,
  Globe,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Headset,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TK333HeaderProps {
  user: User | null;
  userData: UserData | null;
  settings?: SiteSettings | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onNavigate: (page: string) => void;
  onRefreshBalance: () => void;
  onOpenSearch: () => void;
}

export default function TK333Header({
  user,
  userData,
  settings,
  onOpenAuth,
  onNavigate,
  onRefreshBalance,
  onOpenSearch
}: TK333HeaderProps) {
  const { lang, setLanguage, toggleLanguage, t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const brandName = settings?.brandName || 'TK333';
  const isAdmin = userData?.role === 'admin' || user?.email === 'mohammadabdulwazed1@gmail.com';

  const triggerRefresh = () => {
    haptics.medium();
    setIsRefreshing(true);
    onRefreshBalance();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleNavClick = (page: string) => {
    haptics.selection();
    onNavigate(page);
    setDrawerOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full max-w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm select-none">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* LEFT: ☰ Menu Hamburger + Brand Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
            <button
              onClick={() => {
                haptics.selection();
                setDrawerOpen(true);
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 active:scale-95 transition-all shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu size={19} />
            </button>

            {/* TK333 Brand Logo */}
            <div 
              onClick={() => {
                haptics.selection();
                onNavigate('home');
              }}
              className="flex items-center gap-1.5 cursor-pointer select-none group shrink-0"
            >
              {settings?.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={brandName}
                  className="h-8 max-w-[130px] object-contain group-hover:scale-105 transition-transform" 
                />
              ) : (
                <>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center p-0.5 shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    <div className="w-full h-full bg-slate-900 rounded-[9px] flex items-center justify-center">
                      <span className="font-chakra font-black text-[11px] sm:text-xs text-amber-400 tracking-tighter">
                        {brandName.substring(0, 2).toUpperCase() || 'TK'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col shrink min-w-0">
                    <span className="font-chakra font-black text-base sm:text-lg tracking-tight leading-none text-slate-900 flex items-center">
                      {brandName}
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1"></span>
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-bold text-blue-600 tracking-wider uppercase truncate">
                      {lang === 'bn' ? 'ক্যাসিনো' : 'CASINO'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Search + Deposit / Balance or Login / Signup */}
          <div className="flex items-center gap-1 sm:gap-2 shrink min-w-0 justify-end">
            {/* Search Icon Button */}
            <button
              onClick={() => {
                haptics.selection();
                onOpenSearch();
              }}
              className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 active:scale-95 transition-all shrink-0"
              aria-label="Search Games"
              title={lang === 'bn' ? 'গেম খুঁজুন' : 'Search games'}
            >
              <Search size={16} />
            </button>

            {/* Language Switcher for medium & up screens */}
            <button
              onClick={() => {
                haptics.selection();
                toggleLanguage();
              }}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold active:scale-95 transition-all shrink-0"
              title={lang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            >
              <Globe size={13} className="text-amber-500" />
              <span className={lang === 'bn' ? 'text-blue-600 font-bold' : 'text-slate-500'}>বাংলা</span>
              <span className="text-slate-300">|</span>
              <span className={lang === 'en' ? 'text-blue-600 font-bold' : 'text-slate-500'}>EN</span>
            </button>

            {user ? (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink min-w-0">
                {/* Balance Badge (Light Theme & Responsive) */}
                <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 pl-1.5 sm:pl-2 pr-1 py-0.5 sm:py-1 rounded-xl shadow-inner shrink min-w-0 max-w-[120px] sm:max-w-none">
                  <div className="flex flex-col items-end min-w-0">
                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-none truncate">
                      {t('nav.balance', 'ব্যালেন্স')}
                    </span>
                    <span className="text-[11px] sm:text-xs font-black font-rajdhani text-emerald-600 leading-tight truncate">
                      ৳{userData?.balance?.toLocaleString() || 0}
                    </span>
                  </div>
                  <button
                    onClick={triggerRefresh}
                    className={`p-0.5 text-slate-400 hover:text-blue-600 shrink-0 ${
                      isRefreshing ? 'animate-spin text-blue-600' : ''
                    }`}
                    aria-label="Refresh balance"
                  >
                    <RotateCw size={11} />
                  </button>
                </div>

                {/* Primary Deposit Button - Blue / Gold Action */}
                <button
                  onClick={() => {
                    haptics.medium();
                    onNavigate('transactions');
                  }}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-[11px] sm:text-xs font-black font-chakra rounded-xl shadow-sm active:scale-95 transition-all whitespace-nowrap shrink-0"
                >
                  <ArrowDownLeft size={13} className="shrink-0" />
                  <span>{t('nav.deposit', 'ডিপোজিট')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    haptics.selection();
                    onOpenAuth('login');
                  }}
                  className="px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] sm:text-xs font-bold font-chakra rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-all whitespace-nowrap"
                >
                  {t('nav.login', 'লগইন')}
                </button>
                <button
                  onClick={() => {
                    haptics.medium();
                    onOpenAuth('signup');
                  }}
                  className="px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-[11px] sm:text-xs font-black font-chakra rounded-xl shadow-sm active:scale-95 transition-all whitespace-nowrap"
                >
                  {t('nav.register', 'রেজিস্টার')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Unified Light Navigation Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[80] flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="relative w-4/5 max-w-xs bg-white border-r border-slate-200 h-full flex flex-col justify-between p-4 shadow-2xl z-10 overflow-y-auto no-scrollbar text-slate-800"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center p-0.5">
                      <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                        <span className="font-chakra font-black text-xs text-amber-400">TK</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-chakra font-black text-base text-slate-900">{brandName} VIP</span>
                      <span className="block text-[9px] text-blue-600 font-bold">
                        {lang === 'bn' ? 'অফিসিয়াল ক্যাসিনো' : 'Official Casino Platform'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200"
                    aria-label="Close Drawer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Language Switcher in Drawer */}
                <div className="my-3 p-2 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Globe size={14} className="text-amber-500" />
                    {t('nav.language', 'ভাষা')}:
                  </span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 shadow-sm">
                    <button
                      onClick={() => {
                        haptics.selection();
                        setLanguage('bn');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                        lang === 'bn' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      বাংলা
                    </button>
                    <button
                      onClick={() => {
                        haptics.selection();
                        setLanguage('en');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                        lang === 'en' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* User Info & Fast Cashier Actions */}
                {user ? (
                  <div className="mb-3.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white font-black text-sm shadow-sm">
                        {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="truncate flex-1">
                        <div className="font-bold text-xs text-slate-900 truncate">{userData?.name || (lang === 'bn' ? 'মেম্বার' : 'VIP Member')}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{userData?.phone || user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                      <span className="text-slate-500">{t('nav.balance', 'ব্যালেন্স')}:</span>
                      <span className="font-black text-emerald-600 font-rajdhani text-sm">
                        ৳{userData?.balance?.toLocaleString() || 0}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => handleNavClick('transactions')}
                        className="py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-chakra font-black text-xs rounded-xl text-center flex items-center justify-center gap-1 shadow-sm"
                      >
                        <ArrowDownLeft size={13} />
                        <span>{t('nav.deposit', 'ডিপোজিট')}</span>
                      </button>
                      <button
                        onClick={() => handleNavClick('transactions')}
                        className="py-1.5 bg-white text-slate-700 hover:text-slate-900 font-chakra font-bold text-xs rounded-xl text-center border border-slate-200 shadow-sm flex items-center justify-center gap-1"
                      >
                        <ArrowUpRight size={13} />
                        <span>{lang === 'bn' ? 'উইথড্র' : 'Withdraw'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3.5 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { onOpenAuth('login'); setDrawerOpen(false); }}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 text-center"
                    >
                      {t('nav.login', 'লগইন')}
                    </button>
                    <button
                      onClick={() => { onOpenAuth('signup'); setDrawerOpen(false); }}
                      className="py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-xs rounded-xl text-center shadow-sm"
                    >
                      {t('nav.register', 'রেজিস্টার')}
                    </button>
                  </div>
                )}

                {/* Primary Navigation Links */}
                <div className="space-y-1 text-xs font-bold text-slate-700">
                  <DrawerLink 
                    icon={<Gamepad2 size={16} className="text-blue-600" />} 
                    label={lang === 'bn' ? 'হোম ও ক্যাসিনো লবি' : 'Home & Lobby'} 
                    onClick={() => handleNavClick('home')} 
                  />
                  <DrawerLink 
                    icon={<Gift size={16} className="text-rose-500" />} 
                    label={lang === 'bn' ? 'প্রমোশন ও বোনাস' : 'Promotions & Bonus'} 
                    onClick={() => handleNavClick('promotion')} 
                  />
                  <DrawerLink 
                    icon={<Users size={16} className="text-blue-600" />} 
                    label={lang === 'bn' ? 'এজেন্ট এফিলিয়েট প্রোগ্রাম' : 'Agent Affiliate'} 
                    onClick={() => handleNavClick('agent')} 
                  />
                  <DrawerLink 
                    icon={<Trophy size={16} className="text-amber-500" />} 
                    label={lang === 'bn' ? 'দৈনিক ফ্রি স্পিন ও পুরস্কার' : 'Daily Prize & Spin'} 
                    onClick={() => handleNavClick('prize')} 
                  />
                  <DrawerLink 
                    icon={<Wallet size={16} className="text-emerald-600" />} 
                    label={lang === 'bn' ? 'ক্যাশিয়ার (জমা ও উত্তোলন)' : 'Cashier (Deposit/Withdraw)'} 
                    onClick={() => handleNavClick('transactions')} 
                  />
                  <DrawerLink 
                    icon={<ShieldCheck size={16} className="text-indigo-600" />} 
                    label={lang === 'bn' ? 'সদস্য কেন্দ্র (প্রোফাইল)' : 'Member Center'} 
                    onClick={() => handleNavClick('member')} 
                  />
                  
                  {/* Subtle System Diagnostics / Admin Portal Link */}
                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleNavClick('admin')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all text-xs font-medium group"
                    >
                      <span className="flex items-center gap-2.5">
                        <Sliders size={14} className="text-slate-400 group-hover:text-slate-600" />
                        <span className="text-[11px] font-chakra text-slate-500 group-hover:text-slate-700">
                          {lang === 'bn' ? 'সিস্টেম স্ট্যাটাস ও ডায়াগনস্টিকস' : 'System Diagnostics & Telemetry'}
                        </span>
                      </span>
                      <ChevronRight size={13} className="text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                {user && (
                  <button
                    onClick={() => { 
                      haptics.medium();
                      signOut(auth); 
                      setDrawerOpen(false); 
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-all border border-rose-200"
                  >
                    <LogOut size={14} /> {t('nav.logout', 'লগআউট')}
                  </button>
                )}
                <div className="text-center text-[10px] text-slate-400 font-mono">
                  {brandName} VIP • 24/7 Fast Payouts
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function DrawerLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-all group"
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <span>{label}</span>
      </div>
      <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
    </button>
  );
}
