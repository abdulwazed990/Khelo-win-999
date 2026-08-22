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

export interface Transaction {
  id: string;
  uid: string;
  type: 'deposit' | 'withdraw';
  method: 'nagad' | 'bkash' | 'rocket';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  senderNumber?: string;
  transactionId?: string;
  createdAt: string;
  processedAt?: string;
  userName?: string;
  userPhone?: string;
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
  status?: 'active' | 'inactive' | 'maintenance';
  isActive?: boolean;
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
