import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

const getRoleHome = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/dashboard';
};

export default function ProtectedRoute({ children, adminOnly = false, roles = null }) {
  const { isAuthenticated, profile, isLoading, initializeAuth } = useAuthStore();

  // Try checking user session on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-academic-gradient flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-brand-500/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-brand-500 rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-400 font-sans tracking-wide animate-pulse">
          Securing session access...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && profile?.role !== 'admin') {
    console.warn('Unauthorized role access blocked. Redirecting to student portal.');
    return <Navigate to={getRoleHome(profile?.role)} replace />;
  }

  if (roles && !roles.includes(profile?.role)) {
    console.warn('Unauthorized role access blocked. Redirecting to student portal.');
    return <Navigate to={getRoleHome(profile?.role)} replace />;
  }

  return children;
}
