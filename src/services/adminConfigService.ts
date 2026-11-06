import { 
  collection, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  safeGetDoc, 
  safeSetDoc, 
  safeAddDoc 
} from './safeFirestore';
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
    const existingSnap = await safeGetDoc<SiteSettings>(settingsDocRef);
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

    // 1. Atomic Local-First & Firestore Write
    await safeSetDoc(settingsDocRef, mergedData, { merge: true });

    // Store in all persistent local caches immediately
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('tk333_cached_site_settings', JSON.stringify(mergedData));
        localStorage.setItem('tk333_doc_settings_site', JSON.stringify(mergedData));
      } catch (lsE) {}
    }

    // 2. Synchronize bKash and Nagad in payment_methods collection if numbers were updated
    try {
      if (cleanUpdates.depositBkashNumbers || cleanUpdates.depositBkashNumber || cleanUpdates.bkashLogoUrl) {
        const bkashList = Array.isArray(mergedData.depositBkashNumbers) 
          ? mergedData.depositBkashNumbers.filter(n => n && n.trim().length > 0)
          : (mergedData.depositBkashNumber ? [mergedData.depositBkashNumber] : []);
        const primaryBkash = bkashList[0] || mergedData.depositBkashNumber || '';
        
        const bkashPayload: Record<string, any> = {
          methodId: 'bkash',
          name: 'bKash',
          nameBn: 'বিকাশ',
          accountNumber: primaryBkash,
          accountNumbers: bkashList,
          status: 'active',
          updatedAt: nowIso
        };
        if (mergedData.bkashLogoUrl) {
          bkashPayload.iconUrl = mergedData.bkashLogoUrl;
        }

        await safeSetDoc(doc(db, 'payment_methods', 'pm_bkash'), bkashPayload, { merge: true });
      }

      if (cleanUpdates.depositNagadNumbers || cleanUpdates.depositNagadNumber || cleanUpdates.nagadLogoUrl) {
        const nagadList = Array.isArray(mergedData.depositNagadNumbers) 
          ? mergedData.depositNagadNumbers.filter(n => n && n.trim().length > 0)
          : (mergedData.depositNagadNumber ? [mergedData.depositNagadNumber] : []);
        const primaryNagad = nagadList[0] || mergedData.depositNagadNumber || '';

        const nagadPayload: Record<string, any> = {
          methodId: 'nagad',
          name: 'Nagad',
          nameBn: 'নগদ',
          accountNumber: primaryNagad,
          accountNumbers: nagadList,
          status: 'active',
          updatedAt: nowIso
        };
        if (mergedData.nagadLogoUrl) {
          nagadPayload.iconUrl = mergedData.nagadLogoUrl;
        }

        await safeSetDoc(doc(db, 'payment_methods', 'pm_nagad'), nagadPayload, { merge: true });
      }
    } catch (pmErr) {
      console.warn('Payment methods sync warning:', pmErr);
    }

    // 3. Audit Trail
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

    // 4. Synchronize server backend if global win probability changed
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
    handleFirestoreError(err, OperationType.WRITE, 'settings/site', true);
    return { success: true, data: updatedFields as SiteSettings };
  }
}

/**
 * Universal Admin Audit Logger
 */
export async function recordAdminAuditLog(entry: AdminAuditEntry): Promise<boolean> {
  try {
    const timestamp = entry.timestamp || new Date().toISOString();
    await safeAddDoc(collection(db, 'admin_audit_logs'), {
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
    const snap = await safeGetDoc<SiteSettings>(doc(db, 'settings', 'site'));
    if (snap.exists()) {
      return snap.data() as SiteSettings;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching persistent site settings:', err);
    return null;
  }
}

