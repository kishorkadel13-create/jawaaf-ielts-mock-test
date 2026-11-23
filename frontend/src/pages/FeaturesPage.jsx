import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import JawaafLogo from '../components/JawaafLogo';
import {
  Headphones, BookOpen, PenLine, Mic2, Video, MessageSquareText,
  CheckCircle, ChevronDown, ChevronUp, Star, Award, Clock, BarChart3,
  Zap, Users, Globe, ShieldCheck, ArrowRight, Play, ArrowLeft, Sparkles
} from 'lucide-react';

/* ─────────────────────────── DATA ─────────────────────────── */

const features = [
  {
    icon: <Clock className="h-7 w-7 text-white" />,
    color: '#1E3A6E',
    badge: 'Most Popular',
    title: 'Full-Length CBT Mock Tests',
    subtitle: 'Full length IELTS mock test online — Real exam interface (CD-IELTS format)',
    desc: 'Experience the actual Computer-Based IELTS test interface with timed sections, auto-submit, and instant band score. Covers both IELTS Academic and General Training mock tests — exactly as you will see on exam day.',
    points: [
      'Timed IELTS practice test online (60 min + 60 min)',
      'Real CD-IELTS split-screen interface',
      'IELTS mock test with instant result & band score',
      'Academic and General Training formats',
      'Auto-save every 10 seconds — never lose progress',
    ],
  },
  {
    icon: <Headphones className="h-7 w-7 text-white" />,
    color: '#0B2558',
    badge: null,
    title: 'IELTS Listening Practice',
    subtitle: 'IELTS listening practice test with audio and answers',
    desc: 'Sharpen your listening skills with real IELTS-format audio recordings. Our locked, non-pausable audio player replicates the actual exam environment so you are fully prepared on test day.',
    points: [
      'Locked audio — cannot pause, rewind or fast-forward',
      'All IELTS listening question types supported',
      'Instant answer-checking with explanations',
      'Section-wise and full-test listening modes',
      'High-quality audio files for Nepali students',
    ],
  },
  {
    icon: <BookOpen className="h-7 w-7 text-white" />,
    color: '#1E3A6E',
    badge: null,
    title: 'IELTS Academic Reading Practice',
    subtitle: 'IELTS academic reading practice test online — all question types',
    desc: 'Master every reading question type with our full-length academic passages. Practice True/False/Not Given, Yes/No/Not Given, MCQ, Matching Headings, Summary Completion and more.',
    points: [
      'True/False/Not Given & Yes/No/Not Given',
      'Multiple Choice & Matching Headings',
      'Summary Completion & Sentence Completion',
      'Matching Information & Short-Answer Questions',
      'Realistic 60-minute timed reading environment',
    ],
  },
  {
    icon: <PenLine className="h-7 w-7 text-white" />,
    color: '#EE6055',
    badge: 'Expert Evaluated',
    title: 'Writing Task 1 & Task 2 Evaluation',
    subtitle: 'IELTS writing task 1 and task 2 practice with evaluation — writing correction service Nepal',
    desc: 'Submit your writing tasks and receive detailed, human-graded feedback from certified IELTS instructors. This is not just AI — real teachers evaluate your band score for Task Achievement, Coherence, Vocabulary, and Grammar.',
    points: [
      'IELTS writing correction service Nepal',
      'Expert IELTS instructor feedback (human-graded)',
      'Personalized IELTS band score evaluation per criterion',
      'Detailed IELTS writing and speaking assessment report',
      'Task 1 (Graphs/Letters) + Task 2 (Essays)',
    ],
  },
  {
    icon: <Mic2 className="h-7 w-7 text-white" />,
    color: '#0B2558',
    badge: null,
    title: 'IELTS Speaking Mock Tests',
    subtitle: '1-on-1 IELTS speaking mock test online — speaking practice test Nepal',
    desc: 'Book a 1-on-1 IELTS speaking mock test with our certified instructors. Get real-time feedback on fluency, pronunciation, lexical resource, and grammatical range — just like the actual IELTS speaking interview.',
    points: [
      '1-on-1 IELTS speaking mock test with certified examiner',
      'All 3 parts: Introduction, Cue Card, Discussion',
      'Detailed speaking band score breakdown',
      'Pronunciation and fluency coaching',
      'Flexible scheduling for Nepali students',
    ],
  },
  {
    icon: <Video className="h-7 w-7 text-white" />,
    color: '#1E3A6E',
    badge: 'Premium',
    title: 'Recorded IELTS Video Classes',
    subtitle: 'IELTS recorded video classes Nepal — Band 8+ strategy classes online',
    desc: 'Access our complete library of self-paced IELTS preparation courses taught by expert instructors from Jawaaf Consulting Academy, Putalisadak. From beginner to Band 8+ strategy — learn at your own pace, anytime.',
    points: [
      'IELTS recorded video classes in Nepal',
      'Complete IELTS online course — Listening, Reading, Writing, Speaking',
      'Band 8+ IELTS strategy classes online',
      'IELTS tips and tricks video lectures',
      'Self-paced IELTS preparation course — learn anytime',
    ],
  },
  {
    icon: <MessageSquareText className="h-7 w-7 text-white" />,
    color: '#EE6055',
    badge: null,
    title: 'AI-Integrated IELTS Preparation',
    subtitle: 'AI integrated IELTS assessment — personalized learning for Nepali students',
    desc: 'Our platform combines AI-powered analytics with human expertise. Get instant performance insights, weakness detection, and personalized study plans — built specifically for IELTS preparation in Nepal.',
    points: [
      'AI-powered band score prediction',
      'Weakness detection across all 4 skills',
      'Personalized study plan based on your performance',
      'Progress tracking and improvement analytics',
      'AI + human evaluation for best results',
    ],
  },
  {
    icon: <Globe className="h-7 w-7 text-white" />,
    color: '#0B2558',
    badge: null,
    title: 'Visa Processing IELTS Preparation',
    subtitle: 'IELTS preparation for visa processing — Australia, Canada, UK, New Zealand',
    desc: 'Preparing for a visa to Australia, Canada, UK, or New Zealand? Our targeted IELTS prep program helps you hit the band score required for your visa application — with expert guidance from our experienced consultants at Jawaaf Consulting Academy.',
    points: [
      'Target band score preparation for student visa',
      'Australia PR / Canada immigration IELTS coaching',
      'UK student visa IELTS preparation Nepal',
      'New Zealand visa IELTS score guidance',
      'Expert visa consultants at Putalisadak Kathmandu',
    ],
  },
];

