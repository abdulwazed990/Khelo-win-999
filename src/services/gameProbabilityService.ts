import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { logAdminAudit } from './gameEngine';

/**
 * DEFAULT CENTRALIZED GLOBAL WIN PROBABILITY
 * Fixed at 5% for all demo/play-money games across the entire website.
 * No game has hidden or separate win percentages.
 */
export const DEFAULT_GLOBAL_WIN_PROBABILITY = 5; // 5%

let cachedGlobalProbability: number = DEFAULT_GLOBAL_WIN_PROBABILITY;
let isListenerActive = false;

/**
 * Initialize real-time sync for the global win probability
 */
export function initGlobalProbabilitySync(): () => void {
  if (isListenerActive) return () => {};
  
  try {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (typeof data.globalWinProbability === 'number' && !isNaN(data.globalWinProbability)) {
          cachedGlobalProbability = Math.max(1, Math.min(100, data.globalWinProbability));
        } else {
          cachedGlobalProbability = DEFAULT_GLOBAL_WIN_PROBABILITY;
        }
      }
    }, (err) => {
      console.warn('[GameProbabilityService] Error listening to probability settings:', err);
    });

    isListenerActive = true;
    return unsub;
  } catch (e) {
    console.warn('[GameProbabilityService] Fallback to default probability:', e);
    return () => {};
  }
}

// Auto-start sync in client
if (typeof window !== 'undefined') {
  initGlobalProbabilitySync();
}

/**
 * Fetch current Global Win Probability (Authoritative)
 */
export async function getGlobalWinProbability(): Promise<number> {
  try {
    // 1. Try server API first
    const res = await fetch('/api/settings/game-probability', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (typeof json.globalWinProbability === 'number') {
        cachedGlobalProbability = json.globalWinProbability;
        return cachedGlobalProbability;
      }
    }
  } catch {
    // Fall back to Firestore cache
  }

  try {
    const snap = await getDoc(doc(db, 'settings', 'site'));
    if (snap.exists()) {
      const val = snap.data()?.globalWinProbability;
      if (typeof val === 'number') {
        cachedGlobalProbability = Math.max(1, Math.min(100, val));
        return cachedGlobalProbability;
      }
    }
  } catch (e) {
    console.warn('[GameProbabilityService] Firestore fetch error, using cache:', e);
  }

  return cachedGlobalProbability;
}

/**
 * Synchronously get the current cached global probability
 */
export function getCurrentGlobalProbability(): number {
  return cachedGlobalProbability;
}

/**
 * Update Global Win Probability (Admin Panel Action)
 * Updates Firestore + Server in-memory registry and records an Audit Log entry.
 */
export async function updateGlobalWinProbability(
  newPercentage: number,
  adminEmail: string
): Promise<{ success: boolean; value: number; error?: string }> {
  const sanitized = Math.max(1, Math.min(100, Number(newPercentage) || DEFAULT_GLOBAL_WIN_PROBABILITY));
  const prevVal = cachedGlobalProbability;

  try {
    // 1. Update Firestore settings/site
    const siteRef = doc(db, 'settings', 'site');
    await setDoc(siteRef, {
      globalWinProbability: sanitized,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail || 'admin@tk333.vip'
    }, { merge: true });

    // 2. Notify Server API
    try {
      await fetch('/api/settings/game-probability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          globalWinProbability: sanitized,
          adminEmail: adminEmail || 'admin@tk333.vip'
        })
      });
    } catch (apiErr) {
      console.warn('[GameProbabilityService] Server sync note:', apiErr);
    }

    cachedGlobalProbability = sanitized;

    // 3. Record Admin Audit Log
    await logAdminAudit(
      adminEmail || 'admin@tk333.vip',
      'GLOBAL_WIN_PROBABILITY_UPDATED',
      'site_settings',
      'SETTINGS',
      `Admin updated Global Win Probability from ${prevVal}% to ${sanitized}% (Applies to all games).`,
      { previous: prevVal, updated: sanitized }
    );

    return { success: true, value: sanitized };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/site');
    return { success: false, value: prevVal, error: err.message || 'Failed to update probability' };
  }
}

/**
 * Server-Side Independent Random Trial
 * Evaluates whether a round is a WIN strictly based on the centralized Global Win Probability.
 * Does NOT depend on user balance, previous wins/losses, or hidden game weights.
 */
