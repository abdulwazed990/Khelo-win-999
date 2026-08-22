import React from 'react';
import { 
  Home as HomeIcon, 
  Gift, 
  Users, 
  Trophy, 
  User as UserIcon 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';

interface TK333BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function TK333BottomNav({ currentPage, onNavigate }: TK333BottomNavProps) {
  const { lang } = useLanguage();

  const navItems = [
    { 
      id: 'home', 
      label: lang === 'bn' ? 'হোম' : 'HOME', 
      icon: HomeIcon 
    },
    { 
      id: 'promotion', 
      label: lang === 'bn' ? 'প্রমোশন' : 'PROMOTION', 
      icon: Gift, 
      badge: lang === 'bn' ? 'হট' : 'HOT' 
    },
    { 
      id: 'agent', 
      label: lang === 'bn' ? 'এজেন্ট' : 'AGENT', 
      icon: Users, 
      badge: '40%' 
    },
    { 
      id: 'prize', 
      label: lang === 'bn' ? 'পুরস্কার' : 'PRIZE', 
      icon: Trophy, 
      badge: lang === 'bn' ? 'ফ্রি' : 'FREE' 
    },
    { 
      id: 'member', 
      label: lang === 'bn' ? 'মেম্বার' : 'MEMBER', 
      icon: UserIcon 
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] safe-area-bottom">
      <div className="max-w-md mx-auto px-1 h-14 sm:h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                haptics.selection();
                onNavigate(item.id);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 relative select-none transition-all active:scale-95 ${
                isActive 
                  ? 'text-blue-600 font-bold scale-105' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Badge if present */}
              {item.badge && !isActive && (
                <span className="absolute top-0.5 right-1.5 sm:right-2.5 bg-gradient-to-r from-rose-500 to-red-500 text-white text-[8px] font-black px-1 rounded-full uppercase leading-tight shadow-sm scale-90">
                  {item.badge}
                </span>
              )}

              {/* Active Indicator Glow */}
              {isActive && (
                <span className="absolute -top-1 w-7 h-1 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span>
              )}

              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                <Icon size={19} className={isActive ? 'stroke-[2.5] text-blue-600' : 'stroke-[1.8] text-slate-500'} />
              </div>

              <span className={`text-[10px] font-chakra font-bold tracking-wider leading-none mt-0.5 whitespace-nowrap ${
                isActive ? 'text-blue-600 font-black' : 'text-slate-600'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
