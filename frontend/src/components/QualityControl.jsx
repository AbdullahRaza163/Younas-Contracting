// src/components/QualityControl.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Search, Filter, Edit, Trash2, Eye, X, Save,
  RefreshCw, ChevronDown, ChevronUp, CheckCircle,
  AlertCircle, Clock, Wrench, Shield, FileText,
  Camera, Upload, Download, Printer, Calendar,
  User, Building2, MapPin, Phone, Mail,Tag,FolderKanban ,
  AlertTriangle, Check, XCircle, HelpCircle,
  Star, StarHalf, TrendingUp, TrendingDown,
  List, Grid, Clipboard, ClipboardCheck,
  LayoutDashboard, Target, Award, Zap, Gauge,
  BarChart3, Info, ArrowUpRight, ArrowDownRight,
  Crown, Sparkles, Users, HardHat
} from 'lucide-react';
import Utils from '../utils/Utils';
import ApiService from '../services/ApiService';
import './QualityControl.css';

const QualityControl = ({ data, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Data states
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [issues, setIssues] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    inspectionTypeId: '',
    siteId: '',
    projectId: '',
    title: '',
    description: '',
    inspectionDate: new Date().toISOString().slice(0, 16),
    conductedBy: '',
    notes: ''
  });

  // Issue form
  const [issueForm, setIssueForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    category: '',
    location: '',
    reportedBy: '',
    assignedTo: '',
    dueDate: '',
    notes: ''
  });

  // Incident form
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    description: '',
    incidentType: 'accident',
    severity: 'medium',
    incidentDate: new Date().toISOString().slice(0, 16),
    location: '',
    reportedBy: '',
    witnesses: '',
    immediateAction: '',
    notes: ''
  });

  // Action form
  const [actionForm, setActionForm] = useState({
    description: '',
    actionPlan: '',
    assignedTo: '',
    dueDate: '',
    notes: ''
  });

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    totalInspections: {
      title: 'Total Inspections',
      details: [
        { label: 'Total', value: summary.totalInspections || 0 },
        { label: 'Completed', value: summary.completedInspections || 0 },
        { label: 'Pending Review', value: summary.pendingReview || 0 },
        { label: 'Pass Rate', value: `${summary.passRate?.toFixed(1) || 0}%` }
      ]
    },
    openIssues: {
      title: 'Open Issues',
      details: [
        { label: 'Open Issues', value: summary.openIssues || 0 },
        { label: 'In Progress', value: summary.inProgressIssues || 0 },
        { label: 'Resolved', value: summary.resolvedIssues || 0 },
        { label: 'Critical', value: summary.criticalIssues || 0 }
      ]
    },
    incidents: {
      title: 'Safety Incidents',
      details: [
        { label: 'Total Incidents', value: summary.totalIncidents || 0 },
        { label: 'Under Investigation', value: summary.underInvestigation || 0 },
        { label: 'Resolved', value: summary.resolvedIncidents || 0 },
        { label: 'This Month', value: summary.incidentsThisMonth || 0 }
      ]
    },
    passRate: {
      title: 'Pass Rate',
      details: [
        { label: 'Pass Rate', value: `${summary.passRate?.toFixed(1) || 0}%` },
        { label: 'Total Inspections', value: summary.totalInspections || 0 },
        { label: 'Passed', value: summary.completedInspections || 0 },
        { label: 'Failed', value: summary.failedInspections || 0 }
      ]
    }
  };

  // ============================================
  // HANDLE CARD HOVER
  // ============================================
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

  // ============================================
  // LOAD DATA
  // ============================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [types, checklistsData, inspectionsData, issuesData, incidentsData, summaryData] = await Promise.all([
        ApiService.getInspectionTypes().catch(() => []),
        ApiService.getChecklists().catch(() => []),
        ApiService.getInspections().catch(() => []),
        ApiService.getIssues().catch(() => []),
        ApiService.getSafetyIncidents().catch(() => []),
        ApiService.getQCSummary().catch(() => ({}))
      ]);

      setInspectionTypes(types);
      setChecklists(checklistsData);
      setInspections(inspectionsData);
      setIssues(issuesData);
      setIncidents(incidentsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // FILTER DATA
  // ============================================
  const filteredInspections = useMemo(() => {
    let filtered = inspections;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.title?.toLowerCase().includes(search) ||
        i.conductedBy?.toLowerCase().includes(search)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }
    return filtered;
  }, [inspections, searchTerm, statusFilter]);

  const filteredIssues = useMemo(() => {
    let filtered = issues;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.title?.toLowerCase().includes(search) ||
        i.description?.toLowerCase().includes(search)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }
    if (severityFilter !== 'all') {
      filtered = filtered.filter(i => i.severity === severityFilter);
    }
    return filtered;
  }, [issues, searchTerm, statusFilter, severityFilter]);

  const filteredIncidents = useMemo(() => {
    let filtered = incidents;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.title?.toLowerCase().includes(search) ||
        i.description?.toLowerCase().includes(search)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }
    return filtered;
  }, [incidents, searchTerm, statusFilter]);

  // ============================================
  // GET STATUS BADGE
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      'in_progress': { color: '#f59e0b', label: 'In Progress', icon: <Clock size={12} /> },
      'completed': { color: '#22c55e', label: 'Completed', icon: <CheckCircle size={12} /> },
      'pending_review': { color: '#3b82f6', label: 'Pending Review', icon: <HelpCircle size={12} /> },
      'approved': { color: '#22c55e', label: 'Approved', icon: <CheckCircle size={12} /> },
      'rejected': { color: '#ef4444', label: 'Rejected', icon: <XCircle size={12} /> },
      'open': { color: '#ef4444', label: 'Open', icon: <AlertCircle size={12} /> },
      'resolved': { color: '#22c55e', label: 'Resolved', icon: <CheckCircle size={12} /> },
      'closed': { color: '#6b7280', label: 'Closed', icon: <XCircle size={12} /> },
      'reported': { color: '#ef4444', label: 'Reported', icon: <AlertTriangle size={12} /> },
      'under_investigation': { color: '#f59e0b', label: 'Under Investigation', icon: <HelpCircle size={12} /> }
    };
    const c = config[status] || config['in_progress'];
    return (
      <span className={`status-badge ${status}`}>
        {c.icon} {c.label}
      </span>
    );
  };

  // ============================================
  // GET SEVERITY BADGE
  // ============================================
  const getSeverityBadge = (severity) => {
    const config = {
      low: { color: '#3b82f6', label: 'Low' },
      medium: { color: '#f59e0b', label: 'Medium' },
      high: { color: '#f97316', label: 'High' },
      critical: { color: '#ef4444', label: 'Critical' }
    };
    const c = config[severity] || config.medium;
    return (
      <span className={`severity-badge ${severity}`}>
        {c.label}
      </span>
    );
  };

  // ============================================
  // GET RATING STARS
  // ============================================
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />);
      } else {
        stars.push(<Star key={i} size={16} color="#30363d" />);
      }
    }
    return <div className="stars">{stars}</div>;
  };

  // ============================================
  // HANDLE INSPECTION CRUD
  // ============================================
  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = editingId 
        ? await ApiService.updateInspection(editingId, formData)
        : await ApiService.createInspection(formData);
      
      setSuccess(editingId ? '✅ Inspection updated!' : '✅ Inspection created!');
      await loadData();
      resetForm();
      setShowForm(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInspection = async (id) => {
    if (!window.confirm('Delete this inspection?')) return;
    try {
      await ApiService.deleteInspection(id);
      setSuccess('✅ Inspection deleted!');
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  // ============================================
  // HANDLE ISSUE CRUD
  // ============================================
  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await ApiService.createIssue(issueForm);
      setSuccess('✅ Issue reported successfully!');
      await loadData();
      setShowIssueForm(false);
      resetIssueForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetIssueForm = () => {
    setIssueForm({
      title: '',
      description: '',
      severity: 'medium',
      category: '',
      location: '',
      reportedBy: '',
      assignedTo: '',
      dueDate: '',
      notes: ''
    });
  };

  // ============================================
  // HANDLE INCIDENT CRUD
  // ============================================
  const handleSubmitIncident = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await ApiService.createSafetyIncident(incidentForm);
      setSuccess('✅ Safety incident reported!');
      await loadData();
      setShowIncidentForm(false);
      resetIncidentForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetIncidentForm = () => {
    setIncidentForm({
      title: '',
      description: '',
      incidentType: 'accident',
      severity: 'medium',
      incidentDate: new Date().toISOString().slice(0, 16),
      location: '',
      reportedBy: '',
      witnesses: '',
      immediateAction: '',
      notes: ''
    });
  };

  // ============================================
  // HANDLE CORRECTIVE ACTION
  // ============================================
  const handleSubmitAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await ApiService.addCorrectiveAction(selectedIssueId, actionForm);
      setSuccess('✅ Corrective action added!');
      await loadData();
      setShowActionForm(false);
      resetActionForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetActionForm = () => {
    setActionForm({
      description: '',
      actionPlan: '',
      assignedTo: '',
      dueDate: '',
      notes: ''
    });
  };

  const resetForm = () => {
    setFormData({
      inspectionTypeId: '',
      siteId: '',
      projectId: '',
      title: '',
      description: '',
      inspectionDate: new Date().toISOString().slice(0, 16),
      conductedBy: '',
      notes: ''
    });
    setEditingId(null);
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // ============================================
  // STATS ITEMS
  // ============================================
  const statItems = [
    { 
      id: 'totalInspections', 
      icon: Clipboard, 
      label: 'Total Inspections', 
      value: summary.totalInspections || 0,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      trend: 'neutral'
    },
    { 
      id: 'openIssues', 
      icon: AlertCircle, 
      label: 'Open Issues', 
      value: summary.openIssues || 0,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      trend: summary.openIssues > 0 ? 'down' : 'neutral'
    },
    { 
      id: 'incidents', 
      icon: AlertTriangle, 
      label: 'Safety Incidents', 
      value: summary.totalIncidents || 0,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      trend: 'neutral'
    },
    { 
      id: 'passRate', 
      icon: Target, 
      label: 'Pass Rate', 
      value: `${summary.passRate?.toFixed(1) || 0}%`,
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
      trend: (summary.passRate || 0) >= 70 ? 'up' : 'down'
    }
  ];

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  
  // Render Stats
  const renderStats = () => {
    return (
      <div className="stats-grid">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="stat-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon" style={{ background: item.bg, color: item.color }}>
                <Icon size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-label">{item.label}</span>
                <span className="stat-value">{item.value}</span>
              </div>
              <div className="stat-trend">
                {item.trend === 'up' && <TrendingUp size={16} color="#22c55e" />}
                {item.trend === 'down' && <TrendingDown size={16} color="#ef4444" />}
                {item.trend === 'neutral' && <BarChart3 size={16} color="#8a9bb5" />}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // RENDER TOOLTIP
  // ============================================
  const renderTooltip = () => {
    if (!hoveredCard || !cardDetails[hoveredCard]) return null;

    return (
      <div
        className="qc-card-tooltip"
        style={{
          position: 'fixed',
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          zIndex: 9999
        }}
      >
        <div className="qc-tooltip-header">
          <strong>{cardDetails[hoveredCard].title}</strong>
        </div>
        <div className="qc-tooltip-body">
          {cardDetails[hoveredCard].details.map((detail, idx) => (
            <div key={idx} className="qc-tooltip-row">
              <span className="qc-tooltip-label">{detail.label}</span>
              <span className="qc-tooltip-value">{detail.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = () => {
    return (
      <div className="qc-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
        <div className="qc-modal-content form-modal" onClick={e => e.stopPropagation()}>
          <div className="qc-modal-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            <div className="qc-modal-header-left">
              {editingId ? <Edit size={24} color="#ffffff" /> : <Clipboard size={24} color="#ffffff" />}
              <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Inspection' : 'New Inspection'}</h3>
            </div>
            <button className="qc-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="qc-modal-body">
            <form onSubmit={handleSubmitInspection}>
              <div className="form-row">
                <div className="form-group">
                  <label><FileText size={14} /> Inspection Type <span className="required">*</span></label>
                  <select
                    value={formData.inspectionTypeId}
                    onChange={e => setFormData({ ...formData, inspectionTypeId: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="">Select Type</option>
                    {inspectionTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label><FileText size={14} /> Title <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Inspection title"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><Building2 size={14} /> Site</label>
                  <select
                    value={formData.siteId}
                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Site</option>
                    {data.sites?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label><FolderKanban size={14} /> Project</label>
                  <select
                    value={formData.projectId}
                    onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Project</option>
                    {data.projects?.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><Calendar size={14} /> Inspection Date <span className="required">*</span></label>
                  <input
                    type="datetime-local"
                    value={formData.inspectionDate}
                    onChange={e => setFormData({ ...formData, inspectionDate: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><User size={14} /> Conducted By</label>
                  <input
                    type="text"
                    value={formData.conductedBy}
                    onChange={e => setFormData({ ...formData, conductedBy: e.target.value })}
                    placeholder="Inspector name"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label><FileText size={14} /> Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Inspection description"
                  rows="2"
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label><FileText size={14} /> Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER ISSUE FORM MODAL
  // ============================================
  const renderIssueFormModal = () => {
    return (
      <div className="qc-modal-overlay" onClick={() => { setShowIssueForm(false); resetIssueForm(); }}>
        <div className="qc-modal-content form-modal" onClick={e => e.stopPropagation()}>
          <div className="qc-modal-header" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <div className="qc-modal-header-left">
              <AlertCircle size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Report Issue</h3>
            </div>
            <button className="qc-modal-close" onClick={() => { setShowIssueForm(false); resetIssueForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="qc-modal-body">
            <form onSubmit={handleSubmitIssue}>
              <div className="form-row">
                <div className="form-group">
                  <label><FileText size={14} /> Title <span className="required">*</span></label>
                  <input
                    type="text"
                    value={issueForm.title}
                    onChange={e => setIssueForm({ ...issueForm, title: e.target.value })}
                    required
                    placeholder="Issue title"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><Tag size={14} /> Category</label>
                  <input
                    type="text"
                    value={issueForm.category}
                    onChange={e => setIssueForm({ ...issueForm, category: e.target.value })}
                    placeholder="e.g., Structural, Safety"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><AlertTriangle size={14} /> Severity <span className="required">*</span></label>
                  <select
                    value={issueForm.severity}
                    onChange={e => setIssueForm({ ...issueForm, severity: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><MapPin size={14} /> Location</label>
                  <input
                    type="text"
                    value={issueForm.location}
                    onChange={e => setIssueForm({ ...issueForm, location: e.target.value })}
                    placeholder="Location of issue"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label><FileText size={14} /> Description <span className="required">*</span></label>
                <textarea
                  value={issueForm.description}
                  onChange={e => setIssueForm({ ...issueForm, description: e.target.value })}
                  required
                  placeholder="Detailed description of the issue"
                  rows="3"
                  className="form-textarea"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><User size={14} /> Reported By</label>
                  <input
                    type="text"
                    value={issueForm.reportedBy}
                    onChange={e => setIssueForm({ ...issueForm, reportedBy: e.target.value })}
                    placeholder="Your name"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><Users size={14} /> Assigned To</label>
                  <input
                    type="text"
                    value={issueForm.assignedTo}
                    onChange={e => setIssueForm({ ...issueForm, assignedTo: e.target.value })}
                    placeholder="Assigned person"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label><Calendar size={14} /> Due Date</label>
                <input
                  type="date"
                  value={issueForm.dueDate}
                  onChange={e => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  <AlertCircle size={16} /> {loading ? 'Reporting...' : 'Report Issue'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowIssueForm(false); resetIssueForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER INCIDENT FORM MODAL
  // ============================================
  const renderIncidentFormModal = () => {
    return (
      <div className="qc-modal-overlay" onClick={() => { setShowIncidentForm(false); resetIncidentForm(); }}>
        <div className="qc-modal-content form-modal" onClick={e => e.stopPropagation()}>
          <div className="qc-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="qc-modal-header-left">
              <AlertTriangle size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Report Safety Incident</h3>
            </div>
            <button className="qc-modal-close" onClick={() => { setShowIncidentForm(false); resetIncidentForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="qc-modal-body">
            <form onSubmit={handleSubmitIncident}>
              <div className="form-row">
                <div className="form-group">
                  <label><FileText size={14} /> Title <span className="required">*</span></label>
                  <input
                    type="text"
                    value={incidentForm.title}
                    onChange={e => setIncidentForm({ ...incidentForm, title: e.target.value })}
                    required
                    placeholder="Incident title"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><Tag size={14} /> Incident Type <span className="required">*</span></label>
                  <select
                    value={incidentForm.incidentType}
                    onChange={e => setIncidentForm({ ...incidentForm, incidentType: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="accident">Accident</option>
                    <option value="near_miss">Near Miss</option>
                    <option value="injury">Injury</option>
                    <option value="property_damage">Property Damage</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><AlertTriangle size={14} /> Severity <span className="required">*</span></label>
                  <select
                    value={incidentForm.severity}
                    onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><Calendar size={14} /> Incident Date <span className="required">*</span></label>
                  <input
                    type="datetime-local"
                    value={incidentForm.incidentDate}
                    onChange={e => setIncidentForm({ ...incidentForm, incidentDate: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label><FileText size={14} /> Description <span className="required">*</span></label>
                <textarea
                  value={incidentForm.description}
                  onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  required
                  placeholder="Detailed description of the incident"
                  rows="3"
                  className="form-textarea"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><MapPin size={14} /> Location</label>
                  <input
                    type="text"
                    value={incidentForm.location}
                    onChange={e => setIncidentForm({ ...incidentForm, location: e.target.value })}
                    placeholder="Incident location"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><User size={14} /> Reported By</label>
                  <input
                    type="text"
                    value={incidentForm.reportedBy}
                    onChange={e => setIncidentForm({ ...incidentForm, reportedBy: e.target.value })}
                    placeholder="Your name"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label><Users size={14} /> Witnesses</label>
                <input
                  type="text"
                  value={incidentForm.witnesses}
                  onChange={e => setIncidentForm({ ...incidentForm, witnesses: e.target.value })}
                  placeholder="Names of witnesses (comma separated)"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label><FileText size={14} /> Immediate Action Taken</label>
                <textarea
                  value={incidentForm.immediateAction}
                  onChange={e => setIncidentForm({ ...incidentForm, immediateAction: e.target.value })}
                  placeholder="What action was taken immediately"
                  rows="2"
                  className="form-textarea"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  <AlertTriangle size={16} /> {loading ? 'Reporting...' : 'Report Incident'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowIncidentForm(false); resetIncidentForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER ACTION FORM MODAL
  // ============================================
  const renderActionFormModal = () => {
    return (
      <div className="qc-modal-overlay" onClick={() => { setShowActionForm(false); resetActionForm(); }}>
        <div className="qc-modal-content form-modal" onClick={e => e.stopPropagation()}>
          <div className="qc-modal-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <div className="qc-modal-header-left">
              <Wrench size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Add Corrective Action</h3>
            </div>
            <button className="qc-modal-close" onClick={() => { setShowActionForm(false); resetActionForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="qc-modal-body">
            <form onSubmit={handleSubmitAction}>
              <div className="form-group">
                <label><FileText size={14} /> Action Description <span className="required">*</span></label>
                <textarea
                  value={actionForm.description}
                  onChange={e => setActionForm({ ...actionForm, description: e.target.value })}
                  required
                  placeholder="Describe the corrective action"
                  rows="2"
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label><FileText size={14} /> Action Plan</label>
                <textarea
                  value={actionForm.actionPlan}
                  onChange={e => setActionForm({ ...actionForm, actionPlan: e.target.value })}
                  placeholder="Detailed action plan"
                  rows="2"
                  className="form-textarea"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><User size={14} /> Assigned To</label>
                  <input
                    type="text"
                    value={actionForm.assignedTo}
                    onChange={e => setActionForm({ ...actionForm, assignedTo: e.target.value })}
                    placeholder="Person responsible"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><Calendar size={14} /> Due Date</label>
                  <input
                    type="date"
                    value={actionForm.dueDate}
                    onChange={e => setActionForm({ ...actionForm, dueDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : 'Add Action'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowActionForm(false); resetActionForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedItem) return null;
    const item = selectedItem;

    return (
      <div className="qc-modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="qc-modal-content detail-modal" onClick={e => e.stopPropagation()}>
          <div className="qc-modal-header" style={{ background: 'linear-gradient(135deg, #1a2332, #2a3a4a)' }}>
            <div className="qc-modal-header-left">
              <FileText size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Details</h3>
            </div>
            <button className="qc-modal-close" onClick={() => setShowDetailModal(false)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="qc-modal-body">
            <div className="detail-grid">
              <div className="detail-section">
                <h4><FileText size={14} /> Basic Information</h4>
                <div className="detail-row"><span className="label">Title:</span><span className="value">{item.title}</span></div>
                <div className="detail-row"><span className="label">ID:</span><span className="value">{item.id}</span></div>
                <div className="detail-row"><span className="label">Status:</span><span className="value">{getStatusBadge(item.status)}</span></div>
              </div>
              <div className="detail-section">
                <h4><Calendar size={14} /> Dates</h4>
                <div className="detail-row"><span className="label">Date:</span><span className="value">{Utils.formatDate(item.inspectionDate || item.incidentDate)}</span></div>
                {item.dueDate && (
                  <div className="detail-row"><span className="label">Due Date:</span><span className="value">{Utils.formatDate(item.dueDate)}</span></div>
                )}
              </div>
              {item.description && (
                <div className="detail-section full-width">
                  <h4><FileText size={14} /> Description</h4>
                  <div className="detail-row"><span className="value">{item.description}</span></div>
                </div>
              )}
              {item.notes && (
                <div className="detail-section full-width">
                  <h4><FileText size={14} /> Notes</h4>
                  <div className="detail-row"><span className="value">{item.notes}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER DASHBOARD
  // ============================================
  const renderDashboard = () => {
    const recentInspections = inspections.slice(0, 5);
    const recentIssues = issues.slice(0, 5);

    return (
      <div className="dashboard-container">
        {renderStats()}
        {renderTooltip()}

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Recent Inspections</h3>
              <button className="btn-small" onClick={() => setViewMode('inspections')}>
                View All
              </button>
            </div>
            {recentInspections.map(inspection => (
              <div key={inspection.id} className="dashboard-item">
                <div className="item-info">
                  <span className="item-title">{inspection.title}</span>
                  <span className="item-sub">{Utils.formatDate(inspection.inspectionDate)}</span>
                </div>
                {getStatusBadge(inspection.status)}
              </div>
            ))}
            {recentInspections.length === 0 && (
              <div className="empty-state-small">No inspections found</div>
            )}
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <h3>Recent Issues</h3>
              <button className="btn-small" onClick={() => setViewMode('issues')}>
                View All
              </button>
            </div>
            {recentIssues.map(issue => (
              <div key={issue.id} className="dashboard-item">
                <div className="item-info">
                  <span className="item-title">{issue.title}</span>
                  <span className="item-sub">{issue.category || 'General'}</span>
                </div>
                <div className="item-badges">
                  {getSeverityBadge(issue.severity)}
                </div>
              </div>
            ))}
            {recentIssues.length === 0 && (
              <div className="empty-state-small">No issues found</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER INSPECTION CARD
  // ============================================
  const renderInspectionCard = (inspection) => {
    const isExpanded = expandedItems[inspection.id];

    return (
      <div key={inspection.id} className="inspection-card-modern">
        <div className="inspection-card-header">
          <div className="inspection-info">
            <div className="inspection-title">{inspection.title}</div>
            <div className="inspection-meta">
              <span className="inspection-type">{inspection.inspectionTypeName}</span>
              <span className="inspection-date">
                <Calendar size={12} /> {Utils.formatDate(inspection.inspectionDate)}
              </span>
            </div>
          </div>
          <div className="inspection-badges">
            {getStatusBadge(inspection.status)}
            {inspection.overallRating > 0 && renderStars(inspection.overallRating)}
          </div>
        </div>

        <div className="inspection-card-body">
          <div className="inspection-details">
            <div className="detail-item">
              <span className="label">Conducted By:</span>
              <span>{inspection.conductedBy || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Site:</span>
              <span>{inspection.siteName || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Score:</span>
              <span className="score">{inspection.score?.toFixed(1) || 0}%</span>
            </div>
            <div className="detail-item">
              <span className="label">Items:</span>
              <span>{inspection.passedItems || 0}/{inspection.totalItems || 0} passed</span>
            </div>
          </div>

          {inspection.description && (
            <div className="inspection-description">{inspection.description}</div>
          )}
        </div>

        <div className="inspection-card-footer">
          <div className="inspection-actions">
            <button className="btn-icon" onClick={() => {
              setSelectedItem(inspection);
              setShowDetailModal(true);
            }} title="View Details">
              <Eye size={15} />
            </button>
            <button className="btn-icon" onClick={() => {
              setEditingId(inspection.id);
              setFormData({
                inspectionTypeId: inspection.inspectionTypeId || '',
                siteId: inspection.siteId || '',
                projectId: inspection.projectId || '',
                title: inspection.title || '',
                description: inspection.description || '',
                inspectionDate: inspection.inspectionDate || '',
                conductedBy: inspection.conductedBy || '',
                notes: inspection.notes || ''
              });
              setShowForm(true);
            }} title="Edit">
              <Edit size={15} />
            </button>
            <button className="btn-icon" onClick={() => toggleExpand(inspection.id)}>
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="inspection-expanded">
            <div className="expanded-grid">
              <div><strong>Project:</strong> {inspection.projectName || 'N/A'}</div>
              <div><strong>Passed Items:</strong> {inspection.passedItems || 0}</div>
              <div><strong>Failed Items:</strong> {inspection.failedItems || 0}</div>
              <div><strong>Total Items:</strong> {inspection.totalItems || 0}</div>
            </div>
            {inspection.notes && (
              <div className="expanded-notes"><strong>Notes:</strong> {inspection.notes}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER ISSUE CARD
  // ============================================
  const renderIssueCard = (issue) => {
    const isExpanded = expandedItems[`issue_${issue.id}`];

    return (
      <div key={issue.id} className="issue-card-modern">
        <div className="issue-card-header">
          <div className="issue-info">
            <div className="issue-title">{issue.title}</div>
            <div className="issue-meta">
              <span className="issue-category">{issue.category || 'General'}</span>
              <span className="issue-location"><MapPin size={12} /> {issue.location || 'N/A'}</span>
            </div>
          </div>
          <div className="issue-badges">
            {getSeverityBadge(issue.severity)}
            {getStatusBadge(issue.status)}
          </div>
        </div>

        <div className="issue-card-body">
          {issue.description && (
            <div className="issue-description">{issue.description}</div>
          )}
          <div className="issue-details">
            <div className="detail-item">
              <span className="label">Reported By:</span>
              <span>{issue.reportedBy || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Assigned To:</span>
              <span>{issue.assignedTo || 'N/A'}</span>
            </div>
            {issue.dueDate && (
              <div className="detail-item">
                <span className="label">Due Date:</span>
                <span>{Utils.formatDate(issue.dueDate)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="issue-card-footer">
          <div className="issue-actions">
            <button className="btn-icon" onClick={() => {
              setSelectedItem(issue);
              setShowDetailModal(true);
            }} title="View Details">
              <Eye size={15} />
            </button>
            <button className="btn-icon" onClick={() => {
              setSelectedIssueId(issue.id);
              setShowActionForm(true);
            }} title="Add Action">
              <Wrench size={15} />
            </button>
            <button className="btn-icon" onClick={() => toggleExpand(`issue_${issue.id}`)}>
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {isExpanded && issue.resolutionNotes && (
          <div className="issue-expanded">
            <div className="expanded-notes"><strong>Resolution:</strong> {issue.resolutionNotes}</div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER INCIDENT CARD
  // ============================================
  const renderIncidentCard = (incident) => {
    return (
      <div key={incident.id} className="incident-card-modern">
        <div className="incident-card-header">
          <div className="incident-info">
            <div className="incident-title">{incident.title}</div>
            <div className="incident-meta">
              <span className="incident-type">{incident.incidentType}</span>
              <span className="incident-date">
                <Calendar size={12} /> {Utils.formatDate(incident.incidentDate)}
              </span>
            </div>
          </div>
          <div className="incident-badges">
            {getSeverityBadge(incident.severity)}
            {getStatusBadge(incident.status)}
          </div>
        </div>

        <div className="incident-card-body">
          {incident.description && (
            <div className="incident-description">{incident.description}</div>
          )}
          <div className="incident-details">
            <div className="detail-item">
              <span className="label">Reported By:</span>
              <span>{incident.reportedBy || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Location:</span>
              <span>{incident.location || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="incident-card-footer">
          <div className="incident-actions">
            <button className="btn-icon" onClick={() => {
              setSelectedItem(incident);
              setShowDetailModal(true);
            }} title="View Details">
              <Eye size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="quality-control-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <Shield size={28} />
            <span className="header-badge">QC</span>
          </div>
          <div>
            <h2>Quality Control & Inspection</h2>
            <p className="header-subtitle">Track quality checks, safety inspections, and compliance</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> New Inspection
          </button>
          <button className="btn-secondary" onClick={() => setShowIssueForm(true)}>
            <AlertCircle size={16} /> Report Issue
          </button>
          <button className="btn-secondary" onClick={() => setShowIncidentForm(true)}>
            <AlertTriangle size={16} /> Report Incident
          </button>
          <button className="btn-refresh-modern" onClick={loadData}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs-modern">
        <button
          className={`tab-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
          onClick={() => setViewMode('dashboard')}
        >
          <LayoutDashboard size={16} /> Dashboard
        </button>
        <button
          className={`tab-btn ${viewMode === 'inspections' ? 'active' : ''}`}
          onClick={() => setViewMode('inspections')}
        >
          <Clipboard size={16} /> Inspections
        </button>
        <button
          className={`tab-btn ${viewMode === 'issues' ? 'active' : ''}`}
          onClick={() => setViewMode('issues')}
        >
          <AlertCircle size={16} /> Issues
        </button>
        <button
          className={`tab-btn ${viewMode === 'incidents' ? 'active' : ''}`}
          onClick={() => setViewMode('incidents')}
        >
          <AlertTriangle size={16} /> Safety Incidents
        </button>
      </div>

      {/* Error/Success */}
      {error && <div className="error-message-modern"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="success-message-modern"><CheckCircle size={16} /> {success}</div>}

      {/* Filters */}
      {viewMode !== 'dashboard' && (
        <div className="filters-section-modern">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <div className="filter-group">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              {viewMode === 'inspections' && (
                <>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
              {viewMode === 'issues' && (
                <>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </>
              )}
              {viewMode === 'incidents' && (
                <>
                  <option value="reported">Reported</option>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </>
              )}
            </select>
            {viewMode === 'issues' && (
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                <option value="all">All Severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            )}
            <button className="btn-refresh-modern" onClick={loadData}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      ) : viewMode === 'dashboard' ? (
        renderDashboard()
      ) : viewMode === 'inspections' ? (
        <div className="inspections-grid">
          {filteredInspections.map(renderInspectionCard)}
          {filteredInspections.length === 0 && (
            <div className="empty-state">
              <Clipboard size={48} />
              <h3>No Inspections</h3>
              <p>Create your first inspection to get started.</p>
            </div>
          )}
        </div>
      ) : viewMode === 'issues' ? (
        <div className="issues-grid">
          {filteredIssues.map(renderIssueCard)}
          {filteredIssues.length === 0 && (
            <div className="empty-state">
              <AlertCircle size={48} />
              <h3>No Issues</h3>
              <p>No issues reported. Keep up the good work!</p>
            </div>
          )}
        </div>
      ) : viewMode === 'incidents' ? (
        <div className="incidents-grid">
          {filteredIncidents.map(renderIncidentCard)}
          {filteredIncidents.length === 0 && (
            <div className="empty-state">
              <AlertTriangle size={48} />
              <h3>No Incidents</h3>
              <p>No safety incidents reported. Stay safe!</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Modals */}
      {showForm && renderFormModal()}
      {showIssueForm && renderIssueFormModal()}
      {showIncidentForm && renderIncidentFormModal()}
      {showActionForm && renderActionFormModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default QualityControl;