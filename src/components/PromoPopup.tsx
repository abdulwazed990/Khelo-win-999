import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Gift, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PromoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim?: () => void;
}

const promoSlides = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
    titleBn: "৳২০,০০০ ওয়েলকাম বোনাস!",
    titleEn: "৳20,000 Welcome Bonus!",
    descBn: "প্রথম ডিপোজিটেই পান তাৎক্ষণিক ১০০% ক্যাশ ম্যাচিং বোনাস।",
    descEn: "Get 100% instant cash matching bonus on your first deposit.",
    badgeBn: "সীমিত সময়ের অফার",
    badgeEn: "Limited Offer"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=800&q=80",
    titleBn: "সুপার এস ৫০০X জ্যাকপট!",
    titleEn: "Super Ace 500X Jackpot!",
    descBn: "আজই স্পিন করুন আর জিতে নিন বিশাল মাল্টিপ্লায়ার রিওয়ার্ড।",
    descEn: "Spin today and hit explosive jackpot multipliers.",
    badgeBn: "হট গেম",
    badgeEn: "Hot Deal"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80",
    titleBn: "দৈনিক ১.২% ক্যাশব্যাক রিবেট!",
    titleEn: "Daily 1.2% Unlimited Rebate!",
    descBn: "যেকোনো খেলায় বাজি ধরুন এবং প্রতিদিন নিশ্চিত ক্যাশব্যাক পান।",
    descEn: "Play any casino game and get guaranteed daily cash rebates.",
    badgeBn: "ভিআইপি রিওয়ার্ড",
    badgeEn: "VIP Only"
  }
];

export default function PromoPopup({ isOpen, onClose, onClaim }: PromoPopupProps) {
  const { lang, t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promoSlides.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSlide = promoSlides[currentIndex];
  const slideTitle = lang === 'bn' ? currentSlide.titleBn : currentSlide.titleEn;
  const slideDesc = lang === 'bn' ? currentSlide.descBn : currentSlide.descEn;
  const slideBadge = lang === 'bn' ? currentSlide.badgeBn : currentSlide.badgeEn;

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % promoSlides.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + promoSlides.length) % promoSlides.length);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-[340px] bg-[#0c1222] border border-amber-500/40 rounded-[32px] overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.8)]"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-30 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full transition-all border border-white/20 shadow-xl active:scale-95"
        >
          <X size={16} />
        </button>

        {/* Slides Area */}
        <div className="relative h-[220px] overflow-hidden bg-slate-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <img 
                src={currentSlide.image} 
                alt="Promo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c1222] via-transparent to-black/40" />
              
              {/* Badge */}
              <div className="absolute top-3.5 left-3.5">
                <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg">
                  {slideBadge}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between z-20 pointer-events-none">
            <button 
              onClick={prevSlide}
              className="p-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-full transition-all pointer-events-auto border border-white/10"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={nextSlide}
              className="p-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-full transition-all pointer-events-auto border border-white/10"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 text-center space-y-4 bg-[#0c1222]">
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-white font-chakra leading-tight">
              {slideTitle}
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed px-1">
              {slideDesc}
            </p>
          </div>

          <button 
            onClick={() => {
              if (onClaim) onClaim();
              else onClose();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-chakra font-black rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 text-xs"
          >
            <Gift size={16} />
            {t('promotion.claim_now', 'এখনই বোনাস নিন')}
          </button>

          {/* Pagination Dots */}
          <div className="flex justify-center gap-1.5 pt-1">
            {promoSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-slate-700'}`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
