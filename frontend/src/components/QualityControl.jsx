// src/components/QualityControl.jsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit, Trash2, Eye, X, Save,
  RefreshCw, ChevronDown, ChevronUp, CheckCircle,
  AlertCircle, Clock, Wrench, Shield, FileText,
  Calendar, User, Building2, MapPin, Tag, FolderKanban,
  AlertTriangle, Check, XCircle, HelpCircle,
  Star, TrendingUp, TrendingDown,
  Clipboard, LayoutDashboard, Target, Gauge,
  BarChart3, Info, ArrowUpRight, Crown, Users, HardHat,
  Activity, Flame, LineChart as LineChartIcon
} from 'lucide-react';
import Utils from '../utils/Utils';
import ApiService from '../services/ApiService';
import './QualityControl.css';

// ============================================
// ANIMATED NUMBER
// ============================================
const AnimatedNumber = ({ value, decimals = 0, suffix = '', duration = 700 }) => {
  const [display, setDisplay] = useState(Number(value) || 0);
  const prevRef = useRef(Number(value) || 0);
  const frameRef = useRef(null);

  useEffect(() => {
    const start = prevRef.current || 0;
    const end = Number(value) || 0;
    const diff = end - start;
    const startTime = performance.now();
    if (diff === 0) { setDisplay(end); return; }

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      else prevRef.current = end;
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => frameRef.current && cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const formatted = Number(display).toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  });
  return <>{formatted}{suffix}</>;
};

// ============================================
// DONUT GAUGE
// ============================================
const CircularGauge = ({ value = 0, max = 100, size = 120, stroke = 10, color = '#009846', label }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = circumference * pct;
  const gap = circumference - dash;
  return (
    <div className="qc-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="rgba(148,163,184,0.15)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="qc-gauge-center">
        <span className="qc-gauge-value">{Math.round(pct * 100)}%</span>
        {label && <span className="qc-gauge-label">{label}</span>}
      </div>
    </div>
  );
};

// ============================================
// SMOOTH CURVE
// ============================================
const SparkCurve = ({ data = [], color = '#009846', height = 120 }) => {
  if (!data || data.length === 0) return null;
  const width = 300;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 10) - 5]);

  const path = points.reduce((acc, [x, y], i, arr) => {
    if (i === 0) return `M ${x},${y}`;
    const [px, py] = arr[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C ${cx},${py} ${cx},${y} ${x},${y}`;
  }, '');
  const areaPath = `${path} L ${points[points.length-1][0]},${height} L ${points[0][0]},${height} Z`;
  const gradId = `sparkGrad-${color.replace('#','')}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill={color} />
      ))}
    </svg>
  );
};

// ============================================
// STACKED BARS
// ============================================
const StackedBars = ({ rows = [] }) => (
  <div className="qc-stacked-bars">
    {rows.map((row, i) => {
      const total = row.segments.reduce((s, x) => s + x.value, 0) || 1;
      return (
        <div key={i} className="qc-stacked-row">
          <div className="qc-stacked-label">{row.label}</div>
          <div className="qc-stacked-track">
            {row.segments.map((seg, j) => (
              <div key={j} className="qc-stacked-segment"
                style={{ width: `${(seg.value/total)*100}%`, background: seg.color }} />
            ))}
          </div>
          <div className="qc-stacked-value">{row.total ?? total}</div>
        </div>
      );
    })}
  </div>
);

