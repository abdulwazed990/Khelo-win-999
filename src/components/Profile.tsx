import React, { useState } from 'react';
import { UserData } from '../types';
import { toBengaliNumber, formatBengaliCurrency } from '../utils';
import { motion } from 'motion/react';
import { 
  User as UserIcon, 
  Phone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Wallet, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  History as HistoryIcon
} from 'lucide-react';

interface ProfileProps {
  userData: UserData | null;
  onSignOut: () => void;
  setCurrentPage: (page: any) => void;
}

export default function Profile({ userData, onSignOut, setCurrentPage }: ProfileProps) {
  const [showPassword, setShowPassword] = useState(false);

  if (!userData) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-100 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-blue-50 rounded-[32px] flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
            <UserIcon size={48} />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className="text-2xl font-black text-blue-900 mb-1">{userData.name}</h3>
            <p className="text-blue-600 font-bold text-sm">@{userData.username}</p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck size={12} />
              Verified Account
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-gray-400 text-center sm:text-right">Total Balance</p>
              <p className="text-3xl font-black text-blue-900">৳{formatBengaliCurrency(userData.balance)}</p>
            </div>
            <button 
              onClick={onSignOut}
              className="mt-2 px-6 py-2 bg-red-50 text-red-600 font-black text-xs rounded-full hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 border border-red-100"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid - Now much higher up */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <QuickAction 
          icon={<ArrowDownLeft size={20} />} 
          label="Deposit" 
          color="blue"
          onClick={() => setCurrentPage('transactions')} 
        />
        <QuickAction 
          icon={<ArrowUpRight size={20} />} 
          label="Withdraw" 
          color="amber"
          onClick={() => setCurrentPage('transactions')} 
        />
        <QuickAction 
          icon={<HistoryIcon size={20} />} 
          label="History" 
          color="purple"
          onClick={() => setCurrentPage('history')} 
        />
        <QuickAction 
          icon={<Gift size={20} />} 
          label="Bonuses" 
          color="green"
          onClick={() => setCurrentPage('bonus')} 
        />
        <QuickAction 
          icon={<CreditCard size={20} />} 
          label="Records" 
          color="indigo"
          onClick={() => setCurrentPage('history')} 
        />
      </div>

      {/* Account Details Section */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-gray-50">
        <h4 className="text-xl font-black text-blue-900 mb-6 flex items-center gap-3">
          <UserIcon className="text-blue-600" size={20} />
          Account Details
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem icon={<UserIcon size={16} />} label="Full Name" value={userData.name} />
          <InfoItem icon={<Phone size={16} />} label="Phone" value={userData.phone ? toBengaliNumber(userData.phone) : 'Not set'} />
          <InfoItem icon={<Mail size={16} />} label="Email" value={userData.email} />
          <div className="relative">
            <InfoItem 
              icon={<Lock size={16} />} 
              label="Password" 
              value={showPassword ? "********" : "••••••••"} 
            />
            <button 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, color, onClick }: { icon: React.ReactNode, label: string, color: string, onClick: () => void }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600',
    purple: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-600',
    green: 'bg-green-50 text-green-600 border-green-100 hover:bg-green-600',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600',
  };

  return (
    <button 
      onClick={onClick}
      className={`p-4 ${colors[color]} border rounded-[32px] flex flex-col items-center justify-center gap-2 transition-all hover:text-white group shadow-sm active:scale-95`}
    >
      <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-white/20 transition-colors">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </button>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
        {icon}
      </div>
      <div>
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">{label}</span>
        <p className="text-gray-900 font-bold text-sm truncate">{value}</p>
      </div>
    </div>
  );
}
