import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, isQuotaExceededError } from '../firebase';
import { safeGetDoc } from '../services/safeFirestore';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'motion/react';
import { UserPlus, LogIn, Phone, Mail, User as UserIcon, Lock, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface AuthProps {
  onSuccess: () => void;
  initialMode?: 'login' | 'signup';
}

export default function Auth({ onSuccess, initialMode = 'login' }: AuthProps) {
  const { lang, t } = useLanguage();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [contactType, setContactType] = useState<'email' | 'phone'>('phone');

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    haptics.selection();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        let inputVal = contact.trim();
        let targetEmail = inputVal;

        if (!inputVal.includes('@')) {
          const cleanUser = inputVal.toLowerCase();
          
          // 1. Try safe document lookup from cache/db
          try {
            const usernameDoc = await safeGetDoc(doc(db, 'usernames', cleanUser));
            if (usernameDoc.exists() && usernameDoc.data()?.email) {
              targetEmail = usernameDoc.data()!.email;
            } else {
              // Fallback to default user email domain
              targetEmail = `${cleanUser}@tk333.vip`;
            }
          } catch (lookupErr) {
            // If quota exceeded or network issue, fallback to synthetic email
            targetEmail = `${cleanUser}@tk333.vip`;
          }
        }

        // Attempt authentication
        try {
          await signInWithEmailAndPassword(auth, targetEmail, password);
        } catch (authErr: any) {
          // If failed and was username without @, try alternative fallback if possible
          if (!inputVal.includes('@') && targetEmail.endsWith('@tk333.vip')) {
            const cleanUser = inputVal.toLowerCase();
            // Also try plain email format if user registered with Gmail
            try {
              await signInWithEmailAndPassword(auth, `${cleanUser}@gmail.com`, password);
            } catch (err2) {
              // Throw user-friendly message
              throw new Error(
                lang === 'bn' 
                  ? 'ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়' 
                  : 'Invalid username or password'
              );
            }
          } else {
            if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
              throw new Error(lang === 'bn' ? 'ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়' : 'Invalid email/username or password');
            } else if (authErr.code === 'auth/too-many-requests') {
              throw new Error(lang === 'bn' ? 'অনেকবার ভুল চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' : 'Too many attempts. Please try again in a few moments.');
            }
            throw authErr;
          }
        }

        haptics.success();
        onSuccess();
      } else {
        if (password !== confirmPassword) {
          throw new Error(lang === 'bn' ? 'পাসওয়ার্ড দুটি মেলেনি' : 'Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
        }
        
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (cleanUsername.length < 3) {
          throw new Error(lang === 'bn' ? 'ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে' : 'Username must be at least 3 characters');
        }

        // Safe username check
        try {
          const usernameDoc = await safeGetDoc(doc(db, 'usernames', cleanUsername));
          if (usernameDoc.exists()) {
            throw new Error(lang === 'bn' ? 'এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে' : 'Username already taken');
          }
        } catch (uErr: any) {
          if (uErr.message?.includes('already taken') || uErr.message?.includes('ইতিমধ্যে ব্যবহৃত')) {
            throw uErr;
          }
          // If quota limit or offline, proceed with auth provider check
        }

        const email = contactType === 'email' && contact.includes('@') 
          ? contact.trim().toLowerCase() 
          : `${cleanUsername}@tk333.vip`;

        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            throw new Error(lang === 'bn' ? 'এই ইউজারনেম বা ইমেইল দিয়ে ইতিমধ্যে একাউন্ট খোলা আছে' : 'This username or email is already registered');
          }
          throw createErr;
        }

        const user = userCredential.user;
        await updateProfile(user, { displayName: name || cleanUsername });

        const userDataObj = {
          uid: user.uid,
          name: name || cleanUsername,
          username: cleanUsername,
          phone: contactType === 'phone' ? contact.trim() : '',
          email: user.email,
          balance: 10,
          welcomeBonusClaimed: true,
          lastDailyBonusAt: '',
          freeSpins: 0,
          role: email === 'mohammadabdulwazed1@gmail.com' ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        };

        // Cache user data locally immediately
        try {
          localStorage.setItem(`tk333_cached_user_${user.uid}`, JSON.stringify(userDataObj));
        } catch (lsErr) {}

        // Persist to firestore (graceful if quota limit)
        try {
          await setDoc(doc(db, 'users', user.uid), userDataObj);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`, true);
        }

        try {
          await setDoc(doc(db, 'usernames', cleanUsername), {
            email: user.email,
            uid: user.uid
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `usernames/${cleanUsername}`, true);
        }
        
        haptics.success();
        onSuccess();
      }
    } catch (err: any) {
      haptics.error();
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      haptics.selection();
      setLoading(true);
      setError('');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user) {
        throw new Error('Google Sign-In could not retrieve user profile');
      }

      // Check if user doc exists in database
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await safeGetDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const emailPrefix = (user.email?.split('@')[0] || `user_${Date.now().toString().slice(-4)}`)
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase();
        const generatedUsername = emailPrefix.length >= 3 ? emailPrefix : `user_${user.uid.slice(0, 5).toLowerCase()}`;
        const isAdminUser = user.email === 'mohammadabdulwazed1@gmail.com';

        const newProfile = {
          uid: user.uid,
          name: user.displayName || 'TK333 Member',
          username: generatedUsername,
          email: user.email,
          phone: user.phoneNumber || '',
          balance: 10,
          welcomeBonusClaimed: true,
          freeSpins: 0,
          role: isAdminUser ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        };

        try {
          localStorage.setItem(`tk333_cached_user_${user.uid}`, JSON.stringify(newProfile));
        } catch (lsE) {}

        try {
          await setDoc(userDocRef, newProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`, true);
        }

        try {
          await setDoc(doc(db, 'usernames', generatedUsername), {
            email: user.email,
            uid: user.uid
          });
        } catch (err) {
          // Non-blocking username mapping error
          console.warn('Username indexing note:', err);
        }
      }

      haptics.success();
      onSuccess();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      // Suppress noisy error message if user simply closed the popup
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError('');
      } else if (err.code === 'auth/popup-blocked') {
        setError(lang === 'bn' ? 'ব্রাউজার পপআপ ব্লক করেছে। অনুগ্রহ করে পপআপ অনুমোদন করুন।' : 'Popup was blocked by browser. Please allow popups.');
        haptics.error();
      } else if (err.code === 'auth/unauthorized-domain') {
        haptics.error();
        setError(
          lang === 'bn'
            ? 'এই ডোমেনটি Firebase Auth এ অনুমোদিত নয়। অনুগ্রহ করে ইউজারনেম ও পাসওয়ার্ড দিয়ে লগইন/রেজিস্ট্রেশন করুন।'
            : 'Domain unauthorized for Firebase Google Auth. Please login or register using your Username & Password.'
        );
      } else {
        haptics.error();
        setError(err.message || (lang === 'bn' ? 'Google সাইন-ইন সম্পন্ন করা সম্ভব হয়নি।' : 'Google Sign-In failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center p-0.5 mx-auto mb-3 shadow-xs">
          <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
            <span className="font-chakra font-black text-sm text-blue-700">TK</span>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-chakra">
          {isLogin ? (lang === 'bn' ? 'অ্যাকাউন্টে লগইন করুন' : 'Welcome Back') : (lang === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create Free Account')}
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          {isLogin 
            ? (lang === 'bn' ? 'আপনার ইউজারনেম ও পাসওয়ার্ড দিন' : 'Login to manage wallet and play instantly') 
            : (lang === 'bn' ? 'রেজিস্ট্রেশন করলেই পাচ্ছেন তাৎক্ষণিক ৳১০ ফ্রি বোনাস!' : 'Register and receive ৳10 instant welcome bonus!')}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-600 text-xs font-medium">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {!isLogin && (
          <>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={lang === 'bn' ? 'আপনার পুরো নাম' : 'Full Name'}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 text-xs focus:border-blue-600 focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={lang === 'bn' ? 'ইউজারনেম (e.g. sakib77)' : 'Username'}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 text-xs focus:border-blue-600 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Contact Type Switch */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setContactType('phone'); setContact(''); }}
                className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${contactType === 'phone' ? 'bg-white text-blue-700 font-black shadow-xs' : 'text-slate-500'}`}
              >
                {lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
              </button>
              <button
                type="button"
                onClick={() => { setContactType('email'); setContact(''); }}
                className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${contactType === 'email' ? 'bg-white text-blue-700 font-black shadow-xs' : 'text-slate-500'}`}
              >
                {lang === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
              </button>
            </div>
          </>
        )}

        <div className="relative">
          {isLogin ? (
            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          ) : (
            contactType === 'phone' ? (
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            ) : (
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            )
          )}
          <input
            type={!isLogin && contactType === 'phone' ? "tel" : "text"}
            placeholder={
              isLogin 
                ? (lang === 'bn' ? 'ইউজারনেম অথবা ইমেইল' : 'Username or Email') 
                : (contactType === 'phone' ? (lang === 'bn' ? 'মোবাইল নম্বর (01XXXXXXXXX)' : 'Phone Number') : 'Email Address')
            }
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 text-xs focus:border-blue-600 focus:bg-white outline-none transition-all"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder={lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 text-xs focus:border-blue-600 focus:bg-white outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {!isLogin && (
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder={lang === 'bn' ? 'কনফার্ম পাসওয়ার্ড' : 'Confirm Password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 text-xs focus:border-blue-600 focus:bg-white outline-none transition-all"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-chakra font-black rounded-2xl shadow-sm hover:from-blue-500 hover:to-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
              <span>{isLogin ? (lang === 'bn' ? 'লগইন করুন' : 'LOGIN') : (lang === 'bn' ? 'রেজিস্টার করুন' : 'REGISTER')}</span>
            </>
          )}
        </button>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl border border-slate-300 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs shadow-xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z" />
            <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z" />
          </svg>
          <span>{lang === 'bn' ? 'Google দিয়ে প্রবেশ করুন' : 'Sign in with Google'}</span>
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        {isLogin ? (lang === 'bn' ? 'কোনো অ্যাকাউন্ট নেই?' : "Don't have an account?") : (lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : "Already have an account?")}{' '}
        <button
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="text-blue-600 font-bold hover:underline ml-1"
        >
          {isLogin ? (lang === 'bn' ? 'রেজিস্টার' : 'Sign Up') : (lang === 'bn' ? 'লগইন' : 'Login')}
        </button>
      </div>
    </div>
  );
}
