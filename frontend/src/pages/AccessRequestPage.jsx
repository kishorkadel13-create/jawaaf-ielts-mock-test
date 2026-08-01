import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../services/api.js';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Crown, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import JawaafLogo from '../components/JawaafLogo';
import MobileBottomNav from '../components/MobileBottomNav';

export default function AccessRequestPage() {
  const { profile, updateProfileAccess } = useAuthStore();
  const [requestStatus, setRequestStatus] = useState(null); // 'pending' | 'approved' | 'rejected' | null
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequestStatus = async () => {
    try {
      setLoading(true);
      // Fetch user access requests from API
      const { data } = await api.get('/access/request/status').catch(() => ({ data: null }));
      if (data) {
        setRequestStatus(data.status);
        if (data.status === 'approved') {
          updateProfileAccess(true);
        }
      }
      setLoading(false);
    } catch (err) {
      console.warn('Access status check warning:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestStatus();
  }, []);

  const handleRequestAccess = async () => {
    try {
      setSubmitting(true);
      const { data } = await api.post('/access/request');
      setRequestStatus(data.request.status);
      setSubmitting(false);
    } catch (err) {
      console.error('Request premium access failed:', err);
      alert(err.message || 'Failed to submit request.');
      setSubmitting(false);
    }
  };

  const hasAccess = Boolean(profile?.has_full_access || requestStatus === 'approved');
  const features = [
    '15+ Premium Mock Tests',
    'Auto IELTS Band Scoring',
    'Interactive Review Sheet',
    'Autosave & Resume CBT'
  ];

  const renderAction = () => {
    if (loading) {
      return (
        <div className="flex h-[74px] w-full items-center justify-center rounded-[20px] bg-[#294b77]/10">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#294b77]/15 border-t-[#294b77]"></div>
        </div>
      );
    }

    if (hasAccess) {
      return (
        <Link
          to="/courses"
          className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-[18px] px-4 text-center text-[16px] font-black text-white shadow-[0_18px_34px_rgba(41,75,119,0.25)] transition-transform hover:-translate-y-0.5 sm:h-[62px] sm:gap-5 sm:text-[18px]"
          style={{ background: 'linear-gradient(to right, #294b77 0%, #294b77 100%)' }}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-500 shadow-[0_0_26px_rgba(34,197,94,0.48)]">
            <ShieldCheck className="h-6 w-6" />
          </span>
          Continue Premium Learning
          <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
        </Link>
      );
    }

    if (requestStatus === 'pending') {
      return (
        <div className="flex min-h-[62px] w-full items-center justify-center gap-4 rounded-[18px] bg-[#294b77] px-4 py-3 text-white shadow-[0_18px_34px_rgba(41,75,119,0.24)] sm:px-6">
          <Clock className="h-6 w-6 animate-pulse text-[#ef5f55]" />
          <div className="text-left">
            <p className="text-[16px] font-black sm:text-[18px]">Request Pending Review</p>
            <p className="text-[12px] font-semibold text-white/70">You will gain access after admin approval.</p>
          </div>
        </div>
      );
    }

    if (requestStatus === 'rejected') {
      return (
        <button
          onClick={handleRequestAccess}
          disabled={submitting}
          className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-[18px] bg-[#294b77] px-4 text-center text-[16px] font-black text-white shadow-[0_18px_34px_rgba(41,75,119,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-70 sm:h-[62px] sm:gap-5 sm:text-[18px]"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#ef5f55] shadow-[0_0_26px_rgba(239,95,85,0.5)]">
            <ShieldAlert className="h-6 w-6" />
          </span>
          {submitting ? 'Submitting request...' : 'Submit New Request'}
          <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
        </button>
      );
    }

    return (
      <button
        onClick={handleRequestAccess}
        disabled={submitting}
        className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-[18px] px-4 text-center text-[16px] font-black text-white shadow-[0_18px_34px_rgba(41,75,119,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-70 sm:h-[62px] sm:gap-5 sm:text-[18px]"
        style={{ background: 'linear-gradient(to right, #294b77 0%, #294b77 100%)' }}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full shadow-[0_0_26px_rgba(239,95,85,0.5)]" style={{ background: 'linear-gradient(to right, #ef5f55 0%, #ef5f55 100%)' }}>
          <Zap className="h-6 w-6 fill-white" />
        </span>
        {submitting ? 'Submitting request...' : 'Request Full Access Now'}
        <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
      </button>
    );
  };

  return (
    <div
      className="relative flex min-h-screen flex-1 overflow-x-hidden bg-[#f7fbff] px-4 pb-28 pt-5 text-[#294b77] sm:px-6 sm:py-7 md:px-12 lg:px-16 lg:pb-7"
      style={{
        backgroundImage: "url('/images/premium access/background.png')",
        backgroundSize: '100% 100%',
        backgroundPosition: 'center center',
      }}
    >
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[1360px] flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-3 text-[15px] font-black text-[#294b77] transition-colors hover:text-[#ef5f55]">
            <ArrowLeft className="h-5 w-5" /> Dashboard
          </Link>
          <JawaafLogo className="w-[165px] md:w-[205px]" />
        </div>

        <section className="relative mx-auto mt-5 grid w-full max-w-[960px] overflow-hidden rounded-[28px] border border-white/85 bg-white/92 p-5 shadow-[0_18px_40px_rgba(41,75,119,0.12)] backdrop-blur-sm sm:mt-6 sm:p-7 md:mt-9 md:p-10 lg:max-h-[calc(100vh-118px)] lg:grid-cols-[0.94fr_0.78fr] lg:rounded-[34px] lg:p-11">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(255,255,255,0.86),transparent_34%),radial-gradient(circle_at_82%_24%,rgba(41,75,119,0.012),transparent_30%)]"></div>
          <div className="relative z-10 flex flex-col justify-center lg:pr-2">
            <div className="mb-5 inline-flex w-fit items-center gap-3 rounded-full px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.04em] text-white shadow-[0_12px_24px_rgba(239,95,85,0.2)] sm:mb-8 sm:px-5" style={{ background: 'linear-gradient(to right, #ef5f55 0%, #ef5f55 100%)' }}>
              <Crown className="h-4 w-4" />
              {hasAccess ? 'Premium Active' : 'Premium Access'}
            </div>

            <h1 className="max-w-[480px] break-words text-[36px] font-black leading-[0.98] tracking-tight text-[#173963] sm:text-[42px] md:text-[58px]" style={{ fontFamily: 'var(--font-league-spartan)' }}>
              {hasAccess ? 'Your Premium Access Is' : 'Unlock Your'}
              <span className="mt-2 block text-[#ef5f55]">
                {hasAccess ? 'Active' : 'Full Potential'}
              </span>
            </h1>

            <p className="mt-6 max-w-[470px] text-[15px] font-semibold leading-[1.75] text-[#6d7f9e]">
              Get complete access to all full-length Academic IELTS Listening and Reading mock tests, detailed band analytics, and review platforms.
            </p>

            <div className="mt-7 grid gap-x-9 gap-y-4 text-[13px] font-bold text-[#7183a0] sm:mt-9 sm:grid-cols-2 sm:gap-y-5">
              {features.map(feature => (
                <div key={feature} className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 shrink-0 text-[#294b77]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-7 flex min-h-[220px] items-end justify-center overflow-hidden sm:min-h-[320px] lg:mt-0">
            <div className="absolute inset-y-0 left-0 z-20 hidden w-20 bg-gradient-to-r from-white/92 via-white/70 to-transparent sm:block"></div>
            <div className="absolute inset-y-8 right-4 z-0 w-[78%] rounded-[34px] bg-white/75 blur-xl"></div>
            <img
              src="/images/premium access/active.png"
              alt="Jawaaf premium access mascot"
              loading="lazy"
              className="relative z-10 h-auto max-h-[300px] w-full max-w-sm object-contain drop-shadow-[0_16px_22px_rgba(41,75,119,0.11)] md:max-h-[420px] lg:-mr-10 lg:h-[470px] lg:w-auto lg:max-w-none"
              style={{
                clipPath: 'inset(0 18px 0 0)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 8%, #000 91%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 7%, #000 93%, transparent 100%)',
                maskImage: 'linear-gradient(90deg, transparent 0%, #000 8%, #000 91%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 7%, #000 93%, transparent 100%)',
                WebkitMaskComposite: 'source-in',
                maskComposite: 'intersect'
              }}
            />
          </div>

          <div className="relative z-20 mt-8 lg:col-span-2">
            {requestStatus === 'rejected' && (
              <p className="mb-4 flex items-center justify-center gap-2 text-[13px] font-bold text-[#ef5f55]">
                <ShieldAlert className="h-4 w-4" /> Your previous request was declined. You can submit a new one.
              </p>
            )}
            {renderAction()}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-center text-[13px] font-bold text-[#7b8ca7]">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#294b77]" /> 100% Secure</span>
              <span className="text-[#ef5f55]">•</span>
              <span>Instant Access</span>
              <span className="text-[#ef5f55]">•</span>
              <span>Cancel Anytime</span>
            </div>
          </div>
        </section>
      </div>
      <MobileBottomNav />
    </div>
  );
}
