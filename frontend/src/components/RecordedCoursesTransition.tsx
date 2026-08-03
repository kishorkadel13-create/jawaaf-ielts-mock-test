import React, { ReactNode, useEffect, useState } from 'react';
import JawaafLogo from './JawaafLogo';
import { assets } from '../config/assets';

interface RecordedCoursesTransitionProps {
  children: ReactNode;
}

const SPLASH_DURATION_MS = 2400;
const FADE_DURATION_MS = 520;

export default function RecordedCoursesTransition({ children }: RecordedCoursesTransitionProps) {
  const [showContent, setShowContent] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const contentTimer = window.setTimeout(() => {
      setShowContent(true);
    }, SPLASH_DURATION_MS);

    const splashTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, SPLASH_DURATION_MS + FADE_DURATION_MS);

    return () => {
      window.clearTimeout(contentTimer);
      window.clearTimeout(splashTimer);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FFF8ED]">
      <div
        className={showContent ? 'animate-recorded-course-page-reveal' : 'pointer-events-none opacity-0'}
        aria-hidden={!showContent}
      >
        {children}
      </div>

      {showSplash && (
        <div
          className={`fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-[#FFF8ED] bg-cover bg-center transition-opacity duration-500 ${
            showContent ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ backgroundImage: `url('${assets.recordedCourses.background}')` }}
          aria-live="polite"
          aria-label="Opening Jawaaf recorded classes"
        >
          <div className="absolute inset-0 bg-[#3B2315]/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,248,237,0.74)_0%,rgba(250,228,196,0.44)_42%,rgba(124,76,42,0.18)_100%)]" />

          <div className="relative z-10 grid w-[min(92vw,1180px)] items-center gap-2 px-3 py-8 md:grid-cols-[0.9fr_1.1fr] md:gap-10 lg:px-8">
            <div className="flex items-end justify-center md:justify-end">
              <img
                src={assets.transition.jawaafIeltsCutout}
                alt=""
                className="animate-recorded-course-mascot-reveal h-[min(48vh,440px)] max-h-[440px] w-auto select-none object-contain drop-shadow-[0_26px_34px_rgba(72,45,26,0.24)] md:h-[min(64vh,560px)] md:max-h-[560px]"
                draggable={false}
              />
            </div>

            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <div className="animate-recorded-course-logo-pulse">
                <JawaafLogo className="w-[min(72vw,360px)] drop-shadow-[0_14px_26px_rgba(55,31,18,0.16)] md:w-[min(34vw,390px)]" />
              </div>

              <p className="mt-5 max-w-[560px] text-center text-[clamp(24px,3.2vw,38px)] font-black leading-[1.16] text-[#2F1F15] md:text-left">
                Welcome to Jawaaf Exclusive IELTS Recorded Classes
              </p>

              <div className="mt-8 h-1.5 w-[min(62vw,330px)] overflow-hidden rounded-full bg-[#D7BD99]/75 shadow-inner">
                <div className="h-full rounded-full bg-gradient-to-r from-[#EE6055] via-[#DFA166] to-[#2C4B78] animate-recorded-course-progress" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
