import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Mail, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import JawaafLogo from '../components/JawaafLogo';
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

  const email = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.email || pendingVerificationEmail || user?.email || '';
  }, [location.state, pendingVerificationEmail, user?.email]);

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

    const cleanCode = code.replace(/\s/g, '');
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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-[520px] bg-white border border-slate-100 rounded-2xl shadow-[0_16px_48px_rgba(15,23,42,0.08)] p-6 sm:p-10">
        <Link to="/" className="inline-flex mb-8">
          <JawaafLogo className="h-16 w-auto relative left-[-18px]" />
        </Link>

        <div className="w-14 h-14 rounded-2xl bg-[#1E3A6E]/10 text-[#1E3A6E] flex items-center justify-center mb-6">
          <Mail className="h-7 w-7" />
        </div>

        <h1 className="text-[28px] font-black text-[#05162E] leading-tight">Check Your Email</h1>
        <p className="text-slate-500 text-[14px] leading-relaxed mt-3">
          We sent a verification code to activate your Jawaaf IELTS Lab account.
        </p>

        {email && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[12px] font-bold uppercase text-slate-400">Verification sent to</p>
            <p className="mt-1 text-[14px] font-bold text-[#05162E] break-all">{email}</p>
          </div>
        )}

        <p className="text-slate-500 text-[14px] leading-relaxed mt-5">
          Enter the code from your email. After verification, you can sign in normally with your email and password.
        </p>

        {statusMessage && (
          <div className="mt-6 p-4 bg-green-50 border border-green-100 text-green-700 text-[13px] rounded-xl flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleVerifyCode} className="mt-8 space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-[#05162E] mb-2">
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="12345678"
              className="w-full px-4 py-4 bg-white border border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10 rounded-xl text-center text-[24px] font-black tracking-[0.3em] text-[#05162E] placeholder-slate-300 outline-none transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#1E3A6E] hover:bg-[#162d57] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-[14px] rounded-xl transition-all duration-200 shadow-[0_8px_24px_rgba(30,58,110,0.25)] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
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
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-[#1E3A6E] border border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 font-bold text-[14px] rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-[#1E3A6E] rounded-full animate-spin" />
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
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-[#1E3A6E] border border-slate-200 font-bold text-[14px] rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            Back to Login <ArrowRight className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={handleChangeEmail}
            className="text-[13px] font-bold text-slate-500 hover:text-[#EE6055] transition-colors"
          >
            Change email address
          </button>
        </div>
      </div>
    </div>
  );
}
