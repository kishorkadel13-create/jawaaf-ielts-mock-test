import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShieldAlert, KeyRound, Mail, User, ArrowRight, Monitor, CheckSquare, BarChart2, Phone, Globe2, Target, ShieldCheck } from 'lucide-react';
import JawaafLogo from '../components/JawaafLogo';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  interestedCountry: z.string().min(1, 'Please select a country'),
  targetScore: z.string().min(1, 'Please select a target score'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters long'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser, isAuthenticated, profile, user, isLoading: authLoading } = useAuthStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && profile) {
      if (!(user?.email_confirmed_at || user?.confirmed_at)) {
        navigate('/verify-email', { state: { email: user?.email }, replace: true });
        return;
      }
      if (profile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, profile, user, navigate]);

  const onSubmit = async (data: RegisterFormValues) => {
    setSubmitError(null);
    const result = await registerUser(
      data.email,
      data.password,
      data.fullName,
      data.phone,
      data.interestedCountry,
      data.targetScore
    );
    if (result.success) {
      if (result.emailConfirmed) {
        navigate('/dashboard');
      } else {
        navigate('/verify-email', { state: { email: result.email || data.email } });
      }
    } else {
      setSubmitError(result.error || 'Failed to register');
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── LEFT PANEL (Branding/Graphics) ── */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-[#F8FAFC] flex-col justify-center items-center overflow-hidden border-r border-slate-100">
        {/* Navy arc — top left */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#0B2558] rounded-br-[200px] opacity-90" />
        </div>

        {/* Coral blob — bottom right */}
        <div
          className="absolute pointer-events-none z-0 opacity-80"
          style={{
            bottom: '-50px',
            right: '-50px',
            width: '300px',
            height: '300px',
            background: '#EE6055',
            borderRadius: '40%',
            transform: 'rotate(-25deg)',
          }}
        />

        <div className="relative z-10 p-12 max-w-[500px]">
          <h2 className="text-[40px] font-black leading-[1.1] tracking-[-1.5px] text-[#05162E] mb-6">
            Start your <span className="text-[#1E3A6E]">IELTS</span><br />
            preparation.
          </h2>
          <p className="text-slate-500 text-[15px] leading-relaxed mb-10">
            Create your account, verify your email once, and then start practicing with Jawaaf IELTS Lab.
          </p>

          <div className="space-y-6">
            {[
              { icon: <Monitor className="h-5 w-5" />, title: 'Real CBT Environment', desc: 'Practice with the exact interface you will see on test day.' },
              { icon: <CheckSquare className="h-5 w-5" />, title: 'Instant Evaluation', desc: 'Get immediate scores and detailed feedback on your answers.' },
              { icon: <BarChart2 className="h-5 w-5" />, title: 'Performance Tracking', desc: 'Monitor your improvement over time with analytics.' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#1E3A6E] shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-[#05162E]">{feature.title}</h4>
                  <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (Form) ── */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 bg-white">

        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="mb-8 text-center lg:text-left">
            <Link to="/" className="inline-block mb-4">
              <JawaafLogo className="h-20 w-auto mx-auto lg:mx-0 relative left-[-25px]" />
            </Link>
            <h2 className="text-[28px] font-black text-[#05162E] tracking-tight">Create Account</h2>
            <p className="text-slate-500 text-[14px] mt-1.5">We will send a verification code to activate your account.</p>
          </div>

          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl flex items-start gap-3 shadow-sm">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
              <span className="leading-relaxed font-medium">{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[13px] font-bold text-[#05162E] mb-2">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  className={`w-full pl-11 pr-4 py-3.5 bg-white border ${errors.fullName ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10'} rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all duration-200`}
                  {...register('fullName')}
                />
              </div>
              {errors.fullName && (
                <p className="mt-2 text-[12px] font-medium text-red-500 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#05162E] mb-2">
                Email Address
              </label>
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
              {!errors.email && (
                <p className="mt-2 text-[12px] font-medium text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#1E3A6E]" />
                  You must enter the email code before accessing your dashboard.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#05162E] mb-2">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Phone className="h-5 w-5" />
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="98XXXXXXXX"
                  className={`w-full pl-11 pr-4 py-3.5 bg-white border ${errors.phone ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10'} rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all duration-200`}
                  {...register('phone', {
                    onChange: (event) => {
                      event.target.value = event.target.value.replace(/\D/g, '').slice(0, 10);
                    }
                  })}
                />
              </div>
              {errors.phone && (
                <p className="mt-2 text-[12px] font-medium text-red-500 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold text-[#05162E] mb-2">
                  Interested Country
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                    <Globe2 className="h-5 w-5" />
                  </span>
                  <select
                    className={`w-full pl-11 pr-4 py-3.5 bg-white border ${errors.interestedCountry ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10'} rounded-xl text-[14px] text-[#05162E] outline-none transition-all duration-200 appearance-none`}
                    {...register('interestedCountry')}
                  >
                    <option value="">Select country...</option>
                    <option value="UK">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="USA">USA</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Ireland">Ireland</option>
                    <option value="South Korea">South Korea</option>
                    <option value="Germany">Germany</option>
                  </select>
                </div>
                {errors.interestedCountry && (
                  <p className="mt-2 text-[12px] font-medium text-red-500 flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {errors.interestedCountry.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#05162E] mb-2">
                  Target Score
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                    <Target className="h-5 w-5" />
                  </span>
                  <select
                    className={`w-full pl-11 pr-4 py-3.5 bg-white border ${errors.targetScore ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10'} rounded-xl text-[14px] text-[#05162E] outline-none transition-all duration-200 appearance-none`}
                    {...register('targetScore')}
                  >
                    <option value="">Select score...</option>
                    <option value="6.0">6.0</option>
                    <option value="6.5">6.5</option>
                    <option value="7.0">7.0</option>
                    <option value="7.5">7.5</option>
                    <option value="8.0">8.0</option>
                    <option value="8.5">8.5</option>
                    <option value="9.0">9.0</option>
                  </select>
                </div>
                {errors.targetScore && (
                  <p className="mt-2 text-[12px] font-medium text-red-500 flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {errors.targetScore.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#05162E] mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <KeyRound className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-4 py-3.5 bg-white border ${errors.password ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10'} rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all duration-200`}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-[12px] font-medium text-red-500 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#05162E] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <KeyRound className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-4 py-3.5 bg-white border ${errors.confirmPassword ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus:border-[#1E3A6E] focus:ring-4 focus:ring-[#1E3A6E]/10'} rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all duration-200`}
                  {...register('confirmPassword')}
                />
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
              disabled={isSubmitting || authLoading}
              className="w-full mt-4 py-3.5 bg-[#1E3A6E] hover:bg-[#162d57] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-[14px] rounded-xl transition-all duration-200 shadow-[0_8px_24px_rgba(30,58,110,0.25)] flex items-center justify-center gap-2 group"
            >
              {(isSubmitting || authLoading) ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                  Creating account...
                </>
              ) : (
                <>
                  Create Account & Verify Email <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Redirect prompt */}
          <p className="text-center mt-6 text-[14px] text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-[#EE6055] hover:text-[#d45248] font-bold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
