import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import JawaafLogo from '../components/JawaafLogo';
import { assets } from '../config/assets';
import { useAuthStore } from '../store/authStore';

type LocationState = {
  email?: string;
};

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, pendingVerificationEmail, resendVerificationEmail, verifySignupOtp, logout, isLoading } = useAuthStore();
  const [code, setCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const email = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.email || pendingVerificationEmail || user?.email || '';
  }, [location.state, pendingVerificationEmail, user?.email]);

  const normalizedCode = code.replace(/\D/g, '').slice(0, 8);
  const codeDigits = Array.from({ length: 8 }, (_, index) => normalizedCode[index] || '');

  const handleResend = async () => {
    setStatusMessage(null);
    setErrorMessage(null);

    if (!email) {
      setErrorMessage('Please go back to signup and enter your email again.');
      return;
    }

    const result = await resendVerificationEmail(email);
    if (result.success) {
      setStatusMessage('Verification code sent again. Please check your inbox and spam folder.');
    } else {
      setErrorMessage(result.error || 'Could not resend verification code. Please try again shortly.');
    }
  };

  const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!email) {
      setErrorMessage('Please go back to signup and enter your email again.');
      return;
    }

    const cleanCode = normalizedCode;
    if (!/^\d{6,8}$/.test(cleanCode)) {
      setErrorMessage('Please enter the verification code from your email.');
      return;
    }

    const result = await verifySignupOtp(email, cleanCode);
    if (result.success) {
      setStatusMessage('Email verified successfully. Redirecting you to login...');
      window.setTimeout(() => navigate('/login?verified=1', { replace: true }), 900);
    } else {
      setErrorMessage(result.error || 'Invalid or expired verification code.');
    }
  };

  const handleChangeEmail = async () => {
    await logout();
    navigate('/register');
  };

  return (
    <div
      className="relative min-h-[100svh] overflow-y-auto overflow-x-hidden bg-[#EEF5FF] font-sans text-[#061832] lg:h-[100svh] lg:overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(115deg, rgba(255,255,255,0.9) 0%, rgba(239,246,255,0.78) 48%, rgba(218,232,255,0.88) 100%), url('${assets.readingPractice.background}')`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 bottom-[-90px] h-72 w-72 rounded-full bg-white/72 blur-sm" />
        <div className="absolute bottom-[-110px] right-[-100px] h-80 w-80 rounded-full bg-white/65 blur-sm" />
        <div className="absolute left-[7%] top-[27%] hidden h-[140px] w-[140px] lg:block">
          <div className="absolute inset-3 rounded-full bg-[#dbe8ff]/75 shadow-[0_24px_55px_rgba(43,83,150,0.13)]" />
          <Mail className="absolute left-10 top-12 h-16 w-16 -rotate-12 text-white drop-shadow-[0_12px_18px_rgba(43,83,150,0.2)]" strokeWidth={1.7} />
          <span className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#ef5f55] text-lg font-black text-white shadow-lg">
            1
          </span>
        </div>
        <div className="absolute left-[12%] top-[41%] hidden h-52 w-52 rounded-full border-4 border-dashed border-[#9ebdff]/45 border-b-transparent border-l-transparent lg:block" />
        <div className="absolute bottom-[24%] left-[17%] hidden h-[128px] w-[112px] lg:block">
          <img src={assets.otpVerification.shield} alt="" className="h-full w-full object-contain drop-shadow-[0_18px_26px_rgba(43,83,150,0.15)]" />
        </div>
        <div className="absolute right-[8%] top-[12%] hidden rotate-[-16deg] text-[#c6d8ff] xl:block">
          <Send className="h-28 w-28 fill-white/70 drop-shadow-[0_16px_30px_rgba(43,83,150,0.16)]" strokeWidth={1.2} />
        </div>
        <div className="absolute right-[16%] top-[18%] hidden h-28 w-80 rounded-full border-t-4 border-dashed border-[#9ebdff]/45 xl:block" />
        <Sparkles className="absolute right-[6%] top-[37%] hidden h-7 w-7 text-[#bdd0ff] xl:block" />
      </div>

      <Link to="/" className="absolute left-6 top-6 z-20 hidden md:inline-flex xl:left-10 xl:top-9">
        <JawaafLogo className="h-[84px] w-auto" />
      </Link>

      <main className="relative z-10 mx-auto grid min-h-[100svh] w-full max-w-[1440px] items-center gap-8 px-4 py-5 md:px-8 lg:h-[100svh] lg:grid-cols-[1fr_minmax(460px,540px)_1fr] xl:grid-cols-[330px_540px_430px]">
        <div className="hidden lg:block" />

        <section className="mx-auto w-full max-w-[540px] rounded-[34px] border border-white/85 bg-white/96 px-8 py-7 shadow-[0_24px_70px_rgba(34,70,130,0.16)] backdrop-blur-xl sm:px-10 lg:px-12">
          <Link to="/" className="mb-5 inline-flex md:hidden">
            <JawaafLogo className="h-16 w-auto" />
          </Link>

          <img
            src={assets.otpVerification.topMessage}
            alt=""
            className="mx-auto mb-3 h-[86px] w-[104px] object-contain drop-shadow-[0_16px_26px_rgba(50,107,255,0.12)] sm:h-[96px] sm:w-[118px]"
          />

          <div className="text-center">
            <h1 className="text-[31px] font-black leading-tight text-[#061832] sm:text-[36px]">
              Check Your <span className="text-[#326bff]">Email</span>
            </h1>
            <p className="mx-auto mt-3 max-w-[400px] text-center text-[14px] font-semibold leading-6 text-slate-500">
              We sent a verification code to activate your <span className="font-black text-[#326bff]">Jawaaf IELTS Lab</span> account.
            </p>
          </div>

          {email && (
            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-[#dce7fb] bg-[#f8fbff] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Verification sent to</p>
                <p className="mt-1 break-all text-[14px] font-black text-[#061832]">{email}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-[0_8px_18px_rgba(16,185,129,0.15)]">
                <CheckCircle2 className="h-6 w-6" />
              </span>
            </div>
          )}

          <p className="mt-5 text-[14px] font-semibold leading-6 text-slate-500">
            Enter the code from your email. After verification, you can sign in normally with your email and password.
          </p>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-[#fff8e7] px-4 py-3 text-amber-950 shadow-[0_12px_24px_rgba(245,158,36,0.09)]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm">
                <AlertCircle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-black">Code not showing?</p>
                <p className="mt-1 text-[13px] font-extrabold leading-5 text-amber-900">
                  Please check your Spam or Promotions folder too. Sometimes the verification code lands there.
                </p>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-3 text-[13px] text-green-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="font-semibold leading-relaxed">{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-[13px] text-red-600">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="font-semibold leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleVerifyCode} className="mt-5 space-y-3">
            <div>
              <label className="mb-2 block text-[13px] font-black text-[#061832]">
                Verification Code
              </label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => codeInputRef.current?.focus()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    codeInputRef.current?.focus();
                  }
                }}
                className="relative grid grid-cols-8 gap-1 rounded-2xl border border-[#dce7fb] bg-white p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 focus-within:border-[#326bff] focus-within:ring-4 focus-within:ring-[#326bff]/10 sm:gap-2"
              >
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={normalizedCode}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  aria-label="Verification code"
                  className="absolute inset-0 h-full w-full cursor-text opacity-0"
                />
                {codeDigits.map((digit, index) => (
                  <div
                    key={`otp-${index}`}
                    className="flex aspect-square min-h-9 items-center justify-center rounded-xl border border-[#dce7fb] bg-[#fbfdff] text-[20px] font-black text-[#1f55ff] shadow-[0_8px_18px_rgba(43,83,150,0.08)] sm:min-h-10 sm:text-[23px]"
                  >
                    {digit || <span className="text-slate-300">{index + 1}</span>}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2451ff] py-3.5 text-[14px] font-black text-white shadow-[0_14px_30px_rgba(36,81,255,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#173ed4] disabled:translate-y-0 disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-white" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Verify Email
                </>
              )}
            </button>
          </form>

          <div className="mt-3 grid gap-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#dce7fb] bg-white py-3.5 text-[14px] font-black text-[#21457b] shadow-[0_10px_24px_rgba(43,83,150,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f8fbff] disabled:translate-y-0 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#1E3A6E]" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Resend Code
                </>
              )}
            </button>

            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#dce7fb] bg-white py-3.5 text-[14px] font-black text-[#21457b] shadow-[0_10px_24px_rgba(43,83,150,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f8fbff]"
            >
              Back to Login <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={handleChangeEmail}
              className="text-[13px] font-black text-[#326bff] transition-colors hover:text-[#EE6055]"
            >
              Change email address
            </button>
          </div>
        </section>

        <aside className="relative hidden h-[min(720px,calc(100svh-44px))] xl:block">
          <div className="absolute -right-1 top-[7%] z-20 h-[214px] w-[360px]">
            <img src={assets.otpVerification.messageBubble} alt="" className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_24px_45px_rgba(43,83,150,0.14)]" />
            <div className="relative z-10 px-16 pt-11 text-[#0b2450]">
              <p className="text-[19px] font-black text-[#2451ff]">Just one more step!</p>
              <p className="mt-3 text-[16px] font-bold leading-7">
                Check your email and enter the code to unlock your Jawaaf IELTS Lab account.
                <Sparkles className="ml-2 inline h-5 w-5 text-[#f59e24]" />
              </p>
            </div>
          </div>

          <div className="absolute bottom-2 right-5 z-10 w-[330px]">
            <img
              src={assets.otpVerification.mascot}
              alt="Jawaaf IELTS mascot"
              className="relative z-10 w-full drop-shadow-[0_28px_34px_rgba(22,45,87,0.22)]"
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
