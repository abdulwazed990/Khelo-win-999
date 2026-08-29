import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { GameItem, GameStatus } from '../types';

export type NormalizedGameStatus = 'ACTIVE' | 'MAINTENANCE' | 'SERVER_ERROR' | 'DISABLED';

export interface GameStatusInfo {
  gameId: string;
  gameTitle: string;
  status: NormalizedGameStatus;
  isAvailable: boolean;
  reason?: string;
  maintenanceTitle?: string;
  maintenanceDescription?: string;
  maintenanceEstimatedTime?: string;
  maintenanceButtonText?: string;
  updatedAt?: string;
  updatedBy?: string;
  game?: GameItem;
}

/**
 * Maps any legacy or case-variant status string to authoritative uppercase enum
 */
export function normalizeGameStatus(status?: string | null | { status?: string; gameStatus?: string }): NormalizedGameStatus {
  if (!status) return 'ACTIVE';
  if (typeof status === 'object' && status !== null) {
    const candidate = status.gameStatus || status.status;
    return normalizeGameStatus(candidate);
  }
  const clean = String(status).trim().toUpperCase();
  if (clean === 'SERVER_ERROR' || clean === 'SERVER ERROR' || clean === 'ERROR' || clean === '500') {
    return 'SERVER_ERROR';
  }
  if (clean === 'MAINTENANCE' || clean === 'MAINT') {
    return 'MAINTENANCE';
  }
  if (clean === 'DISABLED' || clean === 'INACTIVE' || clean === 'DISABLE') {
    return 'DISABLED';
  }
  if (clean === 'ACTIVE') {
    return 'ACTIVE';
  }
  return 'ACTIVE';
}

/**
 * Returns whether a game is open for gameplay
 */
export function isGameStatusAvailable(status?: string | null): boolean {
  return normalizeGameStatus(status) === 'ACTIVE';
}

/**
 * Matches game identifier to known game ID / route / slug
 */
export function matchGameIdentifier(game: GameItem, identifier: string): boolean {
  if (!identifier) return false;
  const id = identifier.toLowerCase().trim();
  const gameId = (game.id || '').toLowerCase();
  const route = (game.route || '').toLowerCase();
  const slug = (game.slug || '').toLowerCase();
  const title = (game.title || game.name || '').toLowerCase();

  return (
    gameId === id ||
    route === id ||
    slug === id ||
    title === id ||
    gameId.includes(id) ||
    route.includes(id) ||
    id.includes(route)
  );
}

/**
 * Direct lookup for a game's status from Firestore with Fail-Safe fallback
 */
export async function fetchGameStatus(identifier: string): Promise<GameStatusInfo> {
  try {
    // 1. Try direct doc get by ID
    const directDocRef = doc(db, 'games', identifier);
    const directSnap = await getDoc(directDocRef);
    
    if (directSnap.exists()) {
      const data = { id: directSnap.id, ...directSnap.data() } as GameItem;
      const status = normalizeGameStatus(data.status);
      return {
        gameId: data.id,
        gameTitle: data.title || data.name || identifier,
        status,
        isAvailable: status === 'ACTIVE',
        reason: data.statusReason,
        maintenanceTitle: data.maintenanceTitle,
        maintenanceDescription: data.maintenanceDescription,
        maintenanceEstimatedTime: data.maintenanceEstimatedTime,
        maintenanceButtonText: data.maintenanceButtonText,
        updatedAt: data.statusUpdatedAt,
        updatedBy: data.statusUpdatedBy,
        game: data
      };
    }

    // 2. Query by route or slug or title
    const gamesSnap = await getDocs(collection(db, 'games'));
    let matchedGame: GameItem | null = null;

    gamesSnap.forEach((d) => {
      const g = { id: d.id, ...d.data() } as GameItem;
      if (matchGameIdentifier(g, identifier)) {
        matchedGame = g;
      }
    });

    if (matchedGame) {
      const g = matchedGame as GameItem;
      const status = normalizeGameStatus(g.status);
      return {
        gameId: g.id,
        gameTitle: g.title || g.name || identifier,
        status,
        isAvailable: status === 'ACTIVE',
        reason: g.statusReason,
        maintenanceTitle: g.maintenanceTitle,
        maintenanceDescription: g.maintenanceDescription,
        maintenanceEstimatedTime: g.maintenanceEstimatedTime,
        maintenanceButtonText: g.maintenanceButtonText,
        updatedAt: g.statusUpdatedAt,
        updatedBy: g.statusUpdatedBy,
        game: g
      };
    }

    // Fail-safe: If not found in custom list, check default fallback
    return {
      gameId: identifier,
      gameTitle: identifier,
      status: 'ACTIVE',
      isAvailable: true
    };
  } catch (err) {
    console.error('Error fetching game status:', err);
    // Security Fail-Safe: If database is unreachable, do not allow uncontrolled entry
    return {
      gameId: identifier,
      gameTitle: identifier,
      status: 'SERVER_ERROR',
      isAvailable: false,
      reason: 'Network connectivity or database status check failed. Access blocked for safety.'
    };
  }
}

