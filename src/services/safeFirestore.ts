import { 
  doc, 
  getDoc, 
  getDocFromCache, 
  getDocFromServer,
  getDocs, 
  getDocsFromCache, 
  getDocsFromServer,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  DocumentReference, 
  CollectionReference,
  Query, 
  DocumentSnapshot, 
  QuerySnapshot,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, isQuotaExceededError } from '../firebase';

// Memory cache dictionary with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PendingMutation {
  id: string;
  type: 'set' | 'update' | 'add' | 'delete';
  path: string;
  data?: any;
  options?: any;
  timestamp: number;
  retries: number;
}

const memoryDocCache = new Map<string, CacheEntry<any>>();
const memoryCollectionCache = new Map<string, CacheEntry<any[]>>();
const DEFAULT_TTL_MS = 1000 * 60 * 10; // 10 minutes cache
const PENDING_WRITES_KEY = 'tk333_pending_firestore_writes';
const QUOTA_STATE_KEY = 'tk333_firestore_quota_exhausted';

// --- Quota State Management ---
let isQuotaExhaustedState = typeof window !== 'undefined' ? localStorage.getItem(QUOTA_STATE_KEY) === 'true' : false;
const quotaListeners = new Set<(isExhausted: boolean) => void>();

export function isQuotaExhausted(): boolean {
  return isQuotaExhaustedState;
}

export function setQuotaExhaustedState(exhausted: boolean) {
  if (isQuotaExhaustedState !== exhausted) {
    isQuotaExhaustedState = exhausted;
    try {
      if (exhausted) {
        localStorage.setItem(QUOTA_STATE_KEY, 'true');
      } else {
        localStorage.removeItem(QUOTA_STATE_KEY);
      }
    } catch (e) {}
    quotaListeners.forEach(fn => {
      try { fn(exhausted); } catch (err) {}
    });
  }
}

export function subscribeToQuotaState(listener: (isExhausted: boolean) => void): () => void {
  quotaListeners.add(listener);
  listener(isQuotaExhaustedState);
  return () => quotaListeners.delete(listener);
}

