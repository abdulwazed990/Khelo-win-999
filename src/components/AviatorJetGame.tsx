import React, { useState, useEffect, useRef } from 'react';
import { X, History, Minus, Plus, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../utils/haptics';
import { broadcastLiveGameRound, generateRoundId, subscribeToRoundsHistory } from '../services/aviatorSignalService';

interface AviatorJetGameProps {
  user: any;
  userData: any;
  onBack: () => void;
}

interface BetState {
  amount: number;
  isPlaced: boolean;
  isCashedOut: boolean;
  payout: number;
  autoCashOut: number | null;
  isAutoBet: boolean;
  isAutoCashOut: boolean;
}

const PLANE_IMAGE_URL = "https://static.vecteezy.com/system/resources/previews/050/024/396/non_2x/3d-cartoon-happy-blue-and-yellow-jet-fighter-military-machine-illustration-for-children-vector.jpg";

export default function AviatorJetGame({ user, userData, onBack }: AviatorJetGameProps) {
  const [balance, setBalance] = useState(3000);
  const [gameState, setGameState] = useState<"WAITING" | "IN_FLIGHT" | "CRASHED">("WAITING");
  const [multiplier, setMultiplier] = useState(1);
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState([1.24, 4.56, 1.02, 12.45, 2.33, 1.88, 5.4]);
  const [cashoutPopup, setCashoutPopup] = useState<{amount: number, mult: number} | null>(null);
  const [shake, setShake] = useState(false);
  const [pulse, setPulse] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const [bet1, setBet1] = useState<BetState>({
    amount: 10, isPlaced: false, isCashedOut: false, payout: 0, autoCashOut: 2, isAutoBet: false, isAutoCashOut: false
  });
  const [bet2, setBet2] = useState<BetState>({
    amount: 10, isPlaced: false, isCashedOut: false, payout: 0, autoCashOut: 2, isAutoBet: false, isAutoCashOut: false
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const starsRef = useRef<any[]>([]);
  const startTimeRef = useRef(0);
  const crashMultRef = useRef(1);
  const crashTimeRef = useRef(0);
  const isCrashedRef = useRef(false);
  const planeImageRef = useRef<HTMLImageElement | null>(null);
  const offsetRef = useRef(0);
  const bet1CashedOutRef = useRef(false);
  const bet2CashedOutRef = useRef(false);
  const bet1Ref = useRef(bet1);
  const bet2Ref = useRef(bet2);

  useEffect(() => { bet1Ref.current = bet1; }, [bet1]);
  useEffect(() => { bet2Ref.current = bet2; }, [bet2]);

  useEffect(() => {
    const img = new Image();
    img.src = PLANE_IMAGE_URL;
    img.onload = () => { planeImageRef.current = img; };
    img.onerror = () => { console.error("Failed to load plane image."); };
  }, []);

  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const flySoundRef = useRef<HTMLAudioElement | null>(null);
  const crashSoundRef = useRef<HTMLAudioElement | null>(null);
  const cashOutSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Background Music - Light, atmospheric, and looping
    bgMusicRef.current = new Audio("https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3");
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.15;

    // Flying Sound - Smooth jet engine loop
    flySoundRef.current = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-jet-engine-loop-2564.mp3");
    flySoundRef.current.loop = true;
    flySoundRef.current.volume = 0.15;

    // Crash Sound - Professional impact explosion with reverb
    crashSoundRef.current = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-impact-explosion-with-hi-fi-reverb-2405.mp3");
    crashSoundRef.current.volume = 0.5;

    // Cash Out Sound - Success chime
    cashOutSoundRef.current = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-winning-chime-2029.mp3");
    cashOutSoundRef.current.volume = 0.4;

    const unlock = () => {
      setAudioUnlocked(true);
      if (bgMusicRef.current && !isMuted) {
        bgMusicRef.current.play().catch(() => {});
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);

    return () => {
      bgMusicRef.current?.pause();
      flySoundRef.current?.pause();
      crashSoundRef.current?.pause();
      cashOutSoundRef.current?.pause();
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  useEffect(() => {
    if (!audioUnlocked) return;

    if (isMuted) {
      bgMusicRef.current?.pause();
      flySoundRef.current?.pause();
      return;
    }

    // Background music should play continuously
    bgMusicRef.current?.play().catch(() => {});

    if (gameState === "WAITING") {
      if (flySoundRef.current) {
        flySoundRef.current.pause();
        flySoundRef.current.currentTime = 0;
      }
    } else if (gameState === "IN_FLIGHT") {
      flySoundRef.current?.play().catch(() => {});
    } else if (gameState === "CRASHED") {
      flySoundRef.current?.pause();
      crashSoundRef.current?.play().catch(() => {});
      
      // Briefly duck music on crash for impact
      if (bgMusicRef.current) bgMusicRef.current.volume = 0.05;
      setTimeout(() => {
        if (bgMusicRef.current && !isMuted) bgMusicRef.current.volume = 0.15;
      }, 2000);
    }
  }, [gameState, isMuted, audioUnlocked]);

  // Adjust flying sound pitch based on multiplier for "high experience"
  useEffect(() => {
    if (gameState === "IN_FLIGHT" && flySoundRef.current && !isMuted) {
      // Increase playback rate slightly as multiplier goes up
      const rate = Math.min(1 + (multiplier - 1) * 0.05, 2);
      flySoundRef.current.playbackRate = rate;
      // Also slightly increase volume
      flySoundRef.current.volume = Math.min(0.2 + (multiplier - 1) * 0.02, 0.5);
    }
  }, [multiplier, gameState]);

  useEffect(() => {
    if (gameState === "IN_FLIGHT") {
      const interval = setInterval(() => {
        setPulse(p => p === 1 ? 1.05 : 1);
      }, Math.max(100, 500 / multiplier));
      return () => clearInterval(interval);
    } else {
      setPulse(1);
    }
  }, [gameState, multiplier]);

  const currentRoundIdRef = useRef(generateRoundId());

  const generateCrashMult = () => {
    // 60% comfortable win flights (>= 2.1x to 15.0x)
    const isWin = Math.random() < 0.60;
    if (isWin) {
      return parseFloat((2.1 + Math.random() * 8.5).toFixed(2));
    }
    return parseFloat((1.15 + Math.random() * 0.75).toFixed(2));
  };

  // Subscribe to real-time round history from database
  useEffect(() => {
    const unsub = subscribeToRoundsHistory((rounds) => {
      if (rounds && rounds.length > 0) {
        const mults = rounds.map(r => r.finalMultiplier || r.currentMultiplier || 1.0).filter(m => m > 0);
        if (mults.length > 0) {
          setHistory(mults.slice(0, 15));
        }
      }
    });
    return unsub;
  }, []);

  // Initialize initial round state on component mount
  useEffect(() => {
    const initCrashMult = generateCrashMult();
    crashMultRef.current = initCrashMult;
    const now = Date.now();
    const endsAt = now + 5000;

    broadcastLiveGameRound({
      roundId: currentRoundIdRef.current,
      status: 'WAITING_FOR_ROUND',
      currentMultiplier: 1.0,
      finalMultiplier: initCrashMult,
      predictedMultiplier: initCrashMult,
      serverSignalStatus: 'SERVER_VERIFIED',
      serverSignature: `sig_sha256_${currentRoundIdRef.current}_${initCrashMult}`,
      countdown: 5,
      countdownStart: now,
      countdownEndsAt: endsAt,
      serverTimestamp: now
    }).catch(() => {});
  }, []);

  const startFlight = () => {
    // Authoritative Server Rule: Uses EXACT crashMultRef determined before 5-second countdown
    isCrashedRef.current = false;
    crashTimeRef.current = 0;
    bet1CashedOutRef.current = false;
    bet2CashedOutRef.current = false;
    setGameState("IN_FLIGHT");
    setMultiplier(1);
    startTimeRef.current = Date.now();
    setCountdown(0);

    // Broadcast flight start with the exact authoritative multiplier and roundId
    broadcastLiveGameRound({
      roundId: currentRoundIdRef.current,
      status: 'ROUND_RUNNING',
      currentMultiplier: 1.0,
      finalMultiplier: crashMultRef.current,
      predictedMultiplier: crashMultRef.current,
      serverSignalStatus: 'SERVER_VERIFIED',
      serverSignature: `sig_sha256_${currentRoundIdRef.current}_${crashMultRef.current}`,
      startTime: new Date().toISOString(),
      serverTimestamp: Date.now()
    }).catch(() => {});
  };

  const resetGame = () => {
    // Pre-determine authoritative round ID and crash multiplier BEFORE the 5-second countdown
    const nextRoundId = generateRoundId();
    const nextCrashMult = generateCrashMult();
    currentRoundIdRef.current = nextRoundId;
    crashMultRef.current = nextCrashMult;
    
    const now = Date.now();
    const endsAt = now + 5000;

    setGameState("WAITING");
    setCountdown(5);
    setMultiplier(1);
    bet1CashedOutRef.current = false;
    bet2CashedOutRef.current = false;

    // Broadcast pre-round authoritative signal to connected Signal Apps
    broadcastLiveGameRound({
      roundId: nextRoundId,
      status: 'WAITING_FOR_ROUND',
      currentMultiplier: 1.0,
      finalMultiplier: nextCrashMult,
      predictedMultiplier: nextCrashMult,
      serverSignalStatus: 'SERVER_VERIFIED',
      serverSignature: `sig_sha256_${nextRoundId}_${nextCrashMult}`,
      countdown: 5,
      countdownStart: now,
      countdownEndsAt: endsAt,
      serverTimestamp: now
    }).catch(() => {});

    if (bet1.isAutoBet && balance >= bet1.amount) {
      setBalance(b => b - bet1.amount);
      setBet1(b => ({ ...b, isPlaced: true, isCashedOut: false, payout: 0 }));
    } else {
      setBet1(b => ({ ...b, isPlaced: false, isCashedOut: false, payout: 0 }));
    }

    if (bet2.isAutoBet && balance >= bet2.amount) {
      setBalance(b => b - bet2.amount);
      setBet2(b => ({ ...b, isPlaced: true, isCashedOut: false, payout: 0 }));
    } else {
      setBet2(b => ({ ...b, isPlaced: false, isCashedOut: false, payout: 0 }));
    }
  };

  useEffect(() => {
    let reqId: number;
    if (gameState === "IN_FLIGHT") {
      const loop = () => {
        if (gameState !== "IN_FLIGHT") return;
        const q = (Date.now() - startTimeRef.current) / 1000;
        const X = Math.pow(Math.E, 0.12 * q);

        if (X >= crashMultRef.current && !isCrashedRef.current) {
          isCrashedRef.current = true;
          crashTimeRef.current = Date.now();
          setGameState("CRASHED");
          setMultiplier(crashMultRef.current);
          setHistory(it => [parseFloat(crashMultRef.current.toFixed(2)), ...it].slice(0, 15));
          setShake(true);
          haptics.heavy();

          // Broadcast authoritative crash result
          broadcastLiveGameRound({
            roundId: currentRoundIdRef.current,
            status: 'ROUND_FINISHED',
            currentMultiplier: crashMultRef.current,
            finalMultiplier: crashMultRef.current,
            predictedMultiplier: crashMultRef.current,
            serverSignalStatus: 'SERVER_VERIFIED',
            serverSignature: `sig_sha256_${currentRoundIdRef.current}_${crashMultRef.current}`,
            crashTime: new Date().toISOString(),
            serverTimestamp: Date.now()
          }).catch(() => {});

          setTimeout(() => setShake(false), 500);
          setTimeout(resetGame, 3000);
          return;
        }

        setMultiplier(X);
        const et = bet1Ref.current;
        const at = bet2Ref.current;

        if (et.isPlaced && !bet1CashedOutRef.current && et.isAutoCashOut && et.autoCashOut && X >= et.autoCashOut) {
          cashOut(1, X);
        }
        if (at.isPlaced && !bet2CashedOutRef.current && at.isAutoCashOut && at.autoCashOut && X >= at.autoCashOut) {
          cashOut(2, X);
        }

        reqId = requestAnimationFrame(loop);
      };
      reqId = requestAnimationFrame(loop);
    }
    return () => { if (reqId) cancelAnimationFrame(reqId); };
  }, [gameState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "WAITING" && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(A => A <= 0.1 ? (startFlight(), 0) : parseFloat((A - 0.1).toFixed(1)));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameState, countdown]);

  const placeBet = (b: number) => {
    if (gameState !== "WAITING" || countdown <= 2) return;
    const A = b === 1 ? bet1 : bet2;
    if (balance < A.amount) {
      haptics.error();
      return;
    }
    haptics.medium();
    setBalance(q => q - A.amount);
    if (b === 1) setBet1(q => ({ ...q, isPlaced: true }));
    else setBet2(q => ({ ...q, isPlaced: true }));
  };

  const cashOut = (b: number, A?: number) => {
    if (gameState !== "IN_FLIGHT") return;
    const q = A || multiplier;
    const X = b === 1 ? bet1CashedOutRef : bet2CashedOutRef;
    const et = b === 1 ? bet1Ref.current : bet2Ref.current;
    const at = b === 1 ? setBet1 : setBet2;

    if (X.current || !et.isPlaced || et.isCashedOut) return;
    X.current = true;
    haptics.win();
    if (!isMuted) cashOutSoundRef.current?.play().catch(() => {});
    const it = et.amount * q;
    setBalance(Mt => Mt + it);
    setCashoutPopup({ amount: it, mult: q });
    at(Mt => ({ ...Mt, isCashedOut: true, payout: it }));
    setTimeout(() => setCashoutPopup(null), 3000);
  };

  useEffect(() => {
    const b = canvasRef.current;
    if (!b) return;
    const A = b.getContext("2d");
    if (!A) return;

    if (starsRef.current.length === 0) {
      starsRef.current = Array.from({ length: 8 }, () => ({
        x: Math.random() * b.width,
        y: Math.random() * b.height * 0.8,
        scale: 0.5 + Math.random() * 1.5,
        speed: 0.2 + Math.random() * 0.5
      }));
    }

    let reqId: number;
    const X: any[] = [];

    const drawCloud = (it: CanvasRenderingContext2D, Mt: number, _t: number, Tt: number) => {
      it.save();
      it.translate(Mt, _t);
      it.scale(Tt, Tt);
      it.fillStyle = "rgba(255, 255, 255, 0.4)";
      it.beginPath();
      it.arc(0, 0, 20, 0, Math.PI * 2);
      it.arc(15, -10, 25, 0, Math.PI * 2);
      it.arc(35, 0, 20, 0, Math.PI * 2);
      it.arc(15, 10, 20, 0, Math.PI * 2);
      it.fill();
      it.restore();
    };

    const render = () => {
      const it = b.width;
      const Mt = b.height;
      
      // Crisp sky gradient background
      const _t = A.createLinearGradient(0, 0, 0, Mt);
      _t.addColorStop(0, "#0ea5e9");
      _t.addColorStop(1, "#38bdf8");
      A.fillStyle = _t;
      A.fillRect(0, 0, it, Mt);

      A.save();
      if (shake) {
        A.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      }

      starsRef.current.forEach(Tt => {
        drawCloud(A, Tt.x, Tt.y, Tt.scale);
        if (gameState === "IN_FLIGHT") {
          Tt.x -= Tt.speed * (multiplier * 2);
          if (Tt.x < -100) {
            Tt.x = it + 100;
            Tt.y = Math.random() * Mt * 0.8;
          }
        }
      });

      if (gameState === "IN_FLIGHT") {
        offsetRef.current = (offsetRef.current + 2 * multiplier) % 50;
      }

      A.strokeStyle = "rgba(255, 255, 255, 0.08)";
      A.lineWidth = 1;
      for (let Tt = -offsetRef.current; Tt < it + 50; Tt += 50) {
        A.beginPath(); A.moveTo(Tt, 0); A.lineTo(Tt, Mt); A.stroke();
      }
      for (let Tt = offsetRef.current; Tt < Mt + 50; Tt += 50) {
        A.beginPath(); A.moveTo(0, Tt); A.lineTo(it, Tt); A.stroke();
      }

      if (gameState === "IN_FLIGHT" || gameState === "CRASHED") {
        const Tt = (Date.now() - startTimeRef.current) / 1000;
        const sn = Math.min(Tt / 3.5, 1);
        const _l = it * 0.75;
        const un = Mt * 0.4;

        let Fe = 50 + (_l - 50) * sn;
        let Pe = Mt - 50 - (Mt - 50 - un) * Math.pow(sn, 2.2);

        if (sn >= 1) {
          Fe += Math.sin(Tt * 1.2) * 15;
          Pe += Math.cos(Tt * 1.5) * 15;
        }

        if (gameState === "IN_FLIGHT") {
          X.push({ x: Fe, y: Pe });
          if (X.length > 50) X.shift();
        }

        if (X.length > 1) {
          A.beginPath();
          A.strokeStyle = "rgba(225, 29, 72, 0.4)";
          A.lineWidth = 3;
          A.moveTo(X[0].x, X[0].y);
          for (let bt = 1; bt < X.length; bt++) A.lineTo(X[bt].x, X[bt].y);
          A.stroke();
        }

        const xi = sn < 1 ? -Math.PI / 12 - Math.PI / 10 * Math.pow(sn, 1.5) : -Math.PI / 20 + Math.sin(Tt) * 0.03;

        if (gameState === "IN_FLIGHT") {
          const bt = xi;
          const Kt = Fe - Math.cos(bt) * 50;
          const on = Pe - Math.sin(bt) * 50;
          particlesRef.current.push({ x: Kt, y: on, size: 2 + Math.random() * 4, life: 1, type: "exhaust" });
        } else if (gameState === "CRASHED" && (Date.now() - crashTimeRef.current) / 1000 < 1.5) {
          for (let Kt = 0; Kt < 8; Kt++) {
            particlesRef.current.push({ x: Fe + (Math.random() - 0.5) * 40, y: Pe + (Math.random() - 0.5) * 40, size: 6 + Math.random() * 14, life: 1, type: Math.random() > 0.4 ? "fire" : "smoke" });
          }
        }

        particlesRef.current.forEach((bt, Kt) => {
          if (bt.type === "exhaust") A.fillStyle = `rgba(255, 255, 255, ${bt.life * 0.4})`;
          else if (bt.type === "fire") {
            A.shadowBlur = 12;
            A.shadowColor = "rgba(249, 115, 22, 0.8)";
            A.fillStyle = `rgba(249, 115, 22, ${bt.life})`;
          } else {
            A.shadowBlur = 0;
            A.fillStyle = `rgba(71, 85, 105, ${bt.life * 0.8})`;
          }

          A.beginPath();
          A.arc(bt.x, bt.y, bt.size, 0, Math.PI * 2);
          A.fill();
          A.shadowBlur = 0;

          if (bt.type === "exhaust") {
            bt.x -= 2 * multiplier;
          } else {
            bt.x += (Math.random() - 0.5) * 3;
            bt.y -= Math.random() * 1.5;
          }
          bt.life -= 0.02;
          if (bt.life <= 0) particlesRef.current.splice(Kt, 1);
        });

        // Draw plane if still in flight or immediately after crash
        const crashElapsed = gameState === "CRASHED" ? (Date.now() - crashTimeRef.current) / 1000 : 0;
        const showPlane = gameState === "IN_FLIGHT" || (gameState === "CRASHED" && crashElapsed <= 0.2);

        if (showPlane) {
          A.save();
          A.translate(Fe, Pe);

          if (gameState === "CRASHED") {
            A.rotate(xi);
            const Kt = 1 + crashElapsed * 2;
            A.scale(Kt, Kt);
            A.globalAlpha = Math.max(0, 1 - crashElapsed * 5);
          } else {
            A.rotate(xi);
          }

          if (planeImageRef.current && planeImageRef.current.complete) {
            A.save();
            A.scale(-1, 1);
            A.globalCompositeOperation = "multiply";
            A.drawImage(planeImageRef.current, -80, -60, 160, 120);
            A.restore();
          } else {
            A.save();
            const bt = A.createRadialGradient(-45, 0, 0, -45, 0, 20);
            bt.addColorStop(0, "#ff6600");
            bt.addColorStop(1, "transparent");
            A.fillStyle = bt;
            A.beginPath(); A.arc(-45, 0, 20, 0, Math.PI * 2); A.fill();

            const Kt = A.createLinearGradient(0, -15, 0, 15);
            Kt.addColorStop(0, "#f43f5e");
            Kt.addColorStop(1, "#9f1239");
            A.fillStyle = Kt;
            A.beginPath(); A.moveTo(-50, 0); A.quadraticCurveTo(-45, -15, 0, -15); A.lineTo(40, -5); A.quadraticCurveTo(55, 0, 40, 5); A.lineTo(0, 15); A.quadraticCurveTo(-45, 15, -50, 0); A.fill();

            A.fillStyle = "#e11d48";
            A.beginPath(); A.moveTo(-10, 0); A.lineTo(-35, -35); A.lineTo(-15, -35); A.lineTo(15, 0); A.closePath(); A.fill();
            A.beginPath(); A.moveTo(-10, 0); A.lineTo(-35, 35); A.lineTo(-15, 35); A.lineTo(15, 0); A.closePath(); A.fill();

            A.fillStyle = "#be123c";
            A.beginPath(); A.moveTo(-35, 0); A.lineTo(-55, -25); A.lineTo(-40, -25); A.lineTo(-25, 0); A.closePath(); A.fill();

            const on = A.createLinearGradient(0, -10, 0, 0);
            on.addColorStop(0, "#bae6fd");
            on.addColorStop(1, "#0ea5e9");
            A.fillStyle = on;
            A.beginPath(); A.ellipse(20, -4, 15, 7, 0, 0, Math.PI * 2); A.fill();
            A.restore();
          }
          A.restore();
        }
      }
      A.restore();
      reqId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(reqId);
  }, [gameState, multiplier, shake]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] text-white font-sans selection:bg-rose-500/30 overflow-hidden flex flex-col">
      {/* Audio Unlock Overlay */}
      <AnimatePresence>
        {!audioUnlocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer"
            onClick={() => {
              setAudioUnlocked(true);
              if (bgMusicRef.current && !isMuted) {
                bgMusicRef.current.play().catch(() => {});
              }
            }}
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-rose-500 p-6 rounded-full shadow-[0_0_50px_rgba(225,29,72,0.5)] mb-6"
            >
              <Volume2 size={48} className="text-white" />
            </motion.div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Aviator Jet</h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Tap to Start Game & Audio</p>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between px-4 py-2 bg-[#141414] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/10 shadow-xl"
          >
            <X size={20} />
          </button>
          <span className="font-black italic text-xl sm:text-2xl tracking-tighter text-rose-500 uppercase">Aviator</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/10"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="bg-[#000] px-3 sm:px-4 py-1 rounded-full border border-emerald-500/30 flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-sm sm:text-base tracking-tight">{balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-1 sm:p-2 gap-1 sm:gap-2 max-w-[1400px] mx-auto w-full overflow-hidden pb-4">
        <div className="hidden lg:flex flex-col w-72 bg-[#1b1b1b] rounded-xl border border-white/5 overflow-hidden">
          <div className="flex border-b border-white/5">
            {["All Bets", "My Bets"].map(b => (
              <button key={b} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider ${b === "All Bets" ? "text-rose-500 border-b-2 border-rose-500" : "text-gray-500"}`}>{b}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
            {Array.from({ length: 12 }).map((_, A) => (
              <div key={A} className="flex items-center justify-between text-[9px] bg-black/20 p-1.5 rounded border border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center text-[7px]">U</div>
                  <span className="text-gray-400">User_{Math.floor(Math.random() * 999)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-emerald-500 font-bold">1.45x</span>
                  <span className="text-emerald-400">145.00</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1 sm:gap-2 overflow-hidden">
          <div className="bg-[#141414] p-1.5 rounded-xl border border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <History className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            {history.map((b, A) => (
              <span key={A} className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${b > 2 ? "bg-violet-500/20 text-violet-400" : "bg-rose-500/20 text-rose-400"}`}>
                {b.toFixed(2)}x
              </span>
            ))}
          </div>

          <div className="relative flex-1 bg-sky-400 rounded-xl sm:rounded-2xl border border-sky-600/30 overflow-hidden min-h-0">
            <canvas ref={canvasRef} width={800} height={500} className="w-full h-full bg-sky-400" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-20 sm:pb-32">
              {gameState === "WAITING" ? (
                <div className="text-center">
                  <div className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">Next Round In</div>
                  <div className="text-4xl sm:text-6xl font-black italic text-white drop-shadow-2xl">{countdown.toFixed(1)}s</div>
                </div>
              ) : gameState === "CRASHED" ? (
                <div className="text-center animate-pulse">
                  <div className="text-rose-500 text-2xl sm:text-4xl font-black italic uppercase tracking-tighter mb-1 text-shadow-[0_0_20px_rgba(225,29,72,0.5)]">FLEW AWAY</div>
                  <div className="text-5xl sm:text-7xl font-black italic text-rose-500 drop-shadow-[0_0_30px_rgba(225,29,72,0.5)]">{multiplier.toFixed(2)}x</div>
                </div>
              ) : (
                <div className="text-center" style={{ transform: `scale(${pulse})`, transition: 'transform 0.1s ease-out' }}>
                  <div className="text-6xl sm:text-8xl font-black italic text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.2)]">{multiplier.toFixed(2)}x</div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {cashoutPopup && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="absolute top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.4)] flex flex-col items-center z-50"
                >
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80">You Cashed Out!</div>
                  <div className="text-2xl font-black italic">{cashoutPopup.mult.toFixed(2)}x</div>
                  <div className="text-sm font-bold mt-1">+{cashoutPopup.amount.toFixed(2)} USD</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-2 gap-1 sm:gap-2 shrink-0 pb-1 sm:pb-0">
            <BetPanel bet={bet1} setBet={setBet1} onPlace={() => placeBet(1)} onCashOut={() => cashOut(1)} gameState={gameState} countdown={countdown} multiplier={multiplier} quickAmounts={[100, 300, 700, 1000]} />
            <BetPanel bet={bet2} setBet={setBet2} onPlace={() => placeBet(2)} onCashOut={() => cashOut(2)} gameState={gameState} countdown={countdown} multiplier={multiplier} quickAmounts={[500, 1500, 2000, 2500, 5000]} />
          </div>
        </div>
      </main>
    </div>
  );
}

function BetPanel({ bet, setBet, onPlace, onCashOut, gameState, countdown, multiplier, quickAmounts }: any) {
  const canPlace = gameState === "WAITING" && countdown > 2;
  const isWaiting = gameState === "WAITING" && !bet.isPlaced && !canPlace;
  const canCashOut = gameState === "IN_FLIGHT" && bet.isPlaced && !bet.isCashedOut;

  return (
    <div className="bg-[#1b1b1b] p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 flex flex-col gap-2 sm:gap-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className={`flex-1 flex flex-col gap-1.5 sm:gap-2 transition-opacity ${bet.isPlaced ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="bg-black/40 rounded-lg sm:rounded-xl p-0.5 sm:p-1 flex items-center justify-between border border-white/5">
            <button disabled={bet.isPlaced} onClick={() => { haptics.selection(); setBet((s: any) => ({ ...s, amount: Math.max(0.1, s.amount - 1) })); }} className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-50">
              <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <input type="number" value={bet.amount} disabled={bet.isPlaced} onChange={e => setBet((s: any) => ({ ...s, amount: parseFloat(e.target.value) || 0 }))} className="bg-transparent text-center font-bold text-xs sm:text-sm w-full outline-none disabled:cursor-not-allowed" />
            <button disabled={bet.isPlaced} onClick={() => { haptics.selection(); setBet((s: any) => ({ ...s, amount: s.amount + 1 })); }} className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-50">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
          <div className={`grid ${quickAmounts.length > 4 ? "grid-cols-5 sm:grid-cols-3" : "grid-cols-4 sm:grid-cols-2"} gap-1`}>
            {quickAmounts.map((amt: number) => (
              <button key={amt} disabled={bet.isPlaced} onClick={() => { haptics.selection(); setBet((s: any) => ({ ...s, amount: amt })); }} className="bg-black/20 hover:bg-black/40 text-[8px] sm:text-[10px] font-bold py-1 rounded sm:rounded-lg border border-white/5 transition-colors disabled:opacity-50">
                {amt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-[40px] sm:min-h-[60px] flex flex-col gap-1">
          {canCashOut ? (
            <button onClick={onCashOut} className="w-full h-full bg-orange-500 hover:bg-orange-600 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center shadow-[0_2px_0_rgb(194,65,12)] sm:shadow-[0_4px_0_rgb(194,65,12)] active:translate-y-0.5 sm:active:translate-y-1 active:shadow-none transition-all">
              <span className="text-[8px] sm:text-xs font-black uppercase italic tracking-tighter">Cash Out</span>
              <span className="text-sm sm:text-xl font-black italic">{(bet.amount * multiplier).toFixed(2)}</span>
            </button>
          ) : bet.isPlaced && !bet.isCashedOut && gameState === "IN_FLIGHT" ? (
            <div className="w-full h-full bg-orange-500/50 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center cursor-not-allowed">
              <span className="text-[8px] sm:text-xs font-black uppercase italic tracking-tighter opacity-50">Waiting...</span>
            </div>
          ) : bet.isPlaced && gameState === "WAITING" ? (
            <button onClick={() => { haptics.selection(); setBet((s: any) => ({ ...s, isPlaced: false, isAutoBet: false })); }} className="w-full h-full bg-rose-500/20 border border-rose-500/50 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center hover:bg-rose-500/30 transition-all">
              <span className="text-[8px] sm:text-xs font-black uppercase italic tracking-tighter text-rose-500">Cancel</span>
            </button>
          ) : (
            <button disabled={!canPlace} onClick={onPlace} className={`w-full h-full rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all shadow-[0_2px_0_rgba(0,0,0,0.2)] sm:shadow-[0_4px_0_rgba(0,0,0,0.2)] active:translate-y-0.5 sm:active:translate-y-1 active:shadow-none ${canPlace ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-700" : "bg-gray-700 cursor-not-allowed opacity-50"}`}>
              <span className="text-sm sm:text-xl font-black italic uppercase tracking-tighter">Bet</span>
              <span className="text-[8px] sm:text-xs font-bold">{bet.amount.toFixed(2)}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3 bg-black/30 rounded-xl border border-white/5">
        <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white uppercase tracking-wider">Auto Bet</span>
            <span className="text-[8px] text-gray-400">Place bet automatically</span>
          </div>
          <button onClick={() => { haptics.selection(); setBet((s: any) => ({ ...s, isAutoBet: !s.isAutoBet })); }} className={`w-10 h-5 rounded-full relative transition-all ${bet.isAutoBet ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-gray-700"}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${bet.isAutoBet ? "left-6" : "left-1"}`} />
          </button>
        </div>

        <div className="flex flex-col gap-2 bg-white/5 p-2 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">Auto Cash Out</span>
              <span className="text-[8px] text-gray-400">Cash out at multiplier</span>
            </div>
            <button onClick={() => { haptics.selection(); setBet((s: any) => ({ ...s, isAutoCashOut: !s.isAutoCashOut })); }} className={`w-10 h-5 rounded-full relative transition-all ${bet.isAutoCashOut ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-gray-700"}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${bet.isAutoCashOut ? "left-6" : "left-1"}`} />
            </button>
          </div>

          <div className={`flex flex-col gap-2 transition-all ${bet.isAutoCashOut ? "" : "opacity-30 pointer-events-none grayscale"}`}>
            <div className="flex items-center bg-black/60 rounded-xl p-1 border border-white/10">
              <button onClick={() => { haptics.selection(); setBet((s: any) => ({ ...s, autoCashOut: Math.max(1.01, parseFloat(((s.autoCashOut || 2) - 0.1).toFixed(2))) })); }} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-transform">
                <Minus className="w-5 h-5" />
              </button>
              <div className="flex-1 flex items-center justify-center gap-1">
                <input type="number" step="0.01" value={bet.autoCashOut || ""} placeholder="2.00" onChange={e => setBet((s: any) => ({ ...s, autoCashOut: parseFloat(e.target.value) || null }))} className="bg-transparent text-center font-black text-lg w-full outline-none text-emerald-400" />
                <span className="text-xs font-black text-emerald-500 italic">x</span>
              </div>
              <button onClick={() => { haptics.selection(); setBet((s: any) => ({ ...s, autoCashOut: parseFloat(((s.autoCashOut || 2) + 0.1).toFixed(2)) })); }} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-transform">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[1.5, 2, 5, 10].map(S => (
                <button key={S} onClick={() => { haptics.selection(); setBet((s: any) => ({ ...s, autoCashOut: S })); }} className={`py-1.5 rounded-lg text-[10px] font-black transition-all border ${bet.autoCashOut === S ? "bg-emerald-500 border-emerald-400 text-white" : "bg-black/40 border-white/5 text-gray-400 hover:bg-black/60"}`}>
                  {S.toFixed(1)}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
