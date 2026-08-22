import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'bn' | 'en';

export interface LanguageContextType {
  lang: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
  getLocalizedText: (item: any, fieldBaseName: string, defaultFallback?: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  bn: {
    // Brand & App
    'app.name': 'TK333',
    'app.tagline': 'অফিসিয়াল ভিআইপি মোবাইল ক্যাসিনো',
    'app.loading': 'TK333 ভিআইপি ক্যাসিনো লোড হচ্ছে...',
    
    // Header & Navigation
    'nav.home': 'হোম',
    'nav.promotion': 'প্রমোশন',
    'nav.agent': 'এজেন্ট',
    'nav.prize': 'উপহার',
    'nav.member': 'মেম্বার',
    'nav.deposit': 'ডিপোজিট',
    'nav.withdraw': 'উইথড্র',
    'nav.history': 'ইতিহাস',
    'nav.transactions': 'লেনদেন',
    'nav.admin': 'অ্যাডমিন প্যানেল',
    'nav.profile': 'প্রোফাইল',
    'nav.search': 'গেম খুঁজুন...',
    'nav.search_title': 'TK333 গেম অনুসন্ধান',
    'nav.popular_tags': 'জনপ্রিয়:',
    'nav.show_results': 'লবিতে ফলাফল দেখুন',
    'nav.login': 'লগইন',
    'nav.register': 'রেজিস্টার',
    'nav.logout': 'লগআউট',
    'nav.refresh_balance': 'ব্যালেন্স রিফ্রেশ করুন',
    'nav.quick_menu': 'মেনু',
    'nav.vip_status': 'ভিআইপি মেম্বার',
    'nav.balance': 'ব্যালেন্স',
    'nav.language': 'ভাষা',
    'nav.switch_language': 'English এ পরিবর্তন করুন',

    // Home Sections
    'home.hero_badge': 'মেগা জ্যাকপট',
    'home.play_now': 'খেলুন',
    'home.claim_now': 'দাবি করুন',
    'home.hot_games': 'হট গেমস',
    'home.all_games': 'সকল গেম',
    'home.featured': 'বিশেষ গেম',
    'home.live_winners': 'লাইভ বিজয়ী তালিকা',
    'home.just_won': 'মাত্র জিতেছেন',
    'home.jackpot_pool': 'TK333 প্রগ্রেসিভ জ্যাকপট পুল',
    'home.instant_payout': 'তাৎক্ষণিক ক্যাশআউট',
    'home.active_players': 'অনলাইন প্লেয়ার',
    'home.search_no_results': 'কোনো গেম খুঁজে পাওয়া যায়নি',
    'home.search_try_again': 'অন্য কিওয়ার্ড দিয়ে পুনরায় চেষ্টা করুন',
    'home.clear_filter': 'ফিল্টার মুছুন',
    'home.category_all': 'সকল',
    'home.category_hot': 'হট গেমস',
    'home.category_slots': 'স্লট',
    'home.category_crash': 'ক্র্যাশ',
    'home.category_table': 'টেবিল',
    'home.category_live': 'লাইভ ক্যাসিনো',
    'home.category_sports': 'স্পোর্টস',
    'home.category_fish': 'ফিশ হান্টার',
    'home.category_esports': 'ই-স্পোর্টস',

    // Game Cards & Buttons
    'game.play': 'খেলুন',
    'game.demo': 'ডেমো',
    'game.hot': 'হট',
    'game.new': 'নতুন',
    'game.popular': 'জনপ্রিয়',
    'game.rating': 'রেটিং',
    'game.players': 'প্লেয়ার',
    'game.maintenance': 'রক্ষণাবেক্ষণ চলছে',

    // Promotions
    'promo.title': 'প্রমোশন এবং অফার',
    'promo.subtitle': 'TK333 এর সেরা এক্সক্লুসিভ ডিপোজিট বোনাস ও ক্যাশব্যাক',
    'promo.claim_btn': 'অফার নিন',
    'promo.rules': 'নিয়ম ও শর্তাবলী',
    'promo.max_bonus': 'সর্বোচ্চ বোনাস',
    'promo.active_tag': 'চলমান',
    'promo.expired_tag': 'মেয়াদ উত্তীর্ণ',
    'promo.no_promos': 'বর্তমানে কোনো সক্রিয় প্রমোশন নেই',

    // Agent
    'agent.title': 'TK333 ভিআইপি পার্টনার প্রোগ্রাম',
    'agent.subtitle': 'বন্ধুদের আমন্ত্রণ জানান এবং আজীবন ৪০% পর্যন্ত কমিশন অর্জন করুন',
    'agent.commission_rate': '৪০% আজীবন রেভিনিউ শেয়ার',
    'agent.referral_link': 'আপনার রেফারেল লিংক',
    'agent.copy_link': 'লিংক কপি করুন',
    'agent.copied': 'কপি করা হয়েছে!',
    'agent.share_qr': 'কিউআর কোড শেয়ার করুন',
    'agent.tier1': 'লেভেল ১ কমিশন (২৫%)',
    'agent.tier2': 'লেভেল ২ কমিশন (১৫%)',
    'agent.how_it_works': 'এটি কিভাবে কাজ করে?',
    'agent.step1_title': '১. লিংক শেয়ার করুন',
    'agent.step1_desc': 'সোশ্যাল মিডিয়া বা বন্ধুদের সাথে আপনার রেফারেল লিংক শেয়ার করুন।',
    'agent.step2_title': '২. বন্ধুরা ডিপোজিট করবে',
    'agent.step2_desc': 'আপনার রেফার করা প্লেয়াররা নিরাপদে বিকাশ, নগদ বা রকেটে ডিপোজিট করে খেলবে।',
    'agent.step3_title': '৩. দৈনিক কমিশন পান',
    'agent.step3_desc': 'তাদের প্রতি বাজি থেকে স্বয়ংক্রিয়ভাবে লাইফটাইম কমিশন আপনার একাউন্টে জমা হবে।',
    'agent.join_agent_btn': 'এজেন্ট হিসেবে যুক্ত হন',

    // Prize Center
    'prize.title': 'TK333 রিওয়ার্ড সেন্টার',
    'prize.subtitle': 'দৈনিক ফ্রি স্পিন এবং নিশ্চিত ক্যাশ উপহার লুফে নিন',
    'prize.spin_wheel': 'লাকি স্পিন হুইল',
    'prize.spin_desc': 'প্রতি ২৪ ঘণ্টায় বিনামূল্যে স্পিন করে জিতে নিন নগদ টাকা!',
    'prize.daily_bonus': 'দৈনিক লগইন বোনাস',
    'prize.daily_desc': 'প্রতিদিন লগইন করে ৳২০ থেকে ৳৫০০ পর্যন্ত ইনস্ট্যান্ট বোনাস সংগ্রহ করুন।',
    'prize.claim': 'সংগ্রহ করুন',
    'prize.claimed': 'ইতিমধ্যে সংগৃহীত',
    'prize.spin_now': 'স্পিন করুন',
    'prize.spinning': 'স্পিন হচ্ছে...',
    'prize.congrats': 'অভিনন্দন!',
    'prize.you_won': 'আপনি জিতেছেন',
    'prize.come_back_tomorrow': 'আগামীকাল আবার চেষ্টা করুন',

    // Member & Account
    'member.title': 'সদস্য কেন্দ্র',
    'member.welcome': 'স্বাগতম',
    'member.user_id': 'ইউজার আইডি',
    'member.phone': 'ফোন নম্বর',
    'member.vip_badge': 'ভিআইপি লেভেল ১',
    'member.main_wallet': 'মূল ওয়ালেট',
    'member.deposit_btn': 'টাকা জমা (ডিপোজিট)',
    'member.withdraw_btn': 'টাকা উত্তোলন (উইথড্র)',
    'member.deposit_history': 'ডিপোজিট হিস্টোরি',
    'member.withdraw_history': 'উইথড্র হিস্টোরি',
    'member.bet_history': 'বাজির ইতিহাস',
    'member.turnover': 'টার্নওভার অগ্রগতি',
    'member.support': 'কাস্টমার সাপোর্ট',
    'member.telegram': 'অফিসিয়াল টেলিগ্রাম',
    'member.whatsapp': 'হোয়াটসঅ্যাপ হেল্পলাইন',
    'member.livechat': 'লাইভ চ্যাট',
    'member.security': 'নিরাপত্তা ও সেটিংস',
    'member.admin_access': 'অ্যাডমিন ড্যাশবোর্ডে যান',

    // Deposit & Withdraw Forms
    'wallet.deposit_title': 'টাকা জমা দিন',
    'wallet.withdraw_title': 'টাকা উত্তোলন করুন',
    'wallet.select_method': 'পেমেন্ট মেথড নির্বাচন করুন',
    'wallet.amount': 'পরিমাণ (৳)',
    'wallet.sender_number': 'আপনার বিকাশ / নগদ / রকেট নম্বর',
    'wallet.receiver_number': 'আমাদের এজেন্ট নম্বর (ক্যাশআউট/সেন্ডমানি)',
    'wallet.trx_id': 'ট্রানজেকশন আইডি (TrxID)',
    'wallet.copy': 'কপি করুন',
    'wallet.submit_deposit': 'ডিপোজিট নিশ্চিত করুন',
    'wallet.submit_withdraw': 'উইথড্র রিকোয়েস্ট পাঠান',
    'wallet.min_deposit': 'সর্বনিম্ন ডিপোজিট: ৳২০০ | সর্বোচ্চ: ৳৫০,০০০',
    'wallet.min_withdraw': 'সর্বনিম্ন উইথড্র: ৳৫০০ | সর্বোচ্চ: ৳২৫,০০০',
    'wallet.deposit_success': 'ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে! অ্যাডমিন অনুমোদনের পর ব্যালেন্সে যোগ হবে।',
    'wallet.withdraw_success': 'উইথড্র রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে! ৩-৫ মিনিটের মধ্যে টাকা পাবেন।',
    'wallet.insufficient_balance': 'অপর্যাপ্ত ব্যালেন্স!',
    'wallet.pending': 'অপেক্ষমান',
    'wallet.approved': 'অনুমোদিত',
    'wallet.rejected': 'বাতিল',

    // Auth
    'auth.login_title': 'TK333 এ লগইন করুন',
    'auth.register_title': 'নতুন একাউন্ট তৈরি করুন',
    'auth.email': 'ইমেইল এড্রেস',
    'auth.password': 'পাসওয়ার্ড',
    'auth.confirm_password': 'পাসওয়ার্ড নিশ্চিত করুন',
    'auth.phone': 'ফোন নম্বর (বিকাশ/নগদ)',
    'auth.name': 'পুরো নাম',
    'auth.login_btn': 'লগইন করুন',
    'auth.register_btn': 'একাউন্ট তৈরি করুন',
    'auth.google_login': 'Google দিয়ে সরাসরি প্রবেশ করুন',
    'auth.have_account': 'ইতিমধ্যে একাউন্ট আছে? লগইন করুন',
    'auth.no_account': 'নতুন প্লেয়ার? এখনই রেজিস্টার করুন',
    'auth.login_success': 'সফলভাবে লগইন হয়েছে!',
    'auth.register_success': 'একাউন্ট সফলভাবে তৈরি হয়েছে!',

    // Admin Specific Labels
    'admin.title': 'TK333 অ্যাডমিন কন্ট্রোল প্যানেল',
    'admin.mobile_header': 'অ্যাডমিন কন্ট্রোল',
    'admin.dashboard': 'ড্যাশবোর্ড',
    'admin.banners': 'ব্যানার',
    'admin.games': 'গেম',
    'admin.categories': 'ক্যাটাগরি',
    'admin.promotions': 'প্রমোশন',
    'admin.announcements': 'ঘোষণা (মারকিউ)',
    'admin.transactions': 'লেনদেন ও পেমেন্ট',
    'admin.settings': 'ওয়েবসাইট সেটিংস',
    'admin.profile': 'অ্যাডমিন প্রোফাইল',
    'admin.back_to_site': 'ওয়েবসাইটে ফিরে যান',
    'admin.total_games': 'মোট গেম',
    'admin.active_games': 'সক্রিয় গেম',
    'admin.hot_games': 'হট গেম',
    'admin.total_banners': 'মোট ব্যানার',
    'admin.active_banners': 'সক্রিয় ব্যানার',
    'admin.pending_deposits': 'অপেক্ষমান ডিপোজিট',
    'admin.pending_withdraws': 'অপেক্ষমান উইথড্র',
    'admin.add_banner': '+ নতুন ব্যানার যোগ করুন',
    'admin.add_game': '+ নতুন গেম যোগ করুন',
    'admin.add_category': '+ নতুন ক্যাটাগরি যোগ করুন',
    'admin.add_promotion': '+ নতুন প্রমোশন যোগ করুন',
    'admin.upload_from_gallery': '📱 ফোন গ্যালারি থেকে ছবি আপলোড করুন',
    'admin.uploading': 'আপলোড হচ্ছে...',
    'admin.upload_failed': 'আপলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
    'admin.save_success': 'সফলভাবে সংরক্ষিত হয়েছে!',
    'admin.delete_confirm': 'আপনি কি নিশ্চিতভাবে এটি মুছে ফেলতে চান?',
    'admin.edit': 'সম্পাদনা',
    'admin.delete': 'মুছুন',
    'admin.enable': 'সক্রিয়',
    'admin.disable': 'নিষ্ক্রিয়',
    'admin.approve': 'অনুমোদন করুন',
    'admin.reject': 'বাতিল করুন',
    'admin.status': 'অবস্থা',
    'admin.order': 'ক্রম',
    'admin.actions': 'অ্যাকশন',
    'admin.name_bn': 'বাংলা নাম / শিরোনাম',
    'admin.name_en': 'ইংরেজি নাম / শিরোনাম',
    'admin.desc_bn': 'বাংলা বিবরণ',
    'admin.desc_en': 'ইংরেজি বিবরণ',
    'admin.image_preview': 'ছবির প্রিভিউ',

    // Floating Support & Footer
    'support.need_help': 'সাহায্য প্রয়োজন?',
    'support.24_7': '২৪/৭ কাস্টমার সাপোর্ট',
    'support.contact_telegram': 'টেলিগ্রামে বার্তা পাঠান',
    'support.contact_whatsapp': 'হোয়াটসঅ্যাপ হেল্পলাইন',
    'support.contact_livechat': 'লাইভ চ্যাটে কথা বলুন',
    'footer.rights': 'সর্বস্বত্ব সংরক্ষিত।',
    'footer.age_warning': '১৮+ দায়িত্বশীলভাবে খেলুন। জুয়া আসক্তি সৃষ্টি করতে পারে।'
  },
  en: {
    // Brand & App
    'app.name': 'TK333',
    'app.tagline': 'Official VIP Mobile Casino',
    'app.loading': 'LOADING TK333 VIP CASINO...',
    
    // Header & Navigation
    'nav.home': 'Home',
    'nav.promotion': 'Promotion',
    'nav.agent': 'Agent',
    'nav.prize': 'Prize',
    'nav.member': 'Member',
    'nav.deposit': 'Deposit',
    'nav.withdraw': 'Withdraw',
    'nav.history': 'History',
    'nav.transactions': 'Transactions',
    'nav.admin': 'Admin Panel',
    'nav.profile': 'Profile',
    'nav.search': 'Search games...',
    'nav.search_title': 'Search TK333 Games',
    'nav.popular_tags': 'Popular:',
    'nav.show_results': 'Show Results in Lobby',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.logout': 'Logout',
    'nav.refresh_balance': 'Refresh Balance',
    'nav.quick_menu': 'Menu',
    'nav.vip_status': 'VIP Member',
    'nav.balance': 'Balance',
    'nav.language': 'Language',
    'nav.switch_language': 'Switch to বাংলা',

    // Home Sections
    'home.hero_badge': 'MEGA JACKPOT',
    'home.play_now': 'PLAY NOW',
    'home.claim_now': 'CLAIM NOW',
    'home.hot_games': 'Hot Games',
    'home.all_games': 'All Games',
    'home.featured': 'Featured Games',
    'home.live_winners': 'Live Winners Feed',
    'home.just_won': 'Just won',
    'home.jackpot_pool': 'TK333 Progressive Jackpot Pool',
    'home.instant_payout': 'Instant Cashout',
    'home.active_players': 'Active Players',
    'home.search_no_results': 'No games found matching your search',
    'home.search_try_again': 'Try searching with another keyword',
    'home.clear_filter': 'Clear Filter',
    'home.category_all': 'All',
    'home.category_hot': 'Hot Games',
    'home.category_slots': 'Slots',
    'home.category_crash': 'Crash',
    'home.category_table': 'Table',
    'home.category_live': 'Live Casino',
    'home.category_sports': 'Sports',
    'home.category_fish': 'Fish Hunter',
    'home.category_esports': 'E-Sports',

    // Game Cards & Buttons
    'game.play': 'PLAY',
    'game.demo': 'DEMO',
    'game.hot': 'HOT',
    'game.new': 'NEW',
    'game.popular': 'POPULAR',
    'game.rating': 'Rating',
    'game.players': 'Players',
    'game.maintenance': 'Under Maintenance',

    // Promotions
    'promo.title': 'Promotions & Rewards',
    'promo.subtitle': 'Exclusive Deposit Bonuses & Cash Rebates at TK333',
    'promo.claim_btn': 'CLAIM OFFER',
    'promo.rules': 'Terms & Conditions',
    'promo.max_bonus': 'Max Bonus',
    'promo.active_tag': 'Active',
    'promo.expired_tag': 'Expired',
    'promo.no_promos': 'No active promotions available right now',

    // Agent
    'agent.title': 'TK333 VIP Affiliate Partner Program',
    'agent.subtitle': 'Invite friends and earn up to 40% lifetime commission',
    'agent.commission_rate': '40% Lifetime Revenue Share',
    'agent.referral_link': 'Your Referral Link',
    'agent.copy_link': 'Copy Link',
    'agent.copied': 'Copied!',
    'agent.share_qr': 'Share QR Code',
    'agent.tier1': 'Tier-1 Commission (25%)',
    'agent.tier2': 'Tier-2 Commission (15%)',
    'agent.how_it_works': 'How It Works',
    'agent.step1_title': '1. Share Referral Link',
    'agent.step1_desc': 'Share your unique link on social media or with friends.',
    'agent.step2_title': '2. Players Deposit',
    'agent.step2_desc': 'Your referrals deposit safely using Bkash, Nagad, or Rocket.',
    'agent.step3_title': '3. Earn Daily Profits',
    'agent.step3_desc': 'Receive automatic lifetime revenue share on every wager.',
    'agent.join_agent_btn': 'Join as Partner',

    // Prize Center
    'prize.title': 'TK333 Prize & Reward Center',
    'prize.subtitle': 'Daily free spins and guaranteed cash rewards',
    'prize.spin_wheel': 'Lucky Free Spin Wheel',
    'prize.spin_desc': 'Spin once every 24 hours for guaranteed instant cash prizes!',
    'prize.daily_bonus': 'Daily Check-in Bonus',
    'prize.daily_desc': 'Log in daily to claim ৳20 up to ৳500 instant bonus cash.',
    'prize.claim': 'Claim',
    'prize.claimed': 'Already Claimed',
    'prize.spin_now': 'SPIN NOW',
    'prize.spinning': 'SPINNING...',
    'prize.congrats': 'CONGRATULATIONS!',
    'prize.you_won': 'You Won',
    'prize.come_back_tomorrow': 'Come back tomorrow',

    // Member & Account
    'member.title': 'Member Center',
    'member.welcome': 'Welcome',
    'member.user_id': 'User ID',
    'member.phone': 'Phone Number',
    'member.vip_badge': 'VIP Level 1',
    'member.main_wallet': 'Main Wallet',
    'member.deposit_btn': 'Deposit Funds',
    'member.withdraw_btn': 'Withdraw Funds',
    'member.deposit_history': 'Deposit History',
    'member.withdraw_history': 'Withdraw History',
    'member.bet_history': 'Betting History',
    'member.turnover': 'Turnover Progress',
    'member.support': 'Customer Support',
    'member.telegram': 'Official Telegram',
    'member.whatsapp': 'WhatsApp Helpline',
    'member.livechat': 'Live Chat',
    'member.security': 'Security & Settings',
    'member.admin_access': 'Go to Admin Dashboard',

    // Deposit & Withdraw Forms
    'wallet.deposit_title': 'Deposit Money',
    'wallet.withdraw_title': 'Withdraw Money',
    'wallet.select_method': 'Select Payment Method',
    'wallet.amount': 'Amount (৳)',
    'wallet.sender_number': 'Your Bkash / Nagad / Rocket Number',
    'wallet.receiver_number': 'Our Agent Number (Cashout/Send Money)',
    'wallet.trx_id': 'Transaction ID (TrxID)',
    'wallet.copy': 'Copy',
    'wallet.submit_deposit': 'Confirm Deposit',
    'wallet.submit_withdraw': 'Submit Withdraw Request',
    'wallet.min_deposit': 'Min Deposit: ৳200 | Max: ৳50,000',
    'wallet.min_withdraw': 'Min Withdraw: ৳500 | Max: ৳25,000',
    'wallet.deposit_success': 'Deposit request submitted successfully! Funds will be added upon admin approval.',
    'wallet.withdraw_success': 'Withdraw request submitted! Funds will arrive in 3-5 minutes.',
    'wallet.insufficient_balance': 'Insufficient balance!',
    'wallet.pending': 'Pending',
    'wallet.approved': 'Approved',
    'wallet.rejected': 'Rejected',

    // Auth
    'auth.login_title': 'Login to TK333',
    'auth.register_title': 'Create New Account',
    'auth.email': 'Email Address',
    'auth.password': 'Password',
    'auth.confirm_password': 'Confirm Password',
    'auth.phone': 'Phone Number (Bkash/Nagad)',
    'auth.name': 'Full Name',
    'auth.login_btn': 'Login Now',
    'auth.register_btn': 'Register Account',
    'auth.google_login': 'Continue with Google',
    'auth.have_account': 'Already have an account? Login',
    'auth.no_account': 'New player? Register now',
    'auth.login_success': 'Logged in successfully!',
    'auth.register_success': 'Account created successfully!',

    // Admin Specific Labels
    'admin.title': 'TK333 Admin Control Center',
    'admin.mobile_header': 'Admin Control',
    'admin.dashboard': 'Dashboard',
    'admin.banners': 'Banners',
    'admin.games': 'Games',
    'admin.categories': 'Categories',
    'admin.promotions': 'Promotions',
    'admin.announcements': 'Announcements',
    'admin.transactions': 'Transactions',
    'admin.settings': 'Site Settings',
    'admin.profile': 'Admin Profile',
    'admin.back_to_site': 'Back to Website',
    'admin.total_games': 'Total Games',
    'admin.active_games': 'Active Games',
    'admin.hot_games': 'Hot Games',
    'admin.total_banners': 'Total Banners',
    'admin.active_banners': 'Active Banners',
    'admin.pending_deposits': 'Pending Deposits',
    'admin.pending_withdraws': 'Pending Withdrawals',
    'admin.add_banner': '+ Add New Banner',
    'admin.add_game': '+ Add New Game',
    'admin.add_category': '+ Add New Category',
    'admin.add_promotion': '+ Add New Promotion',
    'admin.upload_from_gallery': '📱 Upload Image from Phone Gallery',
    'admin.uploading': 'Uploading...',
    'admin.upload_failed': 'Upload failed. Please try again.',
    'admin.save_success': 'Saved successfully!',
    'admin.delete_confirm': 'Are you sure you want to delete this?',
    'admin.edit': 'Edit',
    'admin.delete': 'Delete',
    'admin.enable': 'Active',
    'admin.disable': 'Inactive',
    'admin.approve': 'Approve',
    'admin.reject': 'Reject',
    'admin.status': 'Status',
    'admin.order': 'Sort Order',
    'admin.actions': 'Actions',
    'admin.name_bn': 'Bangla Name / Title',
    'admin.name_en': 'English Name / Title',
    'admin.desc_bn': 'Bangla Description',
    'admin.desc_en': 'English Description',
    'admin.image_preview': 'Image Preview',

    // Floating Support & Footer
    'support.need_help': 'Need Help?',
    'support.24_7': '24/7 Customer Support',
    'support.contact_telegram': 'Message on Telegram',
    'support.contact_whatsapp': 'WhatsApp Helpline',
    'support.contact_livechat': 'Chat with Agent',
    'footer.rights': 'All rights reserved.',
    'footer.age_warning': '18+ Play Responsibly. Gambling can be addictive.'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial language: Bengali ('bn') by default or saved choice from localStorage
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('tk333_lang');
      if (saved === 'en' || saved === 'bn') return saved;
    } catch {
      // ignore
    }
    return 'bn'; // Default is always Bengali (বাংলা)
  });

  const setLanguage = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('tk333_lang', newLang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(lang === 'bn' ? 'en' : 'bn');
  };

  // Safe translation retrieval
  const t = (key: string, defaultText?: string): string => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.bn;
    if (dict[key]) return dict[key];
    // Fallback to Bengali if not in current
    if (TRANSLATIONS.bn[key]) return TRANSLATIONS.bn[key];
    return defaultText || key;
  };

  // Helper to extract bilingual field from Firestore documents
  const getLocalizedText = (item: any, fieldBaseName: string, defaultFallback: string = ''): string => {
    if (!item) return defaultFallback;

    if (lang === 'bn') {
      const bnKey = `${fieldBaseName}Bn`;
      if (item[bnKey] && typeof item[bnKey] === 'string' && item[bnKey].trim() !== '') {
        return item[bnKey];
      }
      // Check standard field
      if (item[fieldBaseName] && typeof item[fieldBaseName] === 'string' && item[fieldBaseName].trim() !== '') {
        return item[fieldBaseName];
      }
      const enKey = `${fieldBaseName}En`;
      if (item[enKey] && typeof item[enKey] === 'string') return item[enKey];
    } else {
      // English requested
      const enKey = `${fieldBaseName}En`;
      if (item[enKey] && typeof item[enKey] === 'string' && item[enKey].trim() !== '') {
        return item[enKey];
      }
      if (item[fieldBaseName] && typeof item[fieldBaseName] === 'string' && item[fieldBaseName].trim() !== '') {
        return item[fieldBaseName];
      }
      const bnKey = `${fieldBaseName}Bn`;
      if (item[bnKey] && typeof item[bnKey] === 'string') return item[bnKey];
    }

    return defaultFallback;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, toggleLanguage, t, getLocalizedText }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
