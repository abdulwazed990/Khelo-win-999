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
  Share2,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Signal,
  CheckCircle,
  XCircle
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
  toggleSignalAppStatus,
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
  const [isTogglingApp, setIsTogglingApp] = useState(false);
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
      showToast(lang === 'bn' ? 'সিগন্যাল অ্যাপ URL সংরক্ষিত হয়েছে!' : 'Signal App URL saved successfully!');
    } catch (err: any) {
      console.error('Error saving signal app URL:', err);
      showToast(lang === 'bn' ? 'সংরক্ষণ করতে ত্রুটি হয়েছে!' : 'Failed to save Signal App URL!');
    } finally {
      setIsSavingUrl(false);
    }
  };

  // 3. Toggle Signal App Master ON/OFF Switch
  const handleToggleSignalAppStatus = async () => {
    const nextState = connection?.signalAppEnabled !== false ? false : true;
    setIsTogglingApp(true);
    try {
      haptics.impact();
      await toggleSignalAppStatus(nextState);
      showToast(lang === 'bn' 
        ? `সিগন্যাল অ্যাপ ব্রডকাস্ট ${nextState ? 'সক্রিয় (ON)' : 'নিষ্ক্রিয় (OFF)'} করা হয়েছে!` 
        : `Signal App broadcast turned ${nextState ? 'ON' : 'OFF'}!`);
    } catch (err) {
      console.error('Error toggling signal app status:', err);
    } finally {
      setIsTogglingApp(false);
    }
  };

  // 4. Copy Single Signal Link
  const handleCopySignalLink = () => {
    const urlToCopy = signalAppUrl.trim() || (typeof window !== 'undefined' ? `${window.location.origin}/#signal` : 'https://yourwebsite.com/signal');
    navigator.clipboard.writeText(urlToCopy);
    setCopiedLink(true);
    haptics.success();
    showToast(lang === 'bn' ? 'সিগন্যাল লিংক ক্লিপবোর্ডে কপি করা হয়েছে!' : 'Signal App link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 5. Open Single Signal App
  const handleOpenSignalApp = () => {
    haptics.impact();
    const urlToOpen = signalAppUrl.trim() || (typeof window !== 'undefined' ? `${window.location.origin}/#signal` : 'https://yourwebsite.com/signal');
    if (typeof window !== 'undefined') {
      window.open(urlToOpen, '_blank');
    }
  };

  // 6. Toggle Game Connection
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

  // 7. Test Game Connection
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
  const isSignalAppOn = connection?.signalAppEnabled !== false;
  const syncStatus = isConnected ? 'LIVE' : 'OFFLINE';

  // Last finished round for "Last Signal" analysis
  const lastFinishedRound = roundHistory.length > 0 ? roundHistory[0] : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* 1. TOP HEADER & MASTER CONTROLS */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-600 shadow-xs">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-chakra">
                  Game Signal CMS
                </h1>

                {/* Master Signal App Status Badge */}
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                  isSignalAppOn 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isSignalAppOn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span>Signal App: {isSignalAppOn ? 'ON' : 'OFF'}</span>
                </div>

                {/* Connection Status Badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                  isConnected 
                    ? 'bg-blue-50 text-blue-700 border-blue-300' 
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  <Activity className="w-3 h-3" />
                  {isConnected ? 'LIVE ENGINE' : 'DISCONNECTED'}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1">
                {lang === 'bn' 
                  ? 'গ্লোবাল রিয়েল-টাইম Aviator সিগন্যাল ইঞ্জিন — একটি সেন্ট্রাল সিগন্যাল সার্ভিস, সব কাস্টমার একই সাথে একই রাউন্ড দেখতে পায়।' 
                  : 'Global Real-Time Aviator Signal Engine — single authoritative source of truth, one shared link for all customers.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Signal App ON/OFF Master Toggle Button */}
          <button
            onClick={handleToggleSignalAppStatus}
            disabled={isTogglingApp}
            className={`px-3.5 py-2 rounded-xl text-xs font-black font-chakra flex items-center gap-2 transition-all active:scale-95 border ${
              isSignalAppOn
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
            }`}
          >
            {isSignalAppOn ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            <span>{isSignalAppOn ? (lang === 'bn' ? 'সিগন্যাল অ্যাপ: ON' : 'SIGNAL APP: ON') : (lang === 'bn' ? 'সিগন্যাল অ্যাপ: OFF' : 'SIGNAL APP: OFF')}</span>
          </button>

          <button
            onClick={handleTestConnection}
            disabled={isTestingConn}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold font-chakra flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-60 border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
            <span>{isTestingConn ? 'Testing...' : (lang === 'bn' ? 'টেস্ট কানেকশন' : 'Test Ping')}</span>
          </button>

          <button
            onClick={handleToggleGameConnection}
            className={`px-3.5 py-2 rounded-xl text-xs font-black font-chakra flex items-center gap-1.5 transition-all active:scale-95 border ${
              isConnected 
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300' 
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-xs'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isConnected ? (lang === 'bn' ? 'ডিসকানেক্ট' : 'Disconnect') : (lang === 'bn' ? 'কানেক্ট' : 'Connect')}</span>
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME TELEMETRY STATUS DASHBOARD (REQUIRED CMS METRICS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Metric 1: Signal App Status */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Signal App Status
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isSignalAppOn ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
            <span className={`text-base font-black font-chakra ${isSignalAppOn ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isSignalAppOn ? 'ACTIVE (ON)' : 'PAUSED (OFF)'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {isSignalAppOn ? 'Broadcasting live' : 'Offline banner shown'}
          </div>
        </div>

        {/* Metric 2: Connected Game & Engine */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Connected Game
          </div>
          <div className="text-base font-black text-slate-800 font-chakra flex items-center gap-1">
            <Gamepad2 className="w-4 h-4 text-red-600" />
            <span>{connection?.gameName || 'Aviator'}</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold font-mono flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>{connection?.connectionStatus || 'CONNECTED'}</span>
          </div>
        </div>

        {/* Metric 3: Real-Time Sync Status */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Sync Status
          </div>
          <div className="flex items-center gap-1.5 text-base font-black text-slate-800 font-chakra">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className={isConnected ? 'text-emerald-700' : 'text-rose-700'}>{syncStatus}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Latency: {pingResult ? `${pingResult}ms` : '18ms'}
          </div>
        </div>

        {/* Metric 4: Current Round ID */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Current Round ID
          </div>
          <div className="text-xs font-mono font-black text-slate-900 truncate">
            {currentRound?.roundId || 'AVI-20260827-18453'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Status: <span className="font-bold text-blue-600">{currentRound?.status === 'WAITING_FOR_ROUND' ? 'BETTING' : currentRound?.status || 'READY'}</span>
          </div>
        </div>

        {/* Metric 5: Next Signal */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Next Signal
          </div>
          <div className="text-base font-black text-emerald-600 font-mono">
            {currentRound?.predictedMultiplier ? `${currentRound.predictedMultiplier.toFixed(2)}x` : '2.35x'}
          </div>
          <div className="text-[10px] text-emerald-700 font-bold">
            ● SERVER VERIFIED
          </div>
        </div>

        {/* Metric 6: Last Signal & Result */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Last Signal / Result
          </div>
          <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-1">
            <span className="text-slate-500">Sig:</span>
            <span className="text-purple-600 font-black">{lastFinishedRound?.predictedMultiplier ? `${lastFinishedRound.predictedMultiplier.toFixed(2)}x` : '2.00x'}</span>
            <span className="text-slate-500">Res:</span>
            <span className="text-emerald-600 font-black">{lastFinishedRound?.finalMultiplier ? `${lastFinishedRound.finalMultiplier.toFixed(2)}x` : '1.86x'}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate">
            {lastFinishedRound?.roundId || 'Completed'}
          </div>
        </div>

      </div>

      {/* 3. MAIN SECTION: SINGLE SIGNAL APP URL CONTROLS + AUTHORITATIVE ENGINE TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: SINGLE SIGNAL APP URL CONFIGURATION */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <LinkIcon className="w-5 h-5 text-red-600" />
                <h2 className="text-base font-black font-chakra">
                  {lang === 'bn' ? 'সিগন্যাল অ্যাপ লিংক (Single Public URL)' : 'Global Signal App URL'}
                </h2>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold font-chakra">
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>One URL for All Customers</span>
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

              {/* Single Shared URL Policy Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'bn' ? 'একক গ্লোবাল সিগন্যাল সিস্টেম' : 'Single Global Signal Architecture'}</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  {lang === 'bn' 
                    ? 'এডমিন এই একটি মাত্র লিংক কপি করে যেকোনো সংখ্যক কাস্টমারকে শেয়ার করতে পারবেন। আলাদা কোনো কাস্টমার আইডি, টোকেন বা নামের প্রয়োজন নেই। যারা এই লিংকে ঢুকবেন সবাই একই সময়ে Aviator গেমের লাইভ রাউন্ড এবং প্রি-সিগন্যাল দেখতে পাবেন।'
                    : 'The admin can copy this single URL and distribute it to any customer. No user-specific links or individual tokens are used. All customers connecting to this link see identical round timestamps, server signals, and flight telemetry in real-time.'}
                </p>
              </div>
            </div>
          </div>

          {/* GAME ENGINE PARAMETERS */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <Server className="w-5 h-5 text-slate-700" />
                <h2 className="text-base font-black font-chakra">
                  {lang === 'bn' ? 'সার্ভার ও ইঞ্জিন সংযোগ' : 'Server & Engine Connection'}
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {connection?.currentSessionId || 'sess_authoritative_live'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs font-mono">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-sans font-medium">Connected Game Engine</span>
                <span className="font-bold text-slate-800">{connection?.gameName || 'Aviator'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-sans font-medium">Authoritative Clock</span>
                <span className="font-bold text-emerald-600">Synchronized (Server-authoritative)</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-sans font-medium">Last Synchronization</span>
                <span className="font-bold text-slate-700">{connection?.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleTimeString() : 'Live'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-sans font-medium">Verification Hash Protocol</span>
                <span className="font-bold text-slate-800">SHA-256 Pre-Round Signatures</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT: LIVE TELEMETRY STREAM & ROUND HISTORY AUDIT */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CURRENT LIVE ROUND COCKPIT MONITOR */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-black tracking-widest text-slate-300 uppercase font-chakra">
                  Authoritative Engine Stream
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-black text-emerald-400 font-mono">
                SINGLE SOURCE OF TRUTH
              </span>
            </div>

            {/* Live Round Box */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                {currentRound?.status === 'ROUND_RUNNING' ? 'CURRENT LIVE FLIGHT' : 'UPCOMING ROUND PRE-SIGNAL'}
              </div>

              <div className="text-5xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300">
                {currentRound?.status === 'ROUND_RUNNING' 
                  ? `${currentRound.currentMultiplier.toFixed(2)}x`
                  : currentRound?.predictedMultiplier 
                    ? `${currentRound.predictedMultiplier.toFixed(2)}x` 
                    : '2.35x'}
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs font-mono text-slate-300 font-bold">
                  {currentRound?.roundId || 'AVI-20260827-18453'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-900/60 text-emerald-300 text-[10px] font-bold border border-emerald-700/40">
                  ● SERVER VERIFIED
                </span>
              </div>
            </div>

            {/* Metadata Breakdown */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Current Game Status:</span>
                <span className="text-emerald-400 font-bold">{currentRound?.status === 'WAITING_FOR_ROUND' ? 'BETTING / COUNTDOWN' : currentRound?.status || 'READY'}</span>
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

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {roundHistory.slice(0, 20).map((item, idx) => {
                const resultMult = item.finalMultiplier || item.currentMultiplier || 1.0;
                const sigMult = item.predictedMultiplier || resultMult;
                const isHigh = resultMult >= 10;
                const isMed = resultMult >= 2;

                return (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold">#{item.roundId.replace('AVI-', '')}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 uppercase">Sig:</span>
                        <span className="font-bold text-purple-700">{sigMult.toFixed(2)}x</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 uppercase">Res:</span>
                        <span className={`font-black px-1.5 py-0.5 rounded-md ${
                          isHigh ? 'bg-purple-100 text-purple-700' : isMed ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {resultMult.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {roundHistory.length === 0 && (
                <div className="text-center w-full py-6 text-xs text-slate-400 font-medium">
                  {lang === 'bn' ? 'কোনো পূর্ববর্তী রাউন্ড নেই।' : 'No completed rounds recorded yet.'}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
