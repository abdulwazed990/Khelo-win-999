import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider,
  signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import { haptics } from '../../utils/haptics';
import { 
  Lock, 
  User as UserIcon, 
  ArrowLeft, 
  ShieldAlert, 
  ShieldCheck, 
  Globe, 
  Loader2, 
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { motion } from 'motion/react';

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToSite: () => void;
}

export const MASTER_ADMIN_USER = 'Sa7@kL3!';
export const MASTER_ADMIN_EMAIL = 'mohammadabdulwazed1@gmail.com';
export const MASTER_ADMIN_PASS = 'Sa7@kL3!';

export default function AdminLogin({ onSuccess, onBackToSite }: AdminLoginProps) {
  const { lang, setLanguage } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const getAdminLink = () => {
    const origin = window.location.origin;
    return `${origin}/#admin`;
  };

  const handleCopyLink = () => {
    const link = getAdminLink();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    haptics.success();
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const ensureAdminFirestoreProfile = async (uid: string, emailStr?: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { 
          role: 'admin',
          lastAdminLogin: new Date().toISOString()
        });
      } else {
        await setDoc(userRef, {
          uid: uid,
          name: 'TK333 Super Admin',
          username: 'Sa7@kL3!',
          email: emailStr || MASTER_ADMIN_EMAIL,
          role: 'admin',
          balance: 999999,
          createdAt: new Date().toISOString(),
          lastAdminLogin: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Admin profile sync warn:', e);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    haptics.medium();
    setErrorMsg(null);
    setLoading(true);

    const inputUser = username.trim();
    const inputPass = password.trim();

    try {
      // 1. Direct Master Key Validation (User: Sa7@kL3! / Pass: Sa7@kL3!)
      const isMasterUser = inputUser === MASTER_ADMIN_USER || 
                           inputUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase() ||
                           inputUser.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ||
                           inputUser.toLowerCase() === 'admin';
      
      const isMasterPass = inputPass === MASTER_ADMIN_PASS;

      if (isMasterUser && isMasterPass) {
        // Authenticate session immediately
        sessionStorage.setItem('tk333_admin_auth', 'true');
        localStorage.setItem('tk333_admin_auth', 'true');

        // Ensure Firebase auth session exists
        if (!auth.currentUser) {
          try {
            const cred = await signInWithEmailAndPassword(auth, MASTER_ADMIN_EMAIL, inputPass);
            await ensureAdminFirestoreProfile(cred.user.uid, cred.user.email || MASTER_ADMIN_EMAIL);
          } catch {
            try {
              const cred = await createUserWithEmailAndPassword(auth, MASTER_ADMIN_EMAIL, inputPass);
              await ensureAdminFirestoreProfile(cred.user.uid, MASTER_ADMIN_EMAIL);
            } catch {
              try {
                const anonCred = await signInAnonymously(auth);
                await ensureAdminFirestoreProfile(anonCred.user.uid, MASTER_ADMIN_EMAIL);
              } catch (e) {
                console.warn('Anonymous fallback auth note:', e);
              }
            }
          }
        } else {
          await ensureAdminFirestoreProfile(auth.currentUser.uid, auth.currentUser.email || MASTER_ADMIN_EMAIL);
        }

        haptics.success();
        onSuccess();
        return;
      }

      // 2. Standard Firebase Email/Password check fallback
      if (inputUser.includes('@')) {
        const cred = await signInWithEmailAndPassword(auth, inputUser, inputPass);
        await ensureAdminFirestoreProfile(cred.user.uid, cred.user.email || inputUser);
        sessionStorage.setItem('tk333_admin_auth', 'true');
        localStorage.setItem('tk333_admin_auth', 'true');
        haptics.success();
        onSuccess();
        return;
      }

      // If credentials do not match
      throw new Error(
        lang === 'bn' 
          ? 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়।' 
          : 'Invalid username or password.'
      );

    } catch (err: any) {
      haptics.error();
      console.error('Admin login error:', err);
      let message = err.message || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে।' : 'Login failed.');
      if (err.code === 'auth/invalid-credential') {
        message = lang === 'bn' 
          ? 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়।' 
          : 'Invalid credentials. Please try again.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    try {
      haptics.selection();
      setLoading(true);
      setErrorMsg(null);
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureAdminFirestoreProfile(result.user.uid, result.user.email || undefined);
      
      sessionStorage.setItem('tk333_admin_auth', 'true');
      localStorage.setItem('tk333_admin_auth', 'true');
      haptics.success();
      onSuccess();
    } catch (err: any) {
      console.error('Google Admin Sign-in error:', err);
      haptics.error();
      setErrorMsg(err.message || 'Google Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between p-3 sm:p-5 max-w-full overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto">
        <button
          onClick={() => {
            haptics.selection();
            onBackToSite();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs active:scale-95 transition-all"
        >
          <ArrowLeft size={15} />
          <span>{lang === 'bn' ? 'ক্যাসিনো সাইটে ফিরুন' : 'Back to Website'}</span>
        </button>

        {/* Language Switch */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={() => {
              haptics.selection();
              setLanguage('bn');
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all ${
              lang === 'bn' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            বাংলা
          </button>
          <button
            onClick={() => {
              haptics.selection();
              setLanguage('en');
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all ${
              lang === 'en' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto my-auto bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xl space-y-4"
      >
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 mx-auto shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400 font-chakra font-black text-xl">
              TK
            </div>
          </div>
          <div>
            <h1 className="text-xl font-chakra font-black text-slate-900 flex items-center justify-center gap-1.5">
              <span>TK333 VIP</span>
              <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-black uppercase">
                ADMIN CONSOLE
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {lang === 'bn' ? 'সিস্টেম ও কনটেন্ট অ্যাডমিনিস্ট্রেশন' : 'Exclusive Direct Access Portal'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-xs text-rose-700 leading-relaxed font-medium">
            <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleAdminLogin} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              {lang === 'bn' ? 'ইউজারনেম / ইমেইল:' : 'Username / Email:'}
            </label>
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-3 focus-within:bg-white focus-within:border-blue-600 transition-colors">
              <UserIcon size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={lang === 'bn' ? 'ইউজারনেম লিখুন' : 'Enter username'}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              {lang === 'bn' ? 'অ্যাডমিন পাসওয়ার্ড:' : 'Admin Password:'}
            </label>
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-3 focus-within:bg-white focus-within:border-blue-600 transition-colors">
              <Lock size={16} className="text-slate-400 shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-500 hover:to-blue-600 text-white font-chakra font-black text-xs sm:text-sm rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin text-white" />
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>{lang === 'bn' ? 'অ্যাডমিন প্যানেলে প্রবেশ করুন' : 'ENTER ADMIN PANEL'}</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-0.5 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-2.5 text-[10px] font-bold text-slate-400 uppercase">
            {lang === 'bn' ? 'বিকল্প প্রবেশ' : 'OR GOOGLE SIGN IN'}
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Quick Google 1-Click Login Button */}
        <button
          type="button"
          onClick={handleGoogleAdminLogin}
          disabled={loading}
          className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-2xl border border-slate-300 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z" />
            <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z" />
          </svg>
          <span>{lang === 'bn' ? 'Google দিয়ে প্রবেশ করুন' : 'Sign In with Google'}</span>
        </button>

        {/* Copy Admin Direct Link Section */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <LinkIcon size={12} className="text-slate-400" />
            <span>{lang === 'bn' ? 'অ্যাডমিন সিক্রেট লিংক:' : 'Admin Link:'}</span>
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold"
          >
            {copiedLink ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
            <span>{copiedLink ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'লিংক কপি করুন' : 'Copy Link')}</span>
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-400 font-medium pb-1">
        🔒 TK333 VIP Secure Admin Console • Protected by 256-bit Encryption
      </div>
    </div>
  );
}
