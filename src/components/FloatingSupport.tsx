import React, { useState } from 'react';
import { MessageCircle, Send, PhoneCall, X, Headset } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SiteSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';

interface FloatingSupportProps {
  settings?: SiteSettings | null;
}

export default function FloatingSupport({ settings }: FloatingSupportProps) {
  const { lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const telegramUrl = settings?.telegramUrl || 'https://t.me/TK333_Official';
  const liveChatUrl = settings?.liveChatUrl || 'https://tawk.to';
  const whatsappUrl = settings?.whatsappUrl || 'https://wa.me/8801700000000';

  return (
    <div className="fixed bottom-20 right-3.5 z-40 flex flex-col items-end gap-2">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.85 }}
            className="flex flex-col gap-2 items-end mb-1"
          >
            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptics.selection()}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#229ED9] text-white text-xs font-bold rounded-full shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <span>{lang === 'bn' ? 'অফিসিয়াল টেলিগ্রাম' : 'Telegram Channel'}</span>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Send size={13} className="text-white" />
              </div>
            </a>

            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptics.selection()}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#25D366] text-white text-xs font-bold rounded-full shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপ সাপোর্ট' : 'WhatsApp Support'}</span>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <PhoneCall size={13} className="text-white" />
              </div>
            </a>

            {/* 24/7 Live Chat */}
            <a
              href={liveChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptics.selection()}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-black rounded-full shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <span>{lang === 'bn' ? '২৪/৭ লাইভ হেল্পডেস্ক' : '24/7 Live Helpdesk'}</span>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Headset size={13} className="text-white" />
              </div>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger Button */}
      <button
        onClick={() => {
          haptics.selection();
          setIsOpen(!isOpen);
        }}
        className="w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative border-2 border-white"
      >
        {isOpen ? (
          <X size={20} />
        ) : (
          <>
            <Headset size={22} className="animate-pulse" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          </>
        )}
      </button>
    </div>
  );
}
