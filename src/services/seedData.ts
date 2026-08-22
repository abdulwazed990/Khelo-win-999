import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { BannerItem, CategoryItem, GameItem, PromotionItem, AnnouncementItem, SiteSettings } from '../types';

export const INITIAL_BANNERS: Omit<BannerItem, 'id'>[] = [
  {
    title: '১০০% প্রথম ডিপোজিট ওয়েলকাম বোনাস',
    titleBn: '১০০% প্রথম ডিপোজিট ওয়েলকাম বোনাস',
    titleEn: '100% First Deposit Welcome Bonus',
    subtitle: 'আপনার প্রথম ডিপোজিট ডাবল করুন সর্বোচ্চ ২০,০০০ টাকা পর্যন্ত!',
    subtitleBn: 'আপনার প্রথম ডিপোজিট ডাবল করুন সর্বোচ্চ ২০,০০০ টাকা পর্যন্ত!',
    subtitleEn: 'Double your first deposit up to ৳20,000!',
    imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1200&q=80',
    badge: 'NEW MEMBER',
    active: true,
    order: 1,
    priority: 1,
    ctaText: 'এখনই নিন',
    ctaTextBn: 'এখনই নিন',
    ctaTextEn: 'CLAIM NOW',
    ctaLink: 'promotion',
  },
  {
    title: 'পোকি সুপার এস জ্যাকপট ৫০০X',
    titleBn: 'পোকি সুপার এস জ্যাকপট ৫০০X',
    titleEn: 'Pokie Super Ace Jackpot 500X',
    subtitle: 'স্পিন করুন আর জিতে নিন সর্বোচ্চ ৫০০ গুণ মাল্টিপ্লায়ার রিওয়ার্ড!',
    subtitleBn: 'স্পিন করুন আর জিতে নিন সর্বোচ্চ ৫০০ গুণ মাল্টিপ্লায়ার রিওয়ার্ড!',
    subtitleEn: 'Spin now and win up to 500x multiplier rewards!',
    imageUrl: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=1200&q=80',
    badge: 'MEGA WIN',
    active: true,
    order: 2,
    priority: 2,
    ctaText: 'এখনই খেলুন',
    ctaTextBn: 'এখনই খেলুন',
    ctaTextEn: 'PLAY NOW',
    ctaLink: 'pokie-super-ace',
  },
  {
    title: 'এভিয়েটর জেট ক্র্যাশ গেম',
    titleBn: 'এভিয়েটর জেট ক্র্যাশ গেম',
    titleEn: 'Aviator Jet Crash Game',
    subtitle: 'বিমান ওড়ার আগেই ক্যাশআউট করুন! সেকেন্ডে পেমেন্ট।',
    subtitleBn: 'বিমান ওড়ার আগেই ক্যাশআউট করুন! সেকেন্ডে পেমেন্ট।',
    subtitleEn: 'Cash out before the plane flies away! Instant payouts.',
    imageUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
    badge: 'HOT GAME',
    active: true,
    order: 3,
    priority: 3,
    ctaText: 'খেলুন ও জিতুন',
    ctaTextBn: 'খেলুন ও জিতুন',
    ctaTextEn: 'FLY & WIN',
    ctaLink: 'aviator-jet',
  },
  {
    title: 'দৈনিক ফ্রি লাকি স্পিন হুইল',
    titleBn: 'দৈনিক ফ্রি লাকি স্পিন হুইল',
    titleEn: 'Daily Lucky Free Spin Wheel',
    subtitle: 'প্রতি ২৪ ঘণ্টায় স্পিন করে জিতে নিন নিশ্চিত নগদ পুরস্কার!',
    subtitleBn: 'প্রতি ২৪ ঘণ্টায় স্পিন করে জিতে নিন নিশ্চিত নগদ পুরস্কার!',
    subtitleEn: 'Spin the lucky wheel every 24 hours for guaranteed cash!',
    imageUrl: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=1200&q=80',
    badge: 'FREE REWARD',
    active: true,
    order: 4,
    priority: 4,
    ctaText: 'হুইল স্পিন করুন',
    ctaTextBn: 'হুইল স্পিন করুন',
    ctaTextEn: 'SPIN WHEEL',
    ctaLink: 'prize',
  }
];

