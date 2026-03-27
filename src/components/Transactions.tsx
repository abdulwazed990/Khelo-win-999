import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
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
  XCircle
} from 'lucide-react';

interface TransactionsProps {
  userData: UserData | null;
}

const LOGOS = {
  bkash: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQN0UOeKLg08B-5oj_6s8k6URzU6BUlk93wz7YeeQdrqi6znNUZgkKMhjA0&s=10',
  nagad: 'https://images.seeklogo.com/logo-png/35/1/nagad-logo-png_seeklogo-355240.png',
  rocket: 'https://static.vecteezy.com/system/resources/thumbnails/068/706/013/small_2x/rocket-color-logo-mobile-banking-icon-free-png.png'
};

export default function Transactions({ userData }: TransactionsProps) {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [method, setMethod] = useState<'nagad' | 'bkash' | 'rocket'>('nagad');
  const [amount, setAmount] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    if (method !== 'nagad') return; // Only Nagad available for deposit
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'transactions'), {
        uid: userData.uid,
        type: 'deposit',
        method: 'nagad',
        amount: Number(amount),
        status: 'pending',
        senderNumber,
        transactionId,
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
      setError('Failed to submit deposit request.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    
    // Withdrawal rules
    if (userData.balance < 8000) {
      setError('উইথড্র করার জন্য আপনার ব্যালেন্স কমপক্ষে ৮,০০০ টাকা হতে হবে।');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'transactions'), {
        uid: userData.uid,
        type: 'withdraw',
        method,
        amount: Number(amount),
        status: 'pending',
        senderNumber, // This will be the recipient number for withdrawals
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
      setError('Failed to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  if (!userData) return null;

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-white p-10 rounded-[40px] border border-green-100 shadow-2xl shadow-green-50 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center text-green-600 mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-2xl font-black text-green-900 mb-2">Request Submitted!</h3>
        <p className="text-gray-500 font-medium mb-8">
          {tab === 'deposit' 
            ? 'সর্বোচ্চ ৫ মিনিটের মধ্যে আপনার টাকা আপনার একাউন্টে যোগ হয়ে যাবে।' 
            : 'সর্বোচ্চ ২ ঘণ্টার মধ্যে আপনার উইথড্র আপনার মোবাইলের মধ্যে পাঠিয়ে দেয়া হবে।'}
        </p>
        <button 
          onClick={() => setSuccess(false)}
          className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 transition-all"
        >
          DONE
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex bg-gray-100 p-1.5 rounded-3xl mb-10">
        <button 
          onClick={() => { setTab('deposit'); setMethod('nagad'); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all ${
            tab === 'deposit' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ArrowDownLeft size={18} />
          DEPOSIT
        </button>
        <button 
          onClick={() => { setTab('withdraw'); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all ${
            tab === 'withdraw' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ArrowUpRight size={18} />
          WITHDRAW
        </button>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-100">
        <h3 className="text-2xl font-black text-blue-900 mb-8 flex items-center gap-3">
          {tab === 'deposit' ? <ArrowDownLeft className="text-blue-600" /> : <ArrowUpRight className="text-blue-600" />}
          {tab === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
        </h3>

        {/* Method Selection */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {(['nagad', 'bkash', 'rocket'] as const).map((m) => {
            const isAvailable = tab === 'withdraw' || m === 'nagad';
            return (
              <button 
                key={m}
                disabled={!isAvailable}
                onClick={() => setMethod(m)}
                className={`relative p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group ${
                  method === m ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-100'
                } ${!isAvailable ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
              >
                <img src={LOGOS[m]} alt={m} className="h-10 object-contain" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-600">{m}</span>
                {method === m && (
                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-md">
                    <CheckCircle2 size={14} />
                  </div>
                )}
                {!isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-3xl">
                    <span className="text-[8px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-full border border-red-100">UNAVAILABLE</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {tab === 'deposit' && method === 'nagad' && (
          <div className="mb-8 p-6 bg-blue-50 rounded-3xl border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-blue-400">Nagad Personal Number</p>
                <p className="text-xl font-black text-blue-900">01340772478</p>
              </div>
            </div>
            <p className="text-xs text-blue-600 font-medium leading-relaxed">
              নির্দিষ্ট নাম্বারে টাকা সেন্ড মানি করে সঠিক ট্রানজেকশন আইডি এবং প্রেরক নাম্বারটা সাবমিট করুন।
            </p>
          </div>
        )}

        {tab === 'withdraw' && userData.balance < 8000 && (
          <div className="mb-8 p-6 bg-red-50 rounded-3xl border border-red-100 flex items-start gap-4">
            <AlertCircle className="text-red-600 shrink-0" size={24} />
            <p className="text-sm text-red-600 font-bold leading-relaxed">
              আট হাজার টাকা কমপ্লিট হওয়ার পর উইথড্র অপশন চালু হবে। বর্তমানে আপনার ব্যালেন্স ৳{userData.balance.toLocaleString()}।
            </p>
          </div>
        )}

        <form onSubmit={tab === 'deposit' ? handleDeposit : handleWithdraw} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (৳)</label>
            <div className="relative">
              <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="number"
                placeholder="Enter amount"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              {tab === 'deposit' ? 'Sender Number' : 'Recipient Number'}
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="01XXXXXXXXX"
                required
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
              />
            </div>
          </div>

          {tab === 'deposit' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Transaction ID</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text"
                  placeholder="Enter Transaction ID"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || (tab === 'withdraw' && userData.balance < 8000)}
            className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>SUBMIT {tab.toUpperCase()}</span>
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] font-bold text-red-500 uppercase tracking-widest">
          নাম্বার অথবা ট্রানজেকশন আইডি ভুল হলে আপনার লেনদেন ব্যর্থ হবে।
        </p>

        <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <ShieldCheck size={14} className="text-blue-600" />
            Secure SSL Encryption
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <Clock size={14} className="text-blue-600" />
            24/7 Support
          </div>
        </div>
      </div>
    </div>
  );
}
