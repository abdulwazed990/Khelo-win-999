import React, { useState } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { UserData } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';
import { formatBDT } from '../config/currency';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  LogOut, 
  Sliders,
  ChevronRight, 
  Coins, 
  Sparkles,
  Copy,
  Check,
  Globe,
  Vibrate,
  Phone,
  Receipt,
  Gift,
  Users,
  Trophy,
  Headphones,
  Gamepad2,
  Crown
} from 'lucide-react';

interface MemberProfileProps {
  user: User | null;
  userData: UserData | null;
  onNavigate: (page: string) => void;
}

export default function MemberProfile({ user, userData, onNavigate }: MemberProfileProps) {
  const { lang, toggleLanguage, t } = useLanguage();
  const [copiedUid, setCopiedUid] = useState(false);
  const [hapticsOn, setHapticsOn] = useState<boolean>(() => haptics.getEnabled());

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
      {/* 1. Profile Header & Wallet Summary Card */}
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
              <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-full uppercase shadow-xs">
                <Crown size={10} />
                VIP 1
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="font-mono text-[11px]">UID: {user?.uid.slice(0, 8)}...</span>
              <button onClick={copyUid} className="text-blue-600 hover:text-blue-800" title="Copy UID">
                {copiedUid ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
            </div>

            <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
              {lang === 'bn' ? 'ফোন:' : 'Phone:'} {userData?.phone || (lang === 'bn' ? 'ভেরিফাইড মেম্বার' : 'Verified Member')}
            </div>
          </div>
        </div>

        {/* Balance & Quick Cashier Actions Card */}
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
                onNavigate('deposit');
              }}
              className="py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-chakra font-black text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowDownLeft size={15} />
              <span>{t('member.deposit_btn', 'ডিপোজিট')}</span>
            </button>

            <button
              onClick={() => {
                haptics.selection();
                onNavigate('withdraw');
              }}
              className="py-2.5 bg-white text-slate-800 hover:bg-slate-50 font-chakra font-bold text-xs rounded-xl border border-slate-300 shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight size={15} />
              <span>{t('member.withdraw_btn', 'উইথড্র')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. In-Profile All Navigation Hub (Circular & Tile Navigation) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-chakra font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            <span>{lang === 'bn' ? 'মেম্বার কুইক নেভিগেশন ও অপশন' : 'Member Quick Navigation'}</span>
          </span>
          <span className="text-[10px] font-bold text-blue-600">
            {lang === 'bn' ? 'সকল সেবা' : 'All Services'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5 pt-1">
          {[
            { 
              id: 'deposit', 
              label: lang === 'bn' ? 'ডিপোজিট' : 'Deposit', 
              icon: ArrowDownLeft, 
              color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100', 
              badge: lang === 'bn' ? 'অটো' : 'Fast',
              action: () => onNavigate('deposit') 
            },
            { 
              id: 'withdraw', 
              label: lang === 'bn' ? 'উইথড্র' : 'Withdraw', 
              icon: ArrowUpRight, 
              color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100', 
              action: () => onNavigate('withdraw') 
            },
            { 
              id: 'promotion', 
              label: lang === 'bn' ? 'প্রমোশন' : 'Promotion', 
              icon: Gift, 
              color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100', 
              badge: lang === 'bn' ? 'হট' : 'Hot',
              action: () => onNavigate('promotion') 
            },
            { 
              id: 'agent', 
              label: lang === 'bn' ? 'এজেন্ট ৪০%' : 'Agent 40%', 
              icon: Users, 
              color: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100', 
              badge: '40%',
              action: () => onNavigate('agent') 
            },
            { 
              id: 'prize', 
              label: lang === 'bn' ? 'পুরস্কার' : 'Rewards', 
              icon: Trophy, 
              color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100', 
              badge: lang === 'bn' ? 'ফ্রি' : 'Free',
              action: () => onNavigate('prize') 
            },
            { 
              id: 'transactions', 
              label: lang === 'bn' ? 'পেমেন্ট লগ' : 'Transactions', 
              icon: Receipt, 
              color: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100', 
              action: () => onNavigate('history') 
            },
            { 
              id: 'history', 
              label: lang === 'bn' ? 'বেটিং রেকর্ড' : 'Bet History', 
              icon: Gamepad2, 
              color: 'text-cyan-600 bg-cyan-50 border-cyan-200 hover:bg-cyan-100', 
              action: () => onNavigate('history') 
            },
            { 
              id: 'support', 
              label: lang === 'bn' ? 'সাপোর্ট' : 'Support', 
              icon: Headphones, 
              color: 'text-teal-600 bg-teal-50 border-teal-200 hover:bg-teal-100', 
              badge: '24/7',
              action: () => {
                const url = 'https://t.me/tk333support';
                window.open ? window.open(url, '_blank') : onNavigate('home');
              } 
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  haptics.selection();
                  item.action();
                }}
                className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 group relative"
              >
                {item.badge && (
                  <span className="absolute -top-1.5 right-1 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase bg-rose-500 text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${item.color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-chakra font-black text-slate-700 group-hover:text-slate-900 mt-1.5 text-center leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>



      {/* 4. Complete Categorized Member Options List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3 space-y-1 shadow-sm">
        {/* Admin Portal (Strictly restricted to mohammadabdulwazed1@gmail.com) */}
        {user?.email === 'mohammadabdulwazed1@gmail.com' && (
          <button
            onClick={() => {
              haptics.selection();
              onNavigate('admin');
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-900 transition-all text-xs font-bold border border-blue-200 shadow-xs mb-1 group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Sliders size={16} />
              </div>
              <div className="text-left">
                <span className="block font-chakra font-black text-blue-950 text-xs">
                  {lang === 'bn' ? 'অ্যাডমিন প্যানেল ও সেটিংস (CMS)' : 'Admin Management Panel'}
                </span>
                <span className="text-[10px] text-blue-600 font-semibold block">
                  {lang === 'bn' ? 'প্রাইভেট লিঙ্ক ও সার্বিক নিয়ন্ত্রণ' : 'Private Links & Configuration'}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[9px] font-black uppercase">
              CMS
            </span>
          </button>
        )}

        {/* Finance Options */}
        <button
          onClick={() => {
            haptics.selection();
            onNavigate('deposit');
          }}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 transition-all text-xs font-bold"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft size={15} />
            </div>
            <span>{lang === 'bn' ? 'জমা দেওয়ার ক্যাশিয়ার (Deposit)' : 'Deposit Cashier Management'}</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
        </button>

        <button
          onClick={() => {
            haptics.selection();
            onNavigate('withdraw');
          }}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 transition-all text-xs font-bold"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight size={15} />
            </div>
            <span>{lang === 'bn' ? 'উত্তোলন ক্যাশিয়ার (Withdrawal)' : 'Withdrawal Cashier Management'}</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
        </button>

        <button
          onClick={() => {
            haptics.selection();
            onNavigate('history');
          }}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 transition-all text-xs font-bold"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt size={15} />
            </div>
            <span>{lang === 'bn' ? 'সম্পূর্ণ লেনদেন ও পেমেন্ট হিস্টোরি' : 'Full Transaction & Payment History'}</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
        </button>

        {/* Rewards & Partnership Options */}
        <button
          onClick={() => {
            haptics.selection();
            onNavigate('promotion');
          }}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 transition-all text-xs font-bold"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Gift size={15} />
            </div>
            <span>{lang === 'bn' ? 'প্রমোশন ও বোনাস অফার' : 'Promotions & Special Offers'}</span>
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
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={15} />
            </div>
            <span>{lang === 'bn' ? 'এজেন্ট পার্টনার প্রোগ্রাম (৪০% কমিশন)' : 'Agent Affiliate Program (40%)'}</span>
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
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
              <Trophy size={15} />
            </div>
            <span>{lang === 'bn' ? 'দৈনিক ফ্রি স্পিন ও উপহার কেন্দ্র' : 'Daily Free Spin & Reward Center'}</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
        </button>

        {/* System Settings & Support */}
        <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
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
      </div>

      {/* 5. Logout Action */}
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
