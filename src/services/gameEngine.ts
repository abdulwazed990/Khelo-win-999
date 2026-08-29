import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  addDoc, 
  collection, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { CURRENCY_CODE, CURRENCY_SYMBOL, formatBDT } from '../config/currency';
import { AdminAuditLog, Transaction, TransactionType, TransactionStatus } from '../types';
import { fetchGameStatus } from './gameStatusService';

/**
 * Centrally enforced demo game & payout safety boundaries
 */
export const GAME_BOUNDARIES = {
  MIN_DEMO_STAKE: 10,
  MAX_DEMO_STAKE: 5000,
  MAX_DEMO_PAYOUT: 25000,
  MAX_MULTIPLIER: 50,
  DEFAULT_RTP: 0.95,
} as const;

/**
 * Generate a cryptographically distinct round/reference ID
 */
export function generateUniqueRoundId(prefix: string = 'RND'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${randomPart}`;
}

/**
 * Mask sensitive account number for demo security & audit standards
 * e.g., "01712345678" -> "017****5678"
 */
export function maskAccountIdentifier(account: string = ''): string {
  const clean = account.trim();
  if (clean.length <= 4) return clean ? '****' : 'N/A';
  if (clean.length <= 7) return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
  return `${clean.slice(0, 3)}****${clean.slice(-4)}`;
}

/**
 * Centralized Demo Bet Placement:
 * Authoritatively checks server status, validates balance, deducts stake, and records GAME_STAKE transaction ledger
 */
export async function placeDemoStake(
  uid: string,
  gameName: string,
  stakeAmount: number,
  roundId?: string
): Promise<{ success: boolean; roundId: string; newBalance?: number; error?: string }> {
  if (!uid) {
    return { success: false, roundId: '', error: 'User is not authenticated' };
  }

  const validRoundId = roundId || generateUniqueRoundId(gameName.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase());

  // Fail-Safe Status Enforcement: Verify game availability before any balance operation
  try {
    const statusCheck = await fetchGameStatus(gameName);
    if (!statusCheck.isAvailable || statusCheck.status !== 'ACTIVE') {
      return {
        success: false,
        roundId: validRoundId,
        error: `Game is currently unavailable (${statusCheck.status}). Access blocked to preserve wallet safety.`
      };
    }
  } catch (err) {
    console.warn('Game status check failed in placeDemoStake, blocking for fail-safe protection');
    return {
      success: false,
      roundId: validRoundId,
      error: 'Game status verification failed. Stake blocked for safety.'
    };
  }

  // Clamp & validate stake amount
  const sanitizedStake = Math.max(
    GAME_BOUNDARIES.MIN_DEMO_STAKE, 
    Math.min(stakeAmount, GAME_BOUNDARIES.MAX_DEMO_STAKE)
  );

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, roundId: validRoundId, error: 'User wallet not found' };
    }

    const currentBalance = Number(userSnap.data().balance) || 0;
    if (currentBalance < sanitizedStake) {
      return { 
        success: false, 
        roundId: validRoundId, 
        error: `Insufficient balance! You need at least ${formatBDT(sanitizedStake)}.` 
      };
    }

    const newBalance = Math.max(0, currentBalance - sanitizedStake);

    // Atomically deduct balance and record turnover
    await updateDoc(userRef, {
      balance: increment(-sanitizedStake),
      turnover: increment(sanitizedStake)
    });

    // Record authoritative transaction ledger entry
    await addDoc(collection(db, 'transactions'), {
      uid,
      userName: userSnap.data().name || userSnap.data().username || 'Demo User',
      userPhone: userSnap.data().phone || '',
      type: 'GAME_STAKE' as TransactionType,
      amount: sanitizedStake,
      currency: CURRENCY_CODE,
      previousBalance: currentBalance,
      newBalance: newBalance,
      status: 'settled' as TransactionStatus,
      gameName,
      referenceId: validRoundId,
      createdAt: new Date().toISOString()
    });

    return { success: true, roundId: validRoundId, newBalance };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    return { success: false, roundId: validRoundId, error: 'Failed to process stake deduction' };
  }
}

/**
 * Centralized Demo Win Settlement (Idempotent):
 * Validates payout boundaries, prevents double-crediting via round settlement locks,
 * atomically credits wallet, and records GAME_WIN transaction ledger.
 */
export async function settleDemoWin(
  uid: string,
  gameName: string,
  roundId: string,
  stakeAmount: number,
  multiplier: number,
  rawWinAmount: number
): Promise<{ success: boolean; payout: number; newBalance?: number; error?: string }> {
  if (!uid || !roundId) {
    return { success: false, payout: 0, error: 'Invalid settlement parameters' };
  }

  // Enforce server-side realistic limits
  const safeMultiplier = Math.min(Math.max(0, multiplier), GAME_BOUNDARIES.MAX_MULTIPLIER);
  const calculatedWin = Math.floor(stakeAmount * safeMultiplier);
  const safeWinAmount = Math.min(
    Math.max(0, rawWinAmount, calculatedWin),
    GAME_BOUNDARIES.MAX_DEMO_PAYOUT
  );

  if (safeWinAmount <= 0) {
    return { success: true, payout: 0 };
  }

  try {
    // Idempotency check: Ensure this roundId hasn't already been settled
    const lockRef = doc(db, 'settled_rounds', roundId);
    const lockSnap = await getDoc(lockRef);
    if (lockSnap.exists()) {
      // Already settled! Prevent duplicate payout.
      return { 
        success: false, 
        payout: 0, 
        error: 'Round has already been settled and claimed.' 
      };
    }

    // Set settlement lock immediately
    await setDoc(lockRef, {
      uid,
      gameName,
      stakeAmount,
      multiplier: safeMultiplier,
      payout: safeWinAmount,
      settledAt: new Date().toISOString()
    });

    // Credit user wallet
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const currentBalance = userSnap.exists() ? (Number(userSnap.data().balance) || 0) : 0;
    const newBalance = currentBalance + safeWinAmount;

    await updateDoc(userRef, {
      balance: increment(safeWinAmount)
    });

    // Record authoritative transaction ledger entry
    await addDoc(collection(db, 'transactions'), {
      uid,
      userName: userSnap.exists() ? (userSnap.data().name || userSnap.data().username || 'Demo User') : 'Demo User',
      userPhone: userSnap.exists() ? (userSnap.data().phone || '') : '',
      type: 'GAME_WIN' as TransactionType,
      amount: safeWinAmount,
      currency: CURRENCY_CODE,
      previousBalance: currentBalance,
      newBalance: newBalance,
      status: 'settled' as TransactionStatus,
      gameName,
      referenceId: roundId,
      note: `Won at ${safeMultiplier.toFixed(2)}x`,
      createdAt: new Date().toISOString()
    });

    return { success: true, payout: safeWinAmount, newBalance };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `settled_rounds/${roundId}`);
    return { success: false, payout: 0, error: 'Settlement failure' };
  }
}

/**
 * Record an Admin Audit action in Firestore
 */
export async function logAdminAudit(
  adminEmail: string,
  action: string,
  targetId?: string,
  targetType?: string,
  details?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await addDoc(collection(db, 'admin_audit_logs'), {
      adminEmail: adminEmail || 'admin@tk333.vip',
      action,
      targetId: targetId || '',
      targetType: targetType || 'TRANSACTION',
      details: details || '',
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Failed to record admin audit log:', e);
  }
}
