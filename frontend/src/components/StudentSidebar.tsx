import React from 'react';
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
  HeadphonesIcon
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

export default function StudentSidebar({ variant = 'default' }: { variant?: 'default' | 'cinema' }) {
  const location = useLocation();
  const { profile, logout } = useAuthStore();
  const isCinema = variant === 'cinema';
  const hasPremiumAccess = Boolean(profile?.has_full_access || profile?.role === 'admin' || profile?.role === 'teacher');

  return (
    <aside 
      className={`hidden w-[280px] shrink-0 flex-col p-6 shadow-xl lg:flex h-screen sticky top-0 overflow-y-auto custom-scrollbar ${
        isCinema ? 'border-r border-[#E8DCCB] text-[#352216]' : 'text-white'
      }`}
      style={{
        background: isCinema
          ? 'linear-gradient(180deg, #FFF8ED 0%, #FFF4E5 100%)'
          : 'linear-gradient(to right, #16243a 0%, #16243a 100%)'
      }}
    >
      {/* Logo Area */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <JawaafLogo isWhite={!isCinema} className="w-[180px] mt-2 mb-2" />
      </div>

      <nav className="grid flex-none content-start gap-1 text-[15px] font-bold">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = item.match(location.pathname, location.search);
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 rounded-[14px] px-4 py-3 mx-2 transition-all ${
                active
                  ? isCinema
                    ? 'bg-[#F7D8AC] text-[#3A2417] shadow-sm'
                    : 'bg-gradient-to-r from-[#EE6055] to-[#EE6055]/80 text-white shadow-md'
                  : isCinema
                  ? 'text-[#3A2417] hover:bg-[#F7D8AC]/45'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" /> {item.label}
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <Link to="/admin" className={`mt-4 flex items-center gap-3 rounded-xl px-4 py-3 font-bold transition-colors ${
            isCinema ? 'bg-[#F7D8AC]/60 text-[#3A2417] hover:bg-[#F7D8AC]/80' : 'bg-white/10 text-white hover:bg-white/20'
          }`}>
            <Award className="h-5 w-5" /> Admin Console
          </Link>
        )}
      </nav>

      <div className="mt-8 flex flex-1 flex-col items-center justify-end px-2">
        <Link to="/access-request" className={`rounded-[24px] p-5 w-full relative overflow-hidden group transition-colors ${
          isCinema
            ? 'bg-gradient-to-br from-[#FFF7EA] to-[#F9E5C6] border border-[#E8D7BE] shadow-sm'
            : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/10 hover:border-white/20'
        }`}>
          {/* Decorative glow */}
          <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl transition-colors ${
            isCinema ? 'bg-[#DFA96D]/25' : 'bg-[#EE6055]/20 group-hover:bg-[#EE6055]/30'
          }`}></div>
          
          <div className="relative z-10 flex flex-col w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${
                hasPremiumAccess
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : isCinema
                    ? 'bg-[#F7D8AC] text-[#A23A24]'
                    : 'bg-[#EE6055]/20 text-[#EE6055]'
              }`}>
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`text-[14px] font-black ${isCinema ? 'text-[#3A2417]' : 'text-white'}`}>Premium Access Active</h4>
                <p className={`text-[10px] font-medium ${isCinema ? 'text-[#6D5A4C]' : 'text-white/60'}`}>
                  {hasPremiumAccess ? 'All premium learning unlocked' : 'Click to request access'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mb-4">
              {['Recorded Courses', 'Mock Tests', 'Practice Tests'].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${
                    hasPremiumAccess ? 'bg-[#22C55E] border-[#22C55E]' : isCinema ? 'border-[#E0CDB2] bg-[#FFF4E5]' : 'border-white/20 bg-white/5'
                  }`}>
                    {hasPremiumAccess && <CheckSquare className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className={`text-[11px] font-medium ${isCinema ? 'text-[#6D5A4C]' : hasPremiumAccess ? 'text-white' : 'text-white/60'}`}>{item}</span>
                </div>
              ))}
            </div>
            
            <div className={`w-full rounded-full h-2.5 mb-1 overflow-hidden ${isCinema ? 'bg-[#E4D0B5]' : 'bg-white/10'}`}>
              <div className="bg-gradient-to-r from-[#D76343] to-[#E9A164] h-2.5 rounded-full transition-all duration-1000" style={{ width: hasPremiumAccess ? '100%' : '34%' }}></div>
            </div>
          </div>
        </Link>
      </div>

      {/* Logout Section */}
      <div className={`mt-8 pt-6 ${isCinema ? 'border-t border-[#D9C5A8]' : 'border-t border-white/10'}`}>
        <button 
          onClick={logout}
          className={`flex w-full items-center gap-4 rounded-xl p-3 text-left transition-colors ${isCinema ? 'hover:bg-[#F7D8AC]/45' : 'hover:bg-white/5'}`}
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isCinema ? 'bg-[#F7D8AC] text-[#3A2417]' : 'bg-white/10 text-white'}`}>
            <LogOut className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-[14px] font-bold ${isCinema ? 'text-[#3A2417]' : 'text-white'}`}>Logout</p>
            <p className={`text-[12px] font-semibold ${isCinema ? 'text-[#6D5A4C]' : 'text-white/50'}`}>End your session</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
