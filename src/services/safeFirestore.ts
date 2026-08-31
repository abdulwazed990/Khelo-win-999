import { 
  doc, 
  getDoc, 
  getDocFromCache, 
  getDocFromServer,
  getDocs, 
  getDocsFromCache, 
  getDocsFromServer,
  DocumentReference, 
  Query, 
  DocumentSnapshot, 
  QuerySnapshot,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, isQuotaExceededError } from '../firebase';

// Memory cache dictionary with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryDocCache = new Map<string, CacheEntry<any>>();
const memoryQueryCache = new Map<string, CacheEntry<any[]>>();
const DEFAULT_TTL_MS = 1000 * 60 * 5; // 5 minutes cache

/**
 * Safely fetch a single document with multiple layers of fallback:
 * 1. In-Memory Cache (Immediate 0ms response, 0 Firestore reads)
 * 2. Firestore Offline / Persistent Cache
 * 3. Firestore Server
 * 4. LocalStorage Emergency Fallback
 */
export async function safeGetDoc<T = any>(
  docRef: DocumentReference,
  options: { forceServer?: boolean; ttlMs?: number; fallbackData?: T } = {}
): Promise<{ exists: () => boolean; data: () => T | undefined; fromCache?: boolean; id: string }> {
  const path = docRef.path;
  const now = Date.now();
  const ttl = options.ttlMs || DEFAULT_TTL_MS;

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

  // 2. Try Firestore cache first to save quota
  if (!options.forceServer) {
    try {
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap.exists()) {
        const data = cacheSnap.data() as T;
        memoryDocCache.set(path, { data, timestamp: now });
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

  // 3. Query Firestore
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as T;
      memoryDocCache.set(path, { data, timestamp: now });
      try {
        localStorage.setItem(`tk333_doc_${path.replace(/\//g, '_')}`, JSON.stringify(data));
      } catch (lsErr) {}
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
    console.warn(`SafeGetDoc notice for [${path}]:`, err?.message || err);

    // If quota exceeded or offline, check localStorage fallback
    try {
      const lsRaw = localStorage.getItem(`tk333_doc_${path.replace(/\//g, '_')}`);
      if (lsRaw) {
        const data = JSON.parse(lsRaw) as T;
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
 * Safely subscribe with automatic quota and error recovery
 */
export function safeOnSnapshot<T = any>(
  docRefOrQuery: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): Unsubscribe {
  try {
    return onSnapshot(
      docRefOrQuery,
      (snapshot) => {
        onNext(snapshot);
      },
      (error) => {
        console.warn('safeOnSnapshot fallback notice:', error?.message);
        if (onError) {
          onError(error);
        }
      }
    );
  } catch (err) {
    console.warn('safeOnSnapshot initialization notice:', err);
    return () => {};
  }
}
