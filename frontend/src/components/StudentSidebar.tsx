import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CheckSquare,
  Crown,
  History,
  LogOut,
  Monitor,
  PenLine,
  Play,
  Settings,
  User,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import JawaafLogo from './JawaafLogo';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: Monitor, match: (path: string) => path === '/dashboard' },
  { label: 'Recorded Courses', to: '/courses', icon: Play, match: (path: string) => path === '/courses' },
  { label: 'Practice Tests', to: '/tests?mode=practice', icon: BookOpen, match: (path: string, search: string) => path === '/tests' && search !== '?mode=mock' },
  { label: 'Mock Tests', to: '/tests?mode=mock', icon: PenLine, match: (path: string, search: string) => path === '/tests' && search === '?mode=mock' },
  { label: 'Results', to: '/history', icon: CheckSquare, match: (path: string) => path === '/history' },
  { label: 'History', to: '/history', icon: History, match: (path: string) => path === '/history' },
  { label: 'Profile', to: '/dashboard', icon: User, match: () => false },
  { label: 'Settings', to: '/dashboard', icon: Settings, match: () => false }
];

interface StudentSidebarProps {
  variant?: 'default' | 'cinema';
  isOpen?: boolean;
  onClose?: () => void;
}

export default function StudentSidebar({ variant = 'default', isOpen = false, onClose }: StudentSidebarProps) {
  const location = useLocation();
  const { profile, logout } = useAuthStore();
  const isCinema = variant === 'cinema';
  const hasPremiumAccess = Boolean(profile?.has_full_access || profile?.role === 'admin' || profile?.role === 'teacher');
  const panelBackground = isCinema
    ? 'linear-gradient(180deg, #FFF8ED 0%, #FFF4E5 100%)'
    : 'linear-gradient(to right, #16243a 0%, #16243a 100%)';

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const sidebarContent = (
    <>
      <div className="mb-6 flex items-center justify-between gap-3 px-2">
        <JawaafLogo isWhite={!isCinema} className="mt-2 mb-2 w-[150px] sm:w-[180px]" />
        <button
          type="button"
          onClick={onClose}
          className={`grid h-11 w-11 place-items-center rounded-xl transition-colors lg:hidden ${
            isCinema ? 'text-[#3A2417] hover:bg-[#F7D8AC]/45' : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="grid flex-none content-start gap-1 text-[15px] font-bold">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = item.match(location.pathname, location.search);
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={onClose}
              className={`mx-2 flex min-h-11 items-center gap-3 rounded-[14px] px-4 py-3 transition-all ${
                active
                  ? isCinema
                    ? 'bg-[#F7D8AC] text-[#3A2417] shadow-sm'
                    : 'bg-gradient-to-r from-[#EE6055] to-[#EE6055]/80 text-white shadow-md'
                  : isCinema
                  ? 'text-[#3A2417] hover:bg-[#F7D8AC]/45'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" /> <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <Link to="/admin" onClick={onClose} className={`mt-4 flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 font-bold transition-colors ${
            isCinema ? 'bg-[#F7D8AC]/60 text-[#3A2417] hover:bg-[#F7D8AC]/80' : 'bg-white/10 text-white hover:bg-white/20'
          }`}>
            <Award className="h-5 w-5 shrink-0" /> <span className="min-w-0 truncate">Admin Console</span>
          </Link>
        )}
      </nav>

      <div className="mt-8 flex flex-1 flex-col items-center justify-end px-2">
        <Link to={hasPremiumAccess ? '/courses' : '/access-request'} onClick={onClose} className={`w-full overflow-hidden rounded-[24px] p-5 relative group transition-colors ${
          isCinema
            ? 'bg-gradient-to-br from-[#FFF7EA] to-[#F9E5C6] border border-[#E8D7BE] shadow-sm'
            : hasPremiumAccess
              ? 'bg-gradient-to-b from-emerald-500/15 to-white/5 border border-emerald-400/25 hover:border-emerald-300/40 shadow-[0_18px_55px_rgba(16,185,129,0.12)]'
              : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/10 hover:border-white/20'
        }`}>
          <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl transition-colors ${
            isCinema ? 'bg-[#DFA96D]/25' : 'bg-[#EE6055]/20 group-hover:bg-[#EE6055]/30'
          }`}></div>
          
          <div className="relative z-10 flex w-full flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                hasPremiumAccess
                  ? 'bg-emerald-500 text-white shadow-[0_0_22px_rgba(34,197,94,0.35)]'
                  : isCinema
                    ? 'bg-[#F7D8AC] text-[#A23A24]'
                    : 'bg-[#EE6055]/20 text-[#EE6055]'
              }`}>
                {hasPremiumAccess ? <CheckSquare className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <h4 className={`truncate text-[14px] font-black ${isCinema ? 'text-[#3A2417]' : 'text-white'}`}>Premium Access Active</h4>
                <p className={`text-[10px] font-semibold ${isCinema ? 'text-[#6D5A4C]' : hasPremiumAccess ? 'text-emerald-100/90' : 'text-white/60'}`}>
                  {hasPremiumAccess ? 'Premium account verified' : 'Click to request access'}
                </p>
              </div>
            </div>
            
            <div className="mb-4 flex flex-col gap-2">
              {['Recorded Courses', 'Mock Tests', 'Practice Tests'].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    hasPremiumAccess ? 'bg-[#22C55E] border-[#22C55E]' : isCinema ? 'border-[#E0CDB2] bg-[#FFF4E5]' : 'border-white/20 bg-white/5'
                  }`}>
                    {hasPremiumAccess && <CheckSquare className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className={`text-[11px] font-medium ${isCinema ? 'text-[#6D5A4C]' : hasPremiumAccess ? 'text-white' : 'text-white/60'}`}>{item}</span>
                </div>
              ))}
            </div>
            
            <div className={`mb-1 h-2.5 w-full overflow-hidden rounded-full ${isCinema ? 'bg-[#E4D0B5]' : 'bg-white/10'}`}>
              <div
                className={`h-2.5 rounded-full transition-all duration-1000 ${
                  hasPremiumAccess ? 'bg-gradient-to-r from-emerald-500 to-lime-300' : 'bg-gradient-to-r from-[#D76343] to-[#E9A164]'
                }`}
                style={{ width: hasPremiumAccess ? '100%' : '34%' }}
              ></div>
            </div>
            {hasPremiumAccess && (
              <p className={`mt-2 text-[10px] font-bold uppercase tracking-[0.12em] ${isCinema ? 'text-emerald-700' : 'text-emerald-200'}`}>
                Access unlocked
              </p>
            )}
          </div>
        </Link>
      </div>

      <div className={`mt-8 pt-6 ${isCinema ? 'border-t border-[#D9C5A8]' : 'border-t border-white/10'}`}>
        <button 
          onClick={() => {
            onClose?.();
            logout();
          }}
          className={`flex min-h-11 w-full items-center gap-4 rounded-xl p-3 text-left transition-colors ${isCinema ? 'hover:bg-[#F7D8AC]/45' : 'hover:bg-white/5'}`}
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isCinema ? 'bg-[#F7D8AC] text-[#3A2417]' : 'bg-white/10 text-white'}`}>
            <LogOut className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`truncate text-[14px] font-bold ${isCinema ? 'text-[#3A2417]' : 'text-white'}`}>Logout</p>
            <p className={`text-[12px] font-semibold ${isCinema ? 'text-[#6D5A4C]' : 'text-white/50'}`}>End your session</p>
          </div>
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside 
        className={`hidden h-screen w-[280px] shrink-0 flex-col overflow-y-auto p-6 shadow-xl custom-scrollbar lg:sticky lg:top-0 lg:flex ${
          isCinema ? 'border-r border-[#E8DCCB] text-[#352216]' : 'text-white'
        }`}
        style={{ background: panelBackground }}
      >
        {sidebarContent}
      </aside>

      <div className={`fixed inset-0 z-40 bg-[#05162E]/55 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,280px)] flex-col overflow-y-auto p-5 shadow-2xl transition-transform duration-300 custom-scrollbar lg:hidden ${
          isCinema ? 'border-r border-[#E8DCCB] text-[#352216]' : 'text-white'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: panelBackground }}
        aria-hidden={!isOpen}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
