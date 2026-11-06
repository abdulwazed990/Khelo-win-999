import React, { useState } from 'react';
import { SiteSettings, PaymentMethodConfig } from '../../types';
import { saveSiteSettings } from '../../services/adminConfigService';
import { haptics } from '../../utils/haptics';
import { 
  CreditCard, 
  Upload, 
  Trash2, 
  Save, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Image as ImageIcon,
  DollarSign,
  Gift,
  X,
  ExternalLink,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PaymentSettingsTabProps {
  settings: SiteSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
  lang: 'bn' | 'en';
  adminEmail: string;
  showToast: (msg: string) => void;
  handleImageFileSelect: (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: 'banners' | 'games' | 'categories' | 'promotions' | 'home_ads' | 'payment_methods' | 'logos',
    onComplete: (url: string, path: string) => void
  ) => Promise<void>;
  uploadingImage: boolean;
}

export default function PaymentSettingsTab({
  settings,
  setSettings,
  lang,
  adminEmail,
  showToast,
  handleImageFileSelect,
  uploadingImage
}: PaymentSettingsTabProps) {
  const [saving, setSaving] = useState(false);

  // Fallback defaults for bKash & Nagad official logos
  const DEFAULT_BKASH_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/7/77/Bkash_logo.png';
  const DEFAULT_NAGAD_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/8/87/Nagad_Logo.png';

  const currentBkashLogo = settings?.bkashLogoUrl || DEFAULT_BKASH_LOGO;
  const currentNagadLogo = settings?.nagadLogoUrl || DEFAULT_NAGAD_LOGO;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    haptics.medium();

    try {
      const dataToSave: Partial<SiteSettings> = {
        ...settings,
        minDepositAmount: Number(settings?.minDepositAmount) || 300,
        depositBonusPercent: Number(settings?.depositBonusPercent) || 10
      };

      const result = await saveSiteSettings(dataToSave, adminEmail);

      if (result.success && result.data) {
        setSettings(result.data);
        showToast(
          lang === 'bn'
            ? '✓ পেমেন্ট সেটিংস এবং লোগো স্থায়ীভাবে সংরক্ষিত হয়েছে!'
            : '✓ Payment settings and logos permanently saved to database!'
        );
      } else {
        alert(result.error || 'Failed to save payment settings');
      }
    } catch (err) {
      console.error('Payment settings save error:', err);
      alert('Error saving payment settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-black font-chakra text-slate-900 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-600" />
            <span>{lang === 'bn' ? '৭. পেমেন্ট ও ক্যাশিয়ার সেটিংস' : '7. Payment & Cashier Settings'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'bn' 
              ? 'বিকাশ ও নগদের লোগো, ডিপোজিট একাউন্ট নম্বর, সর্বনিম্ন ডিপোজিট ও বোনাস শতকরা পরিচালনা করুন।' 
              : 'Admin-controlled bKash & Nagad logos, shuffle numbers, minimum deposit, and bonus rates.'}
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-chakra font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Save size={14} />
          <span>{saving ? '...' : (lang === 'bn' ? 'সেভ করুন' : 'Save All')}</span>
        </button>
      </div>

      {/* Info Notice */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
        <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-chakra font-black">
            {lang === 'bn' ? 'ডিপোজিট ও উইথড্রয়াল সমন্বিত লোগো প্রদর্শন' : 'Unified Cashier Logo System'}
          </strong>
          <span>
            {lang === 'bn'
              ? 'এখানে আপলোড করা বিকাশ এবং নগদ লোগো স্বয়ংক্রিয়ভাবে ডিপোজিট এবং উইথড্রয়াল উভয় সেকশনে প্রদর্শিত হয়। কোনো অতিরিক্ত আপলোড প্রয়োজন নেই।'
              : 'Uploaded bKash and Nagad logos automatically update across both Deposit and Withdrawal pages simultaneously.'}
          </span>
        </div>
      </div>

      {/* SECTION 1: DEDICATED BKASH & NAGAD LOGO UPLOADERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* bKash Logo Card */}
        <div className="p-4 bg-pink-50/50 border border-pink-200 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-pink-200/60">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-600"></div>
              <h3 className="font-chakra font-black text-xs uppercase text-pink-900">
                {lang === 'bn' ? 'বিকাশ লোগো আপলোড' : 'bKash Logo Upload'}
              </h3>
            </div>
            {settings?.bkashLogoUrl && (
              <button
                type="button"
                onClick={() => setSettings(prev => prev ? ({ ...prev, bkashLogoUrl: '', bkashLogoStoragePath: '' }) : null)}
                className="text-rose-600 hover:underline text-[10px] font-bold flex items-center gap-1"
              >
                <Trash2 size={11} />
                <span>{lang === 'bn' ? 'রিমুভ' : 'Remove'}</span>
              </button>
            )}
          </div>

          {/* Logo Container & Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-pink-200/80 shadow-2xs space-y-2">
            <div className="w-24 h-16 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center">
              <img
                src={currentBkashLogo}
                alt="bKash Logo"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center">
              <span className="text-[10px] font-bold text-pink-700 block">
                {settings?.bkashLogoUrl ? '✓ কাস্টম লোগো সক্রিয়' : 'ডিফল্ট বিকাশ লোগো'}
              </span>
              <span className="text-[9px] text-slate-400">ডিপোজিট ও উইথড্র পেজে দৃশ্যমান</span>
            </div>
          </div>

          {/* Upload & URL Controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings?.bkashLogoUrl ?? ''}
                onChange={(e) => setSettings(prev => prev ? ({ ...prev, bkashLogoUrl: e.target.value }) : null)}
                placeholder="https://.../bkash.png"
                className="flex-1 px-3 py-2 bg-white border border-pink-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:border-pink-500"
              />
              <label className="px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 transition-all shadow-xs active:scale-95">
                <Upload size={13} />
                <span>{uploadingImage ? '...' : (lang === 'bn' ? 'গ্যালারি' : 'Upload')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(e) => handleImageFileSelect(e, 'logos', (url, path) => {
                    setSettings(prev => prev ? ({ ...prev, bkashLogoUrl: url, bkashLogoStoragePath: path }) : null);
                  })}
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-500">
              {lang === 'bn' ? 'ফোন গ্যালারি থেকে সরাসরি ছবি সিলেক্ট করুন বা ওয়েব লিংক পেস্ট করুন।' : 'Choose image from device or paste direct URL.'}
            </p>
          </div>
        </div>

        {/* Nagad Logo Card */}
        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-600"></div>
              <h3 className="font-chakra font-black text-xs uppercase text-amber-900">
                {lang === 'bn' ? 'নগদ লোগো আপলোড' : 'Nagad Logo Upload'}
              </h3>
            </div>
            {settings?.nagadLogoUrl && (
              <button
                type="button"
                onClick={() => setSettings(prev => prev ? ({ ...prev, nagadLogoUrl: '', nagadLogoStoragePath: '' }) : null)}
                className="text-rose-600 hover:underline text-[10px] font-bold flex items-center gap-1"
              >
                <Trash2 size={11} />
                <span>{lang === 'bn' ? 'রিমুভ' : 'Remove'}</span>
              </button>
            )}
          </div>

          {/* Logo Container & Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-amber-200/80 shadow-2xs space-y-2">
            <div className="w-24 h-16 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center">
              <img
                src={currentNagadLogo}
                alt="Nagad Logo"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center">
              <span className="text-[10px] font-bold text-amber-700 block">
                {settings?.nagadLogoUrl ? '✓ কাস্টম লোগো সক্রিয়' : 'ডিফল্ট নগদ লোগো'}
              </span>
              <span className="text-[9px] text-slate-400">ডিপোজিট ও উইথড্র পেজে দৃশ্যমান</span>
            </div>
          </div>

          {/* Upload & URL Controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings?.nagadLogoUrl ?? ''}
                onChange={(e) => setSettings(prev => prev ? ({ ...prev, nagadLogoUrl: e.target.value }) : null)}
                placeholder="https://.../nagad.png"
                className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:border-amber-500"
              />
              <label className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 transition-all shadow-xs active:scale-95">
                <Upload size={13} />
                <span>{uploadingImage ? '...' : (lang === 'bn' ? 'গ্যালারি' : 'Upload')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(e) => handleImageFileSelect(e, 'logos', (url, path) => {
                    setSettings(prev => prev ? ({ ...prev, nagadLogoUrl: url, nagadLogoStoragePath: path }) : null);
                  })}
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-500">
              {lang === 'bn' ? 'ফোন গ্যালারি থেকে সরাসরি ছবি সিলেক্ট করুন বা ওয়েব লিংক পেস্ট করুন।' : 'Choose image from device or paste direct URL.'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: MINIMUM DEPOSIT & BONUS PERCENTAGE */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
        <div className="text-xs font-black font-chakra text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          <DollarSign size={15} className="text-emerald-600" />
          <span>{lang === 'bn' ? 'ডিপোজিট লিমিট ও বোনাস কনফিগারেশন' : 'Deposit Limit & Bonus Configuration'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 bg-white p-3 rounded-2xl border border-slate-200">
            <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
              <span>{lang === 'bn' ? 'সর্বনিম্ন ডিপোজিট পরিমাণ (টাকা):' : 'Minimum Deposit Amount (BDT):'}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-rajdhani font-black text-slate-500">৳</span>
              <input
                type="number"
                min="100"
                step="50"
                value={settings?.minDepositAmount ?? 300}
                onChange={(e) => setSettings(prev => prev ? ({ ...prev, minDepositAmount: Number(e.target.value) }) : null)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-900"
              />
            </div>
            <span className="text-[10px] text-slate-400 block">ডিফল্ট: ৳৩০০ (ইউজাররা এর নিচে ডিপোজিট রিকোয়েস্ট করতে পারবে না)</span>
          </div>

          <div className="space-y-1 bg-white p-3 rounded-2xl border border-slate-200">
            <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
              <Gift size={13} className="text-pink-600" />
              <span>{lang === 'bn' ? 'ডিপোজিট বোনাস হার (%):' : 'Deposit Bonus Rate (%):'}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={settings?.depositBonusPercent ?? 10}
                onChange={(e) => setSettings(prev => prev ? ({ ...prev, depositBonusPercent: Number(e.target.value) }) : null)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-rajdhani font-black text-slate-500">%</span>
            </div>
            <span className="text-[10px] text-slate-400 block">ডিফল্ট: ১০% বোনাস (উদাঃ ৳৩০০ ডিপোজিট করলে ৳৩০ বোনাস সহ মোট ৳৩৩০ ক্রেডিট)</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: 10 BKASH & 10 NAGAD SHUFFLE NUMBERS */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black font-chakra text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <CreditCard size={15} className="text-blue-600" />
            <span>{lang === 'bn' ? 'ডিপোজিট নম্বরসমূহ (১০টি বিকাশ ও ১০টি নগদ অটো-শাফল)' : 'Deposit Shuffle Numbers (10 bKash & 10 Nagad)'}</span>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
            {lang === 'bn' ? 'অটো-রোটেশন সক্রিয়' : 'Auto-Shuffle Active'}
          </span>
        </div>

        {/* 10 bKash Numbers Grid */}
        <div className="p-3.5 bg-pink-50/50 border border-pink-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-pink-700 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-600 inline-block"></span>
              {lang === 'bn' ? 'বিকাশ ডিপোজিট নম্বরসমূহ (১ থেকে ১০):' : 'bKash Deposit Numbers (1 to 10):'}
            </span>
            <span className="text-[10px] font-bold text-pink-600">
              {((settings?.depositBkashNumbers || (settings?.depositBkashNumber ? [settings.depositBkashNumber] : [])).filter(Boolean).length) || 1} / 10 Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 10 }).map((_, idx) => {
              const existingList = Array.isArray(settings?.depositBkashNumbers) 
                ? [...settings.depositBkashNumbers] 
                : (settings?.depositBkashNumber ? [settings.depositBkashNumber] : []);
              const currentVal = existingList[idx] || (idx === 0 && !existingList.length ? (settings?.depositBkashNumber || '') : '');

              return (
                <div key={`bkash_${idx}`} className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-pink-200">
                  <span className="w-6 h-6 rounded-lg bg-pink-100 text-pink-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={currentVal}
                    placeholder={idx === 0 ? "01XXXXXXXXX (প্রধান নম্বর)" : `বিকাশ নম্বর ${idx + 1}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      const nextArr = [...existingList];
                      while (nextArr.length <= idx) nextArr.push('');
                      nextArr[idx] = val;
                      const primary = nextArr.find(n => n.trim().length > 0) || '';
                      setSettings(prev => prev ? ({
                        ...prev,
                        depositBkashNumbers: nextArr,
                        depositBkashNumber: primary
                      }) : null);
                    }}
                    className="w-full px-2 py-1 bg-transparent text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                  />
                  {currentVal && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextArr = [...existingList];
                        nextArr[idx] = '';
                        const primary = nextArr.find(n => n.trim().length > 0) || '';
                        setSettings(prev => prev ? ({
                          ...prev,
                          depositBkashNumbers: nextArr,
                          depositBkashNumber: primary
                        }) : null);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 10 Nagad Numbers Grid */}
        <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-700 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block"></span>
              {lang === 'bn' ? 'নগদ ডিপোজিট নম্বরসমূহ (১ থেকে ১০):' : 'Nagad Deposit Numbers (1 to 10):'}
            </span>
            <span className="text-[10px] font-bold text-amber-600">
              {((settings?.depositNagadNumbers || (settings?.depositNagadNumber ? [settings.depositNagadNumber] : [])).filter(Boolean).length) || 1} / 10 Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 10 }).map((_, idx) => {
              const existingList = Array.isArray(settings?.depositNagadNumbers) 
                ? [...settings.depositNagadNumbers] 
                : (settings?.depositNagadNumber ? [settings.depositNagadNumber] : []);
              const currentVal = existingList[idx] || (idx === 0 && !existingList.length ? (settings?.depositNagadNumber || '') : '');

              return (
                <div key={`nagad_${idx}`} className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-amber-200">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={currentVal}
                    placeholder={idx === 0 ? "01XXXXXXXXX (প্রধান নম্বর)" : `নগদ নম্বর ${idx + 1}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      const nextArr = [...existingList];
                      while (nextArr.length <= idx) nextArr.push('');
                      nextArr[idx] = val;
                      const primary = nextArr.find(n => n.trim().length > 0) || '';
                      setSettings(prev => prev ? ({
                        ...prev,
                        depositNagadNumbers: nextArr,
                        depositNagadNumber: primary
                      }) : null);
                    }}
                    className="w-full px-2 py-1 bg-transparent text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                  />
                  {currentVal && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextArr = [...existingList];
                        nextArr[idx] = '';
                        const primary = nextArr.find(n => n.trim().length > 0) || '';
                        setSettings(prev => prev ? ({
                          ...prev,
                          depositNagadNumbers: nextArr,
                          depositNagadNumber: primary
                        }) : null);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-chakra font-black text-xs sm:text-sm rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Save size={16} />
          <span>{saving ? 'সংরক্ষণ করা হচ্ছে...' : (lang === 'bn' ? 'পেমেন্ট ও লোগো সেটিংস স্থায়ীভাবে সংরক্ষণ করুন' : 'Permanently Save Payment & Logo Settings')}</span>
        </button>
      </div>
    </form>
  );
}
