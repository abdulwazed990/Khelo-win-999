import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy,
  increment,
  getDocs
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import { 
  BannerItem, 
  CategoryItem, 
  GameItem, 
  PromotionItem, 
  AnnouncementItem, 
  SiteSettings, 
  Transaction,
  UserData,
  HomeAdItem,
  PaymentMethodConfig
} from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { uploadImageToStorage, deleteImageFromStorage, sanitizeImageUrl } from '../../services/storageService';
import { haptics } from '../../utils/haptics';
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Check, 
  X, 
  Image as ImageIcon, 
  Sliders, 
  Gamepad2, 
  Layers, 
  Gift, 
  Megaphone, 
  Settings as SettingsIcon, 
  DollarSign, 
  CheckCircle2, 
  XCircle,
  Loader2,
  ExternalLink,
  Globe,
  Camera,
  Smartphone,
  Save,
  RefreshCw,
  Phone,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  LayoutDashboard,
  Menu,
  LogOut,
  CreditCard,
  Share2,
  Users,
  Copy,
  Link as LinkIcon,
  AlertTriangle,
  Sparkles,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ServerCrash,
  Wrench,
  ShieldAlert,
  AlertOctagon,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateGameStatus, normalizeGameStatus, NormalizedGameStatus } from '../../services/gameStatusService';
import SignalManagementTab from './SignalManagementTab';
import WithdrawalsTab from './WithdrawalsTab';
import DepositsTab from './DepositsTab';
import AuditLogsTab from './AuditLogsTab';
import TransactionsLedgerTab from './TransactionsLedgerTab';

interface AdminPanelProps {
  user: User | null;
  userData: UserData | null;
  onBack: () => void;
}

type TabType = 
  | 'overview' 
  | 'withdrawals'
  | 'deposits'
  | 'transactions'
  | 'audit_logs'
  | 'banners' 
  | 'home_ads' 
  | 'games' 
  | 'categories' 
  | 'promotions' 
  | 'announcements' 
  | 'payment_methods' 
  | 'signal_management'
  | 'settings' 
  | 'users';

