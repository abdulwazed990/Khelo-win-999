import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Gift, TrendingUp, Star } from 'lucide-react';

interface PromoPopupProps {
  onClose: () => void;
}

const promoSlides = [
  {
    id: 1,
    image: "https://images.pexels.com/photos/11483295/pexels-photo-11483295.jpeg?auto=compress&cs=tinysrgb&w=800",
    title: "৳৮৮৮ স্বাগতম বোনাস!",
    description: "আজই যোগ দিন এবং আপনার ওয়ালেটে সরাসরি ৮৮৮ টাকা বোনাস পান।",
    badge: "Limited Offer"
  },
  {
    id: 2,
    image: "https://images.pexels.com/photos/11483347/pexels-photo-11483347.jpeg?auto=compress&cs=tinysrgb&w=800",
    title: "আপনার প্রথম ডিপোজিটে ৮৮৮ টাকা!",
    description: "প্রথমবার ডিপোজিট করলেই পাচ্ছেন বিশাল ৮৮৮ টাকা ক্যাশব্যাক বোনাস।",
    badge: "Hot Deal"
  },
  {
    id: 3,
    image: "https://images.pexels.com/photos/17221265/pexels-photo-17221265.jpeg?auto=compress&cs=tinysrgb&w=800",
    title: "৮৮৮ টাকা মেগা রিওয়ার্ড!",
    description: "আমাদের বিশেষ অফারে অংশ নিন এবং জিতে নিন ৮৮৮ টাকা পর্যন্ত পুরস্কার।",
    badge: "VIP Only"
  }
];

export default function PromoPopup({ onClose }: PromoPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    // Disable scroll
    document.body.style.overflow = 'hidden';
    
    const timer = setInterval(() => {
      setIsImageLoaded(false);
      setCurrentIndex((prev) => (prev + 1) % promoSlides.length);
    }, 4000);

    return () => {
      // Re-enable scroll
      document.body.style.overflow = 'unset';
      clearInterval(timer);
    };
  }, []);

  const nextSlide = () => {
    setIsImageLoaded(false);
    setCurrentIndex((prev) => (prev + 1) % promoSlides.length);
  };

  const prevSlide = () => {
    setIsImageLoaded(false);
    setCurrentIndex((prev) => (prev - 1 + promoSlides.length) % promoSlides.length);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-[340px] bg-white rounded-[40px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 z-30 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white rounded-full transition-all border border-white/20 shadow-xl"
        >
          <X size={18} />
        </button>

        {/* Slides */}
        <div className="relative h-[380px] overflow-hidden bg-gray-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: isImageLoaded ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              <img 
                src={promoSlides[currentIndex].image} 
                alt="Promo" 
                onLoad={() => setIsImageLoaded(true)}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Gradient Overlay for Image */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              
              {/* Badge */}
              <div className="absolute top-5 left-5">
                <span className="px-3.5 py-1.5 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-[0.15em] rounded-full shadow-2xl border border-yellow-500/20">
                  {promoSlides[currentIndex].badge}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between z-20 pointer-events-none">
            <button 
              onClick={prevSlide}
              className="p-2 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white rounded-full transition-all pointer-events-auto border border-white/10"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={nextSlide}
              className="p-2 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white rounded-full transition-all pointer-events-auto border border-white/10"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-7 text-center space-y-5 bg-white">
          <div className="space-y-2.5">
            <h3 className="text-xl font-black text-gray-900 leading-tight tracking-tight">
              {promoSlides[currentIndex].title}
            </h3>
            <p className="text-[13px] text-gray-500 font-bold leading-relaxed px-2">
              {promoSlides[currentIndex].description}
            </p>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black rounded-[20px] shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2.5"
          >
            <Gift size={20} />
            এখনই বোনাস নিন
          </button>

          {/* Pagination Dots */}
          <div className="flex justify-center gap-2 pt-1">
            {promoSlides.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-8 bg-blue-600' : 'w-1.5 bg-gray-200'}`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
