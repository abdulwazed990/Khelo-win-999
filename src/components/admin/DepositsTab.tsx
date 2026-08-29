import React, { useState } from 'react';
import { Transaction } from '../../types';
import { formatBDT } from '../../config/currency';
import { logAdminAudit } from '../../services/gameEngine';
import { haptics } from '../../utils/haptics';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  Clock, 
  User, 
  Smartphone, 
  CreditCard, 
  AlertCircle,
  Hash
} from 'lucide-react';

interface DepositsTabProps {
  transactions: Transaction[];
  lang: 'bn' | 'en';
  adminEmail: string;
  showToast: (msg: string) => void;
}

export default function DepositsTab({
  transactions,
  lang,
  adminEmail,
  showToast
}: DepositsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const deposits = transactions.filter(t => t.type === 'deposit' || t.type === 'DEMO_TOPUP');

  const filteredDeposits = deposits.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      (t.referenceId || t.id || '').toLowerCase().includes(q) ||
      (t.transactionId || '').toLowerCase().includes(q) ||
      (t.userName || '').toLowerCase().includes(q) ||
      (t.userPhone || '').toLowerCase().includes(q) ||
      (t.senderNumber || '').toLowerCase().includes(q) ||
      (t.method || '').toLowerCase().includes(q)
    );
    return matchesStatus && matchesQuery;
  });

  const pendingCount = deposits.filter(t => t.status === 'pending').length;

  const handleDepositAction = async (tx: Transaction, action: 'approved' | 'rejected') => {
    if (processingId) return;
    const confirmPrompt = window.confirm(
      lang === 'bn' 
        ? `আপনি কি নিশ্চিত যে আপনি এই ডিপোজিটটি ${action === 'approved' ? 'অনুমোদন' : 'বাতিল'} করতে চান?` 
        : `Are you sure you want to ${action} this deposit request?`
    );
    if (!confirmPrompt) return;

    setProcessingId(tx.id);
    haptics.medium();

    try {
      const txRef = doc(db, 'transactions', tx.id);
      await updateDoc(txRef, {
        status: action,
        processedAt: new Date().toISOString(),
        processedBy: adminEmail
      });

      // If approved, credit user wallet
      if (action === 'approved') {
        const userRef = doc(db, 'users', tx.uid);
        await updateDoc(userRef, {
          balance: increment(Number(tx.amount))
        });
      }

      // Record audit log
      await logAdminAudit(
        adminEmail,
        `DEPOSIT_${action.toUpperCase()}`,
        tx.referenceId || tx.id,
        'DEPOSIT',
        `Deposit of ${formatBDT(tx.amount)} ${action} for user ${tx.userName || tx.uid}`,
        { txId: tx.id, uid: tx.uid, amount: tx.amount, action, method: tx.method, trxId: tx.transactionId }
      );

      showToast(
        lang === 'bn' 
          ? `ডিপোজিট সফলভাবে ${action === 'approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'} হয়েছে!` 
          : `Deposit request successfully ${action}!`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${tx.id}`);
      showToast(lang === 'bn' ? 'ত্রুটি হয়েছে!' : 'Action failed!');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900 flex items-center gap-2">
            <span>{lang === 'bn' ? 'ডেমো ডিপোজিট অনুমোদন' : 'Demo Deposit Approvals'}</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-mono font-bold animate-pulse">
                {pendingCount} {lang === 'bn' ? 'পেন্ডিং' : 'Pending'}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'bn' ? 'ব্যবহারকারীদের ডিপোজিট স্লিপ ও TrxID পর্যালোচনা করে ১-ক্লিকে ব্যালেন্স যুক্ত করুন।' : 'Verify deposit slips & TrxIDs to credit user balances.'}
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'bn' ? 'সকল' : 'All'} ({deposits.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {lang === 'bn' ? 'পেন্ডিং' : 'Pending'} ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'approved' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {lang === 'bn' ? 'অনুমোদিত' : 'Approved'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'bn' ? 'TrxID, রিকোয়েস্ট আইডি বা ফোন দিয়ে খুঁজুন...' : 'Search by TrxID, request ID, phone or user...'}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs font-medium"
        />
      </div>

      {/* List of Deposits */}
      <div className="space-y-3">
        {filteredDeposits.map((tx) => (
          <div 
            key={tx.id} 
            className={`p-4 bg-white border rounded-2xl shadow-2xs ${
              tx.status === 'pending' ? 'border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-200' : 'border-slate-200'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                    {tx.referenceId || tx.id}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                    {tx.method || 'BKASH'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                    tx.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : tx.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    ● {tx.status}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={11} /> {new Date(tx.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" />
                    <span>{lang === 'bn' ? 'ইউজার' : 'User'}: <b className="text-slate-900">{tx.userName || 'Member'}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Smartphone size={13} className="text-slate-400" />
                    <span>{lang === 'bn' ? 'সেন্ডার' : 'Sender'}: <b className="font-mono text-slate-900">{tx.senderNumber || tx.userPhone || 'N/A'}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard size={13} className="text-slate-400" />
                    <span>{lang === 'bn' ? 'পরিমাণ' : 'Amount'}: <b className="font-rajdhani font-black text-base text-emerald-600">{formatBDT(tx.amount)}</b></span>
                  </div>
                </div>

                {tx.transactionId && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1 rounded-xl w-fit border border-slate-200">
                    <Hash size={13} className="text-blue-600" />
                    <span>TrxID: <b className="font-mono font-bold text-blue-700">{tx.transactionId}</b></span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {tx.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <button
                    onClick={() => handleDepositAction(tx, 'approved')}
                    disabled={processingId === tx.id}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={14} />
                    <span>{lang === 'bn' ? 'অনুমোদন ও ক্রেডিট' : 'Approve & Credit'}</span>
                  </button>
                  <button
                    onClick={() => handleDepositAction(tx, 'rejected')}
                    disabled={processingId === tx.id}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <XCircle size={14} />
                    <span>{lang === 'bn' ? 'বাতিল' : 'Reject'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredDeposits.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
            <AlertCircle size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-bold">
              {lang === 'bn' ? 'কোনো ডিপোজিট রিকোয়েস্ট পাওয়া যায়নি।' : 'No deposit requests found.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
