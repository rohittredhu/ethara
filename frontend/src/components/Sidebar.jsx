import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Initials for avatar
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span>Ethara Task</span>
      </div>

      <nav className="sidebar-nav">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`nav-link btn-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
          </svg>
          Dashboard
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`nav-link btn-link ${activeTab === 'projects' || activeTab.startsWith('project-') ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22V4c0-.5.2-1 .6-1.4C5 2.2 5.5 2 6 2h8l6 6v14" />
            <path d="M14 2v6h6" />
            <path d="M8 18h8" />
            <path d="M8 14h8" />
          </svg>
          Projects
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
        <button onClick={logout} className="btn btn-danger btn-full" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
