import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserData, Transaction, Bet } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
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
  Wallet
} from 'lucide-react';
import { format } from 'date-fns';

interface HistoryProps {
  userData: UserData | null;
}

export default function HistoryPage({ userData }: HistoryProps) {
  const [tab, setTab] = useState<'bets' | 'transactions'>('bets');
  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;

    const betsQuery = query(
      collection(db, 'bets'),
      where('uid', '==', userData.uid),
      orderBy('createdAt', 'desc')
    );

    const transQuery = query(
      collection(db, 'transactions'),
      where('uid', '==', userData.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubBets = onSnapshot(betsQuery, (snapshot) => {
      setBets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bets');
      setLoading(false);
    });

    const unsubTrans = onSnapshot(transQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubBets();
      unsubTrans();
    };
  }, [userData]);

  if (!userData) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex bg-gray-100 p-1.5 rounded-3xl mb-10">
        <button 
          onClick={() => setTab('bets')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all ${
            tab === 'bets' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Gamepad2 size={18} />
          BETTING HISTORY
        </button>
        <button 
          onClick={() => setTab('transactions')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all ${
            tab === 'transactions' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Wallet size={18} />
          TRANSACTIONS
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-2xl font-black text-blue-900 flex items-center gap-3">
            {tab === 'bets' ? <Gamepad2 className="text-blue-600" /> : <Wallet className="text-blue-600" />}
            {tab === 'bets' ? 'Game Betting History' : 'Transaction History'}
          </h3>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {tab === 'bets' ? `${bets.length} Records` : `${transactions.length} Records`}
          </span>
        </div>

        <div className="overflow-x-auto">
          {tab === 'bets' ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4">Game</th>
                  <th className="px-8 py-4">Amount</th>
                  <th className="px-8 py-4">Profit/Loss</th>
                  <th className="px-8 py-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold">No betting records found.</td>
                  </tr>
                ) : (
                  bets.map((bet) => (
                    <tr key={bet.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                            <Gamepad2 size={16} />
                          </div>
                          <span className="font-bold text-gray-900">{bet.gameName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-bold text-gray-600">৳{bet.amount.toLocaleString()}</td>
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-1 font-black ${bet.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {bet.profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          ৳{Math.abs(bet.profit).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-xs text-gray-400 font-medium">
                        {bet.createdAt ? (
                          typeof bet.createdAt === 'string' ? 
                          format(new Date(bet.createdAt), 'PPpp') : 
                          format((bet.createdAt as any).toDate(), 'PPpp')
                        ) : 'Processing...'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4">Type</th>
                  <th className="px-8 py-4">Method</th>
                  <th className="px-8 py-4">Amount</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-bold">No transaction records found.</td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          {tx.type === 'deposit' ? (
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                              <ArrowDownLeft size={16} />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
                              <ArrowUpRight size={16} />
                            </div>
                          )}
                          <span className="font-bold text-gray-900 capitalize">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-bold text-gray-600 capitalize">{tx.method}</span>
                      </td>
                      <td className="px-8 py-6 font-black text-gray-900">৳{tx.amount.toLocaleString()}</td>
                      <td className="px-8 py-6">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          tx.status === 'approved' ? 'bg-green-50 text-green-600 border border-green-100' :
                          tx.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                          'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {tx.status === 'approved' ? <CheckCircle2 size={12} /> :
                           tx.status === 'pending' ? <Clock size={12} /> :
                           <XCircle size={12} />}
                          {tx.status}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-xs text-gray-400 font-medium">
                        {tx.createdAt ? (
                          typeof tx.createdAt === 'string' ? 
                          format(new Date(tx.createdAt), 'PPpp') : 
                          format((tx.createdAt as any).toDate(), 'PPpp')
                        ) : 'Processing...'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