export const INITIAL_CATEGORIES: Omit<CategoryItem, 'id'>[] = [
  { name: 'হট গেমস', nameBn: 'হট গেমস', nameEn: 'Hot Games', slug: 'hot', iconName: 'Flame', order: 1, active: true },
  { name: 'স্লট', nameBn: 'স্লট', nameEn: 'Slots', slug: 'slots', iconName: 'Gamepad2', order: 2, active: true },
  { name: 'ক্র্যাশ', nameBn: 'ক্র্যাশ', nameEn: 'Crash', slug: 'crash', iconName: 'Rocket', order: 3, active: true },
  { name: 'টেবিল', nameBn: 'টেবিল', nameEn: 'Table', slug: 'table', iconName: 'Dice5', order: 4, active: true },
  { name: 'লাইভ ক্যাসিনো', nameBn: 'লাইভ ক্যাসিনো', nameEn: 'Live Casino', slug: 'live', iconName: 'Tv', order: 5, active: true },
  { name: 'স্পোর্টস', nameBn: 'স্পোর্টস', nameEn: 'Sports', slug: 'sports', iconName: 'Trophy', order: 6, active: true },
  { name: 'ফিশ হান্টার', nameBn: 'ফিশ হান্টার', nameEn: 'Fish Hunter', slug: 'fish', iconName: 'Fish', order: 7, active: true },
  { name: 'ই-স্পোর্টস', nameBn: 'ই-স্পোর্টস', nameEn: 'E-Sports', slug: 'esports', iconName: 'Crosshair', order: 8, active: true },
];

export const INITIAL_GAMES: Omit<GameItem, 'id'>[] = [
  {
    name: 'সুপার এস (Super Ace)',
    nameBn: 'সুপার এস',
    nameEn: 'Super Ace',
    slug: 'pokie-super-ace',
    category: 'slots',
    provider: 'JILI',
    imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    route: 'pokie-super-ace',
    status: 'active',
    hot: true,
    popular: true,
    featured: true,
    order: 1,
    rating: 4.9,
    players: '14.2k'
  },
  {
    name: 'এভিয়েটর জেট (Aviator Jet)',
    nameBn: 'এভিয়েটর জেট',
    nameEn: 'Aviator Jet',
    slug: 'aviator-jet',
    category: 'crash',
    provider: 'SPRIBE',
    imageUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80',
    route: 'aviator-jet',
    status: 'active',
    hot: true,
    popular: true,
    featured: true,
    order: 2,
    rating: 4.95,
    players: '28.5k'
  },
  {
    name: 'বক্সার কিং প্রো (Boxer King)',
    nameBn: 'বক্সার কিং প্রো',
    nameEn: 'Boxer King Pro',
    slug: 'boxer-king',
    category: 'slots',
    provider: 'JILI',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
    route: 'boxer-king',
    status: 'active',
    hot: true,
    isNew: true,
    order: 3,
    rating: 4.85,
    players: '9.8k'
  },
  {
    name: 'TK333 মাইনস (Mines)',
    nameBn: 'TK333 মাইনস',
    nameEn: 'TK333 Mines',
    slug: 'mines',
    category: 'crash',
    provider: 'TK333 ORIGINALS',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    route: 'mines',
    status: 'active',
    hot: true,
    popular: true,
    order: 4,
    rating: 4.9,
    players: '18.1k'
  },
  {
    name: 'ইউরোপীয় রুলেট (Roulette)',
    nameBn: 'ইউরোপীয় রুলেট',
    nameEn: 'European Roulette',
    slug: 'roulette',
    category: 'table',
    provider: 'EVOLUTION',
    imageUrl: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=600&q=80',
    route: 'roulette',
    status: 'active',
    popular: true,
    order: 5,
    rating: 4.8,
    players: '11.4k'
  },
  {
    name: 'ভিআইপি কয়েনফ্লিপ (Coinflip)',
    nameBn: 'ভিআইপি কয়েনফ্লিপ',
    nameEn: 'VIP Coinflip',
    slug: 'coinflip',
    category: 'table',
    provider: 'TK333 ORIGINALS',
    imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80',
    route: 'coinflip',
    status: 'active',
    isNew: true,
    order: 6,
    rating: 4.75,
    players: '7.6k'
  },
  {
    name: 'ফরচুন জেমস ২ (Fortune Gems 2)',
    nameBn: 'ফরচুন জেমস ২',
    nameEn: 'Fortune Gems 2',
    slug: 'fortune-gems-2',
    category: 'slots',
    provider: 'JILI',
    imageUrl: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=600&q=80',
    route: 'pokie-super-ace',
    status: 'active',
    popular: true,
    order: 7,
    rating: 4.88,
    players: '12.3k'
  },
  {
    name: 'ক্রেজি টাইম লাইভ (Crazy Time)',
    nameBn: 'ক্রেজি টাইম লাইভ',
    nameEn: 'Crazy Time Live',
    slug: 'crazy-time',
    category: 'live',
    provider: 'EVOLUTION',
    imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    route: 'roulette',
    status: 'active',
    hot: true,
    order: 8,
    rating: 4.92,
    players: '31.2k'
  },
  {
    name: 'মেগা ফিশিং (Mega Fishing)',
    nameBn: 'মেগা ফিশিং',
    nameEn: 'Mega Fishing',
    slug: 'mega-fishing',
    category: 'fish',
    provider: 'JDB',
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    route: 'pokie-super-ace',
    status: 'active',
    order: 9,
    rating: 4.7,
    players: '6.4k'
  }
];