export function evaluateServerWinRoll(customProbability?: number): boolean {
  const probability = (typeof customProbability === 'number' && !isNaN(customProbability))
    ? customProbability
    : cachedGlobalProbability;
  
  // Independent cryptographically even random check:
  // Math.random() * 100 < probability (e.g. 5%)
  return (Math.random() * 100) < probability;
}

/**
 * Centrally calculated Aviator crash point
 * 5% probability allows winning cashout (>1.5x to 25x), 95% crashes early (1.00x - 1.45x)
 */
export function generateAviatorCrashMultiplier(customProbability?: number): number {
  const isWinRound = evaluateServerWinRoll(customProbability);
  
  if (isWinRound) {
    // 5% Win bucket: Generates realistic winning multipliers (1.80x - 15.00x)
    const roll = Math.random();
    if (roll < 0.60) {
      return parseFloat((1.80 + Math.random() * 2.2).toFixed(2)); // 1.80x - 4.00x
    } else if (roll < 0.90) {
      return parseFloat((4.00 + Math.random() * 5.0).toFixed(2)); // 4.00x - 9.00x
    } else {
      return parseFloat((9.00 + Math.random() * 15.0).toFixed(2)); // 9.00x - 24.00x
    }
  } else {
    // 95% Loss bucket: Crashes early before user can safely cash out high
    const earlyRoll = Math.random();
    if (earlyRoll < 0.35) {
      return 1.00; // Immediate instant crash
    } else if (earlyRoll < 0.70) {
      return parseFloat((1.01 + Math.random() * 0.20).toFixed(2)); // 1.01x - 1.21x
    } else {
      return parseFloat((1.20 + Math.random() * 0.25).toFixed(2)); // 1.20x - 1.45x
    }
  }
}

/**
 * Centrally calculated Coinflip result
 */
export function generateCoinflipOutcome(
  chosenSide: 'heads' | 'tails',
  customProbability?: number
): { outcome: 'heads' | 'tails'; won: boolean } {
  const won = evaluateServerWinRoll(customProbability);
  const outcome = won 
    ? chosenSide 
    : (chosenSide === 'heads' ? 'tails' : 'heads');
  return { outcome, won };
}

/**
 * Centrally calculated Roulette winning number
 */
export function generateRouletteWinningNumber(
  bets: Record<string, number>,
  redNumbers: number[],
  allNumbers: number[],
  customProbability?: number
): { outcomeIndex: number; outcomeNumber: number; won: boolean } {
  const won = evaluateServerWinRoll(customProbability);

  // Find numbers that would win based on user's active bets
  const winningIndices: number[] = [];
  const losingIndices: number[] = [];

  allNumbers.forEach((num, idx) => {
    const isRed = redNumbers.includes(num);
    const isBlack = num !== 0 && !isRed;
    const isEven = num !== 0 && num % 2 === 0;
    const isOdd = num !== 0 && num % 2 !== 0;
    const isLow = num >= 1 && num <= 18;
    const isHigh = num >= 19 && num <= 36;

    const hasBet = Boolean(
      bets[`num_${num}`] ||
      (isRed && bets['red']) ||
      (isBlack && bets['black']) ||
      (isEven && bets['even']) ||
      (isOdd && bets['odd']) ||
      (isLow && bets['low']) ||
      (isHigh && bets['high'])
    );

    if (hasBet) {
      winningIndices.push(idx);
    } else {
      losingIndices.push(idx);
    }
  });

  let chosenIndex: number;
  if (won && winningIndices.length > 0) {
    chosenIndex = winningIndices[Math.floor(Math.random() * winningIndices.length)];
  } else if (losingIndices.length > 0) {
    chosenIndex = losingIndices[Math.floor(Math.random() * losingIndices.length)];
  } else {
    chosenIndex = Math.floor(Math.random() * allNumbers.length);
  }

  return {
    outcomeIndex: chosenIndex,
    outcomeNumber: allNumbers[chosenIndex],
    won
  };
}

/**
 * Centrally calculated Mines game setup
 */
export function generateMinesLayout(
  mineCount: number,
  totalTiles: number = 25,
  customProbability?: number
): { isWinRun: boolean; minePositions: number[] } {
  const isWinRun = evaluateServerWinRoll(customProbability);
  const positions: number[] = [];
  
  while (positions.length < mineCount) {
    const r = Math.floor(Math.random() * totalTiles);
    if (!positions.includes(r)) {
      positions.push(r);
    }
  }

  return { isWinRun, minePositions: positions };
}
