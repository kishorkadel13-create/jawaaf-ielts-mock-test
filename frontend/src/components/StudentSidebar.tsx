import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CheckSquare,
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

export default function StudentSidebar() {
  const location = useLocation();
  const { profile, logout } = useAuthStore();
  const [dailyGoalMet, setDailyGoalMet] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    const storageKey = `user_streak_data_${profile.id}`;
    
    // Check every second to catch when the dashboard sets it
    const checkGoal = () => {
      const savedData = localStorage.getItem(storageKey);
      const activeDates = savedData ? JSON.parse(savedData) : [];
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      if (activeDates.includes(todayStr)) {
        setDailyGoalMet(true);
      }
    };
    
    checkGoal();
    const interval = setInterval(checkGoal, 1000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  return (
    <aside 
      className="hidden w-[280px] shrink-0 flex-col p-6 text-white shadow-xl lg:flex h-screen sticky top-0 overflow-y-auto custom-scrollbar"
      style={{ background: 'linear-gradient(to right, #16243a 0%, #16243a 100%)' }}
    >
      {/* Logo Area */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <JawaafLogo isWhite={true} className="w-[180px] mt-2 mb-2" />
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
                  ? 'bg-gradient-to-r from-[#EE6055] to-[#EE6055]/80 text-white shadow-md' 
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" /> {item.label}
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <Link to="/admin" className="mt-4 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 font-bold text-white transition-colors hover:bg-white/20">
            <Award className="h-5 w-5" /> Admin Console
          </Link>
        )}
      </nav>

      {/* Daily Goal Widget (Replaced Mascot) */}
      <div className="mt-8 flex flex-col items-center flex-1 justify-end px-2">
        <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-[24px] p-5 w-full relative overflow-hidden group hover:border-white/20 transition-colors">
          {/* Decorative glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#EE6055]/20 rounded-full blur-3xl group-hover:bg-[#EE6055]/30 transition-colors"></div>
          
          <div className="relative z-10 flex flex-col w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-[#EE6055]/20 flex items-center justify-center text-[#EE6055]">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-[14px] font-black text-white">Daily Goals</h4>
                <p className="text-[10px] text-white/60 font-medium">{dailyGoalMet ? "1/3 Completed" : "0/3 Completed"}</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${dailyGoalMet ? 'bg-[#22C55E] border-[#22C55E]' : 'border-white/20 bg-white/5'}`}>
                  {dailyGoalMet && <CheckSquare className="h-2.5 w-2.5 text-white" />}
                </div>
                <span className={`text-[11px] font-medium ${dailyGoalMet ? 'text-white' : 'text-white/60'}`}>Maintain Streak</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full flex items-center justify-center border border-white/20 bg-white/5">
                </div>
                <span className="text-[11px] font-medium text-white/60">Practice Test</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full flex items-center justify-center border border-white/20 bg-white/5">
                </div>
                <span className="text-[11px] font-medium text-white/60">Complete 1 Video</span>
              </div>
            </div>
            
            <div className="w-full bg-white/10 rounded-full h-2.5 mb-1 overflow-hidden">
              <div className="bg-gradient-to-r from-[#EE6055] to-orange-400 h-2.5 rounded-full transition-all duration-1000" style={{ width: dailyGoalMet ? '33%' : '0%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Section */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <button 
          onClick={logout}
          className="flex w-full items-center gap-4 rounded-xl p-3 text-left transition-colors hover:bg-white/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
            <LogOut className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-white">Logout</p>
            <p className="text-[12px] font-semibold text-white/50">End your session</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
