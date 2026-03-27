import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserData } from '../types';
import { motion } from 'framer-motion';
import { Gift, CheckCircle2, Star, Sparkles, Trophy, ArrowRight, Clock, XCircle, RotateCw, RefreshCw } from 'lucide-react';
import { addHours, isAfter, formatDistanceToNow } from 'date-fns';

interface BonusProps {
  userData: UserData | null;
}

export default function Bonus({ userData }: BonusProps) {
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState(generateCaptcha());
  const [captchaClaiming, setCaptchaClaiming] = useState(false);
  const [captchaError, setCaptchaError] = useState('');

  function generateCaptcha() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);

  const spinOptions = [
    { label: '৳5', weight: 40, value: 5, type: 'money' },
    { label: '৳15', weight: 20, value: 15, type: 'money' },
    { label: '৳500', weight: 1, value: 500, type: 'money' },
    { label: '5 SPINS', weight: 10, value: 5, type: 'spins' },
    { label: '10 SPINS', weight: 5, value: 10, type: 'spins' },
    { label: 'TRY AGAIN', weight: 24, value: 0, type: 'none' }
  ];

  const handleSpin = async () => {
    if (!userData || spinning) return;
    
    const lastSpin = userData.lastSpinDate ? new Date(userData.lastSpinDate) : null;
    const canSpin = !lastSpin || isAfter(new Date(), addHours(lastSpin, 24));
    
    if (!canSpin && (userData.freeSpins || 0) <= 0) {
      alert('Next free spin available in ' + formatDistanceToNow(addHours(lastSpin!, 24)));
      return;
    }

    setSpinning(true);
    setSpinResult(null);

    // Weighted random selection
    const totalWeight = spinOptions.reduce((acc, opt) => acc + opt.weight, 0);
    let random = Math.random() * totalWeight;
    let selected = spinOptions[spinOptions.length - 1];
    
    for (const opt of spinOptions) {
      if (random < opt.weight) {
        selected = opt;
        break;
      }
      random -= opt.weight;
    }

    // Simulate spin animation
    setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', userData.uid);
        const updates: any = {
          lastSpinDate: new Date().toISOString()
        };

        if (selected.type === 'money') {
          updates.balance = increment(selected.value);
        } else if (selected.type === 'spins') {
          updates.freeSpins = increment(selected.value);
        }

        if ((userData.freeSpins || 0) > 0 && !canSpin) {
          updates.freeSpins = increment(-1);
        }

        await updateDoc(userRef, updates);
        setSpinResult(selected.label);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userData.uid}`);
      } finally {
        setSpinning(false);
      }
    }, 3000);
  };

  const handleCaptchaClaim = async () => {
    if (!userData || !canClaimCaptcha) return;
    if (captchaInput.toUpperCase() !== captchaCode) {
      // Block for 24 hours if failed
      const invalidUntil = addHours(new Date(), 24).toISOString();
      try {
        await updateDoc(doc(db, 'users', userData.uid), {
          captchaInvalidUntil: invalidUntil
        });
        setCaptchaError('Incorrect captcha! You are blocked for 24 hours.');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userData.uid}`);
      }
      setCaptchaCode(generateCaptcha());
      setCaptchaInput('');
      return;
    }

    setCaptchaClaiming(true);
    setCaptchaError('');
    try {
      const userRef = doc(db, 'users', userData.uid);
      const bonusAmount = Math.floor(Math.random() * 50) + 10; // Random bonus between 10-60
      await updateDoc(userRef, {
        balance: increment(bonusAmount),
        lastCaptchaDate: new Date().toISOString()
      });
      alert(`Congratulations! You won ৳${bonusAmount} bonus!`);
      setCaptchaCode(generateCaptcha());
      setCaptchaInput('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userData.uid}`);
      setCaptchaError('Failed to claim bonus. Try again later.');
    } finally {
      setCaptchaClaiming(false);
    }
  };

  if (!userData) return null;

  // Welcome bonus is one-time only
  const canClaimWelcome = !userData.welcomeBonusClaimed;
  
  // Check if blocked or 24 hours passed since last captcha
  const isCaptchaBlocked = userData.captchaInvalidUntil && isAfter(new Date(userData.captchaInvalidUntil), new Date());
  const canClaimCaptcha = !isCaptchaBlocked && (!userData.lastCaptchaDate || isAfter(new Date(), addHours(new Date(userData.lastCaptchaDate), 24)));

  const nextCaptchaTime = userData.lastCaptchaDate ? addHours(new Date(userData.lastCaptchaDate), 24) : null;
  const blockUntil = userData.captchaInvalidUntil ? new Date(userData.captchaInvalidUntil) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-blue-900 mb-4 flex items-center justify-center gap-3">
          <Gift className="text-blue-600" size={40} />
          Bonus Center
        </h2>
        <p className="text-gray-500 font-medium">Claim your rewards and boost your balance!</p>
      </div>

      {/* Lucky Spin Section */}
      <section className="bg-white p-8 rounded-[40px] shadow-2xl shadow-amber-100 border border-amber-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <RotateCw className={`w-32 h-32 text-amber-500 ${spinning ? 'animate-spin' : ''}`} />
        </div>
        
        <div className="relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-xs font-black tracking-widest uppercase">
            <Sparkles size={14} />
            <span>Daily Lucky Spin</span>
          </div>
          
          <h2 className="text-3xl font-black text-gray-900">Win Up To ৳500!</h2>
          
          <div className="relative flex justify-center py-8">
            <div className={`w-48 h-48 rounded-full border-8 border-amber-500 flex items-center justify-center bg-amber-50 shadow-inner transition-transform duration-[3000ms] ease-out ${spinning ? 'rotate-[1080deg]' : ''}`}>
              {spinResult ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                  <p className="text-xs font-bold text-amber-600 uppercase">You Won</p>
                  <p className="text-2xl font-black text-gray-900">{spinResult}</p>
                </motion.div>
              ) : (
                <Trophy size={48} className="text-amber-500" />
              )}
            </div>
            {/* Pointer */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-8 bg-red-500 rounded-full shadow-lg z-20" />
          </div>

          <button 
            onClick={handleSpin}
            disabled={spinning}
            className="w-full py-5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 text-white font-black rounded-3xl shadow-xl shadow-amber-200 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {spinning ? (
              <RefreshCw className="animate-spin" />
            ) : (
              <>
                <RotateCw size={20} />
                <span>SPIN NOW ({userData.freeSpins || 0} FREE)</span>
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-400 font-medium">One free spin every 24 hours. Extra spins can be won!</p>
        </div>
      </section>

      {/* Captcha Bonus Card */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Trophy size={24} />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-black text-blue-900">Daily Captcha Bonus</h3>
              <p className="text-orange-600 font-bold text-xs">Complete captcha to earn ৳10-৳60</p>
            </div>
          </div>

          {!canClaimCaptcha ? (
            <div className="bg-gray-50 p-6 rounded-3xl text-center border border-gray-100">
              {isCaptchaBlocked ? (
                <>
                  <XCircle className="text-red-500 mx-auto mb-2" size={32} />
                  <p className="text-red-900 font-black">CAPTCHA BLOCKED</p>
                  <p className="text-red-400 text-xs font-bold">Try again in {blockUntil ? formatDistanceToNow(blockUntil) : '24h'}</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-green-500 mx-auto mb-2" size={32} />
                  <p className="text-gray-900 font-black">NEXT BONUS IN {nextCaptchaTime ? formatDistanceToNow(nextCaptchaTime) : '24H'}</p>
                  <p className="text-gray-400 text-xs font-bold">Come back later for more!</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-100 h-14 rounded-2xl flex items-center justify-center font-black text-2xl tracking-[0.5em] text-blue-900 select-none italic border-2 border-dashed border-gray-200">
                  {captchaCode}
                </div>
                <button 
                  onClick={() => setCaptchaCode(generateCaptcha())}
                  className="p-4 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-2xl transition-colors"
                >
                  <Sparkles size={20} />
                </button>
              </div>

              <input 
                type="text"
                placeholder="Enter Captcha Code"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center uppercase tracking-widest"
              />

              {captchaError && <p className="text-red-500 text-xs font-bold text-center">{captchaError}</p>}

              <button 
                onClick={handleCaptchaClaim}
                disabled={captchaClaiming || !captchaInput}
                className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {captchaClaiming ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>CLAIM CAPTCHA BONUS</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
