import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { PromotionItem, UserData } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Gift, Sparkles, ChevronRight, CheckCircle2, Flame, Clock, Award, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../utils/haptics';

interface PromotionViewProps {
  userData: UserData | null;
  onNavigate: (page: string) => void;
}

export default function PromotionView({ userData, onNavigate }: PromotionViewProps) {
  const { lang, t, getLocalizedText } = useLanguage();
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activePromoModal, setActivePromoModal] = useState<PromotionItem | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'promotions'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PromotionItem[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as PromotionItem));
      setPromotions(list.filter(p => p.active !== false && p.isActive !== false));
    });
    return () => unsubscribe();
  }, []);

  const categories = [
    { id: 'all', label: lang === 'bn' ? 'সকল অফার' : 'ALL OFFERS' },
    { id: 'welcome', label: lang === 'bn' ? 'ওয়েলকাম' : 'WELCOME' },
    { id: 'rebate', label: lang === 'bn' ? 'ক্যাশব্যাক' : 'REBATE' },
    { id: 'vip', label: 'VIP CLUB' }
  ];

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Top Banner (Light Theme Gradient) */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 sm:p-6 shadow-md text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-black uppercase tracking-wider mb-1">
            <Sparkles size={14} />
            <span>{lang === 'bn' ? 'TK333 স্পেশাল রিওয়ার্ড' : 'TK333 Exclusive Rewards'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-chakra leading-tight">
            {t('promotion.title', 'প্রমোশন ও বোনাস হাব')}
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-xs leading-relaxed font-medium">
            {lang === 'bn' 
              ? '১০০% প্রথম ডিপোজিট বোনাস, দৈনিক ক্যাশব্যাক এবং আনলিমিটেড টুর্নামেন্ট প্রাইজ!' 
              : 'Claim deposit bonus matches, daily rebates, and special tournament jackpots!'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              haptics.selection();
              setSelectedCategory(cat.id);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold font-chakra uppercase whitespace-nowrap transition-all border ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-black'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Promotions Cards (Light Theme Cards) */}
      <div className="space-y-3">
        {promotions.map((promo) => {
          const promoTitle = getLocalizedText(promo, 'title');
          const promoDesc = getLocalizedText(promo, 'description');
          const bonusText = getLocalizedText(promo, 'bonusText') || promo.bonusText;
          const ctaText = getLocalizedText(promo, 'ctaText') || promo.ctaText || (lang === 'bn' ? 'অফার নিন' : 'CLAIM');

          return (
            <motion.div
              key={promo.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                haptics.selection();
                setActivePromoModal(promo);
              }}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="aspect-[2.2/1] w-full relative bg-slate-100 overflow-hidden">
                <img 
                  src={promo.imageUrl} 
                  alt={promoTitle} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-end p-3.5">
                  <div>
                    {promo.badge && (
                      <span className="bg-amber-500 text-black font-black text-[9px] px-2 py-0.5 rounded-full mb-1 inline-block uppercase shadow-sm">
                        {promo.badge}
                      </span>
                    )}
                    <h3 className="text-sm sm:text-base font-black text-white font-chakra drop-shadow-md leading-tight">
                      {promoTitle}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-3.5 flex items-center justify-between bg-white">
                <div>
                  <span className="text-xs font-black text-blue-600 font-rajdhani">
                    {bonusText || (lang === 'bn' ? '১০০% ক্যাশব্যাক' : '100% Match Bonus')}
                  </span>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {promoDesc}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    haptics.medium();
                    onNavigate(promo.ctaLink || 'transactions');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black font-chakra text-xs rounded-xl shadow-xs active:scale-95 whitespace-nowrap ml-2"
                >
                  {ctaText}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Promotion Detail Modal */}
      <AnimatePresence>
        {activePromoModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePromoModal(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 w-full max-w-sm bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 font-chakra">
                  {getLocalizedText(activePromoModal, 'title')}
                </h3>
                <button
                  onClick={() => setActivePromoModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="aspect-[2/1] w-full relative rounded-2xl overflow-hidden border border-slate-200">
                <img 
                  src={activePromoModal.imageUrl} 
                  alt={getLocalizedText(activePromoModal, 'title')} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium">
                {getLocalizedText(activePromoModal, 'description')}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setActivePromoModal(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  {t('common.close', 'বন্ধ করুন')}
                </button>
                <button
                  onClick={() => {
                    setActivePromoModal(null);
                    onNavigate('transactions');
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-xs rounded-xl shadow-md active:scale-95"
                >
                  {t('promotion.deposit_claim', 'ডিপোজিট ও অফার নিন')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