// --- Pending Mutations Queue (Offline & Quota write persistence) ---
function getPendingMutations(): PendingMutation[] {
  try {
    const raw = localStorage.getItem(PENDING_WRITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function savePendingMutations(list: PendingMutation[]) {
  try {
    localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(list));
  } catch (e) {}
}

function queueMutation(mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retries'>) {
  const list = getPendingMutations();
  list.push({
    ...mutation,
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    retries: 0
  });
  savePendingMutations(list);
}

// --- Background Sync Engine ---
let isSyncing = false;

export async function flushPendingMutations(): Promise<{ synced: number; remaining: number }> {
  if (isSyncing) return { synced: 0, remaining: getPendingMutations().length };
  
  const pending = getPendingMutations();
  if (pending.length === 0) return { synced: 0, remaining: 0 };

  isSyncing = true;
  let syncedCount = 0;
  const remainingList: PendingMutation[] = [];

  for (const item of pending) {
    try {
      if (item.type === 'set') {
        const parts = item.path.split('/');
        if (parts.length >= 2) {
          const docRef = doc(db, parts[0], ...parts.slice(1));
          await setDoc(docRef, item.data, item.options || { merge: true });
          syncedCount++;
        }
      } else if (item.type === 'update') {
        const parts = item.path.split('/');
        if (parts.length >= 2) {
          const docRef = doc(db, parts[0], ...parts.slice(1));
          await updateDoc(docRef, item.data);
          syncedCount++;
        }
      } else if (item.type === 'delete') {
        const parts = item.path.split('/');
        if (parts.length >= 2) {
          const docRef = doc(db, parts[0], ...parts.slice(1));
          await deleteDoc(docRef);
          syncedCount++;
        }
      } else if (item.type === 'add') {
        const colRef = collection(db, item.path);
        await addDoc(colRef, {
          ...item.data,
          createdAt: serverTimestamp()
        });
        syncedCount++;
      }
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        setQuotaExhaustedState(true);
        remainingList.push({ ...item, retries: item.retries + 1 });
        // Quota is still exceeded, pause flush
        break;
      } else {
        // Drop or retry if non-quota fatal error after 5 retries
        if (item.retries < 5) {
          remainingList.push({ ...item, retries: item.retries + 1 });
        }
      }
    }
  }

  // Preserve remaining items that weren't synced yet
  const unattempted = pending.slice(syncedCount + remainingList.length);
  savePendingMutations([...remainingList, ...unattempted]);
  isSyncing = false;

  if (syncedCount > 0 && isQuotaExhaustedState) {
    setQuotaExhaustedState(false);
  }

  return { synced: syncedCount, remaining: getPendingMutations().length };
}

// Background auto-sync interval (every 45s or when tab regains focus)
if (typeof window !== 'undefined') {
  setInterval(() => {
    flushPendingMutations().catch(() => {});
  }, 45000);

  window.addEventListener('online', () => {
    setQuotaExhaustedState(false);
    flushPendingMutations().catch(() => {});
  });

  window.addEventListener('focus', () => {
    flushPendingMutations().catch(() => {});
  });
}

// --- Document Level Operations (Local-First + Safe Fallbacks) ---

/**
 * Safely fetch a single document with multiple layers of fallback:
 * 1. In-Memory Cache (Immediate 0ms response, 0 Firestore reads)
 * 2. Persistent LocalStorage fallback
 * 3. Firestore cache / server
 */
export async function safeGetDoc<T = any>(
  docRef: DocumentReference,
  options: { forceServer?: boolean; ttlMs?: number; fallbackData?: T } = {}
): Promise<{ exists: () => boolean; data: () => T | undefined; fromCache?: boolean; id: string }> {
  const path = docRef.path;
  const now = Date.now();
  const ttl = options.ttlMs || DEFAULT_TTL_MS;
  const lsKey = `tk333_doc_${path.replace(/\//g, '_')}`;

  // 1. Check in-memory cache if not forcing server
  if (!options.forceServer && memoryDocCache.has(path)) {
    const cached = memoryDocCache.get(path)!;
    if (now - cached.timestamp < ttl && cached.data !== undefined) {
      return {
        id: docRef.id,
        exists: () => cached.data !== null,
        data: () => cached.data,
        fromCache: true
      };
    }
  }

  // 2. If quota is known to be exhausted, immediately serve from localStorage
  if (isQuotaExhaustedState && !options.forceServer) {
    try {
      const lsRaw = localStorage.getItem(lsKey);
      if (lsRaw) {
        const data = JSON.parse(lsRaw) as T;
        memoryDocCache.set(path, { data, timestamp: now });
        return {
          id: docRef.id,
          exists: () => true,
          data: () => data,
          fromCache: true
        };
      }
    } catch (e) {}

    if (options.fallbackData !== undefined) {
      return {
        id: docRef.id,
        exists: () => options.fallbackData !== null,
        data: () => options.fallbackData,
        fromCache: true
      };
    }
  }

  // 3. Try Firestore cache first to save quota
  if (!options.forceServer) {
    try {
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap.exists()) {
        const data = cacheSnap.data() as T;
        memoryDocCache.set(path, { data, timestamp: now });
        try { localStorage.setItem(lsKey, JSON.stringify(data)); } catch (e) {}
        return {
          id: cacheSnap.id,
          exists: () => true,
          data: () => data,
          fromCache: true
        };
      }
    } catch (e) {
      // Not in client cache yet, proceed to normal getDoc
    }
  }

  // 4. Query Firestore Server
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as T;
      memoryDocCache.set(path, { data, timestamp: now });
      try {
        localStorage.setItem(lsKey, JSON.stringify(data));
      } catch (lsErr) {}
      if (isQuotaExhaustedState) setQuotaExhaustedState(false);
      return {
        id: snap.id,
        exists: () => true,
        data: () => data,
        fromCache: false
      };
    } else {
      memoryDocCache.set(path, { data: null, timestamp: now });
      return {
        id: docRef.id,
        exists: () => false,
        data: () => undefined,
        fromCache: false
      };
    }
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExhaustedState(true);
    }

    // Check localStorage fallback
    try {
      const lsRaw = localStorage.getItem(lsKey);
      if (lsRaw) {
        const data = JSON.parse(lsRaw) as T;
        memoryDocCache.set(path, { data, timestamp: now });
        return {
          id: docRef.id,
          exists: () => true,
          data: () => data,
          fromCache: true
        };
      }
    } catch (e) {}

    // Fallback data provided by caller
    if (options.fallbackData !== undefined) {
      return {
        id: docRef.id,
        exists: () => options.fallbackData !== null,
        data: () => options.fallbackData,
        fromCache: true
      };
    }

    return {
      id: docRef.id,
      exists: () => false,
      data: () => undefined,
      fromCache: true
    };
  }
}

