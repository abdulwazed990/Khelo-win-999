export interface UserData {
  uid: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  balance: number;
  welcomeBonusClaimed?: boolean;
  lastDailyBonusAt?: string;
  lastCaptchaDate?: string;
  captchaInvalidUntil?: string;
  freeSpins?: number;
  lastSpinDate?: string;
  turnover?: number;
  hasDepositedAfter8k?: boolean;
  bonusReturned?: boolean;
  role?: 'admin' | 'user';
  createdAt?: any;
}

export type TransactionType = 
  | 'deposit' 
  | 'withdraw' 
  | 'DEMO_TOPUP' 
  | 'DEMO_BONUS' 
  | 'GAME_STAKE' 
  | 'GAME_WIN' 
  | 'DEMO_WITHDRAWAL';

export type TransactionStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'cancelled' 
  | 'settled';

export interface Transaction {
  id: string;
  uid: string;
  userName?: string;
  userPhone?: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  previousBalance?: number;
  newBalance?: number;
  status: TransactionStatus;
  method?: 'nagad' | 'bkash' | 'rocket' | 'upay' | 'demo' | string;
  senderNumber?: string;
  accountIdentifier?: string;
  transactionId?: string;
  referenceId?: string;
  gameName?: string;
  note?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface Bet {
  id: string;
  uid: string;
  gameName: string;
  amount: number;
  profit: number;
  createdAt: any;
  status?: 'win' | 'loss';
}

export interface BannerItem {
  id: string;
  title: string;
  titleBn?: string;
  titleEn?: string;
  subtitle?: string;
  subtitleBn?: string;
  subtitleEn?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  desktopImageUrl?: string;
  storagePath?: string;
  active?: boolean;
  isActive?: boolean;
  order: number;
  priority?: number;
  ctaText?: string;
  ctaTextBn?: string;
  ctaTextEn?: string;
  ctaLink?: string;
  linkUrl?: string;
  badge?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CategoryItem {
  id: string;
  name: string;
  nameBn?: string;
  nameEn?: string;
  slug?: string;
  icon?: string;
  iconName?: string;
  iconUrl?: string;
  storagePath?: string;
  order: number;
  active?: boolean;
  isActive?: boolean;
}

export type GameStatus = 
  | 'ACTIVE' 
  | 'MAINTENANCE' 
  | 'SERVER_ERROR' 
  | 'DISABLED' 
  | 'active' 
  | 'maintenance' 
  | 'server_error' 
  | 'disabled' 
  | 'inactive';

export interface GameItem {
  id: string;
  name?: string;
  title?: string;
  nameBn?: string;
  titleBn?: string;
  nameEn?: string;
  titleEn?: string;
  slug?: string;
  category: string;
  provider: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  gameUrl?: string;
  storagePath?: string;
  route?: string;
  status?: GameStatus;
  gameStatus?: GameStatus;
  isActive?: boolean;
  statusReason?: string;
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
  maintenanceTitle?: string;
  maintenanceTitleBn?: string;
  maintenanceDescription?: string;
  maintenanceDescriptionBn?: string;
  maintenanceEstimatedTime?: string;
  maintenanceButtonText?: string;
  maintenanceButtonTextBn?: string;
  featured?: boolean;
  popular?: boolean;
  hot?: boolean;
  isNew?: boolean;
  rtp?: string;
  order: number;
  rating?: number;
  players?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface PromotionItem {
  id: string;
  title: string;
  titleBn?: string;
  titleEn?: string;
  subtitle?: string;
  subtitleBn?: string;
  subtitleEn?: string;
  description: string;
  descriptionBn?: string;
  descriptionEn?: string;
  bonusText?: string;
  bonusTextBn?: string;
  bonusTextEn?: string;
  tag?: string;
  tagBn?: string;
  tagEn?: string;
  bonusPercentage?: string;
  minDeposit?: number;
  maxBonus?: number;
  code?: string;
  imageUrl: string;
  storagePath?: string;
  badge?: string;
  active?: boolean;
  isActive?: boolean;
  order: number;
  ctaText?: string;
  ctaTextBn?: string;
  ctaTextEn?: string;
  ctaLink?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AnnouncementItem {
  id: string;
  text: string;
  textBn?: string;
  textEn?: string;
  announcementBn?: string;
  announcementEn?: string;
  active?: boolean;
  isActive?: boolean;
  speed?: number;
  priority?: number;
  status?: 'active' | 'inactive';
  createdAt?: any;
  updatedAt?: any;
}

export interface HomeAdItem {
  id: string;
  title?: string;
  titleBn?: string;
  titleEn?: string;
  subtitleBn?: string;
  subtitleEn?: string;
  imageUrl: string;
  storagePath?: string;
  linkUrl?: string;
  active?: boolean;
  isActive?: boolean;
  order: number;
  priority?: number;
  badgeBn?: string;
  badgeEn?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface PaymentMethodConfig {
  id: string;
  methodId: 'bkash' | 'nagad' | 'rocket' | 'upay' | string;
  name: string;
  nameBn?: string;
  nameEn?: string;
  iconUrl?: string;
  iconStoragePath?: string;
  status: 'active' | 'inactive';
  sortOrder: number;
  accountNumber?: string;
  accountType?: 'agent' | 'personal' | 'merchant';
  minDeposit?: number;
  maxDeposit?: number;
  instructionsBn?: string;
  instructionsEn?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SiteSettings {
  brandName?: string;
  logoUrl?: string;
  logoStoragePath?: string;
  faviconUrl?: string;
  defaultLanguage?: 'bn' | 'en';
  theme?: string;
  telegramUrl: string;
  liveChatUrl: string;
  whatsappUrl: string;
  facebookUrl?: string;
  supportEnabled?: boolean;
  maintenanceMode?: boolean;
  footerText?: string;
  footerTextBn?: string;
  footerTextEn?: string;
  depositBkashNumber?: string;
  depositNagadNumber?: string;
  depositRocketNumber?: string;
  depositUpayNumber?: string;
}

export type SignalConnectionStatus = 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'WAITING_FOR_ROUND' 
  | 'ROUND_RUNNING' 
  | 'ROUND_FINISHED' 
  | 'CRASHED'
  | 'DISCONNECTED' 
  | 'ERROR';

export type SignalResultStatus = 
  | 'SERVER_VERIFIED' 
  | 'SIGNAL_UNAVAILABLE' 
  | 'PENDING';

export type SubscriptionType = 'free' | 'premium';

export interface SignalUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  createdAt: string;
}

export interface SignalToken {
  token: string;
  userId: string;
  userName: string;
  status: 'active' | 'revoked' | 'expired';
  subscriptionType: SubscriptionType;
  expiresAt: string; // ISO date string
  connectedGameId: string;
  connectedSessionId?: string;
  lastActiveAt?: string;
  createdAt: string;
  ipAddress?: string;
}

export interface SignalGameConnection {
  id: string;
  gameId: string;
  gameName: string;
  apiUrl: string;
  signalAppUrl?: string;
  signalAppStatus?: SignalConnectionStatus;
  signalAppEnabled?: boolean; // ON / OFF switch for global signal broadcast
  wsUrl?: string;
  authHeader?: string;
  connectionStatus: SignalConnectionStatus;
  syncStatus?: 'LIVE' | 'RECONNECTING' | 'OFFLINE';
  lastSyncAt: string;
  serverVerifiedMode: boolean; // if true, game backend pushes authorized pre-round multipliers
  currentSessionId?: string;
  pingMs?: number;
}

export type SignalEventType = 
  | 'ROUND_CREATED'
  | 'ROUND_BETTING'
  | 'ROUND_STARTED'
  | 'SIGNAL_UPDATED'
  | 'ROUND_CRASHED'
  | 'ROUND_COMPLETED'
  | 'ROUND_NEXT'
  | 'GAME_STATUS_CHANGED';

export interface SignalEvent {
  event: SignalEventType;
  roundId: string;
  signal?: number | null;
  currentMultiplier?: number;
  actualResult?: number;
  serverTimestamp: number;
  status: SignalConnectionStatus;
}

export interface SignalRound {
  id: string;
  roundId: string;
  sessionId: string;
  gameId: string;
  status: SignalConnectionStatus;
  currentMultiplier: number;
  finalMultiplier?: number;
  serverSignalStatus: SignalResultStatus;
  predictedMultiplier?: number | null; // ONLY set when authoritative server provides pre-round multiplier
  serverSignature?: string;
  startTime?: string;
  crashTime?: string;
  createdAt: string;
  countdown?: number;
  countdownStart?: number;
  countdownEndsAt?: number;
  serverTimestamp?: number;
}

export interface SignalLog {
  id: string;
  token?: string;
  userId?: string;
  userName?: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

