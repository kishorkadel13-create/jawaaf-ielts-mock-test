import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import JawaafLogo from '../components/JawaafLogo';
import { useAuthStore } from '../store/authStore';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
    .regex(/[a-z]/, 'Password must include at least one lowercase letter')
    .regex(/[0-9]/, 'Password must include at least one number'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters long'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { updatePassword, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setSubmitError(null);
    setSuccessMessage(null);

    const result = await updatePassword(data.password);
    if (result.success) {
      setSuccessMessage('Your password has been updated. You can now sign in with your new password.');
      return;
    }

    setSubmitError(result.error || 'Could not update your password. Please open the recovery email again or request a new link.');
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

        <h1 className="text-[28px] font-black text-[#05162E] leading-tight">Reset Password</h1>
        <p className="text-slate-500 text-[14px] leading-relaxed mt-3">
          Choose a strong new password for your Jawaaf IELTS Lab account.
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

        {!successMessage && (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-[#05162E] mb-2">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <KeyRound className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-12 py-3.5 bg-white border ${errors.password ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10'} rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all duration-200`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#1E3A6E]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-[12px] font-medium text-red-500 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#05162E] mb-2">Confirm New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <KeyRound className="h-5 w-5" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-12 py-3.5 bg-white border ${errors.confirmPassword ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10'} rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all duration-200`}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#1E3A6E]"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-[12px] font-medium text-red-500 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {errors.confirmPassword.message}
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
                  Updating...
                </>
              ) : (
                <>
                  Update Password <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-8 w-full py-3.5 bg-white hover:bg-slate-50 text-[#1E3A6E] border border-slate-200 font-bold text-[14px] rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          Back to Login <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
