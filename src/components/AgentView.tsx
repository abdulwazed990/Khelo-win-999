import React, { useState } from 'react';
import { UserData } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  Users, 
  Copy, 
  Check, 
  TrendingUp, 
  Award, 
  DollarSign, 
  ShieldCheck, 
  Sparkles,
  Share2,
  ChevronRight,
  ArrowDownLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { haptics } from '../utils/haptics';

interface AgentViewProps {
  userData: UserData | null;
  onNavigate: (page: string) => void;
}

export default function AgentView({ userData, onNavigate }: AgentViewProps) {
  const { lang, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const referralCode = userData?.username || userData?.phone?.slice(-6) || 'TK333VIP';
  const referralUrl = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopy = () => {
    haptics.success();
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const commissionTiers = [
    { level: 'Tier 1', rate: '25%', req: lang === 'bn' ? '১ - ১০ জন মেম্বার' : '1 - 10 Members', color: 'text-blue-600' },
    { level: 'Tier 2', rate: '32%', req: lang === 'bn' ? '১১ - ৫০ জন মেম্বার' : '11 - 50 Members', color: 'text-indigo-600' },
    { level: 'Tier 3 (VIP)', rate: '40%', req: lang === 'bn' ? '৫১+ জন মেম্বার' : '51+ Members', color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Hero Header (Light Theme / Blue-Amber Gradient) */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 sm:p-6 shadow-md text-white">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
              {t('agent.title', 'এজেন্ট পার্টনার প্রোগ্রাম')}
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-chakra tracking-tight leading-tight">
              {lang === 'bn' ? 'আজীবন ৪০% পর্যন্ত কমিশন' : 'EARN UP TO 40% COMMISSION'}
            </h2>
            <p className="text-xs text-blue-100 font-medium mt-1 max-w-xs leading-relaxed">
              {lang === 'bn' 
                ? 'বন্ধুদের ইনভাইট করুন এবং ঘরে বসে প্রতি সপ্তাহে আনলিমিটেড প্যাসিভ ইনকাম করুন!' 
                : 'Invite friends and build your recurring lifetime passive revenue with TK333!'}
            </p>
          </div>
          <Award size={48} className="text-amber-300 shrink-0 opacity-90" />
        </div>
      </div>

      {/* Referral Link Card (Clean White) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            {t('agent.your_link', 'আপনার রেফারেল লিংক')}
          </span>
          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            {lang === 'bn' ? 'স্বয়ংক্রিয় ট্র্যাকিং' : 'Auto-Tracking'}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-2xl p-2">
          <input
            type="text"
            readOnly
            value={referralUrl}
            className="flex-1 bg-transparent text-xs text-slate-800 font-mono outline-none truncate px-1"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl active:scale-95 transition-all shrink-0 shadow-xs"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? t('agent.copied', 'কপি হয়েছে') : t('agent.copy', 'কপি করুন')}</span>
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block truncate">
              {t('agent.invited_players', 'রেজিস্টার্ড মেম্বার')}
            </span>
            <span className="text-base font-black text-slate-900 font-rajdhani">0</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block truncate">
              {t('agent.team_turnover', 'টিম টার্নওভার')}
            </span>
            <span className="text-base font-black text-blue-600 font-rajdhani">৳0</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block truncate">
              {t('agent.total_earned', 'মোট কমিশন')}
            </span>
            <span className="text-base font-black text-emerald-600 font-rajdhani">৳0</span>
          </div>
        </div>
      </div>

      {/* Commission Tiers Table (Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
        <h3 className="font-chakra font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp size={16} className="text-amber-500" />
          <span>{lang === 'bn' ? 'কমিশন টিয়ার ও লেভেল' : 'Commission Tiers & Rates'}</span>
        </h3>

        <div className="space-y-2">
          {commissionTiers.map((tier, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 block">{tier.level}</span>
                <span className="text-[10px] text-slate-500 font-medium">{tier.req}</span>
              </div>
              <div className="text-right">
                <span className={`text-base font-black font-rajdhani ${tier.color}`}>{tier.rate}</span>
                <span className="text-[9px] text-slate-400 font-bold block uppercase">{lang === 'bn' ? 'কমিশন' : 'Share'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Cashier Action */}
      <button
        onClick={() => {
          haptics.selection();
          onNavigate('transactions');
        }}
        className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-500 hover:to-blue-600 text-white font-chakra font-black text-xs rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <ArrowDownLeft size={16} />
        <span>{lang === 'bn' ? 'কমিশন ব্যালেন্স ডিপোজিট বা উত্তোলন করুন' : 'Manage Commission Wallet'}</span>
      </button>
    </div>
  );
}
