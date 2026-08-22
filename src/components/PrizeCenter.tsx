import React, { useState } from 'react';
import { UserData } from '../types';
import Bonus from './Bonus';
import Captcha from './Captcha';
import { Trophy, RotateCw, Gamepad2, Gift, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';

interface PrizeCenterProps {
  userData: UserData | null;
}

export default function PrizeCenter({ userData }: PrizeCenterProps) {
  const { lang, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'wheel' | 'captcha'>('wheel');

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto">
      {/* Top Banner (Light Theme) */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Trophy size={26} className="text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg font-black font-chakra leading-tight">
              {t('prize.title', 'TK333 উপহার ও লাকি স্পিন সেন্টার')}
            </h2>
            <p className="text-xs text-blue-100 font-medium mt-0.5">
              {lang === 'bn' 
                ? 'প্রতি ২৪ ঘণ্টায় নিশ্চিত ফ্রি নগদ পুরস্কার গ্রহণ করুন!' 
                : 'Claim guaranteed free cash rewards every 24 hours!'}
            </p>
          </div>
        </div>
      </div>

      {/* Sub Tabs Toggle (Light Theme) */}
      <div className="flex items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300 shadow-inner">
        <button
          onClick={() => {
            haptics.selection();
            setActiveSubTab('wheel');
          }}
          className={`flex-1 py-2.5 rounded-xl font-chakra font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'wheel'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <RotateCw size={14} /> 
          <span>{lang === 'bn' ? '২৪ ঘণ্টার লাকি হুইল' : '24H LUCKY WHEEL'}</span>
        </button>

        <button
          onClick={() => {
            haptics.selection();
            setActiveSubTab('captcha');
          }}
          className={`flex-1 py-2.5 rounded-xl font-chakra font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'captcha'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Gamepad2 size={14} /> 
          <span>{lang === 'bn' ? 'দৈনিক ক্যাপচা (৳১৫)' : 'DAILY CAPTCHA'}</span>
        </button>
      </div>

      {/* Render Active Reward Component in Light Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        {activeSubTab === 'wheel' ? (
          <Bonus userData={userData} />
        ) : (
          <Captcha userData={userData} />
        )}
      </div>
    </div>
  );
}
