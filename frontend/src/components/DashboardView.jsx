import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardView({ onSelectProject }) {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      const res = await apiFetch('/dashboard');
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
      } else {
        setError('Failed to fetch dashboard metrics');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-glow)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          Loading analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const { totalTasks, statusCounts, priorityCounts, overdueCount, upcomingTasks, projectsSummary } = data || {
    totalTasks: 0,
    statusCounts: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
    priorityCounts: { LOW: 0, MEDIUM: 0, HIGH: 0 },
    overdueCount: 0,
    upcomingTasks: [],
    projectsSummary: []
  };

  // Completion calculation
  const completedCount = statusCounts.DONE || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // SVG Progress Ring configurations
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <div>
      <div className="content-header">
        <div>
          <h1 className="page-title">Workspace Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Real-time project analytics and assignment tracking.
          </p>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Attention: You have <strong>{overdueCount}</strong> overdue task{overdueCount > 1 ? 's' : ''} currently active in your projects!</span>
        </div>
      )}

      {/* Primary operational stats widgets */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div>
            <div className="stat-label">Total Workspace Tasks</div>
            <div className="stat-value">{totalTasks}</div>
          </div>
          <div className="stat-icon-wrapper stat-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div>
            <div className="stat-label">Tasks In Progress</div>
            <div className="stat-value">{statusCounts.IN_PROGRESS || 0}</div>
          </div>
          <div className="stat-icon-wrapper stat-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div>
            <div className="stat-label">Completed Tasks</div>
            <div className="stat-value">{completedCount}</div>
          </div>
          <div className="stat-icon-wrapper stat-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div>
            <div className="stat-label">Overdue Tasks</div>
            <div className="stat-value" style={{ color: overdueCount > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{overdueCount}</div>
          </div>
          <div className="stat-icon-wrapper stat-rose">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main dashboard splits */}
      <div className="dashboard-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Projects progress card directory */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="dashboard-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)' }}>
                <path d="M2 20h20" />
                <path d="m5 17 5-5 5 5" />
                <path d="m14 10 3-3 3 3" />
              </svg>
              Project Progression Summary
            </h2>
            
            {projectsSummary.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem 0' }}>
                No active projects found. Head to the "Projects" tab to create your first team board!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                {projectsSummary.map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => onSelectProject(proj.id)}
                    style={{ cursor: 'pointer', padding: '0.8rem', borderRadius: 'var(--border-radius-sm)', transition: 'var(--transition-smooth)' }}
                    className="hover-card-bg"
                  >
                    <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{proj.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {proj.completedTasks}/{proj.totalTasks} Tasks ({proj.progress}%)
                      </span>
                    </div>
                    <div className="progress-bar-wrapper">
                      <div className="progress-bar-fill" style={{ width: `${proj.progress}%` }}></div>
                    </div>
                  </div>
                ))}
                <style>{`.hover-card-bg:hover { background: rgba(255, 255, 255, 0.03); }`}</style>
              </div>
            )}
          </div>

          {/* Upcoming task deadlines */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="dashboard-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--warning)' }}>
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Upcoming Deadlines (Next 5 Tasks)
            </h2>

            {upcomingTasks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem 0' }}>
                No upcoming deadlines found. Keep up the good work!
              </p>
            ) : (
              <div className="upcoming-tasks-list" style={{ marginTop: '1rem' }}>
                {upcomingTasks.map(task => {
                  const dateStr = new Date(task.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  });
                  return (
                    <div key={task.id} className="upcoming-task-item">
                      <div>
                        <div className="upcoming-task-title">{task.title}</div>
                        <div className="upcoming-task-project">{task.projectName} &bull; {task.assigneeName}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className={`task-priority-badge priority-${task.priority.toLowerCase()}`} style={{ margin: 0 }}>
                          {task.priority}
                        </span>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--warning)' }}>
                          Due {dateStr}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Circular graph and breakdown card */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', height: 'fit-content' }}>
          <h2 className="dashboard-section-title" style={{ width: '100%', alignSelf: 'flex-start' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
            Task Breakdown
          </h2>

          <div style={{ position: 'relative', margin: '2rem 0', width: '150px', height: '150px' }}>
            <svg className="svg-progress-ring" width="150" height="150">
              <circle
                stroke="rgba(255,255,255,0.04)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx="75"
                cy="75"
              />
              <circle
                className="svg-progress-ring-circle"
                stroke="var(--primary)"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                r={normalizedRadius}
                cx="75"
                cy="75"
              />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '150px', height: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{completionRate}%</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Done</span>
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>To Do</span>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{statusCounts.TODO || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>In Progress</span>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{statusCounts.IN_PROGRESS || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>In Review</span>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{statusCounts.REVIEW || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Completed</span>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{completedCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
