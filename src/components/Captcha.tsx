import React, { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  AlertCircle,
  ShieldCheck,
  Coins
} from 'lucide-react';
import { format, addHours, isAfter, formatDistanceToNow } from 'date-fns';

interface CaptchaProps {
  userData: UserData | null;
}

export default function Captcha({ userData }: CaptchaProps) {
  const [step, setStep] = useState(1);
  const [currentCaptcha, setCurrentCaptcha] = useState('');
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [reward, setReward] = useState(0);

  const generateCaptcha = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCurrentCaptcha(result);
    setUserInput('');
  }, []);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const isInvalid = userData?.captchaInvalidUntil && isAfter(
    typeof userData.captchaInvalidUntil === 'string' ? new Date(userData.captchaInvalidUntil) : (userData.captchaInvalidUntil as any).toDate(), 
    new Date()
  );

  const isAlreadyClaimed = userData?.lastCaptchaDate && !isAfter(new Date(), addHours(new Date(userData.lastCaptchaDate), 24));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || isInvalid) return;
    setLoading(true);
    setError('');

    if (userInput.toUpperCase() !== currentCaptcha) {
      // Invalid for 24 hours
      const invalidUntil = addHours(new Date(), 24).toISOString();
      try {
        await updateDoc(doc(db, 'users', userData.uid), {
          captchaInvalidUntil: invalidUntil
        });
        setError('Incorrect captcha! You are blocked for 24 hours.');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userData.uid}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step < 3) {
      setStep(step + 1);
      generateCaptcha();
      setLoading(false);
    } else {
      // Final step completed
      const randomReward = Math.floor(Math.random() * 46) + 5; // 5 to 50
      setReward(randomReward);
      try {
        await updateDoc(doc(db, 'users', userData.uid), {
          balance: increment(randomReward),
          lastCaptchaDate: new Date().toISOString()
        });
        setSuccess(true);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userData.uid}`);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!userData) return null;

  if (isInvalid) {
    const blockUntil = typeof userData.captchaInvalidUntil === 'string' ? new Date(userData.captchaInvalidUntil) : (userData.captchaInvalidUntil as any).toDate();
    return (
      <div className="max-w-md mx-auto bg-white p-10 rounded-[40px] border border-red-100 shadow-2xl shadow-red-50 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-6">
          <Clock size={40} />
        </div>
        <h3 className="text-2xl font-black text-red-900 mb-4">Access Denied</h3>
        <p className="text-gray-500 font-medium mb-8">
          You entered an incorrect captcha. Your account is temporarily blocked from this activity for 24 hours.
        </p>
        <div className="p-4 bg-red-50 rounded-2xl text-red-600 font-bold text-sm">
          Available in: {formatDistanceToNow(blockUntil)}
        </div>
      </div>
    );
  }

  if (isAlreadyClaimed) {
    const nextAvailable = addHours(new Date(userData.lastCaptchaDate!), 24);
    return (
      <div className="max-w-md mx-auto bg-white p-10 rounded-[40px] border border-blue-100 shadow-2xl shadow-blue-50 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-2xl font-black text-blue-900 mb-4">Challenge Completed</h3>
        <p className="text-gray-500 font-medium mb-8">
          You have already completed your daily captcha challenge. Please come back later.
        </p>
        <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 font-bold text-sm">
          Next challenge in: {formatDistanceToNow(nextAvailable)}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-white p-10 rounded-[40px] border border-green-100 shadow-2xl shadow-green-50 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center text-green-600 mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-2xl font-black text-green-900 mb-2">Congratulations!</h3>
        <p className="text-gray-500 font-medium mb-8">You have successfully completed all captchas.</p>
        <div className="bg-green-50 p-6 rounded-3xl mb-8">
          <p className="text-green-600 text-xs font-black uppercase tracking-widest mb-1">Reward Added</p>
          <h4 className="text-4xl font-black text-green-900">৳{reward}</h4>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 transition-all"
        >
          BACK TO HOME
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-blue-900 mb-2 flex items-center justify-center gap-3">
          <Gamepad2 className="text-blue-600" />
          Captcha Challenge
        </h2>
        <p className="text-gray-500 text-sm font-medium">Complete 3 captchas to earn up to ৳15</p>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-100">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-2 w-8 rounded-full transition-all ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-100'
                }`}
              ></div>
            ))}
          </div>
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Step {step} of 3</span>
        </div>

        <div className="bg-gray-50 p-8 rounded-3xl mb-8 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-4xl font-black tracking-[0.5em] text-blue-900 select-none italic transform -skew-x-12">
              {currentCaptcha}
            </span>
            <button 
              onClick={generateCaptcha}
              className="mt-4 p-2 text-blue-400 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-bold"
            >
              <RefreshCw size={14} />
              Regenerate
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Enter Captcha</label>
            <input 
              type="text"
              placeholder="Type the characters above"
              required
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center text-xl font-black uppercase tracking-widest"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || !userInput}
            className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{step === 3 ? 'FINISH & CLAIM' : 'NEXT CAPTCHA'}</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-gray-400">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <ShieldCheck size={14} className="text-green-500" />
            Secure Verification
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <Coins size={14} className="text-yellow-500" />
            Instant Reward
          </div>
        </div>
      </div>
    </div>
  );
}
