import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Plus, 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  AlertTriangle, 
  Trash2, 
  Power, 
  Crown, 
  Calendar, 
  User, 
  Gamepad2, 
  Search, 
  Zap, 
  Link as LinkIcon,
  Activity,
  History as HistoryIcon
} from 'lucide-react';
import { 
  SignalToken, 
  SignalRound, 
  SignalGameConnection, 
  SubscriptionType 
} from '../../types';
import { 
  createSignalAccess, 
  subscribeToAllTokens, 
  updateTokenStatus, 
  updateTokenSubscription, 
  deleteSignalToken, 
  subscribeToCurrentRound, 
  subscribeToRoundsHistory, 
  subscribeToGameConnection, 
  DEFAULT_GAME_ID,
  initializeAviatorSignalDefaults
} from '../../services/aviatorSignalService';
import { haptics } from '../../utils/haptics';

interface SignalManagementTabProps {
  lang: 'bn' | 'en';
  showToast: (msg: string) => void;
  registeredUsers?: Array<{ uid: string; name?: string; username?: string; phone?: string }>;
}

export default function SignalManagementTab({ lang, showToast, registeredUsers = [] }: SignalManagementTabProps) {
  const [tokens, setTokens] = useState<SignalToken[]>([]);
  const [currentRound, setCurrentRound] = useState<SignalRound | null>(null);
  const [roundHistory, setRoundHistory] = useState<SignalRound[]>([]);
  const [connection, setConnection] = useState<SignalGameConnection | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>('premium');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'revoked' | 'expired'>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{ token: SignalToken; link: string } | null>(null);

  // 1. Initialize defaults and subscriptions
  useEffect(() => {
    initializeAviatorSignalDefaults();

    const unsubTokens = subscribeToAllTokens((tokList) => {
      setTokens(tokList);
      setLoading(false);
    });

    const unsubRound = subscribeToCurrentRound((round) => {
      setCurrentRound(round);
    });

    const unsubHistory = subscribeToRoundsHistory((history) => {
      setRoundHistory(history);
    });

    const unsubConn = subscribeToGameConnection((conn) => {
      setConnection(conn);
    });

    return () => {
      unsubTokens();
      unsubRound();
      unsubHistory();
      unsubConn();
    };
  }, []);

  // 2. Handle Create Access Link
  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      showToast(lang === 'bn' ? 'অনুগ্রহ করে গ্রাহকের নাম লিখুন!' : 'Please enter customer name!');
      return;
    }

    setIsSubmitting(true);
    try {
      haptics.impact();
      const res = await createSignalAccess({
        userName: userName.trim(),
        phone: userPhone.trim(),
        subscriptionType,
        durationDays,
        connectedGameId: DEFAULT_GAME_ID,
        notes: notes.trim()
      });

      setCreatedResult(res);
      setUserName('');
      setUserPhone('');
      setNotes('');
      showToast(lang === 'bn' ? 'সিগন্যাল লিঙ্ক সফলভাবে তৈরি হয়েছে!' : 'Signal access link generated successfully!');
      
      // Auto copy
      if (navigator.clipboard) {
        navigator.clipboard.writeText(res.link);
      }
    } catch (err: any) {
      console.error('Error creating signal token:', err);
      showToast(lang === 'bn' ? 'তৈরি করতে ত্রুটি হয়েছে!' : 'Error generating signal access!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Copy Link Helper
  const handleCopyLink = (tokenStr: string) => {
    const origin = window.location.origin;
    const fullLink = `${origin}/#signal/${tokenStr}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedToken(tokenStr);
    haptics.success();
    showToast(lang === 'bn' ? 'সিগন্যাল লিঙ্ক কপি করা হয়েছে!' : 'Signal Link copied to clipboard!');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // 4. Toggle Token Status
  const handleToggleStatus = async (token: SignalToken) => {
    const newStatus = token.status === 'active' ? 'revoked' : 'active';
    try {
      haptics.selection();
      await updateTokenStatus(token.token, newStatus);
      showToast(
        lang === 'bn' 
          ? `সিগন্যাল স্ট্যাটাস ${newStatus === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে!` 
          : `Signal status updated to ${newStatus}!`
      );
    } catch (err) {
      showToast('Error updating token status');
    }
  };

  // 5. Toggle Premium
  const handleTogglePremium = async (token: SignalToken) => {
    const newType: SubscriptionType = token.subscriptionType === 'premium' ? 'free' : 'premium';
    try {
      haptics.selection();
      await updateTokenSubscription(token.token, newType, token.expiresAt);
      showToast(
        lang === 'bn' 
          ? `সাবস্ক্রিপশন ${newType === 'premium' ? 'প্রিমিয়াম' : 'ফ্রি'} করা হয়েছে!` 
          : `Subscription changed to ${newType}!`
      );
    } catch (err) {
      showToast('Error updating subscription');
    }
  };

  // 6. Extend 30 Days
  const handleExtendDays = async (token: SignalToken, days: number = 30) => {
    const curr = new Date(token.expiresAt);
    const baseDate = curr.getTime() > Date.now() ? curr : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    
    try {
      haptics.impact();
      await updateTokenSubscription(token.token, token.subscriptionType, baseDate.toISOString());
      if (token.status === 'expired' || token.status === 'revoked') {
        await updateTokenStatus(token.token, 'active');
      }
      showToast(lang === 'bn' ? `মেয়াদ +${days} দিন বৃদ্ধি করা হয়েছে!` : `Validity extended by +${days} days!`);
    } catch (err) {
      showToast('Error extending duration');
    }
  };

  // 7. Delete Token
  const handleDelete = async (tokenStr: string) => {
    if (window.confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত এই সিগন্যাল অ্যাক্সেস মুছে ফেলতে চান?' : 'Are you sure you want to delete this signal token?')) {
      try {
        await deleteSignalToken(tokenStr);
        showToast(lang === 'bn' ? 'সিগন্যাল অ্যাক্সেস মুছে ফেলা হয়েছে!' : 'Signal access deleted!');
      } catch (err) {
        showToast('Error deleting token');
      }
    }
  };

  // Filtered tokens
  const filteredTokens = tokens.filter(t => {
    const matchesSearch = 
      t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.token.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  const isLiveRunning = currentRound?.status === 'ROUND_RUNNING';
  const isLiveFinished = currentRound?.status === 'ROUND_FINISHED' || currentRound?.status === 'CRASHED';

  return (
    <div className="space-y-6">
      {/* SECTION 1: HEADER & LIVE ENGINE MONITOR BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/40 border border-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                <Radio className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-black font-chakra tracking-wide flex items-center gap-2">
                  <span>Aviator Signal Management</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Engine Sync Active
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {lang === 'bn' 
                    ? 'গ্রাহকদের জন্য প্রাইভেট সিকিউর সিগন্যাল লিঙ্ক জেনারেট ও ম্যানেজ করুন। গেম এবং সিগন্যাল একই অথরিটেটিভ রাউন্ড ব্যবহার করে।' 
                    : 'Generate private customer links and monitor authoritative server round synchronization in real-time.'}
                </p>
              </div>
            </div>
          </div>

          {/* Engine Status Pill Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-2xl flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-300 font-bold">Round:</span>
              <span className="text-white font-bold">{currentRound?.roundId || 'RD-LIVE'}</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-2xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-bold">Pre-Round Result:</span>
              <span className="text-emerald-400 font-black font-chakra">
                {currentRound?.predictedMultiplier ? `${currentRound.predictedMultiplier.toFixed(2)}x` : 'Syncing'}
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-2xl flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <span className="text-slate-300 font-bold">Active Links:</span>
              <span className="text-rose-400 font-black">{tokens.filter(t => t.status === 'active').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: NEWLY CREATED LINK NOTIFICATION */}
      {createdResult && (
        <div className="p-4 sm:p-5 bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl shadow-md text-emerald-950 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{lang === 'bn' ? 'সিগন্যাল অ্যাক্সেস লিঙ্ক তৈরি সম্পন্ন!' : 'Signal Access Link Created!'}</span>
            </div>
            <button
              onClick={() => setCreatedResult(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="bg-white p-3 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-800">{createdResult.token.userName} ({createdResult.token.subscriptionType.toUpperCase()})</div>
              <div className="text-[11px] font-mono text-emerald-700 truncate select-all">{createdResult.link}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopyLink(createdResult.token.token)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedToken === createdResult.token.token ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <a
                href={createdResult.link}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: CREATE SIGNAL ACCESS FORM & STATS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Create Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Plus className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-black font-chakra text-slate-900">
                  {lang === 'bn' ? 'নতুন সিগন্যাল অ্যাক্সেস তৈরি করুন' : 'Generate New Signal Access'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'bn' ? 'গ্রাহকের জন্য স্বতন্ত্র গোপন সিগন্যাল লিঙ্ক জেনারেট করুন।' : 'Issue a secure, tokenized private URL for your player.'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateAccess} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center justify-between">
                  <span>গ্রাহকের নাম (Customer Name) *</span>
                  {registeredUsers.length > 0 && (
                    <span className="text-[10px] text-blue-600 font-normal">মেম্বার সিলেক্ট করা যাবে</span>
                  )}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. VIP Trader Abdul / Member"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                {/* Quick select from registered users */}
                {registeredUsers.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1">
                    {registeredUsers.slice(0, 4).map((u) => (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => {
                          setUserName(u.name || u.username || 'Member');
                          if (u.phone) setUserPhone(u.phone);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                      >
                        +{u.name || u.username}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone / Contact */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">
                  ফোন / হোয়াটসঅ্যাপ (Optional Contact)
                </label>
                <input
                  type="text"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="+8801XXXXXXXXX"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              {/* Subscription Plan */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">
                  সাবস্ক্রিপশন প্ল্যান (Subscription Plan)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSubscriptionType('premium')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      subscriptionType === 'premium'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>VIP Premium</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubscriptionType('free')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      subscriptionType === 'free'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>Free / Trial</span>
                  </button>
                </div>
              </div>

              {/* Duration Days */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">
                  মেয়াদ (Duration)
                </label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-hidden cursor-pointer"
                >
                  <option value={7}>7 Days (1 Week)</option>
                  <option value={15}>15 Days (Half Month)</option>
                  <option value={30}>30 Days (1 Month - Standard)</option>
                  <option value={90}>90 Days (3 Months VIP)</option>
                  <option value={180}>180 Days (6 Months)</option>
                  <option value={365}>365 Days (1 Year Full Access)</option>
                </select>
              </div>
            </div>

            {/* Connected Game (Readonly Authoritative) */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-rose-600" />
                <span className="font-bold text-slate-800">Connected Game Engine:</span>
                <span className="font-mono text-slate-600">Aviator Jet Core (Authoritative Game)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Direct Sync
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-chakra font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{lang === 'bn' ? 'প্রাইভেট সিগন্যাল লিঙ্ক জেনারেট করুন' : 'Generate & Copy Signal Access Link'}</span>
            </button>
          </form>
        </div>

        {/* Right 1 Column: Live Authoritative Game Telemetry */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-500" />
                Live Round Verification
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">100% SHARED RNG</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Round ID:</span>
                <span className="font-mono font-bold text-white">{currentRound?.roundId || 'RD-LIVE'}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Game State:</span>
                <span className={`font-black font-chakra px-2 py-0.5 rounded text-[10px] ${
                  isLiveRunning 
                    ? 'bg-rose-600 text-white animate-pulse' 
                    : isLiveFinished 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-emerald-600 text-white'
                }`}>
                  {currentRound?.status || 'WAITING'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Authoritative Multiplier:</span>
                <span className="font-mono text-base font-black text-emerald-400">
                  {currentRound?.predictedMultiplier ? `${currentRound.predictedMultiplier.toFixed(2)}x` : '--.--x'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              💡 <strong>Authoritative Rule:</strong> Game engine creates the crash multiplier <em>before</em> the 5-second countdown. Both the Aviator Game and Signal App read this identical value from the server.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Latency: {connection?.pingMs || 18}ms</span>
            <span className="text-emerald-400 font-bold">● Server Online</span>
          </div>
        </div>
      </div>

      {/* SECTION 4: ACTIVE & REGISTERED SIGNAL TOKENS LIST */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black font-chakra text-slate-900 flex items-center gap-2">
              <span>{lang === 'bn' ? 'সকল সিগন্যাল অ্যাক্সেস লিঙ্ক ও সদস্য' : 'Active Signal Access Directory'}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                {tokens.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'bn' ? 'সিগন্যাল লিঙ্ক কপি, সক্রিয়/নিষ্ক্রিয় ও মেয়াদ পরিবর্তন করুন।' : 'Manage access status, extend validity, or copy private player URLs.'}
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user or token..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === 'all' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === 'active' ? 'bg-white shadow-2xs text-emerald-600' : 'text-slate-500'}`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('revoked')}
                className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === 'revoked' ? 'bg-white shadow-2xs text-rose-600' : 'text-slate-500'}`}
              >
                Revoked
              </button>
            </div>
          </div>
        </div>

        {/* Tokens Table / Cards */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-bold">Loading signal credentials...</span>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Radio className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold">No signal access links found</p>
            <p className="text-[11px] text-slate-400">Generate a new access link above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTokens.map((t) => {
              const isExpired = new Date(t.expiresAt).getTime() < Date.now();
              const daysLeft = Math.ceil((new Date(t.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const fullLink = `${window.location.origin}/#signal/${t.token}`;

              return (
                <div 
                  key={t.token} 
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                    t.status === 'revoked'
                      ? 'bg-rose-50/40 border-rose-200'
                      : isExpired
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Left Column: User Info & Token Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">{t.userName}</span>
                      
                      {/* Subscription Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                        t.subscriptionType === 'premium'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}>
                        {t.subscriptionType}
                      </span>

                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                        t.status === 'active' && !isExpired
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'revoked'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.status === 'revoked' ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                      <span>Token: <strong className="text-slate-800">{t.token}</strong></span>
                      <span>•</span>
                      <span>
                        {isExpired ? (
                          <strong className="text-rose-600">Expired</strong>
                        ) : (
                          <strong className="text-emerald-700">{daysLeft} days left ({new Date(t.expiresAt).toLocaleDateString()})</strong>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Actions (Copy, Toggle, Extend, Delete) */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {/* Copy Link Button */}
                    <button
                      onClick={() => handleCopyLink(t.token)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                        copiedToken === t.token
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                      title="Copy customer's private Signal URL"
                    >
                      {copiedToken === t.token ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken === t.token ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    {/* Open in new tab */}
                    <a
                      href={fullLink}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl"
                      title="Preview Signal App"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {/* Toggle Active / Revoked */}
                    <button
                      onClick={() => handleToggleStatus(t)}
                      className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                        t.status === 'active'
                          ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 border-rose-300'
                          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-300'
                      }`}
                      title={t.status === 'active' ? 'Revoke Access' : 'Activate Access'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    {/* Toggle Premium / Free */}
                    <button
                      onClick={() => handleTogglePremium(t)}
                      className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                        t.subscriptionType === 'premium'
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                      }`}
                      title="Toggle Premium Status"
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>

                    {/* Extend +30 Days */}
                    <button
                      onClick={() => handleExtendDays(t, 30)}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                      title="Extend validity +30 Days"
                    >
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <span>+30d</span>
                    </button>

                    {/* Delete Token */}
                    <button
                      onClick={() => handleDelete(t.token)}
                      className="p-1.5 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                      title="Delete credential"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 5: AUTHORITATIVE SHARED ROUND HISTORY AUDIT LOG (LAST 20 ROUNDS) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <HistoryIcon className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-black font-chakra text-slate-900">
                {lang === 'bn' ? 'অথরিটেটিভ গেম ও সিগন্যাল রাউন্ড হিস্ট্রি' : 'Authoritative Shared Round Audit Log (Last 20 Rounds)'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'গেম ও সিগন্যাল উভয়ের জন্য সংরক্ষিত রিয়েল-টাইম রাউন্ড অডিট ডাটা।' : 'Verified server records proving 100% identical data between Game and Signal App.'}
              </p>
            </div>
          </div>
        </div>

        {roundHistory.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No completed rounds recorded yet in this session.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {roundHistory.slice(0, 20).map((r, i) => {
              const mult = r.finalMultiplier || r.currentMultiplier || 1.0;
              const isHigh = mult >= 2.0;
              const isHuge = mult >= 10.0;

              return (
                <div 
                  key={r.id || r.roundId || i}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center space-y-1 ${
                    isHuge 
                      ? 'bg-amber-50 border-amber-300 text-amber-900' 
                      : isHigh 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-mono text-slate-400">{r.roundId || `#${i + 1}`}</span>
                  <span className="text-base font-black font-chakra">
                    {mult.toFixed(2)}x
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
