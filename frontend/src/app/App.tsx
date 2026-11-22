import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import AppRoutes, { prefetchAdminRoutes, prefetchStudentRoutes } from '../routes/AppRoutes';
import { useAuthStore } from '../store/authStore';
import { touchStoredStreakData } from '../utils/streak';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const { initializeAuth, isAuthenticated, profile } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const isRecoveryRedirect =
      window.location.pathname === '/' &&
      params.has('access_token') &&
      (!params.has('type') || params.get('type') === 'recovery');

    if (isRecoveryRedirect) {
      window.location.replace(`/reset-password${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!isAuthenticated || !profile?.role) return;

    const prefetch = () => {
      if (profile.role === 'admin') {
        prefetchAdminRoutes();
        return;
      }

      if (profile.role === 'student') {
        prefetchStudentRoutes();
      }
    };

    const idleRequest = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 800));
    const idleCancel = window.cancelIdleCallback || window.clearTimeout;
    const handle = idleRequest(prefetch, { timeout: 2000 });

    return () => idleCancel(handle);
  }, [isAuthenticated, profile?.role]);

  useEffect(() => {
    if (!isAuthenticated || profile?.role !== 'student' || !profile?.id) return;

    const touchStreak = () => {
      touchStoredStreakData(profile.id);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) touchStreak();
    };

    touchStreak();
    window.addEventListener('focus', touchStreak);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = window.setInterval(touchStreak, 60 * 1000);

    return () => {
      window.removeEventListener('focus', touchStreak);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, profile?.id, profile?.role]);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
            <AppRoutes />
          </div>
        </Router>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