/**
 * Safely fetch a collection of documents with localStorage cache fallback
 */
export async function safeGetDocs<T = any>(
  colRefOrQuery: any,
  collectionName: string,
  options: { forceServer?: boolean; ttlMs?: number; fallbackList?: T[] } = {}
): Promise<{ docs: Array<{ id: string; data: () => T }>; fromCache?: boolean }> {
  const now = Date.now();
  const ttl = options.ttlMs || DEFAULT_TTL_MS;
  const lsKey = `tk333_col_${collectionName}`;

  // 1. Check in-memory collection cache
  if (!options.forceServer && memoryCollectionCache.has(collectionName)) {
    const cached = memoryCollectionCache.get(collectionName)!;
    if (now - cached.timestamp < ttl && Array.isArray(cached.data)) {
      return {
        docs: cached.data.map((d: any) => ({ id: d.id || '', data: () => d })),
        fromCache: true
      };
    }
  }

  // 2. If quota is exhausted, check localStorage
  if (isQuotaExhaustedState && !options.forceServer) {
    try {
      const lsRaw = localStorage.getItem(lsKey);
      if (lsRaw) {
        const list = JSON.parse(lsRaw) as T[];
        memoryCollectionCache.set(collectionName, { data: list, timestamp: now });
        return {
          docs: list.map((d: any) => ({ id: d.id || '', data: () => d })),
          fromCache: true
        };
      }
    } catch (e) {}
  }

  // 3. Query Firestore with fallback
  try {
    let snap: any;
    try {
      snap = await getDocs(colRefOrQuery);
    } catch (e) {
      snap = await getDocsFromCache(colRefOrQuery);
    }

    const items: any[] = [];
    snap.forEach((d: any) => {
      items.push({ id: d.id, ...d.data() });
    });

    memoryCollectionCache.set(collectionName, { data: items, timestamp: now });
    try {
      localStorage.setItem(lsKey, JSON.stringify(items));
    } catch (e) {}

    if (isQuotaExhaustedState) setQuotaExhaustedState(false);

    return {
      docs: items.map((d) => ({ id: d.id, data: () => d })),
      fromCache: snap.metadata?.fromCache ?? false
    };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExhaustedState(true);
    }

    // Try localStorage
    try {
      const lsRaw = localStorage.getItem(lsKey);
      if (lsRaw) {
        const list = JSON.parse(lsRaw) as T[];
        return {
          docs: list.map((d: any) => ({ id: d.id || '', data: () => d })),
          fromCache: true
        };
      }
    } catch (e) {}

    if (options.fallbackList) {
      return {
        docs: options.fallbackList.map((d: any) => ({ id: d.id || '', data: () => d })),
        fromCache: true
      };
    }

    return { docs: [], fromCache: true };
  }
}

/**
 * Safely writes a document (Local-First immediate update + persistent queue sync)
 */
