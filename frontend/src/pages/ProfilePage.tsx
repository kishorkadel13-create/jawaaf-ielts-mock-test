import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Crown,
  Globe2,
  Mail,
  Menu,
  Phone,
  Save,
  ShieldCheck,
  Target,
  User,
} from 'lucide-react';
import StudentSidebar from '../components/StudentSidebar';
import MobileBottomNav from '../components/MobileBottomNav';
import NotificationBell from '../components/NotificationBell';
import { useAuthStore } from '../store/authStore';

const formatDate = (date?: string | null) => {
  if (!date) return 'Not set';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Not set'
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const metadataValue = (value: unknown, fallback = 'Not provided') => {
  const text = String(value || '').trim();
  return text || fallback;
};

export default function ProfilePage() {
  const { profile, user, updateProfileDetails, isLoading } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const metadata = user?.user_metadata || {};
  const initial = (profile?.full_name || profile?.email || 'S').charAt(0).toUpperCase();
  const premiumExpiry = profile?.premium_access_expires_at ? new Date(profile.premium_access_expires_at) : null;
  const daysLeft = premiumExpiry
    ? Math.max(0, Math.ceil((premiumExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const hasPremium = Boolean(profile?.has_full_access);

  const profileStats = useMemo(() => [
    { label: 'Account Status', value: hasPremium ? 'Premium' : 'Standard', icon: Crown, tone: 'bg-[#EE6055]/10 text-[#EE6055]' },
    { label: 'Target Band', value: metadataValue(metadata.target_score, 'Not set'), icon: Target, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Study Destination', value: metadataValue(metadata.interested_country), icon: Globe2, tone: 'bg-emerald-50 text-emerald-600' },
  ], [hasPremium, metadata.interested_country, metadata.target_score]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
  }, [profile?.full_name]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const result = await updateProfileDetails({ full_name: fullName });
    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Unable to update profile.' });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] pb-24 font-sans lg:flex-row lg:pb-0" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <StudentSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">
        <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-5 flex items-center justify-between gap-3 border-b border-slate-200 bg-[#F8FAFC]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 md:-mx-8 md:-mt-8 md:px-8 lg:static lg:m-0 lg:mb-8 lg:border-0 lg:bg-transparent lg:p-0">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setIsSidebarOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-[#1E3A6E] shadow-sm lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="truncate text-xl font-black tracking-tight text-[#05162E] sm:text-2xl">Profile</h1>
              <p className="mt-1 hidden text-[13px] font-semibold text-slate-500 sm:block">Manage your learner identity and IELTS goal.</p>
            </div>
          </div>
          <NotificationBell className="relative grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm" iconClassName="h-4 w-4" badgeClassName="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-[#EE6055] px-1 text-[9px] font-bold text-white" />
        </div>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="relative bg-[#10294D] px-5 py-8 text-white sm:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(245,158,36,0.28),transparent_30%),radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.16),transparent_26%)]" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl border border-white/20 bg-white/15 text-3xl font-black shadow-2xl">{initial}</div>
                <div className="min-w-0">
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/80">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified learner
                  </p>
                  <h2 className="truncate text-2xl font-black sm:text-4xl">{profile?.full_name || 'Student'}</h2>
                  <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-white/70"><Mail className="h-4 w-4" /> {profile?.email}</p>
                </div>
              </div>
              <Link to={hasPremium ? '/courses' : '/access-request'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-[13px] font-black text-[#10294D] shadow-lg transition-transform hover:-translate-y-0.5">
                {hasPremium ? 'Continue Learning' : 'Request Premium'} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
            {profileStats.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
                  <div className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl ${item.tone}`}><Icon className="h-5 w-5" /></div>
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">{item.label}</p>
                  <p className="mt-1 text-lg font-black text-[#05162E]">{item.value}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#05162E]">Personal Details</h2>
                <p className="mt-1 text-[13px] font-semibold text-slate-500">Keep your student record clean and recognizable.</p>
              </div>
              <User className="h-6 w-6 text-[#1E3A6E]" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-[12px] font-black uppercase tracking-[0.08em] text-slate-400">Full Name</span>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-14 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 text-[15px] font-bold text-[#05162E] outline-none transition focus:border-[#1E3A6E] focus:bg-white focus:ring-4 focus:ring-[#1E3A6E]/10" />
              </label>
              <InfoTile icon={<Mail className="h-4 w-4" />} label="Email" value={profile?.email || 'Not provided'} />
              <InfoTile icon={<Phone className="h-4 w-4" />} label="Phone" value={metadataValue(metadata.phone)} />
              <InfoTile icon={<Globe2 className="h-4 w-4" />} label="Interested Country" value={metadataValue(metadata.interested_country)} />
              <InfoTile icon={<Target className="h-4 w-4" />} label="Target Score" value={metadataValue(metadata.target_score, 'Not set')} />
            </div>

            {message && (
              <p className={`mt-4 rounded-2xl px-4 py-3 text-[13px] font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{message.text}</p>
            )}

            <button type="submit" disabled={isLoading} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1E3A6E] px-5 text-[14px] font-black text-white shadow-lg shadow-[#1E3A6E]/15 transition hover:bg-[#294b77] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              <Save className="h-4 w-4" /> {isLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          <aside className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-[#05162E]">Access Overview</h2>
            <div className="mt-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-[#1E3A6E] p-5 text-white">
              <Crown className="h-8 w-8 fill-current" />
              <p className="mt-5 text-2xl font-black">{hasPremium ? 'Premium Active' : 'Premium Locked'}</p>
              <p className="mt-2 text-[13px] font-semibold text-white/75">{hasPremium ? `${daysLeft ?? 'Unlimited'} ${daysLeft === 1 ? 'day' : 'days'} remaining` : 'Request access to unlock all learning modules.'}</p>
            </div>
            <div className="mt-5 grid gap-3">
              <AccessRow icon={<BookOpen className="h-4 w-4" />} label="Recorded Courses" active={hasPremium} />
              <AccessRow icon={<Award className="h-4 w-4" />} label="Full Mock Tests" active={hasPremium} />
              <AccessRow icon={<CheckCircle2 className="h-4 w-4" />} label="Practice Tests" active={hasPremium} />
              <AccessRow icon={<CalendarClock className="h-4 w-4" />} label="Expiry" active value={formatDate(profile?.premium_access_expires_at)} />
            </div>
          </aside>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-[11px] font-black uppercase tracking-[0.08em]">{label}</span></div>
      <p className="mt-2 break-words text-[14px] font-black text-[#05162E]">{value}</p>
    </div>
  );
}

function AccessRow({ icon, label, active, value }: { icon: React.ReactNode; label: string; active: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{icon}</div>
        <span className="text-[13px] font-black text-[#05162E]">{label}</span>
      </div>
      <span className={`text-[12px] font-black ${active ? 'text-emerald-600' : 'text-slate-400'}`}>{value || (active ? 'Active' : 'Locked')}</span>
    </div>
  );
}
