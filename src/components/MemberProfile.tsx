import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserData, Transaction } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';
import { formatBDT } from '../config/currency';
import { format } from 'date-fns';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  History, 
  LogOut, 
  ShieldCheck, 
  ChevronRight, 
  Coins, 
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Globe,
  Vibrate,
  Smartphone,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  CreditCard,
  Receipt
} from 'lucide-react';

interface MemberProfileProps {
  user: User | null;
  userData: UserData | null;
  onNavigate: (page: string) => void;
}

export default function MemberProfile({ user, userData, onNavigate }: MemberProfileProps) {
  const { lang, setLanguage, toggleLanguage, t } = useLanguage();
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [hapticsOn, setHapticsOn] = useState<boolean>(() => haptics.getEnabled());
  
  // Real-time Deposit & Withdrawal History
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [txFilter, setTxFilter] = useState<'all' | 'deposit' | 'withdraw'>('all');

  const copyUid = () => {
    if (!user) return;
    haptics.success();
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const copyTxId = (id: string) => {
    haptics.success();
    navigator.clipboard.writeText(id);
    setCopiedTxId(id);
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  const handleToggleHaptics = () => {
    const newState = !hapticsOn;
    setHapticsOn(newState);
    haptics.setEnabled(newState);
  };

  // Real-time Firestore transaction listener
  useEffect(() => {
    const currentUid = userData?.uid || user?.uid;
    if (!currentUid) {
      setLoadingTx(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'transactions'),
        where('uid', '==', currentUid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Transaction[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Transaction);
          });
          setTransactions(list);
          setLoadingTx(false);
        },
        () => {
          setLoadingTx(false);
        }
      );

      return () => unsubscribe();
    } catch {
      setLoadingTx(false);
    }
  }, [userData?.uid, user?.uid]);

  // Filter deposit and withdrawal records
  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'all') {
      return tx.type === 'deposit' || tx.type === 'withdraw';
    }
    return tx.type === txFilter;
  });

  const getStatusBadge = (status: string) => {
    const normalized = (status || 'pending').toLowerCase();
    if (normalized === 'approved' || normalized === 'completed' || normalized === 'settled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={11} className="text-emerald-600" />
          <span>{lang === 'bn' ? 'অনুমোদিত' : 'Approved'}</span>
        </span>
      );
    }
    if (normalized === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
          <Clock size={11} className="text-blue-600 animate-spin" />
          <span>{lang === 'bn' ? 'প্রক্রিয়াধীন' : 'Processing'}</span>
        </span>
      );
    }
    if (normalized === 'rejected' || normalized === 'failed' || normalized === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={11} className="text-rose-600" />
          <span>{lang === 'bn' ? 'বাতিল' : 'Rejected'}</span>
        </span>
      );
    }
    // Default Pending
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
        <Clock size={11} className="text-amber-600" />
        <span>{lang === 'bn' ? 'অপেক্ষারত' : 'Pending'}</span>
      </span>
    );
  };

  const formatTxDate = (createdAt: any) => {
    if (!createdAt) return 'Just now';
    try {
      if (typeof createdAt === 'string') {
        return format(new Date(createdAt), 'dd MMM yyyy, hh:mm a');
      }
      if (createdAt.toDate && typeof createdAt.toDate === 'function') {
        return format(createdAt.toDate(), 'dd MMM yyyy, hh:mm a');
      }
      if (createdAt.seconds) {
        return format(new Date(createdAt.seconds * 1000), 'dd MMM yyyy, hh:mm a');
      }
      return 'Just now';
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto">
      {/* Profile Header Card */}
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
              <span className="text-[9px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-full uppercase shadow-xs">
                VIP 1
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="font-mono text-[11px]">UID: {user?.uid.slice(0, 8)}...</span>
              <button onClick={copyUid} className="text-blue-600 hover:text-blue-800" title="Copy UID">
                {copiedUid ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>

            <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
              {lang === 'bn' ? 'ফোন:' : 'Phone:'} {userData?.phone || (lang === 'bn' ? 'ভেরিফাইড মেম্বার' : 'Verified Member')}
            </div>
          </div>
        </div>

        {/* Balance & Quick Actions Card */}
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
                onNavigate('transactions');
              }}
              className="py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-chakra font-black text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowDownLeft size={14} />
              <span>{t('member.deposit_btn', 'ডিপোজিট')}</span>
            </button>

            <button
              onClick={() => {
                haptics.selection();
                onNavigate('transactions');
              }}
              className="py-2.5 bg-white text-slate-800 font-chakra font-bold text-xs rounded-xl border border-slate-300 shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight size={14} />
              <span>{t('member.withdraw_btn', 'উইথড্র')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Deposit & Withdrawal Status Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt size={16} />
            </div>
            <div>
              <h3 className="font-chakra font-black text-slate-900 text-xs sm:text-sm">
                {lang === 'bn' ? 'জমা ও উত্তোলনের রিয়েল-টাইম স্ট্যাটাস' : 'Deposit & Withdrawal Status'}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {lang === 'bn' ? 'লাইভ ব্যাকএন্ড স্টেটাস ট্র্যাকিং' : 'Real-time live transaction status'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              haptics.selection();
              onNavigate('transactions');
            }}
            className="text-[11px] font-chakra font-black text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            <span>{lang === 'bn' ? 'ক্যাশিয়ার' : 'Cashier'}</span>
            <ChevronRight size={12} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => {
              haptics.selection();
              setTxFilter('all');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all ${
              txFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {lang === 'bn' ? 'সকল' : 'All'}
          </button>
          <button
            onClick={() => {
              haptics.selection();
              setTxFilter('deposit');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all ${
              txFilter === 'deposit'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-emerald-700'
            }`}
          >
            {lang === 'bn' ? 'ডিপোজিট' : 'Deposits'}
          </button>
          <button
            onClick={() => {
              haptics.selection();
              setTxFilter('withdraw');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all ${
              txFilter === 'withdraw'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-blue-700'
            }`}
          >
            {lang === 'bn' ? 'উইথড্র' : 'Withdrawals'}
          </button>
        </div>

        {/* Transaction Cards List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
          {loadingTx ? (
            <div className="py-8 text-center text-xs text-slate-400 font-bold animate-pulse">
              {lang === 'bn' ? 'লেনদেন লোড হচ্ছে...' : 'Loading transaction status...'}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <History size={18} />
              </div>
              <p className="text-xs font-bold text-slate-500">
                {txFilter === 'deposit'
                  ? (lang === 'bn' ? 'কোনো ডিপোজিট রেকর্ড পাওয়া যায়নি' : 'No deposit records found')
                  : txFilter === 'withdraw'
                  ? (lang === 'bn' ? 'কোনো উত্তোলন রেকর্ড পাওয়া যায়নি' : 'No withdrawal records found')
                  : (lang === 'bn' ? 'কোনো লেনদেনের রেকর্ড এখনও নেই' : 'No transactions recorded yet')}
              </p>
              <button
                onClick={() => {
                  haptics.selection();
                  onNavigate('transactions');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-black hover:bg-blue-100 transition-colors"
              >
                <ArrowDownLeft size={13} />
                <span>{lang === 'bn' ? 'এখনই ডিপোজিট করুন' : 'Make a Deposit'}</span>
              </button>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isDeposit = tx.type === 'deposit';
              const trxDisplayId = tx.transactionId || tx.referenceId || tx.id;

              return (
                <div
                  key={tx.id}
                  className="bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-200 rounded-2xl p-3 space-y-2"
                >
                  {/* Top line: Type, Method badge & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isDeposit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                      </div>
                      <div>
                        <span className="font-chakra font-black text-xs text-slate-900 block leading-tight">
                          {isDeposit
                            ? (lang === 'bn' ? 'ডিপোজিট' : 'Deposit')
                            : (lang === 'bn' ? 'উইথড্র' : 'Withdrawal')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {tx.method || 'Mobile Banking'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>

                  {/* Amount & Time Row */}
                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/70">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {lang === 'bn' ? 'পরিমাণ' : 'Amount'}
                      </span>
                      <span
                        className={`font-rajdhani font-black text-base sm:text-lg ${
                          isDeposit ? 'text-emerald-600' : 'text-blue-700'
                        }`}
                      >
                        {isDeposit ? '+' : '-'}৳{Number(tx.amount || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {lang === 'bn' ? 'তারিখ ও সময়' : 'Date & Time'}
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-slate-600">
                        {formatTxDate(tx.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Transaction ID / Reference Row */}
                  {trxDisplayId && (
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-[10px]">
                      <span className="text-slate-500 font-medium">
                        {lang === 'bn' ? 'ট্রানজেকশন আইডি / TrxID:' : 'Transaction ID / TrxID:'}
                      </span>
                      <button
                        onClick={() => copyTxId(trxDisplayId)}
                        className="flex items-center gap-1 font-mono font-bold text-blue-700 hover:text-blue-900"
                        title="Copy Transaction ID"
                      >
                        <span className="truncate max-w-[150px]">{trxDisplayId}</span>
                        {copiedTxId === trxDisplayId ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      </button>
                    </div>
                  )}

                  {/* Sender Number if present */}
                  {tx.senderNumber && (
                    <div className="text-[10px] text-slate-500 flex items-center justify-between px-1">
                      <span>{isDeposit ? (lang === 'bn' ? 'প্রেরক নম্বর:' : 'Sender No:') : (lang === 'bn' ? 'গ্রাহক নম্বর:' : 'Recipient No:')}</span>
                      <span className="font-mono font-bold text-slate-700">{tx.senderNumber}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Profile Navigation Options */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3 space-y-1 shadow-sm">
        <button
          onClick={() => {
            haptics.selection();
            onNavigate('transactions');
          }}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 transition-all text-xs font-bold"
        >
          <div className="flex items-center gap-2.5">
            <Wallet size={16} className="text-emerald-600" />
            <span>{lang === 'bn' ? 'জমা ও উত্তোলনের ক্যাশিয়ার' : 'Deposit & Cashier Management'}</span>
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
            <History size={16} className="text-blue-600" />
            <span>{lang === 'bn' ? 'সম্পূর্ণ বেটিং ও অ্যাকাউন্ট ইতিহাস' : 'Full Betting & Account History'}</span>
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
            <Coins size={16} className="text-amber-500" />
            <span>{lang === 'bn' ? 'দৈনিক ফ্রি স্পিন ও উপহার' : 'Daily Free Spin & Rewards'}</span>
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
            <Sparkles size={16} className="text-indigo-600" />
            <span>{lang === 'bn' ? 'এজেন্ট পার্টনার প্রোগ্রাম (৪০%)' : 'Agent Affiliate Program'}</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
        </button>

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

      {/* Logout Action */}
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