export const INITIAL_PROMOTIONS: Omit<PromotionItem, 'id'>[] = [
  {
    title: '১০০% প্রথম ডিপোজিট ওয়েলকাম বোনাস',
    titleBn: '১০০% প্রথম ডিপোজিট ওয়েলকাম বোনাস',
    titleEn: '100% First Deposit Welcome Bonus',
    subtitle: 'TK333 এর নতুন প্লেয়ারদের জন্য বিশেষ অফার',
    subtitleBn: 'TK333 এর নতুন প্লেয়ারদের জন্য বিশেষ অফার',
    subtitleEn: 'Exclusive for new TK333 players',
    description: 'সর্বনিম্ন ৫০০ টাকা ডিপোজিট করে পান তাৎক্ষণিক ১০০% বোনাস সর্বোচ্চ ২০,০০০ টাকা পর্যন্ত। ভেজারিং প্রয়োজনীয়তা মাত্র ১০x টার্নওভার।',
    descriptionBn: 'সর্বনিম্ন ৫০০ টাকা ডিপোজিট করে পান তাৎক্ষণিক ১০০% বোনাস সর্বোচ্চ ২০,০০০ টাকা পর্যন্ত। ভেজারিং প্রয়োজনীয়তা মাত্র ১০x টার্নওভার।',
    descriptionEn: 'Deposit minimum ৳500 and get 100% instant bonus up to ৳20,000. Wager requirement 10x turnover.',
    bonusText: '৳২০,০০০ সর্বোচ্চ বোনাস',
    bonusTextBn: '৳২০,০০০ সর্বোচ্চ বোনাস',
    bonusTextEn: '৳20,000 MAX BONUS',
    imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    badge: 'WELCOME',
    active: true,
    order: 1,
    ctaText: 'ডিপোজিট করুন',
    ctaTextBn: 'ডিপোজিট করুন',
    ctaTextEn: 'DEPOSIT NOW',
    ctaLink: 'member'
  },
  {
    title: 'দৈনিক ১.২% আনলিমিটেড ক্যাশ রিবেট',
    titleBn: 'দৈনিক ১.২% আনলিমিটেড ক্যাশ রিবেট',
    titleEn: 'Daily 1.2% Unlimited Rebate',
    subtitle: 'প্রতিটি বাজিতে স্বয়ংক্রিয় রিবেট ক্যাশব্যাক',
    subtitleBn: 'প্রতিটি বাজিতে স্বয়ংক্রিয় রিবেট ক্যাশব্যাক',
    subtitleEn: 'Automatic rebate on every bet',
    description: 'যেকোনো স্লট বা ক্র্যাশ গেম খেলুন এবং প্রতিদিন রাত ১২:০০ টায় আপনার একাউন্টে সরাসরি ১.২% পর্যন্ত নগদ রিবেট ক্যাশব্যাক পান।',
    descriptionBn: 'যেকোনো স্লট বা ক্র্যাশ গেম খেলুন এবং প্রতিদিন রাত ১২:০০ টায় আপনার একাউন্টে সরাসরি ১.২% পর্যন্ত নগদ রিবেট ক্যাশব্যাক পান।',
    descriptionEn: 'Play any slot or crash game and receive up to 1.2% daily cash rebate credited automatically at 12:00 AM.',
    bonusText: '১.২% দৈনিক ক্যাশব্যাক',
    bonusTextBn: '১.২% দৈনিক ক্যাশব্যাক',
    bonusTextEn: '1.2% DAILY CASHBACK',
    imageUrl: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=800&q=80',
    badge: 'REBATE',
    active: true,
    order: 2,
    ctaText: 'রিবেট দেখুন',
    ctaTextBn: 'রিবেট দেখুন',
    ctaTextEn: 'VIEW REBATE',
    ctaLink: 'member'
  },
  {
    title: 'এজেন্ট ৪০% আজীবন পার্টনার কমিশন',
    titleBn: 'এজেন্ট ৪০% আজীবন পার্টনার কমিশন',
    titleEn: 'Agent 40% Lifetime Commission',
    subtitle: 'TK333 এর সাথে ঘরে বসে প্যাসিভ ইনকাম করুন',
    subtitleBn: 'TK333 এর সাথে ঘরে বসে প্যাসিভ ইনকাম করুন',
    subtitleEn: 'Earn passive income with TK333',
    description: 'বন্ধুদের TK333 এ আমন্ত্রণ জানান। লেভেল-১ এবং লেভেল-২ থেকে প্রতি সপ্তাহে পান সর্বোচ্চ ৪০% পর্যন্ত আজীবন রেভিনিউ শেয়ার।',
    descriptionBn: 'বন্ধুদের TK333 এ আমন্ত্রণ জানান। লেভেল-১ এবং লেভেল-২ থেকে প্রতি সপ্তাহে পান সর্বোচ্চ ৪০% পর্যন্ত আজীবন রেভিনিউ শেয়ার।',
    descriptionEn: 'Invite friends and players to TK333. Earn up to 40% tier-1 and tier-2 revenue share paid out weekly.',
    bonusText: '৪০% কমিশন',
    bonusTextBn: '৪০% কমিশন',
    bonusTextEn: '40% COMMISSION',
    imageUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
    badge: 'AGENT VIP',
    active: true,
    order: 3,
    ctaText: 'এজেন্ট হোন',
    ctaTextBn: 'এজেন্ট হোন',
    ctaTextEn: 'BECOME AGENT',
    ctaLink: 'agent'
  },
  {
    title: 'দৈনিক ফ্রি স্পিন ও উপহার বক্স',
    titleBn: 'দৈনিক ফ্রি স্পিন ও উপহার বক্স',
    titleEn: 'Daily Free Spin & Mystery Gift',
    subtitle: 'প্রতি ২৪ ঘণ্টায় নিশ্চিত নগদ উপহার',
    subtitleBn: 'প্রতি ২৪ ঘণ্টায় নিশ্চিত নগদ উপহার',
    subtitleEn: 'Guaranteed win every 24 hours',
    description: 'প্রতিদিন লগইন করে TK333 লাকি হুইল স্পিন করুন। ৳৫০ থেকে ৳৫,০০০ পর্যন্ত নগদ টাকা জিতুন কোনো টার্নওভার শর্ত ছাড়াই।',
    descriptionBn: 'প্রতিদিন লগইন করে TK333 লাকি হুইল স্পিন করুন। ৳৫০ থেকে ৳৫,০০০ পর্যন্ত নগদ টাকা জিতুন কোনো টার্নওভার শর্ত ছাড়াই।',
    descriptionEn: 'Login daily to spin the TK333 wheel. Win bonus cash from ৳50 up to ৳5,000 with 0 turnover required.',
    bonusText: 'ফ্রি দৈনিক ক্যাশ',
    bonusTextBn: 'ফ্রি দৈনিক ক্যাশ',
    bonusTextEn: 'FREE DAILY CASH',
    imageUrl: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80',
    badge: 'DAILY PRIZE',
    active: true,
    order: 4,
    ctaText: 'হুইল স্পিন',
    ctaTextBn: 'হুইল স্পিন',
    ctaTextEn: 'SPIN WHEEL',
    ctaLink: 'prize'
  }
];

