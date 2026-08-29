import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminAuditLog } from '../../types';
import { ShieldCheck, Search, Clock, User, FileText, AlertCircle } from 'lucide-react';

interface AuditLogsTabProps {
  lang: 'bn' | 'en';
}

export default function AuditLogsTab({ lang }: AuditLogsTabProps) {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'admin_audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: AdminAuditLog[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as AdminAuditLog);
      });
      setLogs(list);
      setLoading(false);
    }, (err) => {
      console.warn('Audit logs error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (log.action || '').toLowerCase().includes(q) ||
      (log.adminEmail || '').toLowerCase().includes(q) ||
      (log.targetId || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={20} />
            <span>{lang === 'bn' ? 'অ্যাডমিন অডিট ও অ্যাকশন লগ' : 'Admin Audit & Action Logs'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'bn' ? 'উইথড্রয়াল অনুমোদন, রিফান্ড ও সিস্টেম পরিবর্তনের অপরিবর্তনীয় রেকর্ড।' : 'Tamper-evident record of all administrative transactions, approvals, and refunds.'}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'bn' ? 'অ্যাকশন, অ্যাডমিন ইমেইল বা টার্গেট আইডি দিয়ে ফিল্টার করুন...' : 'Filter by action, admin email, target ID, or notes...'}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs font-medium"
        />
      </div>

      {/* Log Entries */}
      <div className="space-y-2">
        {filteredLogs.map((log) => {
          const isWithdrawal = log.action?.includes('WITHDRAWAL');
          const isDeposit = log.action?.includes('DEPOSIT');
          const isServerError = log.action?.includes('SERVER_ERROR') || log.details?.includes('SERVER_ERROR');
          const isMaintenance = log.action?.includes('MAINTENANCE') || log.details?.includes('MAINTENANCE');
          const isApproved = log.action?.includes('APPROV') || log.action?.includes('ACTIVE');
          const isRejected = log.action?.includes('REJECT') || log.action?.includes('CANCEL');

          return (
            <div key={log.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs text-xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    isServerError
                      ? 'bg-rose-100 text-rose-800'
                      : isMaintenance
                      ? 'bg-amber-100 text-amber-800'
                      : isApproved 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : isRejected 
                      ? 'bg-rose-100 text-rose-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {log.action}
                  </span>
                  {log.targetId && (
                    <span className="font-mono text-slate-500 font-bold text-[11px]">
                      #{log.targetId}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={11} />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="text-slate-800 font-medium leading-relaxed">
                {log.details}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                <User size={11} />
                <span>Admin: <b className="text-slate-600 font-mono">{log.adminEmail}</b></span>
              </div>
            </div>
          );
        })}

        {filteredLogs.length === 0 && !loading && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
            <AlertCircle size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-bold">
              {lang === 'bn' ? 'কোনো অডিট লগ পাওয়া যায়নি।' : 'No audit log entries recorded yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
