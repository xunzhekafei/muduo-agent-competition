import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../layouts/Layout';
import LoginPage from '../pages/LoginPage';
import AgentPage from '../pages/AgentPage';
import ToolsPage from '../pages/ToolsPage';
import DashboardPage from '../pages/DashboardPage';
import ResourceToNotesPage from '../pages/ResourceToNotesPage';
import QuickNotesLandingPage from '../pages/QuickNotesLandingPage';
import QuickNotesHistoryPage from '../pages/QuickNotesHistoryPage';
import QuickNotesPage from '../pages/QuickNotesPage';
import SimpleNotesPage from '../pages/SimpleNotesPage';
import TimeTreeNotesPage from '../pages/TimeTreeNotesPage';
import ThinkingModePage from '../pages/ThinkingModePage';
import MemoryModePage from '../pages/MemoryModePage';
import FeynmanModePage from '../pages/FeynmanModePage';
import NoteManagementPage from '../pages/NoteManagementPage';
import CommunityPage from '../pages/CommunityPage';
import SettingsPage from '../pages/SettingsPage';
import { isLoggedIn } from '../api/client';

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  if (isLoggedIn()) {
    return <Navigate to="/agent" replace />;
  }
  return children;
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-4 border-[#10A37F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        
        <Route path="*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/agent" replace />} />
                <Route path="/agent" element={<AgentPage />} />
                <Route path="/tools" element={<ToolsPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/resource-to-notes" element={<ResourceToNotesPage />} />
                <Route path="/quick-notes" element={<QuickNotesLandingPage />} />
<Route path="/quick-notes/timeline" element={<QuickNotesPage />} />
<Route path="/quick-notes/timeline/:id" element={<QuickNotesPage />} />
<Route path="/quick-notes/simple" element={<SimpleNotesPage />} />
<Route path="/quick-notes/simple/:id" element={<SimpleNotesPage />} />
<Route path="/quick-notes/time-tree" element={<TimeTreeNotesPage />} />
<Route path="/quick-notes/time-tree/:id" element={<TimeTreeNotesPage />} />
	<Route path="/quick-notes/history" element={<QuickNotesHistoryPage />} />
                <Route path="/thinking-mode" element={<ThinkingModePage />} />
                <Route path="/memory-mode" element={<MemoryModePage />} />
                <Route path="/feynman-mode" element={<FeynmanModePage />} />
                <Route path="/note-management" element={<NoteManagementPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