export async function safeSetDoc(
  docRef: DocumentReference,
  data: any,
  options: any = { merge: true }
): Promise<boolean> {
  const path = docRef.path;
  const lsKey = `tk333_doc_${path.replace(/\//g, '_')}`;

  // 1. Immediately apply to local caches
  const mergedData = options?.merge && memoryDocCache.has(path)
    ? { ...(memoryDocCache.get(path)?.data || {}), ...data }
    : data;

  memoryDocCache.set(path, { data: mergedData, timestamp: Date.now() });
  try {
    localStorage.setItem(lsKey, JSON.stringify(mergedData));
  } catch (e) {}

  // 2. Try persisting to Firestore
  try {
    await setDoc(docRef, data, options);
    if (isQuotaExhaustedState) setQuotaExhaustedState(false);
    return true;
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExhaustedState(true);
    }
    // Queue mutation for automatic background synchronization
    queueMutation({
      type: 'set',
      path,
      data,
      options
    });
    return true;
  }
}

/**
 * Safely updates a document with local-first cache and fallback queue
 */
export async function safeUpdateDoc(
  docRef: DocumentReference,
  data: any
): Promise<boolean> {
  const path = docRef.path;
  const lsKey = `tk333_doc_${path.replace(/\//g, '_')}`;

  const currentData = memoryDocCache.get(path)?.data || {};
  const updated = { ...currentData, ...data };
  memoryDocCache.set(path, { data: updated, timestamp: Date.now() });
  try {
    localStorage.setItem(lsKey, JSON.stringify(updated));
  } catch (e) {}

  try {
    await updateDoc(docRef, data);
    if (isQuotaExhaustedState) setQuotaExhaustedState(false);
    return true;
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExhaustedState(true);
    }
    queueMutation({
      type: 'update',
      path,
      data
    });
    return true;
  }
}

/**
 * Safely add a document to collection with local-first cache and fallback queue
 */
export async function safeAddDoc(
  colRef: CollectionReference,
  data: any
): Promise<{ id: string; success: boolean }> {
  const colPath = colRef.path;
  const tempId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const itemWithId = { id: tempId, ...data };

  // Update memory collection cache if available
  if (memoryCollectionCache.has(colPath)) {
    const list = memoryCollectionCache.get(colPath)!.data || [];
    memoryCollectionCache.set(colPath, { data: [itemWithId, ...list], timestamp: Date.now() });
  }

  try {
    const res = await addDoc(colRef, data);
    if (isQuotaExhaustedState) setQuotaExhaustedState(false);
    return { id: res.id, success: true };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExhaustedState(true);
    }
    queueMutation({
      type: 'add',
      path: colPath,
      data
    });
    return { id: tempId, success: true };
  }
}

/**
 * Safely subscribe with immediate cached payload and automatic quota error shield
 */
export function safeOnSnapshot<T = any>(
  docRefOrQuery: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void,
  fallbackCacheKey?: string
): Unsubscribe {
  // Pre-feed cached data if available for zero-latency UI
  if (fallbackCacheKey) {
    try {
      const lsRaw = localStorage.getItem(`tk333_doc_${fallbackCacheKey.replace(/\//g, '_')}`);
      if (lsRaw) {
        const cachedObj = JSON.parse(lsRaw);
        onNext({
          exists: () => true,
          data: () => cachedObj,
          id: fallbackCacheKey.split('/').pop() || '',
          metadata: { fromCache: true }
        });
      }
    } catch (e) {}
  }

  try {
    return onSnapshot(
      docRefOrQuery,
      (snapshot) => {
        if (isQuotaExhaustedState) setQuotaExhaustedState(false);
        onNext(snapshot);
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          setQuotaExhaustedState(true);
        }
        console.warn('safeOnSnapshot notice (handled gracefully):', error?.message || error);
        if (onError) {
          try { onError(error); } catch (e) {}
        }
      }
    );
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExhaustedState(true);
    }
    console.warn('safeOnSnapshot initialization shield:', err);
    return () => {};
  }
}

