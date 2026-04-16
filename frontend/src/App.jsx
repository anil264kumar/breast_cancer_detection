import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import AnalysisPage from './pages/AnalysisPage';
import RecordsPage from './pages/RecordsPage';
import ReportPage from './pages/ReportPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
        <p className="text-secondary text-sm font-body">Loading...</p>
      </div>
    </div>
  );
  if (!isSignedIn) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/sign-in" element={<AuthPage mode="sign-in" />} />
      <Route path="/auth/sign-up" element={<AuthPage mode="sign-up" />} />

      {/* Protected app routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/analysis" element={
        <ProtectedRoute><AppLayout><AnalysisPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/records" element={
        <ProtectedRoute><AppLayout><RecordsPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/records/:id" element={
        <ProtectedRoute><AppLayout><ReportPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
