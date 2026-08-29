import React, { useState } from 'react';
import { Transaction, UserData } from '../../types';
import { formatBDT } from '../../config/currency';
import { maskAccountIdentifier, logAdminAudit } from '../../services/gameEngine';
import { haptics } from '../../utils/haptics';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { 
  CheckCircle2, 
  XCircle, 
  Ban, 
  Eye, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Smartphone, 
  CreditCard, 
  AlertCircle,
  FileText,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WithdrawalsTabProps {
  transactions: Transaction[];
  lang: 'bn' | 'en';
  adminEmail: string;
  showToast: (msg: string) => void;
}

export default function WithdrawalsTab({
  transactions,
  lang,
  adminEmail,
  showToast
}: WithdrawalsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{
    tx: Transaction;
    action: 'approved' | 'rejected' | 'cancelled';
    note?: string;
  } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // Filter only withdraw transactions
  const withdrawals = transactions.filter(t => t.type === 'withdraw' || t.type === 'DEMO_WITHDRAWAL');

  const filteredWithdrawals = withdrawals.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const queryLower = searchQuery.toLowerCase().trim();
    const matchesQuery = !queryLower || (
      (t.referenceId || t.id || '').toLowerCase().includes(queryLower) ||
      (t.userName || '').toLowerCase().includes(queryLower) ||
      (t.userPhone || '').toLowerCase().includes(queryLower) ||
      (t.senderNumber || '').toLowerCase().includes(queryLower) ||
      (t.method || '').toLowerCase().includes(queryLower)
    );
    return matchesStatus && matchesQuery;
  });

  const pendingCount = withdrawals.filter(t => t.status === 'pending').length;
  const approvedCount = withdrawals.filter(t => t.status === 'approved').length;
  const rejectedCount = withdrawals.filter(t => t.status === 'rejected' || t.status === 'cancelled').length;

  const handleExecuteAction = async () => {
    if (!actionConfirm || processing) return;
    const { tx, action } = actionConfirm;

    setProcessing(true);
    haptics.medium();

    try {
      const txRef = doc(db, 'transactions', tx.id);
      const updatePayload: Partial<Transaction> = {
        status: action,
        processedAt: new Date().toISOString(),
        processedBy: adminEmail,
        note: actionNote.trim() || undefined
      };

      await updateDoc(txRef, updatePayload);

      // If rejected or cancelled, refund the user demo balance
      if (action === 'rejected' || action === 'cancelled') {
        const userRef = doc(db, 'users', tx.uid);
        await updateDoc(userRef, {
          balance: increment(Number(tx.amount))
        });
      }

      // Record in Admin Audit Log
      await logAdminAudit(
        adminEmail,
        `WITHDRAWAL_${action.toUpperCase()}`,
        tx.referenceId || tx.id,
        'WITHDRAWAL',
        `Withdrawal ${action} by ${adminEmail} for user ${tx.userName || tx.uid} (Amount: ${formatBDT(tx.amount)}). ${actionNote ? `Note: ${actionNote}` : ''}`,
        {
          txId: tx.id,
          referenceId: tx.referenceId || tx.id,
          uid: tx.uid,
          amount: tx.amount,
          action,
          method: tx.method,
          note: actionNote
        }
      );

      showToast(
        lang === 'bn' 
          ? `উইথড্র রিকোয়েস্ট সফলভাবে ${action === 'approved' ? 'অনুমোদিত' : action === 'rejected' ? 'প্রত্যাখ্যাত' : 'বাতিল'} হয়েছে!` 
          : `Withdrawal request successfully ${action}!`
      );

      setActionConfirm(null);
      setActionNote('');
      if (selectedTx?.id === tx.id) {
        setSelectedTx(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${tx.id}`);
      showToast(lang === 'bn' ? 'অ্যাকশন প্রক্রিয়া করতে ত্রুটি হয়েছে!' : 'Error processing withdrawal action!');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Sub-Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900 flex items-center gap-2">
            <span>{lang === 'bn' ? 'ডেমো উইথড্রয়াল ম্যানেজমেন্ট' : 'Demo Withdrawal Management'}</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-mono font-bold animate-pulse">
                {pendingCount} {lang === 'bn' ? 'অপেক্ষারত' : 'Pending'}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'bn' 
              ? 'ব্যবহারকারীদের ডেমো উইথড্র রিকোয়েস্ট পর্যালোচনা ও নিরাপদ অনুমোদন বা রিফান্ড সহ বাতিল করুন।' 
              : 'Review and safely approve, reject (with automatic refund), or cancel demo withdrawal requests.'}
          </p>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'bn' ? 'সকল' : 'All'} ({withdrawals.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'pending' 
                ? 'bg-amber-500 text-white shadow-xs' 
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            {lang === 'bn' ? 'পেন্ডিং' : 'Pending'} ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'approved' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {lang === 'bn' ? 'অনুমোদিত' : 'Approved'} ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'rejected' 
                ? 'bg-rose-600 text-white shadow-xs' 
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            {lang === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected'} ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'bn' ? 'রিকোয়েস্ট আইডি, ইউজারনেম, ফোন নম্বর বা মেথড দিয়ে খুঁজুন...' : 'Search by Request ID, user, phone number, or method...'}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs font-medium"
        />
      </div>

      {/* Withdrawals List Table / Cards */}
      <div className="space-y-3">
        {filteredWithdrawals.map((tx) => {
          const reqId = tx.referenceId || tx.id;
          const maskedPhone = maskAccountIdentifier(tx.accountIdentifier || tx.senderNumber || tx.userPhone || '');

          return (
            <div 
              key={tx.id} 
              className={`p-4 bg-white border rounded-2xl shadow-2xs transition-all ${
                tx.status === 'pending' 
                  ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200' 
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                      ID: {reqId}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                      {tx.method || 'DEMO WALLET'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${
                      tx.status === 'approved' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : tx.status === 'rejected' 
                        ? 'bg-rose-100 text-rose-800' 
                        : tx.status === 'cancelled'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {tx.status}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(tx.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      <span>{lang === 'bn' ? 'ইউজার' : 'User'}: <b className="text-slate-900">{tx.userName || 'Member'}</b></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Smartphone size={13} className="text-slate-400" />
                      <span>{lang === 'bn' ? 'অ্যাকাউন্ট' : 'Account'}: <b className="font-mono text-slate-900">{maskedPhone}</b></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={13} className="text-slate-400" />
                      <span>{lang === 'bn' ? 'পরিমাণ' : 'Amount'}: <b className="font-rajdhani font-black text-base text-amber-700">{formatBDT(tx.amount)}</b></span>
                    </div>
                  </div>

                  {tx.note && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                      Note: {tx.note}
                    </div>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {/* View Details */}
                  <button
                    onClick={() => setSelectedTx(tx)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    title={lang === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}
                  >
                    <Eye size={15} />
                  </button>

                  {tx.status === 'pending' && (
                    <>
                      {/* Approve Button */}
                      <button
                        onClick={() => setActionConfirm({ tx, action: 'approved' })}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 size={14} />
                        <span>{lang === 'bn' ? 'অনুমোদন' : 'Approve'}</span>
                      </button>

                      {/* Reject Button */}
                      <button
                        onClick={() => setActionConfirm({ tx, action: 'rejected' })}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <XCircle size={14} />
                        <span>{lang === 'bn' ? 'বাতিল ও রিফান্ড' : 'Reject & Refund'}</span>
                      </button>

                      {/* Cancel Button */}
                      <button
                        onClick={() => setActionConfirm({ tx, action: 'cancelled' })}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all"
                        title={lang === 'bn' ? 'সরাসরি বাতিল' : 'Cancel'}
                      >
                        <Ban size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredWithdrawals.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
            <AlertCircle size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-bold">
              {lang === 'bn' ? 'কোনো উইথড্রয়াল রিকোয়েস্ট পাওয়া যায়নি।' : 'No withdrawal requests found.'}
            </p>
          </div>
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="text-blue-600" size={20} />
                  <h3 className="font-chakra font-black text-base text-slate-900">
                    {lang === 'bn' ? 'উইথড্রয়াল বিস্তারিত' : 'Withdrawal Request Details'}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedTx(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Request ID:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTx.referenceId || selectedTx.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">User UID:</span>
                  <span className="font-mono text-slate-900">{selectedTx.uid}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">User Name:</span>
                  <span className="font-bold text-slate-900">{selectedTx.userName || 'Member'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold uppercase text-blue-600">{selectedTx.method}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Masked Account:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {maskAccountIdentifier(selectedTx.accountIdentifier || selectedTx.senderNumber || selectedTx.userPhone || '')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Full Account (Admin View):</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTx.senderNumber || selectedTx.userPhone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Requested Amount:</span>
                  <span className="font-rajdhani font-black text-base text-amber-700">{formatBDT(selectedTx.amount)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold uppercase text-slate-900">{selectedTx.status}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Requested At:</span>
                  <span className="text-slate-900">{new Date(selectedTx.createdAt).toLocaleString()}</span>
                </div>
                {selectedTx.processedAt && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Processed At:</span>
                    <span className="text-slate-900">{new Date(selectedTx.processedAt).toLocaleString()} ({selectedTx.processedBy || 'Admin'})</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedTx(null)}
                  className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACTION CONFIRMATION MODAL */}
      <AnimatePresence>
        {actionConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  actionConfirm.action === 'approved' 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-rose-100 text-rose-600'
                }`}>
                  {actionConfirm.action === 'approved' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                  <h3 className="font-chakra font-black text-base text-slate-900">
                    {actionConfirm.action === 'approved'
                      ? (lang === 'bn' ? 'উইথড্রয়াল অনুমোদন নিশ্চিত করুন' : 'Confirm Withdrawal Approval')
                      : (lang === 'bn' ? 'উইথড্রয়াল বাতিল ও রিফান্ড নিশ্চিত করুন' : 'Confirm Withdrawal Rejection & Refund')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn' 
                      ? 'এই কাজটি সম্পূর্ণ করার পূর্বে তথ্য নিশ্চিত করুন।' 
                      : 'Please verify the action before proceeding.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">User:</span>
                  <b className="text-slate-900">{actionConfirm.tx.userName || 'Member'}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <b className="text-amber-700 font-rajdhani font-black text-sm">{formatBDT(actionConfirm.tx.amount)}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <b className="uppercase text-slate-900">{actionConfirm.tx.method}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Impact:</span>
                  <b className={actionConfirm.action === 'approved' ? 'text-emerald-700' : 'text-rose-700'}>
                    {actionConfirm.action === 'approved' 
                      ? (lang === 'bn' ? 'ব্যালেন্স স্থায়ীভাবে ছাড় দেয়া হবে' : 'Demo payout settled')
                      : (lang === 'bn' ? '৳' + actionConfirm.tx.amount + ' ব্যালেন্স ব্যবহারকারীর ওয়ালেটে ফেরত যাবে' : 'Demo amount refunded back to user wallet')}
                  </b>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  {lang === 'bn' ? 'অ্যাডমিন মন্তব্য / নোট (ঐচ্ছিক):' : 'Admin Note (Optional):'}
                </label>
                <input
                  type="text"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: সফলভাবে প্রক্রিয়া করা হয়েছে...' : 'e.g., Processed via demo simulator...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setActionConfirm(null); setActionNote(''); }}
                  disabled={processing}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  disabled={processing}
                  className={`flex-1 py-2.5 font-bold text-xs rounded-xl text-white shadow-xs ${
                    actionConfirm.action === 'approved' 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {processing ? (lang === 'bn' ? 'প্রক্রিয়াকরণ...' : 'Processing...') : (lang === 'bn' ? 'নিশ্চিত করুন' : 'Confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
