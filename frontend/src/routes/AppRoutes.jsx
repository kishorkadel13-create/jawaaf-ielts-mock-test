import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const loadLandingPage = () => import('../pages/LandingPage');
const loadFeaturesPage = () => import('../pages/FeaturesPage');
const loadLoginPage = () => import('../pages/LoginPage');
const loadRegisterPage = () => import('../pages/RegisterPage');

const loadDashboardPage = () => import('../pages/DashboardPage');
const loadMockTestsPage = () => import('../pages/MockTestsPage');
const loadCoursesPage = () => import('../pages/CoursesPage');
const loadHistoryPage = () => import('../pages/HistoryPage');
const loadAccessRequestPage = () => import('../pages/AccessRequestPage');
const loadExamInterface = () => import('../pages/ExamInterface');
const loadResultPage = () => import('../pages/ResultPage');
import RecordedCoursesTransition from '../components/RecordedCoursesTransition';

const loadAdminDashboardPage = () => import('../pages/admin/AdminDashboardPage');
const loadAdminTestsPage = () => import('../pages/admin/AdminTestsPage');
const loadAdminCoursesPage = () => import('../pages/admin/AdminCoursesPage');
const loadAdminTodayGoalsPage = () => import('../pages/admin/AdminTodayGoalsPage');
const loadAdminTestDetailsPage = () => import('../pages/admin/AdminTestDetailsPage');
const loadAdminAccessPage = () => import('../pages/admin/AdminAccessPage');
const loadAdminSubmissionsPage = () => import('../pages/admin/AdminSubmissionsPage');
const loadTeacherDashboardPage = () => import('../pages/admin/TeacherDashboardPage');

const LandingPage = lazy(loadLandingPage);
const FeaturesPage = lazy(loadFeaturesPage);
const LoginPage = lazy(loadLoginPage);
const RegisterPage = lazy(loadRegisterPage);
const DashboardPage = lazy(loadDashboardPage);
const MockTestsPage = lazy(loadMockTestsPage);
const CoursesPage = lazy(loadCoursesPage);
const HistoryPage = lazy(loadHistoryPage);
const AccessRequestPage = lazy(loadAccessRequestPage);
const ExamInterface = lazy(loadExamInterface);
const ResultPage = lazy(loadResultPage);
const AdminDashboardPage = lazy(loadAdminDashboardPage);
const AdminTestsPage = lazy(loadAdminTestsPage);
const AdminCoursesPage = lazy(loadAdminCoursesPage);
const AdminTodayGoalsPage = lazy(loadAdminTodayGoalsPage);
const AdminTestDetailsPage = lazy(loadAdminTestDetailsPage);
const AdminAccessPage = lazy(loadAdminAccessPage);
const AdminSubmissionsPage = lazy(loadAdminSubmissionsPage);
const TeacherDashboardPage = lazy(loadTeacherDashboardPage);

export const prefetchStudentRoutes = () => {
  loadDashboardPage();
  loadCoursesPage();
  loadMockTestsPage();
  loadHistoryPage();
};

export const prefetchAdminRoutes = () => {
  loadAdminDashboardPage();
  loadAdminTestsPage();
  loadAdminCoursesPage();
  loadAdminTodayGoalsPage();
  loadAdminSubmissionsPage();
};

export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
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
        path="/courses" 
        element={
          <ProtectedRoute roles={['student']}>
            <RecordedCoursesTransition>
              <CoursesPage />
            </RecordedCoursesTransition>
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
        path="/admin/courses" 
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminCoursesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/today-goals" 
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminTodayGoalsPage />
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
            <TeacherDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/reviews"
        element={
          <ProtectedRoute roles={['teacher']}>
            <TeacherDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/qa"
        element={
          <ProtectedRoute roles={['teacher']}>
            <TeacherDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/courses"
        element={
          <ProtectedRoute roles={['teacher']}>
            <Navigate to="/teacher" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/students"
        element={
          <ProtectedRoute roles={['teacher']}>
            <TeacherDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/students/:studentId"
        element={
          <ProtectedRoute roles={['teacher']}>
            <TeacherDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
