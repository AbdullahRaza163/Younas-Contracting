import React, { useState, useMemo, useCallback } from 'react';
import {
  HardHat,
  Edit,
  Trash2,
  Plus,
  X,
  Save,
  Search,
  Filter,
  Users,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  Award,
  Shield,
  Briefcase,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  LayoutDashboard,
  User,
  UserPlus,
  Crown,
  Star,
  Activity,
  Gauge,
  Timer,
  Info
} from 'lucide-react';
import Utils from '../utils/Utils';
import './WorkersManager.css';

const WorkersManagerComponent = ({ data, addWorker, updateWorker, deleteWorker }) => {
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedWorkers, setExpandedWorkers] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    dailyRate: '',
    phone: '',
    email: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    skills: '',
    experience: '',
    notes: ''
  });

  // Filter workers
  const filteredWorkers = useMemo(() => {
    let filtered = data.workers || [];
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(w =>
        w.name.toLowerCase().includes(search) ||
        (w.role && w.role.toLowerCase().includes(search)) ||
        (w.phone && w.phone.includes(search))
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(w => w.role === roleFilter);
    }
    
    return filtered;
  }, [data.workers, searchTerm, roleFilter]);

  // Get unique roles for filter
  const roles = useMemo(() => {
    const uniqueRoles = ['all', ...new Set((data.workers || []).map(w => w.role).filter(Boolean))];
    return uniqueRoles;
  }, [data.workers]);

  // Stats
  const stats = useMemo(() => {
    const workers = data.workers || [];
    const total = workers.length;
    const active = workers.filter(w => w.status !== 'inactive').length;
    const totalDailyCost = workers.reduce((sum, w) => sum + (w.dailyRate || 0), 0);
    const avgRate = total > 0 ? totalDailyCost / total : 0;
    
    return { total, active, totalDailyCost, avgRate };
  }, [data.workers]);

  // Card details for tooltips
  const cardDetails = {
    total: {
      title: 'Total Workers',
      details: [
        { label: 'Total Workers', value: stats.total },
        { label: 'Active Workers', value: stats.active },
        { label: 'Inactive', value: stats.total - stats.active },
        { label: 'Roles Available', value: roles.length - 1 }
      ]
    },
    active: {
      title: 'Active Workers',
      details: [
        { label: 'Active Workers', value: stats.active },
        { label: 'Total Workers', value: stats.total },
        { label: 'Inactive', value: stats.total - stats.active },
        { label: 'Active Rate', value: stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    cost: {
      title: 'Daily Labor Cost',
      details: [
        { label: 'Total Daily Cost', value: Utils.formatCurrency(stats.totalDailyCost) },
        { label: 'Average Rate', value: Utils.formatCurrency(stats.avgRate) },
        { label: 'Total Workers', value: stats.total },
        { label: 'Monthly Cost', value: Utils.formatCurrency(stats.totalDailyCost * 26) }
      ]
    }
  };

  // Handle hover for tooltips
  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({
      x: event.clientX + 15,
      y: event.clientY - 10
    });
  };

  const handleCardLeave = () => {
    setHoveredCard(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Worker name is required');
      return;
    }

    if (editingId) {
      updateWorker(editingId, formData);
      setEditingId(null);
    } else {
      addWorker(formData);
    }

    setFormData({
      name: '',
      role: '',
      dailyRate: '',
      phone: '',
      email: '',
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
      skills: '',
      experience: '',
      notes: ''
    });
    setShowForm(false);
  };

  const handleEdit = (worker) => {
    setEditingId(worker.id);
    setFormData({
      name: worker.name || '',
      role: worker.role || '',
      dailyRate: worker.dailyRate || '',
      phone: worker.phone || '',
      email: worker.email || '',
      address: worker.address || '',
      emergencyContact: worker.emergencyContact || '',
      emergencyPhone: worker.emergencyPhone || '',
      skills: worker.skills || '',
      experience: worker.experience || '',
      notes: worker.notes || ''
    });
    setShowForm(true);
  };

  const toggleExpand = (id) => {
    setExpandedWorkers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      deleteWorker(id);
    }
  };

  // Calculate worker stats
  const getWorkerStats = (workerId) => {
    const workerAttendance = data.attendance?.filter(a => a.workerId === workerId) || [];
    const totalHours = workerAttendance.reduce((sum, a) => {
      if (a.checkedIn && a.checkedOut) {
        return sum + Utils.calculateHoursWorked(a.checkedIn, a.checkedOut);
      }
      return sum;
    }, 0);
    const daysPresent = workerAttendance.filter(a => a.present).length;
    const totalWages = totalHours * (data.workers?.find(w => w.id === workerId)?.dailyRate / 8 || 0);
    
    return { totalHours, daysPresent, totalWages };
  };

  // Render worker card
  const renderWorkerCard = (worker) => {
    const isExpanded = expandedWorkers[worker.id];
    const stats = getWorkerStats(worker.id);
    const roleColors = {
      'Mason': '#3b82f6',
      'Helper': '#8b5cf6',
      'Supervisor': '#f59e0b',
      'Manager': '#22c55e',
      'Driver': '#ec4899',
      'Operator': '#f97316'
    };
    const roleColor = roleColors[worker.role] || '#6b7280';

    return (
      <div 
        key={worker.id} 
        className="wk-card"
        onMouseEnter={() => setHoveredCard(worker.id)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div className="wk-card-header">
          <div className="wk-info">
            <div className="wk-avatar">
              <span className="wk-avatar-text">{worker.name.charAt(0).toUpperCase()}</span>
              <span className={`wk-status-dot ${worker.status === 'inactive' ? 'inactive' : 'active'}`}></span>
            </div>
            <div>
              <div className="wk-name">{worker.name}</div>
              <div className="wk-role" style={{ color: roleColor }}>
                <Briefcase size={12} />
                {worker.role || 'No role'}
              </div>
            </div>
          </div>
          <div className="wk-rate">
            <DollarSign size={14} />
            <span>{Utils.formatCurrency(worker.dailyRate)}/day</span>
          </div>
        </div>

        <div className="wk-card-body">
          <div className="wk-stats-grid">
            <div className="wk-stat-item">
              <span className="wk-stat-label">Hours</span>
              <span className="wk-stat-value">{stats.totalHours.toFixed(1)}h</span>
            </div>
            <div className="wk-stat-item">
              <span className="wk-stat-label">Days Present</span>
              <span className="wk-stat-value">{stats.daysPresent}</span>
            </div>
            <div className="wk-stat-item">
              <span className="wk-stat-label">Wages</span>
              <span className="wk-stat-value">{Utils.formatCurrencyShort(stats.totalWages)}</span>
            </div>
          </div>

          {worker.phone && (
            <div className="wk-contact">
              <Phone size={14} />
              <span>{worker.phone}</span>
            </div>
          )}

          {worker.skills && (
            <div className="wk-skills">
              <Award size={14} />
              <span>{worker.skills}</span>
            </div>
          )}
        </div>

        <div className="wk-card-footer">
          <div className="wk-actions">
            <button 
              className="wk-btn-icon" 
              onClick={() => {
                setSelectedWorker(worker);
                setShowDetailModal(true);
              }}
              title="View Details"
            >
              <Eye size={16} />
            </button>
            <button 
              className="wk-btn-icon" 
              onClick={() => handleEdit(worker)}
              title="Edit"
            >
              <Edit size={16} />
            </button>
            <button 
              className="wk-btn-icon wk-btn-danger" 
              onClick={() => handleDelete(worker.id)}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
            <button 
              className="wk-btn-icon wk-btn-expand" 
              onClick={() => toggleExpand(worker.id)}
              title="Expand"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="wk-expanded">
            <div className="wk-expanded-grid">
              {worker.email && (
                <div className="wk-expanded-item">
                  <Mail size={14} />
                  <span><strong>Email:</strong> {worker.email}</span>
                </div>
              )}
              {worker.address && (
                <div className="wk-expanded-item">
                  <MapPin size={14} />
                  <span><strong>Address:</strong> {worker.address}</span>
                </div>
              )}
              {worker.emergencyContact && (
                <div className="wk-expanded-item">
                  <Shield size={14} />
                  <span><strong>Emergency:</strong> {worker.emergencyContact}</span>
                </div>
              )}
              {worker.emergencyPhone && (
                <div className="wk-expanded-item">
                  <Phone size={14} />
                  <span><strong>Emergency Phone:</strong> {worker.emergencyPhone}</span>
                </div>
              )}
              {worker.experience && (
                <div className="wk-expanded-item">
                  <Calendar size={14} />
                  <span><strong>Experience:</strong> {worker.experience} years</span>
                </div>
              )}
              {worker.notes && (
                <div className="wk-expanded-item full">
                  <Info size={14} />
                  <span><strong>Notes:</strong> {worker.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render detail modal
  const renderDetailModal = () => {
    if (!selectedWorker) return null;
    const w = selectedWorker;
    const stats = getWorkerStats(w.id);

    return (
      <div className="wk-modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="wk-modal-content wk-detail-modal" onClick={e => e.stopPropagation()}>
          <div className="wk-modal-header" style={{ background: 'linear-gradient(135deg, #1a2332, #2a3a4a)' }}>
            <div className="wk-modal-header-left">
              <div className="wk-modal-avatar">
                <span>{w.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h3 style={{ color: '#ffffff' }}>{w.name}</h3>
                <div className="wk-modal-subtitle" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {w.role || 'No role'} • {Utils.formatCurrency(w.dailyRate)}/day
                </div>
              </div>
            </div>
            <div className="wk-modal-actions">
              <button className="wk-modal-btn-edit" onClick={() => { setShowDetailModal(false); handleEdit(w); }}>
                <Edit size={16} /> Edit
              </button>
              <button className="wk-modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} color="#ffffff" />
              </button>
            </div>
          </div>

          <div className="wk-modal-body">
            <div className="wk-detail-stats">
              <div className="wk-detail-stat">
                <Clock size={18} />
                <div>
                  <span className="wk-detail-stat-label">Total Hours</span>
                  <span className="wk-detail-stat-value">{stats.totalHours.toFixed(1)}h</span>
                </div>
              </div>
              <div className="wk-detail-stat">
                <Calendar size={18} />
                <div>
                  <span className="wk-detail-stat-label">Days Present</span>
                  <span className="wk-detail-stat-value">{stats.daysPresent}</span>
                </div>
              </div>
              <div className="wk-detail-stat">
                <DollarSign size={18} />
                <div>
                  <span className="wk-detail-stat-label">Total Wages</span>
                  <span className="wk-detail-stat-value">{Utils.formatCurrency(stats.totalWages)}</span>
                </div>
              </div>
              <div className="wk-detail-stat">
                <Activity size={18} />
                <div>
                  <span className="wk-detail-stat-label">Status</span>
                  <span className={`wk-detail-stat-value ${w.status === 'inactive' ? 'inactive' : 'active'}`}>
                    {w.status === 'inactive' ? 'Inactive' : 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div className="wk-detail-info">
              <h4>Contact Information</h4>
              <div className="wk-detail-grid">
                {w.phone && (
                  <div className="wk-detail-item">
                    <Phone size={14} />
                    <span><strong>Phone:</strong> {w.phone}</span>
                  </div>
                )}
                {w.email && (
                  <div className="wk-detail-item">
                    <Mail size={14} />
                    <span><strong>Email:</strong> {w.email}</span>
                  </div>
                )}
                {w.address && (
                  <div className="wk-detail-item">
                    <MapPin size={14} />
                    <span><strong>Address:</strong> {w.address}</span>
                  </div>
                )}
                {w.emergencyContact && (
                  <div className="wk-detail-item">
                    <User size={14} />
                    <span><strong>Emergency Contact:</strong> {w.emergencyContact}</span>
                  </div>
                )}
                {w.emergencyPhone && (
                  <div className="wk-detail-item">
                    <Phone size={14} />
                    <span><strong>Emergency Phone:</strong> {w.emergencyPhone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="wk-detail-info">
              <h4>Work Information</h4>
              <div className="wk-detail-grid">
                {w.role && (
                  <div className="wk-detail-item">
                    <Briefcase size={14} />
                    <span><strong>Role:</strong> {w.role}</span>
                  </div>
                )}
                {w.skills && (
                  <div className="wk-detail-item">
                    <Award size={14} />
                    <span><strong>Skills:</strong> {w.skills}</span>
                  </div>
                )}
                {w.experience && (
                  <div className="wk-detail-item">
                    <Timer size={14} />
                    <span><strong>Experience:</strong> {w.experience} years</span>
                  </div>
                )}
                {w.dailyRate && (
                  <div className="wk-detail-item">
                    <DollarSign size={14} />
                    <span><strong>Daily Rate:</strong> {Utils.formatCurrency(w.dailyRate)}</span>
                  </div>
                )}
              </div>
            </div>

            {w.notes && (
              <div className="wk-detail-notes">
                <h4><FileText size={14} /> Notes</h4>
                <p>{w.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render form modal
  const renderFormModal = () => {
    return (
      <div className="wk-modal-overlay" onClick={() => { setShowForm(false); setEditingId(null); }}>
        <div className="wk-modal-content wk-form-modal" onClick={e => e.stopPropagation()}>
          <div className="wk-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="wk-modal-header-left">
              <UserPlus size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Worker' : 'New Worker'}</h3>
            </div>
            <button className="wk-modal-close" onClick={() => { setShowForm(false); setEditingId(null); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="wk-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="wk-form-row">
                <div className="wk-form-group">
                  <label>Worker Name <span className="wk-required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter worker name"
                    required
                    className="wk-form-input"
                  />
                </div>
                <div className="wk-form-group">
                  <label>Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g., Mason, Helper"
                    className="wk-form-input"
                  />
                </div>
              </div>

              <div className="wk-form-row">
                <div className="wk-form-group">
                  <label>Daily Rate (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.dailyRate}
                    onChange={e => setFormData({ ...formData, dailyRate: e.target.value })}
                    placeholder="0.000"
                    className="wk-form-input"
                  />
                </div>
                <div className="wk-form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contact number"
                    className="wk-form-input"
                  />
                </div>
              </div>

              <div className="wk-form-row">
                <div className="wk-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email address"
                    className="wk-form-input"
                  />
                </div>
                <div className="wk-form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Address"
                    className="wk-form-input"
                  />
                </div>
              </div>

              <div className="wk-form-row">
                <div className="wk-form-group">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="Emergency contact name"
                    className="wk-form-input"
                  />
                </div>
                <div className="wk-form-group">
                  <label>Emergency Phone</label>
                  <input
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    placeholder="Emergency contact number"
                    className="wk-form-input"
                  />
                </div>
              </div>

              <div className="wk-form-row">
                <div className="wk-form-group">
                  <label>Skills</label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={e => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="e.g., Masonry, Carpentry"
                    className="wk-form-input"
                  />
                </div>
                <div className="wk-form-group">
                  <label>Experience (years)</label>
                  <input
                    type="number"
                    value={formData.experience}
                    onChange={e => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="Years of experience"
                    className="wk-form-input"
                  />
                </div>
              </div>

              <div className="wk-form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows="2"
                  className="wk-form-textarea"
                />
              </div>

              <div className="wk-form-actions">
                <button type="submit" className="wk-btn-primary">
                  <Save size={16} /> {editingId ? 'Update Worker' : 'Add Worker'}
                </button>
                <button type="button" className="wk-btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="wk-management">
      {/* Header */}
      <div className="wk-header">
        <div className="wk-header-left">
          <div className="wk-header-icon-wrapper">
            <Users size={28} />
            <span className="wk-header-badge">Workers</span>
          </div>
          <div>
            <h2>Worker Management</h2>
            <p className="wk-header-subtitle">Manage your workforce and track performance</p>
          </div>
        </div>
        <div className="wk-header-right">
          <button className="wk-btn-refresh" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="wk-btn-primary" onClick={() => { setEditingId(null); setShowForm(true); }}>
            <Plus size={18} />
            New Worker
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="wk-stats-grid">
        <div 
          className="wk-stat-card"
          onMouseEnter={(e) => handleCardHover('total', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="wk-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Users size={22} />
          </div>
          <div className="wk-stat-content">
            <span className="wk-stat-label">Total Workers</span>
            <span className="wk-stat-value">{stats.total}</span>
          </div>
          <div className="wk-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div 
          className="wk-stat-card"
          onMouseEnter={(e) => handleCardHover('active', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="wk-stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <UserCheck size={22} />
          </div>
          <div className="wk-stat-content">
            <span className="wk-stat-label">Active Workers</span>
            <span className="wk-stat-value">{stats.active}</span>
          </div>
          <div className="wk-stat-progress">
            <div className="wk-stat-progress-bar" style={{ width: stats.total > 0 ? `${(stats.active / stats.total) * 100}%` : '0%' }}></div>
          </div>
        </div>

        <div 
          className="wk-stat-card"
          onMouseEnter={(e) => handleCardHover('cost', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="wk-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <DollarSign size={22} />
          </div>
          <div className="wk-stat-content">
            <span className="wk-stat-label">Daily Labor Cost</span>
            <span className="wk-stat-value">{Utils.formatCurrencyShort(stats.totalDailyCost)}</span>
          </div>
          <div className="wk-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div 
          className="wk-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="wk-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="wk-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="wk-tooltip-row">
                <span className="wk-tooltip-label">{detail.label}</span>
                <span className="wk-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="wk-filters-section">
        <div className="wk-search-box">
          <Search size={18} className="wk-search-icon" />
          <input
            type="text"
            placeholder="Search workers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="wk-clear-search" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="wk-filter-group">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            {roles.filter(r => r !== 'all').map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Workers List */}
      {filteredWorkers.length === 0 ? (
        <div className="wk-empty-state">
          <div className="wk-empty-icon-wrapper">
            <HardHat size={64} />
          </div>
          <h3>No Workers Found</h3>
          <p>Add your first worker to get started with workforce management.</p>
          <button className="wk-btn-primary" onClick={() => { setEditingId(null); setShowForm(true); }}>
            <Plus size={18} /> Add Worker
          </button>
        </div>
      ) : (
        <div className="wk-grid">
          {filteredWorkers.map(renderWorkerCard)}
        </div>
      )}

      {/* Modals */}
      {showForm && renderFormModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default WorkersManagerComponent;