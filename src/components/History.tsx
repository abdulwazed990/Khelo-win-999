import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserData, Transaction, Bet } from '../types';
import { toBengaliNumber, formatBengaliCurrency } from '../utils';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History as HistoryIcon, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Gamepad2,
  Wallet,
  Receipt,
  Copy,
  Check,
  ChevronLeft,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface HistoryProps {
  userData: UserData | null;
  onBack?: () => void;
  onNavigate?: (page: string) => void;
}

export default function HistoryPage({ userData, onBack, onNavigate }: HistoryProps) {
  const { lang } = useLanguage();
  const [mainTab, setMainTab] = useState<'transactions' | 'bets'>('transactions');
  const [txFilter, setTxFilter] = useState<'all' | 'deposit' | 'withdraw'>('all');
  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    haptics.success();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    const transQuery = query(
      collection(db, 'transactions'),
      where('uid', '==', userData.uid),
      orderBy('createdAt', 'desc')
    );

    const betsQuery = query(
      collection(db, 'bets'),
      where('uid', '==', userData.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubTrans = onSnapshot(transQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      setLoading(false);
    });

    const unsubBets = onSnapshot(betsQuery, (snapshot) => {
      setBets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bets');
    });

    return () => {
      unsubTrans();
      unsubBets();
    };
  }, [userData?.uid]);

  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'all') return true;
    return tx.type === txFilter;
  });

  const getStatusBadge = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'approved' || s === 'completed' || s === 'settled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={11} className="text-emerald-600" />
          <span>{lang === 'bn' ? 'অনুমোদিত' : 'Completed'}</span>
        </span>
      );
    }
    if (s === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
          <Clock size={11} className="text-blue-600 animate-spin" />
          <span>{lang === 'bn' ? 'প্রক্রিয়াধীন' : 'Processing'}</span>
        </span>
      );
    }
    if (s === 'rejected' || s === 'failed' || s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={11} className="text-rose-600" />
          <span>{lang === 'bn' ? 'বাতিল' : 'Rejected'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
        <Clock size={11} className="text-amber-600" />
        <span>{lang === 'bn' ? 'অপেক্ষারত' : 'Pending'}</span>
      </span>
    );
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return 'Recently';
    try {
      if (typeof dateVal === 'string') {
        return format(new Date(dateVal), 'dd MMM yyyy, hh:mm a');
      }
      if (dateVal.toDate && typeof dateVal.toDate === 'function') {
        return format(dateVal.toDate(), 'dd MMM yyyy, hh:mm a');
      }
      if (dateVal.seconds) {
        return format(new Date(dateVal.seconds * 1000), 'dd MMM yyyy, hh:mm a');
      }
      return 'Recently';
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-4 max-w-md sm:max-w-xl mx-auto pb-12">
      {/* Top Header with Back Button */}
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={() => {
              haptics.selection();
              onBack();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-chakra font-black shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <ChevronLeft size={15} />
            <span>{lang === 'bn' ? 'মেম্বার পেজে ফিরুন' : 'Back to Member'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Receipt className="text-blue-600" size={20} />
            <h2 className="font-chakra font-black text-slate-900 text-base">
              {lang === 'bn' ? 'লেনদেন ও বেটিং ইতিহাস' : 'Account & Transaction History'}
            </h2>
          </div>
        )}

        <div className="text-xs font-chakra font-bold text-slate-500">
          {userData?.name || 'VIP Member'}
        </div>
      </div>

      {/* Main Switcher: Transactions vs Bets */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300 shadow-inner">
        <button 
          onClick={() => {
            haptics.selection();
            setMainTab('transactions');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-chakra font-black text-xs transition-all ${
            mainTab === 'transactions' 
              ? 'bg-white text-blue-600 shadow-md' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt size={15} />
          <span>{lang === 'bn' ? 'পেমেন্ট ও লেনদেন' : 'TRANSACTIONS'}</span>
        </button>
        <button 
          onClick={() => {
            haptics.selection();
            setMainTab('bets');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-chakra font-black text-xs transition-all ${
            mainTab === 'bets' 
              ? 'bg-white text-blue-600 shadow-md' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Gamepad2 size={15} />
          <span>{lang === 'bn' ? 'বেটিং রেকর্ড' : 'BETTING HISTORY'}</span>
        </button>
      </div>

      {/* Transactions Tab View */}
      {mainTab === 'transactions' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-chakra font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Wallet size={17} className="text-blue-600" />
              <span>{lang === 'bn' ? 'জমা ও উত্তোলন বিস্তারিত' : 'Deposit & Withdrawal History'}</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredTransactions.length} {lang === 'bn' ? 'টি রেকর্ড' : 'Records'}
            </span>
          </div>

          {/* Sub Filters: All, Deposits, Withdrawals */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                haptics.selection();
                setTxFilter('all');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-chakra font-black transition-all ${
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
              className={`flex-1 py-1.5 rounded-lg text-xs font-chakra font-black transition-all ${
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
              className={`flex-1 py-1.5 rounded-lg text-xs font-chakra font-black transition-all ${
                txFilter === 'withdraw'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-blue-700'
              }`}
            >
              {lang === 'bn' ? 'উইথড্র' : 'Withdrawals'}
            </button>
          </div>

          {/* List of Transactions */}
          <div className="space-y-2.5">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold animate-pulse">
                {lang === 'bn' ? 'লেনদেন লোড হচ্ছে...' : 'Loading transaction records...'}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Receipt size={22} />
                </div>
                <p className="text-xs font-bold text-slate-500">
                  {txFilter === 'deposit'
                    ? (lang === 'bn' ? 'কোনো ডিপোজিট রেকর্ড পাওয়া যায়নি' : 'No deposit records found')
                    : txFilter === 'withdraw'
                    ? (lang === 'bn' ? 'কোনো উত্তোলন রেকর্ড পাওয়া যায়নি' : 'No withdrawal records found')
                    : (lang === 'bn' ? 'কোনো লেনদেনের রেকর্ড এখনও নেই' : 'No transaction records found')}
                </p>
                {onNavigate && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => onNavigate('deposit')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-chakra font-black hover:bg-emerald-700 transition-colors"
                    >
                      {lang === 'bn' ? 'ডিপোজিট করুন' : 'Make Deposit'}
                    </button>
                    <button
                      onClick={() => onNavigate('withdraw')}
                      className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-chakra font-bold hover:bg-slate-50 transition-colors"
                    >
                      {lang === 'bn' ? 'উইথড্র করুন' : 'Withdraw'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                const trxId = tx.transactionId || tx.referenceId || tx.id;

                return (
                  <div
                    key={tx.id}
                    className="bg-slate-50 hover:bg-slate-100/90 transition-all border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs"
                  >
                    {/* Header line: Type + Method + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isDeposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
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

                      <div>{getStatusBadge(tx.status)}</div>
                    </div>

                    {/* Amount & Time Row */}
                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/80">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {lang === 'bn' ? 'পরিমাণ' : 'Amount'}
                        </span>
                        <span
                          className={`font-rajdhani font-black text-lg ${
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
                          {formatDate(tx.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* TrxID / Reference Row */}
                    {trxId && (
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-[10px]">
                        <span className="text-slate-500 font-medium">
                          {lang === 'bn' ? 'ট্রানজেকশন আইডি:' : 'TrxID / Reference:'}
                        </span>
                        <button
                          onClick={() => copyToClipboard(trxId)}
                          className="flex items-center gap-1 font-mono font-bold text-blue-700 hover:text-blue-900"
                          title="Copy Transaction ID"
                        >
                          <span className="truncate max-w-[170px]">{trxId}</span>
                          {copiedId === trxId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}

                    {/* Phone / Account if available */}
                    {tx.senderNumber && (
                      <div className="text-[10px] text-slate-500 flex items-center justify-between px-1">
                        <span>{isDeposit ? (lang === 'bn' ? 'প্রেরক নম্বর:' : 'Sender No:') : (lang === 'bn' ? 'গ্রাহক নম্বর:' : 'Account No:')}</span>
                        <span className="font-mono font-bold text-slate-700">{tx.senderNumber}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Betting History View */}
      {mainTab === 'bets' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-chakra font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Gamepad2 size={17} className="text-blue-600" />
              <span>{lang === 'bn' ? 'গেম বেটিং রেকর্ড' : 'Game Betting Records'}</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {bets.length} {lang === 'bn' ? 'টি বাজি' : 'Bets'}
            </span>
          </div>

          <div className="space-y-2">
            {bets.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold">
                {lang === 'bn' ? 'কোনো বেটিং রেকর্ড পাওয়া যায়নি।' : 'No betting records recorded yet.'}
              </div>
            ) : (
              bets.map((bet) => (
                <div
                  key={bet.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-chakra font-black text-slate-900 block">{bet.gameName || 'Casino Game'}</span>
                    <span className="text-[10px] font-mono text-slate-400">{formatDate(bet.createdAt)}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-rajdhani font-black text-sm block ${bet.win ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {bet.win ? `+৳${bet.winAmount}` : `-৳${bet.betAmount}`}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">{bet.win ? 'WIN' : 'BET'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