/**
 * Real-time listener for a specific game's status
 */
export function subscribeToGameStatus(
  identifier: string,
  onUpdate: (info: GameStatusInfo) => void
): () => void {
  const gamesCollection = collection(db, 'games');

  const unsubscribe = onSnapshot(
    gamesCollection,
    (snapshot) => {
      let matchedGame: GameItem | null = null;
      snapshot.forEach((d) => {
        const g = { id: d.id, ...d.data() } as GameItem;
        if (matchGameIdentifier(g, identifier)) {
          matchedGame = g;
        }
      });

      if (matchedGame) {
        const g = matchedGame as GameItem;
        const status = normalizeGameStatus(g.status);
        onUpdate({
          gameId: g.id,
          gameTitle: g.title || g.name || identifier,
          status,
          isAvailable: status === 'ACTIVE',
          reason: g.statusReason,
          maintenanceTitle: g.maintenanceTitle,
          maintenanceDescription: g.maintenanceDescription,
          maintenanceEstimatedTime: g.maintenanceEstimatedTime,
          maintenanceButtonText: g.maintenanceButtonText,
          updatedAt: g.statusUpdatedAt,
          updatedBy: g.statusUpdatedBy,
          game: g
        });
      } else {
        // If not found in collection, default to active
        onUpdate({
          gameId: identifier,
          gameTitle: identifier,
          status: 'ACTIVE',
          isAvailable: true
        });
      }
    },
    (error) => {
      console.warn('Game status subscription error:', error);
      // Fail safe on error
      onUpdate({
        gameId: identifier,
        gameTitle: identifier,
        status: 'SERVER_ERROR',
        isAvailable: false,
        reason: 'Lost connection to game status server.'
      });
    }
  );

  return unsubscribe;
}

/**
 * Update a game's status in Firestore with Audit Logging
 */
export async function updateGameStatus(
  gameId: string,
  newStatus: NormalizedGameStatus,
  reason: string = '',
  adminEmail: string = 'admin@tk333.vip',
  customConfig?: {
    maintenanceTitle?: string;
    maintenanceTitleBn?: string;
    maintenanceDescription?: string;
    maintenanceDescriptionBn?: string;
    maintenanceEstimatedTime?: string;
    maintenanceButtonText?: string;
    maintenanceButtonTextBn?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const gameRef = doc(db, 'games', gameId);
    const prevSnap = await getDoc(gameRef);
    let prevStatus = 'ACTIVE';
    let gameTitle = gameId;

    if (prevSnap.exists()) {
      const data = prevSnap.data() as GameItem;
      prevStatus = normalizeGameStatus(data.status);
      gameTitle = data.title || data.name || gameId;
    }

    const timestamp = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status: newStatus,
      gameStatus: newStatus,
      statusReason: reason || '',
      statusUpdatedAt: timestamp,
      statusUpdatedBy: adminEmail,
      updatedAt: serverTimestamp()
    };

    if (customConfig) {
      if (customConfig.maintenanceTitle !== undefined) updatePayload.maintenanceTitle = customConfig.maintenanceTitle;
      if (customConfig.maintenanceTitleBn !== undefined) updatePayload.maintenanceTitleBn = customConfig.maintenanceTitleBn;
      if (customConfig.maintenanceDescription !== undefined) updatePayload.maintenanceDescription = customConfig.maintenanceDescription;
      if (customConfig.maintenanceDescriptionBn !== undefined) updatePayload.maintenanceDescriptionBn = customConfig.maintenanceDescriptionBn;
      if (customConfig.maintenanceEstimatedTime !== undefined) updatePayload.maintenanceEstimatedTime = customConfig.maintenanceEstimatedTime;
      if (customConfig.maintenanceButtonText !== undefined) updatePayload.maintenanceButtonText = customConfig.maintenanceButtonText;
      if (customConfig.maintenanceButtonTextBn !== undefined) updatePayload.maintenanceButtonTextBn = customConfig.maintenanceButtonTextBn;
    }

    await updateDoc(gameRef, updatePayload);

    // Record in Admin Audit Logs
    try {
      await addDoc(collection(db, 'admin_audit_logs'), {
        adminEmail,
        adminId: adminEmail,
        gameId,
        previousStatus: prevStatus,
        newStatus,
        reason: reason || '',
        action: 'GAME_STATUS_CHANGED',
        targetId: gameId,
        targetType: 'GAME',
        details: `Game "${gameTitle}" (${gameId}) status changed: ${prevStatus} -> ${newStatus}. Reason: ${reason || 'None specified'}`,
        metadata: {
          gameId,
          gameTitle,
          previousStatus: prevStatus,
          newStatus,
          reason: reason || '',
          ...customConfig
        },
        timestamp
      });
    } catch (auditErr) {
      console.warn('Failed to write game status audit log:', auditErr);
    }

    return { success: true };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
    return { success: false, error: err?.message || 'Failed to update game status.' };
  }
}
