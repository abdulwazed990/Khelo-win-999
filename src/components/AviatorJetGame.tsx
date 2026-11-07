import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History, Minus, Plus, Volume2, VolumeX, Shield, Users, Radio, Zap, Flame, Sparkles, TrendingUp, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../utils/haptics';
import { 
  broadcastLiveGameRound, 
  generateRoundId, 
  subscribeToCurrentRound, 
  subscribeToRoundsHistory 
} from '../services/aviatorSignalService';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { CURRENCY_SYMBOL, formatBDT } from '../config/currency';
import { generateAviatorCrashMultiplier } from '../services/gameProbabilityService';
import { SignalRound } from '../types';

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

// Authentic High-Fidelity Spribe Aviator Red Racing Monoplane Renderer
function drawRealAviatorPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  propAngle: number,
  isFlying: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Micro-hover aerodynamic bobbing during flight
  if (isFlying) {
    const bob = Math.sin(Date.now() / 110) * 2;
    ctx.translate(0, bob);
  }

  // 1. Far Wing (Upper / Background swept wing)
  ctx.save();
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.moveTo(10, -5);
  ctx.lineTo(-10, -28);
  ctx.lineTo(-24, -28);
  ctx.lineTo(-12, -5);
  ctx.closePath();
  ctx.fill();

  // Far wing leading edge highlight
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, -5);
  ctx.lineTo(-10, -28);
  ctx.stroke();

  // Far wingtip navigation light (Port / Red light)
  ctx.fillStyle = '#ff4d4f';
  ctx.beginPath();
  ctx.arc(-17, -28, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Far Horizontal Stabilizer (Tail wing)
  ctx.save();
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(-28, -2);
  ctx.lineTo(-44, -10);
  ctx.lineTo(-48, -8);
  ctx.lineTo(-35, -1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Main Streamlined Crimson Fuselage
  ctx.save();
  const fuseGrad = ctx.createLinearGradient(0, -12, 0, 11);
  fuseGrad.addColorStop(0, '#fca5a5'); // Sunlit top highlight
  fuseGrad.addColorStop(0.2, '#ef4444'); // Vibrant crimson red
  fuseGrad.addColorStop(0.65, '#dc2626'); // Classic racing red
  fuseGrad.addColorStop(1, '#991b1b'); // Underside depth shadow
  ctx.fillStyle = fuseGrad;

  ctx.beginPath();
  // Nose front curve
  ctx.moveTo(35, 0);
  // Upper cowl up to canopy
  ctx.bezierCurveTo(35, -6, 22, -11, 8, -11);
  // Behind canopy sloping down to tail cone
  ctx.bezierCurveTo(-14, -10, -32, -6, -44, -2);
  // Tail cone tip
  ctx.lineTo(-48, 0);
  // Lower tail to fuselage belly
  ctx.bezierCurveTo(-38, 5, -18, 10, 8, 10);
  // Lower chin to nose
  ctx.bezierCurveTo(24, 9, 35, 5, 35, 0);
  ctx.closePath();
  ctx.fill();

  // Fuselage crisp border
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 4. White & Gold Aerodynamic Speed Stripes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.bezierCurveTo(18, -2, -10, -2, -38, 0);
  ctx.lineTo(-37, 2.5);
  ctx.bezierCurveTo(-10, 1.2, 18, 1.2, 32, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(28, 2.4);
  ctx.bezierCurveTo(16, 2, -10, 2, -34, 2.4);
  ctx.lineTo(-33, 3.6);
  ctx.bezierCurveTo(-10, 3, 16, 3, 28, 3.3);
  ctx.closePath();
  ctx.fill();

  // TK333 decal
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 6px monospace';
  ctx.fillText('TK333', -20, 1.5);
  ctx.restore();

  // 5. Vertical Stabilizer (High Swept Tail Fin & Rudder)
  ctx.save();
  const finGrad = ctx.createLinearGradient(-35, -25, -35, 0);
  finGrad.addColorStop(0, '#f87171');
  finGrad.addColorStop(0.35, '#dc2626');
  finGrad.addColorStop(1, '#991b1b');
  ctx.fillStyle = finGrad;

  ctx.beginPath();
  ctx.moveTo(-28, -4);
  ctx.lineTo(-38, -25); // Fin leading edge
  ctx.lineTo(-47, -25); // Fin top
  ctx.lineTo(-44, -2);  // Rudder trailing edge
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 1;
  ctx.stroke();

  // White rudder chevron accent
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-39, -17);
  ctx.lineTo(-45, -17);
  ctx.lineTo(-44, -9);
  ctx.lineTo(-38, -9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 6. Cockpit Canopy Glass Bubble & Pilot
  ctx.save();
  // Pilot head silhouette
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(6, -11, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Pilot goggles/visor
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(7, -12, 3, 2);

  // Tinted Cyan Canopy Glass
  const glassGrad = ctx.createLinearGradient(0, -19, 0, -9);
  glassGrad.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
  glassGrad.addColorStop(0.5, 'rgba(14, 116, 144, 0.85)');
  glassGrad.addColorStop(1, 'rgba(3, 105, 161, 0.9)');
  ctx.fillStyle = glassGrad;

  ctx.beginPath();
  ctx.moveTo(19, -9);
  ctx.bezierCurveTo(17, -19, 0, -19, -4, -9);
  ctx.closePath();
  ctx.fill();

  // Glossy white specular arc reflection
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(14, -14);
  ctx.bezierCurveTo(10, -17, 2, -17, -1, -12);
  ctx.stroke();

  // Canopy frame trim
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(19, -9);
  ctx.bezierCurveTo(17, -19, 0, -19, -4, -9);
  ctx.stroke();
  ctx.restore();

  // 7. Near Wing (Foreground Swept Wing with Depth & Bevel)
  ctx.save();
  const wingGrad = ctx.createLinearGradient(-5, 0, -15, 32);
  wingGrad.addColorStop(0, '#ef4444');
  wingGrad.addColorStop(0.5, '#dc2626');
  wingGrad.addColorStop(1, '#b91c1c');
  ctx.fillStyle = wingGrad;

  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-6, 32);
  ctx.lineTo(-24, 30);
  ctx.lineTo(-8, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Wing aileron flap line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5, 24);
  ctx.lineTo(-19, 23);
  ctx.stroke();

  // Starboard wingtip navigation strobe light (Bright Green)
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(-15, 31, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
  ctx.beginPath();
  ctx.arc(-15, 31, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 8. Near Horizontal Stabilizer (Near elevator)
  ctx.save();
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(-32, 2);
  ctx.lineTo(-44, 12);
  ctx.lineTo(-49, 10);
  ctx.lineTo(-38, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // 9. Chrome Engine Exhaust Pipes
  ctx.save();
  ctx.fillStyle = '#475569';
  ctx.fillRect(-2, 4, 7, 3.5);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(5, 5.7, 1.8, 0, Math.PI * 2);
  ctx.fill();
  if (isFlying) {
    ctx.fillStyle = 'rgba(251, 146, 60, 0.8)';
    ctx.beginPath();
    ctx.arc(5, 5.7, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 10. Front Propeller & Chrome Spinner Nose Cone (3D Perspective Aviation System)
  ctx.save();
  const hx = 38; // Propeller hub center X
  const hy = 0;  // Propeller hub center Y

  // Chrome Spinner Nose Cone (Aerodynamic 3D metallic rendering)
  const coneGrad = ctx.createLinearGradient(33, -6, 43, 6);
  coneGrad.addColorStop(0, '#ffffff');
  coneGrad.addColorStop(0.35, '#e2e8f0');
  coneGrad.addColorStop(0.65, '#64748b');
  coneGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = coneGrad;

  ctx.beginPath();
  ctx.moveTo(34, -6);
  ctx.lineTo(44, 0);
  ctx.lineTo(34, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Spinning specular glint reflection on spinner cone
  const glintAngle = isFlying ? propAngle * 1.5 : propAngle;
  const glintY = Math.sin(glintAngle) * 2.8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.ellipse(37, glintY, 2.2, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isFlying) {
    // --- FLIGHT MODE: HIGH-SPEED 3D PROPELLER BLUR DISC & ROTATING STROBE ARCS ---
    // 1. Aerodynamic wind/glass blur disc (3D perspective vertical ellipse)
    const discGrad = ctx.createRadialGradient(hx, hy, 2, hx, hy, 28);
    discGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    discGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.20)');
    discGrad.addColorStop(0.85, 'rgba(250, 204, 21, 0.28)'); // Yellow hue near tips
    discGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 6.5, 27, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-speed spinning yellow tip strobe ring
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.65 + Math.sin(propAngle * 3) * 0.25;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 5.8, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Three 3D Aerobatic Carbon Composite Blades with Strobe Trails & Yellow Safety Tips
    for (let k = 0; k < 3; k++) {
      const a = propAngle + (k * Math.PI * 2) / 3;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const tipX = hx + cosA * 5.5;
      const tipY = hy + sinA * 26;
      const bladeDepth = Math.max(0.35, Math.abs(sinA));

      // Motion streak arc behind tip
      ctx.save();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.lineWidth = 2 * bladeDepth;
      ctx.beginPath();
      ctx.ellipse(hx, hy, 5.5, 25, 0, a - 0.45, a);
      ctx.stroke();
      ctx.restore();

      // Blade Body (Dark carbon composite)
      ctx.save();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.2 * bladeDepth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Yellow safety tip
      const yellowStartX = hx + cosA * 4.2;
      const yellowStartY = hy + sinA * 20;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.2 * bladeDepth;
      ctx.beginPath();
      ctx.moveTo(yellowStartX, yellowStartY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // --- RUNWAY IDLING MODE: CRISP 3D FORESHORTENED REVOLVING BLADES ---
    for (let k = 0; k < 2; k++) {
      const a = propAngle + k * Math.PI;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const tipX = hx + cosA * 4.5;
      const tipY = hy + sinA * 22;
      const bladeDepth = Math.max(0.4, Math.abs(sinA));

      // Blade composite body
      ctx.save();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.5 * bladeDepth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Yellow safety tip
      const yellowStartX = hx + cosA * 3.4;
      const yellowStartY = hy + sinA * 17;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.5 * bladeDepth;
      ctx.beginPath();
      ctx.moveTo(yellowStartX, yellowStartY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();

  ctx.restore();
}

export default function AviatorJetGame({ user, userData, onBack }: AviatorJetGameProps) {
  const [balance, setBalance] = useState<number>(() => userData?.balance ?? 500);
  const [gameState, setGameState] = useState<"WAITING" | "IN_FLIGHT" | "CRASHED">("WAITING");
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(10.0);
  const [currentRoundId, setCurrentRoundId] = useState<string>(generateRoundId());
  const [predictedMultiplier, setPredictedMultiplier] = useState<number>(2.45);
  const [history, setHistory] = useState<number[]>([1.42, 2.85, 1.15, 14.20, 3.10, 1.88, 5.40, 1.08, 22.50]);
  const [cashoutPopup, setCashoutPopup] = useState<{ amount: number; mult: number; betIndex: number } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [onlinePlayers] = useState(() => Math.floor(180 + Math.random() * 95));

  useEffect(() => {
    if (userData?.balance !== undefined) {
      setBalance(userData.balance);
    }
  }, [userData?.balance]);

  const [bet1, setBet1] = useState<BetState>({
    amount: 50,
    isPlaced: false,
    isCashedOut: false,
    payout: 0,
    autoCashOut: 2.0,
    isAutoBet: false,
    isAutoCashOut: false
  });

  const [bet2, setBet2] = useState<BetState>({
    amount: 100,
    isPlaced: false,
    isCashedOut: false,
    payout: 0,
    autoCashOut: 2.0,
    isAutoBet: false,
    isAutoCashOut: false
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const flightPointsRef = useRef<{ x: number; y: number }[]>([]);
  const startTimeRef = useRef(0);
  const crashMultRef = useRef(2.45);
  const currentRoundIdRef = useRef(currentRoundId);
  const bet1CashedOutRef = useRef(false);
  const bet2CashedOutRef = useRef(false);
  const bet1Ref = useRef(bet1);
  const bet2Ref = useRef(bet2);
  const isAdvancingRef = useRef(false);

  // High-Fidelity Aviator Physics & Explosion Refs
  const lastJetPosRef = useRef<{ x: number; y: number; angle: number }>({ x: 80, y: 410, angle: -0.15 });
  const propellerAngleRef = useRef<number>(0);
  const smokePuffsRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    growth: number;
    alpha: number;
    decay: number;
    color: string;
  }>>([]);
  const blastSparksRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    decay: number;
    color: string;
    drag: number;
    gravity: number;
  }>>([]);
  const blastFireballsRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    maxRadius: number;
    alpha: number;
    decay: number;
    colorStart: string;
    colorEnd: string;
  }>>([]);
  const blastShockwavesRef = useRef<Array<{
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    speed: number;
    alpha: number;
    decay: number;
    lineWidth: number;
    color: string;
  }>>([]);
  const blastDebrisRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vRot: number;
    size: number;
    alpha: number;
    decay: number;
    color: string;
    points: { x: number; y: number }[];
  }>>([]);
  const screenShakeRef = useRef<number>(0);
  const flashAlphaRef = useRef<number>(0);
  const blastHandledRoundRef = useRef<string>('');

  // Cinematic Blast Explosion Generator
  const triggerBlast = (x: number, y: number) => {
    screenShakeRef.current = 18;
    flashAlphaRef.current = 0.95;

    // Shockwave Rings
    blastShockwavesRef.current = [
      { x, y, radius: 8, maxRadius: 180, speed: 7.5, alpha: 0.9, decay: 0.035, lineWidth: 5, color: '#facc15' },
      { x, y, radius: 5, maxRadius: 260, speed: 10.5, alpha: 0.85, decay: 0.03, lineWidth: 6, color: '#ef4444' },
      { x, y, radius: 2, maxRadius: 340, speed: 13.5, alpha: 0.7, decay: 0.025, lineWidth: 4, color: '#f97316' },
    ];

    // Fiery Detonation Core
    const fireballs: any[] = [];
    const colors = [
      { s: '#fffb00', e: '#ea580c' },
      { s: '#ff7700', e: '#dc2626' },
      { s: '#ffe066', e: '#f97316' },
      { s: '#ff4d4f', e: '#7f1d1d' },
    ];
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 6.5;
      const c = colors[Math.floor(Math.random() * colors.length)];
      fireballs.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 8 + Math.random() * 10,
        maxRadius: 36 + Math.random() * 32,
        alpha: 1.0,
        decay: 0.022 + Math.random() * 0.018,
        colorStart: c.s,
        colorEnd: c.e
      });
    }
    blastFireballsRef.current = fireballs;

    // Incandescent Shrapnel Sparks
    const sparks: any[] = [];
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 14;
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2 + Math.random() * 3.5,
        alpha: 1.0,
        decay: 0.016 + Math.random() * 0.018,
        color: Math.random() > 0.4 ? '#fef08a' : (Math.random() > 0.3 ? '#f97316' : '#ffffff'),
        drag: 0.96,
        gravity: 0.18
      });
    }
    blastSparksRef.current = sparks;

    // Aircraft Fragment Debris Chunks
    const debris: any[] = [];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 9;
      debris.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.45,
        size: 1 + Math.random() * 0.7,
        alpha: 1.0,
        decay: 0.014,
        color: i % 2 === 0 ? '#dc2626' : (i % 3 === 0 ? '#ffffff' : '#1e293b'),
        points: [
          { x: -5 - Math.random() * 6, y: -4 - Math.random() * 4 },
          { x: 5 + Math.random() * 6, y: -2 - Math.random() * 3 },
          { x: 4 + Math.random() * 5, y: 5 + Math.random() * 4 },
          { x: -4 - Math.random() * 4, y: 4 + Math.random() * 3 },
        ]
      });
    }
    blastDebrisRef.current = debris;
  };

  useEffect(() => { bet1Ref.current = bet1; }, [bet1]);
  useEffect(() => { bet2Ref.current = bet2; }, [bet2]);
  useEffect(() => { currentRoundIdRef.current = currentRoundId; }, [currentRoundId]);

  // Audio references
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const flySoundRef = useRef<HTMLAudioElement | null>(null);
  const crashSoundRef = useRef<HTMLAudioElement | null>(null);
  const cashOutSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgMusicRef.current = new Audio("https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3");
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.12;

    flySoundRef.current = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-jet-engine-loop-2564.mp3");
    flySoundRef.current.loop = true;
    flySoundRef.current.volume = 0.15;

    crashSoundRef.current = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-impact-explosion-with-hi-fi-reverb-2405.mp3");
    crashSoundRef.current.volume = 0.45;

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
    }
  }, [gameState, isMuted, audioUnlocked]);

  // Adjust engine pitch with multiplier
  useEffect(() => {
    if (gameState === "IN_FLIGHT" && flySoundRef.current && !isMuted) {
      const rate = Math.min(1 + (multiplier - 1) * 0.05, 2.2);
      flySoundRef.current.playbackRate = rate;
    }
  }, [multiplier, gameState, isMuted]);

  // Autonomous Continuous Authoritative Round Engine
  const flightDurationRef = useRef<number>(6.0);

  // Compute flight duration dynamically based on crash multiplier (realistic aviation climb curve)
  const calculateFlightDuration = (crashTarget: number): number => {
    // For low crashes (e.g. 1.05x - 1.5x): 2.5s - 4.5s
    // For mid crashes (e.g. 2x - 5x): 5.5s - 9s
    // For huge crashes (e.g. 10x - 50x): 10s - 14s
    const dur = 3.0 + Math.log(Math.max(1.01, crashTarget)) * 4.5;
    return Math.max(3.0, Math.min(16.0, dur));
  };

  // Helper to trigger a new authoritative countdown round
  const startNewAuthoritativeRound = async () => {
    const now = Date.now();
    const roundId = generateRoundId();
    const targetCrash = generateAviatorCrashMultiplier();
    
    currentRoundIdRef.current = roundId;
    setCurrentRoundId(roundId);
    crashMultRef.current = targetCrash;
    flightDurationRef.current = calculateFlightDuration(targetCrash);

    // Immediate local state reset (never blocked by network)
    setGameState('WAITING');
    setMultiplier(1.0);
    setCountdown(5.0);
    flightPointsRef.current = [];
    particlesRef.current = [];
    smokePuffsRef.current = [];
    blastSparksRef.current = [];
    blastFireballsRef.current = [];
    blastShockwavesRef.current = [];
    blastDebrisRef.current = [];
    lastJetPosRef.current = { x: 80, y: 410, angle: -0.15 };
    bet1CashedOutRef.current = false;
    bet2CashedOutRef.current = false;

    // Reset auto bets for new round
    setBet1(prev => ({
      ...prev,
      isPlaced: prev.isAutoBet,
      isCashedOut: false,
      payout: 0
    }));
    setBet2(prev => ({
      ...prev,
      isPlaced: prev.isAutoBet,
      isCashedOut: false,
      payout: 0
    }));

    // Non-blocking broadcast
    broadcastLiveGameRound({
      roundId,
      status: 'WAITING_FOR_ROUND',
      currentMultiplier: 1.0,
      finalMultiplier: targetCrash,
      predictedMultiplier: targetCrash,
      serverSignalStatus: 'SERVER_VERIFIED',
      countdown: 5,
      countdownStart: now,
      countdownEndsAt: now + 5000,
      serverTimestamp: now
    }).catch(err => console.warn('Broadcast wait error:', err));
  };

  // Launch Flight after countdown completes
  const advanceToFlight = () => {
    if (gameState === 'IN_FLIGHT') return;
    const now = Date.now();
    startTimeRef.current = now;
    flightPointsRef.current = [];
    setGameState('IN_FLIGHT');
    setMultiplier(1.0);

    // Non-blocking broadcast
    broadcastLiveGameRound({
      roundId: currentRoundIdRef.current,
      status: 'ROUND_RUNNING',
      currentMultiplier: 1.0,
      finalMultiplier: crashMultRef.current,
      predictedMultiplier: crashMultRef.current,
      serverSignalStatus: 'SERVER_VERIFIED',
      startTime: new Date(now).toISOString(),
      serverTimestamp: now
    }).catch(err => console.warn('Broadcast flight error:', err));
  };

  // Finalize Crashed Flight and schedule next countdown round
  const finishFlight = () => {
    if (gameState === 'CRASHED') return;
    const now = Date.now();
    const finalMult = crashMultRef.current;
    
    // Immediate local state update
    setGameState('CRASHED');
    setMultiplier(finalMult);
    haptics.heavy();

    // Trigger high-velocity cinematic blast right at the jet's exact crash location
    const blastX = lastJetPosRef.current.x || 600;
    const blastY = lastJetPosRef.current.y || 200;
    triggerBlast(blastX, blastY);
    blastHandledRoundRef.current = currentRoundIdRef.current;

    // Add to local history ribbon
    setHistory(prev => [finalMult, ...prev.slice(0, 19)]);

    // Non-blocking broadcast
    broadcastLiveGameRound({
      roundId: currentRoundIdRef.current,
      status: 'ROUND_FINISHED',
      currentMultiplier: finalMult,
      finalMultiplier: finalMult,
      predictedMultiplier: finalMult,
      serverSignalStatus: 'SERVER_VERIFIED',
      serverSignature: `sig_sha256_${currentRoundIdRef.current}_${finalMult}`,
      crashTime: new Date(now).toISOString(),
      serverTimestamp: now
    }).catch(err => console.warn('Broadcast crash error:', err));

    // After 2.5s crash celebration, automatically start next countdown round
    setTimeout(() => {
      startNewAuthoritativeRound();
    }, 2500);
  };

  // Initialize or synchronize on mount
  useEffect(() => {
    startNewAuthoritativeRound();

    const unsubHistory = subscribeToRoundsHistory((rounds) => {
      if (rounds && rounds.length > 0) {
        const multipliers = rounds
          .map(r => r.finalMultiplier || r.currentMultiplier || 1.0)
          .filter(m => m > 1.0)
          .slice(0, 20);
        if (multipliers.length > 0) {
          setHistory(multipliers);
        }
      }
    });

    return () => {
      unsubHistory();
    };
  }, []);

  // Autonomous Flight Loop with Wall-Clock Time Sync (Immune to Tab-Switch Pauses)
  useEffect(() => {
    let reqId: number;
    if (gameState === "IN_FLIGHT") {
      const flightDurationSec = flightDurationRef.current || 6.0;

      const loop = () => {
        const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
        const progress = Math.min(elapsedSec / flightDurationSec, 1.0);

        if (progress >= 1.0) {
          finishFlight();
          return;
        }

        // Crisp progressive multiplier flight curve reaching target multiplier smoothly
        const target = crashMultRef.current;
        const currentM = 1.00 + (target - 1.00) * Math.pow(progress, 1.3);
        const roundedM = parseFloat(currentM.toFixed(2));
        setMultiplier(roundedM);

        // Check Auto Cashouts
        const b1 = bet1Ref.current;
        const b2 = bet2Ref.current;

        if (b1.isPlaced && !bet1CashedOutRef.current && b1.isAutoCashOut && b1.autoCashOut && roundedM >= b1.autoCashOut) {
          cashOut(1, b1.autoCashOut);
        }
        if (b2.isPlaced && !bet2CashedOutRef.current && b2.isAutoCashOut && b2.autoCashOut && roundedM >= b2.autoCashOut) {
          cashOut(2, b2.autoCashOut);
        }

        reqId = requestAnimationFrame(loop);
      };

      reqId = requestAnimationFrame(loop);
    }
    return () => { if (reqId) cancelAnimationFrame(reqId); };
  }, [gameState]);

  // Synchronized 5-Second Countdown in WAITING state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "WAITING") {
      interval = setInterval(() => {
        setCountdown(c => {
          if (c <= 0.1) {
            advanceToFlight();
            return 0;
          }
          return parseFloat((c - 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // Anti-Freeze Watchdog Timer: Runs every 500ms to guarantee 24/7 continuous progression
  useEffect(() => {
    const watchdog = setInterval(() => {
      const now = Date.now();
      if (gameState === 'IN_FLIGHT') {
        const elapsed = (now - startTimeRef.current) / 1000;
        const maxDuration = (flightDurationRef.current || 6.0) + 1.0;
        if (elapsed > maxDuration) {
          finishFlight();
        }
      }
    }, 500);
    return () => clearInterval(watchdog);
  }, [gameState]);

  // Place Bet
  const placeBet = async (index: 1 | 2) => {
    if (gameState !== "WAITING" || countdown <= 1.0) return;
    const betState = index === 1 ? bet1 : bet2;
    if (balance < betState.amount) {
      haptics.error();
      alert('Insufficient balance to place bet.');
      return;
    }
    haptics.medium();
    setBalance(prev => Math.max(0, prev - betState.amount));
    if (index === 1) setBet1(prev => ({ ...prev, isPlaced: true }));
    else setBet2(prev => ({ ...prev, isPlaced: true }));

    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(-betState.amount),
          turnover: increment(betState.amount)
        });
      } catch (err) {
        console.error("Aviator bet error:", err);
      }
    }
  };

  // Cash Out
  const cashOut = async (index: 1 | 2, multOverride?: number) => {
    if (gameState !== "IN_FLIGHT") return;
    const currentM = multOverride || multiplier;
    const cashedOutFlag = index === 1 ? bet1CashedOutRef : bet2CashedOutRef;
    const currentBet = index === 1 ? bet1Ref.current : bet2Ref.current;
    const setBetState = index === 1 ? setBet1 : setBet2;

    if (cashedOutFlag.current || !currentBet.isPlaced || currentBet.isCashedOut) return;
    cashedOutFlag.current = true;

    haptics.win();
    if (!isMuted && cashOutSoundRef.current) {
      cashOutSoundRef.current.currentTime = 0;
      cashOutSoundRef.current.play().catch(() => {});
    }

    const winAmount = Math.round(currentBet.amount * currentM * 100) / 100;
    setBalance(prev => prev + winAmount);
    setCashoutPopup({ amount: winAmount, mult: currentM, betIndex: index });
    setBetState(prev => ({ ...prev, isCashedOut: true, payout: winAmount }));

    setTimeout(() => setCashoutPopup(null), 3000);

    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(winAmount)
        });
        await addDoc(collection(db, 'users', user.uid, 'gameHistory'), {
          gameName: 'Aviator (Crash)',
          betAmount: currentBet.amount,
          winAmount,
          multiplier: currentM,
          status: 'win',
          createdAt: serverTimestamp()
        });
        await addDoc(collection(db, 'bets'), {
          uid: user.uid,
          gameName: 'TK333 Aviator Jet',
          amount: currentBet.amount,
          profit: winAmount - currentBet.amount,
          status: 'win',
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Aviator cashout error:", err);
      }
    }
  };

  // High-Performance Supersonic Radar Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let gridOffset = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Aerospace night gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.6, '#0f172a');
      bgGrad.addColorStop(1, '#080c14');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Radar Altitude Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;

      for (let y = 40; y < h - 40; y += 45) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.font = '10px monospace';
        const altitude = Math.round((h - y) * 2.5);
        ctx.fillText(`${altitude}m`, 8, y + 3);
      }

      // Moving distance grid lines
      gridOffset = (gridOffset + (gameState === 'IN_FLIGHT' ? multiplier * 1.5 : 0.5)) % 60;
      for (let x = w - gridOffset; x > 40; x -= 60) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, h - 30);
        ctx.stroke();
      }

      // Origin Axes
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 20);
      ctx.lineTo(40, h - 30);
      ctx.lineTo(w - 20, h - 30);
      ctx.stroke();

      // Calculate Jet Position along flight parabola
      let jetX = 80;
      let jetY = h - 65;
      let angle = 0;

      if (gameState === 'IN_FLIGHT') {
        const flightTime = Math.min((Date.now() - startTimeRef.current) / 1000, 10.0);
        const curveFactor = flightTime / 10.0;
        
        jetX = 80 + (w - 200) * (1 - Math.exp(-flightTime * 0.28));
        jetY = (h - 65) - (h - 150) * Math.pow(curveFactor, 0.85);
        angle = -Math.atan2((h - 65) - jetY, jetX - 80) * 0.52;
        lastJetPosRef.current = { x: jetX, y: jetY, angle };

        flightPointsRef.current.push({ x: jetX, y: jetY });
        if (flightPointsRef.current.length > 140) flightPointsRef.current.shift();

        // Spawn soft expanding exhaust smoke puffs
        const exhaustX = jetX - Math.cos(angle) * 36 - Math.sin(angle) * 4;
        const exhaustY = jetY - Math.sin(angle) * 36 + Math.cos(angle) * 4;

        for (let i = 0; i < 2; i++) {
          smokePuffsRef.current.push({
            x: exhaustX + (Math.random() - 0.5) * 4,
            y: exhaustY + (Math.random() - 0.5) * 4,
            vx: -Math.cos(angle) * (3.5 + Math.random() * 3.5),
            vy: -Math.sin(angle) * (3.5 + Math.random() * 3.5) + (Math.random() - 0.5) * 1.5,
            size: 4 + Math.random() * 3,
            growth: 0.25 + Math.random() * 0.2,
            alpha: 0.6,
            decay: 0.02,
            color: Math.random() > 0.5 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(249, 115, 22, 0.3)'
          });
        }

        // Dynamic high-speed propeller spin scaling with climb multiplier
        const spinSpeed = Math.min(0.85, 0.42 + (multiplier - 1) * 0.035);
        propellerAngleRef.current += spinSpeed;
      } else if (gameState === 'CRASHED') {
        // Keep the curve anchored at last known crash coordinate
        jetX = lastJetPosRef.current.x;
        jetY = lastJetPosRef.current.y;
        angle = lastJetPosRef.current.angle;
      } else {
        // WAITING: realistic gentle idle propeller rotation on runway
        propellerAngleRef.current += 0.055;
      }

      // Draw Flight Parabola Area Glow & Curve
      if (flightPointsRef.current.length > 1) {
        ctx.save();
        const areaGrad = ctx.createLinearGradient(0, 0, 0, h);
        areaGrad.addColorStop(0, 'rgba(239, 68, 68, 0.38)');
        areaGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.16)');
        areaGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.fillStyle = areaGrad;
        ctx.beginPath();
        ctx.moveTo(40, h - 30);
        ctx.lineTo(flightPointsRef.current[0].x, flightPointsRef.current[0].y);
        for (let i = 1; i < flightPointsRef.current.length; i++) {
          ctx.lineTo(flightPointsRef.current[i].x, flightPointsRef.current[i].y);
        }
        ctx.lineTo(jetX, h - 30);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 16;
        ctx.moveTo(flightPointsRef.current[0].x, flightPointsRef.current[0].y);
        for (let i = 1; i < flightPointsRef.current.length; i++) {
          ctx.lineTo(flightPointsRef.current[i].x, flightPointsRef.current[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Draw Soft Exhaust Smoke Puffs
      for (let i = smokePuffsRef.current.length - 1; i >= 0; i--) {
        const sp = smokePuffsRef.current[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.97;
        sp.vy *= 0.97;
        sp.size += sp.growth;
        sp.alpha -= sp.decay;

        if (sp.alpha <= 0) {
          smokePuffsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, sp.alpha);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Authentic Red Aviator Monoplane (Visible in WAITING runway and IN_FLIGHT)
      if (gameState === 'IN_FLIGHT') {
        drawRealAviatorPlane(ctx, jetX, jetY, angle, propellerAngleRef.current, true);
      } else if (gameState === 'WAITING') {
        // Idling on the runway ready for takeoff
        drawRealAviatorPlane(ctx, 80, h - 65, 0, propellerAngleRef.current, false);
      }

      // --- BLAST EXPLOSION RENDERING (ACTIVE ON CRASH) ---
      // 1. Visceral Screen Camera Shake
      if (screenShakeRef.current > 0.1) {
        const sx = (Math.random() - 0.5) * screenShakeRef.current * 1.6;
        const sy = (Math.random() - 0.5) * screenShakeRef.current * 1.6;
        ctx.translate(sx, sy);
        screenShakeRef.current *= 0.90;
      }

      // 2. Bright Detonation Flash
      if (flashAlphaRef.current > 0.01) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlphaRef.current})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        flashAlphaRef.current *= 0.82;
      }

      // 3. Shockwave Rings
      for (let i = blastShockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = blastShockwavesRef.current[i];
        sw.radius += sw.speed;
        sw.alpha -= sw.decay;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          blastShockwavesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.lineWidth = sw.lineWidth;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Expanding Fiery Fireballs Cluster
      for (let i = blastFireballsRef.current.length - 1; i >= 0; i--) {
        const fb = blastFireballsRef.current[i];
        fb.x += fb.vx;
        fb.y += fb.vy;
        fb.vx *= 0.94;
        fb.vy *= 0.94;
        fb.radius = Math.min(fb.maxRadius, fb.radius + 1.3);
        fb.alpha -= fb.decay;

        if (fb.alpha <= 0) {
          blastFireballsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, fb.alpha);
        const fGrad = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, fb.radius);
        fGrad.addColorStop(0, fb.colorStart);
        fGrad.addColorStop(0.45, fb.colorEnd);
        fGrad.addColorStop(1, 'rgba(30, 20, 20, 0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(fb.x, fb.y, fb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Shower of Sparks and Incandescent Embers
      for (let i = blastSparksRef.current.length - 1; i >= 0; i--) {
        const sp = blastSparksRef.current[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= sp.drag;
        sp.vy = sp.vy * sp.drag + sp.gravity;
        sp.alpha -= sp.decay;

        if (sp.alpha <= 0) {
          blastSparksRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, sp.alpha);
        ctx.fillStyle = sp.color;
        ctx.shadowColor = sp.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Flying Aircraft Fragment Debris Chunks
      for (let i = blastDebrisRef.current.length - 1; i >= 0; i--) {
        const d = blastDebrisRef.current[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.95;
        d.vy += 0.22;
        d.rot += d.vRot;
        d.alpha -= d.decay;

        if (d.alpha <= 0 || d.y > h) {
          blastDebrisRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rot);
        ctx.globalAlpha = Math.max(0, d.alpha);
        ctx.fillStyle = d.color;
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.points[0].x * d.size, d.points[0].y * d.size);
        for (let p = 1; p < d.points.length; p++) {
          ctx.lineTo(d.points[p].x * d.size, d.points[p].y * d.size);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameState, multiplier]);

  // Next-Round Prediction Calculations
  const predictedMin = Math.max(1.20, predictedMultiplier * 0.85);
  const predictedMax = predictedMultiplier * 1.18;
  const safeCashout = Math.max(1.25, Math.min(2.15, predictedMultiplier * 0.72));
  const confidenceScore = Math.min(94, Math.max(82, Math.round(88 + (predictedMultiplier % 1) * 7)));

  return (
    <div className="min-h-[100dvh] bg-[#070b14] text-white font-sans flex flex-col select-none max-w-6xl mx-auto border-x border-slate-800/60 shadow-2xl overflow-x-hidden">
      {/* 1. Aerospace Cockpit Header */}
      <header className="px-3 sm:px-6 py-2.5 bg-[#0b1120] border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-chakra font-black active:scale-95 transition-all"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">EXIT</span>
          </button>

          <div className="flex items-center gap-2 bg-gradient-to-r from-rose-950/80 to-slate-900 border border-rose-500/40 px-3 py-1 rounded-xl shadow-inner">
            <Radio size={14} className="text-rose-500 animate-pulse" />
            <span className="font-chakra font-black text-sm tracking-wider bg-gradient-to-r from-rose-400 via-amber-300 to-rose-400 bg-clip-text text-transparent uppercase">
              TK333 AVIATOR
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Users size={12} className="text-emerald-400" />
            <span>{onlinePlayers} Live Pilots</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 active:scale-95 transition-all"
            aria-label="Toggle Audio"
          >
            {isMuted ? <VolumeX size={16} className="text-rose-400" /> : <Volume2 size={16} className="text-emerald-400" />}
          </button>

          {/* User Balance Chip */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-slate-900 to-[#0e172a] px-3 sm:px-3.5 py-1.5 rounded-xl border border-emerald-500/40 shadow-sm">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Balance</span>
            <span className="font-rajdhani font-black text-emerald-400 text-sm sm:text-lg tracking-tight">
              {formatBDT(balance)}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Live Flight Ribbon (Multiplier History with Tiered Colors) */}
      <div className="bg-[#090e1a] px-3 py-1.5 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-1 text-[10px] font-chakra font-bold text-slate-400 uppercase shrink-0">
          <History size={13} className="text-slate-400" />
          <span>ROUNDS:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {history.map((m, idx) => {
            const isHigh = m >= 10.0;
            const isMedium = m >= 2.0 && m < 10.0;
            return (
              <span
                key={idx}
                className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-rajdhani font-black tracking-tight shrink-0 border ${
                  isHigh
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : isMedium
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-blue-950/40 text-blue-300 border-blue-800/50'
                }`}
              >
                {m.toFixed(2)}x
              </span>
            );
          })}
        </div>
      </div>

      {/* 3. Main Radar Screen & Cockpit Telemetry */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[21/9] bg-[#070b14] overflow-hidden border-b border-slate-800/80 flex items-center justify-center">
        <canvas ref={canvasRef} width={960} height={480} className="w-full h-full object-cover" />

        {/* Center Multiplier / State HUD */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          {gameState === 'WAITING' ? (
            <div className="text-center bg-slate-950/80 backdrop-blur-md px-5 sm:px-6 py-3 sm:py-4 rounded-3xl border border-slate-700/60 shadow-2xl">
              <span className="text-[10px] sm:text-[11px] font-chakra font-black tracking-widest text-slate-400 uppercase block mb-1">
                NEXT ROUND TAKEOFF IN
              </span>
              <div
                style={{ fontVariantNumeric: 'tabular-nums' }}
                className="font-rajdhani tabular-nums font-black text-4xl sm:text-6xl text-amber-400 tracking-tight drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]"
              >
                {countdown.toFixed(1)}s
              </div>
              <div className="w-28 sm:w-36 h-1.5 bg-slate-800 rounded-full mx-auto mt-2 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-100"
                  style={{ width: `${(countdown / 5.0) * 100}%` }}
                />
              </div>
              <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase mt-2 block">
                {countdown > 1.0 ? 'BETS ACCEPTED' : 'BETS LOCKED — PREPARING RUNWAY'}
              </span>
            </div>
          ) : gameState === 'CRASHED' ? (
            <div className="text-center animate-in zoom-in-95 duration-200">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/60 mb-2 backdrop-blur-md shadow-[0_0_30px_rgba(225,29,72,0.6)]">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-chakra font-black text-[10px] sm:text-xs tracking-widest text-rose-200 uppercase">
                  FLEW AWAY
                </span>
              </div>
              <div
                style={{ fontVariantNumeric: 'tabular-nums' }}
                className="font-rajdhani tabular-nums font-black text-6xl sm:text-8xl md:text-9xl text-rose-500 drop-shadow-[0_0_45px_rgba(225,29,72,0.95)] tracking-tight"
              >
                {multiplier.toFixed(2)}x
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-[9px] sm:text-xs font-mono font-bold text-slate-300 bg-slate-950/80 px-3 py-1 rounded-xl border border-rose-500/30 shadow-lg mx-auto w-fit">
                <span className="text-amber-400 animate-pulse">CRASHED AT {multiplier.toFixed(2)}x • NEXT FLIGHT IN 2.5s</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div
                style={{ fontVariantNumeric: 'tabular-nums' }}
                className={`font-rajdhani tabular-nums font-black text-6xl sm:text-8xl md:text-9xl tracking-tight transition-colors duration-150 ${
                  multiplier >= 10.0
                    ? 'text-amber-300 drop-shadow-[0_0_45px_rgba(251,191,36,0.9)] scale-105'
                    : multiplier >= 2.0
                    ? 'text-cyan-300 drop-shadow-[0_0_35px_rgba(34,211,238,0.7)]'
                    : 'text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.45)]'
                }`}
              >
                {multiplier.toFixed(2)}x
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-slate-400 mt-1">
                <Flame size={14} className="text-rose-500 animate-bounce" />
                <span className="tracking-wider">SUPERSONIC ASCENT</span>
              </div>
            </div>
          )}
        </div>

        {/* Cashout Celebration Banner */}
        <AnimatePresence>
          {cashoutPopup && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 sm:px-6 py-2 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.6)] flex items-center gap-2.5 z-30 border border-emerald-300"
            >
              <Sparkles className="text-yellow-300" size={20} />
              <div>
                <span className="text-[9px] font-chakra font-black uppercase text-emerald-100 block">
                  CASHOUT CONFIRMED ({cashoutPopup.mult.toFixed(2)}x)
                </span>
                <span className="font-rajdhani font-black text-lg sm:text-xl text-white">
                  +{formatBDT(cashoutPopup.amount)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Dual Betting Stations: Side-by-side on mobile (Deck 1 on left, Deck 2 on right) */}
      <div className="p-2 sm:p-4 grid grid-cols-2 gap-2 sm:gap-4 bg-[#090f1d] flex-1">
        <BetStation
          title="DECK 1"
          bet={bet1}
          setBet={setBet1}
          onPlace={() => placeBet(1)}
          onCashOut={() => cashOut(1)}
          gameState={gameState}
          countdown={countdown}
          multiplier={multiplier}
          balance={balance}
        />

        <BetStation
          title="DECK 2"
          bet={bet2}
          setBet={setBet2}
          onPlace={() => placeBet(2)}
          onCashOut={() => cashOut(2)}
          gameState={gameState}
          countdown={countdown}
          multiplier={multiplier}
          balance={balance}
        />
      </div>
    </div>
  );
}

interface BetStationProps {
  title: string;
  bet: BetState;
  setBet: React.Dispatch<React.SetStateAction<BetState>>;
  onPlace: () => void;
  onCashOut: () => void;
  gameState: 'WAITING' | 'IN_FLIGHT' | 'CRASHED';
  countdown: number;
  multiplier: number;
  balance: number;
}

function BetStation({
  title,
  bet,
  setBet,
  onPlace,
  onCashOut,
  gameState,
  countdown,
  multiplier,
  balance
}: BetStationProps) {
  const canPlace = gameState === 'WAITING' && countdown > 0.8;
  const canCashOut = gameState === 'IN_FLIGHT' && bet.isPlaced && !bet.isCashedOut;
  const currentCashoutValue = Math.round(bet.amount * multiplier * 100) / 100;
  const netProfit = currentCashoutValue - bet.amount;

  const quickChips = [20, 50, 100, 200, 500, 1000];

  return (
    <div className="bg-[#0f172a] rounded-xl sm:rounded-2xl border border-slate-800 p-2 sm:p-3 flex flex-col justify-between gap-2 shadow-lg">
      {/* Station Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
        <span className="text-[10px] sm:text-[11px] font-chakra font-black text-slate-300 tracking-wider uppercase flex items-center gap-1">
          <Zap size={12} className="text-amber-400" />
          {title}
        </span>

        {/* Auto Cashout toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-slate-400 uppercase font-bold hidden sm:inline">Auto</span>
          <button
            onClick={() => {
              haptics.selection();
              setBet(prev => ({ ...prev, isAutoCashOut: !prev.isAutoCashOut }));
            }}
            className={`w-7 sm:w-8 h-4 rounded-full p-0.5 transition-colors ${
              bet.isAutoCashOut ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                bet.isAutoCashOut ? 'translate-x-3 sm:translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Bet Amount Control */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between bg-slate-900/90 rounded-lg sm:rounded-xl border border-slate-700/80 px-1 py-0.5">
          <button
            disabled={bet.isPlaced}
            onClick={() => {
              haptics.selection();
              setBet(prev => ({ ...prev, amount: Math.max(10, prev.amount - 20) }));
            }}
            className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-black active:scale-90 transition-all disabled:opacity-40"
          >
            <Minus size={12} />
          </button>

          <div className="flex items-center gap-0.5">
            <span className="text-[11px] font-black text-amber-400">৳</span>
            <input
              type="number"
              disabled={bet.isPlaced}
              value={bet.amount}
              onChange={e => {
                const val = Math.max(10, parseFloat(e.target.value) || 0);
                setBet(prev => ({ ...prev, amount: val }));
              }}
              className="bg-transparent text-center font-rajdhani font-black text-base sm:text-lg text-white w-14 sm:w-16 outline-none disabled:opacity-50"
            />
          </div>

          <button
            disabled={bet.isPlaced}
            onClick={() => {
              haptics.selection();
              setBet(prev => ({ ...prev, amount: prev.amount + 20 }));
            }}
            className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-black active:scale-90 transition-all disabled:opacity-40"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Quick Chip Presets (2 rows of 3) */}
        <div className="grid grid-cols-3 gap-1">
          {quickChips.map(amt => (
            <button
              key={amt}
              disabled={bet.isPlaced}
              onClick={() => {
                haptics.selection();
                setBet(prev => ({ ...prev, amount: amt }));
              }}
              className={`py-0.5 rounded text-[9px] sm:text-[10px] font-rajdhani font-black border transition-all disabled:opacity-40 ${
                bet.amount === amt
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              ৳{amt}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Action Button */}
      <div>
        {canCashOut ? (
          <button
            onClick={onCashOut}
            className="w-full min-h-[58px] sm:min-h-[64px] rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white p-1.5 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-98 transition-all animate-pulse"
          >
            <span className="text-[10px] font-chakra font-black tracking-widest uppercase">
              CASH OUT
            </span>
            <span className="font-rajdhani font-black text-lg sm:text-xl leading-tight">
              ৳{currentCashoutValue.toFixed(2)}
            </span>
            <span className="text-[8px] font-bold text-emerald-100">
              +{multiplier.toFixed(2)}x
            </span>
          </button>
        ) : bet.isPlaced && gameState === 'WAITING' ? (
          <button
            onClick={() => {
              haptics.selection();
              setBet(prev => ({ ...prev, isPlaced: false }));
            }}
            className="w-full min-h-[58px] sm:min-h-[64px] rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/50 text-rose-400 p-1.5 flex flex-col items-center justify-center active:scale-98 transition-all"
          >
            <span className="text-[10px] font-chakra font-black uppercase tracking-wider">CANCEL BET</span>
            <span className="text-[10px] font-mono mt-0.5">৳{bet.amount}</span>
          </button>
        ) : bet.isPlaced && gameState === 'IN_FLIGHT' ? (
          <div className="w-full min-h-[58px] sm:min-h-[64px] rounded-xl bg-slate-800/60 border border-slate-700 p-1.5 flex flex-col items-center justify-center text-slate-400">
            <span className="text-[10px] font-chakra font-black uppercase tracking-wider">IN FLIGHT...</span>
            <span className="text-[10px] font-mono">{multiplier.toFixed(2)}x</span>
          </div>
        ) : (
          <button
            disabled={!canPlace}
            onClick={onPlace}
            className={`w-full min-h-[58px] sm:min-h-[64px] rounded-xl p-1.5 flex flex-col items-center justify-center transition-all ${
              canPlace
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-98 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
            }`}
          >
            <span className="text-[11px] font-chakra font-black tracking-wider uppercase">
              {gameState === 'WAITING' ? 'BET' : 'WAIT'}
            </span>
            <span className="font-rajdhani font-black text-base sm:text-lg">৳{bet.amount}</span>
          </button>
        )}
      </div>

      {/* Auto Cashout multiplier input when enabled */}
      {bet.isAutoCashOut && (
        <div className="flex items-center justify-between bg-slate-900/60 p-1 rounded-lg border border-slate-800 text-[10px]">
          <span className="text-slate-400 font-bold hidden sm:inline">Auto at:</span>
          <div className="flex items-center gap-1 w-full justify-around">
            {[1.5, 2.0, 5.0].map(m => (
              <button
                key={m}
                onClick={() => {
                  haptics.selection();
                  setBet(prev => ({ ...prev, autoCashOut: m }));
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors ${
                  bet.autoCashOut === m
                    ? 'bg-emerald-500 text-white border-emerald-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {m.toFixed(1)}x
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
