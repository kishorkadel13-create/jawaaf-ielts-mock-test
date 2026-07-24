import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Public pages
import LandingPage from '../pages/LandingPage';
import FeaturesPage from '../pages/FeaturesPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';

// Student pages
import DashboardPage from '../pages/DashboardPage';
import MockTestsPage from '../pages/MockTestsPage';
import HistoryPage from '../pages/HistoryPage';
import AccessRequestPage from '../pages/AccessRequestPage';
import ExamInterface from '../pages/ExamInterface';
import ResultPage from '../pages/ResultPage';

// Admin pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminTestsPage from '../pages/admin/AdminTestsPage';
import AdminTestDetailsPage from '../pages/admin/AdminTestDetailsPage';
import AdminAccessPage from '../pages/admin/AdminAccessPage';
import AdminSubmissionsPage from '../pages/admin/AdminSubmissionsPage';
import TeacherStudentsPage from '../pages/admin/TeacherStudentsPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Guest Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Student Portal Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute roles={['student']}>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tests" 
        element={
          <ProtectedRoute roles={['student']}>
            <MockTestsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/history" 
        element={
          <ProtectedRoute roles={['student']}>
            <HistoryPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/access-request" 
        element={
          <ProtectedRoute roles={['student']}>
            <AccessRequestPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/attempts/:id/exam" 
        element={
          <ProtectedRoute roles={['student']}>
            <ExamInterface />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/attempts/:id/result" 
        element={
          <ProtectedRoute roles={['student', 'admin', 'teacher']}>
            <ResultPage />
          </ProtectedRoute>
        } 
      />

      {/* Protected Admin CMS Routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/tests" 
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminTestsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/tests/:id" 
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminTestDetailsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/submissions" 
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminSubmissionsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/access" 
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminAccessPage />
          </ProtectedRoute>
        } 
      />

      {/* Protected Teacher Portal Routes */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute roles={['teacher']}>
            <AdminSubmissionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/students"
        element={
          <ProtectedRoute roles={['teacher']}>
            <TeacherStudentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/students/:studentId"
        element={
          <ProtectedRoute roles={['teacher']}>
            <TeacherStudentsPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