const faqs = [
  {
    q: 'How to practice computer-based IELTS at home in Nepal?',
    a: 'With Jawaaf IELTS Lab, you can practice computer-based IELTS from home anywhere in Nepal. Our platform replicates the exact CD-IELTS interface — including the split-screen listening panel, reading scroll, and writing editor. Register free, take a demo test, and experience the real exam environment online.',
  },
  {
    q: 'Where to take free IELTS mock test in Kathmandu?',
    a: 'Jawaaf IELTS Lab (by Jawaaf Consulting Academy, Putalisadak, Kathmandu) offers free IELTS mock tests online. Every new student gets 1 free demo mock test immediately after registration — no credit card required. You can also visit our centre at Putalisadak, Kathmandu (01-4647115) for in-person guidance.',
  },
  {
    q: 'What is the best website for IELTS writing evaluation in Nepal?',
    a: "Jawaaf IELTS Lab is Nepal's leading platform for IELTS writing evaluation. Unlike AI-only tools, our writing tasks are reviewed by certified IELTS instructors who provide detailed, criterion-based feedback on Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Range. This human-graded IELTS evaluation gives you the most accurate band score assessment.",
  },
  {
    q: 'How to get Band 7.5 in IELTS self-study?',
    a: "To achieve Band 7.5 in IELTS through self-study: (1) Take at least 2 full-length mock tests per week on Jawaaf IELTS Lab to identify weak areas. (2) Watch our Band 8+ strategy video classes for each skill. (3) Submit writing tasks for expert instructor evaluation and act on feedback. (4) Practice IELTS listening daily with our locked-audio mock tests. (5) Book a 1-on-1 speaking mock test to refine fluency and pronunciation.",
  },
  {
    q: 'What is the IELTS mock test price in Nepal?',
    a: 'Jawaaf IELTS Lab offers a free demo mock test for all new students. Premium access includes unlimited full-length mock tests, section-wise practice, writing evaluation, and video classes at affordable pricing for Nepali students. Contact us at 01-4647115 or visit Putalisadak, Kathmandu for current pricing details.',
  },
  {
    q: 'Is Jawaaf IELTS Lab good for visa processing IELTS preparation?',
    a: 'Yes! Jawaaf Consulting Academy has been helping Nepali students achieve the required IELTS band scores for visa applications to Australia, Canada, UK, and New Zealand for years. Our targeted preparation program focuses on the specific band score your visa type requires — with both online mock tests and expert instructor guidance available from our Putalisadak centre.',
  },
];

