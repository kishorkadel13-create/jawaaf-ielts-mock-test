import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Plane, Trophy } from 'lucide-react';
import { normalizeImageUrl } from '../../utils/imageUrl';

export interface VisaGrantNotice {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  student_name?: string | null;
  program_name?: string | null;
  visa_type?: string | null;
  granted_label?: string | null;
  country_name?: string | null;
  country_flag?: string | null;
  institute_name?: string | null;
  student_quote?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
}

interface VisaGrantedNoticesProps {
  notices: VisaGrantNotice[];
}

export default function VisaGrantedNotices({ notices }: VisaGrantedNoticesProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  if (!notices.length) return null;

  const displayNotices = notices;
  const scrollingNotices = displayNotices.length < 6
    ? [...displayNotices, ...displayNotices]
    : displayNotices;

  useEffect(() => {
    if (isPaused || scrollingNotices.length < 2) return;

    let frameId = 0;
    let lastTimestamp = 0;
    const pixelsPerSecond = 26;

    const animate = (timestamp: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) {
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      if (maxScrollLeft <= 0) {
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }

      const deltaSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      const nextScrollLeft = scroller.scrollLeft + pixelsPerSecond * deltaSeconds;

      scroller.scrollLeft = nextScrollLeft >= maxScrollLeft - 1 ? 0 : nextScrollLeft;
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [isPaused, scrollingNotices.length]);

  const scrollByCard = (direction: 'left' | 'right') => {
    scrollerRef.current?.scrollBy({
      left: direction === 'left' ? -372 : 372,
      behavior: 'smooth',
    });
  };

  return (
    <section className="relative overflow-hidden rounded-[20px] border border-[#8DB5FF]/70 bg-[#F7FBFF] p-3 shadow-[0_8px_22px_rgba(31,85,214,0.12)] sm:p-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#EAF3FF]/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#EAF3FF]/70 to-transparent" />

      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white text-[#1F55D6] shadow-sm">
            <Plane className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-black leading-tight text-[#05162E]">Visa Granted Notices</h3>
            <p className="hidden text-[11px] font-bold leading-4 text-slate-500 sm:block">Students achievements that make us proud.</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCard('left')}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#1F55D6]/20 bg-white text-[#1E3A6E] shadow-sm transition-colors hover:bg-[#1E3A6E] hover:text-white"
            aria-label="Scroll visa notices left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard('right')}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#1E3A6E] shadow-sm transition-colors hover:bg-[#1E3A6E] hover:text-white"
            aria-label="Scroll visa notices right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)]">
        <div className="rounded-[16px] border border-slate-100 bg-white p-4 shadow-sm">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#F59E24]/15 text-[#D97706]">
            <Trophy className="h-4 w-4" />
          </div>
          <p className="mt-4 text-[15px] font-black leading-[1.18] text-[#05162E]">Students Achievements Make Us Proud!</p>
          <p className="mt-3 text-[11px] font-semibold leading-[1.55] text-slate-500">
            Celebrating our students' success in studying abroad. You could be next!
          </p>
          <a
            href="/courses"
            className="mt-4 inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-[#1F55D6]/20 bg-white px-3 py-1.5 text-[11px] font-black text-[#1F55D6] transition-colors hover:bg-[#1F55D6] hover:text-white"
          >
            View Success Stories <ArrowRight className="h-3 w-3" />
          </a>
        </div>

        <div
          ref={scrollerRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
          className="flex gap-3 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {scrollingNotices.map((notice, index) => {
            const studentName = notice.student_name || notice.title;
            const countryLabel = notice.country_name || 'Visa granted';
            const visaTypeLabel = notice.visa_type || 'Student Visa';
            const universityLabel = notice.institute_name || '';
            const programLabel = notice.program_name || 'Study Abroad';
            const studentQuote = notice.student_quote || notice.description || '';
            const timeLabel = notice.granted_label || 'Recently';
            const imageUrl = normalizeImageUrl(notice.image_url);

            return (
              <article
                key={`${notice.id}-${index}`}
                className="min-h-[236px] w-[320px] shrink-0 rounded-[16px] border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-[360px]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[16px] leading-none">{notice.country_flag || ''}</span>
                  <span className="truncate text-[11px] font-black text-[#1E3A6E]">{countryLabel}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-[#EFF4FB]">
                    {imageUrl ? (
                      <img src={imageUrl} alt={studentName} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid h-full place-items-center bg-[#314F85] text-[17px] font-black text-white">
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-[13px] font-black leading-4 text-[#05162E]">{studentName}</p>
                    <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">{visaTypeLabel}</p>
                    {universityLabel && <p className="mt-1 break-words text-[10px] font-black leading-4 text-[#1E3A6E]">{universityLabel}</p>}
                    <p className="mt-0.5 break-words text-[10px] font-black leading-4 text-[#334155]">{programLabel}</p>
                  </div>
                </div>

                {studentQuote && (
                  <p className="mt-3 line-clamp-2 text-[10px] font-semibold italic leading-4 text-slate-500">"{studentQuote}"</p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-black text-slate-400">{timeLabel}</span>
                  {notice.cta_url && (
                    <a
                      href={notice.cta_url}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EFF4FB] text-[#1F55D6] hover:bg-[#1F55D6] hover:text-white"
                      aria-label={`Open ${studentName} visa notice`}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
