import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import JawaafLogo from '../components/JawaafLogo';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  CheckCircle,
  CheckCircle2,
  X,
  Clock,
  Calendar,
  ShieldCheck,
  Award,
  BookOpen,
  Headphones,
  Users,
  Laptop,
  MapPin,
  Phone,
  HelpCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  Star,
  Monitor,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Play,
  CreditCard,
  QrCode,
  Building2,
  FileText
} from 'lucide-react';

/* ─────────────────────────── FAQ COMPONENT ─────────────────────────── */
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

export default function PricingPage() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': 'https://jawaaf.com/#organization',
        'name': 'Jawaaf Consulting Academy',
        'url': 'https://jawaaf.com',
        'logo': 'https://jawaaf.com/jawaaf-logo.png',
        'description': "Nepal's premier IELTS preparation academy and online computer-based IELTS testing portal.",
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': 'Putalisadak',
          'addressLocality': 'Kathmandu',
          'addressRegion': 'Bagmati',
          'addressCountry': 'NP'
        },
        'telephone': '+977-01-4647115'
      },
      {
        '@type': 'Product',
        'name': 'Jawaaf IELTS Lab — 90 Days Online Pro Plan',
        'description': '90 Days full online access to computer-based IELTS mock tests, updated recorded video classes, and section-wise practice tests for both Academic and General Training.',
        'offers': {
          '@type': 'Offer',
          'price': '6500',
          'priceCurrency': 'NPR',
          'availability': 'https://schema.org/InStock',
          'url': 'https://jawaaf.com/pricing'
        }
      },
      {
        '@type': 'Product',
        'name': 'Jawaaf IELTS Lab — 150 Days Hybrid & Physical Mentorship Plan',
        'description': '150 Days extended access with in-person instructor meetings at Putalisadak Kathmandu, 1-on-1 physical speaking mock tests, physical writing evaluation, and computer lab access.',
        'offers': {
          '@type': 'Offer',
          'price': '11500',
          'priceCurrency': 'NPR',
          'availability': 'https://schema.org/InStock',
          'url': 'https://jawaaf.com/pricing'
        }
      },
      {
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'What is the IELTS preparation course fee in Nepal at Jawaaf IELTS Lab?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Jawaaf IELTS Lab offers two subscription packages: the 90-Day Online Pro Plan at NPR 6,500 and the 150-Day Hybrid & Physical Mentorship Plan at NPR 11,500 with physical instructor sessions in Putalisadak, Kathmandu.'
            }
          },
          {
            '@type': 'Question',
            'name': 'What is included in the 90 Days Online IELTS course?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'The 90-Day Plan includes 24/7 online portal access, updated Band 8+ video lectures for all 4 skills, full-length CD-IELTS computer-based mock tests, 1,000+ section-wise questions, automated AI scoring, and practice for both Academic and General Training.'
            }
          },
          {
            '@type': 'Question',
            'name': 'What are the benefits of the 150 Days Hybrid package?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'The 150-Day Hybrid package gives you complete online portal access plus physical face-to-face meetings with master instructors at Putalisadak, in-person 1-on-1 speaking mock interviews, physical writing paper corrections, and physical lab access.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Are both Academic and General Training covered?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes! Both the 90-Day and 150-Day packages include complete, dedicated materials, mock tests, and video courses for both IELTS Academic (university study) and IELTS General Training (migration and work visa).'
            }
          }
        ]
      }
    ]
  };

  const faqs = [
    {
      q: 'What is the difference between the 90-Day and 150-Day packages?',
      a: 'The 90-Day Plan is 100% online, ideal for students across Nepal or abroad who want comprehensive recorded classes, full CD-IELTS mock tests, and section practice at their own schedule. The 150-Day Hybrid Plan includes everything in the online plan PLUS physical face-to-face meetings with our senior instructors at Putalisadak Kathmandu, in-person 1-on-1 speaking mock interviews with examiner feedback, hand-graded paper writing checks, and computer lab access.'
    },
    {
      q: 'How does the Computer-Based (CD-IELTS) test simulator help me?',
      a: 'Practicing on paper cannot prepare you for the real CD-IELTS interface. Our simulator reproduces the exact screen layout, countdown timer, text highlighter, instant notepad, split screen passage viewer, and continuous audio playback used by IDP and British Council in Nepal. You enter the actual exam room completely confident and familiar.'
    },
    {
      q: 'Are both IELTS Academic and General Training modules covered?',
      a: 'Yes, absolutely! Both modules are fully supported. Whether you are preparing for IELTS Academic for university abroad or General Training for Australia/Canada PR and work visas, you get dedicated video lessons, Task 1 differences (Graph vs Letter), Reading passages, and tailored mock exams.'
    },
    {
      q: 'How are the video recorded classes structured?',
      a: 'Our video classes are self-paced, updated for 2026 test patterns, and taught by certified IELTS trainers with 8.5+ band scores. They cover foundation concepts, step-by-step strategies for True/False/Not Given, Headings, Map Labelling, Task 1 structure, Task 2 essay templates, and Band 8 Speaking fluency frameworks.'
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept eSewa, Khalti, Fonepay QR, Direct Bank Transfer (any Nepali bank), and Cash or Card payments physically at our office in Putalisadak, Kathmandu. Your account is activated immediately upon payment verification.'
    },
    {
      q: 'Can I upgrade from the 90-Day Online Plan to the 150-Day Hybrid Plan later?',
      a: 'Yes! You can upgrade anytime within your 90-day subscription period by simply paying the fee difference. Your account will automatically be extended and you will gain access to in-person instructor sessions at Putalisadak.'
    },
    {
      q: 'Where is Jawaaf Consulting Academy physically located in Kathmandu?',
      a: 'We are conveniently located at the educational hub of Nepal: Putalisadak, Kathmandu (opposite to Star Mall / near Kumari Bank). You can visit our office Sunday to Friday, 7:00 AM to 6:00 PM, or call us at 01-4647115.'
    },
    {
      q: 'Can I test the platform for free before paying?',
      a: 'Yes! You can take our Free Demo Mock Test without paying or providing payment details. Experience the real timer, listening audio player, reading passages, and writing interface to see why thousands of Nepali students trust Jawaaf IELTS Lab.'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Pricing &amp; Packages — Jawaaf IELTS Lab | IELTS Preparation Course Fee in Nepal</title>
        <meta
          name="description"
          content="Transparent and affordable IELTS course fees in Nepal. Choose between 90-Day Online Access (NPR 6,500) and 150-Day Hybrid Mentorship with in-person instructor feedback in Putalisadak Kathmandu (NPR 11,500). Real CD-IELTS mock tests & Band 8+ video classes."
        />
        <meta
          name="keywords"
          content="IELTS preparation course fee in Nepal, IELTS course price Kathmandu, IELTS mock test price Nepal, Jawaaf IELTS Lab pricing, 90 days IELTS preparation fee Nepal, 150 days IELTS class Nepal, IELTS Putalisadak fee, computer based IELTS mock test price, IELTS academic and general training price Nepal"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://lab.jawaaf.com/pricing" />
        <meta property="og:title" content="Pricing &amp; Subscription Packages — Jawaaf IELTS Lab Nepal" />
        <meta
          property="og:description"
          content="Choose your IELTS plan: 90 Days Online Access (Rs. 6,500) or 150 Days Hybrid with Physical Instructor Mentorship at Putalisadak (Rs. 11,500)."
        />
        <meta property="og:url" content="https://lab.jawaaf.com/pricing" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#F4F7FB]">

        {/* ── 1ST VIEW: UNIFIED HERO & ONBOARDING CANVAS (Identical to Features Page) ── */}
        <section className="relative bg-gradient-to-br from-[#0B2558] via-[#133A7C] to-[#0A1E45] py-8 sm:py-12 md:py-16 overflow-hidden">
          {/* Subtle dot matrix grid overlay for depth and SaaS elegance */}
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
                  to="/features"
                  className="text-white/80 hover:text-white text-xs sm:text-sm font-semibold transition-all px-3 py-1.5 rounded-lg hover:bg-white/10 hidden sm:inline-flex"
                >
                  Features
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

            {/* ── CARD 1: HERO CONTAINER (Top Card with Mascot - Matches Features Page) ── */}
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
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest">TRANSPARENT PRICING &amp; PLANS</span>
                  </div>

                  {/* Main Title with Primary SEO Keywords */}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-black text-white leading-[1.18] tracking-tight drop-shadow-sm">
                    Affordable IELTS Plans for{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8278] via-[#FFA89F] to-[#FFE2DE]">
                      Online &amp; In-Person
                    </span>{' '}
                    Success
                  </h1>

                  {/* Subtext */}
                  <p className="mt-4 text-blue-50 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl font-normal drop-shadow-sm">
                    Select the ideal duration for your preparation. Includes <strong className="text-white font-semibold underline decoration-white/30 underline-offset-2">Band 8+ recorded video classes</strong>, <strong className="text-white font-semibold underline decoration-white/30 underline-offset-2">real CD-IELTS computer simulation</strong>, and <strong className="text-white font-semibold underline decoration-white/30 underline-offset-2">physical instructor mentorship in Putalisadak</strong>.
                  </p>

                  {/* CTA Actions */}
                  <div className="mt-7 flex flex-wrap items-center gap-3.5">
                    <a
                      href="#pricing-plans"
                      className="inline-flex items-center gap-2 bg-[#EE6055] hover:bg-[#d94f46] text-white font-extrabold px-6 py-3.5 rounded-xl transition-all shadow-xl shadow-[#EE6055]/40 hover:shadow-[#EE6055]/60 hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm tracking-wide uppercase border border-white/20"
                    >
                      EXPLORE PACKAGES <ArrowRight className="h-4 w-4" />
                    </a>
                    <Link
                      to="/demo-exam"
                      className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold px-5 py-3.5 rounded-xl transition-all text-xs sm:text-sm backdrop-blur-md shadow-sm"
                    >
                      <Sparkles className="h-4 w-4 text-amber-300" /> Start Free Demo Test
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

            {/* ── CARD 2: 4 STATS CARDS (Identical to Features Page) ── */}
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

            {/* ── CARD 3: 3 SIMPLE ENROLLMENT STEPS (Identical White Container to Features Page) ── */}
            <div className="mt-4 sm:mt-6 bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(5,20,50,0.35)] border border-slate-100 text-[#05162E]">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6 sm:mb-8 pb-5 border-b border-slate-100 text-center md:text-left">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-[#EE6055] bg-[#EE6055]/10 px-3 py-1 rounded-full border border-[#EE6055]/20 mb-2">
                    <Sparkles className="h-3 w-3" /> Quick 3-Step Enrollment
                  </span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#05162E] tracking-tight">
                    How Subscription Activation Works
                  </h2>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm max-w-md font-medium">
                  Instant activation via eSewa, Khalti, QR, Bank Transfer, or at our Putalisadak office.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Step 1 */}
                <div className="group rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 sm:p-6 hover:border-[#1E3A6E]/40 hover:shadow-lg transition-all flex flex-col text-left">
                  <div className="w-11 h-11 rounded-xl bg-[#1E3A6E] text-white font-black text-sm flex items-center justify-center shadow-md mb-3.5 group-hover:scale-110 transition-transform">
                    01
                  </div>
                  <h3 className="font-extrabold text-[#05162E] text-base sm:text-lg mb-1.5">
                    Select Your Plan
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Choose either the 90-Day Online Plan for self-paced study or the 150-Day Hybrid Plan with face-to-face mentor sessions.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="group rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 sm:p-6 hover:border-[#0B2558]/40 hover:shadow-lg transition-all flex flex-col text-left">
                  <div className="w-11 h-11 rounded-xl bg-[#0B2558] text-white font-black text-sm flex items-center justify-center shadow-md mb-3.5 group-hover:scale-110 transition-transform">
                    02
                  </div>
                  <h3 className="font-extrabold text-[#05162E] text-base sm:text-lg mb-1.5">
                    Complete Quick Payment
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Pay securely using eSewa, Khalti, Fonepay QR, Direct Bank Transfer, or cash/card at our Putalisadak Academy.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="group rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 sm:p-6 hover:border-[#EE6055]/40 hover:shadow-lg transition-all flex flex-col text-left">
                  <div className="w-11 h-11 rounded-xl bg-[#EE6055] text-white font-black text-sm flex items-center justify-center shadow-md mb-3.5 group-hover:scale-110 transition-transform">
                    03
                  </div>
                  <h3 className="font-extrabold text-[#05162E] text-base sm:text-lg mb-1.5">
                    Start Prep Immediately
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Unlock all CD-IELTS computer mock tests, updated Band 8+ video courses, and schedule teacher evaluations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: THE 2 SUBSCRIPTION PLANS (Direct Comparison) ── */}
        <section id="pricing-plans" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20 scroll-mt-6" aria-label="Subscription Pricing Packages">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#1E3A6E] bg-blue-100/80 px-3.5 py-1 rounded-full mb-3 border border-blue-200">
              <Calendar className="h-3.5 w-3.5 text-[#1E3A6E]" /> DURATION-BASED SUBSCRIPTION
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#05162E] leading-tight">
              Choose the Plan That Matches Your Target Band
            </h2>
            <p className="mt-3 text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">
              Both packages provide comprehensive coverage for <strong>Academic and General Training</strong> modules with complete CD-IELTS computer simulation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

            {/* ── CARD 1: 90 DAYS ONLINE ACCESS (NPR 6,500) ── */}
            <div className="relative rounded-3xl bg-white border border-slate-200 shadow-xl p-7 sm:p-9 flex flex-col justify-between hover:border-[#1E3A6E]/40 hover:shadow-2xl transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-[#1E3A6E] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                    90 Days Online Plan
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>3 Full Months Access</span>
                  </div>
                </div>

                <h3 className="text-2xl font-black text-[#05162E] tracking-tight mb-2">
                  Online Pro Access
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                  Perfect for self-motivated students across Nepal and abroad who need flexible online practice, recorded video classes, and CD-IELTS computer simulation.
                </p>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 pb-6 border-b border-slate-100 mb-6">
                  <span className="text-xs sm:text-sm font-bold text-slate-400">NPR</span>
                  <span className="text-4xl sm:text-5xl font-black text-[#05162E] tracking-tight">6,500</span>
                  <span className="text-xs text-slate-500 font-medium">/ 90 days total (~Rs. 72/day)</span>
                </div>

                {/* Included Features List */}
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3.5">
                  What&apos;s Included:
                </p>
                <ul className="space-y-3 text-sm text-slate-700 mb-8">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#1E3A6E] shrink-0 mt-0.5" />
                    <span><strong>90 Days 24/7 Online Portal Access</strong> from any device</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#1E3A6E] shrink-0 mt-0.5" />
                    <span><strong>Band 8+ Updated Video Courses</strong> for Listening, Reading, Writing &amp; Speaking</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#1E3A6E] shrink-0 mt-0.5" />
                    <span><strong>Both Modules Covered:</strong> Dedicated tracks for Academic and General Training</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#1E3A6E] shrink-0 mt-0.5" />
                    <span><strong>Real CD-IELTS Computer Simulator:</strong> Exact timer, text highlighter, notepad &amp; split screen</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#1E3A6E] shrink-0 mt-0.5" />
                    <span><strong>One Continuous Listening Audio:</strong> Locked playback just like the actual British Council/IDP test</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#1E3A6E] shrink-0 mt-0.5" />
                    <span><strong>Full Mock Tests &amp; Section-Wise Practice</strong> with instant score calculation</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#1E3A6E] shrink-0 mt-0.5" />
                    <span><strong>AI-Powered Analytics:</strong> Identify your weak question types in real-time</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-slate-400">
                    <X className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                    <span className="line-through">In-person physical instructor meetings at Putalisadak</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-slate-400">
                    <X className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                    <span className="line-through">Physical 1-on-1 speaking interview with human examiner</span>
                  </li>
                </ul>
              </div>

              <div>
                <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#1E3A6E] hover:bg-[#0B2558] text-white font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg text-sm"
                >
                  Enroll in 90-Day Online Plan <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-center text-[11px] text-slate-400 mt-2.5">
                  Instant access upon payment verification • No card required to register
                </p>
              </div>
            </div>

            {/* ── CARD 2: 150 DAYS HYBRID & PHYSICAL MENTORSHIP (NPR 11,500) ── */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#0A224D] via-[#103063] to-[#0A1E45] border-2 border-[#EE6055] shadow-2xl p-7 sm:p-9 flex flex-col justify-between text-white overflow-hidden group">
              {/* Recommended Badge */}
              <div className="absolute top-0 right-0 bg-[#EE6055] text-white text-[11px] font-black uppercase tracking-widest py-1.5 px-6 rounded-bl-2xl shadow-md flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> RECOMMENDED FOR BAND 7.5+
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-[#FF9E96] bg-[#EE6055]/20 border border-[#EE6055]/30 px-3 py-1 rounded-full">
                    150 Days Hybrid Mentorship
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-200 bg-white/10 px-2.5 py-1 rounded-lg">
                    <Calendar className="h-3.5 w-3.5 text-sky-300" />
                    <span>5 Full Months Access</span>
                  </div>
                </div>

                <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                  Hybrid &amp; Physical Mentorship
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed mb-6">
                  The ultimate preparation experience: full online portal access PLUS physical face-to-face mentorship, speaking interviews, and essay correction at Putalisadak.
                </p>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 pb-6 border-b border-white/15 mb-6">
                  <span className="text-xs sm:text-sm font-bold text-blue-200">NPR</span>
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">11,500</span>
                  <span className="text-xs text-blue-200 font-medium">/ 150 days total (~Rs. 76/day)</span>
                </div>

                {/* Included Features List */}
                <p className="text-xs font-extrabold uppercase tracking-wider text-blue-200 mb-3.5">
                  Everything in Online Pro, PLUS:
                </p>
                <ul className="space-y-3 text-sm text-blue-50 mb-8">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#EE6055] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Extended 150 Days Access:</strong> 5 full months of unlimited portal preparation</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#EE6055] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Physical Face-to-Face Meetings:</strong> Meet instructors in person at Putalisadak Kathmandu</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#EE6055] shrink-0 mt-0.5" />
                    <span><strong className="text-white">1-on-1 In-Person Speaking Mocks:</strong> Live interviews with certified examiners &amp; fluency coaching</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#EE6055] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Physical Writing Paper Evaluation:</strong> Hand-graded essay corrections with detailed band descriptors</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#EE6055] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Putalisadak Lab &amp; Library Access:</strong> Practice in our quiet computer lab environment</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#EE6055] shrink-0 mt-0.5" />
                    <span><strong className="text-white">All Video Courses &amp; CD-IELTS Mocks:</strong> Full access to all recorded classes and question banks</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-[#EE6055] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Direct Instructor WhatsApp Support:</strong> Clear doubts directly with senior IELTS mentors</span>
                  </li>
                </ul>
              </div>

              <div>
                <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#EE6055] hover:bg-[#d94f46] text-white font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-xl shadow-[#EE6055]/30 hover:scale-[1.01] text-sm"
                >
                  Join 150-Day Hybrid Mentorship <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-center text-[11px] text-blue-200 mt-2.5">
                  Visit Putalisadak Office or register online • Seats filled on rolling basis
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: CD-IELTS SPOTLIGHT (Why Computer Simulator Matters) ── */}
        <section className="bg-gradient-to-br from-[#05162E] to-[#1E3A6E] py-16 md:py-20 text-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#FFB0A8] bg-[#EE6055]/20 border border-[#EE6055]/30 px-3.5 py-1 rounded-full mb-3">
                <Monitor className="h-3.5 w-3.5 text-[#EE6055]" /> REAL EXAM SIMULATION
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
                Why Preparing on Real CD-IELTS Software is Crucial
              </h2>
              <p className="mt-3 text-blue-200 max-w-2xl mx-auto text-sm sm:text-base">
                Practicing only on paper books leaves Nepali students unprepared for the fast pace, computer screen fatigue, and continuous audio of the actual test center.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <Headphones className="h-6 w-6 text-[#EE6055]" />,
                  title: 'Locked Continuous Audio',
                  desc: 'Just like the actual exam, audio plays once without pause, rewind, or speed manipulation. Trains your ears for real exam pressure.'
                },
                {
                  icon: <Laptop className="h-6 w-6 text-sky-300" />,
                  title: 'Split-Screen Reading UI',
                  desc: 'Read passages on the left while answering questions on the right. Highlight text and take notes on screen without switching tabs.'
                },
                {
                  icon: <FileText className="h-6 w-6 text-emerald-300" />,
                  title: 'Built-in Word Counter & Timer',
                  desc: 'Real 60-minute combined timer for Task 1 & Task 2 with live word counting so you never fall short of the required 150/250 word limit.'
                },
                {
                  icon: <GraduationCap className="h-6 w-6 text-amber-300" />,
                  title: 'Both Academic & General',
                  desc: 'Full question pools for university applicants (Academic) and work/PR applicants (General Training) with targeted modules.'
                },
                {
                  icon: <Users className="h-6 w-6 text-[#FF9E96]" />,
                  title: 'Physical In-Person Speaking',
                  desc: 'Practice face-to-face speaking mock tests with British Council/IDP certified trainers at our Putalisadak campus.'
                },
                {
                  icon: <ShieldCheck className="h-6 w-6 text-indigo-300" />,
                  title: 'IDP / British Council Aligned',
                  desc: 'Question formats, scoring rubrics, and difficulty levels strictly calibrate with current 2026 official test standards.'
                }
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-white/10 border border-white/15 rounded-2xl p-6 backdrop-blur-md hover:bg-white/[0.15] transition-all"
                >
                  <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">{item.title}</h3>
                  <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: FEATURE COMPARISON MATRIX TABLE ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20" aria-label="Feature Comparison Table">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#05162E] tracking-tight">
              Compare Plan Features Side-by-Side
            </h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              Everything you get with each subscription package clearly broken down.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[#05162E]">
                  <th className="py-4 px-4 sm:px-6 font-extrabold text-sm sm:text-base">Features &amp; Services</th>
                  <th className="py-4 px-4 sm:px-6 font-extrabold text-center text-[#1E3A6E] text-sm sm:text-base">
                    90 Days Online Pro<br />
                    <span className="text-xs font-semibold text-slate-500">NPR 6,500</span>
                  </th>
                  <th className="py-4 px-4 sm:px-6 font-extrabold text-center text-[#EE6055] text-sm sm:text-base bg-[#EE6055]/5">
                    150 Days Hybrid Mentorship<br />
                    <span className="text-xs font-semibold text-[#EE6055]">NPR 11,500</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {[
                  { feature: 'Access Duration', f1: '90 Days (3 Months)', f2: '150 Days (5 Months)' },
                  { feature: 'CD-IELTS Computer Mock Tests', f1: 'Unlimited Access', f2: 'Unlimited Access' },
                  { feature: 'Listening Audio Interface', f1: 'Locked Real Audio', f2: 'Locked Real Audio' },
                  { feature: 'Reading Split-Screen Practice', f1: 'Included', f2: 'Included' },
                  { feature: 'Writing Simulator (Word Count & Timer)', f1: 'Included', f2: 'Included' },
                  { feature: 'Academic & General Training Tracks', f1: 'Both Included', f2: 'Both Included' },
                  { feature: 'Updated Band 8+ Video Courses', f1: 'All 4 Skills', f2: 'All 4 Skills' },
                  { feature: 'Section-wise Practice Banks', f1: '1,000+ Questions', f2: '1,000+ Questions' },
                  { feature: 'Automated AI Band Estimation', f1: 'Instant', f2: 'Instant' },
                  { feature: 'Physical Meetings with Mentors', f1: '—', f2: 'Putalisadak Office' },
                  { feature: 'In-Person 1-on-1 Speaking Mocks', f1: '—', f2: 'Certified Human Examiner' },
                  { feature: 'Physical Paper Writing Correction', f1: '—', f2: 'Certified Human Examiner' },
                  { feature: 'Putalisadak Lab & Library Access', f1: '—', f2: 'Included' },
                  { feature: 'Direct WhatsApp Teacher Support', f1: 'Standard', f2: 'Priority 1-on-1' }
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#05162E]">{row.feature}</td>
                    <td className="py-3.5 px-4 sm:px-6 text-center font-medium text-slate-600">{row.f1}</td>
                    <td className="py-3.5 px-4 sm:px-6 text-center font-bold text-[#05162E] bg-[#EE6055]/5">{row.f2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── SECTION 5: PAYMENT METHODS & PUTALISADAK ACADEMY ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#EE6055] bg-[#EE6055]/10 px-3 py-1 rounded-full border border-[#EE6055]/20">
                  Multiple Payment Modes
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#05162E] tracking-tight mt-3 mb-2">
                  Fast &amp; Convenient Payment Across Nepal
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
                  We accept all popular payment gateways in Nepal. Pay online in seconds or walk into our Putalisadak Academy.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'eSewa', sub: 'Instant Digital Wallet' },
                    { name: 'Khalti', sub: 'Instant Wallet' },
                    { name: 'Fonepay QR', sub: 'Any Mobile Banking' },
                    { name: 'Bank Transfer', sub: 'All Nepali Banks' },
                    { name: 'Putalisadak Cash', sub: 'At Front Desk' },
                    { name: 'Debit / Credit Card', sub: 'At Office POS' }
                  ].map((m) => (
                    <div key={m.name} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-left">
                      <p className="font-extrabold text-xs text-[#05162E]">{m.name}</p>
                      <p className="text-[10px] text-slate-500">{m.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Putalisadak Location Card */}
              <div className="rounded-2xl bg-gradient-to-br from-[#0B2558] to-[#1E3A6E] p-6 text-white border border-white/10 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-5 w-5 text-[#EE6055]" />
                  <h4 className="font-bold text-base">Visit Our Putalisadak Office</h4>
                </div>
                <p className="text-xs text-blue-100 leading-relaxed mb-4">
                  Opposite to Star Mall / near Kumari Bank, Putalisadak, Kathmandu, Nepal. Our counselors and IELTS trainers are ready to guide you.
                </p>
                <div className="space-y-2 text-xs border-t border-white/10 pt-4">
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-sky-300" />
                    <span>01-4647115 | +977-9800000000</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-300" />
                    <span>Sunday – Friday: 7:00 AM – 6:00 PM</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-300" />
                    <span>Silent Computer Lab &amp; Physical Speaking Rooms</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: FAQ ACCORDION (Matches FeaturesPage Component) ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-20" aria-label="Frequently Asked Questions">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#05162E] tracking-tight">
              Frequently Asked Questions About Pricing &amp; Classes
            </h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              Everything you need to know about our fees, durations, modules, and exam simulation.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </section>

        {/* ── SECTION 7: BOTTOM CTA BANNER (Identical to Features Page) ── */}
        <section className="bg-gradient-to-r from-[#EE6055] via-[#f06e64] to-[#d94f46] py-14 md:py-16 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3">
              Not Sure Which Plan to Pick? Try a Free Demo Exam First!
            </h2>
            <p className="text-white/90 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Experience the real computer-based interface, timer, questions, and audio without entering any payment information.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/demo-exam"
                className="inline-flex items-center gap-2 bg-white text-[#EE6055] font-extrabold px-7 py-3.5 rounded-xl shadow-xl hover:bg-slate-50 transition-all text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" /> Start Free Demo Mock Test
              </Link>
              <Link
                to="/features"
                className="inline-flex items-center gap-2 bg-white/20 border border-white/30 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-white/30 transition-all text-sm backdrop-blur-md"
              >
                Explore All Platform Features
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTION 8: FOOTER (Matches Features Page Footer) ── */}
        <footer className="bg-[#05162E] py-12 text-slate-400 text-sm border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
              <div className="md:col-span-2 space-y-3">
                <JawaafLogo isWhite={true} className="h-10 w-auto" />
                <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mt-2">
                  Jawaaf Consulting Academy is Nepal&apos;s leading IELTS preparation academy and testing lab. We help Nepali students achieve Band 7.5+ and fulfill their study abroad and visa dreams.
                </p>
                <p className="text-xs text-slate-400">
                  📍 Putalisadak, Kathmandu, Nepal | 📞 01-4647115
                </p>
              </div>

              <div>
                <h5 className="font-extrabold text-white text-xs uppercase tracking-wider mb-3">Platform Links</h5>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                  <li><Link to="/features" className="hover:text-white transition-colors">Platform Features</Link></li>
                  <li><Link to="/pricing" className="text-[#EE6055] font-bold">Pricing &amp; Packages</Link></li>
                  <li><Link to="/tests" className="hover:text-white transition-colors">Mock Tests</Link></li>
                  <li><Link to="/courses" className="hover:text-white transition-colors">Video Classes</Link></li>
                </ul>
              </div>

              <div>
                <h5 className="font-extrabold text-white text-xs uppercase tracking-wider mb-3">Student Portal</h5>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li><Link to="/demo-exam" className="hover:text-white transition-colors">Take Free Demo Mock</Link></li>
                  <li><Link to="/register" className="hover:text-white transition-colors">Create Free Account</Link></li>
                  <li><Link to="/login" className="hover:text-white transition-colors">Student Login</Link></li>
                  <li><a href="tel:014647115" className="hover:text-white transition-colors">Call Support: 01-4647115</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
              <p>&copy; {new Date().getFullYear()} Jawaaf Consulting Academy. All rights reserved.</p>
              <div className="flex gap-4">
                <span>Kathmandu, Nepal</span>
                <span>•</span>
                <span>CD-IELTS Preparation</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
