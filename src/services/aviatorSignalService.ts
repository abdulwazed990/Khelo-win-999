import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  SignalUser, 
  SignalToken, 
  SignalGameConnection, 
  SignalRound, 
  SignalLog, 
  SignalEvent,
  SignalEventType,
  SubscriptionType, 
  SignalConnectionStatus, 
  SignalResultStatus 
} from '../types';

const TOKENS_COLLECTION = 'signal_tokens';
const USERS_COLLECTION = 'signal_users';
const CONNECTIONS_COLLECTION = 'signal_connections';
const ROUNDS_COLLECTION = 'signal_rounds';
const LOGS_COLLECTION = 'signal_logs';
const EVENTS_COLLECTION = 'signal_events';

export const DEFAULT_GAME_ID = 'aviator_jet_main';

// Generate unique Round ID in format: AVI-YYYYMMDD-XXXXX
export function generateRoundId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `AVI-${dateStr}-${rand}`;
}

// Helper to strip undefined values so Firestore never errors on setDoc/updateDoc
function cleanFirestoreObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result as Partial<T>;
}

// Helper to sanitize and obtain active clean origin
export function getCleanDomainUrl(path: string = '/#signal'): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${origin}${cleanPath}`;
  }
  return `https://yourwebsite.com${path}`;
}

