// src/components/TeamsManager.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Edit,
  Trash2,
  X,
  Plus,
  Search,
  UserPlus,
  Building2,
  Crown,
  Award,
  Briefcase,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  LayoutDashboard,
  User,
  Shield,
  Star,
  Activity,
  Gauge,
  Timer,
  Info,
  Mail,
  Phone,
  MapPin,
  Save,
  Sparkles,
  Zap,
  Target,
  Hash,
  Layers,
  CircleDot,
  MoreHorizontal,
  RotateCcw
} from 'lucide-react';
import Utils from '../utils/Utils';
import './TeamsManager.css';

const TeamsManagerComponent = ({
  data,
  addTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember
}) => {
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedTeams, setExpandedTeams] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({ name: '', supervisorId: '' });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [memberForm, setMemberForm] = useState({ workerId: '', roleInTeam: '' });

  // ⭐ Track whether the role was auto-filled so we can show a hint
  const [roleAutoFilled, setRoleAutoFilled] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  // ============================================
  // DATA
  // ============================================
  const teams = useMemo(() => data.teams || [], [data.teams]);
  const workers = useMemo(() => data.workers || [], [data.workers]);

  const workersMap = useMemo(() => {
    const m = {};
    workers.forEach(w => { m[w.id] = w; });
    return m;
  }, [workers]);

  const filteredTeams = useMemo(() => {
    let filtered = teams;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        const sup = workersMap[t.supervisorId];
        return (
          t.name.toLowerCase().includes(search) ||
          (sup?.name || '').toLowerCase().includes(search) ||
          (t.members || []).some(m => {
            const w = workersMap[m.workerId];
            return w && w.name.toLowerCase().includes(search);
          })
        );
      });
    }

    if (statusFilter === 'supervised') {
      filtered = filtered.filter(t => !!t.supervisorId);
    } else if (statusFilter === 'unsupervised') {
      filtered = filtered.filter(t => !t.supervisorId);
    } else if (statusFilter === 'empty') {
      filtered = filtered.filter(t => (t.members || []).length === 0);
    }

    return filtered;
  }, [teams, workersMap, searchTerm, statusFilter]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const total = teams.length;
    const totalMembers = teams.reduce((sum, t) => sum + (t.members?.length || 0), 0);
    const avgMembers = total > 0 ? totalMembers / total : 0;
    const supervisedTeams = teams.filter(t => t.supervisorId).length;
    const emptyTeams = teams.filter(t => (t.members || []).length === 0).length;
    const largestTeamSize = teams.reduce((max, t) => Math.max(max, t.members?.length || 0), 0);
    const uniqueMembers = new Set();
    teams.forEach(t => (t.members || []).forEach(m => uniqueMembers.add(m.workerId)));

    return {
      total, totalMembers, avgMembers, supervisedTeams, emptyTeams,
      largestTeamSize, uniqueMembers: uniqueMembers.size
    };
  }, [teams]);

  const cardDetails = {
    total: {
      title: 'Total Teams',
      details: [
        { label: 'Total Teams', value: stats.total },
        { label: 'Supervised', value: stats.supervisedTeams },
        { label: 'Empty Teams', value: stats.emptyTeams },
        { label: 'Avg Members/Team', value: stats.avgMembers.toFixed(1) }
      ]
    },
    members: {
      title: 'Team Members',
      details: [
        { label: 'Total Memberships', value: stats.totalMembers },
        { label: 'Unique Workers', value: stats.uniqueMembers },
        { label: 'Largest Team', value: stats.largestTeamSize },
        { label: 'Avg Members/Team', value: stats.avgMembers.toFixed(1) }
      ]
    },
    avg: {
      title: 'Average Team Size',
      details: [
        { label: 'Avg Members/Team', value: stats.avgMembers.toFixed(1) },
        { label: 'Total Teams', value: stats.total },
        { label: 'Total Members', value: stats.totalMembers },
        { label: 'Empty Teams', value: stats.emptyTeams }
      ]
    },
    supervised: {
      title: 'Supervised Teams',
      details: [
        { label: 'Supervised', value: stats.supervisedTeams },
        { label: 'Unsupervised', value: stats.total - stats.supervisedTeams },
        { label: 'Total Teams', value: stats.total },
        {
          label: 'Coverage',
          value: stats.total > 0
            ? `${((stats.supervisedTeams / stats.total) * 100).toFixed(1)}%`
            : '0%'
        }
      ]
    }
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };

  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // HANDLERS
  // ============================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Team name is required', 'error');
      return;
    }

    if (editingId) {
      updateTeam(editingId, formData);
      showToast('Team updated');
      setEditingId(null);
    } else {
      addTeam(formData);
      showToast('Team created');
    }

    setFormData({ name: '', supervisorId: '' });
    setShowForm(false);
  };

  const handleEdit = (team) => {
    setEditingId(team.id);
    setFormData({
      name: team.name || '',
      supervisorId: team.supervisorId || ''
    });
    setShowForm(true);
  };

  const handleDelete = (team) => {
    if (!window.confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
    deleteTeam(team.id);
    showToast('Team deleted');
  };

  const handleAddMember = (teamId) => {
    if (!memberForm.workerId) {
      showToast('Please select a worker', 'error');
      return;
    }
    addTeamMember(teamId, memberForm);
    showToast('Member added');
    setMemberForm({ workerId: '', roleInTeam: '' });
    setRoleAutoFilled(false);
    setSelectedTeam(null);
  };

  const handleRemoveMember = (teamId, memberId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    removeTeamMember(teamId, memberId);
    showToast('Member removed');
  };

  const getAvailableWorkers = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    const memberIds = team?.members?.map(m => m.workerId) || [];
    return workers.filter(w => !memberIds.includes(w.id));
  };

  const toggleExpand = (id) => {
    setExpandedTeams(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all';

  // ============================================
  // ⭐ NEW: HANDLERS for auto-picking worker role
  // ============================================
  const handleWorkerSelect = (workerId) => {
    const worker = workersMap[workerId];
    if (!worker) {
      // Selection cleared — reset role + hint
      setMemberForm({ workerId: '', roleInTeam: '' });
      setRoleAutoFilled(false);
      return;
    }

    // ⭐ Auto-fill the role from the worker record
    const autoRole = worker.role || worker.position || worker.jobTitle || '';
    setMemberForm({ workerId, roleInTeam: autoRole });
    setRoleAutoFilled(!!autoRole);
  };

  const handleResetRoleToDefault = () => {
    if (!memberForm.workerId) return;
    const worker = workersMap[memberForm.workerId];
    if (!worker) return;
    const autoRole = worker.role || worker.position || worker.jobTitle || '';
    setMemberForm(prev => ({ ...prev, roleInTeam: autoRole }));
    setRoleAutoFilled(!!autoRole);
    if (autoRole) showToast('Role reset to worker default');
  };

  const handleRoleChange = (value) => {
    // ⭐ User typed something — no longer "auto-filled"
    setMemberForm(prev => ({ ...prev, roleInTeam: value }));
    setRoleAutoFilled(false);
  };

  // ============================================
  // RENDER TEAM CARD
  // ============================================
  const renderTeamCard = (team, index) => {
    const isExpanded = expandedTeams[team.id];
    const supervisor = workersMap[team.supervisorId];
    const members = team.members || [];
    const coveragePct = stats.total > 0 ? (members.length / stats.largestTeamSize) * 100 : 0;

    return (
      <div
        key={team.id}
        className="tm-card"
        style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}
      >
        <div className="tm-card-accent" />

        <div className="tm-card-header">
          <div className="tm-info">
            <div className="tm-avatar">
              <span className="tm-avatar-text">{team.name.charAt(0).toUpperCase()}</span>
              <span className="tm-member-badge">{members.length}</span>
            </div>
            <div className="tm-info-text">
              <div className="tm-name">{team.name}</div>
              <div className="tm-meta">
                {supervisor ? (
                  <span className="tm-supervisor">
                    <Crown size={11} />
                    {supervisor.name}
                  </span>
                ) : (
                  <span className="tm-no-supervisor">
                    <AlertCircle size={11} />
                    No supervisor
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="tm-card-header-right">
            <div className="tm-member-chip" title={`${members.length} members`}>
              <Users size={13} />
              <span>{members.length}</span>
            </div>
          </div>
        </div>

        {members.length > 0 && (
          <div className="tm-members-preview">
            <div className="tm-avatars-stack">
              {members.slice(0, 5).map((m, i) => {
                const w = workersMap[m.workerId];
                if (!w) return null;
                return (
                  <span
                    key={m.id}
                    className="tm-stack-avatar"
                    style={{ zIndex: 10 - i }}
                    title={w.name}
                  >
                    {w.name.charAt(0).toUpperCase()}
                  </span>
                );
              })}
              {members.length > 5 && (
                <span className="tm-stack-avatar tm-stack-more">
                  +{members.length - 5}
                </span>
              )}
            </div>
            <span className="tm-members-preview-label">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="tm-card-body">
          <div className="tm-members-section">
            <div className="tm-members-header">
              <span className="tm-members-title">
                <Layers size={13} /> Team Roster
              </span>
              <button
                className="tm-btn-add-member"
                onClick={() => setSelectedTeam(team.id)}
              >
                <UserPlus size={13} />
                Add
              </button>
            </div>

            {members.length > 0 ? (
              <div className="tm-members-list">
                {members.map(member => {
                  const worker = workersMap[member.workerId];
                  if (!worker) return null;
                  const isSupervisor = member.workerId === team.supervisorId;
                  return (
                    <div key={member.id} className="tm-member-item">
                      <div className={`tm-member-avatar ${isSupervisor ? 'is-supervisor' : ''}`}>
                        {isSupervisor ? <Crown size={13} /> : <span>{worker.name.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="tm-member-info">
                        <span className="tm-member-name">{worker.name}</span>
                        {member.roleInTeam && (
                          <span className="tm-member-role">{member.roleInTeam}</span>
                        )}
                      </div>
                      <button
                        className="tm-btn-remove-member"
                        onClick={() => handleRemoveMember(team.id, member.id)}
                        title="Remove member"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="tm-empty-members">
                <div className="tm-empty-members-icon">
                  <Users size={22} />
                </div>
                <span className="tm-empty-members-title">No members yet</span>
                <span className="tm-empty-members-sub">Add workers to build this team</span>
                <button
                  className="tm-btn-add-first-member"
                  onClick={() => setSelectedTeam(team.id)}
                >
                  <Plus size={13} /> Add first member
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="tm-card-footer">
          <button
            className="tm-btn-expand"
            onClick={() => toggleExpand(team.id)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
          </button>

          <div className="tm-actions">
            <button className="tm-btn-icon tm-btn-icon-edit" onClick={() => handleEdit(team)} title="Edit team">
              <Edit size={15} />
            </button>
            <button className="tm-btn-icon tm-btn-icon-danger" onClick={() => handleDelete(team)} title="Delete team">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="tm-expanded">
            <div className="tm-expanded-grid">
              <div className="tm-expanded-item">
                <Crown size={13} />
                <div>
                  <span className="tm-expanded-label">Supervisor</span>
                  <span className="tm-expanded-value">
                    {supervisor ? supervisor.name : 'Not assigned'}
                  </span>
                </div>
              </div>
              <div className="tm-expanded-item">
                <Users size={13} />
                <div>
                  <span className="tm-expanded-label">Total Members</span>
                  <span className="tm-expanded-value">{members.length}</span>
                </div>
              </div>
              <div className="tm-expanded-item">
                <Hash size={13} />
                <div>
                  <span className="tm-expanded-label">Team ID</span>
                  <span className="tm-expanded-value tm-mono">{team.id}</span>
                </div>
              </div>
              <div className="tm-expanded-item">
                <Calendar size={13} />
                <div>
                  <span className="tm-expanded-label">Created</span>
                  <span className="tm-expanded-value">
                    {team.createdAt ? Utils.formatDate(team.createdAt) : 'N/A'}
                  </span>
                </div>
              </div>
              {members.length > 0 && (
                <div className="tm-expanded-item tm-expanded-full">
                  <Award size={13} />
                  <div>
                    <span className="tm-expanded-label">All members</span>
                    <span className="tm-expanded-value">
                      {members
                        .map(m => workersMap[m.workerId]?.name)
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                </div>
              )}
              <div className="tm-expanded-progress">
                <div className="tm-expanded-progress-label">
                  <Target size={12} /> Roster size relative to largest team
                </div>
                <div className="tm-expanded-progress-bar">
                  <div
                    className="tm-expanded-progress-fill"
                    style={{ width: `${Math.min(coveragePct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = () => (
    <div
      className="tm-modal-overlay"
      onClick={() => { setShowForm(false); setEditingId(null); }}
    >
      <div className="tm-modal-content tm-form-modal" onClick={e => e.stopPropagation()}>
        <div className="tm-modal-header tm-modal-header-green">
          <div className="tm-modal-header-left">
            <div className="tm-modal-header-icon">
              {editingId ? <Edit size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <h3>{editingId ? 'Edit Team' : 'New Team'}</h3>
              <p className="tm-modal-subtitle">
                {editingId ? 'Update team details' : 'Create a new team to organize workers'}
              </p>
            </div>
          </div>
          <button
            className="tm-modal-close"
            onClick={() => { setShowForm(false); setEditingId(null); }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="tm-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="tm-form-row">
              <div className="tm-form-group">
                <label>
                  <Layers size={13} /> Team Name <span className="tm-required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Masonry Crew A"
                  required
                  className="tm-form-input"
                  autoFocus
                />
              </div>
              <div className="tm-form-group">
                <label>
                  <Crown size={13} /> Supervisor
                </label>
                <select
                  value={formData.supervisorId}
                  onChange={e => setFormData({ ...formData, supervisorId: e.target.value })}
                  className="tm-form-select"
                >
                  <option value="">None</option>
                  {workers.map(worker => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}{worker.role ? ` · ${worker.role}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tm-form-actions">
              <button type="submit" className="tm-btn-primary">
                <Save size={15} /> {editingId ? 'Update Team' : 'Create Team'}
              </button>
              <button
                type="button"
                className="tm-btn-secondary"
                onClick={() => { setShowForm(false); setEditingId(null); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER ADD MEMBER MODAL — ⭐ AUTO-ROLE
  // ============================================
  const renderAddMemberModal = () => {
    if (!selectedTeam) return null;
    const availableWorkers = getAvailableWorkers(selectedTeam);
    const team = teams.find(t => t.id === selectedTeam);
    const selectedWorker = memberForm.workerId ? workersMap[memberForm.workerId] : null;

    return (
      <div
        className="tm-modal-overlay"
        onClick={() => { setSelectedTeam(null); setMemberForm({ workerId: '', roleInTeam: '' }); setRoleAutoFilled(false); }}
      >
        <div className="tm-modal-content tm-member-modal" onClick={e => e.stopPropagation()}>
          <div className="tm-modal-header tm-modal-header-green">
            <div className="tm-modal-header-left">
              <div className="tm-modal-header-icon">
                <UserPlus size={20} />
              </div>
              <div>
                <h3>Add Team Member</h3>
                <p className="tm-modal-subtitle">
                  {team ? `Adding to ${team.name}` : 'Select a worker'}
                </p>
              </div>
            </div>
            <button
              className="tm-modal-close"
              onClick={() => { setSelectedTeam(null); setMemberForm({ workerId: '', roleInTeam: '' }); setRoleAutoFilled(false); }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="tm-modal-body">
            {/* ⭐ Worker dropdown — on change, auto-fills role */}
            <div className="tm-form-group">
              <label>
                <User size={13} /> Worker <span className="tm-required">*</span>
              </label>
              <select
                value={memberForm.workerId}
                onChange={e => handleWorkerSelect(e.target.value)}
                className="tm-form-select"
              >
                <option value="">Select a worker</option>
                {availableWorkers.map(worker => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}{worker.role ? ` · ${worker.role}` : ''}
                  </option>
                ))}
              </select>
              {availableWorkers.length === 0 && (
                <div className="tm-no-workers-msg">
                  <AlertCircle size={14} />
                  All workers are already in this team
                </div>
              )}
            </div>

            {/* ⭐ Selected worker preview — shows name, role, phone */}
            {selectedWorker && (
              <div className="tm-worker-preview">
                <div className="tm-worker-preview-avatar">
                  {selectedWorker.name.charAt(0).toUpperCase()}
                </div>
                <div className="tm-worker-preview-info">
                  <div className="tm-worker-preview-name">{selectedWorker.name}</div>
                  <div className="tm-worker-preview-meta">
                    {selectedWorker.role && (
                      <span className="tm-worker-preview-role">
                        <Briefcase size={11} /> {selectedWorker.role}
                      </span>
                    )}
                    {selectedWorker.phone && (
                      <span className="tm-worker-preview-phone">
                        <Phone size={11} /> {selectedWorker.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ⭐ Role field with auto-fill hint + reset button */}
            <div className="tm-form-group">
              <div className="tm-form-label-row">
                <label>
                  <Briefcase size={13} /> Role in Team
                </label>
                {memberForm.workerId && roleAutoFilled && (
                  <button
                    type="button"
                    className="tm-btn-reset-role"
                    onClick={handleResetRoleToDefault}
                    title="Reset to worker's default role"
                  >
                    <RotateCcw size={11} /> Reset
                  </button>
                )}
              </div>
              <input
                type="text"
                value={memberForm.roleInTeam}
                onChange={e => handleRoleChange(e.target.value)}
                placeholder={
                  selectedWorker?.role
                    ? `Auto-filled: ${selectedWorker.role}`
                    : "e.g. Mason, Helper, Driver"
                }
                className={`tm-form-input ${roleAutoFilled ? 'tm-input-auto-filled' : ''}`}
              />
              {roleAutoFilled && (
                <div className="tm-auto-fill-hint">
                  <Sparkles size={11} />
                  <span>Auto-filled from worker role — edit to override</span>
                </div>
              )}
              {!roleAutoFilled && selectedWorker && !memberForm.roleInTeam && (
                <div className="tm-no-role-hint">
                  <Info size={11} />
                  <span>This worker has no default role — enter one above</span>
                </div>
              )}
            </div>

            <div className="tm-form-actions">
              <button
                className="tm-btn-primary"
                onClick={() => handleAddMember(selectedTeam)}
                disabled={!memberForm.workerId}
              >
                <UserPlus size={15} /> Add Member
              </button>
              <button
                className="tm-btn-secondary"
                onClick={() => { setSelectedTeam(null); setMemberForm({ workerId: '', roleInTeam: '' }); setRoleAutoFilled(false); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className={`tm-management ${mounted ? 'is-mounted' : ''}`}>
      {/* Toast */}
      {toast && (
        <div className={`tm-toast tm-toast-${toast.type}`} key={toast.id}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="tm-ambient">
        <div className="tm-ambient-orb tm-ambient-1" />
        <div className="tm-ambient-orb tm-ambient-2" />
        <div className="tm-ambient-orb tm-ambient-3" />
      </div>

      <div className="tm-header">
        <div className="tm-header-left">
          <div className="tm-header-icon-wrapper">
            <Users size={22} />
          </div>
          <div>
            <h2>Team Management</h2>
            <p className="tm-header-subtitle">
              {stats.total} team{stats.total !== 1 ? 's' : ''} · {stats.uniqueMembers} worker{stats.uniqueMembers !== 1 ? 's' : ''} assigned
            </p>
          </div>
        </div>
        <div className="tm-header-right">
          <button className="tm-btn-ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            className="tm-btn-primary"
            onClick={() => { setEditingId(null); setFormData({ name: '', supervisorId: '' }); setShowForm(true); }}
          >
            <Plus size={15} />
            New Team
          </button>
        </div>
      </div>

      <div className="tm-stats-grid">
        <div
          className="tm-stat-card tm-stat-total"
          onMouseEnter={(e) => handleCardHover('total', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="tm-stat-icon-wrapper tm-stat-icon-blue">
            <Users size={20} />
          </div>
          <div className="tm-stat-content">
            <span className="tm-stat-label">Total Teams</span>
            <span className="tm-stat-value">{stats.total}</span>
            <span className="tm-stat-meta">{stats.supervisedTeams} supervised</span>
          </div>
        </div>

        <div
          className="tm-stat-card tm-stat-members"
          onMouseEnter={(e) => handleCardHover('members', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="tm-stat-icon-wrapper tm-stat-icon-green">
            <UserCheck size={20} />
          </div>
          <div className="tm-stat-content">
            <span className="tm-stat-label">Total Members</span>
            <span className="tm-stat-value">{stats.totalMembers}</span>
            <span className="tm-stat-meta">{stats.uniqueMembers} unique workers</span>
          </div>
        </div>

        <div
          className="tm-stat-card tm-stat-avg"
          onMouseEnter={(e) => handleCardHover('avg', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="tm-stat-icon-wrapper tm-stat-icon-amber">
            <Award size={20} />
          </div>
          <div className="tm-stat-content">
            <span className="tm-stat-label">Avg Size</span>
            <span className="tm-stat-value">{stats.avgMembers.toFixed(1)}</span>
            <span className="tm-stat-meta">members per team</span>
          </div>
        </div>

        <div
          className="tm-stat-card tm-stat-supervised"
          onMouseEnter={(e) => handleCardHover('supervised', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="tm-stat-icon-wrapper tm-stat-icon-purple">
            <Crown size={20} />
          </div>
          <div className="tm-stat-content">
            <span className="tm-stat-label">Supervised</span>
            <span className="tm-stat-value">{stats.supervisedTeams}</span>
            <span className="tm-stat-meta">
              {stats.total > 0
                ? `${((stats.supervisedTeams / stats.total) * 100).toFixed(0)}% coverage`
                : 'no teams'}
            </span>
          </div>
        </div>
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div
          className="tm-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="tm-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="tm-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="tm-tooltip-row">
                <span className="tm-tooltip-label">{detail.label}</span>
                <span className="tm-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tm-filters-section">
        <div className="tm-search-box">
          <Search size={16} className="tm-search-icon" />
          <input
            type="text"
            placeholder="Search teams, supervisors, or members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="tm-clear-search" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="tm-status-filter">
          {[
            { id: 'all', label: 'All', icon: LayoutDashboard },
            { id: 'supervised', label: 'Supervised', icon: Crown },
            { id: 'unsupervised', label: 'Unsupervised', icon: AlertCircle },
            { id: 'empty', label: 'Empty', icon: Users }
          ].map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                className={`tm-status-pill ${statusFilter === f.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.id)}
              >
                <Icon size={13} />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button className="tm-clear-filters" onClick={clearFilters}>
            <X size={13} />
            Clear
          </button>
        )}

        <span className="tm-result-count">
          {filteredTeams.length} of {teams.length}
        </span>
      </div>

      {filteredTeams.length === 0 ? (
        <div className="tm-empty-state">
          <div className="tm-empty-icon-wrapper">
            {hasActiveFilters ? <Search size={44} /> : <Users size={44} />}
          </div>
          <h3>{hasActiveFilters ? 'No matching teams' : 'No teams yet'}</h3>
          <p>
            {hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Create your first team to organize your workforce.'}
          </p>
          {hasActiveFilters ? (
            <button className="tm-btn-secondary" onClick={clearFilters}>
              <X size={14} /> Clear filters
            </button>
          ) : (
            <button
              className="tm-btn-primary"
              onClick={() => { setEditingId(null); setFormData({ name: '', supervisorId: '' }); setShowForm(true); }}
            >
              <Plus size={15} /> Create Team
            </button>
          )}
        </div>
      ) : (
        <div className="tm-grid">
          {filteredTeams.map((team, i) => renderTeamCard(team, i))}
        </div>
      )}

      {showForm && renderFormModal()}
      {selectedTeam && renderAddMemberModal()}
    </div>
  );
};

export default TeamsManagerComponent;