import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';

export default function ProjectDetail({ projectId, onBack }) {
  const { apiFetch, user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('kanban'); // 'kanban' | 'team'

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assignedToId: ''
  });

  const [memberForm, setMemberForm] = useState({
    email: '',
    role: 'MEMBER'
  });

  const [editTaskForm, setEditTaskForm] = useState({
    id: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assignedToId: '',
    status: 'TODO'
  });

  const fetchProjectDetails = async () => {
    try {
      const res = await apiFetch(`/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to load project details');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred loading project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const clearMessages = () => {
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 4000);
  };

  // Task Creation
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    try {
      const res = await apiFetch(`/tasks/project/${projectId}`, {
        method: 'POST',
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
          assignedToId: taskForm.assignedToId || null
        })
      });

      if (res.ok) {
        const newTask = await res.json();
        setProject(prev => ({
          ...prev,
          tasks: [...prev.tasks, newTask]
        }));
        setIsTaskModalOpen(false);
        setTaskForm({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedToId: '' });
        setSuccess('Task created successfully!');
        clearMessages();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to create task');
        clearMessages();
      }
    } catch (err) {
      console.error(err);
      setError('Error creating task');
      clearMessages();
    }
  };

  // Task Update (Status & Details)
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/tasks/${editTaskForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTaskForm.title,
          description: editTaskForm.description,
          status: editTaskForm.status,
          priority: editTaskForm.priority,
          dueDate: editTaskForm.dueDate ? new Date(editTaskForm.dueDate).toISOString() : null,
          assignedToId: editTaskForm.assignedToId || null
        })
      });

      if (res.ok) {
        const updatedTask = await res.json();
        setProject(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
        }));
        setIsEditModalOpen(false);
        setSuccess('Task updated successfully!');
        clearMessages();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to update task');
        clearMessages();
      }
    } catch (err) {
      console.error(err);
      setError('Error updating task');
      clearMessages();
    }
  };

  // Quick Status Transition (Admins & Members)
  const handleQuickStatusChange = async (taskId, newStatus) => {
    try {
      const res = await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        const updatedTask = await res.json();
        setProject(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === taskId ? updatedTask : t)
        }));
        setSuccess('Status updated!');
        clearMessages();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to transition status');
        clearMessages();
      }
    } catch (err) {
      console.error(err);
      setError('Error updating status');
      clearMessages();
    }
  };

  // Task Deletion (Admins only)
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await apiFetch(`/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setProject(prev => ({
          ...prev,
          tasks: prev.tasks.filter(t => t.id !== taskId)
        }));
        setIsEditModalOpen(false);
        setSuccess('Task deleted successfully.');
        clearMessages();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to delete task');
        clearMessages();
      }
    } catch (err) {
      console.error(err);
      setError('Error deleting task');
      clearMessages();
    }
  };

  // Member invitation (Admins only)
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!memberForm.email.trim()) return;

    try {
      const res = await apiFetch(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: memberForm.email,
          role: memberForm.role
        })
      });

      if (res.ok) {
        const newMember = await res.json();
        setProject(prev => ({
          ...prev,
          members: [...prev.members, newMember]
        }));
        setIsMemberModalOpen(false);
        setMemberForm({ email: '', role: 'MEMBER' });
        setSuccess('Team member added successfully!');
        clearMessages();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to add team member');
        clearMessages();
      }
    } catch (err) {
      console.error(err);
      setError('Error adding member');
      clearMessages();
    }
  };

  // Remove Member (Admins only)
  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Remove this member from the project?')) return;

    try {
      const res = await apiFetch(`/projects/${projectId}/members/${targetUserId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setProject(prev => ({
          ...prev,
          members: prev.members.filter(m => m.id !== targetUserId),
          // Set assignee to null for tasks assigned to the removed member
          tasks: prev.tasks.map(t => t.assignee?.id === targetUserId ? { ...t, assignee: null } : t)
        }));
        setSuccess('Member removed successfully.');
        clearMessages();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to remove member');
        clearMessages();
      }
    } catch (err) {
      console.error(err);
      setError('Error removing member');
      clearMessages();
    }
  };

  // Open Edit Task Modal
  const openEditModal = (task) => {
    setEditTaskForm({
      id: task.id,
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedToId: task.assignee?.id || '',
      status: task.status
    });
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-glow)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          Loading project...
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div>
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-secondary" onClick={onBack}>Back to Projects</button>
      </div>
    );
  }

  const isAdmin = project.currentUserRole === 'ADMIN';

  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState(''); // '' means all
  const [assigneeFilter, setAssigneeFilter] = useState(''); // '' means all

  // Compute filtered tasks
  const filteredTasks = project.tasks.filter(task => {
    const matchesSearch = searchQuery
      ? task.title.toLowerCase().includes(searchQuery.toLowerCase()) || (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;
    const matchesAssignee = assigneeFilter ? (task.assignee?.id === assigneeFilter) : true;
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  // Group tasks by status columns using filtered tasks
  const columns = {
    TODO: { title: 'To Do', badgeClass: 'stat-blue', tasks: [] },
    IN_PROGRESS: { title: 'In Progress', badgeClass: 'stat-amber', tasks: [] },
    REVIEW: { title: 'In Review', badgeClass: 'stat-blue', tasks: [] },
    DONE: { title: 'Completed', badgeClass: 'stat-green', tasks: [] }
  };

  filteredTasks.forEach(task => {
    if (columns[task.status]) {
      columns[task.status].tasks.push(task);
    }
  });

  return (
    <div>
      {/* Messages */}
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="content-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            &larr; Back
          </button>
          <h1 className="page-title">{project.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            {project.description || 'No description provided.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isAdmin && (
            <>
              <button className="btn btn-secondary" onClick={() => setIsMemberModalOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                Invite
              </button>
              <button className="btn btn-primary" onClick={() => setIsTaskModalOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Task
              </button>
            </>
          )}
        </div>
      </div>

        {/* Filter Toolbar (New) */}
        <div className="filter-toolbar" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery(e.target.value)}
            className="filter-input"
          />
          <select
            className="filter-select"
            value={priorityFilter || ''}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <select
            className="filter-select"
            value={assigneeFilter || ''}
            onChange={e => setAssigneeFilter(e.target.value)}
          >
            <option value="">All Assignees</option>
            {project.members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        {/* Tabs */}
        <div className="project-tabs">
          <button
            onClick={() => setActiveSubTab('kanban')}
            className={`project-tab-btn ${activeSubTab === 'kanban' ? 'active' : ''}`}
          >
            Kanban Board
          </button>
          <button
            onClick={() => setActiveSubTab('team')}
            className={`project-tab-btn ${activeSubTab === 'team' ? 'active' : ''}`}
          >
            Team Directory ({project.members.length})
          </button>
        </div>

      {/* TABS INNER VIEWS */}
      {activeSubTab === 'kanban' ? (
        <div className="kanban-board">
          {Object.entries(columns).map(([colId, col]) => (
            <div key={colId} className="kanban-column">
              <div className="kanban-column-header">
                <span>{col.title}</span>
                <span className="kanban-column-badge">{col.tasks.length}</span>
              </div>
              <div className="kanban-column-list">
                {col.tasks.map(task => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
                  const dateStr = task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : null;

                  const initials = task.assignee?.name
                    ? task.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : null;

                  return (
                    <div
                      key={task.id}
                      className={`task-card prio-${task.priority.toLowerCase()}`}
                      onClick={() => openEditModal(task)}
                    >
                      <span className={`task-priority-badge priority-${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                      <h4 className="task-title">{task.title}</h4>
                      {task.description && <p className="task-desc">{task.description}</p>}
                      
                      <div className="task-footer">
                        <div className={`task-due ${isOverdue ? 'overdue' : ''}`}>
                          {dateStr && (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {isOverdue ? 'Overdue ' : 'Due '}{dateStr}
                            </>
                          )}
                        </div>

                        {initials && (
                          <div
                            className="task-assignee-avatar"
                            title={`Assigned to ${task.assignee.name}`}
                          >
                            {initials}
                          </div>
                        )}
                      </div>

                      {/* Member quick transition buttons */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', gap: '0.25rem', marginTop: '0.75rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem' }}
                      >
                        {colId !== 'TODO' && (
                          <button
                            onClick={() => {
                              const prevStatuses = { IN_PROGRESS: 'TODO', REVIEW: 'IN_PROGRESS', DONE: 'REVIEW' };
                              handleQuickStatusChange(task.id, prevStatuses[colId]);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', flexGrow: 1 }}
                            title="Move Back"
                          >
                            &larr; Move
                          </button>
                        )}
                        {colId !== 'DONE' && (
                          <button
                            onClick={() => {
                              const nextStatuses = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'REVIEW', REVIEW: 'DONE' };
                              handleQuickStatusChange(task.id, nextStatuses[colId]);
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', flexGrow: 1 }}
                            title="Move Forward"
                          >
                            Move &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {col.tasks.length === 0 && (
                  <div style={{ border: '1px dashed var(--glass-border)', borderRadius: 'var(--border-radius-sm)', padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Empty Column
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TEAM DIRECTORY VIEW */
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 className="dashboard-section-title">Project Members</h2>
          <table className="team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Project Role</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {project.members.map(member => (
                <tr key={member.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                      <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      {member.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{member.email}</td>
                  <td>
                    <span className={`role-badge role-${member.role.toLowerCase()}`}>
                      {member.role}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      {member.id !== user.id ? (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="btn btn-danger"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Remove
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>You (Creator)</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: CREATE TASK */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Create Workspace Task"
      >
        <form onSubmit={handleCreateTask}>
          <div className="form-group">
            <label className="form-label">Task Title</label>
            <input
              type="text"
              className="form-input"
              value={taskForm.title}
              onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Set up OAuth Flow"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              value={taskForm.description}
              onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add details..."
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-input"
                value={taskForm.priority}
                onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={taskForm.dueDate}
                onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Assignee</label>
            <select
              className="form-input"
              value={taskForm.assignedToId}
              onChange={e => setTaskForm(prev => ({ ...prev, assignedToId: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {project.members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
              Submit Task
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: INVITE MEMBER */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title="Invite Team Member"
      >
        <form onSubmit={handleInviteMember}>
          <div className="form-group">
            <label className="form-label">User Email Address</label>
            <input
              type="email"
              className="form-input"
              value={memberForm.email}
              onChange={e => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="team.member@domain.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Project Role Type</label>
            <select
              className="form-input"
              value={memberForm.role}
              onChange={e => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
            >
              <option value="MEMBER">Member (Read/Update task status)</option>
              <option value="ADMIN">Admin (Full project control)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
              Add Member
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsMemberModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT/DETAILS TASK */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={isAdmin ? "Edit Task Details" : "Task Information"}
      >
        <form onSubmit={handleUpdateTask}>
          <div className="form-group">
            <label className="form-label">Task Title</label>
            <input
              type="text"
              className="form-input"
              value={editTaskForm.title}
              disabled={!isAdmin}
              onChange={e => setEditTaskForm(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              value={editTaskForm.description}
              disabled={!isAdmin}
              onChange={e => setEditTaskForm(prev => ({ ...prev, description: e.target.value }))}
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-input"
                value={editTaskForm.priority}
                disabled={!isAdmin}
                onChange={e => setEditTaskForm(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={editTaskForm.dueDate}
                disabled={!isAdmin}
                onChange={e => setEditTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select
                className="form-input"
                value={editTaskForm.assignedToId}
                disabled={!isAdmin}
                onChange={e => setEditTaskForm(prev => ({ ...prev, assignedToId: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {project.members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={editTaskForm.status}
                onChange={e => setEditTaskForm(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">In Review</option>
                <option value="DONE">Completed</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleDeleteTask(editTaskForm.id)}
              >
                Delete
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
              Save Changes
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
