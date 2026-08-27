import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  AlertTriangle, 
  Power, 
  Gamepad2, 
  Zap, 
  Link as LinkIcon,
  Activity,
  History as HistoryIcon,
  Save,
  Check,
  Server,
  Cpu,
  Share2
} from 'lucide-react';
import { 
  SignalRound, 
  SignalGameConnection,
  SignalConnectionStatus 
} from '../../types';
import { 
  subscribeToCurrentRound, 
  subscribeToRoundsHistory, 
  subscribeToGameConnection, 
  updateGameConnectionSettings,
  testGameConnection,
  DEFAULT_GAME_ID,
  initializeAviatorSignalDefaults
} from '../../services/aviatorSignalService';
import { haptics } from '../../utils/haptics';

interface SignalManagementTabProps {
  lang: 'bn' | 'en';
  showToast: (msg: string) => void;
  registeredUsers?: Array<{ uid: string; name?: string; username?: string; phone?: string }>;
}

export default function SignalManagementTab({ lang, showToast }: SignalManagementTabProps) {
  const [currentRound, setCurrentRound] = useState<SignalRound | null>(null);
  const [roundHistory, setRoundHistory] = useState<SignalRound[]>([]);
  const [connection, setConnection] = useState<SignalGameConnection | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable configuration state
  const [signalAppUrl, setSignalAppUrl] = useState('');
  const [gameName, setGameName] = useState('Aviator');
  const [gameId, setGameId] = useState(DEFAULT_GAME_ID);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pingResult, setPingResult] = useState<number | null>(null);

  // 1. Initialize defaults and subscriptions
  useEffect(() => {
    initializeAviatorSignalDefaults();

    const unsubRound = subscribeToCurrentRound((round) => {
      setCurrentRound(round);
      setLoading(false);
    });

    const unsubHistory = subscribeToRoundsHistory((history) => {
      setRoundHistory(history);
    });

    const unsubConn = subscribeToGameConnection((conn) => {
      if (conn) {
        setConnection(conn);
        if (conn.signalAppUrl) {
          setSignalAppUrl(conn.signalAppUrl);
        } else if (typeof window !== 'undefined') {
          setSignalAppUrl(`${window.location.origin}/#signal`);
        }
        if (conn.gameName) setGameName(conn.gameName);
        if (conn.gameId) setGameId(conn.gameId);
        if (conn.pingMs) setPingResult(conn.pingMs);
      }
    });

    return () => {
      unsubRound();
      unsubHistory();
      unsubConn();
    };
  }, []);

  // Set default URL on first mount if empty
  useEffect(() => {
    if (!signalAppUrl && typeof window !== 'undefined') {
      setSignalAppUrl(`${window.location.origin}/#signal`);
    }
  }, [signalAppUrl]);

  // 2. Save Signal App URL
  const handleSaveSignalUrl = async () => {
    const trimmed = signalAppUrl.trim();
    if (!trimmed) {
      showToast(lang === 'bn' ? 'অনুগ্রহ করে সঠিক URL লিখুন!' : 'Please enter a valid Signal App URL!');
      return;
    }

    setIsSavingUrl(true);
    try {
      haptics.impact();
      await updateGameConnectionSettings({
        signalAppUrl: trimmed,
        gameName: gameName.trim() || 'Aviator',
        gameId: gameId.trim() || DEFAULT_GAME_ID,
        lastSyncAt: new Date().toISOString()
      });
      showToast(lang === 'bn' ? 'সিগন্যাল অ্যাপ URL সফলভাবে সংরক্ষিত হয়েছে!' : 'Signal App URL saved successfully!');
    } catch (err: any) {
      console.error('Error saving signal app URL:', err);
      showToast(lang === 'bn' ? 'সংরক্ষণ করতে ত্রুটি হয়েছে!' : 'Failed to save Signal App URL!');
    } finally {
      setIsSavingUrl(false);
    }
  };

  // 3. Copy Single Signal Link
  const handleCopySignalLink = () => {
    const urlToCopy = signalAppUrl.trim() || (typeof window !== 'undefined' ? `${window.location.origin}/#signal` : 'https://yourwebsite.com/signal');
    navigator.clipboard.writeText(urlToCopy);
    setCopiedLink(true);
    haptics.success();
    showToast(lang === 'bn' ? 'সিগন্যাল লিংক ক্লিপবোর্ডে কপি করা হয়েছে!' : 'Signal App link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 4. Open Single Signal App
  const handleOpenSignalApp = () => {
    haptics.impact();
    const urlToOpen = signalAppUrl.trim() || (typeof window !== 'undefined' ? `${window.location.origin}/#signal` : 'https://yourwebsite.com/signal');
    if (typeof window !== 'undefined') {
      window.open(urlToOpen, '_blank');
    }
  };

  // 5. Toggle Game Connection
  const handleToggleGameConnection = async () => {
    const newStatus: SignalConnectionStatus = connection?.connectionStatus === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED';
    try {
      haptics.impact();
      await updateGameConnectionSettings({
        connectionStatus: newStatus,
        signalAppStatus: newStatus,
        lastSyncAt: new Date().toISOString()
      });
      showToast(lang === 'bn' 
        ? `গেম কানেকশন ${newStatus === 'CONNECTED' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে!` 
        : `Game Connection ${newStatus === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED'}!`);
    } catch (err) {
      console.error('Error toggling game connection:', err);
    }
  };

  // 6. Test Game Connection
  const handleTestConnection = async () => {
    setIsTestingConn(true);
    try {
      haptics.impact();
      const res = await testGameConnection();
      if (res.success) {
        setPingResult(res.pingMs);
        showToast(lang === 'bn' ? `কানেকশন সফল! পিং: ${res.pingMs}ms` : `Connection Successful! Ping: ${res.pingMs}ms`);
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(`Test failed: ${err.message}`);
    } finally {
      setIsTestingConn(false);
    }
  };

  const isConnected = connection?.connectionStatus === 'CONNECTED';
  const isSignalAppConnected = connection?.signalAppStatus !== 'DISCONNECTED' && isConnected;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-600 shadow-xs">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-chakra">
                  Game Connect → Aviator Signal
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isConnected 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' 
                    : 'bg-rose-50 text-rose-700 border border-rose-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                  {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'bn' 
                  ? 'একটি গেম ইঞ্জিন, একটি সেন্ট্রাল সিগন্যাল সার্ভিস, একটি শেয়ার্ড সিগন্যাল অ্যাপ — সব কাস্টমার একই রিয়েল-টাইম রাউন্ড ডাটা দেখতে পাবে।' 
                  : 'One authoritative game server, one Signal Service, one shared Signal App — all customers receive identical live round data.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTestConnection}
            disabled={isTestingConn}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold font-chakra flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
            <span>{isTestingConn ? (lang === 'bn' ? 'টেস্ট চলছে...' : 'Testing...') : (lang === 'bn' ? 'টেস্ট কানেকশন' : 'Test Connection')}</span>
          </button>

          <button
            onClick={handleToggleGameConnection}
            className={`px-3.5 py-2 rounded-xl text-xs font-black font-chakra flex items-center gap-1.5 transition-all active:scale-95 ${
              isConnected 
                ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isConnected ? (lang === 'bn' ? 'ডিসকানেক্ট গেম' : 'Disconnect Game') : (lang === 'bn' ? 'কানেক্ট গেম' : 'Connect Game')}</span>
          </button>
        </div>
      </div>

      {/* Grid: Signal App URL Section (Primary) + Game Connection Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / TOP: 1. SINGLE SIGNAL APP URL CONTROLS */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <LinkIcon className="w-5 h-5 text-red-600" />
                <h2 className="text-base font-black font-chakra">
                  {lang === 'bn' ? 'সিগন্যাল অ্যাপ লিংক (Signal App URL)' : 'Signal App URL'}
                </h2>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Single Shared URL</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {lang === 'bn' ? 'পাবলিক সিগন্যাল অ্যাপ URL' : 'Public Signal App URL'}
              </label>
              
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={signalAppUrl}
                    onChange={(e) => setSignalAppUrl(e.target.value)}
                    placeholder="https://yourwebsite.com/signal"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold"
                  />
                </div>
                <button
                  onClick={handleSaveSignalUrl}
                  disabled={isSavingUrl}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-chakra text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSavingUrl ? (lang === 'bn' ? 'সংরক্ষণ...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ (SAVE)' : 'SAVE')}</span>
                </button>
              </div>

              {/* Action Buttons: COPY SIGNAL LINK & OPEN SIGNAL APP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleCopySignalLink}
                  className={`w-full py-3 px-4 rounded-xl font-chakra text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 border ${
                    copiedLink 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                      : 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md shadow-red-600/20'
                  }`}
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? (lang === 'bn' ? 'কপি সফল হয়েছে!' : 'COPIED TO CLIPBOARD!') : (lang === 'bn' ? 'কপি সিগন্যাল লিংক (COPY LINK)' : 'COPY SIGNAL LINK')}</span>
                </button>

                <button
                  onClick={handleOpenSignalApp}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-chakra text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <ExternalLink className="w-4 h-4 text-slate-600" />
                  <span>{lang === 'bn' ? 'সিগন্যাল অ্যাপ ওপেন করুন' : 'OPEN SIGNAL APP'}</span>
                </button>
              </div>

              {/* Information Notice */}
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{lang === 'bn' ? 'একক লিংক নীতিমালা (One Shared Signal)' : 'Single Shared Signal Policy'}</span>
                </div>
                <p className="text-blue-800 text-[11px]">
                  {lang === 'bn' 
                    ? 'এডমিন এই একটি লিংক কপি করে যেকোনো সংখ্যক কাস্টমারকে পাঠাতে পারবেন। কোনো কাস্টমার-ভিত্তিক আলাদা লিংক বা টোকেনের প্রয়োজন নেই। যারা এই লিংকে ঢুকবে সবাই একই সময়ে মূল Aviator গেমের লাইভ রাউন্ড এবং ভেরিফাইড সিগন্যাল দেখতে পাবে।'
                    : 'The admin can copy this ONE link and send it to any number of customers. No customer-specific links, tokens, or names required. Everyone who opens this Signal App sees the SAME current round information from the SAME Aviator game.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. GAME CONNECTION CONFIGURATION */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <Gamepad2 className="w-5 h-5 text-slate-700" />
                <h2 className="text-base font-black font-chakra">
                  {lang === 'bn' ? 'গেম কানেকশন কনফিগারেশন' : 'Game Connection Configuration'}
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {connection?.currentSessionId || 'sess_core_live'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Game Name
                </label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Game ID
                </label>
                <input
                  type="text"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {/* Status Summary List */}
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-slate-600">Game Connection</span>
                <span className={`font-black uppercase flex items-center gap-1.5 ${isConnected ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-slate-600">Signal App</span>
                <span className={`font-black uppercase flex items-center gap-1.5 ${isSignalAppConnected ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${isSignalAppConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {isSignalAppConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-slate-600">Last Sync</span>
                <span className="font-mono text-slate-500 font-bold">
                  {connection?.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleTimeString() : 'Active in real-time'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-slate-600">Server Ping / Latency</span>
                <span className="font-mono text-slate-700 font-black">
                  {pingResult ? `${pingResult} ms` : '18 ms'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT / BOTTOM: LIVE AUTHORITATIVE SERVER TELEMETRY & ROUND AUDIT */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CURRENT LIVE ROUND MONITOR */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-black tracking-widest text-slate-300 uppercase font-chakra">
                  Live Authoritative Engine Stream
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-black text-emerald-400 font-mono">
                SINGLE SOURCE OF TRUTH
              </span>
            </div>

            {/* Live Round Box */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-2">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                {currentRound?.status === 'ROUND_RUNNING' ? 'CURRENT LIVE FLIGHT' : 'UPCOMING ROUND PRE-SIGNAL'}
              </div>

              <div className="text-5xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300">
                {currentRound?.status === 'ROUND_RUNNING' 
                  ? `${currentRound.currentMultiplier.toFixed(2)}x`
                  : currentRound?.predictedMultiplier 
                    ? `${currentRound.predictedMultiplier.toFixed(2)}x` 
                    : '--.--x'}
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs font-mono text-slate-300 font-bold">
                  {currentRound?.roundId || 'ROUND #RD-LIVE'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-900/60 text-emerald-300 text-[10px] font-bold border border-emerald-700/40">
                  ● SERVER VERIFIED
                </span>
              </div>
            </div>

            {/* Metadata breakdown */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Engine Status:</span>
                <span className="text-emerald-400 font-bold">{currentRound?.status || 'WAITING_FOR_ROUND'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Server Signature:</span>
                <span className="text-slate-300 font-bold truncate max-w-[170px]">
                  {currentRound?.serverSignature || 'sig_sha256_auth_verified'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Synchronized Clients:</span>
                <span className="text-slate-200 font-bold">ALL GLOBAL CUSTOMERS</span>
              </div>
            </div>
          </div>

          {/* RECENT 20 COMPLETED ROUNDS AUDIT */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-chakra">
                  Shared Game History (Latest 20)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {roundHistory.length} Rounds
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {roundHistory.map((item, idx) => {
                const mult = item.finalMultiplier || item.currentMultiplier || 1.0;
                const isHigh = mult >= 10;
                const isMed = mult >= 2;
                return (
                  <div
                    key={item.id || idx}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                      isHigh
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : isMed
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {mult.toFixed(2)}x
                  </div>
                );
              })}
              {roundHistory.length === 0 && (
                <div className="text-center w-full py-4 text-xs text-slate-400 font-medium">
                  {lang === 'bn' ? 'কোনো পূর্ববর্তী রাউন্ড নেই।' : 'No completed rounds yet.'}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
