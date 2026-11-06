import React, { useState } from 'react';
import { Transaction } from '../../types';
import { formatBDT } from '../../config/currency';
import { haptics } from '../../utils/haptics';
import { 
  XCircle, 
  Search, 
  Clock, 
  User, 
  Smartphone, 
  CreditCard, 
  AlertCircle,
  FileText,
  Ban,
  ArrowUpRight
} from 'lucide-react';

interface CancelWithdrawalsTabProps {
  transactions: Transaction[];
  lang: 'bn' | 'en';
  adminEmail: string;
  showToast: (msg: string) => void;
}

export default function CancelWithdrawalsTab({
  transactions,
  lang,
  adminEmail,
  showToast
}: CancelWithdrawalsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filter only cancelled or rejected withdrawal transactions
  const cancelledWithdrawals = transactions.filter(
    t => (t.type === 'withdraw' || t.type === 'DEMO_WITHDRAWAL') && 
         (t.status === 'rejected' || t.status === 'cancelled')
  );

  const filtered = cancelledWithdrawals.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (t.referenceId || t.id || '').toLowerCase().includes(q) ||
      (t.userName || '').toLowerCase().includes(q) ||
      (t.userPhone || '').toLowerCase().includes(q) ||
      (t.senderNumber || '').toLowerCase().includes(q) ||
      (t.method || '').toLowerCase().includes(q) ||
      (t.note || '').toLowerCase().includes(q)
    );
  });

  const totalCancelledAmount = cancelledWithdrawals.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900 flex items-center gap-2">
            <XCircle size={20} className="text-rose-600" />
            <span>{lang === 'bn' ? '৪. বাতিল উইথড্র রিকোয়েস্ট তালিকা' : '4. Cancelled Withdrawal Requests'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'bn' 
              ? 'প্রত্যাখ্যাত বা বাতিলকৃত সকল উইথড্র রিকোয়েস্টের স্থায়ী রেকর্ড ও রিফান্ড স্ট্যাটাস।' 
              : 'Permanent audit record of all rejected and cancelled withdrawal requests.'}
          </p>
        </div>

        {/* Total Summary Badge */}
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-2xl">
          <Ban size={15} className="text-rose-600" />
          <div className="text-xs">
            <span className="text-slate-500 font-bold mr-1">{lang === 'bn' ? 'মোট বাতিল:' : 'Total:'}</span>
            <span className="font-mono font-black text-rose-700">{cancelledWithdrawals.length} টি ({formatBDT(totalCancelledAmount)})</span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'bn' ? 'ইউজার নাম, নম্বর, মেথড বা ট্রানজেকশন আইডি দিয়ে খুঁজুন...' : 'Search by name, phone, method, or TX ID...'}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-rose-400 focus:bg-white transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Cancelled List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-200/60 text-slate-400 flex items-center justify-center mx-auto">
            <XCircle size={24} />
          </div>
          <p className="text-xs font-bold text-slate-500">
            {searchQuery 
              ? (lang === 'bn' ? 'অনুসন্ধানের সাথে কোনো বাতিল উইথড্র মিলছে না।' : 'No matching cancelled withdrawals found.')
              : (lang === 'bn' ? 'বর্তমানে কোনো বাতিল বা প্রত্যাখ্যাত উইথড্র রিকোয়েস্ট নেই।' : 'No cancelled or rejected withdrawals recorded.')}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="p-3.5 bg-white border border-rose-100 hover:border-rose-200 rounded-2xl shadow-2xs transition-all space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                    <ArrowUpRight size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-chakra font-black text-xs text-slate-900">
                        {tx.userName || 'Member'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                        {tx.status === 'rejected' ? (lang === 'bn' ? 'প্রত্যাখ্যাত' : 'REJECTED') : (lang === 'bn' ? 'বাতিলকৃত' : 'CANCELLED')}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        ✓ {lang === 'bn' ? 'ব্যালেন্সে রিফান্ডেড' : 'Refunded'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-mono">{tx.userPhone || tx.senderNumber || tx.uid}</span>
                      <span>•</span>
                      <span className="font-bold text-slate-700 uppercase">{tx.method || 'bKash'}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">ID: {tx.referenceId || tx.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                  <div className="font-rajdhani font-black text-base text-rose-600">
                    {formatBDT(tx.amount)}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    <span>{new Date(tx.processedAt || tx.createdAt || Date.now()).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Note / Cancellation Reason */}
              {tx.note && (
                <div className="p-2 bg-rose-50/70 border border-rose-100 rounded-xl text-[11px] text-rose-800 flex items-start gap-1.5">
                  <AlertCircle size={13} className="shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-bold mr-1">{lang === 'bn' ? 'বাতিলের কারণ:' : 'Reason:'}</span>
                    <span>{tx.note}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
