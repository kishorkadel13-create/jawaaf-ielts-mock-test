import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import JawaafLogo from '../components/JawaafLogo';
import {
  Lock, CheckCircle2, ArrowRight, ShieldCheck, Star, Award,
  Sparkles, AlertCircle, Loader2, User, Mail, KeyRound, Phone
} from 'lucide-react';

export default function DemoResultPage() {
  const navigate = useNavigate();
  const { isAuthenticated, profile, login, register: registerUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [targetScore, setTargetScore] = useState('7.0');

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sync demo answers when authenticated
  const syncDemoAnswers = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage('');

      const stored = localStorage.getItem('jawaaf_demo_submission');
      if (!stored) {
        navigate('/dashboard');
        return;
      }

      const { testId, answers } = JSON.parse(stored);

      // 1. Start attempt for this student
      const { data: startRes } = await api.post('/attempts/start', {
        mock_test_id: testId || 'd0242c49-4214-4578-b7d2-1b10f3fdfca3'
      });

      const attemptId = startRes.attempt.id;

      // 2. Save answers
      if (answers && Object.keys(answers).length > 0) {
        const formatted = Object.entries(answers).map(([qId, val]) => ({
          question_id: qId,
          answer: val
        }));
        await api.put(`/attempts/${attemptId}/save`, { answers: formatted });
      }

      // 3. Submit attempt for automatic evaluation
      await api.post(`/attempts/${attemptId}/submit`);

      // 4. Clean up local storage
      localStorage.removeItem('jawaaf_demo_submission');
      localStorage.removeItem('jawaaf_demo_exam_state');

      // 5. Navigate to real unlocked result
      navigate(`/attempts/${attemptId}/result`, { replace: true });
    } catch (err: any) {
      console.error('Failed to sync demo answers:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to calculate scores. Please try again.');
      setIsProcessing(false);
    }
  };

  // If already authenticated on mount, sync immediately
  useEffect(() => {
    if (isAuthenticated && profile) {
      syncDemoAnswers();
    }
  }, [isAuthenticated, profile]);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessInfo('');

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await registerUser(email, password, fullName, phone, 'Australia', targetScore);
      if (res.success) {
        // Try logging in immediately if session created or ask verification
        const loginRes = await login(email, password);
        if (loginRes.success) {
          await syncDemoAnswers();
        } else if (loginRes.emailUnverified) {
          setSuccessInfo('Account created! Please check your email to verify your account, then log in to view your band score.');
          setIsProcessing(false);
        } else {
          setSuccessInfo('Account created! Please sign in below to unlock your band score.');
          setActiveTab('login');
          setLoginEmail(email);
          setIsProcessing(false);
        }
      } else {
        setErrorMessage(res.error || 'Failed to create account.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred during registration.');
      setIsProcessing(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessInfo('');

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        await syncDemoAnswers();
      } else {
        setErrorMessage(res.error || 'Invalid email or password.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign in.');
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Unlock IELTS Mock Test Result — Jawaaf IELTS Lab</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-[#071328] py-8 sm:py-12 px-4 sm:px-6 relative overflow-hidden flex flex-col justify-between">
        {/* Background glow effects */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-[#1E3A6E]/30 blur-[130px] pointer-events-none" />
        <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] rounded-full bg-[#EE6055]/20 blur-[140px] pointer-events-none" />

        {/* Top Header */}
        <div className="relative max-w-4xl mx-auto w-full flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <Link to="/" className="flex items-center">
            <JawaafLogo isWhite={true} className="h-8 sm:h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-200/80 hidden sm:inline font-medium">Free Demo Mock Test</span>
            <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Test Submitted
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative max-w-4xl mx-auto w-full my-auto">
          {/* Locked / Preview Card with Floating Overlay */}
          <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-[#0F2D62] via-[#0C2454] to-[#081838] shadow-2xl p-6 sm:p-10">

            {/* Blurred Background Teaser (Score Simulation) */}
            <div className="filter blur-md opacity-35 select-none pointer-events-none" aria-hidden="true">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-white/10 pb-6 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Academic Reading Mock Test 1</h3>
                  <p className="text-slate-300 text-sm">40 Questions • Completed in 54 minutes</p>
                </div>
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#EE6055] to-amber-400 flex items-center justify-center text-white text-3xl font-black shadow-lg">
                  7.5
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white/10 rounded-2xl text-center"><p className="text-2xl font-bold text-white">32/40</p><p className="text-xs text-slate-300">Raw Score</p></div>
                <div className="p-4 bg-white/10 rounded-2xl text-center"><p className="text-2xl font-bold text-white">80%</p><p className="text-xs text-slate-300">Accuracy</p></div>
                <div className="p-4 bg-white/10 rounded-2xl text-center"><p className="text-2xl font-bold text-white">Passage 1</p><p className="text-xs text-slate-300">12/13 Band 8</p></div>
                <div className="p-4 bg-white/10 rounded-2xl text-center"><p className="text-2xl font-bold text-white">Passage 2</p><p className="text-xs text-slate-300">10/13 Band 7</p></div>
              </div>
            </div>

            {/* Foreground Conversion Modal */}
            <div className="relative z-10 -mt-24 sm:-mt-28 max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-100 text-[#05162E]">
              {/* Lock Badge */}
              <div className="flex justify-center -mt-14 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#EE6055] to-[#f87171] text-white flex items-center justify-center shadow-xl shadow-[#EE6055]/35 border-4 border-white">
                  <Lock className="h-7 w-7" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#EE6055] bg-[#EE6055]/10 px-3 py-1 rounded-full border border-[#EE6055]/20 mb-2">
                  <Sparkles className="h-3 w-3" /> Result Ready
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#05162E] tracking-tight">
                  Sign Up to Unlock Your Result
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Great job completing the IELTS Demo Test! Create your free account in 30 seconds to reveal your <strong className="text-[#1E3A6E]">Overall Band Score</strong>, <strong className="text-[#1E3A6E]">detailed answer keys</strong>, and explanations.
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
                <button
                  type="button"
                  onClick={() => { setActiveTab('signup'); setErrorMessage(''); setSuccessInfo(''); }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${activeTab === 'signup' ? 'bg-white text-[#1E3A6E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Create Free Account
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setErrorMessage(''); setSuccessInfo(''); }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${activeTab === 'login' ? 'bg-white text-[#1E3A6E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Already Registered? Sign In
                </button>
              </div>

              {/* Status Alerts */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successInfo && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{successInfo}</span>
                </div>
              )}

              {/* Signup Form */}
              {activeTab === 'signup' ? (
                <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Ramesh Thapa"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1E3A6E] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1E3A6E] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1E3A6E] focus:bg-white transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Target Band Score</label>
                      <select
                        value={targetScore}
                        onChange={(e) => setTargetScore(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1E3A6E] focus:bg-white transition-colors"
                      >
                        <option value="6.5">Band 6.5</option>
                        <option value="7.0">Band 7.0</option>
                        <option value="7.5">Band 7.5</option>
                        <option value="8.0">Band 8.0</option>
                        <option value="8.5">Band 8.5</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (Optional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98XXXXXXXX"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1E3A6E] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#EE6055] to-[#d94f46] hover:brightness-110 text-white font-extrabold rounded-xl shadow-lg shadow-[#EE6055]/30 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Calculating &amp; Unlocking Result...</span>
                      </>
                    ) : (
                      <>
                        <span>Unlock My Band Score Now</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1E3A6E] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Your password"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1E3A6E] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full mt-2 py-3.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white font-extrabold rounded-xl shadow-lg shadow-[#1E3A6E]/30 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing In &amp; Loading Result...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In &amp; View Result</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Trust Badges */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-6 text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> 100% Free Signup</span>
                <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> IDP/BC Standards</span>
                <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-blue-600" /> Instant Band Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative max-w-4xl mx-auto w-full text-center mt-6 text-xs text-blue-300/60">
          © {new Date().getFullYear()} Jawaaf Consulting Academy, Putalisadak, Kathmandu. All rights reserved.
        </div>
      </div>
    </>
  );
}
