import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import JawaafLogo from '../components/JawaafLogo';
import {
  Check,
  CheckCircle2,
  X,
  Sparkles,
  Clock,
  Calendar,
  ShieldCheck,
  Award,
  ArrowRight,
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
  MessageSquare
} from 'lucide-react';

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

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
      q: 'Can I take a free demo test before purchasing a package?',
      a: 'Yes! You can click "Free Demo Mock Test" on our website and immediately take a real full-length computer-based IELTS practice test without even registering. You only create an account when you want to view your final band score and breakdown.'
    }
  ];

  const comparisonFeatures = [
    { name: 'Subscription Validity', plan90: '90 Days (3 Months)', plan150: '150 Days (5 Months)' },
    { name: 'Modules Covered', plan90: 'Academic + General Training', plan150: 'Academic + General Training' },
    { name: 'Computer-Based (CD-IELTS) Simulator', plan90: true, plan150: true },
    { name: 'Updated 2026 Video Recorded Classes', plan90: true, plan150: true },
    { name: 'Full-Length Timed Mock Tests', plan90: 'Unlimited (30+ Full Tests)', plan150: 'Unlimited (30+ Full Tests)' },
    { name: 'Section-Wise Practice Sets (L, R, W, S)', plan90: '1,000+ Questions', plan150: '1,000+ Questions' },
    { name: 'Listening with Continuous Audio Player', plan90: true, plan150: true },
    { name: 'Writing Task 1 & 2 Timed Exam Editor', plan90: true, plan150: true },
    { name: 'Automated AI Band Scoring & Analytics', plan90: true, plan150: true },
    { name: 'Physical Instructor Face-to-Face Meetings', plan90: false, plan150: 'Unlimited In-Person Access' },
    { name: '1-on-1 In-Person Speaking Mock Interviews', plan90: 'Online / Self-Record', plan150: 'Live Examiner at Putalisadak' },
    { name: 'Certified Human Teacher Writing Check', plan90: 'Digital AI + Rubrics', plan150: 'Line-by-Line Physical Correction' },
    { name: 'Physical Computer Lab & Silent Library', plan90: false, plan150: 'Included at Putalisadak' },
    { name: 'Personalized Band 7.5+ Study Plan', plan90: 'Standard Self-Paced', plan150: 'Dedicated Mentor Session' },
    { name: 'Study Abroad & Visa Counseling Guidance', plan90: 'Basic Support', plan150: 'Priority Free Visa Consulting' },
  ];

  return (
    <>
      <Helmet>
        <title>IELTS Course Fees & Pricing in Nepal — Jawaaf IELTS Lab | Putalisadak Kathmandu</title>
        <meta
          name="description"
          content="Affordable IELTS preparation packages in Nepal. Choose 90-Day Online Access (NPR 6,500) or 150-Day Hybrid & Physical Mentorship (NPR 11,500) at Putalisadak, Kathmandu. Full CD-IELTS computer-based mock tests, updated video courses, Academic and General Training."
        />
        <meta
          name="keywords"
          content="IELTS mock test price in Nepal, IELTS preparation course fee Nepal, Online IELTS classes cost Kathmandu, Jawaaf Consulting Academy Putalisadak, IELTS 90 days subscription Nepal, IELTS 150 days hybrid package, Computer based IELTS practice test price, IELTS academic and general training fee Nepal, Best IELTS coaching fees Kathmandu"
        />
        <link rel="canonical" href="https://jawaaf.com/pricing" />
        <meta property="og:title" content="IELTS Course Fees & Pricing in Nepal — Jawaaf IELTS Lab" />
        <meta
          property="og:description"
          content="Compare 90-Day Online (NPR 6,500) and 150-Day Hybrid Mentorship (NPR 11,500) packages. Real CD-IELTS test interface, updated video courses, and certified teacher feedback in Putalisadak Kathmandu."
        />
        <meta property="og:url" content="https://jawaaf.com/pricing" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#F4F7FB] text-[#05162E] selection:bg-[#EE6055]/20 selection:text-[#EE6055]">
        {/* ── HEADER ── */}
        <header className="sticky top-0 z-50 bg-[#0B2558]/95 backdrop-blur-md border-b border-white/10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group transition-transform hover:scale-[1.02]">
              <JawaafLogo isWhite={true} className="h-9 sm:h-11 w-auto drop-shadow-md" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-blue-100">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/features" className="hover:text-white transition-colors">Features</Link>
              <Link to="/pricing" className="text-white font-bold border-b-2 border-[#EE6055] pb-0.5">Pricing</Link>
              <Link to="/tests" className="hover:text-white transition-colors">Mock Tests</Link>
              <Link to="/courses" className="hover:text-white transition-colors">Video Classes</Link>
            </nav>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              <Link
                to="/demo-exam"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#EE6055] via-[#f06e64] to-[#d94f46] hover:brightness-110 px-4 py-2 rounded-xl shadow-lg shadow-[#EE6055]/30 transition-all border border-white/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Free Demo Test</span>
              </Link>
              <Link
                to="/login"
                className="text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 rounded-xl transition-all"
              >
                Log In
              </Link>
            </div>
          </div>
        </header>

        {/* ── HERO SECTION ── */}
        <section className="relative bg-gradient-to-br from-[#0B2558] via-[#133A7C] to-[#0A1E45] py-14 sm:py-18 md:py-22 overflow-hidden text-white">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-[#EE6055]/20 blur-[130px] pointer-events-none" />
          <div className="absolute bottom-10 right-0 w-96 h-96 rounded-full bg-sky-400/15 blur-[140px] pointer-events-none" />

          {/* Dot Matrix Texture */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 bg-[#EE6055] text-white rounded-full px-4 py-1.5 mb-5 shadow-lg shadow-[#EE6055]/30 border border-white/20 text-xs sm:text-sm font-bold tracking-wide uppercase">
              <Sparkles className="h-4 w-4" />
              <span>Affordable &amp; Transparent IELTS Subscription</span>
            </div>

            {/* H1 Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12]">
              Invest in Your Future with Nepal's{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8278] via-[#FFA89F] to-[#FFE2DE]">
                Most Trusted IELTS Plans
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-blue-100 text-sm sm:text-base md:text-lg max-w-3xl mx-auto leading-relaxed font-normal">
              Choose the package that suits your learning style. Get <strong>100% online self-paced access</strong> anywhere in Nepal, or choose our <strong>hybrid in-person mentorship</strong> with senior examiners at <strong>Putalisadak, Kathmandu</strong>.
            </p>

            {/* 4 Feature Badges */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-2.5 sm:gap-4 text-xs sm:text-sm font-semibold text-blue-50">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
                <Monitor className="h-4 w-4 text-[#FF8278]" />
                <span>Real CD-IELTS Exam Interface</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
                <GraduationCap className="h-4 w-4 text-[#FF8278]" />
                <span>Academic &amp; General Training</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
                <Laptop className="h-4 w-4 text-[#FF8278]" />
                <span>Updated Band 8+ Video Classes</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
                <Users className="h-4 w-4 text-[#FF8278]" />
                <span>Certified Teacher Feedback</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING CARDS SECTION ── */}
        <section className="relative -mt-10 sm:-mt-14 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 z-20 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

            {/* ══ PLAN 1: 90 DAYS ONLINE ACCESS ══ */}
            <div className="flex flex-col bg-white rounded-3xl p-7 sm:p-9 border-2 border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-300 relative group">
              {/* Top Tag */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#1E3A6E]/10 text-[#1E3A6E] border border-[#1E3A6E]/20">
                  <Clock className="h-3.5 w-3.5" /> 90 Days Online Plan
                </span>
                <span className="text-xs font-bold text-slate-400">Self-Paced Study</span>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#05162E]">
                90-Day Online Pro
              </h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed min-h-[40px]">
                Complete self-paced preparation for students across Nepal and abroad who need flexible online practice anytime.
              </p>

              {/* Price Container */}
              <div className="mt-6 p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Total Course Fee</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-extrabold text-slate-500">NPR</span>
                    <span className="text-4xl sm:text-5xl font-black text-[#1E3A6E]">6,500</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-black">
                    Only Rs. 72 / day
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-1">No hidden charges</span>
                </div>
              </div>

              {/* What's Included */}
              <div className="mt-7 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3.5">
                  Package Includes:
                </p>
                <ul className="space-y-3 text-sm text-slate-700">
                  {[
                    '90 Days (3 Months) 24/7 unlimited portal access',
                    'Both Academic & General Training modules covered',
                    'Full Computer-Based (CD-IELTS) Exam Simulator',
                    'All Updated 2026 Band 8+ recorded video classes',
                    'Listening practice with continuous non-stop audio track',
                    'Reading passages with live highlighter & text tools',
                    'Writing Task 1 & Task 2 timed interface with word counter',
                    '30+ Full-length timed mock tests with instant AI scoring',
                    '1,000+ Section-wise practice questions with explanations',
                    'Mobile, tablet, and laptop responsive access',
                    'Online progress dashboard & band score prediction'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2.5 text-slate-400">
                    <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    </div>
                    <span className="line-through leading-snug">Physical instructor meeting &amp; in-person mock interview</span>
                  </li>
                </ul>
              </div>

              {/* CTA Action */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <Link
                  to="/register?plan=online-90"
                  className="w-full flex items-center justify-center gap-2 bg-[#1E3A6E] hover:bg-[#162d57] text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-[#1E3A6E]/25 transition-all text-sm uppercase tracking-wide hover:scale-[1.01] active:scale-[0.99]"
                >
                  Enroll in 90-Day Online Plan <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-center text-[11px] text-slate-400 font-semibold mt-2.5">
                  Instant activation via eSewa / Khalti / Fonepay
                </p>
              </div>
            </div>

            {/* ══ PLAN 2: 150 DAYS HYBRID + IN-PERSON MENTORSHIP ══ */}
            <div className="flex flex-col bg-gradient-to-b from-[#0F2D6B] via-[#0B2558] to-[#071B42] text-white rounded-3xl p-7 sm:p-9 border-2 border-[#EE6055] shadow-2xl shadow-[#EE6055]/20 relative group">
              {/* Floating Recommended Banner */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#EE6055] via-[#f06e64] to-[#d94f46] text-white px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-[#EE6055]/40 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-white" />
                <span>Recommended for Band 7.5+ Target</span>
              </div>

              {/* Top Tag */}
              <div className="flex items-center justify-between mb-4 mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#EE6055]/25 text-[#FF9E95] border border-[#EE6055]/30">
                  <Calendar className="h-3.5 w-3.5" /> 150 Days Extended Plan
                </span>
                <span className="text-xs font-bold text-amber-300">Hybrid + Physical</span>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                150-Day Hybrid &amp; Mentorship
              </h2>
              <p className="mt-2 text-sm text-blue-100 leading-relaxed min-h-[40px]">
                Full online portal access <strong className="text-white underline decoration-[#EE6055] underline-offset-2">PLUS in-person instructor feedback</strong>, live speaking interviews, and physical writing corrections in Putalisadak.
              </p>

              {/* Price Container */}
              <div className="mt-6 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-200 uppercase tracking-widest block">Total Course Fee</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-extrabold text-blue-200">NPR</span>
                    <span className="text-4xl sm:text-5xl font-black text-white">11,500</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-[#EE6055] text-white rounded-lg text-xs font-black shadow-sm">
                    Only Rs. 76 / day
                  </span>
                  <span className="block text-[11px] text-blue-200 mt-1">5 Full Months Access</span>
                </div>
              </div>

              {/* What's Included */}
              <div className="mt-7 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-amber-300 mb-3.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Everything in 90-Day Online Plan, PLUS:
                </p>
                <ul className="space-y-3 text-sm text-blue-50">
                  {[
                    '150 Days (5 Months) Extended 24/7 online portal access',
                    'Physical Face-to-Face meetings with Instructors at Putalisadak',
                    '1-on-1 In-Person Speaking Mock Interviews with examiner feedback',
                    'Detailed Human Instructor Writing Task 1 & 2 paper correction',
                    'Line-by-line grammar, lexical, and coherence feedback',
                    'Physical Computer Lab & Silent Library access in Putalisadak',
                    'Both Academic & General Training modules covered in-depth',
                    'Real CD-IELTS computer testing software practice',
                    'All Updated 2026 recorded masterclasses with Band 8+ strategies',
                    'Unlimited Full-Length Mock Tests with deep progress audit',
                    'Personalized Band 7.5+ Weakness Diagnosis & Study Roadmap',
                    'Free Study Abroad & Visa Processing Consultation Assistance'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="h-5 w-5 rounded-full bg-[#EE6055] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-[#EE6055]/30">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Action */}
              <div className="mt-8 pt-6 border-t border-white/15">
                <Link
                  to="/register?plan=hybrid-150"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#EE6055] via-[#f06e64] to-[#d94f46] hover:brightness-110 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-[#EE6055]/40 transition-all text-sm uppercase tracking-wide hover:scale-[1.01] active:scale-[0.99] border border-white/20"
                >
                  Join 150-Day Hybrid Mentorship <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-center text-[11px] text-blue-200 font-semibold mt-2.5">
                  Visit Putalisadak or Pay Online via eSewa / Khalti / Bank
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── COMPUTER-BASED IELTS (CD-IELTS) SPOTLIGHT ── */}
        <section className="bg-white py-14 md:py-20 border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-5">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#EE6055] bg-[#EE6055]/10 px-3 py-1 rounded-full border border-[#EE6055]/20">
                  <Monitor className="h-3.5 w-3.5" /> Perfect for Computer-Based Exam
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#05162E] leading-tight">
                  Why Paper Practice Fails on Real CD-IELTS Test Day
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  More than 70% of students taking the computer-based IELTS lose marks not because of English, but because they are unfamiliar with typing under a countdown clock, managing split-screen passage reading, and using on-screen highlighting.
                </p>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  At <strong>Jawaaf IELTS Lab</strong>, every mock test and practice session reproduces the <strong>exact same user experience</strong> as the official British Council and IDP test centers in Nepal.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                    <p className="font-extrabold text-sm text-[#05162E]">Split Screen Reading</p>
                    <p className="text-xs text-slate-500 mt-1">Scroll passage and answer questions side-by-side with live highlighter.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                    <p className="font-extrabold text-sm text-[#05162E]">Locked Audio Playback</p>
                    <p className="text-xs text-slate-500 mt-1">One continuous listening track without pause or rewind, just like real exam.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                    <p className="font-extrabold text-sm text-[#05162E]">Real Time Word Counter</p>
                    <p className="text-xs text-slate-500 mt-1">Live word count for Writing Task 1 (150 words) and Task 2 (250 words).</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                    <p className="font-extrabold text-sm text-[#05162E]">Map Labelling Dropdowns</p>
                    <p className="text-xs text-slate-500 mt-1">Real floor plan and diagram labelling with seamless dropdown choices.</p>
                  </div>
                </div>
              </div>

              {/* Right Teaser Graphic */}
              <div className="lg:col-span-6 bg-gradient-to-br from-[#0B2558] to-[#1E3A6E] rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-white/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#EE6055]/20 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                    <span className="w-3 h-3 rounded-full bg-green-400"></span>
                    <span className="text-xs font-bold text-blue-200 ml-2">Jawaaf CD-IELTS Interface</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded">59:45 Left</span>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="p-4 bg-white/10 rounded-2xl border border-white/15">
                    <p className="text-xs font-black uppercase text-[#FF8278]">Academic &amp; General Training</p>
                    <p className="mt-1 text-blue-100 font-medium">Full compatibility for students pursuing university admissions abroad as well as professionals applying for Australian PR and Canadian express entry.</p>
                  </div>

                  <div className="p-4 bg-white/10 rounded-2xl border border-white/15">
                    <p className="text-xs font-black uppercase text-[#FF8278]">Both Plans Include Complete Simulator</p>
                    <p className="mt-1 text-blue-100 font-medium">Both the 90-Day Online Plan and 150-Day Hybrid Plan give you full, unrestricted access to the computer simulator.</p>
                  </div>

                  <div className="pt-2">
                    <Link
                      to="/demo-exam"
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-white bg-[#EE6055] hover:bg-[#d94f46] px-5 py-3 rounded-xl shadow-md transition-all uppercase tracking-wide"
                    >
                      <Sparkles className="h-4 w-4" /> Try Free Demo Test Right Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE COMPARISON TABLE ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20" aria-label="Package Comparison">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#EE6055] bg-[#EE6055]/10 px-3 py-1 rounded-full border border-[#EE6055]/20">
              Detailed Side-by-Side Comparison
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#05162E] mt-3">
              Compare 90-Day Online vs 150-Day Hybrid
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2">
              Everything is transparent with zero hidden fees. Pick the package that aligns with your goal.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8FAFC]">
                    <th className="py-5 px-6 font-extrabold text-sm sm:text-base text-[#05162E] w-1/2">
                      Features &amp; Deliverables
                    </th>
                    <th className="py-5 px-6 font-extrabold text-sm sm:text-base text-[#1E3A6E] text-center w-1/4 bg-[#1E3A6E]/5">
                      90-Day Online Plan<br />
                      <span className="text-xs font-bold text-slate-500">NPR 6,500</span>
                    </th>
                    <th className="py-5 px-6 font-extrabold text-sm sm:text-base text-[#EE6055] text-center w-1/4 bg-[#EE6055]/5">
                      150-Day Hybrid Plan<br />
                      <span className="text-xs font-bold text-[#EE6055]">NPR 11,500 ⭐</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {comparisonFeatures.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-800">
                        {row.name}
                      </td>
                      <td className="py-4 px-6 text-center bg-[#1E3A6E]/[0.02]">
                        {typeof row.plan90 === 'boolean' ? (
                          row.plan90 ? (
                            <Check className="h-5 w-5 text-emerald-600 mx-auto stroke-[3]" />
                          ) : (
                            <X className="h-5 w-5 text-slate-300 mx-auto" />
                          )
                        ) : (
                          <span className="font-semibold text-slate-700">{row.plan90}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center bg-[#EE6055]/[0.03]">
                        {typeof row.plan150 === 'boolean' ? (
                          row.plan150 ? (
                            <Check className="h-5 w-5 text-[#EE6055] mx-auto stroke-[3]" />
                          ) : (
                            <X className="h-5 w-5 text-slate-300 mx-auto" />
                          )
                        ) : (
                          <span className="font-extrabold text-[#05162E]">{row.plan150}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Table CTAs */}
            <div className="p-6 bg-[#F8FAFC] border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                <p className="text-xs text-slate-500 leading-snug">
                  <strong>Risk-Free Guarantee:</strong> You can upgrade from the 90-Day Plan to the 150-Day Hybrid Plan anytime during your study period!
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  to="/register?plan=online-90"
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-xs font-bold rounded-xl transition-all text-center"
                >
                  Choose 90-Day
                </Link>
                <Link
                  to="/register?plan=hybrid-150"
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#EE6055] hover:bg-[#d94f46] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#EE6055]/30 text-center"
                >
                  Choose 150-Day Hybrid
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── PAYMENT & ACTIVATION SECTION ── */}
        <section className="bg-gradient-to-br from-[#05162E] to-[#1E3A6E] py-16 md:py-20 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#FF8278] bg-white/10 px-3 py-1 rounded-full border border-white/20">
                Fast &amp; Simple Enrollment
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mt-3">
                Easy Payment Methods Across Nepal
              </h2>
              <p className="text-blue-100 text-sm sm:text-base mt-2">
                We accept all major Nepali digital wallets, QR transfers, bank deposits, and cash in Putalisadak.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Payment Card 1: Digital Wallets */}
              <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#EE6055] text-white flex items-center justify-center font-black">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-lg text-white">eSewa &amp; Khalti</h3>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  Instant digital transfer via eSewa ID or Khalti. Send your screenshot to our WhatsApp for immediate 5-minute portal activation.
                </p>
              </div>

              {/* Payment Card 2: Fonepay QR & Bank */}
              <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black">
                  <Monitor className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-lg text-white">Fonepay QR &amp; Bank Transfer</h3>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  Scan our official Fonepay merchant QR from any Nepali mobile banking app, or deposit directly into our official account.
                </p>
              </div>

              {/* Payment Card 3: Putalisadak Office */}
              <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-lg text-white">Cash / In-Person at Putalisadak</h3>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  Visit our office at Putalisadak, Kathmandu. Meet the instructors, inspect the computer lab, and enroll directly with cash or POS.
                </p>
              </div>
            </div>

            {/* Putalisadak Location Box */}
            <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[#EE6055] text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#EE6055]/30">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-white">Jawaaf Consulting Academy — Kathmandu Hub</h4>
                  <p className="text-sm text-blue-100 mt-1 leading-relaxed">
                    Putalisadak, Kathmandu, Nepal (Opposite to Star Mall / near Kumari Bank). Open Sunday–Friday, 7:00 AM – 6:00 PM.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="tel:014647115"
                  className="inline-flex items-center gap-2 bg-white text-[#0B2558] font-extrabold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm shadow-md"
                >
                  <Phone className="h-4 w-4 text-[#EE6055]" /> 01-4647115
                </a>
                <a
                  href="https://wa.me/9779800000000?text=Hi%2C%20I%20want%20to%20enroll%20in%20Jawaaf%20IELTS%20Lab"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white font-extrabold px-5 py-3 rounded-xl hover:bg-[#20ba59] transition-colors text-sm shadow-md"
                >
                  <MessageSquare className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ SECTION ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20" aria-label="Frequently Asked Questions">
          <div className="text-center mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#EE6055] bg-[#EE6055]/10 px-3 py-1 rounded-full border border-[#EE6055]/20">
              Got Questions?
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#05162E] mt-3">
              Frequently Asked Questions About IELTS Fees &amp; Classes
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2">
              Everything you need to know about our subscriptions, payments, and in-person mentorship in Kathmandu.
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 font-extrabold text-sm sm:text-base text-[#05162E] hover:text-[#1E3A6E] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── BOTTOM CTA BANNER ── */}
        <section className="bg-gradient-to-r from-[#EE6055] via-[#f06e64] to-[#d94f46] py-14 md:py-16 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3">
              Not Sure Which Plan to Pick? Try a Free Demo Exam First!
            </h2>
            <p className="text-white/90 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Experience the real computer-based interface, timer, questions, and audio without entering any credit card.
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

        {/* ── FOOTER ── */}
        <footer className="bg-[#05162E] py-12 text-slate-400 text-sm border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
              <div className="md:col-span-2 space-y-3">
                <JawaafLogo isWhite={true} className="h-10 w-auto" />
                <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mt-2">
                  Jawaaf Consulting Academy is Nepal's leading IELTS preparation academy and testing lab. We help Nepali students achieve Band 7.5+ and fulfill their study abroad and visa dreams.
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
