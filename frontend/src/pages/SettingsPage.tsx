import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Menu,
  Monitor,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import StudentSidebar from '../components/StudentSidebar';
import MobileBottomNav from '../components/MobileBottomNav';
import NotificationBell from '../components/NotificationBell';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const { profile, updatePassword, isLoading } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const initial = (profile?.full_name || profile?.email || 'S').charAt(0).toUpperCase();

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (passwords.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    if (passwords.password !== passwords.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    const result = await updatePassword(passwords.password);
    if (result.success) {
      setPasswords({ password: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password updated successfully.' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Unable to update password.' });
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
              <h1 className="truncate text-xl font-black tracking-tight text-[#05162E] sm:text-2xl">Settings</h1>
              <p className="mt-1 hidden text-[13px] font-semibold text-slate-500 sm:block">Control your account security and learning workspace.</p>
            </div>
          </div>
          <NotificationBell className="relative grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm" iconClassName="h-4 w-4" badgeClassName="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-[#EE6055] px-1 text-[9px] font-bold text-white" />
        </div>

        <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="relative overflow-hidden bg-[#10294D] p-6 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(238,96,85,0.35),transparent_28%),radial-gradient(circle_at_10%_0%,rgba(255,255,255,0.16),transparent_30%)]" />
              <div className="relative">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/15 text-2xl font-black shadow-2xl">{initial}</div>
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </p>
                <h2 className="mt-3 text-2xl font-black">{profile?.full_name || 'Student'}</h2>
                <p className="mt-2 break-words text-[13px] font-semibold text-white/70">{profile?.email}</p>
              </div>
            </div>
            <div className="grid gap-3 p-5">
              <StatusCard icon={<ShieldCheck className="h-5 w-5" />} label="Email Verification" value="Verified" />
              <StatusCard icon={<Lock className="h-5 w-5" />} label="Password Login" value="Enabled" />
              <StatusCard icon={<Smartphone className="h-5 w-5" />} label="Device Settings" value="This browser" />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#05162E]">Security</h2>
                <p className="mt-1 text-[13px] font-semibold text-slate-500">Update your password for the Jawaaf IELTS Lab account.</p>
              </div>
              <KeyRound className="h-6 w-6 text-[#EE6055]" />
            </div>

            <form onSubmit={handlePasswordSubmit} className="grid gap-4 md:grid-cols-2">
              <PasswordInput label="New Password" value={passwords.password} showPassword={showPassword} onToggle={() => setShowPassword(current => !current)} onChange={(value) => setPasswords(current => ({ ...current, password: value }))} />
              <PasswordInput label="Confirm Password" value={passwords.confirmPassword} showPassword={showPassword} onToggle={() => setShowPassword(current => !current)} onChange={(value) => setPasswords(current => ({ ...current, confirmPassword: value }))} />

              {message && (
                <p className={`md:col-span-2 rounded-2xl px-4 py-3 text-[13px] font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{message.text}</p>
              )}

              <div className="md:col-span-2">
                <button type="submit" disabled={isLoading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#EE6055] px-5 text-[14px] font-black text-white shadow-lg shadow-[#EE6055]/15 transition hover:bg-[#d94d45] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                  <KeyRound className="h-4 w-4" /> {isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#05162E]">Planned Controls</h2>
              <p className="mt-1 text-[13px] font-semibold text-slate-500">These controls are intentionally locked until the real backend features exist.</p>
            </div>
            <Sparkles className="h-6 w-6 text-[#F59E24]" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <PlannedControl icon={<Bell className="h-4 w-4" />} label="Email reminders" description="Needs email provider and scheduled reminder jobs." />
            <PlannedControl icon={<CheckCircle2 className="h-4 w-4" />} label="Course alerts" description="Needs progress-triggered notification rules." />
            <PlannedControl icon={<Monitor className="h-4 w-4" />} label="Display preferences" description="Needs global theme and layout settings." />
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  );
}

function StatusCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">{icon}</div>
        <span className="text-[13px] font-black text-[#05162E]">{label}</span>
      </div>
      <span className="text-[12px] font-black text-emerald-600">{value}</span>
    </div>
  );
}

function PlannedControl({ icon, label, description }: { icon: React.ReactNode; label: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#1E3A6E] shadow-sm">{icon}</div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
          <Clock className="h-3 w-3" /> Planned
        </span>
      </div>
      <p className="mt-4 text-[14px] font-black text-[#05162E]">{label}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function PasswordInput({ label, value, showPassword, onToggle, onChange }: { label: string; value: string; showPassword: boolean; onToggle: () => void; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-black uppercase tracking-[0.08em] text-slate-400">{label}</span>
      <div className="relative">
        <input type={showPassword ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="h-14 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 pr-14 text-[15px] font-bold text-[#05162E] outline-none transition focus:border-[#1E3A6E] focus:bg-white focus:ring-4 focus:ring-[#1E3A6E]/10" />
        <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:bg-white hover:text-[#1E3A6E]" aria-label={showPassword ? 'Hide password' : 'Show password'}>
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
