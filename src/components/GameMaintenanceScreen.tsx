import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ServerCrash, 
  Wrench, 
  Lock, 
  RefreshCw, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { NormalizedGameStatus, fetchGameStatus } from '../services/gameStatusService';
import { GameItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { haptics } from '../utils/haptics';
import { motion, AnimatePresence } from 'motion/react';

interface GameMaintenanceScreenProps {
  gameId?: string;
  gameTitle?: string;
  game?: GameItem | null;
  status: NormalizedGameStatus;
  reason?: string;
  onBackToLobby: () => void;
  onStatusResolved?: (newStatus?: NormalizedGameStatus) => void;
}

export default function GameMaintenanceScreen({
  gameId = 'game',
  gameTitle,
  game,
  status,
  reason,
  onBackToLobby,
  onStatusResolved
}: GameMaintenanceScreenProps) {
  const { lang } = useLanguage();
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const displayName = gameTitle || game?.titleBn || game?.title || game?.name || 'Casino Game';

  // Configurable content overrides from Admin
  const customTitle = lang === 'bn' 
    ? (game?.maintenanceTitleBn || game?.maintenanceTitle)
    : (game?.maintenanceTitle || game?.maintenanceTitleBn);

  const customDesc = lang === 'bn'
    ? (game?.maintenanceDescriptionBn || game?.maintenanceDescription)
    : (game?.maintenanceDescription || game?.maintenanceDescriptionBn);

  const customEstimated = game?.maintenanceEstimatedTime;
  const customButtonText = lang === 'bn'
    ? (game?.maintenanceButtonTextBn || game?.maintenanceButtonText)
    : (game?.maintenanceButtonText || game?.maintenanceButtonTextBn);

  const displayReason = reason || game?.statusReason;

  // Handle live re-checking of server status
  const handleCheckStatus = async () => {
    haptics.selection();
    setChecking(true);
    setCheckResult(null);

    try {
      const res = await fetchGameStatus(gameId || game?.id || game?.slug || 'game');
      if (res.isAvailable && res.status === 'ACTIVE') {
        haptics.success();
        setCheckResult(lang === 'bn' ? 'সার্ভার সচল হয়েছে! গেমে প্রবেশ করা হচ্ছে...' : 'Server is now active! Entering game...');
        setTimeout(() => {
          if (onStatusResolved) onStatusResolved();
          else onBackToLobby();
        }, 1200);
      } else {
        haptics.warning();
        setCheckResult(
          lang === 'bn'
            ? `সার্ভার এখনও ${res.status === 'SERVER_ERROR' ? 'ত্রুটিযুক্ত' : res.status === 'MAINTENANCE' ? 'রক্ষণাবেক্ষণে' : 'নিষ্ক্রিয়'} রয়েছে। অনুগ্রহ করে একটু পর চেষ্টা করুন।`
            : `Game is still in ${res.status} mode. Please check back shortly.`
        );
      }
    } catch (e) {
      setCheckResult(lang === 'bn' ? 'স্ট্যাটাস যাচাই করতে ব্যর্থ হয়েছে।' : 'Failed to reach server verification.');
    } finally {
      setChecking(false);
    }
  };

  // Status-specific themes and labels
  const isServerError = status === 'SERVER_ERROR';
  const isMaintenance = status === 'MAINTENANCE';
  const isDisabled = status === 'DISABLED';

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto selection:bg-rose-500/30">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-30">
        <div className={`w-[500px] h-[500px] rounded-full blur-3xl ${
          isServerError ? 'bg-rose-600/20' : isMaintenance ? 'bg-amber-500/20' : 'bg-slate-700/20'
        }`} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center space-y-6"
      >
        {/* Top Status Icon & Badge */}
        <div className="flex flex-col items-center gap-3">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg border ${
            isServerError 
              ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 shadow-rose-500/10 animate-pulse'
              : isMaintenance
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-amber-500/10'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {isServerError && <ServerCrash size={40} className="stroke-[1.75]" />}
            {isMaintenance && <Wrench size={38} className="stroke-[1.75]" />}
            {isDisabled && <Lock size={38} className="stroke-[1.75]" />}
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider border shadow-xs">
            <span className={`w-2 h-2 rounded-full ${
              isServerError ? 'bg-rose-500 animate-ping' : isMaintenance ? 'bg-amber-500 animate-ping' : 'bg-slate-400'
            }`} />
            <span className={
              isServerError ? 'text-rose-400' : isMaintenance ? 'text-amber-400' : 'text-slate-300'
            }>
              {isServerError ? 'HTTP 500 • SERVER ERROR' : isMaintenance ? 'SCHEDULED MAINTENANCE' : 'GAME DISABLED'}
            </span>
          </div>
        </div>

        {/* Title & Game Name */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black font-chakra tracking-tight text-white">
            {customTitle || (
              isServerError
                ? (lang === 'bn' ? 'গেম সার্ভার সংযোগ বিচ্ছিন্ন (Server Error)' : 'Game Server Offline')
                : isMaintenance
                ? (lang === 'bn' ? 'সার্ভার রক্ষণাবেক্ষণ চলছে (Maintenance Mode)' : 'Under Scheduled Maintenance')
                : (lang === 'bn' ? 'গেমটি বর্তমানে বন্ধ রয়েছে (Game Disabled)' : 'Game Temporarily Unavailable')
            )}
          </h1>
          <div className="inline-block px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-chakra font-bold text-amber-400">
            {displayName}
          </div>
        </div>

        {/* Detailed Explanation / Description */}
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
          {customDesc || (
            isServerError
              ? (lang === 'bn' 
                  ? 'কারিগরি ত্রুটির কারণে এই গেমটির সার্ভার সংযোগ সাময়িকভাবে বিচ্ছিন্ন করা হয়েছে। আমাদের টেকনিক্যাল টিম কাজ করছে।' 
                  : 'This game is currently unreachable due to an internal server engine error. Direct access has been blocked to protect game integrity.')
              : isMaintenance
              ? (lang === 'bn'
                  ? 'সিস্টেম আপডেট এবং পারফরম্যান্স উন্নতির জন্য গেমটিতে রক্ষণাবেক্ষণ কাজ চলছে। খুব শীঘ্রই গেমটি পুনরায় চালু হবে।'
                  : 'Our engineering team is actively performing scheduled system upgrades. Access will resume shortly.')
              : (lang === 'bn'
                  ? 'অ্যাডমিনের নির্দেশে এই গেমটি সাময়িকভাবে বন্ধ রাখা হয়েছে।'
                  : 'This game has been temporarily taken offline by system administration.')
          )}
        </p>

        {/* Reason / Notice Banner (if admin provided specific reason) */}
        {displayReason && (
          <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl text-left space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
              <AlertCircle size={14} className={isServerError ? 'text-rose-400' : 'text-amber-400'} />
              <span>{lang === 'bn' ? 'অ্যাডমিন নোটিশ / কারণ:' : 'Notice / Reason:'}</span>
            </div>
            <p className="text-xs text-slate-300 font-mono pl-5">
              {displayReason}
            </p>
          </div>
        )}

        {/* Estimated Maintenance Downtime (if set) */}
        {customEstimated && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Clock size={14} />
            <span>{lang === 'bn' ? `আনুমানিক সময়: ${customEstimated}` : `Estimated Duration: ${customEstimated}`}</span>
          </div>
        )}

        {/* Wallet Safety Guarantee */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/40 px-3 py-2 rounded-xl">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          <span>
            {lang === 'bn' 
              ? 'আপনার ওয়ালেট ও ব্যালেন্স সম্পূর্ণ নিরাপদ ও অপরিবর্তিত রয়েছে।' 
              : 'Your demo wallet balance and session state remain completely safe.'}
          </span>
        </div>

        {/* Live Status Result Alert */}
        <AnimatePresence>
          {checkResult && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-amber-300 font-mono text-center"
            >
              {checkResult}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={onBackToLobby}
            className="w-full sm:flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 border border-slate-700 text-white font-chakra font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>{customButtonText || (lang === 'bn' ? 'লবিতে ফিরে যান' : 'Back to Game Lobby')}</span>
          </button>

          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full sm:flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-chakra font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            <span>
              {checking 
                ? (lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying Status...') 
                : (lang === 'bn' ? 'স্ট্যাটাস রিচেক করুন' : 'Check Server Status')}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
