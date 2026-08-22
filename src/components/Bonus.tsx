import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserData } from '../types';
import { toBengaliNumber } from '../utils';
import { motion } from 'motion/react';
import { Star, Sparkles, RotateCw, RefreshCw } from 'lucide-react';
import { addHours, isAfter, formatDistanceToNow } from 'date-fns';
import { haptics } from '../utils/haptics';

interface BonusProps {
  userData: UserData | null;
}

export default function FreeSpin({ userData }: BonusProps) {
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);

  const spinOptions = [
    { label: '৳৫', weight: 30, value: 5, type: 'money', color: '#FFD700', textColor: '#000' },
    { label: '৳১', weight: 40, value: 1, type: 'money', color: '#C0C0C0', textColor: '#000' },
    { label: '৳১০', weight: 10, value: 10, type: 'money', color: '#FF4500', textColor: '#fff' },
    { label: '৳২', weight: 10, value: 2, type: 'money', color: '#32CD32', textColor: '#fff' },
    { label: 'বোমা (ব্যর্থ)', weight: 10, value: 0, type: 'none', color: '#000000', textColor: '#fff' },
    { label: '৳১', weight: 30, value: 1, type: 'money', color: '#C0C0C0', textColor: '#000' },
  ];

  const [rotation, setRotation] = useState(0);

  const handleSpin = async () => {
    if (!userData || spinning) return;
    
    const lastSpin = userData.lastSpinDate ? new Date(userData.lastSpinDate) : null;
    const canSpin = !lastSpin || isAfter(new Date(), addHours(lastSpin, 24));
    
    if (!canSpin) {
      haptics.error();
      alert('Next free spin available in ' + formatDistanceToNow(addHours(lastSpin!, 24)));
      return;
    }

    haptics.medium();
    setSpinning(true);
    setSpinResult(null);

    // Weighted random selection
    const totalWeight = spinOptions.reduce((acc, opt) => acc + opt.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedIndex = spinOptions.length - 1;
    
    for (let i = 0; i < spinOptions.length; i++) {
      if (random < spinOptions[i].weight) {
        selectedIndex = i;
        break;
      }
      random -= spinOptions[i].weight;
    }

    const selected = spinOptions[selectedIndex];
    const segmentAngle = 360 / spinOptions.length;
    const extraRotations = 5 * 360;
    const targetRotation = rotation + extraRotations + (360 - (selectedIndex * segmentAngle)) - (rotation % 360);
    
    setRotation(targetRotation);

    // Wait for animation to finish
    setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', userData.uid);
        const updates: any = {
          lastSpinDate: new Date().toISOString()
        };

        if (selected.type === 'money') {
          updates.balance = increment(selected.value);
          haptics.win();
        } else {
          haptics.error();
        }

        await updateDoc(userRef, updates);
        setSpinResult(selected.label);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userData.uid}`);
      } finally {
        setSpinning(false);
      }
    }, 4000);
  };

  if (!userData) return null;

  const lastSpin = userData.lastSpinDate ? new Date(userData.lastSpinDate) : null;
  const canSpin = !lastSpin || isAfter(new Date(), addHours(lastSpin, 24));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-blue-900 mb-4 flex items-center justify-center gap-3">
          <RotateCw className="text-blue-600" size={40} />
          Free Spin
        </h2>
        <p className="text-gray-500 font-medium">Spin the wheel and win exciting rewards!</p>
      </div>

      {/* Bonus Wheel Section */}
      <section className="bg-white p-8 rounded-[40px] shadow-2xl shadow-amber-100 border border-amber-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <RotateCw className={`w-32 h-32 text-amber-500 ${spinning ? 'animate-spin' : ''}`} />
        </div>
        
        <div className="relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-xs font-black tracking-widest uppercase">
            <Sparkles size={14} />
            <span>Daily Bonus Wheel</span>
          </div>
          
          <h2 className="text-3xl font-black text-gray-900">আপনার ভাগ্য পরীক্ষা করুন!</h2>
          
          <div className="relative flex justify-center py-12">
            {/* Wheel Container */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80">
              {/* Circus Lights (Outer Ring) */}
              <div className="absolute -inset-4 rounded-full border-[12px] border-amber-600 shadow-2xl z-10">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i}
                    className={`absolute w-3 h-3 rounded-full bg-yellow-200 shadow-[0_0_10px_#fff] animate-pulse`}
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${i * 30}deg) translate(0, -155px)`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>

              {/* The Wheel */}
              <motion.div 
                animate={{ rotate: rotation }}
                transition={{ duration: 4, ease: [0.45, 0.05, 0.55, 0.95] }}
                className="w-full h-full rounded-full overflow-hidden shadow-2xl relative border-4 border-amber-700"
                style={{
                  background: `conic-gradient(${spinOptions.map((opt, i) => `${opt.color} ${i * 60}deg ${(i + 1) * 60}deg`).join(', ')})`
                }}
              >
                {spinOptions.map((opt, i) => (
                  <div 
                    key={i}
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex flex-col items-center pt-6"
                    style={{ 
                      transform: `rotate(${i * 60 + 30}deg)`,
                      color: opt.textColor
                    }}
                  >
                    <span className="text-sm font-black whitespace-nowrap tracking-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      {opt.label}
                    </span>
                  </div>
                ))}
                {/* Center Cap */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-amber-800 rounded-full border-4 border-amber-400 shadow-xl z-20 flex items-center justify-center">
                  <Star className="text-yellow-400 fill-yellow-400" size={20} />
                </div>
              </motion.div>

              {/* Pointer */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30">
                <div 
                  className="w-8 h-10 bg-red-600 shadow-lg flex items-center justify-center pt-1"
                  style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-ping mb-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {spinResult && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-green-50 border-2 border-green-200 p-4 rounded-2xl"
              >
                <p className="text-green-600 font-bold uppercase text-xs tracking-widest">অভিনন্দন! আপনি জিতেছেন</p>
                <p className="text-3xl font-black text-green-700">{spinResult}</p>
              </motion.div>
            )}

            <button 
              onClick={handleSpin}
              disabled={spinning || !canSpin}
              className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-black rounded-3xl shadow-xl shadow-amber-200 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
            >
              {spinning ? (
                <RefreshCw className="animate-spin" />
              ) : (
                <>
                  <RotateCw size={24} />
                  <span>
                    {!canSpin ? `পরবর্তী স্পিন: ${formatDistanceToNow(addHours(lastSpin!, 24))}` : 'চাকা ঘুরান'}
                  </span>
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">প্রতি ২৪ ঘণ্টায় একটি ফ্রি স্পিন। আরও স্পিন জিতুন!</p>
          </div>
        </div>
      </section>
    </div>
  );
}
