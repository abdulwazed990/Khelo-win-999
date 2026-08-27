import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { UserData } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  History, 
  Sliders, 
  LogOut, 
  ShieldCheck, 
  ChevronRight, 
  Coins, 
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Globe,
  Vibrate,
  Smartphone,
  Phone
} from 'lucide-react';
import Transactions from './Transactions';
import HistoryPage from './History';

interface MemberProfileProps {
  user: User | null;
  userData: UserData | null;
  onNavigate: (page: string) => void;
}

export default function MemberProfile({ user, userData, onNavigate }: MemberProfileProps) {
  const { lang, setLanguage, toggleLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'cashier' | 'bets'>('overview');
  const [copiedUid, setCopiedUid] = useState(false);
  const [hapticsOn, setHapticsOn] = useState<boolean>(() => haptics.getEnabled());

  const isAdmin = userData?.role === 'admin' || user?.email === 'mohammadabdulwazed1@gmail.com';

  const copyUid = () => {
    if (!user) return;
    haptics.success();
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleToggleHaptics = () => {
    const newState = !hapticsOn;
    setHapticsOn(newState);
    haptics.setEnabled(newState);
  };

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto">
      {/* Profile Header Card (Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 p-0.5 shadow-sm">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-blue-700 font-black text-xl font-chakra">
              {userData?.name ? userData.name.charAt(0).toUpperCase() : 'TK'}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-chakra truncate">
                {userData?.name || (lang === 'bn' ? 'TK333 মেম্বার' : 'TK333 VIP Member')}
              </h2>
              <span className="text-[9px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-full uppercase shadow-xs">
                VIP 1
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="font-mono text-[11px]">UID: {user?.uid.slice(0, 8)}...</span>
              <button onClick={copyUid} className="text-blue-600 hover:text-blue-800">
                {copiedUid ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>

            <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
              {lang === 'bn' ? 'ফোন:' : 'Phone:'} {userData?.phone || (lang === 'bn' ? 'ভেরিফাইড মেম্বার' : 'Verified Member')}
            </div>
          </div>
        </div>

        {/* Balance & Quick Actions Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                {t('member.main_wallet', 'মূল ওয়ালেট ব্যালেন্স')}
              </span>
              <div className="text-2xl font-black font-rajdhani text-emerald-600 leading-tight">
                ৳{userData?.balance?.toLocaleString() || 0}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                {lang === 'bn' ? 'টার্নওভার' : 'Turnover'}
              </span>
              <div className="text-sm font-black font-rajdhani text-blue-600">
                ৳{userData?.turnover?.toLocaleString() || 0}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
            <button
              onClick={() => {
                haptics.selection();
                onNavigate('transactions');
              }}
              className="py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-chakra font-black text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowDownLeft size={14} />
              <span>{t('member.deposit_btn', 'ডিপোজিট')}</span>
            </button>

            <button
              onClick={() => {
                haptics.selection();
                onNavigate('transactions');
              }}
              className="py-2.5 bg-white text-slate-800 font-chakra font-bold text-xs rounded-xl border border-slate-300 shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight size={14} />
              <span>{t('member.withdraw_btn', 'উইথড্র')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Navigation Options */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3 space-y-1 shadow-sm">
        {/* Subtle System Diagnostics Shortcut */}
        <button
          onClick={() => {
            haptics.selection();
            onNavigate('admin');
          }}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all mb-1 border border-slate-100 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center">
              <Sliders size={16} />
            </div>
            <div className="text-left">
              <span className="block font-chakra font-bold text-slate-700 text-xs">
                {lang === 'bn' ? 'সিস্টেম স্ট্যাটাস ও ডায়াগনস্টিকস' : 'System Telemetry & Diagnostics'}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <button
          onClick={() => {
            haptics.selection();
            onNavigate('transactions');
          }}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 transition-all text-xs font-bold"
        >
          <div className="flex items-center gap-2.5">
            <Wallet size={16} className="text-emerald-600" />
            <span>{lang === 'bn' ? 'জমা ও উত্তোলনের ইতিহাস' : 'Deposit & Withdrawal Records'}</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
        </button>

        <button
          onClick={() => {
            haptics.selection();
            onNavigate('prize');
          }}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 transition-all text-xs font-bold"
        >
          <div className="flex items-center gap-2.5">
            <Coins size={16} className="text-amber-500" />
            <span>{lang === 'bn' ? 'দৈনিক ফ্রি স্পিন ও উপহার' : 'Daily Free Spin & Rewards'}</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
        </button>

        <button
          onClick={() => {
            haptics.selection();
            onNavigate('agent');
          }}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 transition-all text-xs font-bold"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-blue-600" />
            <span>{lang === 'bn' ? 'এজেন্ট পার্টনার প্রোগ্রাম (৪০%)' : 'Agent Affiliate Program'}</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
        </button>

        {/* Haptics & Vibration Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl text-slate-700 text-xs font-bold">
          <div className="flex items-center gap-2.5">
            <Vibrate size={16} className="text-indigo-600" />
            <span>{lang === 'bn' ? 'হ্যাপটিক ভাইব্রেশন' : 'Haptic Vibration Feedback'}</span>
          </div>
          <button
            onClick={handleToggleHaptics}
            className={`w-10 h-6 rounded-full transition-colors relative ${hapticsOn ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${hapticsOn ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        {/* Language Selection Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl text-slate-700 text-xs font-bold">
          <div className="flex items-center gap-2.5">
            <Globe size={16} className="text-cyan-600" />
            <span>{lang === 'bn' ? 'ভাষা পরিবর্তন (Language)' : 'Language Select'}</span>
          </div>
          <button
            onClick={() => {
              haptics.selection();
              toggleLanguage();
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl border border-slate-300 text-xs font-black"
          >
            {lang === 'bn' ? 'বাংলা' : 'English'}
          </button>
        </div>
      </div>

      {/* Logout Action */}
      {user && (
        <button
          onClick={() => {
            haptics.medium();
            signOut(auth);
            onNavigate('home');
          }}
          className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-chakra font-black text-xs rounded-2xl border border-rose-200 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xs"
        >
          <LogOut size={16} />
          <span>{t('nav.logout', 'লগআউট')}</span>
        </button>
      )}
    </div>
  );
}