const stats = [
  { value: '50,000+', label: 'Students Prepared', icon: <Users className="h-6 w-6" /> },
  { value: '1,000+', label: 'Mock Tests Taken', icon: <BarChart3 className="h-6 w-6" /> },
  { value: '98%', label: 'Success Rate', icon: <Award className="h-6 w-6" /> },
  { value: '4.8/5', label: 'Student Rating', icon: <Star className="h-6 w-6" /> },
];

/* ─────────────────────────── COMPONENTS ─────────────────────────── */

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-white hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="font-semibold text-[#05162E] text-sm sm:text-base leading-snug">{q}</span>
        <span className="shrink-0 text-[#1E3A6E]">
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 bg-white border-t border-slate-100">
          <p className="text-slate-600 text-sm leading-relaxed pt-3">{a}</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── PAGE ─────────────────────────── */

export default function FeaturesPage() {
  return (
    <>
      <Helmet>
        <title>Features — Jawaaf IELTS Lab | Best Online IELTS Mock Test & Preparation in Nepal</title>
        <meta
          name="description"
          content="Explore Jawaaf IELTS Lab's full features: computer-based IELTS mock tests, IELTS listening practice with audio, academic reading practice, writing task 1 & 2 evaluation, speaking mock tests, recorded video classes, and AI-integrated preparation — trusted by 50,000+ Nepali students."
        />
        <meta
          name="keywords"
          content="IELTS mock test in Nepal, online IELTS preparation Nepal, computer based IELTS mock test Nepal, best IELTS coaching online Nepal, free IELTS mock test online Nepal, IELTS listening practice test with audio and answers, IELTS academic reading practice test online, IELTS writing task 1 and task 2 practice with evaluation, 1-on-1 IELTS speaking mock test, IELTS recorded video classes Nepal, Band 8+ IELTS strategy classes online, IELTS writing correction service Nepal, expert IELTS instructor feedback, Jawaaf IELTS Lab, Jawaaf Consulting Academy IELTS, IELTS preparation in Putalisadak Kathmandu, IELTS mock test price in Nepal, visa processing IELTS preparation Nepal"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://lab.jawaaf.com/features" />
        <meta property="og:title" content="Features — Jawaaf IELTS Lab | Nepal's #1 IELTS Preparation Platform" />
        <meta property="og:description" content="Full-length IELTS mock tests, listening practice with audio, writing evaluation by experts, speaking mock tests, Band 8+ video classes — everything for IELTS success in Nepal." />
        <meta property="og:url" content="https://lab.jawaaf.com/features" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-[#F4F7FB]">

        {/* ── 1ST VIEW: UNIFIED HERO & ONBOARDING CANVAS ── */}
        <section className="relative bg-gradient-to-br from-[#0B2558] via-[#133A7C] to-[#0A1E45] py-8 sm:py-12 md:py-16 overflow-hidden">
          {/* Modern subtle dot matrix grid overlay for depth and SaaS elegance */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {/* Luminous atmospheric glowing lights (royal sapphire, warm coral, cyan) */}
          <div className="absolute -top-24 -right-24 w-[550px] h-[550px] rounded-full bg-sky-400/20 blur-[130px] pointer-events-none" />
          <div className="absolute top-1/4 -left-24 w-[480px] h-[480px] rounded-full bg-[#EE6055]/25 blur-[140px] pointer-events-none" />
          <div className="absolute bottom-10 right-1/3 w-[450px] h-[350px] rounded-full bg-blue-300/15 blur-[110px] pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
            {/* Top Navigation & Brand Header */}
            <header className="flex items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-white/15">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-white hover:text-white text-xs sm:text-sm font-semibold transition-all bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl border border-white/20 backdrop-blur-md shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>

              {/* Jawaaf Logo */}
              <Link to="/" className="flex items-center group transition-transform hover:scale-[1.02]">
                <JawaafLogo isWhite={true} className="h-8 sm:h-10 md:h-11 w-auto drop-shadow-md" />
              </Link>

              <div className="flex items-center gap-2.5">
                <Link
                  to="/pricing"
                  className="text-white/80 hover:text-white text-xs sm:text-sm font-semibold transition-all px-3 py-1.5 rounded-lg hover:bg-white/10 hidden sm:inline-flex"
                >
                  Pricing
                </Link>
                <Link
                  to="/demo-exam"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#EE6055] via-[#f06e64] to-[#d94f46] hover:brightness-110 px-4 py-2 rounded-xl shadow-lg shadow-[#EE6055]/30 transition-all border border-white/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Free Demo Mock Test</span>
                  <span className="sm:hidden">Try Free</span>
                </Link>
              </div>
            </header>

            {/* ── CARD 1: HERO CONTAINER (Top Card with Mascot) ── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#163D78] via-[#1B4B91] to-[#103063] border border-white/20 p-6 sm:p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(5,20,50,0.5)]">
              {/* Natural depth gradients & top border highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 -bottom-16 h-80 w-80 rounded-full bg-[#EE6055]/20 blur-3xl" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0A224D]/80 via-[#103063]/30 to-transparent z-0" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                {/* Left Content (7-8 cols on lg) */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-start text-left pb-2 sm:pb-4">
                  {/* Eyebrow Tag */}
                  <div className="inline-flex items-center gap-2 bg-[#EE6055] text-white rounded-full px-3.5 py-1 mb-4 shadow-md shadow-[#EE6055]/25 border border-white/25">
                    <Zap className="h-3.5 w-3.5 fill-white text-white" />
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest">PLATFORM FEATURES</span>
                  </div>

                  {/* Main Title with Primary SEO Keywords */}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-black text-white leading-[1.18] tracking-tight drop-shadow-sm">
                    Nepal's #1 Platform for{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8278] via-[#FFA89F] to-[#FFE2DE]">
                      Online IELTS Mock Test
                    </span>{' '}
                    &amp; Preparation
                  </h1>

                  {/* Subtext */}
                  <p className="mt-4 text-blue-50 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl font-normal drop-shadow-sm">
                    Complete IELTS preparation platform with <strong className="text-white font-semibold underline decoration-white/30 underline-offset-2">real CD-IELTS mock tests</strong>, <strong className="text-white font-semibold underline decoration-white/30 underline-offset-2">Band 8+ recorded video classes</strong>, and <strong className="text-white font-semibold underline decoration-white/30 underline-offset-2">certified teacher writing &amp; speaking feedback</strong>.
                  </p>

                  {/* CTA Actions */}
                  <div className="mt-7 flex flex-wrap items-center gap-3.5">
                    <Link
                      to="/demo-exam"
                      className="inline-flex items-center gap-2 bg-[#EE6055] hover:bg-[#d94f46] text-white font-extrabold px-6 py-3.5 rounded-xl transition-all shadow-xl shadow-[#EE6055]/40 hover:shadow-[#EE6055]/60 hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm tracking-wide uppercase border border-white/20"
                    >
                      START YOUR IELTS JOURNEY <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold px-5 py-3.5 rounded-xl transition-all text-xs sm:text-sm backdrop-blur-md shadow-sm"
                    >
                      <Play className="h-4 w-4 fill-white" /> See Platform Demo
                    </Link>
                  </div>
                </div>

                {/* Right Content: Mascot Image Grounded Seamlessly */}
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col items-center lg:items-end justify-end self-end lg:-mb-10 lg:-mr-6 xl:-mr-8">
                  <div className="relative flex flex-col items-center">
                    {/* Soft ambient back glow behind the owl's head */}
                    <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full bg-gradient-to-b from-[#EE6055]/30 via-sky-300/25 to-transparent blur-3xl" />

                    {/* Mascot with subtle ambient lighting */}
                    <img
                      src="/images/feedback/writing-feedback-overall-mascot-natural.png"
                      alt="Jawaaf IELTS Mascot"
                      className="relative z-10 w-56 h-auto sm:w-64 md:w-72 lg:w-80 xl:w-[340px] max-w-full object-contain select-none filter drop-shadow-[0_18px_30px_rgba(4,18,48,0.5)] hover:scale-[1.02] transition-transform duration-500"
                    />

                    {/* Natural Grounding Contact Shadow under the wooden desk */}
                    <div className="w-[88%] h-4 bg-[#051533]/80 blur-md rounded-full -mt-3 relative z-0 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD 2: 4 STATS CARDS (Modern Luminous Glass Cards) ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
              {[
                { value: '50,000+', label: 'Students Prepared', icon: <Users className="h-5 w-5 text-sky-200" />, badgeBg: 'bg-sky-400/25 border-sky-300/30' },
                { value: '1,000+', label: 'Mock Tests Taken', icon: <BarChart3 className="h-5 w-5 text-[#FFB0A8]" />, badgeBg: 'bg-[#EE6055]/25 border-[#EE6055]/30' },
                { value: '98%', label: 'Success Rate', icon: <Award className="h-5 w-5 text-emerald-200" />, badgeBg: 'bg-emerald-400/25 border-emerald-300/30' },
                { value: '4.8/5', label: 'Student Rating', icon: <Star className="h-5 w-5 text-amber-200 fill-amber-300" />, badgeBg: 'bg-amber-400/25 border-amber-300/30' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white/[0.12] hover:bg-white/[0.18] border border-white/20 p-4 sm:p-5 flex flex-col items-center sm:items-start text-center sm:text-left backdrop-blur-md transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`p-2 rounded-xl border ${s.badgeBg} shadow-sm group-hover:scale-110 transition-transform`}>
                      {s.icon}
                    </span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                    {s.value}
                  </span>
                  <span className="text-xs sm:text-sm text-blue-100 font-medium mt-0.5">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* ── CARD 3: 3 SIMPLE STEPS ONBOARDING (Clean White Card) ── */}
            <div className="mt-4 sm:mt-6 bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(5,20,50,0.35)] border border-slate-100 text-[#05162E]">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6 sm:mb-8 pb-5 border-b border-slate-100 text-center md:text-left">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-[#EE6055] bg-[#EE6055]/10 px-3 py-1 rounded-full border border-[#EE6055]/20 mb-2">
                    <Sparkles className="h-3 w-3" /> Quick 3-Step Setup
                  </span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#05162E] tracking-tight">
                    Start Your IELTS Journey in 3 Simple Steps
                  </h2>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm max-w-md font-medium">
                  Get started with the best online IELTS preparation platform in Nepal — in minutes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Step 1 */}
                <div className="group rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 sm:p-6 hover:border-[#1E3A6E]/40 hover:shadow-lg transition-all flex flex-col text-left">
                  <div className="w-11 h-11 rounded-xl bg-[#1E3A6E] text-white font-black text-sm flex items-center justify-center shadow-md mb-3.5 group-hover:scale-110 transition-transform">
                    01
                  </div>
                  <h3 className="font-extrabold text-[#05162E] text-base sm:text-lg mb-1.5">
                    Register Free
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Create your free Jawaaf IELTS Lab account in 30 seconds. No credit card required. Get immediate access to your demo mock test.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="group rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 sm:p-6 hover:border-[#0B2558]/40 hover:shadow-lg transition-all flex flex-col text-left">
                  <div className="w-11 h-11 rounded-xl bg-[#0B2558] text-white font-black text-sm flex items-center justify-center shadow-md mb-3.5 group-hover:scale-110 transition-transform">
                    02
                  </div>
                  <h3 className="font-extrabold text-[#05162E] text-base sm:text-lg mb-1.5">
                    Take a Mock Test
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Experience a full-length CD-IELTS mock test or practice section-wise — Listening with real audio, Reading, Writing, or Speaking.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="group rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 sm:p-6 hover:border-[#EE6055]/40 hover:shadow-lg transition-all flex flex-col text-left">
                  <div className="w-11 h-11 rounded-xl bg-[#EE6055] text-white font-black text-sm flex items-center justify-center shadow-md mb-3.5 group-hover:scale-110 transition-transform">
                    03
                  </div>
                  <h3 className="font-extrabold text-[#05162E] text-base sm:text-lg mb-1.5">
                    Get Expert Feedback
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Receive instant band score calculation, skill analytics, and detailed human instructor evaluations for Writing Task 1 &amp; 2.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ── */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20" aria-label="IELTS Preparation Features">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#05162E] leading-tight">
              Everything You Need to Crack IELTS in Nepal
            </h2>
            <p className="mt-3 text-slate-500 max-w-2xl mx-auto text-base">
              Full mock tests · Listening &amp; Reading practice · Writing evaluation · Speaking mock · Video classes ·
              AI analytics — all in one platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {features.map((f) => (
              <article
                key={f.title}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                {/* card header */}
                <div className="p-6 flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow"
                    style={{ backgroundColor: f.color }}
                  >
                    {f.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-[#05162E] text-base leading-snug">{f.title}</h3>
                      {f.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EE6055]/10 text-[#EE6055] border border-[#EE6055]/20 px-2 py-0.5 rounded-full shrink-0">
                          {f.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#1E3A6E] font-semibold leading-snug">{f.subtitle}</p>
                  </div>
                </div>

                {/* description */}
                <div className="px-6 pb-4">
                  <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                </div>

                {/* bullet points */}
                <div className="px-6 pb-6 mt-auto">
                  <ul className="space-y-2">
                    {f.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle className="h-4 w-4 text-[#1E3A6E] shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── WHY JAWAAF / LOCAL SEO ── */}
        <section className="bg-gradient-to-br from-[#05162E] to-[#1E3A6E] py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
                Trusted by 50,000+ Nepali Students for IELTS Preparation
              </h2>
              <p className="mt-3 text-blue-200 max-w-2xl mx-auto text-base">
                From our centre at <strong className="text-white">Putalisadak, Kathmandu</strong> to your home —{' '}
                <strong className="text-white">Jawaaf Consulting Academy IELTS</strong> now brings expert preparation
                online for every student across Nepal.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <ShieldCheck className="h-6 w-6 text-[#EE6055]" />,
                  title: 'Certified IELTS Instructors',
                  desc: "Every mock test, writing evaluation, and speaking session is backed by instructors certified by IDP and British Council — Nepal's most trusted IELTS names.",
                },
                {
                  icon: <Globe className="h-6 w-6 text-[#EE6055]" />,
                  title: 'Online IELTS Classes for Nepali Students',
                  desc: 'Access from Kathmandu, Pokhara, Butwal, Chitwan, Dharan — anywhere in Nepal with internet. No commute needed. Study at your pace.',
                },
                {
                  icon: <BarChart3 className="h-6 w-6 text-[#EE6055]" />,
                  title: 'Detailed Performance Analytics',
                  desc: 'After every test, see your band score breakdown by skill. Know exactly where to improve — Listening, Reading, Writing or Speaking.',
                },
                {
                  icon: <Zap className="h-6 w-6 text-[#EE6055]" />,
                  title: 'AI + Human Evaluation',
                  desc: 'Our platform combines AI-powered instant feedback with real human instructor evaluation for Writing and Speaking — the best of both worlds.',
                },
                {
                  icon: <Award className="h-6 w-6 text-[#EE6055]" />,
                  title: 'Visa Processing IELTS Expertise',
                  desc: 'Preparing for Australia, Canada, UK or New Zealand visa? Our team at Jawaaf Consulting Academy, Putalisadak has years of experience with visa-targeted IELTS prep.',
                },
                {
                  icon: <Users className="h-6 w-6 text-[#EE6055]" />,
                  title: 'Freemium — Start Free Today',
                  desc: 'Every new student gets 1 free IELTS mock test immediately. No credit card. No commitment. Discover the platform before you pay anything.',
                },
              ].map((item) => (
                <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                  <div className="mb-3">{item.icon}</div>
                  <h3 className="font-bold text-white text-base mb-2">{item.title}</h3>
                  <p className="text-blue-200 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ── FAQ ── */}
        <section className="bg-[#F4F7FB] py-16 md:py-20" aria-label="Frequently Asked Questions">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#05162E]">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-slate-500 text-base">
                Everything you need to know about IELTS preparation in Nepal with Jawaaf IELTS Lab.
              </p>
            </div>
            <div className="space-y-3">
              {faqs.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="bg-gradient-to-r from-[#EE6055] to-[#d94f46] py-14 md:py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Ready to Start Your IELTS Preparation?
            </h2>
            <p className="text-white/85 text-base mb-8 max-w-xl mx-auto">
              Join 50,000+ students preparing for IELTS with Nepal's most trusted online platform — Jawaaf IELTS Lab by
              Jawaaf Consulting Academy, Putalisadak, Kathmandu.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/demo-exam"
                className="inline-flex items-center gap-2 bg-white text-[#EE6055] font-bold px-7 py-3 rounded-xl shadow hover:bg-slate-50 transition-colors text-sm"
              >
                Start Free Mock Test <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="tel:014647115"
                className="inline-flex items-center gap-2 bg-white/15 border border-white/30 text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/25 transition-colors text-sm"
              >
                📞 Call 01-4647115
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="bg-[#05162E] py-10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-white font-bold text-base">Jawaaf Consulting Academy</p>
                <p className="text-blue-300 text-sm mt-0.5">Putalisadak, Kathmandu, Nepal | 01-4647115</p>
              </div>
              <div className="flex flex-wrap justify-center gap-5 text-sm text-blue-300">
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                <Link to="/features" className="hover:text-white transition-colors">Features</Link>
                <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link to="/tests" className="hover:text-white transition-colors">Mock Tests</Link>
                <Link to="/courses" className="hover:text-white transition-colors">Video Classes</Link>
                <Link to="/register" className="hover:text-white transition-colors">Register Free</Link>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-blue-400/70 text-xs leading-relaxed">
                Jawaaf IELTS Lab — Nepal's leading online IELTS preparation platform for Listening, Reading, Writing &amp;
                Speaking | IELTS mock test in Nepal | Best IELTS coaching online Nepal | Computer based IELTS mock test
                Nepal | Serving students in Kathmandu, Butwal, Pokhara, Chitwan, Dharan and across Nepal.
              </p>
              <p className="text-blue-400/50 text-xs mt-2">© {new Date().getFullYear()} Jawaaf Consulting Academy. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