const PRESET_BANNERS = [
  { label: 'Bkash Bonus', url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&auto=format&fit=crop&q=80' },
  { label: 'VIP Jackpot', url: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Live Roulette', url: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Cricket & Sports', url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Golden Slots', url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&auto=format&fit=crop&q=80' },
];

const PRESET_GAMES = [
  { label: 'Super Ace', url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80' },
  { label: 'Aviator Crash', url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80' },
  { label: 'VIP Blackjack', url: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=600&auto=format&fit=crop&q=80' },
  { label: 'Dragon Tiger', url: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=600&auto=format&fit=crop&q=80' },
  { label: 'Cricket BPL', url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Crazy Time', url: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600&auto=format&fit=crop&q=80' },
];

const PRESET_PAYMENTS = [
  { label: 'Bkash', url: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Bkash_logo.png' },
  { label: 'Nagad', url: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Nagad_Logo.png' },
  { label: 'Rocket', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/DBBL_Rocket_Logo.svg/512px-DBBL_Rocket_Logo.svg.png' },
  { label: 'Upay', url: 'https://play-lh.googleusercontent.com/r_z_9H2vK1L_xYg_0Jv5Wl8sFfH6X1_qK1n7C9eY4V7D1aN5fX6-K9qP1_Z3m6H4yA=w240-h480-rw' },
  { label: 'USDT', url: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
];

interface ImagePickerControlProps {
  label: string;
  imageUrl: string;
  folder: 'banners' | 'games' | 'categories' | 'promotions' | 'home_ads' | 'payment_methods' | 'logos';
  aspectRatio?: '21/9' | '4/3' | '1/1';
  presets?: { label: string; url: string }[];
  uploading: boolean;
  onSelectFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeUrl: (url: string) => void;
  onClear: () => void;
  lang: 'bn' | 'en';
}

function ImagePickerControl({
  label,
  imageUrl,
  folder,
  aspectRatio = '21/9',
  presets = [],
  uploading,
  onSelectFile,
  onChangeUrl,
  onClear,
  lang,
}: ImagePickerControlProps) {
  const [loadError, setLoadError] = useState(false);
  const [rawInput, setRawInput] = useState(imageUrl);

  // Sync internal input on prop change
  useEffect(() => {
    setRawInput(imageUrl);
    setLoadError(false);
  }, [imageUrl]);

  const handleInputChange = (val: string) => {
    setRawInput(val);
    const clean = sanitizeImageUrl(val);
    setLoadError(false);
    onChangeUrl(clean);
  };

  const aspectClass = aspectRatio === '4/3' ? 'aspect-[4/3] max-w-[200px] mx-auto' : aspectRatio === '1/1' ? 'aspect-square max-w-[120px] mx-auto' : 'aspect-[21/9] w-full';

  return (
    <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          <ImageIcon size={13} className="text-blue-600" />
          <span>{label}</span>
        </label>
        {imageUrl && (
          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            {loadError ? (lang === 'bn' ? '⚠️ লিঙ্ক এরর' : '⚠️ Link Error') : (lang === 'bn' ? '✓ রেডি' : '✓ Active')}
          </span>
        )}
      </div>

      {/* Visual Preview Box */}
      {imageUrl ? (
        <div className={`relative ${aspectClass} rounded-xl overflow-hidden border-2 ${loadError ? 'border-amber-400 bg-amber-50/50' : 'border-slate-300 bg-slate-100'} shadow-inner group`}>
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={() => setLoadError(true)}
            onLoad={() => setLoadError(false)}
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg shadow-md text-xs font-bold transition-all"
            title={lang === 'bn' ? 'ছবি মুছুন' : 'Remove Image'}
          >
            <Trash2 size={13} />
          </button>
          {loadError && (
            <div className="absolute inset-0 bg-slate-900/80 p-2.5 flex flex-col items-center justify-center text-center text-white">
              <AlertTriangle size={18} className="text-amber-400 mb-1" />
              <p className="text-[10px] font-bold text-amber-200">
                {lang === 'bn' ? 'ছবির লিঙ্কটি লোড করা যায়নি' : 'Image URL failed to load'}
              </p>
              <p className="text-[9px] text-slate-300">
                {lang === 'bn' ? 'নিচ থেকে ফাইল সিলেক্ট করুন বা সরাসরি লিঙ্ক দিন' : 'Please upload file or paste direct image link'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className={`relative ${aspectClass} rounded-xl border-2 border-dashed border-slate-300 bg-slate-100/70 flex flex-col items-center justify-center text-slate-400 text-xs p-3 text-center`}>
          <ImageIcon size={22} className="mb-1 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-500">
            {lang === 'bn' ? 'কোনো ছবি নির্বাচিত নেই' : 'No image selected'}
          </span>
        </div>
      )}

      {/* Action Controls: 1. File Upload button, 2. Direct Link Input */}
      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* File Picker from Gallery/Device */}
          <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-blue-500 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold cursor-pointer transition-all active:scale-98">
            {uploading ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <Camera size={16} />}
            <span>{uploading ? (lang === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...') : (lang === 'bn' ? 'গ্যালারি থেকে ছবি দিন' : 'Upload from Device')}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={onSelectFile}
            />
          </label>

          {/* Paste URL Input */}
          <div className="relative flex items-center">
            <input
              type="text"
              value={rawInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={lang === 'bn' ? 'অথবা ছবির সরাসরি লিঙ্ক (URL)' : 'Or paste direct Image URL'}
              className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            <LinkIcon size={12} className="absolute left-2.5 text-slate-400" />
          </div>
        </div>

        {/* 1-Click Preset Gallery */}
        {presets.length > 0 && (
          <div className="pt-1">
            <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" />
              <span>{lang === 'bn' ? 'তাত্ক্ষণিক রেডিমেড কভার (১-ক্লিক):' : 'Ready Covers (1-Click):'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInputChange(preset.url)}
                  className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold shadow-2xs transition-colors flex items-center gap-1"
                >
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel({ user, userData, onBack }: AdminPanelProps) {
  const { lang, setLanguage, toggleLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Real-time Firestore States
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [homeAds, setHomeAds] = useState<HomeAdItem[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form Modals / Edit states
  const [editingBanner, setEditingBanner] = useState<Partial<BannerItem> | null>(null);
  const [editingHomeAd, setEditingHomeAd] = useState<Partial<HomeAdItem> | null>(null);
  const [editingGame, setEditingGame] = useState<Partial<GameItem> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<CategoryItem> | null>(null);
  const [editingPromo, setEditingPromo] = useState<Partial<PromotionItem> | null>(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<Partial<PaymentMethodConfig> | null>(null);
  const [announcementTextBn, setAnnouncementTextBn] = useState<string>('');
  const [announcementTextEn, setAnnouncementTextEn] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Server Error & Game Status Control States
  const [quickErrorGame, setQuickErrorGame] = useState<GameItem | null>(null);
  const [quickErrorReason, setQuickErrorReason] = useState<string>('');
  const [statusConfigGame, setStatusConfigGame] = useState<GameItem | null>(null);
  const [statusConfigForm, setStatusConfigForm] = useState<{
    status: NormalizedGameStatus;
    reason: string;
    maintenanceTitle: string;
    maintenanceTitleBn: string;
    maintenanceDescription: string;
    maintenanceDescriptionBn: string;
    maintenanceEstimatedTime: string;
    maintenanceButtonText: string;
    maintenanceButtonTextBn: string;
  }>({
    status: 'ACTIVE',
    reason: '',
    maintenanceTitle: '',
    maintenanceTitleBn: '',
    maintenanceDescription: '',
    maintenanceDescriptionBn: '',
    maintenanceEstimatedTime: '',
    maintenanceButtonText: '',
    maintenanceButtonTextBn: ''
  });
  const [gameStatusFilter, setGameStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SERVER_ERROR' | 'MAINTENANCE' | 'DISABLED'>('ALL');
  const [updatingGameStatusId, setUpdatingGameStatusId] = useState<string | null>(null);
  const [cardSelectedStatus, setCardSelectedStatus] = useState<Record<string, NormalizedGameStatus>>({});

  const showToast = (msg: string) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  const handleCopyAdminLink = () => {
    haptics.success();
    const origin = window.location.origin;
    const adminUrl = `${origin}/#admin`;
    navigator.clipboard.writeText(adminUrl);
    setCopiedLink(true);
    showToast(lang === 'bn' ? '✓ অ্যাডমিন সিক্রেট লিংক কপি হয়েছে!' : '✓ Admin Secret Link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAdminLogout = () => {
    haptics.medium();
    sessionStorage.removeItem('tk333_admin_auth');
    localStorage.removeItem('tk333_admin_auth');
    signOut(auth);
    onBack();
  };

  // 1. Listen to Banners
  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: BannerItem[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as BannerItem));
      setBanners(list);
    }, (err) => console.warn('Banners load error', err));
    return () => unsub();
  }, []);

  // 2. Listen to Home Ads
  useEffect(() => {
    const q = query(collection(db, 'home_ads'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: HomeAdItem[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as HomeAdItem));
      setHomeAds(list);
    }, (err) => console.warn('Home ads error', err));
    return () => unsub();
  }, []);

  // 3. Listen to Games
  useEffect(() => {
    const q = query(collection(db, 'games'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: GameItem[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as GameItem));
      setGames(list);
    }, (err) => console.warn('Games load error', err));
    return () => unsub();
  }, []);

  // 4. Listen to Categories
  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: CategoryItem[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as CategoryItem));
      setCategories(list);
    }, (err) => console.warn('Categories load error', err));
    return () => unsub();
  }, []);

  // 5. Listen to Promotions
  useEffect(() => {
    const q = query(collection(db, 'promotions'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: PromotionItem[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as PromotionItem));
      setPromotions(list);
    }, (err) => console.warn('Promotions load error', err));
    return () => unsub();
  }, []);

  // 6. Listen to Payment Methods
  useEffect(() => {
    const q = query(collection(db, 'payment_methods'), orderBy('sortOrder', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: PaymentMethodConfig[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as PaymentMethodConfig));
      setPaymentMethods(list);
    }, (err) => console.warn('Payment methods error', err));
    return () => unsub();
  }, []);

  // 7. Listen to Announcements
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = { id: docSnap.id, ...docSnap.data() } as AnnouncementItem;
        setAnnouncement(data);
        setAnnouncementTextBn(data.textBn || data.text || '');
        setAnnouncementTextEn(data.textEn || data.text || '');
      }
    }, (err) => console.warn('Announcement error', err));
    return () => unsub();
  }, []);

  // 8. Listen to Settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SiteSettings);
      }
    }, (err) => console.warn('Settings error', err));
    return () => unsub();
  }, []);

  // 9. Listen to Transactions
  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as Transaction));
      setTransactions(list);
      setLoading(false);
    }, (err) => {
      console.warn('Transactions load error', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 10. Listen to Users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: UserData[] = [];
      snapshot.forEach(d => list.push({ uid: d.id, ...d.data() } as UserData));
      setUsersList(list);
    }, () => {});
    return () => unsub();
  }, []);

  // Handle Image File Selection from Phone Gallery / Desktop
  const handleImageFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: 'banners' | 'games' | 'categories' | 'promotions' | 'home_ads' | 'payment_methods' | 'logos',
    onComplete: (url: string, path: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    haptics.medium();
    setUploadingImage(true);

    try {
      const result = await uploadImageToStorage(file, folder);
      onComplete(result.url, result.path);
      showToast(lang === 'bn' ? '✓ ছবি সফলভাবে আপলোড হয়েছে!' : '✓ Image uploaded successfully!');
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(lang === 'bn' ? 'ছবি আপলোড করতে ব্যর্থ হয়েছে।' : 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // BANNER OPERATIONS
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.imageUrl) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে ব্যানার ছবি নির্বাচন করুন।' : 'Please select or upload a banner image.');
      return;
    }
    haptics.medium();

    try {
      const bannerId = editingBanner.id || `banner_${Date.now()}`;
      const docRef = doc(db, 'banners', bannerId);
      const dataToSave = {
        title: editingBanner.title || 'Special Promotion',
        titleBn: editingBanner.titleBn || editingBanner.title || 'বিশেষ অফার',
        subtitle: editingBanner.subtitle || '',
        subtitleBn: editingBanner.subtitleBn || '',
        imageUrl: editingBanner.imageUrl,
        storagePath: editingBanner.storagePath || '',
        badge: editingBanner.badge || 'HOT',
        badgeBn: editingBanner.badgeBn || 'হট',
        ctaLink: editingBanner.ctaLink || 'promotion',
        order: Number(editingBanner.order) || (banners.length + 1),
        active: editingBanner.active !== false,
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, dataToSave, { merge: true });
      showToast(lang === 'bn' ? 'ব্যানার সফলভাবে সংরক্ষণ করা হয়েছে!' : 'Banner saved successfully!');
      setEditingBanner(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'banners');
    }
  };

  const handleDeleteBanner = async (banner: BannerItem) => {
    if (!confirm(lang === 'bn' ? 'আপনি কি এই ব্যানারটি মুছে ফেলতে চান?' : 'Delete this banner?')) return;
    haptics.error();
    try {
      await deleteDoc(doc(db, 'banners', banner.id));
      if (banner.storagePath) {
        await deleteImageFromStorage(banner.storagePath);
      }
      showToast(lang === 'bn' ? 'ব্যানার মুছে ফেলা হয়েছে।' : 'Banner deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `banners/${banner.id}`);
    }
  };

  // HOME AD OPERATIONS
  const handleSaveHomeAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHomeAd || !editingHomeAd.imageUrl) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে বিজ্ঞাপন ছবি দিন।' : 'Please provide an ad image.');
      return;
    }
    haptics.medium();

    try {
      const adId = editingHomeAd.id || `ad_${Date.now()}`;
      const docRef = doc(db, 'home_ads', adId);
      const dataToSave = {
        title: editingHomeAd.title || 'Special Offer',
        titleBn: editingHomeAd.titleBn || 'বিশেষ বিজ্ঞাপন',
        subtitleEn: editingHomeAd.subtitleEn || '',
        subtitleBn: editingHomeAd.subtitleBn || '',
        imageUrl: editingHomeAd.imageUrl,
        storagePath: editingHomeAd.storagePath || '',
        badgeBn: editingHomeAd.badgeBn || 'অফার',
        linkUrl: editingHomeAd.linkUrl || 'promotion',
        order: Number(editingHomeAd.order) || 1,
        active: editingHomeAd.active !== false,
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, dataToSave, { merge: true });
      showToast(lang === 'bn' ? 'হোম অ্যাড সংরক্ষণ করা হয়েছে!' : 'Home Ad saved successfully!');
      setEditingHomeAd(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'home_ads');
    }
  };

  const handleDeleteHomeAd = async (ad: HomeAdItem) => {
    if (!confirm(lang === 'bn' ? 'বিজ্ঞাপনটি মুছে ফেলতে চান?' : 'Delete this ad?')) return;
    haptics.error();
    try {
      await deleteDoc(doc(db, 'home_ads', ad.id));
      showToast(lang === 'bn' ? 'বিজ্ঞাপন মুছে ফেলা হয়েছে।' : 'Ad deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `home_ads/${ad.id}`);
    }
  };

  // GAME OPERATIONS
  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame || !editingGame.title) {
      alert(lang === 'bn' ? 'গেমের নাম লিখুন।' : 'Please enter game name.');
      return;
    }
    haptics.medium();

    try {
      const gameId = editingGame.id || `game_${Date.now()}`;
      const docRef = doc(db, 'games', gameId);
      const normalizedStatus = normalizeGameStatus(editingGame.status);
      const dataToSave = {
        title: editingGame.title,
        titleBn: editingGame.titleBn || editingGame.title,
        name: editingGame.title,
        category: editingGame.category || 'slots',
        provider: editingGame.provider || 'TK333',
        imageUrl: editingGame.imageUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80',
        storagePath: editingGame.storagePath || '',
        rating: editingGame.rating || '9.8',
        hot: editingGame.hot || false,
        popular: editingGame.popular || false,
        featured: editingGame.featured || false,
        status: normalizedStatus,
        gameStatus: normalizedStatus,
        statusReason: editingGame.statusReason || '',
        maintenanceTitle: editingGame.maintenanceTitle || '',
        maintenanceTitleBn: editingGame.maintenanceTitleBn || '',
        maintenanceDescription: editingGame.maintenanceDescription || '',
        maintenanceDescriptionBn: editingGame.maintenanceDescriptionBn || '',
        maintenanceEstimatedTime: editingGame.maintenanceEstimatedTime || '',
        order: Number(editingGame.order) || (games.length + 1),
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, dataToSave, { merge: true });
      showToast(lang === 'bn' ? 'গেম সফলভাবে সংরক্ষণ করা হয়েছে!' : 'Game saved successfully!');
      setEditingGame(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'games');
    }
  };

  // 1-Click Game Reactivation
  const handleQuickActivateGame = async (game: GameItem) => {
    haptics.success();
    setUpdatingGameStatusId(game.id);
    const adminEmail = user?.email || userData?.email || 'admin@tk333.vip';
    const res = await updateGameStatus(game.id, 'ACTIVE', 'Admin reactivated game', adminEmail);
    
    // Synchronize Express Server Status
    try {
      await fetch(`/api/games/${encodeURIComponent(game.id)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE', reason: 'Admin reactivated game' })
      });
      if (game.slug || game.route) {
        await fetch(`/api/games/${encodeURIComponent(game.slug || game.route || '')}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE', reason: 'Admin reactivated game' })
        });
      }
    } catch (e) {
      console.warn('Backend status sync notice:', e);
    }

    setUpdatingGameStatusId(null);
    if (res.success) {
      showToast(lang === 'bn' ? `✓ "${game.titleBn || game.title}" সক্রিয় করা হয়েছে!` : `✓ "${game.title}" is now ACTIVE!`);
    } else {
      alert(res.error || 'Failed to activate game');
    }
  };

  // Confirm Quick Server Error
  const handleConfirmQuickServerError = async () => {
    if (!quickErrorGame) return;
    haptics.error();
    setUpdatingGameStatusId(quickErrorGame.id);
    const adminEmail = user?.email || userData?.email || 'admin@tk333.vip';
    const reason = quickErrorReason.trim() || 'Technical server error & engine calibration';
    const res = await updateGameStatus(quickErrorGame.id, 'SERVER_ERROR', reason, adminEmail);

    // Synchronize Express Server Status
    try {
      await fetch(`/api/games/${encodeURIComponent(quickErrorGame.id)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SERVER_ERROR', reason })
      });
      if (quickErrorGame.slug || quickErrorGame.route) {
        await fetch(`/api/games/${encodeURIComponent(quickErrorGame.slug || quickErrorGame.route || '')}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SERVER_ERROR', reason })
        });
      }
    } catch (e) {
      console.warn('Backend status sync notice:', e);
    }

    setUpdatingGameStatusId(null);
    setQuickErrorGame(null);
    setQuickErrorReason('');
    if (res.success) {
      showToast(lang === 'bn' ? `🔴 "${quickErrorGame.titleBn || quickErrorGame.title}" সার্ভার এরর মোডে নেওয়া হয়েছে!` : `🔴 "${quickErrorGame.title}" is now in SERVER ERROR mode!`);
    } else {
      alert(res.error || 'Failed to set server error');
    }
  };

  // Direct Card Status Dropdown Save Handler
  const handleSaveCardStatus = async (game: GameItem) => {
    const currentStatus = normalizeGameStatus(game.status);
    const targetStatus = cardSelectedStatus[game.id] || currentStatus;

    if (targetStatus === currentStatus) {
      showToast(lang === 'bn' ? 'স্ট্যাটাস ইতিমধ্যে অপরিবর্তিত।' : 'Status is already set to ' + targetStatus);
      return;
    }

    if (targetStatus === 'SERVER_ERROR') {
      setQuickErrorGame(game);
      setQuickErrorReason(game.statusReason || 'Technical server error & engine calibration');
      return;
    }

    haptics.medium();
    setUpdatingGameStatusId(game.id);
    const adminEmail = user?.email || userData?.email || 'admin@tk333.vip';
    const reason = targetStatus === 'MAINTENANCE' 
      ? (game.statusReason || 'Routine scheduled maintenance') 
      : targetStatus === 'DISABLED' 
      ? 'Game disabled by admin' 
      : 'Admin reactivated game';

    const res = await updateGameStatus(game.id, targetStatus, reason, adminEmail);

    try {
      await fetch(`/api/games/${encodeURIComponent(game.id)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, reason })
      });
      if (game.slug || game.route) {
        await fetch(`/api/games/${encodeURIComponent(game.slug || game.route || '')}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus, reason })
        });
      }
    } catch (e) {
      console.warn('Backend status sync notice:', e);
    }

    setUpdatingGameStatusId(null);
    if (res.success) {
      showToast(lang === 'bn' ? `✓ "${game.titleBn || game.title}" স্ট্যাটাস ${targetStatus} করা হয়েছে!` : `✓ "${game.title}" status saved to ${targetStatus}!`);
    } else {
      alert(res.error || 'Failed to update game status.');
    }
  };

  // Open Status & Maintenance Config Modal
  const handleOpenStatusConfig = (game: GameItem) => {
    haptics.selection();
    setStatusConfigGame(game);
    setStatusConfigForm({
      status: normalizeGameStatus(game.status),
      reason: game.statusReason || '',
      maintenanceTitle: game.maintenanceTitle || '',
      maintenanceTitleBn: game.maintenanceTitleBn || '',
      maintenanceDescription: game.maintenanceDescription || '',
      maintenanceDescriptionBn: game.maintenanceDescriptionBn || '',
      maintenanceEstimatedTime: game.maintenanceEstimatedTime || '',
      maintenanceButtonText: game.maintenanceButtonText || '',
      maintenanceButtonTextBn: game.maintenanceButtonTextBn || ''
    });
  };

  // Save Status & Maintenance Config
  const handleSaveStatusConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusConfigGame) return;
    haptics.medium();
    setUpdatingGameStatusId(statusConfigGame.id);
    const adminEmail = user?.email || userData?.email || 'admin@tk333.vip';
    const res = await updateGameStatus(
      statusConfigGame.id,
      statusConfigForm.status,
      statusConfigForm.reason,
      adminEmail,
      {
        maintenanceTitle: statusConfigForm.maintenanceTitle,
        maintenanceTitleBn: statusConfigForm.maintenanceTitleBn,
        maintenanceDescription: statusConfigForm.maintenanceDescription,
        maintenanceDescriptionBn: statusConfigForm.maintenanceDescriptionBn,
        maintenanceEstimatedTime: statusConfigForm.maintenanceEstimatedTime,
        maintenanceButtonText: statusConfigForm.maintenanceButtonText,
        maintenanceButtonTextBn: statusConfigForm.maintenanceButtonTextBn
      }
    );

    // Sync Express Server Status
    try {
      await fetch(`/api/games/${encodeURIComponent(statusConfigGame.id)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusConfigForm.status,
          reason: statusConfigForm.reason,
          maintenanceTitle: statusConfigForm.maintenanceTitle,
          maintenanceDescription: statusConfigForm.maintenanceDescription,
          maintenanceEstimatedTime: statusConfigForm.maintenanceEstimatedTime
        })
      });
      if (statusConfigGame.slug || statusConfigGame.route) {
        await fetch(`/api/games/${encodeURIComponent(statusConfigGame.slug || statusConfigGame.route || '')}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: statusConfigForm.status,
            reason: statusConfigForm.reason
          })
        });
      }
    } catch (e) {
      console.warn('Backend status sync notice:', e);
    }

    setUpdatingGameStatusId(null);
    setStatusConfigGame(null);
    if (res.success) {
      showToast(lang === 'bn' ? '✓ গেম স্ট্যাটাস ও সেটিংস আপডেট হয়েছে!' : '✓ Game status and config updated!');
    } else {
      alert(res.error || 'Failed to update game status config');
    }
  };

  const handleDeleteGame = async (game: GameItem) => {
    if (!confirm(lang === 'bn' ? 'গেমটি মুছে ফেলতে চান?' : 'Delete this game?')) return;
    haptics.error();
    try {
      await deleteDoc(doc(db, 'games', game.id));
      showToast(lang === 'bn' ? 'গেম মুছে ফেলা হয়েছে।' : 'Game deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `games/${game.id}`);
    }
  };

  // PAYMENT METHOD OPERATIONS
  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentMethod || !editingPaymentMethod.methodId || !editingPaymentMethod.name) {
      alert(lang === 'bn' ? 'পদ্ধতির নাম ও আইডি দিন।' : 'Please enter payment method name and ID.');
      return;
    }
    haptics.medium();

    try {
      const mId = editingPaymentMethod.id || `pm_${editingPaymentMethod.methodId.toLowerCase()}`;
      const docRef = doc(db, 'payment_methods', mId);
      const dataToSave = {
        methodId: editingPaymentMethod.methodId.toLowerCase(),
        name: editingPaymentMethod.name,
        nameBn: editingPaymentMethod.nameBn || editingPaymentMethod.name,
        iconUrl: editingPaymentMethod.iconUrl || '',
        storagePath: editingPaymentMethod.storagePath || '',
        accountNumber: editingPaymentMethod.accountNumber || '',
        status: editingPaymentMethod.status || 'active',
        sortOrder: Number(editingPaymentMethod.sortOrder) || (paymentMethods.length + 1),
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, dataToSave, { merge: true });
      showToast(lang === 'bn' ? 'পেমেন্ট মেথড কনফিগারেশন সংরক্ষিত হয়েছে!' : 'Payment method configuration saved!');
      setEditingPaymentMethod(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'payment_methods');
    }
  };

  const handleDeletePaymentMethod = async (pm: PaymentMethodConfig) => {
    if (!confirm(lang === 'bn' ? 'পেমেন্ট মেথডটি মুছে ফেলতে চান?' : 'Delete payment method?')) return;
    haptics.error();
    try {
      await deleteDoc(doc(db, 'payment_methods', pm.id));
      showToast(lang === 'bn' ? 'পেমেন্ট মেথড সরানো হয়েছে।' : 'Payment method removed.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `payment_methods/${pm.id}`);
    }
  };

  // PROMOTIONS OPERATIONS
  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo || !editingPromo.title) {
      alert(lang === 'bn' ? 'প্রমোশন শিরোনাম দিন।' : 'Enter promo title.');
      return;
    }
    haptics.medium();

    try {
      const pId = editingPromo.id || `promo_${Date.now()}`;
      const docRef = doc(db, 'promotions', pId);
      const dataToSave = {
        title: editingPromo.title,
        titleBn: editingPromo.titleBn || editingPromo.title,
        titleEn: editingPromo.titleEn || editingPromo.title,
        description: editingPromo.description || '',
        descriptionBn: editingPromo.descriptionBn || editingPromo.description || '',
        descriptionEn: editingPromo.descriptionEn || editingPromo.description || '',
        imageUrl: editingPromo.imageUrl || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600&auto=format&fit=crop&q=80',
        storagePath: editingPromo.storagePath || '',
        badge: editingPromo.badge || 'PROMO',
        bonusCode: editingPromo.bonusCode || 'TK333',
        order: Number(editingPromo.order) || (promotions.length + 1),
        active: editingPromo.active !== false,
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, dataToSave, { merge: true });
      showToast(lang === 'bn' ? 'প্রমোশন সফলভাবে সংরক্ষিত!' : 'Promotion saved successfully!');
      setEditingPromo(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'promotions');
    }
  };

  const handleDeletePromotion = async (promo: PromotionItem) => {
    if (!confirm(lang === 'bn' ? 'প্রমোশনটি মুছবেন?' : 'Delete promo?')) return;
    haptics.error();
    try {
      await deleteDoc(doc(db, 'promotions', promo.id));
      showToast(lang === 'bn' ? 'প্রমোশন মুছে ফেলা হয়েছে।' : 'Promotion deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `promotions/${promo.id}`);
    }
  };

  // ANNOUNCEMENT SAVE
  const handleSaveAnnouncement = async () => {
    haptics.medium();
    try {
      const docRef = doc(db, 'announcements', announcement?.id || 'main');
      await setDoc(docRef, {
        text: announcementTextBn || announcementTextEn,
        textBn: announcementTextBn,
        textEn: announcementTextEn,
        active: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast(lang === 'bn' ? 'ঘোষণা সফলভাবে আপডেট হয়েছে!' : 'Announcement updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'announcements');
    }
  };

  // SETTINGS SAVE
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    haptics.medium();
    try {
      const docRef = doc(db, 'settings', 'site');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast(lang === 'bn' ? 'ওয়েবসাইট সেটিংস সফলভাবে আপডেট হয়েছে!' : 'Settings updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/site');
    }
  };

  // TRANSACTION ACTIONS (Approve / Reject)
  const handleTransactionAction = async (tx: Transaction, action: 'approved' | 'rejected') => {
    haptics.medium();
    try {
      const txRef = doc(db, 'transactions', tx.id);
      await updateDoc(txRef, {
        status: action,
        processedAt: new Date().toISOString()
      });

      // If Deposit is approved, credit user wallet
      if (tx.type === 'deposit' && action === 'approved') {
        const userRef = doc(db, 'users', tx.uid);
        await updateDoc(userRef, {
          balance: increment(Number(tx.amount))
        });
      }

      // If Withdrawal is rejected, refund amount
      if (tx.type === 'withdraw' && action === 'rejected') {
        const userRef = doc(db, 'users', tx.uid);
        await updateDoc(userRef, {
          balance: increment(Number(tx.amount))
        });
      }

      showToast(lang === 'bn' ? `ট্রানজেকশন ${action === 'approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'} হয়েছে!` : `Transaction ${action}!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${tx.id}`);
    }
  };

  const pendingWithdrawalsCount = transactions.filter(t => (t.type === 'withdraw' || t.type === 'DEMO_WITHDRAWAL') && t.status === 'pending').length;
  const pendingDepositsCount = transactions.filter(t => (t.type === 'deposit' || t.type === 'DEMO_TOPUP') && t.status === 'pending').length;

  const navTabs = [
    { id: 'overview' as TabType, labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: LayoutDashboard },
    { id: 'withdrawals' as TabType, labelBn: 'উইথড্র রিকোয়েস্ট', labelEn: 'Withdrawals', icon: ArrowUpRight, badge: pendingWithdrawalsCount },
    { id: 'deposits' as TabType, labelBn: 'ডিপোজিট রিকোয়েস্ট', labelEn: 'Deposits', icon: ArrowDownRight, badge: pendingDepositsCount },
    { id: 'transactions' as TabType, labelBn: 'ট্রানজেকশন লেজার', labelEn: 'Ledger', icon: Wallet },
    { id: 'audit_logs' as TabType, labelBn: 'অডিট লগ', labelEn: 'Audit Logs', icon: ShieldCheck },
    { id: 'banners' as TabType, labelBn: 'ব্যানার ও কভার', labelEn: 'Banners & Cover', icon: ImageIcon },
    { id: 'home_ads' as TabType, labelBn: 'হোম অ্যাড', labelEn: 'Home Ads', icon: Megaphone },
    { id: 'games' as TabType, labelBn: 'গেম ও ছবি', labelEn: 'Games & Covers', icon: Gamepad2 },
    { id: 'payment_methods' as TabType, labelBn: 'পেমেন্ট মেথড', labelEn: 'Payment Methods', icon: CreditCard },
    { id: 'promotions' as TabType, labelBn: 'প্রমোশন অফার', labelEn: 'Promotions', icon: Gift },
    { id: 'announcements' as TabType, labelBn: 'স্ক্রোল ঘোষণা', labelEn: 'Announcements', icon: VolumeIcon },
    { id: 'signal_management' as TabType, labelBn: 'গেম সিগন্যাল', labelEn: 'Game Signal', icon: Radio },
    { id: 'users' as TabType, labelBn: 'ইউজার মেম্বার', labelEn: 'Users List', icon: Users },
    { id: 'settings' as TabType, labelBn: 'ওয়েবসাইট সেটিংস', labelEn: 'Site Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans pb-12 select-none">
      {/* Toast Notification Alert */}
      <AnimatePresence>
        {saveSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-black font-chakra"
          >
            <CheckCircle2 size={16} />
            <span>{saveSuccessMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Admin Navigation Header (Light Theme & Mobile Responsive) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            aria-label="Toggle Admin Menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center p-0.5 shadow-xs">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-amber-400 font-chakra font-black text-xs">
                TK
              </div>
            </div>
            <div>
              <h1 className="font-chakra font-black text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                <span>TK333 VIP</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">ADMIN</span>
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">Content & System Management</p>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Aviator Signal CMS Button */}
          <a
            href="#signal-cms"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/30 active:scale-95 transition-all"
            title="Aviator Signal CMS Controller"
          >
            <Radio size={14} className="animate-pulse" />
            <span className="hidden sm:inline">Signal CMS</span>
          </a>

          {/* Copy Secret Admin Link Button */}
          <button
            onClick={handleCopyAdminLink}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 shadow-xs active:scale-95 transition-all"
            title={lang === 'bn' ? 'অ্যাডমিন সিক্রেট লিংক কপি করুন' : 'Copy Secret Admin Link'}
          >
            {copiedLink ? <CheckCircle2 size={14} className="text-emerald-600" /> : <LinkIcon size={14} />}
            <span className="hidden sm:inline">
              {copiedLink ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'অ্যাডমিন লিংক' : 'Copy Link')}
            </span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => {
              haptics.selection();
              toggleLanguage();
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold"
          >
            <Globe size={13} className="text-amber-500" />
            <span>{lang === 'bn' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* Return to Site Button */}
          <button
            onClick={() => {
              haptics.selection();
              onBack();
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs active:scale-95 transition-all"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">{lang === 'bn' ? 'সাইটে ফিরুন' : 'Back to Site'}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleAdminLogout}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1"
            title={lang === 'bn' ? 'লগআউট' : 'Logout'}
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Horizontal Quick Navigation Bar (100% Mobile Optimized) */}
      <div className="md:hidden sticky top-14 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-2 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-1.5 shadow-2xs">
        {navTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          const title = lang === 'bn' ? t.labelBn : t.labelEn;

          return (
            <button
              key={t.id}
              onClick={() => {
                haptics.selection();
                setActiveTab(t.id);
              }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/70'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-white' : 'text-slate-500'} />
              <span>{title}</span>
              {t.badge && t.badge > 0 ? (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  isActive ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'
                }`}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Main Admin Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col md:flex-row gap-4">
        {/* Left Navigation Sidebar / Mobile Drawer */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 p-4 shadow-xl flex flex-col justify-between transition-transform md:relative md:translate-x-0 md:inset-auto md:w-56 md:rounded-3xl md:border md:shadow-sm md:p-3
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="space-y-1 overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 md:hidden">
              <span className="font-chakra font-black text-sm text-slate-800">অ্যাডমিন মেনু</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {navTabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              const title = lang === 'bn' ? t.labelBn : t.labelEn;

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    haptics.selection();
                    setActiveTab(t.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all select-none ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-black'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{title}</span>
                  </div>
                  {t.badge && t.badge > 0 ? (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                      isActive ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'
                    }`}>
                      {t.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono text-center">
            TK333 Core v3.5 • Firestore Live
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          />
        )}

        {/* Right Content Area */}
        <main className="flex-1 w-full max-w-full overflow-hidden bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm">
          {/* TAB 1: OVERVIEW / DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900">
                    {lang === 'bn' ? 'সিস্টেম ড্যাশবোর্ড ও ওভারভিউ' : 'System Overview & Live Stats'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn' ? 'ক্যাসিনোর সার্বিক ডাটা ও সক্রিয় উপাদান' : 'Real-time aggregated counts from Firestore'}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
                  <div className="flex items-center justify-between text-blue-600 mb-1">
                    <span className="text-[10px] font-bold uppercase">{lang === 'bn' ? 'মোট মেম্বার' : 'Total Users'}</span>
                    <Users size={16} />
                  </div>
                  <span className="text-xl font-black font-rajdhani text-slate-900">{usersList.length}</span>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                  <div className="flex items-center justify-between text-emerald-600 mb-1">
                    <span className="text-[10px] font-bold uppercase">{lang === 'bn' ? 'পেন্ডিং জমা' : 'Pending Deposits'}</span>
                    <DollarSign size={16} />
                  </div>
                  <span className="text-xl font-black font-rajdhani text-emerald-700">
                    {transactions.filter(t => t.type === 'deposit' && t.status === 'pending').length}
                  </span>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl">
                  <div className="flex items-center justify-between text-amber-600 mb-1">
                    <span className="text-[10px] font-bold uppercase">{lang === 'bn' ? 'পেন্ডিং উইথড্র' : 'Pending Withdraws'}</span>
                    <CreditCard size={16} />
                  </div>
                  <span className="text-xl font-black font-rajdhani text-amber-700">
                    {transactions.filter(t => t.type === 'withdraw' && t.status === 'pending').length}
                  </span>
                </div>

                <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl">
                  <div className="flex items-center justify-between text-purple-600 mb-1">
                    <span className="text-[10px] font-bold uppercase">{lang === 'bn' ? 'সক্রিয় গেম' : 'Active Games'}</span>
                    <Gamepad2 size={16} />
                  </div>
                  <span className="text-xl font-black font-rajdhani text-purple-700">{games.length}</span>
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {lang === 'bn' ? 'কুইক অ্যাকশন' : 'Quick Actions'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => { setActiveTab('banners'); setEditingBanner({ active: true, order: banners.length + 1 }); }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left flex items-center gap-2.5 transition-colors"
                  >
                    <Plus size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">{lang === 'bn' ? 'নতুন ব্যানার যোগ করুন' : 'Add New Banner'}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('games'); setEditingGame({ status: 'active', order: games.length + 1 }); }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left flex items-center gap-2.5 transition-colors"
                  >
                    <Plus size={16} className="text-purple-600" />
                    <span className="text-xs font-bold text-slate-800">{lang === 'bn' ? 'নতুন গেম যোগ করুন' : 'Add New Game'}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('home_ads'); setEditingHomeAd({ active: true, order: homeAds.length + 1 }); }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left flex items-center gap-2.5 transition-colors"
                  >
                    <Plus size={16} className="text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">{lang === 'bn' ? 'হোম বিজ্ঞাপন দিন' : 'Add Home Ad'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANNERS & COVER PHOTO MANAGEMENT */}
          {activeTab === 'banners' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900">
                    {lang === 'bn' ? 'ব্যানার ও কভার ফটো ম্যানেজমেন্ট' : 'Banners & Cover Photo Management'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn' ? 'মোবাইল গ্যালারি থেকে ছবি আপলোড করে ক্রমানুসারে সাজান।' : 'Upload permanent banners directly to Firebase Storage.'}
                  </p>
                </div>
                <button
                  onClick={() => setEditingBanner({ active: true, order: banners.length + 1, badge: 'HOT', ctaLink: 'promotion' })}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-chakra font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>{lang === 'bn' ? 'নতুন ব্যানার' : 'Add Banner'}</span>
                </button>
              </div>

              {/* Banners List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {banners.map((banner) => (
                  <div key={banner.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
                    <div className="relative aspect-[21/9] bg-slate-200">
                      <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-2 left-2 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded">
                        #{banner.order} • {banner.badge || 'HOT'}
                      </div>
                      <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-black ${banner.active !== false ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {banner.active !== false ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </div>
                    </div>

                    <div className="p-3 space-y-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 truncate">{banner.titleBn || banner.title}</h4>
                        <p className="text-[10px] text-slate-500 truncate">{banner.subtitleBn || banner.subtitle}</p>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => setEditingBanner(banner)}
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Edit3 size={13} /> {lang === 'bn' ? 'সম্পাদনা' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDeleteBanner(banner)}
                          className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Trash2 size={13} /> {lang === 'bn' ? 'মুছুন' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {banners.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  {lang === 'bn' ? 'কোনো ব্যানার নেই। উপরের বোতাম দিয়ে যোগ করুন।' : 'No banners available. Add one above.'}
                </div>
              )}

              {/* Edit / Add Banner Modal */}
              <AnimatePresence>
                {editingBanner && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="font-chakra font-black text-sm text-slate-900">
                          {editingBanner.id ? (lang === 'bn' ? 'ব্যানার সম্পাদনা' : 'Edit Banner') : (lang === 'bn' ? 'নতুন ব্যানার আপলোড' : 'New Banner')}
                        </h3>
                        <button onClick={() => setEditingBanner(null)} className="p-1 text-slate-400 hover:text-slate-700">
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveBanner} className="space-y-3">
                        <ImagePickerControl
                          label={lang === 'bn' ? 'ব্যানার ছবি (গ্যালারি বা লিঙ্ক দিন):' : 'Banner Image (File or URL):'}
                          imageUrl={editingBanner.imageUrl || ''}
                          folder="banners"
                          aspectRatio="21/9"
                          presets={PRESET_BANNERS}
                          uploading={uploadingImage}
                          lang={lang}
                          onSelectFile={(e) => handleImageFileSelect(e, 'banners', (url, path) => {
                            setEditingBanner(prev => prev ? ({ ...prev, imageUrl: url, storagePath: path }) : null);
                          })}
                          onChangeUrl={(url) => setEditingBanner(prev => prev ? ({ ...prev, imageUrl: url }) : null)}
                          onClear={() => setEditingBanner(prev => prev ? ({ ...prev, imageUrl: '', storagePath: '' }) : null)}
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">{lang === 'bn' ? 'শিরোনাম (বাংলা):' : 'Title (BN):'}</label>
                            <input
                              type="text"
                              value={editingBanner.titleBn || ''}
                              onChange={(e) => setEditingBanner({ ...editingBanner, titleBn: e.target.value })}
                              placeholder="বিকাশ ডিপোজিট বোনাস"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">{lang === 'bn' ? 'শিরোনাম (English):' : 'Title (EN):'}</label>
                            <input
                              type="text"
                              value={editingBanner.title || ''}
                              onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                              placeholder="Bkash Bonus"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">{lang === 'bn' ? 'সাবটাইটেল (বাংলা):' : 'Subtitle (BN):'}</label>
                          <input
                            type="text"
                            value={editingBanner.subtitleBn || ''}
                            onChange={(e) => setEditingBanner({ ...editingBanner, subtitleBn: e.target.value })}
                            placeholder="১০০% ওয়েলকাম বোনাস উপভোগ করুন"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">ব্যাজ (Badge):</label>
                            <input
                              type="text"
                              value={editingBanner.badge || ''}
                              onChange={(e) => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                              placeholder="HOT / VIP"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">ক্রম (Order):</label>
                            <input
                              type="number"
                              value={editingBanner.order || 1}
                              onChange={(e) => setEditingBanner({ ...editingBanner, order: Number(e.target.value) })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">স্ট্যাটাস:</label>
                            <select
                              value={editingBanner.active !== false ? 'true' : 'false'}
                              onChange={(e) => setEditingBanner({ ...editingBanner, active: e.target.value === 'true' })}
                              className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                            >
                              <option value="true">সক্রিয় (Active)</option>
                              <option value="false">নিষ্ক্রিয় (Inactive)</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingBanner(null)}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                          >
                            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingImage}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs"
                          >
                            {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Banner'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 3: HOME ADS MANAGEMENT */}
          {activeTab === 'home_ads' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900">
                    {lang === 'bn' ? 'হোম বিজ্ঞাপন (Home Ads)' : 'Home Advertisement Manager'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn' ? 'মূল পাতার বিশেষ অফার ও বিজ্ঞাপনের ছবি নিয়ন্ত্রণ করুন।' : 'Upload and manage promotion cards shown on the home page.'}
                  </p>
                </div>
                <button
                  onClick={() => setEditingHomeAd({ active: true, order: homeAds.length + 1, badgeBn: 'অফার' })}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-chakra font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>{lang === 'bn' ? 'নতুন বিজ্ঞাপন' : 'Add Ad'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {homeAds.map((ad) => (
                  <div key={ad.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div className="relative aspect-[21/9] bg-slate-200">
                      <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded">
                        {ad.badgeBn || 'অফার'}
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{ad.titleBn || ad.title}</h4>
                        <p className="text-[10px] text-slate-500">{ad.subtitleBn}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingHomeAd(ad)}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteHomeAd(ad)}
                          className="p-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Modal */}
              <AnimatePresence>
                {editingHomeAd && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="font-chakra font-black text-sm text-slate-900">
                          {lang === 'bn' ? 'হোম বিজ্ঞাপন আপলোড' : 'Upload Home Ad'}
                        </h3>
                        <button onClick={() => setEditingHomeAd(null)} className="p-1 text-slate-400 hover:text-slate-700">
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveHomeAd} className="space-y-3">
                        <ImagePickerControl
                          label={lang === 'bn' ? 'বিজ্ঞাপন ছবি (গ্যালারি বা লিঙ্ক দিন):' : 'Ad Image (File or URL):'}
                          imageUrl={editingHomeAd.imageUrl || ''}
                          folder="home_ads"
                          aspectRatio="21/9"
                          presets={PRESET_BANNERS}
                          uploading={uploadingImage}
                          lang={lang}
                          onSelectFile={(e) => handleImageFileSelect(e, 'home_ads', (url, path) => {
                            setEditingHomeAd(prev => prev ? ({ ...prev, imageUrl: url, storagePath: path }) : null);
                          })}
                          onChangeUrl={(url) => setEditingHomeAd(prev => prev ? ({ ...prev, imageUrl: url }) : null)}
                          onClear={() => setEditingHomeAd(prev => prev ? ({ ...prev, imageUrl: '', storagePath: '' }) : null)}
                        />

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">শিরোনাম (বাংলা):</label>
                          <input
                            type="text"
                            value={editingHomeAd.titleBn || ''}
                            onChange={(e) => setEditingHomeAd({ ...editingHomeAd, titleBn: e.target.value })}
                            placeholder="স্পেশাল ক্যাশব্যাক অফার"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">সাবটাইটেল:</label>
                          <input
                            type="text"
                            value={editingHomeAd.subtitleBn || ''}
                            onChange={(e) => setEditingHomeAd({ ...editingHomeAd, subtitleBn: e.target.value })}
                            placeholder="প্রতি ডিপোজিটে ৫% বোনাস"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                          />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingHomeAd(null)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                          >
                            বাতিল
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingImage}
                            className="px-5 py-2 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xs"
                          >
                            সংরক্ষণ
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 4: GAMES & GAME IMAGES & SERVER ERROR CONTROLS */}
          {activeTab === 'games' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900 flex items-center gap-2">
                    <span>{lang === 'bn' ? 'গেম ম্যানেজমেন্ট ও সার্ভার এরর / মেইনটেনেন্স কন্ট্রোল' : 'Game Management & Server Error Controls'}</span>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-mono font-black rounded-full">
                      500 Protection Active
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn' 
                      ? 'যেকোনো গেমকে তাৎক্ষণিকভাবে "Server Error" বা "Maintenance" মোডে নিন। সার্ভার লেভেলে ব্লক করা হবে।' 
                      : 'Real-time server-side game status controls. Instantly block game access with custom error notices.'}
                  </p>
                </div>
                <button
                  onClick={() => setEditingGame({ status: 'ACTIVE', category: 'slots', order: games.length + 1, rating: 9.8 })}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-chakra font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus size={15} />
                  <span>{lang === 'bn' ? 'নতুন গেম যোগ' : 'Add Game'}</span>
                </button>
              </div>

              {/* Status Overview Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button 
                  onClick={() => setGameStatusFilter('ALL')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    gameStatusFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-[10px] font-bold opacity-70 uppercase tracking-wider">{lang === 'bn' ? 'মোট গেম' : 'Total Games'}</div>
                  <div className="text-lg font-black font-chakra mt-0.5">{games.length}</div>
                </button>

                <button 
                  onClick={() => setGameStatusFilter('ACTIVE')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    gameStatusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>{lang === 'bn' ? 'সক্রিয় (ACTIVE)' : 'Active Games'}</span>
                  </div>
                  <div className="text-lg font-black font-chakra mt-0.5">
                    {games.filter(g => normalizeGameStatus(g.status) === 'ACTIVE').length}
                  </div>
                </button>

                <button 
                  onClick={() => setGameStatusFilter('SERVER_ERROR')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    gameStatusFilter === 'SERVER_ERROR' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span>{lang === 'bn' ? 'সার্ভার এরর (ERROR)' : 'Server Error'}</span>
                  </div>
                  <div className="text-lg font-black font-chakra mt-0.5">
                    {games.filter(g => normalizeGameStatus(g.status) === 'SERVER_ERROR').length}
                  </div>
                </button>

                <button 
                  onClick={() => setGameStatusFilter('MAINTENANCE')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    gameStatusFilter === 'MAINTENANCE' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>{lang === 'bn' ? 'রক্ষণাবেক্ষণ (MAINT)' : 'Maintenance'}</span>
                  </div>
                  <div className="text-lg font-black font-chakra mt-0.5">
                    {games.filter(g => normalizeGameStatus(g.status) === 'MAINTENANCE').length}
                  </div>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
                {(['ALL', 'ACTIVE', 'SERVER_ERROR', 'MAINTENANCE', 'DISABLED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setGameStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                      gameStatusFilter === st
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {st === 'ALL' && (lang === 'bn' ? 'সবগুলো' : 'All Games')}
                    {st === 'ACTIVE' && (lang === 'bn' ? '🟢 সক্রিয় (Active)' : '🟢 Active')}
                    {st === 'SERVER_ERROR' && (lang === 'bn' ? '🔴 সার্ভার এরর (Server Error)' : '🔴 Server Error')}
                    {st === 'MAINTENANCE' && (lang === 'bn' ? '🟠 রক্ষণাবেক্ষণ (Maintenance)' : '🟠 Maintenance')}
                    {st === 'DISABLED' && (lang === 'bn' ? '⚪ নিষ্ক্রিয় (Disabled)' : '⚪ Disabled')}
                  </button>
                ))}
              </div>

              {/* Games Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {games
                  .filter((g) => {
                    if (gameStatusFilter === 'ALL') return true;
                    return normalizeGameStatus(g.status) === gameStatusFilter;
                  })
                  .map((g) => {
                    const normStatus = normalizeGameStatus(g.status);
                    const isErr = normStatus === 'SERVER_ERROR';
                    const isMaint = normStatus === 'MAINTENANCE';
                    const isDis = normStatus === 'DISABLED';
                    const isAct = normStatus === 'ACTIVE';
                    const isUpdating = updatingGameStatusId === g.id;

                    return (
                      <div 
                        key={g.id} 
                        className={`bg-white border rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs transition-all ${
                          isErr 
                            ? 'border-rose-300 ring-2 ring-rose-500/20' 
                            : isMaint 
                            ? 'border-amber-300 ring-2 ring-amber-500/20' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="relative aspect-[16/10] bg-slate-200">
                          <img src={g.imageUrl} alt={g.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          
                          {/* Category Badge */}
                          <div className="absolute top-2 left-2 bg-slate-900/80 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-xs">
                            {g.category}
                          </div>

                          {/* Prominent Status Overlay Badge */}
                          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md ${
                            isAct 
                              ? 'bg-emerald-500 text-white' 
                              : isErr 
                              ? 'bg-rose-600 text-white animate-pulse' 
                              : isMaint 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-slate-700 text-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isAct ? 'bg-emerald-200' : 'bg-white'}`} />
                            <span>{normStatus}</span>
                          </div>

                          {/* Reason strip if server error or maintenance */}
                          {(isErr || isMaint) && g.statusReason && (
                            <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur-xs text-white text-[9px] p-1.5 font-mono truncate">
                              ⚠️ {g.statusReason}
                            </div>
                          )}
                        </div>

                        <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-bold text-xs text-slate-900 truncate">{g.titleBn || g.title}</h4>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">{g.provider || 'TK333'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">ID: {g.id}</span>
                          </div>

                          {/* Status Management: Current Status, Change Status Selector, and SAVE Button */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                              <span>{lang === 'bn' ? 'বর্তমান স্ট্যাটাস:' : 'Current Status:'}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                isAct ? 'bg-emerald-100 text-emerald-800' :
                                isErr ? 'bg-rose-100 text-rose-800 animate-pulse' :
                                isMaint ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-200 text-slate-800'
                              }`}>
                                {isAct ? '🟢 ACTIVE' : isErr ? '🔴 SERVER ERROR' : isMaint ? '🟠 MAINTENANCE' : '⚫ DISABLED'}
                              </span>
                            </div>

                            {/* Dropdown Change Status [ Change Status ▼ ] and [ SAVE ] */}
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <select
                                  value={cardSelectedStatus[g.id] || normStatus}
                                  onChange={(e) => setCardSelectedStatus(prev => ({ ...prev, [g.id]: e.target.value as NormalizedGameStatus }))}
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-[10px] font-bold text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                >
                                  <option value="ACTIVE">🟢 ACTIVE</option>
                                  <option value="MAINTENANCE">🟠 MAINTENANCE</option>
                                  <option value="SERVER_ERROR">🔴 SERVER ERROR</option>
                                  <option value="DISABLED">⚫ DISABLED</option>
                                </select>
                              </div>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleSaveCardStatus(g)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-chakra font-black text-[10px] rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
                              >
                                {isUpdating ? <Loader2 size={11} className="animate-spin" /> : (lang === 'bn' ? 'সংরক্ষণ' : 'SAVE')}
                              </button>
                            </div>

                            {/* Quick 1-Click Action Buttons */}
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                              {/* Quick 1-Click Server Error Button */}
                              {normStatus !== 'SERVER_ERROR' ? (
                                <button
                                  disabled={isUpdating}
                                  onClick={() => {
                                    setQuickErrorGame(g);
                                    setQuickErrorReason('RNG engine calibration & technical maintenance');
                                  }}
                                  className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                  title="1-Click Server Error Mode"
                                >
                                  <ServerCrash size={12} className="text-rose-600" />
                                  <span>{lang === 'bn' ? '🔴 সার্ভার এরর' : '🔴 Server Error'}</span>
                                </button>
                              ) : (
                                <div className="py-1.5 px-2 bg-rose-600 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-1 shadow-xs">
                                  <ServerCrash size={12} />
                                  <span>{lang === 'bn' ? 'এরর চালু আছে' : 'ERROR ACTIVE'}</span>
                                </div>
                              )}

                              {/* Quick 1-Click Reactivate Button */}
                              {normStatus !== 'ACTIVE' ? (
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleQuickActivateGame(g)}
                                  className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                  title="Reactivate Game"
                                >
                                  {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} className="text-emerald-600" />}
                                  <span>{lang === 'bn' ? '🟢 সচল করুন' : '🟢 Activate'}</span>
                                </button>
                              ) : (
                                <div className="py-1.5 px-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black flex items-center justify-center gap-1">
                                  <ShieldCheck size={12} className="text-emerald-600" />
                                  <span>{lang === 'bn' ? 'সক্রিয়' : 'ONLINE'}</span>
                                </div>
                              )}
                            </div>

                            {/* Advanced Config / Edit / Delete Row */}
                            <div className="flex items-center justify-between gap-1 pt-1 text-xs">
                              <button
                                onClick={() => handleOpenStatusConfig(g)}
                                className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                              >
                                <Wrench size={11} className="text-slate-500" />
                                <span>{lang === 'bn' ? 'কাস্টম নোটিশ' : 'Notice Config'}</span>
                              </button>

                              <button
                                onClick={() => setEditingGame(g)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Game"
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                onClick={() => handleDeleteGame(g)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Game"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* QUICK SERVER ERROR CONFIRMATION MODAL */}
              <AnimatePresence>
                {quickErrorGame && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.94, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.94, opacity: 0, y: 10 }}
                      className="bg-white border-2 border-rose-300 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                          <ServerCrash size={26} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-chakra font-black text-base text-rose-950">
                            {lang === 'bn' 
                              ? `"${quickErrorGame.titleBn || quickErrorGame.title}" সার্ভার এরর মোডে নিবেন?` 
                              : `Put ${quickErrorGame.title || quickErrorGame.name || 'Game'} into Server Error mode?`}
                          </h3>
                          <p className="text-xs text-rose-700 font-medium mt-0.5">
                            {lang === 'bn'
                              ? 'পুনরায় সক্রিয় না করা পর্যন্ত ব্যবহারকারীরা এই গেমটি খুলতে পারবেন না।'
                              : 'Users will not be able to open this game until it is activated again.'}
                          </p>
                        </div>
                        <button onClick={() => setQuickErrorGame(null)} className="p-1 text-slate-400 hover:text-slate-700">
                          <X size={18} />
                        </button>
                      </div>

                      {/* Security & Access Warning Box */}
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5 text-xs text-rose-900">
                        <div className="font-black flex items-center gap-1.5 text-rose-800">
                          <ShieldAlert size={15} />
                          <span>{lang === 'bn' ? 'সার্ভার-লেভেল সুরক্ষা সক্রিয় হবে' : 'Server-Side Access Rejection'}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-rose-700">
                          {lang === 'bn'
                            ? 'এই গেমটি সার্ভার এরর মোডে নিলে, কোনো ইউজার সরাসরি লিঙ্ক বা বুকমার্ক দিয়েও ঢুকতে পারবে না। সার্ভার 500 স্ক্রিন ও সুরক্ষিত ওয়ালেট নোটিশ প্রদর্শন করবে।'
                            : 'Direct URL visits, bets, and API calls for this game will be strictly rejected. Users will see the 500 Server Error maintenance screen.'}
                        </p>
                      </div>

                      {/* Reason Input */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          {lang === 'bn' ? 'এরর এর কারণ / ডিসপ্লে বার্তা:' : 'Error Reason / Display Notice:'}
                        </label>
                        <input
                          type="text"
                          value={quickErrorReason}
                          onChange={(e) => setQuickErrorReason(e.target.value)}
                          placeholder="RNG engine calibration & technical maintenance"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {['RNG Engine Calibration', 'Emergency Server Maintenance', 'Provider API Downtime', 'Security Audit Check'].map((quick) => (
                            <button
                              key={quick}
                              type="button"
                              onClick={() => setQuickErrorReason(quick)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 text-slate-600 rounded text-[9px] font-bold"
                            >
                              + {quick}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickErrorGame(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                        >
                          {lang === 'bn' ? 'বাতিল (CANCEL)' : 'CANCEL'}
                        </button>
                        <button
                          type="button"
                          disabled={updatingGameStatusId !== null}
                          onClick={handleConfirmQuickServerError}
                          className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-chakra font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {updatingGameStatusId ? <Loader2 size={14} className="animate-spin" /> : <ServerCrash size={14} />}
                          <span>{lang === 'bn' ? '🔴 নিশ্চিত করুন (CONFIRM)' : '🔴 CONFIRM'}</span>
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* ADVANCED STATUS & MAINTENANCE CONFIG MODAL */}
              <AnimatePresence>
                {statusConfigGame && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Wrench className="text-amber-600" size={20} />
                          <div>
                            <h3 className="font-chakra font-black text-sm text-slate-900">
                              {lang === 'bn' ? 'গেম স্ট্যাটাস ও মেইনটেনেন্স নোটিশ কনফিগ' : 'Game Status & Maintenance Settings'}
                            </h3>
                            <span className="text-[10px] text-slate-500 font-bold">
                              {statusConfigGame.titleBn || statusConfigGame.title} (ID: {statusConfigGame.id})
                            </span>
                          </div>
                        </div>
                        <button onClick={() => setStatusConfigGame(null)} className="p-1 text-slate-400 hover:text-slate-700">
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveStatusConfig} className="space-y-3.5">
                        {/* Status Select Buttons */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 block">
                            {lang === 'bn' ? 'গেমের বর্তমান স্ট্যাটাস সিলেক্ট করুন:' : 'Select Authoritative Game Status:'}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { id: 'ACTIVE', label: '🟢 ACTIVE', desc: 'সক্রিয় গেম' },
                              { id: 'SERVER_ERROR', label: '🔴 SERVER ERROR', desc: 'সার্ভার এরর 500' },
                              { id: 'MAINTENANCE', label: '🟠 MAINTENANCE', desc: 'রক্ষণাবেক্ষণ' },
                              { id: 'DISABLED', label: '⚪ DISABLED', desc: 'বন্ধ' }
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setStatusConfigForm({ ...statusConfigForm, status: opt.id as NormalizedGameStatus })}
                                className={`p-2 rounded-xl border text-center font-chakra text-xs font-black transition-all ${
                                  statusConfigForm.status === opt.id
                                    ? opt.id === 'SERVER_ERROR'
                                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                      : opt.id === 'MAINTENANCE'
                                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                      : opt.id === 'ACTIVE'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                      : 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <div>{opt.label}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Status Reason */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">
                            {lang === 'bn' ? 'স্ট্যাটাস পরিবর্তনের কারণ / ইন্টারনাল নোট:' : 'Status Reason / Internal Note:'}
                          </label>
                          <input
                            type="text"
                            value={statusConfigForm.reason}
                            onChange={(e) => setStatusConfigForm({ ...statusConfigForm, reason: e.target.value })}
                            placeholder="e.g., Scheduled server patch or core RNG calibration"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                          />
                        </div>

                        {/* Maintenance Screen Customizations */}
                        <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                          <div className="text-[11px] font-black text-amber-900 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-amber-600" />
                            <span>{lang === 'bn' ? 'ইউজার স্ক্রিনে প্রদর্শিত কাস্টম নোটিশ (ঐচ্ছিক):' : 'Maintenance Screen Notice Customizations (Optional):'}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-600">কাস্টম শিরোনাম (বাংলা):</label>
                              <input
                                type="text"
                                value={statusConfigForm.maintenanceTitleBn}
                                onChange={(e) => setStatusConfigForm({ ...statusConfigForm, maintenanceTitleBn: e.target.value })}
                                placeholder="গেম সার্ভার সংযোগ বিচ্ছিন্ন"
                                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-600">Custom Title (English):</label>
                              <input
                                type="text"
                                value={statusConfigForm.maintenanceTitle}
                                onChange={(e) => setStatusConfigForm({ ...statusConfigForm, maintenanceTitle: e.target.value })}
                                placeholder="Game Server Offline"
                                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">বিস্তারিত বিবরণ (বাংলা / English):</label>
                            <textarea
                              rows={2}
                              value={statusConfigForm.maintenanceDescription}
                              onChange={(e) => setStatusConfigForm({ ...statusConfigForm, maintenanceDescription: e.target.value })}
                              placeholder="কারিগরি ত্রুটির কারণে এই গেমটির সার্ভার সাময়িকভাবে বিচ্ছিন্ন রয়েছে।"
                              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-900"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-600">আনুমানিক সময় (Estimated Duration):</label>
                              <input
                                type="text"
                                value={statusConfigForm.maintenanceEstimatedTime}
                                onChange={(e) => setStatusConfigForm({ ...statusConfigForm, maintenanceEstimatedTime: e.target.value })}
                                placeholder="১৫ মিনিট / 15 mins"
                                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-600">বাটন টেক্সট (Button Text):</label>
                              <input
                                type="text"
                                value={statusConfigForm.maintenanceButtonText}
                                onChange={(e) => setStatusConfigForm({ ...statusConfigForm, maintenanceButtonText: e.target.value })}
                                placeholder="লবিতে ফিরে যান / Back to Lobby"
                                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-900"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setStatusConfigGame(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                          >
                            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                          </button>
                          <button
                            type="submit"
                            disabled={updatingGameStatusId !== null}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-chakra font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                          >
                            {updatingGameStatusId ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            <span>{lang === 'bn' ? 'সংরক্ষণ ও প্রয়োগ' : 'Save & Apply'}</span>
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Edit Game Modal */}
              <AnimatePresence>
                {editingGame && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="font-chakra font-black text-sm text-slate-900">
                          {editingGame.id ? (lang === 'bn' ? 'গেম এডিট' : 'Edit Game') : (lang === 'bn' ? 'নতুন গেম যোগ' : 'Add New Game')}
                        </h3>
                        <button onClick={() => setEditingGame(null)} className="p-1 text-slate-400 hover:text-slate-700">
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveGame} className="space-y-3">
                        {/* Image Preview & Upload Button + Direct URL */}
                        <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                          <label className="text-[11px] font-bold text-slate-700 uppercase block">
                            {lang === 'bn' ? 'গেম কভার ছবি (গ্যালারি বা লিঙ্ক):' : 'Game Cover Image (File or URL):'}
                          </label>

                          {editingGame.imageUrl ? (
                            <div className="relative aspect-[4/3] w-36 mx-auto rounded-xl overflow-hidden border border-slate-300 bg-slate-100">
                              <img src={editingGame.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setEditingGame(prev => prev ? ({ ...prev, imageUrl: '', storagePath: '' }) : null)}
                                className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg shadow-sm text-xs font-bold"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : null}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 text-xs font-bold cursor-pointer transition-colors">
                              {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                              <span>{uploadingImage ? (lang === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...') : (lang === 'bn' ? 'গ্যালারি থেকে সিলেক্ট' : 'Select File')}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingImage}
                                onChange={(e) => handleImageFileSelect(e, 'games', (url, path) => {
                                  setEditingGame(prev => prev ? ({ ...prev, imageUrl: url, storagePath: path }) : null);
                                })}
                              />
                            </label>

                            <input
                              type="text"
                              value={editingGame.imageUrl || ''}
                              onChange={(e) => setEditingGame({ ...editingGame, imageUrl: e.target.value })}
                              placeholder={lang === 'bn' ? 'অথবা ছবির ডিরেক্ট লিঙ্ক (URL)' : 'Or paste Image URL'}
                              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">গেমের নাম (English):</label>
                          <input
                            type="text"
                            required
                            value={editingGame.title || ''}
                            onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
                            placeholder="Super Ace"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">গেমের নাম (বাংলা):</label>
                          <input
                            type="text"
                            value={editingGame.titleBn || ''}
                            onChange={(e) => setEditingGame({ ...editingGame, titleBn: e.target.value })}
                            placeholder="সুপার এইস"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                          />
                        </div>

                        {/* Status Selector */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">গেম সার্ভার স্ট্যাটাস:</label>
                          <select
                            value={normalizeGameStatus(editingGame.status)}
                            onChange={(e) => setEditingGame({ ...editingGame, status: e.target.value as any })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold"
                          >
                            <option value="ACTIVE">🟢 ACTIVE (সক্রিয়)</option>
                            <option value="SERVER_ERROR">🔴 SERVER ERROR (সার্ভার এরর 500)</option>
                            <option value="MAINTENANCE">🟠 MAINTENANCE (রক্ষণাবেক্ষণ)</option>
                            <option value="DISABLED">⚪ DISABLED (নিষ্ক্রিয়)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">ক্যাটাগরি:</label>
                            <select
                              value={editingGame.category || 'slots'}
                              onChange={(e) => setEditingGame({ ...editingGame, category: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                            >
                              <option value="slots">Slots</option>
                              <option value="crash">Crash</option>
                              <option value="table">Table</option>
                              <option value="live">Live Casino</option>
                              <option value="sports">Sports</option>
                              <option value="fish">Fish</option>
                              <option value="hot">Hot</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">প্রোভাইডার:</label>
                            <input
                              type="text"
                              value={editingGame.provider || 'JILI'}
                              onChange={(e) => setEditingGame({ ...editingGame, provider: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingGame(null)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                          >
                            বাতিল
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingImage}
                            className="px-5 py-2 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xs"
                          >
                            সংরক্ষণ
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 5: PAYMENT METHODS DISPLAY SETTINGS */}
          {activeTab === 'payment_methods' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900">
                    {lang === 'bn' ? 'পেমেন্ট মেথড ডিসপ্লে সেটিংস' : 'Payment Method Display Configuration'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn' ? 'বিকাশ, নগদ, রকেট ইত্যাদির লোগো, নম্বর ও প্রদর্শন স্ট্যাটাস ম্যানেজ করুন।' : 'Configure cashier display methods, logos, numbers, and priority.'}
                  </p>
                </div>
                <button
                  onClick={() => setEditingPaymentMethod({ status: 'active', sortOrder: paymentMethods.length + 1 })}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-chakra font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>{lang === 'bn' ? 'নতুন মেথড' : 'Add Method'}</span>
                </button>
              </div>

              {/* Methods List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-xs">
                        <img src={pm.iconUrl} alt={pm.name} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{pm.nameBn || pm.name} ({pm.methodId})</h4>
                        <span className="text-xs font-mono font-bold text-blue-600 block">{pm.accountNumber || 'নম্বর দেওয়া হয়নি'}</span>
                        <span className={`text-[9px] font-bold ${pm.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {pm.status === 'active' ? '● সক্রিয়' : '○ বন্ধ'} • ক্রম: #{pm.sortOrder}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingPaymentMethod(pm)}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePaymentMethod(pm)}
                        className="p-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Payment Method Modal */}
              <AnimatePresence>
                {editingPaymentMethod && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="font-chakra font-black text-sm text-slate-900">
                          {lang === 'bn' ? 'পেমেন্ট মেথড কনফিগারেশন' : 'Configure Payment Method'}
                        </h3>
                        <button onClick={() => setEditingPaymentMethod(null)} className="p-1 text-slate-400 hover:text-slate-700">
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleSavePaymentMethod} className="space-y-3">
                        {/* Image Preview & Upload Button + Direct URL */}
                        <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                          <label className="text-[11px] font-bold text-slate-700 uppercase block">
                            {lang === 'bn' ? 'মেথড লোগো / আইকন (গ্যালারি বা লিঙ্ক):' : 'Method Logo / Icon (File or URL):'}
                          </label>

                          {editingPaymentMethod.iconUrl ? (
                            <div className="relative w-16 h-16 mx-auto rounded-xl overflow-hidden border border-slate-300 bg-white p-2 flex items-center justify-center">
                              <img src={editingPaymentMethod.iconUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setEditingPaymentMethod(prev => prev ? ({ ...prev, iconUrl: '', storagePath: '' }) : null)}
                                className="absolute top-0 right-0 p-1 bg-rose-600 text-white rounded-lg shadow-sm text-[10px] font-bold"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ) : null}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 text-xs font-bold cursor-pointer transition-colors">
                              {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                              <span>{uploadingImage ? (lang === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...') : (lang === 'bn' ? 'লোগো ফাইল' : 'Select Logo')}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingImage}
                                onChange={(e) => handleImageFileSelect(e, 'payment_methods', (url, path) => {
                                  setEditingPaymentMethod(prev => prev ? ({ ...prev, iconUrl: url, storagePath: path }) : null);
                                })}
                              />
                            </label>

                            <input
                              type="text"
                              value={editingPaymentMethod.iconUrl || ''}
                              onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, iconUrl: e.target.value })}
                              placeholder={lang === 'bn' ? 'অথবা লোগোর URL' : 'Or paste Logo URL'}
                              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">আইডি (যেমন: bkash):</label>
                            <input
                              type="text"
                              required
                              value={editingPaymentMethod.methodId || ''}
                              onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, methodId: e.target.value.toLowerCase() })}
                              placeholder="bkash / nagad / rocket"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">নাম (যেমন: bKash):</label>
                            <input
                              type="text"
                              required
                              value={editingPaymentMethod.name || ''}
                              onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, name: e.target.value })}
                              placeholder="bKash"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">পার্সোনাল / এজেন্ট নম্বর:</label>
                          <input
                            type="text"
                            value={editingPaymentMethod.accountNumber || ''}
                            onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, accountNumber: e.target.value })}
                            placeholder="01XXXXXXXXX"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">ক্রম (Sort Order):</label>
                            <input
                              type="number"
                              value={editingPaymentMethod.sortOrder || 1}
                              onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, sortOrder: Number(e.target.value) })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">স্ট্যাটাস:</label>
                            <select
                              value={editingPaymentMethod.status || 'active'}
                              onChange={(e) => setEditingPaymentMethod({ ...editingPaymentMethod, status: e.target.value as any })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                            >
                              <option value="active">সক্রিয় (Active)</option>
                              <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingPaymentMethod(null)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                          >
                            বাতিল
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingImage}
                            className="px-5 py-2 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xs"
                          >
                            সংরক্ষণ
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 6: PROMOTIONS */}
          {activeTab === 'promotions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900">
                    {lang === 'bn' ? 'প্রমোশন অফার ম্যানেজমেন্ট' : 'Promotions & Bonus Offers'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn' ? 'বোনাস অফার ও প্রচারমূলক ক্যাম্পেইন তৈরি করুন।' : 'Manage promo banners and bonus codes.'}
                  </p>
                </div>
                <button
                  onClick={() => setEditingPromo({ active: true, order: promotions.length + 1, badge: 'PROMO' })}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-chakra font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>{lang === 'bn' ? 'নতুন অফার' : 'Add Promo'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {promotions.map((p) => (
                  <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div className="relative aspect-[21/9] bg-slate-200">
                      <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                        {p.badge || 'PROMO'}
                      </div>
                    </div>
                    <div className="p-3 space-y-1">
                      <h4 className="font-bold text-xs text-slate-900">{p.titleBn || p.title}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{p.descriptionBn || p.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                        <span className="font-mono font-bold text-blue-600">কোড: {p.bonusCode || 'TK333'}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingPromo(p)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => handleDeletePromotion(p)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Promotion Modal */}
              <AnimatePresence>
                {editingPromo && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="font-chakra font-black text-sm text-slate-900">
                          {editingPromo.id ? (lang === 'bn' ? 'প্রমোশন সম্পাদনা' : 'Edit Promotion') : (lang === 'bn' ? 'নতুন প্রমোশন' : 'Add Promotion')}
                        </h3>
                        <button onClick={() => setEditingPromo(null)} className="p-1 text-slate-400 hover:text-slate-700">
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleSavePromotion} className="space-y-3">
                        {/* Image Preview & Upload Button + Direct URL */}
                        <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                          <label className="text-[11px] font-bold text-slate-700 uppercase block">
                            {lang === 'bn' ? 'প্রমোশন ছবি (গ্যালারি বা লিঙ্ক):' : 'Promo Image (File or URL):'}
                          </label>

                          {editingPromo.imageUrl ? (
                            <div className="relative aspect-[21/9] rounded-xl overflow-hidden border border-slate-300 bg-slate-100">
                              <img src={editingPromo.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setEditingPromo(prev => prev ? ({ ...prev, imageUrl: '', storagePath: '' }) : null)}
                                className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-lg shadow-sm text-xs font-bold"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : null}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 text-xs font-bold cursor-pointer transition-colors">
                              {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                              <span>{uploadingImage ? (lang === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...') : (lang === 'bn' ? 'গ্যালারি থেকে সিলেক্ট' : 'Select File')}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingImage}
                                onChange={(e) => handleImageFileSelect(e, 'promotions', (url, path) => {
                                  setEditingPromo(prev => prev ? ({ ...prev, imageUrl: url, storagePath: path }) : null);
                                })}
                              />
                            </label>

                            <input
                              type="text"
                              value={editingPromo.imageUrl || ''}
                              onChange={(e) => setEditingPromo({ ...editingPromo, imageUrl: e.target.value })}
                              placeholder={lang === 'bn' ? 'অথবা ছবির ডিরেক্ট লিঙ্ক (URL)' : 'Or paste Image URL'}
                              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">শিরোনাম (বাংলা):</label>
                            <input
                              type="text"
                              value={editingPromo.titleBn || ''}
                              onChange={(e) => setEditingPromo({ ...editingPromo, titleBn: e.target.value })}
                              placeholder="১০০% ওয়েলকাম বোনাস"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">শিরোনাম (English):</label>
                            <input
                              type="text"
                              value={editingPromo.title || ''}
                              onChange={(e) => setEditingPromo({ ...editingPromo, title: e.target.value })}
                              placeholder="100% Welcome Bonus"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">বিবরণ (বাংলা):</label>
                          <textarea
                            rows={2}
                            value={editingPromo.descriptionBn || ''}
                            onChange={(e) => setEditingPromo({ ...editingPromo, descriptionBn: e.target.value })}
                            placeholder="প্রথম ডিপোজিটে দ্বিগুণ টাকা পান"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">বোনাস কোড:</label>
                            <input
                              type="text"
                              value={editingPromo.bonusCode || 'TK333'}
                              onChange={(e) => setEditingPromo({ ...editingPromo, bonusCode: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600">ব্যাজ:</label>
                            <input
                              type="text"
                              value={editingPromo.badge || 'PROMO'}
                              onChange={(e) => setEditingPromo({ ...editingPromo, badge: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingPromo(null)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                          >
                            বাতিল
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingImage}
                            className="px-5 py-2 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xs"
                          >
                            সংরক্ষণ
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 7: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-4 max-w-lg">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900">
                  {lang === 'bn' ? 'স্ক্রোল ঘোষণা (Marquee Announcement)' : 'Marquee Announcement Editor'}
                </h2>
                <p className="text-xs text-slate-500">
                  {lang === 'bn' ? 'হোম পেইজে চলমান টেক্সট মেসেজ পরিবর্তন করুন।' : 'Edit the announcement bar displayed on the homepage.'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">ঘোষণা টেক্সট (বাংলা):</label>
                  <textarea
                    rows={3}
                    value={announcementTextBn}
                    onChange={(e) => setAnnouncementTextBn(e.target.value)}
                    placeholder="🎉 TK333 ভিআইপি ক্যাসিনোতে স্বাগতম..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">ঘোষণা টেক্সট (English):</label>
                  <textarea
                    rows={3}
                    value={announcementTextEn}
                    onChange={(e) => setAnnouncementTextEn(e.target.value)}
                    placeholder="🎉 Welcome to TK333 VIP Casino..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <button
                  onClick={handleSaveAnnouncement}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-chakra font-black text-xs rounded-2xl shadow-xs active:scale-95 transition-all"
                >
                  {lang === 'bn' ? 'ঘোষণা সংরক্ষণ ও লাইভ করুন' : 'Save & Publish Announcement'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: WITHDRAWALS */}
          {activeTab === 'withdrawals' && (
            <WithdrawalsTab
              transactions={transactions}
              lang={lang}
              adminEmail={user?.email || 'admin@tk333.vip'}
              showToast={showToast}
            />
          )}

          {/* TAB: DEPOSITS */}
          {activeTab === 'deposits' && (
            <DepositsTab
              transactions={transactions}
              lang={lang}
              adminEmail={user?.email || 'admin@tk333.vip'}
              showToast={showToast}
            />
          )}

          {/* TAB: TRANSACTIONS LEDGER */}
          {activeTab === 'transactions' && (
            <TransactionsLedgerTab
              transactions={transactions}
              lang={lang}
            />
          )}

          {/* TAB: AUDIT LOGS */}
          {activeTab === 'audit_logs' && (
            <AuditLogsTab
              lang={lang}
            />
          )}

          {/* TAB 9: USERS LIST */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900">
                    {lang === 'bn' ? 'মেম্বার ইউজার তালিকা' : 'Registered Users Directory'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn' ? 'ব্যবহারকারীদের ব্যালেন্স ও তথ্য প্রদর্শন।' : 'View user balances, turnover, and status.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {usersList.map((u) => (
                  <div key={u.uid} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{u.name || u.username || 'Member'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{u.phone || u.uid}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-rajdhani font-black text-sm text-emerald-600 block">৳{u.balance?.toLocaleString() || 0}</span>
                      <span className="text-[9px] text-slate-400">টার্নওভার: ৳{u.turnover || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 10: WEBSITE SETTINGS & SOCIAL LINKS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-lg">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900">
                  {lang === 'bn' ? 'ওয়েবসাইট ও সোশ্যাল সেটিংস' : 'Website & Social Settings'}
                </h2>
                <p className="text-xs text-slate-500">
                  {lang === 'bn' ? 'ব্র্যান্ডের নাম, সাপোর্ট লিঙ্ক ও যোগাযোগ তথ্য নিয়ন্ত্রণ করুন।' : 'Configure brand information, WhatsApp, Telegram, and Live Support.'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase">ব্র্যান্ডের নাম (Brand Name):</label>
                  <input
                    type="text"
                    value={settings?.brandName || 'TK333'}
                    onChange={(e) => setSettings(prev => ({ ...prev, brandName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase">বিকাশ ডিপোজিট নম্বর (bKash Deposit Number):</label>
                  <input
                    type="text"
                    value={settings?.depositBkashNumber || '01641404837'}
                    onChange={(e) => setSettings(prev => ({ ...prev, depositBkashNumber: e.target.value }))}
                    placeholder="01641404837"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase">নগদ ডিপোজিট নম্বর (Nagad Deposit Number):</label>
                  <input
                    type="text"
                    value={settings?.depositNagadNumber || '01641404837'}
                    onChange={(e) => setSettings(prev => ({ ...prev, depositNagadNumber: e.target.value }))}
                    placeholder="01641404837"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase">সাপোর্ট হোয়াটসঅ্যাপ নম্বর (WhatsApp):</label>
                  <input
                    type="text"
                    value={settings?.supportWhatsapp || '+8801641404837'}
                    onChange={(e) => setSettings(prev => ({ ...prev, supportWhatsapp: e.target.value }))}
                    placeholder="+8801641404837"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase">টেলিগ্রাম চ্যানেল / গ্রুপ লিংক:</label>
                  <input
                    type="text"
                    value={settings?.telegramChannel || 'https://t.me/TK333_official'}
                    onChange={(e) => setSettings(prev => ({ ...prev, telegramChannel: e.target.value }))}
                    placeholder="https://t.me/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase">ফেসবুক পেজ লিংক:</label>
                  <input
                    type="text"
                    value={settings?.facebookPage || 'https://facebook.com/TK333'}
                    onChange={(e) => setSettings(prev => ({ ...prev, facebookPage: e.target.value }))}
                    placeholder="https://facebook.com/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-chakra font-black text-xs rounded-2xl shadow-xs active:scale-95 transition-all"
                  >
                    {lang === 'bn' ? 'সেটিংস সংরক্ষণ করুন' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 11: SIGNAL MANAGEMENT & CUSTOMER ACCESS */}
          {activeTab === 'signal_management' && (
            <SignalManagementTab 
              lang={lang} 
              showToast={showToast} 
              registeredUsers={usersList.map(u => ({ uid: u.uid, name: u.name, username: u.username, phone: u.phone }))}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function VolumeIcon({ size, className }: { size: number; className?: string }) {
  return <Megaphone size={size} className={className} />;
}
