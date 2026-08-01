import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import JawaafLogo from '../components/JawaafLogo';
import {
  Menu,
  X,
  Monitor,
  Headphones,
  Clock,
  BookOpen,
  Users,
  FileText,
  TrendingUp,
  Star,
  CheckSquare,
  BarChart2,
  Database,
  Award,
} from 'lucide-react';

interface Feature {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features: Feature[] = [
    { title: 'Real CBT Experience', desc: 'Simulate the real exam environment', icon: <Monitor className="h-5 w-5" /> },
    { title: 'Listening Tests', desc: 'High-quality audio with real exam style', icon: <Headphones className="h-5 w-5" /> },
    { title: 'Instant Scoring', desc: 'Get immediate results with detailed feedback', icon: <CheckSquare className="h-5 w-5" /> },
    { title: 'Performance Analytics', desc: 'Track your progress and improve your band score', icon: <BarChart2 className="h-5 w-5" /> },
    { title: 'Premium Question Bank', desc: 'Access a wide collection of high-quality questions', icon: <Database className="h-5 w-5" /> },
    { title: 'Full CBT Simulation', desc: 'Timed tests with real exam interface', icon: <Award className="h-5 w-5" /> },
  ];

  const paletteClass = (n: number) => {
    if (n === 11) return 'bg-[#1E3A6E] text-white border-[#1E3A6E]';
    if (n === 18) return 'bg-[#F59E0B] text-white border-[#F59E0B]';
    if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17].includes(n))
      return 'bg-[#22C55E] text-white border-[#22C55E]';
    return 'bg-white text-slate-400 border-slate-200';
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ═══════════════════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6 md:px-10">

          <Link to="/" className="flex min-w-0 flex-shrink-0 items-center">
            <JawaafLogo className="h-14 w-auto sm:h-16 lg:h-20" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 text-[14px] font-medium text-slate-500 xl:flex 2xl:gap-12 2xl:text-[16px]">
            <Link to="/" className="flex flex-col items-center gap-1 text-[#1E3A6E] font-semibold">
              Home
              <span className="w-6 h-[2.5px] rounded-full bg-[#1E3A6E]" />
            </Link>
            {['Features', 'Mock Tests', 'Pricing', 'About Us', 'Contact'].map(label => (
              <Link
                key={label}
                to={`/${label.toLowerCase().replace(' ', '-')}`}
                className="hover:text-[#1E3A6E] transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden items-center gap-3 xl:flex">
            <Link
              to="/login"
              className="px-5 py-2 rounded-lg bg-[#EE6055] text-white text-sm font-bold hover:bg-[#1E3A6E] transition-colors duration-200 shadow-md shadow-[#EE6055]/20"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 rounded-lg bg-[#1E3A6E] text-white text-sm font-bold hover:bg-[#EE6055] transition-colors duration-200 shadow-md shadow-[#1E3A6E]/20"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg p-2 hover:bg-slate-100 xl:hidden">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="flex flex-col gap-4 border-t border-slate-100 bg-white px-4 py-5 shadow-xl sm:px-6 xl:hidden">
            <Link to="/" className="font-bold text-[#1E3A6E]">Home</Link>
            {['Features', 'Mock Tests', 'Pricing', 'About Us', 'Contact'].map(l => (
              <Link key={l} to="/" className="font-medium text-slate-600">{l}</Link>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
              <Link to="/login" className="py-2.5 rounded-lg border border-slate-300 text-center font-semibold text-sm text-slate-700">Log In</Link>
              <Link to="/register" className="py-2.5 rounded-lg bg-[#1E3A6E] text-white text-center font-bold text-sm">Sign Up</Link>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white">

        {/* Navy arc — top right, matches reference image */}
        <div className="pointer-events-none absolute right-0 top-0 z-0 hidden h-[510px] w-[360px] md:block">
          <div className="absolute inset-0 bg-[#0B2558] rounded-bl-[160px] rounded-tl-[200px]" />

        </div>

        {/* Coral blob — behind the card, center-right area matching image */}
        <div
          className="pointer-events-none absolute z-0 hidden lg:block"
          style={{
            bottom: '20px',
            right: '44%',
            width: '250px',
            height: '200px',
            background: '#EE6055',
            borderRadius: '70%',
            transform: 'rotate(-18deg)',
          }}
        />

        {/* Red dot grid — bottom left 
        <div className="absolute bottom-20 left-6 grid gap-[6px] pointer-events-none opacity-60 z-0"
          style={{ gridTemplateColumns: 'repeat(7, 6px)' }}>
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="h-[5px] w-[5px] rounded-full bg-[#EE6055]" />
          ))}
        </div>* /}

        {/* Hero inner */}
        <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col items-center gap-8 px-4 pb-12 pt-10 sm:px-6 md:px-10 lg:flex-row lg:gap-10 lg:pb-20 lg:pt-16">

          {/* ── Left copy ── */}
          <div className="relative min-w-0 flex-1 lg:-top-6 lg:w-[560px] xl:w-[650px]">
            <h1 className="break-words text-[38px] font-black leading-[1.05] tracking-tight text-[#05162E] sm:text-[56px] lg:text-[64px] xl:text-[72px]">
              Practice Real<br />
              <span className="text-[#1E3A6E]">IELTS</span> Mock Tests
            </h1>

            <p className="mt-5 text-[15px] text-slate-500 leading-relaxed max-w-[430px]">
              Experience the real IELTS CBT interface with timed tests,
              instant scoring, and detailed performance analytics.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/register"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1E3A6E] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(30,58,110,0.30)] transition-all duration-200 hover:bg-[#162d57] sm:px-7"
              >
                Start Free Mock Test →
              </Link>
              <Link
                to="/tests"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 sm:px-7"
              >
                Explore Platform
              </Link>
            </div>

            {/* 4 icon badges */}
            <div className="mt-9 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-6">
              {[
                { icon: <Monitor className="h-[18px] w-[18px]" />, label1: 'Real CBT Interface' },
                { icon: <Clock className="h-[18px] w-[18px]" />, label1: 'Instant Results' },
                { icon: <Headphones className="h-[18px] w-[18px]" />, label1: 'Listening + Reading' },
                { icon: <BookOpen className="h-[18px] w-[18px]" />, label1: 'Premium Library' },
              ].map(({ icon, label1 }, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 text-center">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#1E3A6E]">
                    {icon}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 leading-tight max-w-[64px]">
                    {label1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right mockup card ── */}
          <div className="relative flex w-full flex-1 justify-center lg:-top-6 lg:justify-end">
            <div
              className="h-[360px] w-full max-w-[900px] overflow-hidden rounded-[22px] bg-white sm:h-[420px] lg:h-[480px] lg:w-[min(58vw,900px)] lg:shrink-0 lg:rounded-[28px]"
              style={{
                transform: 'perspective(900px) rotateY(-8deg) rotateX(3deg)',
                transformOrigin: 'right center',
                boxShadow: '-16px 32px 72px rgba(15,23,42,0.22), 0 8px 32px rgba(15,23,42,0.10)',
              }}
            >

              {/* Card top bar */}
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
                <div className="flex items-center gap-2.5">
                  {/* Mini dot logo */}
                  <div className="grid grid-cols-3 gap-[3px]">
                    {['bg-[#EE6055]', 'bg-[#EE6055]', 'bg-[#1E3A6E]',
                      'bg-[#EE6055]', 'bg-[#EE6055]', 'bg-[#1E3A6E]',
                      'bg-[#1E3A6E]', 'bg-[#1E3A6E]', 'bg-[#1E3A6E]'].map((c, i) => (
                        <div key={i} className={`h-[5px] w-[5px] rounded-full ${c}`} />
                      ))}
                  </div>
                  <span className="font-black text-[#05162E] text-[13px]">Reading Test 01</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div>
                    <p className="text-[9px] text-slate-400 font-semibold">Time Left</p>
                    <p className="font-black text-[#1E3A6E] text-[14px] leading-tight">00:59:38</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">Question 12 of 40</p>
                  <button className="px-3.5 py-1.5 rounded-lg bg-[#1E3A6E] text-white text-[11px] font-bold whitespace-nowrap">
                    Submit Test
                  </button>
                </div>
              </div>

              {/* Card body: passage | questions | palette */}
              <div className="grid min-h-[500px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-[.75fr_.75fr_170px]">

                {/* Passage */}
                <div className="border-r border-slate-100 p-4 sm:p-5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Passage 1</p>
                  <p className="mt-2 text-[11px] font-black italic text-[#05162E] leading-snug">
                    The Impact of Social Media on Society
                  </p>
                  <div className="mt-3 space-y-2.5 text-[10.5px] leading-[1.65] text-slate-500">
                    <p>
                      Social media has become an integral part of modern life,
                      influencing the way people communicate, share information, and
                      perceive the world. While it connects people globally, it also
                      raises concerns about mental health, privacy, and misinformation.
                    </p>
                    <p>
                      The advantages of social media include instant communication,
                      access to information, and opportunities for businesses.
                      However, excessive use can lead to addiction, reduced
                      productivity, and social isolation.
                    </p>
                    <p>
                      Another major impact of social media is its role in shaping
                      public opinion and cultural trends. Platforms such as Facebook,
                      Instagram, and TikTok allow users to express their views and engage
                      in discussions on global issues. As a result, social movements and
                      awareness campaigns can spread rapidly, encouraging people to participate
                      in social change and community support.
                    </p>
                  </div>
                </div>

                {/* Questions */}
                <div className="border-r border-slate-100 p-4 sm:p-5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Questions 11 – 14</p>
                  <p className="mt-2 text-[11px] font-black text-[#05162E] leading-snug">
                    Which of the following is NOT mentioned in paragraph 2?
                  </p>

                  <div className="mt-4 space-y-2">
                    {[
                      { l: 'A', t: 'It reduces working hours.', sel: false },
                      { l: 'B', t: 'It allows people to live anywhere.', sel: false },
                      { l: 'C', t: 'It increases office space.', sel: false },
                      { l: 'D', t: 'It eliminates teamwork.', sel: true },
                    ].map(({ l, t, sel }) => (
                      <div
                        key={l}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[10.5px] font-medium ${sel
                          ? 'border-[#1E3A6E] bg-[#EFF4FB] text-[#1E3A6E]'
                          : 'border-slate-100 text-slate-600'
                          }`}
                      >
                        <div className={`h-6 w-6 rounded-full text-[9px] font-black flex-shrink-0 flex items-center justify-center ${sel ? 'bg-[#1E3A6E] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>{l}</div>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question Palette */}
                <div className="hidden bg-[#F8FAFC] p-3 lg:block">
                  <p className="text-[9px] font-black text-[#05162E] mb-2.5">Question<br />Palette</p>
                  <div className="grid grid-cols-4 gap-[4px]">
                    {Array.from({ length: 32 }).map((_, i) => {
                      const n = i + 1;
                      return (
                        <div
                          key={n}
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-[8px] font-bold border ${paletteClass(n)}`}
                        >
                          {n}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-3 space-y-1.5">
                    {[
                      { c: 'bg-[#22C55E]', l: 'Answered' },
                      { c: 'bg-slate-300', l: 'Unanswered' },
                      { c: 'bg-[#F59E0B]', l: 'Review' },
                      { c: 'bg-[#1E3A6E]', l: 'Current' },
                    ].map(({ c, l }) => (
                      <div key={l} className="flex items-center gap-1.5">
                        <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${c}`} />
                        <span className="text-[8px] text-slate-500 font-medium">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STATS BAR
      ═══════════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-[1500px] px-4 pb-8 sm:px-6 md:px-10 lg:-mt-16 xl:-mt-24">
        <div className="grid grid-cols-1 gap-4 rounded-[22px] bg-[#2C4B78] px-5 py-5 shadow-2xl sm:grid-cols-2 sm:gap-6 sm:rounded-[28px] sm:px-8 sm:py-6 lg:grid-cols-4">
          {[
            { icon: <Users className="h-5 w-5" />, val: '50K+', label: 'Students', accent: false },
            { icon: <FileText className="h-5 w-5" />, val: '1000+', label: 'Mock Tests', accent: false },
            { icon: <TrendingUp className="h-5 w-5" />, val: '98%', label: 'Success Rate', accent: false },
            { icon: <Star className="h-5 w-5 fill-current" />, val: '4.8/5', label: 'User Rating', accent: true },
          ].map(({ icon, val, label, accent }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-white flex-shrink-0 ${accent ? 'bg-[#EE6055] shadow-lg shadow-[#EE6055]/30' : 'bg-white/10'
                }`}>
                {icon}
              </div>
              <div>
                <p className="text-[20px] font-black text-white leading-none">{val}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 md:px-10 lg:py-16">
        <div className="text-center mb-12">
          <h2 className="text-[28px] font-black text-[#05162E]">
            Everything You Need to Succeed in IELTS
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 lg:gap-x-5 xl:gap-x-8">
          {features.map((f, i) => (
            <div
              key={i}
              className="group flex w-full flex-col items-center rounded-[18px] border border-slate-100 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg"
            >
              <div className="h-11 w-11 rounded-xl bg-[#EFF4FB] text-[#1E3A6E] flex items-center justify-center mb-4 group-hover:bg-[#1E3A6E] group-hover:text-white transition-colors duration-300">
                {f.icon}
              </div>
              <h3 className="text-[11.5px] font-black text-[#05162E] leading-snug">{f.title}</h3>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
