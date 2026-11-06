import React, { useState } from 'react';
import { Transaction } from '../../types';
import { formatBDT } from '../../config/currency';
import { haptics } from '../../utils/haptics';
import { 
  AlertOctagon, 
  Search, 
  Clock, 
  ArrowDownRight,
  Ban,
  AlertCircle
} from 'lucide-react';

interface CancelDepositsTabProps {
  transactions: Transaction[];
  lang: 'bn' | 'en';
  adminEmail: string;
  showToast: (msg: string) => void;
}

export default function CancelDepositsTab({
  transactions,
  lang,
  adminEmail,
  showToast
}: CancelDepositsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only cancelled or rejected deposit transactions
  const cancelledDeposits = transactions.filter(
    t => (t.type === 'deposit' || t.type === 'DEMO_TOPUP') && 
         (t.status === 'rejected' || t.status === 'cancelled')
  );

  const filtered = cancelledDeposits.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (t.referenceId || t.id || '').toLowerCase().includes(q) ||
      (t.transactionId || '').toLowerCase().includes(q) ||
      (t.userName || '').toLowerCase().includes(q) ||
      (t.userPhone || '').toLowerCase().includes(q) ||
      (t.senderNumber || '').toLowerCase().includes(q) ||
      (t.method || '').toLowerCase().includes(q) ||
      (t.note || '').toLowerCase().includes(q)
    );
  });

  const totalCancelledAmount = cancelledDeposits.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900 flex items-center gap-2">
            <AlertOctagon size={20} className="text-amber-600" />
            <span>{lang === 'bn' ? '৫. বাতিল ডিপোজিট রিকোয়েস্ট তালিকা' : '5. Cancelled Deposit Requests'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'bn' 
              ? 'ভুল তথ্য বা অসম্পূর্ণ ট্রানজেকশনের কারণে বাতিল ও প্রত্যাখ্যাত সকল ডিপোজিটের রেকর্ড।' 
              : 'Permanent audit record of all rejected and cancelled deposit requests.'}
          </p>
        </div>

        {/* Total Summary Badge */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-2xl">
          <Ban size={15} className="text-amber-600" />
          <div className="text-xs">
            <span className="text-slate-500 font-bold mr-1">{lang === 'bn' ? 'মোট বাতিল:' : 'Total:'}</span>
            <span className="font-mono font-black text-amber-700">{cancelledDeposits.length} টি ({formatBDT(totalCancelledAmount)})</span>
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
          placeholder={lang === 'bn' ? 'ইউজার নাম, ট্রানজেকশন TrxID, প্রেরক নম্বর দিয়ে খুঁজুন...' : 'Search by name, TrxID, sender phone, or method...'}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-400 focus:bg-white transition-all"
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
            <AlertOctagon size={24} />
          </div>
          <p className="text-xs font-bold text-slate-500">
            {searchQuery 
              ? (lang === 'bn' ? 'অনুসন্ধানের সাথে কোনো বাতিল ডিপোজিট মিলছে না।' : 'No matching cancelled deposits found.')
              : (lang === 'bn' ? 'বর্তমানে কোনো বাতিল বা প্রত্যাখ্যাত ডিপোজিট রিকোয়েস্ট নেই।' : 'No cancelled or rejected deposits recorded.')}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="p-3.5 bg-white border border-amber-100 hover:border-amber-200 rounded-2xl shadow-2xs transition-all space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <ArrowDownRight size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-chakra font-black text-xs text-slate-900">
                        {tx.userName || 'Member'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        {tx.status === 'rejected' ? (lang === 'bn' ? 'প্রত্যাখ্যাত ডিপোজিট' : 'REJECTED') : (lang === 'bn' ? 'বাতিল' : 'CANCELLED')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                      <span>{lang === 'bn' ? 'মেথড:' : 'Method:'} <strong className="text-slate-800 uppercase">{tx.method || 'bKash'}</strong></span>
                      <span>•</span>
                      <span>{lang === 'bn' ? 'প্রেরক নম্বর:' : 'Sender:'} <strong className="font-mono text-slate-800">{tx.senderNumber || tx.userPhone || 'N/A'}</strong></span>
                      {tx.transactionId && (
                        <>
                          <span>•</span>
                          <span>TrxID: <strong className="font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded">{tx.transactionId}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                  <div className="font-rajdhani font-black text-base text-amber-700">
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
                <div className="p-2 bg-amber-50/70 border border-amber-100 rounded-xl text-[11px] text-amber-800 flex items-start gap-1.5">
                  <AlertCircle size={13} className="shrink-0 text-amber-600 mt-0.5" />
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
