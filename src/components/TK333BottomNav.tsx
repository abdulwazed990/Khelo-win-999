import React from 'react';
import { 
  Home as HomeIcon, 
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
      id: 'member', 
      label: lang === 'bn' ? 'মেম্বার' : 'MEMBER', 
      icon: UserIcon 
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] safe-area-bottom">
      <div className="max-w-md mx-auto px-4 h-14 sm:h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'home' 
            ? currentPage === 'home' 
            : (currentPage === 'member' || currentPage === 'profile' || currentPage === 'deposit' || currentPage === 'withdraw' || currentPage === 'history' || currentPage === 'promotion' || currentPage === 'agent' || currentPage === 'prize');

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
              {/* Active Indicator Glow */}
              {isActive && (
                <span className="absolute -top-1 w-10 h-1 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span>
              )}

              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                <Icon size={20} className={isActive ? 'stroke-[2.5] text-blue-600' : 'stroke-[1.8] text-slate-500'} />
              </div>

              <span className={`text-[11px] font-chakra font-bold tracking-wider leading-none mt-0.5 whitespace-nowrap ${
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