export const INITIAL_ANNOUNCEMENT: Omit<AnnouncementItem, 'id'> = {
  text: '🔥 TK333 অফিসিয়াল মোবাইল ক্যাসিনোতে স্বাগতম! 🎉 প্রথম ডিপোজিটে ১০০% বোনাস সর্বোচ্চ ২০,০০০ টাকা পর্যন্ত! ⚡ মাত্র ৩০ সেকেন্ডে বিকাশ, নগদ ও রকেটে দ্রুত ডিপোজিট ও উইথড্র! 🏆 মেম্বার ***৮৮২১ সুপার এস গেমে জিতেছেন ১,৪৮,৫০০ টাকা!',
  announcementBn: '🔥 TK333 অফিসিয়াল মোবাইল ক্যাসিনোতে স্বাগতম! 🎉 প্রথম ডিপোজিটে ১০০% বোনাস সর্বোচ্চ ২০,০০০ টাকা পর্যন্ত! ⚡ মাত্র ৩০ সেকেন্ডে বিকাশ, নগদ ও রকেটে দ্রুত ডিপোজিট ও উইথড্র! 🏆 মেম্বার ***৮৮২১ সুপার এস গেমে জিতেছেন ১,৪৮,৫০০ টাকা!',
  announcementEn: '🔥 Welcome to TK333 Official Mobile Casino! 🎉 100% First Deposit Bonus up to ৳20,000! ⚡ Instant Bkash, Nagad & Rocket deposits in 30 seconds! 🏆 Member ***8821 just won ৳148,500 on Super Ace!',
  active: true,
  status: 'active',
  priority: 1
};

