import React, { useState } from 'react';
import { Transaction } from '../../types';
import { formatBDT } from '../../config/currency';
import { Search, Clock, ArrowDownRight, ArrowUpRight, Gamepad2, Coins, Wallet } from 'lucide-react';

interface TransactionsLedgerTabProps {
  transactions: Transaction[];
  lang: 'bn' | 'en';
}

export default function TransactionsLedgerTab({ transactions, lang }: TransactionsLedgerTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredTransactions = transactions.filter(t => {
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      (t.referenceId || t.id || '').toLowerCase().includes(q) ||
      (t.userName || '').toLowerCase().includes(q) ||
      (t.userPhone || '').toLowerCase().includes(q) ||
      (t.gameName || '').toLowerCase().includes(q) ||
      (t.type || '').toLowerCase().includes(q)
    );
    return matchesType && matchesQuery;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900 flex items-center gap-2">
            <Wallet className="text-blue-600" size={20} />
            <span>{lang === 'bn' ? 'সেন্ট্রাল ট্রানজেকশন লেজার' : 'Centralized Transaction Ledger'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'bn' ? 'সকল ডিপোজিট, উইথড্র, গেম স্টেক ও উইনের সম্পূর্ণ হিসাব ও ব্যালেন্স হিস্ট্রি।' : 'Comprehensive ledger of all demo deposits, withdrawals, game stakes, and winnings.'}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              typeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'bn' ? 'সকল' : 'All'}
          </button>
          <button
            onClick={() => setTypeFilter('deposit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              typeFilter === 'deposit' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {lang === 'bn' ? 'ডিপোজিট' : 'Deposit'}
          </button>
          <button
            onClick={() => setTypeFilter('withdraw')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              typeFilter === 'withdraw' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {lang === 'bn' ? 'উইথড্র' : 'Withdraw'}
          </button>
          <button
            onClick={() => setTypeFilter('GAME_STAKE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              typeFilter === 'GAME_STAKE' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            {lang === 'bn' ? 'গেম স্টেক' : 'Stakes'}
          </button>
          <button
            onClick={() => setTypeFilter('GAME_WIN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              typeFilter === 'GAME_WIN' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
            }`}
          >
            {lang === 'bn' ? 'গেম উইন' : 'Wins'}
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
          placeholder={lang === 'bn' ? 'আইডি, গেমের নাম বা ইউজার দিয়ে খুঁজুন...' : 'Search ledger by reference ID, game name, or user...'}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs font-medium"
        />
      </div>

      {/* Ledger Records */}
      <div className="space-y-2">
        {filteredTransactions.map((tx) => {
          const isCredit = tx.type === 'deposit' || tx.type === 'GAME_WIN' || tx.type === 'DEMO_TOPUP' || tx.type === 'DEMO_BONUS';

          return (
            <div key={tx.id} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {isCredit ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{tx.userName || 'Member'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      tx.type === 'deposit' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : tx.type === 'withdraw' 
                        ? 'bg-amber-100 text-amber-800'
                        : tx.type === 'GAME_WIN'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {tx.type}
                    </span>
                    {tx.gameName && (
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                        {tx.gameName}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ref: {tx.referenceId || tx.id} • {new Date(tx.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className={`font-rajdhani font-black text-sm ${
                  isCredit ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {isCredit ? '+' : '-'}{formatBDT(tx.amount)}
                </span>
                {tx.previousBalance !== undefined && tx.newBalance !== undefined && (
                  <span className="text-[9px] text-slate-400 block font-mono">
                    Bal: {formatBDT(tx.previousBalance)} → {formatBDT(tx.newBalance)}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs font-bold">
            {lang === 'bn' ? 'কোনো ট্রানজেকশন রেকর্ড পাওয়া যায়নি।' : 'No transactions recorded.'}
          </div>
        )}
      </div>
    </div>
  );
}