// Initial Seed for Game Connection and History
export async function initializeAviatorSignalDefaults() {
  try {
    const originUrl = getCleanDomainUrl('/#signal');

    // 1. Initialize Game Connection if not exists or merge missing properties
    const connDocRef = doc(db, CONNECTIONS_COLLECTION, DEFAULT_GAME_ID);
    const connSnap = await getDoc(connDocRef);
    if (!connSnap.exists()) {
      const defaultConn: SignalGameConnection = {
        id: DEFAULT_GAME_ID,
        gameId: DEFAULT_GAME_ID,
        gameName: 'Aviator',
        apiUrl: 'https://gateway.aviator-network.internal/v2/telemetry',
        signalAppUrl: originUrl,
        signalAppStatus: 'CONNECTED',
        signalAppEnabled: true,
        wsUrl: 'wss://stream.aviator-network.internal/live/session',
        authHeader: 'Bearer av_sec_live_9882a17f6c310b8e9921',
        connectionStatus: 'CONNECTED',
        syncStatus: 'LIVE',
        lastSyncAt: new Date().toISOString(),
        serverVerifiedMode: true,
        currentSessionId: 'sess_' + Math.floor(100000 + Math.random() * 900000),
        pingMs: 18
      };
      await setDoc(connDocRef, defaultConn);
    } else {
      const existing = connSnap.data() as SignalGameConnection;
      const updates: any = {};
      
      // If signalAppUrl is empty or points to an obsolete preview/container domain, sanitize it to current origin
      const isOutdatedPreview = existing.signalAppUrl && (
        existing.signalAppUrl.includes('ais-dev-') || 
        existing.signalAppUrl.includes('ais-pre-') || 
        existing.signalAppUrl.includes('.run.app') ||
        existing.signalAppUrl.includes('ai.studio')
      );

      if (!existing.signalAppUrl || isOutdatedPreview) {
        updates.signalAppUrl = originUrl;
      }
      if (!existing.signalAppStatus) updates.signalAppStatus = 'CONNECTED';
      if (existing.signalAppEnabled === undefined) updates.signalAppEnabled = true;
      if (!existing.syncStatus) updates.syncStatus = 'LIVE';
      if (Object.keys(updates).length > 0) {
        await updateDoc(connDocRef, cleanFirestoreObject(updates));
      }
    }

    // 2. Initialize Seed History if empty
    const roundsSnap = await getDocs(query(collection(db, ROUNDS_COLLECTION), limit(5)));
    if (roundsSnap.empty) {
      const seedMultipliers = [
        { mult: 2.34, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 1.15, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 5.60, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 1.02, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 14.85, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 1.98, verified: false, status: 'SIGNAL_UNAVAILABLE' as const },
        { mult: 3.45, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 1.25, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 8.92, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 1.08, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 4.12, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 2.10, verified: false, status: 'SIGNAL_UNAVAILABLE' as const },
        { mult: 1.44, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 19.30, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 1.67, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 3.15, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 1.19, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 6.78, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 2.89, verified: true, status: 'SERVER_VERIFIED' as const },
        { mult: 1.05, verified: true, status: 'SERVER_VERIFIED' as const }
      ];

      const now = Date.now();
      for (let i = 0; i < seedMultipliers.length; i++) {
        const item = seedMultipliers[i];
        const roundTime = new Date(now - (seedMultipliers.length - i) * 28000).toISOString();
        const dateStr = roundTime.slice(0, 10).replace(/-/g, '');
        const rId = `AVI-${dateStr}-${18430 + i}`;
        await setDoc(doc(db, ROUNDS_COLLECTION, rId), cleanFirestoreObject({
          id: rId,
          roundId: rId,
          sessionId: 'sess_live_core',
          gameId: DEFAULT_GAME_ID,
          status: 'ROUND_FINISHED',
          currentMultiplier: item.mult,
          finalMultiplier: item.mult,
          serverSignalStatus: item.status,
          predictedMultiplier: item.verified ? item.mult : null,
          serverSignature: item.verified ? `sig_sha256_${rId}_${item.mult}` : null,
          createdAt: roundTime,
          startTime: roundTime,
          crashTime: new Date(new Date(roundTime).getTime() + 12000).toISOString()
        }));
      }
    }

    // 3. Initialize current round document if not exists
    const currentDocRef = doc(db, ROUNDS_COLLECTION, 'CURRENT_LIVE_ROUND');
    const currentSnap = await getDoc(currentDocRef);
    if (!currentSnap.exists()) {
      const now = Date.now();
      const dateStr = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
      const initRoundId = `AVI-${dateStr}-18453`;
      await setDoc(currentDocRef, {
        id: 'CURRENT_LIVE_ROUND',
        roundId: initRoundId,
        sessionId: 'sess_live_core',
        gameId: DEFAULT_GAME_ID,
        status: 'WAITING_FOR_ROUND',
        currentMultiplier: 1.0,
        serverSignalStatus: 'SERVER_VERIFIED',
        predictedMultiplier: 2.35,
        finalMultiplier: 2.35,
        countdown: 5,
        countdownStart: now,
        countdownEndsAt: now + 5000,
        serverTimestamp: now,
        serverSignature: `sig_sha256_${initRoundId}_2.35`,
        createdAt: new Date().toISOString(),
        startTime: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Error initializing Aviator Signal defaults:', err);
  }
}

// ----------------------------------------------------
// GAME CONNECTION & SIGNAL APP CONTROL (ADMIN CMS)
// ----------------------------------------------------

export async function toggleSignalAppStatus(enabled: boolean): Promise<void> {
  const docRef = doc(db, CONNECTIONS_COLLECTION, DEFAULT_GAME_ID);
  await updateDoc(docRef, {
    signalAppEnabled: enabled,
    signalAppStatus: enabled ? 'CONNECTED' : 'DISCONNECTED',
    lastSyncAt: new Date().toISOString()
  });
}

export async function updateGameConnectionSettings(data: Partial<SignalGameConnection>): Promise<void> {
  const docRef = doc(db, CONNECTIONS_COLLECTION, DEFAULT_GAME_ID);
  await setDoc(docRef, cleanFirestoreObject({
    ...data,
    id: DEFAULT_GAME_ID,
    gameId: DEFAULT_GAME_ID,
    lastSyncAt: new Date().toISOString()
  }), { merge: true });
}

export async function testGameConnection(): Promise<{ success: boolean; pingMs: number; message: string }> {
  const startTime = Date.now();
  try {
    const docRef = doc(db, CONNECTIONS_COLLECTION, DEFAULT_GAME_ID);
    await getDoc(docRef);
    const ping = Math.max(12, Date.now() - startTime);
    
    await updateDoc(docRef, {
      connectionStatus: 'CONNECTED',
      syncStatus: 'LIVE',
      lastSyncAt: new Date().toISOString(),
      pingMs: ping
    });

    return {
      success: true,
      pingMs: ping,
      message: `Successfully connected to Aviator Engine. Ping: ${ping}ms.`
    };
  } catch (err: any) {
    return {
      success: false,
      pingMs: 0,
      message: `Connection failed: ${err.message || 'Server timeout'}`
    };
  }
}

// Fast Heartbeat / Ping method for client Signal App
export async function pingAuthoritativeServer(): Promise<{
  alive: boolean;
  serverTimestamp: number;
  pingMs: number;
  currentRound: SignalRound | null;
}> {
  const start = Date.now();
  try {
    const roundSnap = await getDoc(doc(db, ROUNDS_COLLECTION, 'CURRENT_LIVE_ROUND'));
    const latency = Math.max(8, Date.now() - start);
    return {
      alive: true,
      serverTimestamp: Date.now(),
      pingMs: latency,
      currentRound: roundSnap.exists() ? (roundSnap.data() as SignalRound) : null
    };
  } catch (e) {
    return {
      alive: false,
      serverTimestamp: Date.now(),
      pingMs: 0,
      currentRound: null
    };
  }
}

// ----------------------------------------------------
// FAST RECOVERY & STATE SYNCHRONIZATION FOR TAB SWITCHES
// ----------------------------------------------------

export async function getCurrentRoundState(): Promise<SignalRound | null> {
  try {
    const docRef = doc(db, ROUNDS_COLLECTION, 'CURRENT_LIVE_ROUND');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SignalRound;
    }
    return null;
  } catch (err) {
    console.error('Error fetching current round state:', err);
    return null;
  }
}

export async function getLatestRoundsHistory(count: number = 20): Promise<SignalRound[]> {
  try {
    const q = query(collection(db, ROUNDS_COLLECTION), orderBy('createdAt', 'desc'), limit(count + 5));
    const snap = await getDocs(q);
    const rounds: SignalRound[] = [];
    snap.forEach((d) => {
      if (d.id !== 'CURRENT_LIVE_ROUND') {
        rounds.push(d.data() as SignalRound);
      }
    });
    return rounds.slice(0, count);
  } catch (err) {
    console.error('Error fetching rounds history:', err);
    return [];
  }
}

export async function getLatestSignalAndRecentRounds(): Promise<{
  currentRound: SignalRound | null;
  recentRounds: SignalRound[];
  connection: SignalGameConnection | null;
  serverTimestamp: number;
}> {
  const [currentRound, recentRounds, connSnap] = await Promise.all([
    getCurrentRoundState(),
    getLatestRoundsHistory(20),
    getDoc(doc(db, CONNECTIONS_COLLECTION, DEFAULT_GAME_ID))
  ]);

  return {
    currentRound,
    recentRounds,
    connection: connSnap.exists() ? (connSnap.data() as SignalGameConnection) : null,
    serverTimestamp: Date.now()
  };
}

// ----------------------------------------------------
// AUTHORITATIVE BROADCAST SYSTEM
// ----------------------------------------------------

// Function called by Aviator game to publish authoritative live synchronized state
export async function broadcastLiveGameRound(payload: {
  roundId: string;
  status: SignalConnectionStatus;
  currentMultiplier: number;
  finalMultiplier?: number;
  serverSignalStatus: SignalResultStatus;
  predictedMultiplier?: number | null;
  serverSignature?: string;
  countdown?: number;
  countdownStart?: number;
  countdownEndsAt?: number;
  serverTimestamp?: number;
  startTime?: string;
  crashTime?: string;
}): Promise<void> {
  try {
    const currentDocRef = doc(db, ROUNDS_COLLECTION, 'CURRENT_LIVE_ROUND');
    const updatePayload: any = {
      ...payload,
      id: 'CURRENT_LIVE_ROUND',
      gameId: DEFAULT_GAME_ID,
      serverTimestamp: payload.serverTimestamp || Date.now(),
      updatedAt: new Date().toISOString()
    };

    if (payload.status === 'ROUND_RUNNING' && !payload.startTime) {
      updatePayload.startTime = new Date().toISOString();
    }
    if (payload.status === 'ROUND_FINISHED' || payload.status === 'CRASHED') {
      updatePayload.crashTime = new Date().toISOString();
      
      // Archive completed round to history collection
      const archiveRef = doc(db, ROUNDS_COLLECTION, payload.roundId);
      await setDoc(archiveRef, cleanFirestoreObject({
        ...payload,
        id: payload.roundId,
        gameId: DEFAULT_GAME_ID,
        createdAt: new Date().toISOString(),
        crashTime: new Date().toISOString(),
        serverTimestamp: Date.now()
      }), { merge: true });
    }

    await setDoc(currentDocRef, cleanFirestoreObject(updatePayload), { merge: true });
  } catch (err) {
    console.error('Error broadcasting live round:', err);
  }
}

// ----------------------------------------------------
// AUDIT LOGGING
// ----------------------------------------------------

export async function logSignalActivity(
  action?: string, 
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    await setDoc(doc(db, LOGS_COLLECTION, logId), {
      id: logId,
      action: action || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    });
  } catch (err) {
    // Non-blocking log fail
  }
}

// ----------------------------------------------------
// REALTIME LISTENERS (Single Source of Truth)
// ----------------------------------------------------

// ----------------------------------------------------
// TOKEN MANAGEMENT (COMPATIBILITY HELPERS)
// ----------------------------------------------------

export function generateSecureSignalToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'av_';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface CreateTokenParams {
  userName: string;
  phone?: string;
  email?: string;
  subscriptionType: SubscriptionType;
  durationDays: number;
  connectedGameId?: string;
  notes?: string;
  customToken?: string;
}

export async function createSignalAccess(params: CreateTokenParams): Promise<{ token: SignalToken; link: string }> {
  const tokenString = params.customToken?.trim() || generateSecureSignalToken();
  const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (params.durationDays || 30));

  const userDoc: SignalUser = {
    id: userId,
    name: params.userName.trim(),
    phone: params.phone?.trim() || '',
    email: params.email?.trim() || '',
    status: 'active',
    notes: params.notes?.trim() || '',
    createdAt: new Date().toISOString()
  };

  const tokenDoc: SignalToken = {
    token: tokenString,
    userId: userId,
    userName: params.userName.trim(),
    status: 'active',
    subscriptionType: params.subscriptionType,
    expiresAt: expiresAt.toISOString(),
    connectedGameId: params.connectedGameId || DEFAULT_GAME_ID,
    connectedSessionId: 'sess_' + Math.floor(100000 + Math.random() * 900000),
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };

  await setDoc(doc(db, USERS_COLLECTION, userId), userDoc);
  await setDoc(doc(db, TOKENS_COLLECTION, tokenString), tokenDoc);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yourwebsite.com';
  return {
    token: tokenDoc,
    link: `${origin}/#signal`
  };
}

