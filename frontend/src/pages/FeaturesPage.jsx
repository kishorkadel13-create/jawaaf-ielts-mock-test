import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Headphones, BookOpen, PenLine, Mic2, Video, MessageSquareText,
  CheckCircle, ChevronDown, ChevronUp, Star, Award, Clock, BarChart3,
  Zap, Users, Globe, ShieldCheck, ArrowRight, Play
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

        {/* ── HERO ── */}
        <section className="relative bg-gradient-to-br from-[#05162E] via-[#0B2558] to-[#1E3A6E] overflow-hidden">
          {/* decorative blobs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#EE6055]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
            {/* Back link */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-blue-300 hover:text-white text-sm font-medium mb-10 transition-colors"
            >
              ← Back to Home
            </Link>

            <div className="max-w-3xl">
              {/* eyebrow */}
              <div className="inline-flex items-center gap-2 bg-[#EE6055]/15 border border-[#EE6055]/30 rounded-full px-4 py-1.5 mb-6">
                <Zap className="h-3.5 w-3.5 text-[#EE6055]" />
                <span className="text-[#EE6055] text-xs font-bold uppercase tracking-widest">Platform Features</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
                Nepal's #1 Platform for{' '}
                <span className="text-[#EE6055]">Online IELTS Mock Test</span>{' '}
                &amp; Preparation
              </h1>
              <p className="mt-5 text-blue-200 text-base md:text-lg leading-relaxed max-w-2xl">
                From <strong className="text-white">computer-based IELTS mock tests</strong> to{' '}
                <strong className="text-white">Band 8+ video classes</strong> and{' '}
                <strong className="text-white">expert writing evaluation</strong> — Jawaaf IELTS Lab is the most
                complete <strong className="text-white">online IELTS preparation platform in Nepal</strong>, trusted by
                50,000+ students from Kathmandu to Pokhara.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-[#EE6055] hover:bg-[#d94f46] text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#EE6055]/30 text-sm"
                >
                  Start Free IELTS Mock Test <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
                >
                  <Play className="h-4 w-4" /> See Platform Demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-slate-200">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col items-center text-center px-4">
                  <span className="text-[#1E3A6E] mb-1">{s.icon}</span>
                  <span className="text-2xl font-extrabold text-[#05162E]">{s.value}</span>
                  <span className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</span>
                </div>
              ))}
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

        {/* ── HOW IT WORKS ── */}
        <section className="bg-white py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#05162E] mb-3">
              Start Your IELTS Journey in 3 Simple Steps
            </h2>
            <p className="text-slate-500 mb-12 text-base">
              Get started with the best online IELTS preparation platform in Nepal — in minutes.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: '01', title: 'Register Free', desc: 'Create your free Jawaaf IELTS Lab account. No credit card required. Get instant access to your demo mock test.' },
                { step: '02', title: 'Take a Mock Test', desc: 'Start a full-length computer-based IELTS mock test or practice by section — Listening, Reading, Writing, or Speaking.' },
                { step: '03', title: 'Get Expert Feedback', desc: 'Receive your instant band score result, detailed analysis, and human instructor feedback on your writing and speaking.' },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#1E3A6E] text-white text-2xl font-extrabold flex items-center justify-center mb-4 shadow-md">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-[#05162E] text-lg mb-2">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
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
                to="/register"
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
                <Link to="/tests" className="hover:text-white transition-colors">Mock Tests</Link>
                <Link to="/courses" className="hover:text-white transition-colors">Video Classes</Link>
                <Link to="/register" className="hover:text-white transition-colors">Register Free</Link>
                <Link to="/features" className="hover:text-white transition-colors">Features</Link>
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
