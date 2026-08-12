import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, Mail, ShieldAlert } from 'lucide-react';
import JawaafLogo from '../components/JawaafLogo';
import { useAuthStore } from '../store/authStore';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const genericSuccessMessage = 'If an account exists with this email, password reset instructions have been sent.';

export default function ForgotPasswordPage() {
  const { sendPasswordResetEmail, isLoading } = useAuthStore();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setSubmitError(null);
    setSuccessMessage(null);

    const result = await sendPasswordResetEmail(data.email);
    if (result.success) {
      setSuccessMessage(genericSuccessMessage);
      return;
    }

    setSubmitError(result.error || 'Could not send reset instructions. Please try again shortly.');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-[480px] bg-white border border-slate-100 rounded-2xl shadow-[0_16px_48px_rgba(15,23,42,0.08)] p-6 sm:p-10">
        <Link to="/" className="inline-flex mb-8">
          <JawaafLogo className="h-16 w-auto relative left-[-18px]" />
        </Link>

        <div className="w-14 h-14 rounded-2xl bg-[#1E3A6E]/10 text-[#1E3A6E] flex items-center justify-center mb-6">
          <KeyRound className="h-7 w-7" />
        </div>

        <h1 className="text-[28px] font-black text-[#05162E] leading-tight">Forgot Password</h1>
        <p className="text-slate-500 text-[14px] leading-relaxed mt-3">
          Enter your email address and we will send secure instructions to reset your Jawaaf IELTS Lab password.
        </p>

        {successMessage && (
          <div className="mt-6 p-4 bg-green-50 border border-green-100 text-green-700 text-[13px] rounded-xl flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMessage}</span>
          </div>
        )}

        {submitError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-[#05162E] mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                placeholder="name@example.com"
                className={`w-full pl-11 pr-4 py-3.5 bg-white border ${errors.email ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10'} rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all duration-200`}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-[12px] font-medium text-red-500 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-3.5 bg-[#1E3A6E] hover:bg-[#162d57] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-[14px] rounded-xl transition-all duration-200 shadow-[0_8px_24px_rgba(30,58,110,0.25)] flex items-center justify-center gap-2"
          >
            {(isSubmitting || isLoading) ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send Reset Instructions <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-[14px] text-slate-500 font-medium">
          Remember your password?{' '}
          <Link to="/login" className="text-[#EE6055] hover:text-[#d45248] font-bold transition-colors">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
