import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import DashboardView from './components/DashboardView.jsx';
import ProjectsList from './components/ProjectsList.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';

function MainAppLayout() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'projects' | 'project-<id>'

  // Full-screen spinner while validating token on page load
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-main)' }}>
        <div style={{ width: '50px', height: '50px', border: '4px solid var(--primary-glow)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }}></div>
        <h2 style={{ fontWeight: '600', fontSize: '1.1rem' }}>Verifying Secure Session...</h2>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated? Show Login/Signup split card
  if (!user) {
    return <AuthPage />;
  }

  // Render view depending on active navigation state
  const renderMainContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <DashboardView
          onSelectProject={(id) => setActiveTab(`project-${id}`)}
        />
      );
    }

    if (activeTab === 'projects') {
      return (
        <ProjectsList
          onSelectProject={(id) => setActiveTab(`project-${id}`)}
        />
      );
    }

    if (activeTab.startsWith('project-')) {
      const projectId = activeTab.split('project-')[1];
      return (
        <ProjectDetail
          projectId={projectId}
          onBack={() => setActiveTab('projects')}
        />
      );
    }

    return <div>View not found</div>;
  };

  return (
    <div className="app-layout">
      {/* Background glow effects */}
      <div className="glow-bg">
        <div className="glow-ball-1"></div>
        <div className="glow-ball-2"></div>
      </div>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        {renderMainContent()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppLayout />
    </AuthProvider>
  );
}
