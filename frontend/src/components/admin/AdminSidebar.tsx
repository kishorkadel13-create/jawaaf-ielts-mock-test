import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Grid2X2, 
  BookOpen, 
  Target, 
  UsersRound, 
  ShieldCheck, 
  BarChart3, 
  LogOut,
  GraduationCap,
  X
} from 'lucide-react';
import JawaafLogo from '../JawaafLogo';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type AdminTab = 'dashboard' | 'mock-tests' | 'practice-tests' | 'courses' | 'goals' | 'students' | 'approvals' | 'reports';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onAddTeacherClick?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ activeTab, onAddTeacherClick, isOpen = false, onClose }: AdminSidebarProps) {
  const [pendingRequests, setPendingRequests] = useState(0);
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const { data } = await api.get('/access/requests');
        if (Array.isArray(data)) {
          const pending = data.filter((r: any) => r.status === 'pending').length;
          setPendingRequests(pending);
        }
      } catch (err) {
        console.warn('Sidebar failed to load access requests count:', err);
      }
    };
    fetchPendingCount();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    onClose?.();
    navigate('/login');
  };

  const handleTeachersClick = (e: React.MouseEvent) => {
    if (location.pathname === '/admin' && onAddTeacherClick) {
      e.preventDefault();
      onClose?.();
      onAddTeacherClick();
    } else {
      onClose?.();
      navigate('/admin?addTeacher=true');
    }
  };

  const getLinkClass = (tabName: AdminTab) => {
    const baseClass = "flex min-h-11 items-center gap-4 rounded-xl px-5 py-3 text-[15px] sm:py-3.5 sm:text-[16px] transition-all";
    if (activeTab === tabName) {
      return `${baseClass} bg-[#294b77] font-bold text-white shadow-lg shadow-[#294b77]/20`;
    }
    return `${baseClass} font-semibold text-slate-200 hover:bg-[#243047] hover:text-white`;
  };

  const sidebarContent = useMemo(() => (
    <>
      <div className="flex items-center justify-between px-6 pb-6 pt-7 sm:px-9 sm:pb-10 sm:pt-10">
        <Link to="/" onClick={onClose} className="inline-flex min-w-0">
          <JawaafLogo isWhite className="h-[46px] w-auto sm:h-[58px]" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-xl text-slate-300 hover:bg-[#243047] hover:text-white lg:hidden"
          aria-label="Close admin navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4 sm:px-5">
        <Link to="/admin" onClick={onClose} className={getLinkClass('dashboard')}>
          <Grid2X2 className="h-5 w-5 shrink-0" /> <span className="min-w-0 truncate">Dashboard</span>
        </Link>

        <p className="px-4 pt-7 pb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">Test Management</p>
        <Link to="/admin/tests?mode=mock" onClick={onClose} className={getLinkClass('mock-tests')}>
          <BookOpen className="h-5 w-5 shrink-0" /> <span className="min-w-0 truncate">Mock Tests</span>
        </Link>
        <Link to="/admin/tests?mode=practice" onClick={onClose} className={getLinkClass('practice-tests')}>
          <Target className="h-5 w-5 shrink-0" /> <span className="min-w-0 truncate">Practice Tests</span>
        </Link>
        <Link to="/admin/courses" onClick={onClose} className={getLinkClass('courses')}>
          <GraduationCap className="h-5 w-5 shrink-0" /> <span className="min-w-0 truncate">Recorded Courses</span>
        </Link>
        <Link to="/admin/today-goals" onClick={onClose} className={getLinkClass('goals')}>
          <Target className="h-5 w-5 shrink-0" /> <span className="min-w-0 truncate">Today's Goals</span>
        </Link>

        <p className="px-4 pt-7 pb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">User Management</p>
        <Link to="/admin/students" onClick={onClose} className={getLinkClass('students')}>
          <UsersRound className="h-5 w-5 shrink-0" /> <span className="min-w-0 truncate">Approved Students</span>
        </Link>
        <Link
          to="/admin"
          onClick={handleTeachersClick}
          className="flex min-h-11 items-center gap-4 rounded-xl px-5 py-3 text-[15px] font-semibold text-slate-200 transition-all hover:bg-[#243047] hover:text-white sm:py-3.5 sm:text-[16px]"
        >
          <UsersRound className="h-5 w-5 shrink-0" /> <span className="min-w-0 truncate">Teachers</span>
        </Link>
        <Link to="/admin/access" onClick={onClose} className={`${getLinkClass('approvals')} justify-between`}>
          <span className="flex min-w-0 items-center gap-4"><ShieldCheck className="h-5 w-5 shrink-0" /> <span className="truncate">Student Approval</span></span>
          {pendingRequests > 0 && (
            <span className="rounded-full bg-[#ef5f55] px-2 py-0.5 text-[10px] font-bold text-white">
              {pendingRequests}
            </span>
          )}
        </Link>

        <p className="px-4 pt-7 pb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">Other</p>
        <Link to="/admin/submissions" onClick={onClose} className={getLinkClass('reports')}>
          <BarChart3 className="h-5 w-5 shrink-0" /> <span className="min-w-0 truncate">Reports</span>
        </Link>
      </nav>

      <div className="p-4 sm:p-5">
        <button onClick={handleLogout} className="w-full rounded-xl border-t border-slate-600/40 px-2 pb-2 pt-5 text-left transition-colors hover:bg-[#243047]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF1FB] text-[16px] font-black text-[#172338]">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-black text-white">Admin</p>
              <p className="text-[12px] font-medium text-slate-400">Super Admin</p>
            </div>
            <LogOut className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
        </button>
      </div>
    </>
  ), [activeTab, isOpen, location.pathname, location.search, onAddTeacherClick, onClose, pendingRequests]);

  return (
    <>
      <aside
        className="hidden h-screen w-[300px] shrink-0 flex-col text-white lg:sticky lg:top-0 lg:flex xl:w-[318px]"
        style={{ background: '#172338' }}
      >
        {sidebarContent}
      </aside>

      <div className={`fixed inset-0 z-40 bg-[#05162E]/55 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,318px)] flex-col text-white shadow-2xl transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#172338' }}
        aria-hidden={!isOpen}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