// ============================================
// VERTICAL BARS
// ============================================
const VerticalBars = ({ data = [] }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="qc-vbars">
      {data.map((d, i) => (
        <div key={i} className="qc-vbar-column">
          <div className="qc-vbar-value">{d.value}</div>
          <div className="qc-vbar-track">
            <div className="qc-vbar-fill"
              style={{ height: `${(d.value/max)*100}%`, background: d.color }} />
          </div>
          <div className="qc-vbar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN
// ============================================
const QualityControl = ({ data, refreshData }) => {
  // ---- UI state ----
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // ---- Data ----
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [issues, setIssues] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ---- Forms ----
  const [formData, setFormData] = useState({
    inspectionTypeId: '', siteId: '', projectId: '', title: '', description: '',
    inspectionDate: new Date().toISOString().slice(0,16), conductedBy: '', notes: ''
  });
  const [issueForm, setIssueForm] = useState({
    title: '', description: '', severity: 'medium', category: '', location: '',
    reportedBy: '', assignedTo: '', dueDate: '', notes: ''
  });
  const [incidentForm, setIncidentForm] = useState({
    title: '', description: '', incidentType: 'accident', severity: 'medium',
    incidentDate: new Date().toISOString().slice(0,16), location: '', reportedBy: '',
    witnesses: '', immediateAction: '', notes: ''
  });
  const [actionForm, setActionForm] = useState({
    description: '', actionPlan: '', assignedTo: '', dueDate: '', notes: ''
  });

  // ============================================
  // LOAD
  // ============================================
  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [types, cls, insp, iss, inc, sum] = await Promise.all([
        ApiService.getInspectionTypes?.().catch(() => []) ?? Promise.resolve([]),
        ApiService.getChecklists?.().catch(() => []) ?? Promise.resolve([]),
        ApiService.getInspections?.().catch(() => []) ?? Promise.resolve([]),
        ApiService.getIssues?.().catch(() => []) ?? Promise.resolve([]),
        ApiService.getSafetyIncidents?.().catch(() => []) ?? Promise.resolve([]),
        ApiService.getQCSummary?.().catch(() => ({})) ?? Promise.resolve({})
      ]);
      setInspectionTypes(Array.isArray(types) ? types : []);
      setChecklists(Array.isArray(cls) ? cls : []);
      setInspections(Array.isArray(insp) ? insp : []);
      setIssues(Array.isArray(iss) ? iss : []);
      setIncidents(Array.isArray(inc) ? inc : []);
      setSummary(sum && typeof sum === 'object' ? sum : {});
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ============================================
  // FILTERS
  // ============================================
  const filteredInspections = useMemo(() => {
    let f = inspections;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(i => i.title?.toLowerCase().includes(s) || i.conductedBy?.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') f = f.filter(i => i.status === statusFilter);
    return f;
  }, [inspections, searchTerm, statusFilter]);

  const filteredIssues = useMemo(() => {
    let f = issues;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(i => i.title?.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') f = f.filter(i => i.status === statusFilter);
    if (severityFilter !== 'all') f = f.filter(i => i.severity === severityFilter);
    return f;
  }, [issues, searchTerm, statusFilter, severityFilter]);

  const filteredIncidents = useMemo(() => {
    let f = incidents;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(i => i.title?.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') f = f.filter(i => i.status === statusFilter);
    return f;
  }, [incidents, searchTerm, statusFilter]);

  // ============================================
  // DERIVED CHART DATA
  // ============================================
  const chartData = useMemo(() => {
    const totalInspections = summary.totalInspections || inspections.length || 0;
    const completedInspections = summary.completedInspections ||
      inspections.filter(i => i.status === 'completed' || i.status === 'approved').length;
    const openIssues = summary.openIssues ||
      issues.filter(i => i.status === 'open' || i.status === 'in_progress').length;
    const resolvedIssues = summary.resolvedIssues ||
      issues.filter(i => i.status === 'resolved' || i.status === 'closed').length;
    const totalIncidents = summary.totalIncidents || incidents.length;
    const resolvedIncidents = summary.resolvedIncidents ||
      incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
    const passRate = summary.passRate ??
      (totalInspections > 0 ? (completedInspections / totalInspections) * 100 : 0);
    const safetyScore = totalIncidents === 0 ? 100 : Math.max(0, 100 - totalIncidents * 5);

    const severitySpread = ['low','medium','high','critical'].map(sev => ({
      label: sev.charAt(0).toUpperCase() + sev.slice(1),
      value: issues.filter(i => i.severity === sev).length,
      color: sev === 'critical' ? 'linear-gradient(180deg,#ef4444,#b91c1c)'
        : sev === 'high' ? 'linear-gradient(180deg,#f97316,#ea580c)'
        : sev === 'medium' ? 'linear-gradient(180deg,#f59e0b,#d97706)'
        : 'linear-gradient(180deg,#3b82f6,#2563eb)'
    }));

    const trend = (() => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0,10);
        days.push(inspections.filter(insp =>
          insp.inspectionDate && insp.inspectionDate.slice(0,10) === iso
        ).length);
      }
      return days;
    })();

    const statusBreakdown = ['in_progress','completed','pending_review','approved','rejected']
      .map(st => ({
        label: st.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: inspections.filter(i => i.status === st).length,
        color: st === 'completed' || st === 'approved'
          ? 'linear-gradient(90deg,#009846,#00b856)'
          : st === 'rejected' ? 'linear-gradient(90deg,#dc2626,#ef4444)'
          : st === 'pending_review' ? 'linear-gradient(90deg,#3b82f6,#2563eb)'
          : 'linear-gradient(90deg,#f59e0b,#d97706)'
      }));

    const issueStack = [
      {
        label: 'Open',
        total: openIssues,
        segments: [
          { label: 'Critical', value: issues.filter(i => i.severity==='critical' && ['open','in_progress'].includes(i.status)).length, color: '#dc2626' },
          { label: 'High', value: issues.filter(i => i.severity==='high' && ['open','in_progress'].includes(i.status)).length, color: '#f97316' },
          { label: 'Medium', value: issues.filter(i => i.severity==='medium' && ['open','in_progress'].includes(i.status)).length, color: '#f59e0b' },
          { label: 'Low', value: issues.filter(i => i.severity==='low' && ['open','in_progress'].includes(i.status)).length, color: '#3b82f6' }
        ]
      },
      {
        label: 'Resolved',
        total: resolvedIssues,
        segments: [{ label: 'Resolved', value: resolvedIssues, color: '#009846' }]
      }
    ];

    return {
      totalInspections, completedInspections, openIssues, resolvedIssues,
      totalIncidents, resolvedIncidents, passRate, safetyScore,
      severitySpread, trend, statusBreakdown, issueStack
    };
  }, [summary, inspections, issues, incidents]);

  // ============================================
  // BADGES
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      in_progress: { label: 'In Progress', icon: <Clock size={11} /> },
      completed: { label: 'Completed', icon: <CheckCircle size={11} /> },
      pending_review: { label: 'Pending Review', icon: <HelpCircle size={11} /> },
      approved: { label: 'Approved', icon: <CheckCircle size={11} /> },
      rejected: { label: 'Rejected', icon: <XCircle size={11} /> },
      open: { label: 'Open', icon: <AlertCircle size={11} /> },
      resolved: { label: 'Resolved', icon: <CheckCircle size={11} /> },
      closed: { label: 'Closed', icon: <XCircle size={11} /> },
      reported: { label: 'Reported', icon: <AlertTriangle size={11} /> },
      under_investigation: { label: 'Under Investigation', icon: <HelpCircle size={11} /> }
    };
    const c = config[status] || config.in_progress;
    return <span className={`qc-status-badge ${status}`}>{c.icon} {c.label}</span>;
  };

  const getSeverityBadge = (severity) => {
    const config = {
      low: { label: 'Low' }, medium: { label: 'Medium' },
      high: { label: 'High' }, critical: { label: 'Critical' }
    };
    const c = config[severity] || config.medium;
    return <span className={`qc-severity-badge ${severity}`}>{c.label}</span>;
  };

  // ============================================
  // TOOLTIPS
  // ============================================
  const cardDetails = {
    totalInspections: { title: 'Total Inspections', details: [
      { label: 'Total', value: chartData.totalInspections },
      { label: 'Completed', value: chartData.completedInspections },
      { label: 'Pending Review', value: summary.pendingReview || 0 },
      { label: 'Pass Rate', value: `${chartData.passRate.toFixed(1)}%` }
    ]},
    openIssues: { title: 'Open Issues', details: [
      { label: 'Open', value: chartData.openIssues },
      { label: 'Resolved', value: chartData.resolvedIssues },
      { label: 'Critical', value: summary.criticalIssues || 0 },
      { label: 'Total', value: issues.length }
    ]},
    incidents: { title: 'Safety Incidents', details: [
      { label: 'Total', value: chartData.totalIncidents },
      { label: 'Under Investigation', value: summary.underInvestigation || 0 },
      { label: 'Resolved', value: chartData.resolvedIncidents },
      { label: 'This Month', value: summary.incidentsThisMonth || 0 }
    ]},
    passRate: { title: 'Pass Rate', details: [
      { label: 'Pass Rate', value: `${chartData.passRate.toFixed(1)}%` },
      { label: 'Total', value: chartData.totalInspections },
      { label: 'Completed', value: chartData.completedInspections },
      { label: 'Failed', value: summary.failedInspections || 0 }
    ]}
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // CRUD
  // ============================================
  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      if (editingId) await ApiService.updateInspection(editingId, formData);
      else await ApiService.createInspection(formData);
      setSuccess(editingId ? 'Inspection updated' : 'Inspection created');
      await loadData(); resetForm(); setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDeleteInspection = async (id) => {
    if (!window.confirm('Delete this inspection?')) return;
    try {
      await ApiService.deleteInspection(id);
      setSuccess('Inspection deleted');
      await loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
  };

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await ApiService.createIssue(issueForm);
      setSuccess('Issue reported');
      await loadData(); setShowIssueForm(false); resetIssueForm();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSubmitIncident = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await ApiService.createSafetyIncident(incidentForm);
      setSuccess('Incident reported');
      await loadData(); setShowIncidentForm(false); resetIncidentForm();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await ApiService.addCorrectiveAction(selectedIssueId, actionForm);
      setSuccess('Corrective action added');
      await loadData(); setShowActionForm(false); resetActionForm();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({
      inspectionTypeId: '', siteId: '', projectId: '', title: '', description: '',
      inspectionDate: new Date().toISOString().slice(0,16), conductedBy: '', notes: ''
    });
    setEditingId(null);
  };
  const resetIssueForm = () => setIssueForm({
    title: '', description: '', severity: 'medium', category: '', location: '',
    reportedBy: '', assignedTo: '', dueDate: '', notes: ''
  });
  const resetIncidentForm = () => setIncidentForm({
    title: '', description: '', incidentType: 'accident', severity: 'medium',
    incidentDate: new Date().toISOString().slice(0,16), location: '', reportedBy: '',
    witnesses: '', immediateAction: '', notes: ''
  });
  const resetActionForm = () => setActionForm({
    description: '', actionPlan: '', assignedTo: '', dueDate: '', notes: ''
  });

  const toggleExpand = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  // ============================================
  // STATS CARDS
  // ============================================
  const statItems = [
    { id: 'totalInspections', icon: Clipboard, label: 'Total Inspections',
      value: chartData.totalInspections, color: '#009846', bg: 'rgba(0,152,70,0.10)',
      accent: 'linear-gradient(90deg,#009846,#00b856)', trend: 'neutral',
      meta: `${chartData.completedInspections} completed` },
    { id: 'openIssues', icon: AlertCircle, label: 'Open Issues',
      value: chartData.openIssues, color: '#dc2626', bg: 'rgba(220,38,38,0.10)',
      accent: 'linear-gradient(90deg,#dc2626,#ef4444)',
      trend: chartData.openIssues > 0 ? 'down' : 'neutral',
      meta: `${chartData.resolvedIssues} resolved` },
    { id: 'incidents', icon: AlertTriangle, label: 'Safety Incidents',
      value: chartData.totalIncidents, color: '#dc2626', bg: 'rgba(220,38,38,0.10)',
      accent: 'linear-gradient(90deg,#dc2626,#f87171)', trend: 'neutral',
      meta: `${chartData.resolvedIncidents} resolved` },
    { id: 'passRate', icon: Target, label: 'Pass Rate',
      value: `${chartData.passRate.toFixed(1)}%`, color: '#009846', bg: 'rgba(0,152,70,0.10)',
      accent: 'linear-gradient(90deg,#009846,#00b856)',
      trend: chartData.passRate >= 70 ? 'up' : 'down',
      meta: chartData.passRate >= 70 ? 'Healthy' : 'Needs attention' }
  ];

  const renderStats = () => (
    <div className="qc-stats-grid">
      {statItems.map(item => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="qc-stat-card"
            onMouseEnter={(e) => handleCardHover(item.id, e)}
            onMouseLeave={handleCardLeave}
            onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
          >
            <div className="qc-stat-accent" style={{ background: item.accent }} />
            <div className="qc-stat-icon" style={{ background: item.bg, color: item.color }}>
              <Icon size={20} />
            </div>
            <div className="qc-stat-content">
              <span className="qc-stat-label">{item.label}</span>
              <span className="qc-stat-value">{item.value}</span>
              <span className="qc-stat-meta">{item.meta}</span>
            </div>
            <div className={`qc-stat-trend ${item.trend}`}>
              {item.trend === 'up' && <TrendingUp size={16} />}
              {item.trend === 'down' && <TrendingDown size={16} />}
              {item.trend === 'neutral' && <Activity size={16} />}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTooltip = () => {
    if (!hoveredCard || !cardDetails[hoveredCard]) return null;
    return (
      <div className="qc-card-tooltip"
        style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
        <div className="qc-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
        <div className="qc-tooltip-body">
          {cardDetails[hoveredCard].details.map((d, i) => (
            <div key={i} className="qc-tooltip-row">
              <span className="qc-tooltip-label">{d.label}</span>
              <span className="qc-tooltip-value">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // DASHBOARD
  // ============================================
  const renderDashboard = () => {
    const recentInspections = inspections.slice(0, 5);
    const recentIssues = issues.slice(0, 5);

    return (
      <div className="qc-dashboard">
        {renderStats()}
        {renderTooltip()}

        <div className="qc-chart-grid qc-chart-grid-2">
          <div className="qc-chart-card">
            <div className="qc-chart-header">
              <div>
                <h3><LineChartIcon size={15} /> Inspection Trend</h3>
                <span>Last 7 days</span>
              </div>
              <span className="qc-chart-badge">
                {chartData.trend.reduce((a,b) => a+b, 0)} total
              </span>
            </div>
            <div className="qc-chart-body">
              <SparkCurve data={chartData.trend} color="#009846" height={120} />
            </div>
            <div className="qc-chart-footer">
              {['6d','5d','4d','3d','2d','1d','Today'].map(l => <span key={l}>{l}</span>)}
            </div>
          </div>

          <div className="qc-chart-card">
            <div className="qc-chart-header">
              <div>
                <h3><Gauge size={15} /> Key Metrics</h3>
                <span>Overall health</span>
              </div>
            </div>
            <div className="qc-gauges-row">
              <CircularGauge value={chartData.passRate} size={120} color="#009846" label="PASS RATE" />
              <CircularGauge value={chartData.safetyScore} size={120}
                color={chartData.safetyScore >= 80 ? '#009846' : '#dc2626'} label="SAFETY" />
              <CircularGauge
                value={chartData.totalInspections > 0
                  ? (chartData.completedInspections / chartData.totalInspections) * 100 : 0}
                size={120} color="#009846" label="DONE" />
            </div>
          </div>
        </div>

        <div className="qc-chart-grid qc-chart-grid-2">
          <div className="qc-chart-card">
            <div className="qc-chart-header">
              <div>
                <h3><BarChart3 size={15} /> Inspections by Status</h3>
                <span>Current distribution</span>
              </div>
            </div>
            <div className="qc-chart-body qc-chart-body-pad">
              <StackedBars rows={chartData.statusBreakdown.map(s => ({
                label: s.label, total: s.value,
                segments: [{ label: s.label, value: s.value, color: s.color }]
              }))} />
            </div>
          </div>

          <div className="qc-chart-card">
            <div className="qc-chart-header">
              <div>
                <h3><Flame size={15} /> Issues by Severity</h3>
                <span>Distribution</span>
              </div>
            </div>
            <div className="qc-chart-body">
              <VerticalBars data={chartData.severitySpread} />
            </div>
          </div>
        </div>

        <div className="qc-chart-grid qc-chart-grid-2">
          <div className="qc-list-card">
            <div className="qc-list-header">
              <h3><Clipboard size={15} /> Recent Inspections</h3>
              <button className="qc-btn-link" onClick={() => setViewMode('inspections')}>
                View All <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="qc-list-body">
              {recentInspections.map(insp => (
                <div key={insp.id} className="qc-list-item">
                  <div className="qc-list-item-icon qc-list-icon-green"><Clipboard size={14} /></div>
                  <div className="qc-list-item-content">
                    <span className="qc-list-item-title">{insp.title}</span>
                    <span className="qc-list-item-sub">{Utils.formatDate(insp.inspectionDate)}</span>
                  </div>
                  {getStatusBadge(insp.status)}
                </div>
              ))}
              {recentInspections.length === 0 && <div className="qc-list-empty">No inspections yet</div>}
            </div>
          </div>

          <div className="qc-list-card">
            <div className="qc-list-header">
              <h3><AlertCircle size={15} /> Recent Issues</h3>
              <button className="qc-btn-link" onClick={() => setViewMode('issues')}>
                View All <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="qc-list-body">
              {recentIssues.map(issue => (
                <div key={issue.id} className="qc-list-item">
                  <div className="qc-list-item-icon qc-list-icon-red"><AlertCircle size={14} /></div>
                  <div className="qc-list-item-content">
                    <span className="qc-list-item-title">{issue.title}</span>
                    <span className="qc-list-item-sub">{issue.category || 'General'}</span>
                  </div>
                  {getSeverityBadge(issue.severity)}
                </div>
              ))}
              {recentIssues.length === 0 && <div className="qc-list-empty">No issues — great job!</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // CARD RENDERERS
  // ============================================
  const renderInspectionCard = (inspection) => {
    const isExpanded = expandedItems[inspection.id];
    return (
      <div key={inspection.id} className="qc-card">
        <div className="qc-card-accent qc-accent-green" />
        <div className="qc-card-header">
          <div className="qc-card-info">
            <div className="qc-card-title">{inspection.title}</div>
            <div className="qc-card-meta">
              <span className="qc-meta-pill">{inspection.inspectionTypeName || 'Inspection'}</span>
              <span className="qc-meta-item"><Calendar size={11} /> {Utils.formatDate(inspection.inspectionDate)}</span>
            </div>
          </div>
          <div className="qc-card-badges">{getStatusBadge(inspection.status)}</div>
        </div>
        <div className="qc-card-body">
          <div className="qc-details-grid">
            <div className="qc-detail-item">
              <span className="qc-detail-label">Conducted By</span>
              <span className="qc-detail-value">{inspection.conductedBy || 'N/A'}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Site</span>
              <span className="qc-detail-value">{inspection.siteName || 'N/A'}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Score</span>
              <span className="qc-detail-value qc-text-green">{inspection.score?.toFixed(1) || 0}%</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Items Passed</span>
              <span className="qc-detail-value">{inspection.passedItems || 0}/{inspection.totalItems || 0}</span>
            </div>
          </div>
          {inspection.description && <div className="qc-card-desc">{inspection.description}</div>}
        </div>
        <div className="qc-card-footer">
          <div className="qc-card-actions">
            <button className="qc-icon-btn" onClick={() => { setSelectedItem(inspection); setShowDetailModal(true); }} title="View">
              <Eye size={14} />
            </button>
            <button className="qc-icon-btn qc-icon-edit" onClick={() => {
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
              <Edit size={14} />
            </button>
            <button className="qc-icon-btn qc-icon-danger" onClick={() => handleDeleteInspection(inspection.id)} title="Delete">
              <Trash2 size={14} />
            </button>
            <button className="qc-icon-btn qc-icon-expand" onClick={() => toggleExpand(inspection.id)} title="Expand">
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="qc-expanded">
            <div className="qc-expanded-grid">
              <div className="qc-expanded-item">
                <span className="qc-expanded-label">Project</span>
                <span className="qc-expanded-value">{inspection.projectName || 'N/A'}</span>
              </div>
              <div className="qc-expanded-item">
                <span className="qc-expanded-label">Passed</span>
                <span className="qc-expanded-value">{inspection.passedItems || 0}</span>
              </div>
              <div className="qc-expanded-item">
                <span className="qc-expanded-label">Failed</span>
                <span className="qc-expanded-value">{inspection.failedItems || 0}</span>
              </div>
              <div className="qc-expanded-item">
                <span className="qc-expanded-label">Total</span>
                <span className="qc-expanded-value">{inspection.totalItems || 0}</span>
              </div>
            </div>
            {inspection.notes && <div className="qc-expanded-notes">{inspection.notes}</div>}
          </div>
        )}
      </div>
    );
  };

  const renderIssueCard = (issue) => {
    const isExpanded = expandedItems[`issue_${issue.id}`];
    return (
      <div key={issue.id} className="qc-card">
        <div className="qc-card-accent qc-accent-red" />
        <div className="qc-card-header">
          <div className="qc-card-info">
            <div className="qc-card-title">{issue.title}</div>
            <div className="qc-card-meta">
              <span className="qc-meta-pill">{issue.category || 'General'}</span>
              <span className="qc-meta-item"><MapPin size={11} /> {issue.location || 'N/A'}</span>
            </div>
          </div>
          <div className="qc-card-badges">
            {getSeverityBadge(issue.severity)}
            {getStatusBadge(issue.status)}
          </div>
        </div>
        <div className="qc-card-body">
          {issue.description && <div className="qc-card-desc">{issue.description}</div>}
          <div className="qc-details-grid">
            <div className="qc-detail-item">
              <span className="qc-detail-label">Reported By</span>
              <span className="qc-detail-value">{issue.reportedBy || 'N/A'}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Assigned To</span>
              <span className="qc-detail-value">{issue.assignedTo || 'N/A'}</span>
            </div>
            {issue.dueDate && (
              <div className="qc-detail-item">
                <span className="qc-detail-label">Due</span>
                <span className="qc-detail-value">{Utils.formatDate(issue.dueDate)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="qc-card-footer">
          <div className="qc-card-actions">
            <button className="qc-icon-btn" onClick={() => { setSelectedItem(issue); setShowDetailModal(true); }} title="View">
              <Eye size={14} />
            </button>
            <button className="qc-icon-btn qc-icon-purple" onClick={() => { setSelectedIssueId(issue.id); setShowActionForm(true); }} title="Add Action">
              <Wrench size={14} />
            </button>
            <button className="qc-icon-btn qc-icon-expand" onClick={() => toggleExpand(`issue_${issue.id}`)} title="Expand">
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
        {isExpanded && issue.resolutionNotes && (
          <div className="qc-expanded">
            <div className="qc-expanded-notes">{issue.resolutionNotes}</div>
          </div>
        )}
      </div>
    );
  };

  const renderIncidentCard = (incident) => (
    <div key={incident.id} className="qc-card">
      <div className="qc-card-accent qc-accent-red" />
      <div className="qc-card-header">
        <div className="qc-card-info">
          <div className="qc-card-title">{incident.title}</div>
          <div className="qc-card-meta">
            <span className="qc-meta-pill">{incident.incidentType}</span>
            <span className="qc-meta-item"><Calendar size={11} /> {Utils.formatDate(incident.incidentDate)}</span>
          </div>
        </div>
        <div className="qc-card-badges">
          {getSeverityBadge(incident.severity)}
          {getStatusBadge(incident.status)}
        </div>
      </div>
      <div className="qc-card-body">
        {incident.description && <div className="qc-card-desc">{incident.description}</div>}
        <div className="qc-details-grid">
          <div className="qc-detail-item">
            <span className="qc-detail-label">Reported By</span>
            <span className="qc-detail-value">{incident.reportedBy || 'N/A'}</span>
          </div>
          <div className="qc-detail-item">
            <span className="qc-detail-label">Location</span>
            <span className="qc-detail-value">{incident.location || 'N/A'}</span>
          </div>
        </div>
      </div>
      <div className="qc-card-footer">
        <div className="qc-card-actions">
          <button className="qc-icon-btn" onClick={() => { setSelectedItem(incident); setShowDetailModal(true); }} title="View">
            <Eye size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // MODALS
  // ============================================
  const renderFormModal = () => (
    <div className="qc-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
      <div className="qc-modal-content" onClick={e => e.stopPropagation()}>
        <div className="qc-modal-header qc-modal-header-green">
          <div className="qc-modal-header-left">
            <div className="qc-modal-header-icon">
              {editingId ? <Edit size={18} /> : <Clipboard size={18} />}
            </div>
            <div>
              <h3>{editingId ? 'Edit Inspection' : 'New Inspection'}</h3>
              <p className="qc-modal-subtitle">{editingId ? 'Update details' : 'Create a new inspection record'}</p>
            </div>
          </div>
          <button type="button" className="qc-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
            <X size={18} />
          </button>
        </div>
        <div className="qc-modal-body">
          <form onSubmit={handleSubmitInspection}>
            <div className="qc-form-row">
              <div className="qc-form-group">
                <label><FileText size={12} /> Inspection Type <span className="qc-required">*</span></label>
                <select value={formData.inspectionTypeId} onChange={e => setFormData({ ...formData, inspectionTypeId: e.target.value })} required className="qc-form-select">
                  <option value="">Select Type</option>
                  {inspectionTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>
              <div className="qc-form-group">
                <label><FileText size={12} /> Title <span className="qc-required">*</span></label>
                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="Inspection title" className="qc-form-input" />
              </div>
            </div>
            <div className="qc-form-row">
              <div className="qc-form-group">
                <label><Building2 size={12} /> Site</label>
                <select value={formData.siteId} onChange={e => setFormData({ ...formData, siteId: e.target.value })} className="qc-form-select">
                  <option value="">Select Site</option>
                  {data.sites?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="qc-form-group">
                <label><FolderKanban size={12} /> Project</label>
                <select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} className="qc-form-select">
                  <option value="">Select Project</option>
                  {data.projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="qc-form-row">
              <div className="qc-form-group">
                <label><Calendar size={12} /> Date <span className="qc-required">*</span></label>
                <input type="datetime-local" value={formData.inspectionDate} onChange={e => setFormData({ ...formData, inspectionDate: e.target.value })} required className="qc-form-input" />
              </div>
              <div className="qc-form-group">
                <label><User size={12} /> Conducted By</label>
                <input type="text" value={formData.conductedBy} onChange={e => setFormData({ ...formData, conductedBy: e.target.value })} placeholder="Inspector name" className="qc-form-input" />
              </div>
            </div>
            <div className="qc-form-group">
              <label><FileText size={12} /> Description</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Inspection description" rows="2" className="qc-form-textarea" />
            </div>
            <div className="qc-form-actions">
              <button type="submit" className="qc-btn-primary" disabled={loading}>
                <Save size={15} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
              </button>
              <button type="button" className="qc-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const renderIssueFormModal = () => (
    <div className="qc-modal-overlay" onClick={() => { setShowIssueForm(false); resetIssueForm(); }}>
      <div className="qc-modal-content" onClick={e => e.stopPropagation()}>
        <div className="qc-modal-header qc-modal-header-red">
          <div className="qc-modal-header-left">
            <div className="qc-modal-header-icon"><AlertCircle size={18} /></div>
            <div>
              <h3>Report Issue</h3>
              <p className="qc-modal-subtitle">Log a new quality or safety issue</p>
            </div>
          </div>
          <button type="button" className="qc-modal-close" onClick={() => { setShowIssueForm(false); resetIssueForm(); }}>
            <X size={18} />
          </button>
        </div>
        <div className="qc-modal-body">
          <form onSubmit={handleSubmitIssue}>
            <div className="qc-form-row">
              <div className="qc-form-group">
                <label><FileText size={12} /> Title <span className="qc-required">*</span></label>
                <input type="text" value={issueForm.title} onChange={e => setIssueForm({ ...issueForm, title: e.target.value })} required placeholder="Issue title" className="qc-form-input" autoFocus />
              </div>
              <div className="qc-form-group">
                <label><Tag size={12} /> Category</label>
                <input type="text" value={issueForm.category} onChange={e => setIssueForm({ ...issueForm, category: e.target.value })} placeholder="e.g., Structural" className="qc-form-input" />
              </div>
            </div>
            <div className="qc-form-row">
              <div className="qc-form-group">
                <label><AlertTriangle size={12} /> Severity <span className="qc-required">*</span></label>
                <select value={issueForm.severity} onChange={e => setIssueForm({ ...issueForm, severity: e.target.value })} required className="qc-form-select">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="qc-form-group">
                <label><MapPin size={12} /> Location</label>
                <input type="text" value={issueForm.location} onChange={e => setIssueForm({ ...issueForm, location: e.target.value })} placeholder="Location" className="qc-form-input" />
              </div>
            </div>
            <div className="qc-form-group">
              <label><FileText size={12} /> Description <span className="qc-required">*</span></label>
              <textarea value={issueForm.description} onChange={e => setIssueForm({ ...issueForm, description: e.target.value })} required placeholder="Detailed description" rows="3" className="qc-form-textarea" />
            </div>
            <div className="qc-form-row">
              <div className="qc-form-group">
                <label><User size={12} /> Reported By</label>
                <input type="text" value={issueForm.reportedBy} onChange={e => setIssueForm({ ...issueForm, reportedBy: e.target.value })} placeholder="Your name" className="qc-form-input" />
              </div>
              <div className="qc-form-group">
                <label><Users size={12} /> Assigned To</label>
                <input type="text" value={issueForm.assignedTo} onChange={e => setIssueForm({ ...issueForm, assignedTo: e.target.value })} placeholder="Assigned person" className="qc-form-input" />
              </div>
            </div>
            <div className="qc-form-group">
              <label><Calendar size={12} /> Due Date</label>
              <input type="date" value={issueForm.dueDate} onChange={e => setIssueForm({ ...issueForm, dueDate: e.target.value })} className="qc-form-input" />
            </div>
            <div className="qc-form-actions">
              <button type="submit" className="qc-btn-danger" disabled={loading}>
                <AlertCircle size={15} /> {loading ? 'Reporting...' : 'Report Issue'}
              </button>
              <button type="button" className="qc-btn-secondary" onClick={() => { setShowIssueForm(false); resetIssueForm(); }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const renderIncidentFormModal = () => (
    <div className="qc-modal-overlay" onClick={() => { setShowIncidentForm(false); resetIncidentForm(); }}>
      <div className="qc-modal-content" onClick={e => e.stopPropagation()}>
        <div className="qc-modal-header qc-modal-header-red">
          <div className="qc-modal-header-left">
            <div className="qc-modal-header-icon"><AlertTriangle size={18} /></div>
            <div>
              <h3>Report Safety Incident</h3>
              <p className="qc-modal-subtitle">Log a new safety incident</p>
            </div>
          </div>
          <button type="button" className="qc-modal-close" onClick={() => { setShowIncidentForm(false); resetIncidentForm(); }}>
            <X size={18} />
          </button>
        </div>
        <div className="qc-modal-body">
          <form onSubmit={handleSubmitIncident}>
            <div className="qc-form-row">
              <div className="qc-form-group">
                <label><FileText size={12} /> Title <span className="qc-required">*</span></label>
                <input type="text" value={incidentForm.title} onChange={e => setIncidentForm({ ...incidentForm, title: e.target.value })} required placeholder="Incident title" className="qc-form-input" autoFocus />
              </div>
              <div className="qc-form-group">
                <label><Tag size={12} /> Type <span className="qc-required">*</span></label>
                <select value={incidentForm.incidentType} onChange={e => setIncidentForm({ ...incidentForm, incidentType: e.target.value })} required className="qc-form-select">
                  <option value="accident">Accident</option>
                  <option value="near_miss">Near Miss</option>
                  <option value="injury">Injury</option>
                  <option value="property_damage">Property Damage</option>
                </select>
              </div>
            </div>
            <div className="qc-form-row">
              <div className="qc-form-group">
                <label><AlertTriangle size={12} /> Severity <span className="qc-required">*</span></label>
                <select value={incidentForm.severity} onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value })} required className="qc-form-select">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="qc-form-group">
                <label><Calendar size={12} /> Date <span className="qc-required">*</span></label>
                <input type="datetime-local" value={incidentForm.incidentDate} onChange={e => setIncidentForm({ ...incidentForm, incidentDate: e.target.value })} required className="qc-form-input" />
              </div>
            </div>
            <div className="qc-form-group">
              <label><FileText size={12} /> Description <span className="qc-required">*</span></label>
              <textarea value={incidentForm.description} onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })} required placeholder="Detailed description" rows="3" className="qc-form-textarea" />
            </div>
            <div className="qc-form-row">
              <div className="qc-form-group">
                <label><MapPin size={12} /> Location</label>
                <input type="text" value={incidentForm.location} onChange={e => setIncidentForm({ ...incidentForm, location: e.target.value })} placeholder="Location" className="qc-form-input" />
              </div>
              <div className="qc-form-group">
                <label><User size={12} /> Reported By</label>
                <input type="text" value={incidentForm.reportedBy} onChange={e => setIncidentForm({ ...incidentForm, reportedBy: e.target.value })} placeholder="Your name" className="qc-form-input" />
              </div>
            </div>
            <div className="qc-form-group">
              <label><Users size={12} /> Witnesses</label>
              <input type="text" value={incidentForm.witnesses} onChange={e => setIncidentForm({ ...incidentForm, witnesses: e.target.value })} placeholder="Names (comma separated)" className="qc-form-input" />
            </div>
            <div className="qc-form-group">
              <label><FileText size={12} /> Immediate Action Taken</label>
              <textarea value={incidentForm.immediateAction} onChange={e => setIncidentForm({ ...incidentForm, immediateAction: e.target.value })} placeholder="Immediate action" rows="2" className="qc-form-textarea" />
            </div>
            <div className="qc-form-actions">
              <button type="submit" className="qc-btn-danger" disabled={loading}>
                <AlertTriangle size={15} /> {loading ? 'Reporting...' : 'Report Incident'}
              </button>
              <button type="button" className="qc-btn-secondary" onClick={() => { setShowIncidentForm(false); resetIncidentForm(); }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const renderActionFormModal = () => (
    <div className="qc-modal-overlay" onClick={() => { setShowActionForm(false); resetActionForm(); }}>
      <div className="qc-modal-content" onClick={e => e.stopPropagation()}>
        <div className="qc-modal-header qc-modal-header-green">
          <div className="qc-modal-header-left">
            <div className="qc-modal-header-icon"><Wrench size={18} /></div>
            <div>
              <h3>Add Corrective Action</h3>
              <p className="qc-modal-subtitle">Log a corrective action for this issue</p>
            </div>
          </div>
          <button type="button" className="qc-modal-close" onClick={() => { setShowActionForm(false); resetActionForm(); }}>
            <X size={18} />
          </button>
        </div>
        <div className="qc-modal-body">
          <form onSubmit={handleSubmitAction}>
            <div className="qc-form-group">
              <label><FileText size={12} /> Action Description <span className="qc-required">*</span></label>
              <textarea value={actionForm.description} onChange={e => setActionForm({ ...actionForm, description: e.target.value })} required placeholder="Describe the corrective action" rows="2" className="qc-form-textarea" autoFocus />
            </div>
            <div className="qc-form-group">
              <label><FileText size={12} /> Action Plan</label>
              <textarea value={actionForm.actionPlan} onChange={e => setActionForm({ ...actionForm, actionPlan: e.target.value })} placeholder="Detailed action plan" rows="2" className="qc-form-textarea" />
            </div>
            <div className="qc-form-row">
              <div className="qc-form-group">
                <label><User size={12} /> Assigned To</label>
                <input type="text" value={actionForm.assignedTo} onChange={e => setActionForm({ ...actionForm, assignedTo: e.target.value })} placeholder="Person responsible" className="qc-form-input" />
              </div>
              <div className="qc-form-group">
                <label><Calendar size={12} /> Due Date</label>
                <input type="date" value={actionForm.dueDate} onChange={e => setActionForm({ ...actionForm, dueDate: e.target.value })} className="qc-form-input" />
              </div>
            </div>
            <div className="qc-form-actions">
              <button type="submit" className="qc-btn-primary" disabled={loading}>
                <Save size={15} /> {loading ? 'Saving...' : 'Add Action'}
              </button>
              <button type="button" className="qc-btn-secondary" onClick={() => { setShowActionForm(false); resetActionForm(); }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const renderDetailModal = () => {
    if (!selectedItem) return null;
    const item = selectedItem;
    return (
      <div className="qc-modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="qc-modal-content" onClick={e => e.stopPropagation()}>
          <div className="qc-modal-header qc-modal-header-dark">
            <div className="qc-modal-header-left">
              <div className="qc-modal-header-icon"><FileText size={18} /></div>
              <div>
                <h3>Details</h3>
                <p className="qc-modal-subtitle">{item.title}</p>
              </div>
            </div>
            <button type="button" className="qc-modal-close" onClick={() => setShowDetailModal(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="qc-modal-body">
            <div className="qc-detail-sections">
              <div className="qc-detail-section">
                <h4 className="qc-detail-section-title"><Info size={13} /> Basic</h4>
                <div className="qc-detail-row"><span className="qc-detail-row-label">Title</span><span className="qc-detail-row-value">{item.title}</span></div>
                <div className="qc-detail-row"><span className="qc-detail-row-label">ID</span><span className="qc-detail-row-value qc-mono">{item.id}</span></div>
                <div className="qc-detail-row"><span className="qc-detail-row-label">Status</span><span className="qc-detail-row-value">{getStatusBadge(item.status)}</span></div>
              </div>
              <div className="qc-detail-section">
                <h4 className="qc-detail-section-title"><Calendar size={13} /> Dates</h4>
                <div className="qc-detail-row"><span className="qc-detail-row-label">Date</span><span className="qc-detail-row-value">{Utils.formatDate(item.inspectionDate || item.incidentDate)}</span></div>
                {item.dueDate && <div className="qc-detail-row"><span className="qc-detail-row-label">Due</span><span className="qc-detail-row-value">{Utils.formatDate(item.dueDate)}</span></div>}
              </div>
              {item.description && (
                <div className="qc-detail-section">
                  <h4 className="qc-detail-section-title"><FileText size={13} /> Description</h4>
                  <p className="qc-detail-text">{item.description}</p>
                </div>
              )}
              {item.notes && (
                <div className="qc-detail-section">
                  <h4 className="qc-detail-section-title"><FileText size={13} /> Notes</h4>
                  <p className="qc-detail-text">{item.notes}</p>
                </div>
              )}
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
    <div className={`qc-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="qc-ambient">
        <div className="qc-ambient-orb qc-ambient-1" />
        <div className="qc-ambient-orb qc-ambient-2" />
        <div className="qc-ambient-orb qc-ambient-3" />
      </div>

      {/* Header */}
      <div className="qc-header">
        <div className="qc-header-left">
          <div className="qc-header-icon-wrapper">
            <Shield size={22} />
          </div>
          <div>
            <h2>Quality Control</h2>
            <p className="qc-header-subtitle">
              {chartData.totalInspections} inspections · {chartData.openIssues} open issues · {chartData.totalIncidents} incidents
            </p>
          </div>
        </div>
        <div className="qc-header-right">
          <button type="button" className="qc-btn-ghost" onClick={loadData}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="qc-btn-danger-ghost" onClick={() => setShowIssueForm(true)}>
            <AlertCircle size={14} /> Report Issue
          </button>
          <button type="button" className="qc-btn-danger-ghost" onClick={() => setShowIncidentForm(true)}>
            <AlertTriangle size={14} /> Report Incident
          </button>
          <button type="button" className="qc-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={15} /> New Inspection
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="qc-tabs">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inspections', label: 'Inspections', icon: Clipboard, count: inspections.length },
          { id: 'issues', label: 'Issues', icon: AlertCircle, count: issues.length },
          { id: 'incidents', label: 'Safety Incidents', icon: AlertTriangle, count: incidents.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`qc-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}
            >
              <Icon size={14} />
              <span>{t.label}</span>
              {typeof t.count === 'number' && <span className="qc-tab-count">{t.count}</span>}
            </button>
          );
        })}
      </div>

      {error && <div className="qc-banner qc-banner-error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="qc-banner qc-banner-success"><CheckCircle size={15} /> {success}</div>}

      {/* Filters */}
      {viewMode !== 'dashboard' && (
        <div className="qc-filters">
          <div className="qc-search-box">
            <Search size={15} className="qc-search-icon" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button type="button" className="qc-clear-search" onClick={() => setSearchTerm('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <div className="qc-filter-selects">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="qc-filter-select">
              <option value="all">All Status</option>
              {viewMode === 'inspections' && (<>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </>)}
              {viewMode === 'issues' && (<>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </>)}
              {viewMode === 'incidents' && (<>
                <option value="reported">Reported</option>
                <option value="under_investigation">Under Investigation</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </>)}
            </select>
            {viewMode === 'issues' && (
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="qc-filter-select">
                <option value="all">All Severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="qc-loading">
          <div className="qc-loading-spinner" />
          <span>Loading...</span>
        </div>
      ) : viewMode === 'dashboard' ? (
        renderDashboard()
      ) : viewMode === 'inspections' ? (
        <div className="qc-cards-grid">
          {filteredInspections.map(renderInspectionCard)}
          {filteredInspections.length === 0 && (
            <div className="qc-empty">
              <Clipboard size={44} />
              <h3>No Inspections</h3>
              <p>Create your first inspection to get started.</p>
            </div>
          )}
        </div>
      ) : viewMode === 'issues' ? (
        <div className="qc-cards-grid">
          {filteredIssues.map(renderIssueCard)}
          {filteredIssues.length === 0 && (
            <div className="qc-empty">
              <AlertCircle size={44} />
              <h3>No Issues</h3>
              <p>No issues reported — great work!</p>
            </div>
          )}
        </div>
      ) : viewMode === 'incidents' ? (
        <div className="qc-cards-grid">
          {filteredIncidents.map(renderIncidentCard)}
          {filteredIncidents.length === 0 && (
            <div className="qc-empty">
              <AlertTriangle size={44} />
              <h3>No Incidents</h3>
              <p>No safety incidents reported. Stay safe!</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Modals — all popups */}
      {showForm && renderFormModal()}
      {showIssueForm && renderIssueFormModal()}
      {showIncidentForm && renderIncidentFormModal()}
      {showActionForm && renderActionFormModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default QualityControl;