export const INITIAL_SETTINGS: SiteSettings = {
  brandName: 'TK333',
  defaultLanguage: 'bn',
  telegramUrl: 'https://t.me/TK333_Official',
  liveChatUrl: 'https://tawk.to',
  whatsappUrl: 'https://wa.me/8801700000000',
  facebookUrl: 'https://facebook.com/TK333Official',
  supportEnabled: true,
  maintenanceMode: false,
  footerText: 'TK333 কুরাকাও সরকার কর্তৃক লাইসেন্সপ্রাপ্ত ও নিয়ন্ত্রিত। ১৮+ দায়িত্বশীলভাবে খেলুন।',
  footerTextBn: 'TK333 কুরাকাও সরকার কর্তৃক লাইসেন্সপ্রাপ্ত ও নিয়ন্ত্রিত। ১৮+ দায়িত্বশীলভাবে খেলুন।',
  footerTextEn: 'TK333 is licensed and regulated by the Government of Curacao. 18+ Play Responsibly.',
  depositBkashNumber: '01712345678',
  depositNagadNumber: '01812345678',
  depositRocketNumber: '01912345678'
};

export async function seedInitialFirestoreData() {
  try {
    // 1. Check & seed banners
    const bannersSnap = await getDocs(collection(db, 'banners'));
    if (bannersSnap.empty) {
      for (let i = 0; i < INITIAL_BANNERS.length; i++) {
        const id = `banner_${i + 1}`;
        await setDoc(doc(db, 'banners', id), {
          id,
          ...INITIAL_BANNERS[i],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

    // 2. Check & seed categories
    const categoriesSnap = await getDocs(collection(db, 'categories'));
    if (categoriesSnap.empty) {
      for (let i = 0; i < INITIAL_CATEGORIES.length; i++) {
        const id = `cat_${INITIAL_CATEGORIES[i].slug}`;
        await setDoc(doc(db, 'categories', id), {
          id,
          ...INITIAL_CATEGORIES[i]
        });
      }
    }

    // 3. Check & seed games
    const gamesSnap = await getDocs(collection(db, 'games'));
    if (gamesSnap.empty) {
      for (let i = 0; i < INITIAL_GAMES.length; i++) {
        const id = `game_${INITIAL_GAMES[i].slug}`;
        await setDoc(doc(db, 'games', id), {
          id,
          ...INITIAL_GAMES[i],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

    // 4. Check & seed promotions
    const promosSnap = await getDocs(collection(db, 'promotions'));
    if (promosSnap.empty) {
      for (let i = 0; i < INITIAL_PROMOTIONS.length; i++) {
        const id = `promo_${i + 1}`;
        await setDoc(doc(db, 'promotions', id), {
          id,
          ...INITIAL_PROMOTIONS[i],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

    // 5. Check & seed announcement
    const annSnap = await getDocs(collection(db, 'announcements'));
    if (annSnap.empty) {
      await setDoc(doc(db, 'announcements', 'main_marquee'), {
        id: 'main_marquee',
        ...INITIAL_ANNOUNCEMENT,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // 6. Check & seed site settings
    const settingsDoc = doc(db, 'settings', 'site');
    await setDoc(settingsDoc, INITIAL_SETTINGS, { merge: true });

  } catch (err) {
    console.warn('Seed data initialization note:', err);
  }
}