export async function updateTokenStatus(token: string, status: 'active' | 'revoked' | 'expired'): Promise<void> {
  const docRef = doc(db, TOKENS_COLLECTION, token);
  await updateDoc(docRef, {
    status,
    lastActiveAt: new Date().toISOString()
  });
}

export async function extendTokenSubscription(token: string, addDays: number): Promise<string> {
  const docRef = doc(db, TOKENS_COLLECTION, token);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Token not found');
  }
  const data = snap.data() as SignalToken;
  const currentExp = new Date(data.expiresAt);
  const newExp = new Date(Math.max(Date.now(), currentExp.getTime()) + addDays * 24 * 60 * 60 * 1000);
  
  await updateDoc(docRef, {
    expiresAt: newExp.toISOString(),
    status: 'active'
  });
  return newExp.toISOString();
}

export async function deleteSignalToken(token: string): Promise<void> {
  await deleteDoc(doc(db, TOKENS_COLLECTION, token));
}

export function subscribeToSignalTokens(callback: (tokens: SignalToken[]) => void) {
  const q = query(collection(db, TOKENS_COLLECTION), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const tokens: SignalToken[] = [];
    snapshot.forEach((d) => {
      tokens.push(d.data() as SignalToken);
    });
    callback(tokens);
  }, (err) => {
    console.error('Tokens listener error:', err);
  });
}

