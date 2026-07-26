import React from 'react';
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
  User
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

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

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col bg-[#294b77] p-6 text-white shadow-[4px_0_24px_rgba(0,0,0,0.08)] lg:flex">
      <div className="h-10" />

      <nav className="grid flex-1 content-start gap-2 text-[16px] font-bold">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = item.match(location.pathname, location.search);
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                active ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-[#EE6055] hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" /> {item.label}
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <Link to="/admin" className="mt-4 flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3 font-bold text-white transition-colors hover:bg-[#EE6055]">
            <Award className="h-5 w-5" /> Admin Console
          </Link>
        )}
      </nav>

      <button onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-left font-bold text-white/75 transition-colors hover:bg-[#EE6055] hover:text-white">
        <LogOut className="h-5 w-5" /> Logout
      </button>
    </aside>
  );
}
