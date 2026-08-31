import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  SiteSettings, 
  AdminAuditEntry, 
  GameItem, 
  BannerItem, 
  PromotionItem, 
  CategoryItem, 
  AnnouncementItem,
  PaymentMethodConfig
} from '../types';

/**
 * Single source of truth for Site Settings.
 * Ensures changes made by Admin remain active permanently and are never auto-reverted.
 */
export async function saveSiteSettings(
  updatedFields: Partial<SiteSettings>,
  adminEmail: string = 'admin@tk333.vip'
): Promise<{ success: boolean; data?: SiteSettings; error?: string }> {
  try {
    const settingsDocRef = doc(db, 'settings', 'site');
    const existingSnap = await getDoc(settingsDocRef);
    const existingData: Partial<SiteSettings> = existingSnap.exists() ? (existingSnap.data() as SiteSettings) : {};

    const nextVersion = (existingData.configVersion || 0) + 1;
    const nowIso = new Date().toISOString();

    // Protect against destructive null/undefined values by creating clean merged object
    const cleanUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(updatedFields)) {
      if (v !== undefined) {
        cleanUpdates[k] = v;
      }
    }

    const mergedData: SiteSettings = {
      ...existingData,
      ...cleanUpdates,
      configVersion: nextVersion,
      updatedAt: nowIso,
      updatedBy: adminEmail
    };

    // 1. Atomic Firestore Write
    await setDoc(settingsDocRef, mergedData, { merge: true });

    // 2. Audit Trail
    const changedKeys = Object.keys(cleanUpdates);
    const details = `Admin ${adminEmail} updated site settings (Version ${nextVersion}). Fields modified: ${changedKeys.join(', ')}`;
    
    await recordAdminAuditLog({
      action: 'SITE_SETTINGS_UPDATED',
      targetType: 'SITE_SETTINGS',
      targetId: 'site',
      adminEmail,
      details,
      previousValue: existingData,
      newValue: cleanUpdates,
      metadata: {
        version: nextVersion,
        modifiedKeys: changedKeys
      },
      timestamp: nowIso
    });

    // 3. Synchronize server backend if global win probability changed
    if (cleanUpdates.globalWinProbability !== undefined) {
      try {
        await fetch('/api/settings/game-probability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            globalWinProbability: cleanUpdates.globalWinProbability,
            adminEmail
          })
        });
      } catch (e) {
        console.warn('Backend probability sync notice:', e);
      }
    }

    return { success: true, data: mergedData };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/site');
    return { success: false, error: err?.message || 'Failed to save site settings permanently.' };
  }
}

/**
 * Universal Admin Audit Logger
 */
export async function recordAdminAuditLog(entry: AdminAuditEntry): Promise<boolean> {
  try {
    const timestamp = entry.timestamp || new Date().toISOString();
    await addDoc(collection(db, 'admin_audit_logs'), {
      ...entry,
      timestamp,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (err) {
    console.warn('Failed to record admin audit log:', err);
    return false;
  }
}

/**
 * Fetch current persistent site settings with fallback
 */
export async function getPersistentSiteSettings(): Promise<SiteSettings | null> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'site'));
    if (snap.exists()) {
      return snap.data() as SiteSettings;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching persistent site settings:', err);
    return null;
  }
}
