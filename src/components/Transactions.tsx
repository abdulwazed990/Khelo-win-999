import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, increment, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserData, SiteSettings, PaymentMethodConfig } from '../types';
import { toBengaliNumber, formatBengaliCurrency } from '../utils';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Phone, 
  Hash, 
  Coins,
  Clock,
  ShieldCheck,
  XCircle,
  Copy,
  Check,
  Info
} from 'lucide-react';

interface TransactionsProps {
  userData: UserData | null;
  user?: any;
}

const DEFAULT_LOGOS: Record<string, string> = {
  bkash: 'https://download.logo.wine/logo/BKash/BKash-Logo.wine.png',
  nagad: 'https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png',
  upay: 'https://play-lh.googleusercontent.com/j4q49Uq8eN2kH89VbM_z21Z6i6A1G5Qv3_f2T4y_b4q4'
};

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 15000, 20000, 30000];

export default function Transactions({ userData, user }: TransactionsProps) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [method, setMethod] = useState<string>('bkash');
  const [amount, setAmount] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copiedNum, setCopiedNum] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [customPaymentMethods, setCustomPaymentMethods] = useState<PaymentMethodConfig[]>([]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'site'));
        if (snap.exists()) {
          setSettings(snap.data() as SiteSettings);
        }
      } catch (err) {
        console.warn('Could not load site settings:', err);
      }
    }
    loadSettings();

    // Listen to custom payment methods configured by admin
    const q = query(collection(db, 'payment_methods'), orderBy('sortOrder', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const list: PaymentMethodConfig[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as PaymentMethodConfig));
        const activeList = list.filter(m => m.status === 'active' && m.methodId !== 'rocket');
        if (activeList.length > 0) {
          setCustomPaymentMethods(activeList);
        }
      }
    }, () => {});

    return () => unsub();
  }, []);

  const activeMethodObj = customPaymentMethods.find(m => m.methodId === method);

  const activeNumber = activeMethodObj?.accountNumber || (
    method === 'nagad' 
      ? (settings?.depositNagadNumber || '01641404837')
      : (settings?.depositBkashNumber || '01641404837')
  );

  const copyNumber = () => {
    haptics.success();
    navigator.clipboard.writeText(activeNumber);
    setCopiedNum(true);
    setTimeout(() => setCopiedNum(false), 2000);
  };

  const handleSelectPreset = (val: number) => {
    haptics.selection();
    setAmount(val.toString());
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 200) {
      haptics.error();
      setError(lang === 'bn' ? 'সর্বনিম্ন ডিপোজিট পরিমাণ ৳২০০।' : 'Minimum deposit amount is ৳200.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'transactions'), {
        uid: userData.uid,
        userName: userData.name || userData.username || 'User',
        userPhone: userData.phone || '',
        type: 'deposit',
        method,
        amount: numAmount,
        status: 'pending',
        senderNumber: senderNumber.trim(),
        transactionId: transactionId.trim().toUpperCase(),
        createdAt: new Date().toISOString()
      });

      if (userData.balance >= 8000 && numAmount >= 2500) {
        await updateDoc(doc(db, 'users', userData.uid), {
          hasDepositedAfter8k: true
        });
      }

      haptics.success();
      setSuccess(true);
    } catch (err) {
      haptics.error();
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
      setError(lang === 'bn' ? 'ডিপোজিট রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে।' : 'Failed to submit deposit request.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    
    if (userData.balance < 8000) {
      haptics.error();
      setError(lang === 'bn' ? 'উইথড্র করার জন্য আপনার ব্যালেন্স কমপক্ষে ৳৮,০০০ হতে হবে।' : 'Minimum ৳8,000 balance required for withdrawal.');
      return;
    }

    if (!userData.hasDepositedAfter8k || (userData.turnover || 0) < 200) {
      haptics.error();
      setError(lang === 'bn' ? 'আপনাকে ২৫০০ টাকা ডিপোজিট করে ২০০ টাকার টার্নওভার সম্পন্ন করতে হবে।' : 'You must deposit ৳2,500 and complete ৳200 turnover.');
      return;
    }

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount < 500) {
      haptics.error();
      setError(lang === 'bn' ? 'সর্বনিম্ন উইথড্র পরিমাণ ৳৫০০।' : 'Minimum withdrawal amount is ৳500.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        balance: increment(-withdrawAmount)
      });

      await addDoc(collection(db, 'transactions'), {
        uid: userData.uid,
        userName: userData.name || userData.username || 'User',
        userPhone: userData.phone || '',
        type: 'withdraw',
        method,
        amount: withdrawAmount,
        status: 'pending',
        senderNumber: senderNumber.trim(),
        createdAt: new Date().toISOString()
      });
      haptics.success();
      setSuccess(true);
    } catch (err) {
      haptics.error();
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
      setError(lang === 'bn' ? 'উইথড্র রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে।' : 'Failed to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  if (!userData) return null;

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-emerald-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 size={36} />
        </div>
        <h3 className="text-xl font-black text-slate-900 font-chakra">
          {lang === 'bn' ? 'অনুরোধ সফলভাবে গৃহীত হয়েছে!' : 'Request Submitted Successfully!'}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
          {tab === 'deposit' 
            ? (lang === 'bn' ? 'সর্বোচ্চ ৫ মিনিটের মধ্যে অ্যাডমিন ভেরিফাই করে ব্যালেন্স যোগ করে দেবে।' : 'Your deposit will be verified and credited within 5 minutes.')
            : (lang === 'bn' ? 'সর্বোচ্চ ৩০ মিনিটের মধ্যে আপনার উইথড্র পেমেন্ট প্রক্রিয়া সম্পন্ন হবে।' : 'Withdrawal will be transferred to your account within 30 minutes.')}
        </p>
        <button 
          onClick={() => {
            setSuccess(false);
            setAmount('');
            setSenderNumber('');
            setTransactionId('');
          }}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-chakra font-black rounded-2xl text-xs shadow-md active:scale-95 transition-all"
        >
          {t('common.done', 'সম্পন্ন')}
        </button>
      </div>
    );
  }

  // Available display methods (bKash & Nagad only)
  const methodsToDisplay = (customPaymentMethods.length > 0
    ? customPaymentMethods.filter(m => m.methodId !== 'rocket')
    : []
  );

  const finalMethods = methodsToDisplay.length > 0
    ? methodsToDisplay
    : [
        { id: '1', methodId: 'bkash', name: 'bKash', nameBn: 'বিকাশ', iconUrl: DEFAULT_LOGOS.bkash, status: 'active' as const, sortOrder: 1 },
        { id: '2', methodId: 'nagad', name: 'Nagad', nameBn: 'নগদ', iconUrl: DEFAULT_LOGOS.nagad, status: 'active' as const, sortOrder: 2 },
      ];

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Switch Tab (Deposit / Withdraw) */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300 shadow-inner">
        <button 
          onClick={() => {
            haptics.selection();
            setTab('deposit');
            setError('');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-chakra font-black text-xs transition-all ${
            tab === 'deposit' 
              ? 'bg-white text-blue-600 shadow-md' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft size={16} />
          {t('member.deposit_btn', 'ডিপোজিট')}
        </button>
        <button 
          onClick={() => {
            haptics.selection();
            setTab('withdraw');
            setError('');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-chakra font-black text-xs transition-all ${
            tab === 'withdraw' 
              ? 'bg-white text-blue-600 shadow-md' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight size={16} />
          {t('member.withdraw_btn', 'উইথড্র')}
        </button>
      </div>

      {/* Main Light Card Container */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-lg space-y-4">
        {/* Payment Methods Section with Larger, Recognized Brand Cards */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            {lang === 'bn' ? 'পেমেন্ট মেথড নির্বাচন করুন:' : 'Select Payment Method:'}
          </label>
          
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
            {finalMethods.map((m, idx) => {
              const isSelected = method === m.methodId;
              const logoSrc = m.iconUrl || DEFAULT_LOGOS[m.methodId] || DEFAULT_LOGOS.bkash;
              const displayName = lang === 'bn' && m.nameBn ? m.nameBn : m.name;

              return (
                <button 
                  key={m.id || m.methodId || `pm_${idx}`}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setMethod(m.methodId);
                  }}
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2.5 relative ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/90 shadow-md ring-2 ring-blue-500/20 scale-[1.02]' 
                      : 'border-slate-200 bg-slate-50/90 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="h-16 sm:h-20 w-full flex items-center justify-center p-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <img 
                      src={logoSrc} 
                      alt={displayName} 
                      className="max-h-14 sm:max-h-16 w-auto max-w-[150px] object-contain transition-transform duration-200" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (m.methodId === 'bkash') {
                          target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/BKash_logo.png/320px-BKash_logo.png';
                        } else {
                          target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Nagad_Logo.svg/320px-Nagad_Logo.svg.png';
                        }
                      }}
                    />
                  </div>
                  <span className={`text-xs sm:text-sm font-chakra font-black uppercase tracking-wider ${isSelected ? 'text-blue-700 font-extrabold' : 'text-slate-700 font-bold'}`}>
                    {displayName}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 bg-blue-600 text-white rounded-full p-1 shadow-sm">
                      <CheckCircle2 size={15} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Deposit Info Box */}
        {tab === 'deposit' && (
          <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Phone size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-amber-800 font-bold uppercase block">
                    {method.toUpperCase()} {lang === 'bn' ? 'পার্সোনাল / এজেন্ট নম্বর' : 'Cashier Number'}
                  </span>
                  <span className="text-sm font-black text-slate-900 font-mono tracking-wider">
                    {activeNumber}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={copyNumber}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
              >
                {copiedNum ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedNum ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied') : (lang === 'bn' ? 'কপি' : 'Copy')}</span>
              </button>
            </div>
            
            <p className="text-[11px] text-slate-700 leading-snug font-medium">
              {lang === 'bn' 
                ? '📌 উপরের নম্বরে সেন্ড মানি (Send Money) করে নিচের বক্সে আপনার প্রেরক নম্বর ও TrxID দিন।' 
                : '📌 Send Money to the above number, then fill your sender number & Transaction ID below.'}
            </p>
          </div>
        )}

        {/* Preset Amount UI (Demo/Selectable Preset Buttons) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>{lang === 'bn' ? 'কুইক সিলেক্ট বাটন (টাকা):' : 'Quick Amount Presets:'}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {lang === 'bn' ? '(ক্লিক করে মান বসান)' : '(Click to set amount)'}
            </span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_AMOUNTS.map((val) => {
              const isValSelected = amount === val.toString();
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelectPreset(val)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-rajdhani font-black transition-all border text-center ${
                    isValSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  }`}
                >
                  ৳{val.toLocaleString()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={tab === 'deposit' ? handleDeposit : handleWithdraw} className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {lang === 'bn' ? 'টাকার পরিমাণ (৳):' : 'Amount (৳):'}
            </label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="number"
                placeholder={tab === 'deposit' ? (lang === 'bn' ? 'সর্বনিম্ন ৳২০০' : 'Min ৳200') : (lang === 'bn' ? 'সর্বনিম্ন ৳৫০০' : 'Min ৳500')}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-rajdhani text-base font-black focus:bg-white focus:border-blue-600 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {tab === 'deposit' ? (lang === 'bn' ? 'আপনার প্রেরক নম্বর:' : 'Your Sender Phone:') : (lang === 'bn' ? 'উইথড্র প্রাপক নম্বর:' : 'Recipient Phone:')}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="01XXXXXXXXX"
                required
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:bg-white focus:border-blue-600 outline-none transition-all"
              />
            </div>
          </div>

          {tab === 'deposit' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                {lang === 'bn' ? 'ট্রানজেকশন আইডি (TxID):' : 'Transaction ID (TxID):'}
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="e.g. 9J8B23KL"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:bg-white focus:border-blue-600 outline-none uppercase transition-all"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-500 hover:to-blue-600 text-white font-chakra font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>
                {tab === 'deposit' 
                  ? (lang === 'bn' ? 'ডিপোজিট রিকোয়েস্ট পাঠান' : 'SUBMIT DEPOSIT REQUEST') 
                  : (lang === 'bn' ? 'উইথড্র রিকোয়েস্ট পাঠান' : 'SUBMIT WITHDRAWAL REQUEST')}
              </span>
            )}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
          <span className="flex items-center gap-1 text-slate-500">
            <ShieldCheck size={13} className="text-emerald-600" />
            {lang === 'bn' ? 'নিরাপদ গেটওয়ে' : 'SSL Encrypted'}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock size={13} className="text-blue-600" />
            {lang === 'bn' ? 'দ্রুত নিষ্পত্তি' : 'Fast Processing'}
          </span>
        </div>
      </div>
    </div>
  );
}