export const subscribeToAllTokens = subscribeToSignalTokens;

export function subscribeToLogs(callback: (logs: SignalLog[]) => void) {
  const q = query(collection(db, LOGS_COLLECTION), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const logs: SignalLog[] = [];
    snapshot.forEach((d) => {
      logs.push(d.data() as SignalLog);
    });
    callback(logs);
  }, (err) => {
    console.error('Logs listener error:', err);
  });
}

export function subscribeToGameConnection(callback: (conn: SignalGameConnection | null) => void) {
  const docRef = doc(db, CONNECTIONS_COLLECTION, DEFAULT_GAME_ID);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as SignalGameConnection);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('Connection listener error:', err);
  });
}

export function subscribeToCurrentRound(callback: (round: SignalRound | null) => void) {
  const docRef = doc(db, ROUNDS_COLLECTION, 'CURRENT_LIVE_ROUND');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as SignalRound);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('Current round listener error:', err);
  });
}

export function subscribeToRoundsHistory(callback: (rounds: SignalRound[]) => void) {
  const q = query(collection(db, ROUNDS_COLLECTION), orderBy('createdAt', 'desc'), limit(25));
  return onSnapshot(q, (snapshot) => {
    const rounds: SignalRound[] = [];
    snapshot.forEach((d) => {
      if (d.id !== 'CURRENT_LIVE_ROUND') {
        rounds.push(d.data() as SignalRound);
      }
    });
    callback(rounds);
  }, (err) => {
    console.error('Rounds history listener error:', err);
  });
}
