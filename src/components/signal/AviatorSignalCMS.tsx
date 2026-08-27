import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Users, 
  KeyRound, 
  Activity, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Zap, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  Filter, 
  Calendar, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Settings2, 
  Send,
  Eye,
  LogOut,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SignalToken, 
  SignalGameConnection, 
  SignalRound, 
  SignalLog, 
  SubscriptionType, 
  SignalConnectionStatus 
} from '../../types';
import { 
  createSignalAccess, 
  updateTokenStatus, 
  extendTokenSubscription, 
  deleteSignalToken, 
  updateGameConnectionSettings, 
  testGameConnection, 
  broadcastLiveGameRound, 
  subscribeToSignalTokens, 
  subscribeToGameConnection, 
  subscribeToRoundsHistory, 
  subscribeToLogs,
  DEFAULT_GAME_ID,
  generateRoundId
} from '../../services/aviatorSignalService';
import { haptics } from '../../utils/haptics';

interface AviatorSignalCMSProps {
  onBackToGame?: () => void;
  onOpenSignalApp?: (token?: string) => void;
}

type CMSTab = 'dashboard' | 'links' | 'integration' | 'history' | 'logs';

export default function AviatorSignalCMS({ onBackToGame, onOpenSignalApp }: AviatorSignalCMSProps) {
  const [activeTab, setActiveTab] = useState<CMSTab>('dashboard');
  
  // Realtime Data
  const [tokens, setTokens] = useState<SignalToken[]>([]);
  const [connection, setConnection] = useState<SignalGameConnection | null>(null);
  const [historyRounds, setHistoryRounds] = useState<SignalRound[]>([]);
  const [logs, setLogs] = useState<SignalLog[]>([]);

  // Modals & Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);
  const [latestGeneratedLink, setLatestGeneratedLink] = useState<{ token: SignalToken; link: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSub, setFilterSub] = useState<'all' | 'free' | 'premium'>('all');

  // Form State
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newSubscriptionType, setNewSubscriptionType] = useState<SubscriptionType>('premium');
  const [newDurationDays, setNewDurationDays] = useState(30);
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Integration test state
  const [testResult, setTestResult] = useState<{ success: boolean; pingMs: number; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [editApiUrl, setEditApiUrl] = useState('');
  const [editWsUrl, setEditWsUrl] = useState('');
  const [editAuthHeader, setEditAuthHeader] = useState('');
  const [serverVerifiedMode, setServerVerifiedMode] = useState(true);

  // Manual Dispatch Round state (for testing / manual game link)
  const [manualRoundMultiplier, setManualRoundMultiplier] = useState('2.50');
  const [manualVerifiedStatus, setManualVerifiedStatus] = useState<'SERVER_VERIFIED' | 'SIGNAL_UNAVAILABLE'>('SERVER_VERIFIED');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Subscriptions
  useEffect(() => {
    const unsubTokens = subscribeToSignalTokens((toks) => setTokens(toks));
    const unsubConn = subscribeToGameConnection((conn) => {
      setConnection(conn);
      if (conn) {
        setEditApiUrl(conn.apiUrl || '');
        setEditWsUrl(conn.wsUrl || '');
        setEditAuthHeader(conn.authHeader || '');
        setServerVerifiedMode(conn.serverVerifiedMode ?? true);
      }
    });
    const unsubHistory = subscribeToRoundsHistory((rnds) => setHistoryRounds(rnds));
    const unsubLogs = subscribeToLogs((lgs) => setLogs(lgs));

    return () => {
      unsubTokens();
      unsubConn();
      unsubHistory();
      unsubLogs();
    };
  }, []);

  // Stats calculation
  const totalUsers = tokens.length;
  const activeTokens = tokens.filter(t => t.status === 'active' && new Date(t.expiresAt).getTime() > Date.now());
  const premiumUsers = tokens.filter(t => t.subscriptionType === 'premium' && t.status === 'active');
  const totalLogs = logs.length;

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/#signal/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    haptics.success();
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleCreateSignalLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await createSignalAccess({
        userName: newCustomerName,
        phone: newCustomerPhone,
        subscriptionType: newSubscriptionType,
        durationDays: Number(newDurationDays),
        notes: newNotes
      });

      setLatestGeneratedLink(res);
      setShowCreateModal(false);
      setShowGeneratedModal(true);

      // Reset form
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewNotes('');
      haptics.success();
    } catch (err: any) {
      alert('Error creating link: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (token: SignalToken) => {
    const nextStatus = token.status === 'active' ? 'revoked' : 'active';
    await updateTokenStatus(token.token, nextStatus);
    haptics.medium();
  };

  const handleExtendDays = async (tokenString: string, days: number) => {
    await extendTokenSubscription(tokenString, days);
    haptics.success();
  };

  const handleDeleteToken = async (tokenString: string) => {
    if (confirm('Are you sure you want to permanently delete this access token?')) {
      await deleteSignalToken(tokenString);
      haptics.warning();
    }
  };

  const handleRunConnectionTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testGameConnection();
    setTestResult(res);
    setIsTesting(false);
    haptics.medium();
  };

  const handleSaveConnectionSettings = async () => {
    await updateGameConnectionSettings({
      apiUrl: editApiUrl,
      wsUrl: editWsUrl,
      authHeader: editAuthHeader,
      serverVerifiedMode: serverVerifiedMode
    });
    alert('Game integration settings saved successfully.');
    haptics.success();
  };

  const handleManualBroadcast = async () => {
    setIsBroadcasting(true);
    const rId = generateRoundId();
    const mult = parseFloat(manualRoundMultiplier) || 2.0;

    await broadcastLiveGameRound({
      roundId: rId,
      status: 'WAITING_FOR_ROUND',
      currentMultiplier: 1.0,
      serverSignalStatus: manualVerifiedStatus,
      predictedMultiplier: manualVerifiedStatus === 'SERVER_VERIFIED' ? mult : null,
      serverSignature: manualVerifiedStatus === 'SERVER_VERIFIED' ? `sig_${Date.now()}` : undefined
    });

    haptics.success();
    setTimeout(() => {
      setIsBroadcasting(false);
      alert(`Signal broadcast dispatched for ${rId}`);
    }, 500);
  };

  const filteredTokens = tokens.filter(t => {
    const matchQuery = t.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       t.token.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSub = filterSub === 'all' || t.subscriptionType === filterSub;
    return matchQuery && matchSub;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans select-none pb-20">
      {/* CMS HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-xl px-4 py-3 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white uppercase tracking-wider">
                  Aviator Signal CMS
                </h1>
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  ADMIN CORE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Authorized Signal Network Controller</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-mono text-[11px]">
                {connection?.connectionStatus || 'CONNECTED'} ({connection?.pingMs || 18}ms)
              </span>
            </div>

            {onBackToGame && (
              <button
                onClick={onBackToGame}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Aviator Game</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="max-w-6xl mx-auto mt-3 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-800/60 pt-2 text-xs">
          {[
            { id: 'dashboard' as const, label: 'Dashboard', icon: Activity },
            { id: 'links' as const, label: 'Signal Links & Customers', icon: KeyRound, count: tokens.length },
            { id: 'integration' as const, label: 'Game Integration', icon: Server },
            { id: 'history' as const, label: 'Signal Audit History', icon: Clock, count: historyRounds.length },
            { id: 'logs' as const, label: 'Activity Logs', icon: FileText, count: logs.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  haptics.light();
                }}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* MAIN BODY CONTENT */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                  <span>Total Signal Users</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white font-mono">{totalUsers}</div>
                <p className="text-[10px] text-slate-500">Registered access credentials</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                  <span>Active Subscribers</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-400 font-mono">{activeTokens.length}</div>
                <p className="text-[10px] text-slate-500">Unexpired active customer tokens</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                  <span>VIP Premium Users</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-amber-400 font-mono">{premiumUsers.length}</div>
                <p className="text-[10px] text-slate-500">High-tier telemetry subscribers</p>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                  <span>Game Connection</span>
                  <Server className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-xl font-black text-white font-mono flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  CONNECTED
                </div>
                <p className="text-[10px] text-slate-500">Latency: {connection?.pingMs || 18}ms</p>
              </div>
            </div>

            {/* Quick Action & Live Connection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Generate Access Link */}
              <div className="p-5 bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 border border-red-900/40 rounded-3xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase">Issue Signal Access</h3>
                  <p className="text-xs text-slate-400">Generate secure 256-bit customer link with custom expiry duration.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-md shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  Create Customer Link
                </button>
              </div>

              {/* Card 2: Open Signal App Live Client */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase">Launch Signal App</h3>
                  <p className="text-xs text-slate-400">Open mobile-first customer interface for testing live signal sync.</p>
                </div>
                <button
                  onClick={() => onOpenSignalApp?.('av_demo_vip_2026')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Live Customer UI
                </button>
              </div>

              {/* Card 3: Test Engine Connection */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase">Engine Synchronization</h3>
                  <p className="text-xs text-slate-400">Verify backend WebSocket stream and telemetry latency.</p>
                </div>
                <button
                  onClick={handleRunConnectionTest}
                  disabled={isTesting}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Test Connection
                </button>
              </div>
            </div>

            {/* Recent Customers Overview Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-red-400" />
                  Recent Issued Tokens
                </h3>
                <button
                  onClick={() => setActiveTab('links')}
                  className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  View All ({tokens.length}) <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Token</th>
                      <th className="py-3 px-3">Plan</th>
                      <th className="py-3 px-3">Expires</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {tokens.slice(0, 5).map((tok) => {
                      const isExpired = new Date(tok.expiresAt).getTime() < Date.now();
                      return (
                        <tr key={tok.token} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-bold text-white">{tok.userName}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{tok.token}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tok.subscriptionType === 'premium'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {tok.subscriptionType}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                            {new Date(tok.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tok.status === 'active' && !isExpired
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {isExpired ? 'EXPIRED' : tok.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleCopyLink(tok.token)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all cursor-pointer"
                              title="Copy Customer Link"
                            >
                              {copiedToken === tok.token ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SIGNAL LINKS & CUSTOMER MANAGEMENT */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or token..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <select
                  value={filterSub}
                  onChange={(e: any) => setFilterSub(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer"
                >
                  <option value="all">All Plans</option>
                  <option value="premium">Premium Only</option>
                  <option value="free">Free Only</option>
                </select>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-md shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Create Signal Access</span>
              </button>
            </div>

            {/* Tokens Cards List */}
            <div className="space-y-3">
              {filteredTokens.length === 0 ? (
                <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No signal access tokens match your filter. Click "Create Signal Access" to generate one.
                </div>
              ) : (
                filteredTokens.map((tok) => {
                  const isExpired = new Date(tok.expiresAt).getTime() < Date.now();
                  const remainingDays = Math.max(0, Math.ceil((new Date(tok.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                  return (
                    <div
                      key={tok.token}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-all shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{tok.userName}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                            tok.subscriptionType === 'premium'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {tok.subscriptionType}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            tok.status === 'active' && !isExpired
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {isExpired ? 'EXPIRED' : tok.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                          <span className="text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/40">
                            {tok.token}
                          </span>
                          <span>•</span>
                          <span>{remainingDays} days remaining</span>
                          <span>•</span>
                          <span>Expires: {new Date(tok.expiresAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Control Actions */}
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                        <button
                          onClick={() => handleCopyLink(tok.token)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {copiedToken === tok.token ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => onOpenSignalApp?.(tok.token)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </button>

                        <button
                          onClick={() => handleExtendDays(tok.token, 30)}
                          className="px-2.5 py-1.5 bg-blue-950/50 hover:bg-blue-900/50 text-blue-300 border border-blue-800/60 rounded-xl text-xs font-bold cursor-pointer"
                          title="Extend 30 Days"
                        >
                          +30d
                        </button>

                        <button
                          onClick={() => handleToggleStatus(tok)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                            tok.status === 'active'
                              ? 'bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-800/60'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/60'
                          }`}
                        >
                          {tok.status === 'active' ? 'Revoke' : 'Activate'}
                        </button>

                        <button
                          onClick={() => handleDeleteToken(tok.token)}
                          className="p-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl cursor-pointer"
                          title="Delete Access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: GAME INTEGRATION & SERVER TELEMETRY */}
        {activeTab === 'integration' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-base font-black text-white uppercase flex items-center gap-2">
                  <Server className="w-5 h-5 text-red-500" />
                  Aviator Game Integration Layer
                </h3>
                <p className="text-xs text-slate-400">
                  Connect the Signal App with the server-authorized Aviator engine backend.
                </p>
              </div>

              {testResult && (
                <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                  testResult.success 
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/50 border-rose-800 text-rose-200'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
                  <div>
                    <p className="font-bold">{testResult.message}</p>
                    <p className="text-[11px] opacity-80 font-mono">Last probe timestamp: {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase">Game Name</label>
                  <input
                    type="text"
                    value={connection?.gameName || 'Aviator Jet Flight Engine'}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase">Game ID</label>
                  <input
                    type="text"
                    value={connection?.gameId || DEFAULT_GAME_ID}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase">Game API / Base URL</label>
                  <input
                    type="text"
                    value={editApiUrl}
                    onChange={(e) => setEditApiUrl(e.target.value)}
                    placeholder="https://api.aviator-game.internal/v1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase">WebSocket Stream URL</label>
                  <input
                    type="text"
                    value={editWsUrl}
                    onChange={(e) => setEditWsUrl(e.target.value)}
                    placeholder="wss://stream.aviator-game.internal/live"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 uppercase">Authorization Header (Secret Key)</label>
                  <input
                    type="password"
                    value={editAuthHeader}
                    onChange={(e) => setEditAuthHeader(e.target.value)}
                    placeholder="Bearer av_sec_live_..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white">Server-Verified Mode</p>
                  <p className="text-[11px] text-slate-400">
                    Only broadcast pre-round multipliers if authoritative cryptographic signature is verified.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={serverVerifiedMode}
                  onChange={(e) => setServerVerifiedMode(e.target.checked)}
                  className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveConnectionSettings}
                  className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-md shadow-red-600/30 cursor-pointer transition-all"
                >
                  Save Integration Settings
                </button>
                <button
                  onClick={handleRunConnectionTest}
                  disabled={isTesting}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  Test Connection Benchmark
                </button>
              </div>
            </div>

            {/* MANUAL ROUND SIGNAL DISPATCH TOOL (For Admin Simulation / Game Hook) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Live Round Signal Telemetry Dispatcher
                </h3>
                <p className="text-xs text-slate-400">
                  Broadcast server-authorized round information directly to all active Signal App clients.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Signal Multiplier (e.g. 2.45x)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualRoundMultiplier}
                    onChange={(e) => setManualRoundMultiplier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Authorization Mode</label>
                  <select
                    value={manualVerifiedStatus}
                    onChange={(e: any) => setManualVerifiedStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="SERVER_VERIFIED">SERVER VERIFIED (Verified Multiplier)</option>
                    <option value="SIGNAL_UNAVAILABLE">SIGNAL DATA NOT AVAILABLE</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleManualBroadcast}
                    disabled={isBroadcasting}
                    className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black shadow-md shadow-red-600/30 cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Broadcast Signal</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SIGNAL HISTORY AUDIT */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-500" />
                  Real-time Synchronized Round History
                </h3>
                <span className="text-xs font-mono text-slate-400">{historyRounds.length} Recorded</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Round ID</th>
                      <th className="py-3 px-3">Multiplier</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Signal Verification</th>
                      <th className="py-3 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {historyRounds.map((r, i) => {
                      const mult = r.finalMultiplier || r.currentMultiplier || 1.0;
                      return (
                        <tr key={r.id || i} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-bold text-white">{r.roundId}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded font-black text-xs ${
                              mult < 2.0 
                                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                                : mult < 10.0
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                            }`}>
                              {mult.toFixed(2)}x
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">{r.status}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.serverSignalStatus === 'SERVER_VERIFIED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {r.serverSignalStatus || 'SERVER_VERIFIED'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(r.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT ACTIVITY LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Security & Activity Audit Logs
              </h3>

              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <span className="text-red-400 font-bold">{log.action}</span>
                      {log.userName && <span className="text-slate-300 ml-2">({log.userName})</span>}
                      {log.token && <span className="text-slate-500 ml-2">token: {log.token}</span>}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE SIGNAL ACCESS MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-black uppercase text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-red-500" />
                  Create Signal Access
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSignalLink} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 uppercase">Customer Name / Label *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="e.g. VIP Trader Robin"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 uppercase">Subscription Type</label>
                    <select
                      value={newSubscriptionType}
                      onChange={(e: any) => setNewSubscriptionType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none cursor-pointer"
                    >
                      <option value="premium">PREMIUM (Full Telemetry)</option>
                      <option value="free">FREE (Basic)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 uppercase">Duration (Days)</label>
                    <select
                      value={newDurationDays}
                      onChange={(e) => setNewDurationDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none cursor-pointer font-mono"
                    >
                      <option value={7}>7 Days</option>
                      <option value={15}>15 Days</option>
                      <option value={30}>30 Days (1 Month)</option>
                      <option value={90}>90 Days (3 Months)</option>
                      <option value={365}>365 Days (1 Year)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 uppercase">Customer Phone / Contact (Optional)</label>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="e.g. +8801700000000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 uppercase">Internal Notes</label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Special Telegram VIP Member"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating Link...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        CREATE SIGNAL LINK
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GENERATED LINK SUCCESS MODAL */}
      <AnimatePresence>
        {showGeneratedModal && latestGeneratedLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-emerald-800/80 rounded-3xl p-6 shadow-2xl text-slate-200 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase">Signal Link Created!</h3>
                  <p className="text-xs text-slate-400">Provide this private link to {latestGeneratedLink.token.userName}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Private Customer Signal URL:
                </label>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 break-all select-all">
                  {latestGeneratedLink.link}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyLink(latestGeneratedLink.token.token)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {copiedToken === latestGeneratedLink.token.token ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>COPY LINK</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowGeneratedModal(false);
                    onOpenSignalApp?.(latestGeneratedLink.token.token);
                  }}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Open App
                </button>
              </div>

              <button
                onClick={() => setShowGeneratedModal(false)}
                className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Close Window
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
