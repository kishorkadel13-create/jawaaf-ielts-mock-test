import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, LayoutDashboard, PenLine, Play, User } from 'lucide-react';

const items = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, active: (path: string) => path === '/dashboard' },
  { label: 'Practice', to: '/tests?mode=practice', icon: BookOpen, active: (path: string, search: string) => path === '/tests' && search !== '?mode=mock' },
  { label: 'Mock', to: '/tests?mode=mock', icon: PenLine, active: (path: string, search: string) => path === '/tests' && search === '?mode=mock' },
  { label: 'Courses', to: '/courses', icon: Play, active: (path: string) => path === '/courses' },
  { label: 'Profile', to: '/dashboard', icon: User, active: () => false },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = item.active(location.pathname, location.search);

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-black transition-colors ${
                isActive ? 'bg-[#EFF4FB] text-[#1E3A6E]' : 'text-slate-500 hover:bg-slate-50 hover:text-[#1E3A6E]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
