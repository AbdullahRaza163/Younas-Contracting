// src/components/ProjectDashboard.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Edit, Trash2, Eye, Calendar,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock,
  Users, Banknote, Building2, ChevronDown, ChevronUp, X, Save,
  RefreshCw, Printer, Download, Activity, Briefcase, Phone, Mail, User,
  FolderKanban, ArrowUpRight, FileText, Info, Gauge, Target,
  PlayCircle, PauseCircle, XCircle, BarChart3, Wallet, Shield,
  Layers, Circle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Flame, LineChart as LineChartIcon, PieChart as PieChartIcon,
  TrendingUp as TrendingUpIcon, Landmark, ClipboardList
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Utils from '../utils/Utils';
import './ProjectDashboard.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';
import { CONFIG } from '../config/constants';

const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

// ============================================
// MODAL PORTAL — escapes every stacking context
// ============================================
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// ANIMATED NUMBER
// ============================================
const AnimatedNumber = ({ value, decimals = 0, prefix = '', suffix = '', duration = 700 }) => {
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
  return <>{prefix}{formatted}{suffix}</>;
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
    <div className="pd-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="rgba(148,163,184,0.15)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="pd-gauge-center">
        <span className="pd-gauge-value">{Math.round(pct * 100)}%</span>
        {label && <span className="pd-gauge-label">{label}</span>}
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
  const gradId = `pdSparkGrad-${color.replace('#','')}`;

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
  <div className="pd-stacked-bars">
    {rows.map((row, i) => {
      const total = row.segments.reduce((s, x) => s + x.value, 0) || 1;
      return (
        <div key={i} className="pd-stacked-row">
          <div className="pd-stacked-label">{row.label}</div>
          <div className="pd-stacked-track">
            {row.segments.map((seg, j) => (
              <div key={j} className="pd-stacked-segment"
                style={{ width: `${(seg.value/total)*100}%`, background: seg.color }} />
            ))}
          </div>
          <div className="pd-stacked-value">{row.total ?? total}</div>
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
    <div className="pd-vbars">
      {data.map((d, i) => (
        <div key={i} className="pd-vbar-column">
          <div className="pd-vbar-value">{d.value}</div>
          <div className="pd-vbar-track">
            <div className="pd-vbar-fill"
              style={{ height: `${(d.value/max)*100}%`, background: d.color }} />
          </div>
          <div className="pd-vbar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN
// ============================================
const ProjectDashboard = ({ data, refreshData }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // Tabs — 'dashboard' | 'projects'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const [formData, setFormData] = useState({
    name: '', description: '', client: '', clientContact: '',
    clientPhone: '', clientEmail: '', siteId: '', budget: '',
    startDate: '', endDate: '', status: 'planning', priority: 'medium',
    projectManager: '', teamLead: '', notes: '', riskLevel: 'low'
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // LOAD
  // ============================================
  const loadProjects = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to load projects');
      const result = await response.json();
      setProjects(Array.isArray(result) ? result : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // ============================================
  // FILTERS
  // ============================================
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(s) ||
        p.code?.toLowerCase().includes(s) ||
        (p.client && p.client.toLowerCase().includes(s))
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(p => p.status === statusFilter);
    if (priorityFilter !== 'all') filtered = filtered.filter(p => p.priority === priorityFilter);
    return filtered;
  }, [projects, searchTerm, statusFilter, priorityFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, priorityFilter, itemsPerPage, activeTab]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active' || p.status === 'planning').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const cancelled = projects.filter(p => p.status === 'cancelled').length;
    const onHold = projects.filter(p => p.status === 'on_hold').length;
    const overdue = projects.filter(p =>
      p.status !== 'completed' && p.endDate && p.endDate < Utils.today()
    ).length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalActual = projects.reduce((sum, p) => sum + (p.actualCost || 0), 0);
    const totalRevenue = projects.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const totalProfit = projects.reduce((sum, p) => sum + ((p.revenue || 0) - (p.actualCost || 0)), 0);
    const avgProgress = total > 0
      ? projects.reduce((sum, p) => sum + (p.progress || 0), 0) / total : 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const budgetUtilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return {
      total, active, completed, cancelled, onHold, overdue,
      totalBudget, totalActual, totalRevenue, totalProfit,
      avgProgress, completionRate, budgetUtilization,
      isProfit: totalProfit >= 0
    };
  }, [projects]);

  // ============================================
  // CHART DATA
  // ============================================
  const chartData = useMemo(() => {
    const statusBreakdown = ['planning', 'active', 'on_hold', 'completed', 'cancelled']
      .map(st => {
        const count = projects.filter(p => p.status === st).length;
        return {
          key: st,
          label: st.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          value: count,
          color: st === 'active' ? '#009846'
            : st === 'completed' ? '#22c55e'
            : st === 'on_hold' ? '#3b82f6'
            : st === 'cancelled' ? '#dc2626'
            : '#f59e0b'
        };
      });

    const prioritySpread = ['low', 'medium', 'high', 'critical'].map(pr => ({
      label: pr.charAt(0).toUpperCase() + pr.slice(1),
      value: projects.filter(p => p.priority === pr).length,
      color: pr === 'critical' ? 'linear-gradient(180deg,#dc2626,#b91c1c)'
        : pr === 'high' ? 'linear-gradient(180deg,#f97316,#ea580c)'
        : pr === 'medium' ? 'linear-gradient(180deg,#f59e0b,#d97706)'
        : 'linear-gradient(180deg,#3b82f6,#2563eb)'
    }));

    const progressBuckets = [
      { label: '0-25%', value: projects.filter(p => (p.progress || 0) < 25).length },
      { label: '25-50%', value: projects.filter(p => (p.progress || 0) >= 25 && (p.progress || 0) < 50).length },
      { label: '50-75%', value: projects.filter(p => (p.progress || 0) >= 50 && (p.progress || 0) < 75).length },
      { label: '75-100%', value: projects.filter(p => (p.progress || 0) >= 75).length }
    ];

    const financials = [
      {
        label: 'Budget',
        total: Math.round(stats.totalBudget),
        segments: [{ label: 'Budget', value: stats.totalBudget, color: '#f59e0b' }]
      },
      {
        label: 'Actual Cost',
        total: Math.round(stats.totalActual),
        segments: [{ label: 'Actual', value: stats.totalActual, color: '#dc2626' }]
      },
      {
        label: 'Revenue',
        total: Math.round(stats.totalRevenue),
        segments: [{ label: 'Revenue', value: stats.totalRevenue, color: '#009846' }]
      },
      {
        label: 'Profit',
        total: Math.round(Math.abs(stats.totalProfit)),
        segments: [{
          label: 'Profit',
          value: Math.abs(stats.totalProfit),
          color: stats.totalProfit >= 0 ? '#009846' : '#dc2626'
        }]
      }
    ];

    const topRevenue = [...projects]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 7)
      .map(p => p.revenue || 0);

    return { statusBreakdown, prioritySpread, progressBuckets, financials, topRevenue };
  }, [projects, stats]);

  // ============================================
  // CONFIG HELPERS
  // ============================================
  const getStatusConfig = (status) => {
    const configs = {
      planning: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', label: 'Planning', icon: Clock },
      active: { color: '#009846', bg: 'rgba(0, 152, 70, 0.12)', label: 'Active', icon: PlayCircle },
      on_hold: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', label: 'On Hold', icon: PauseCircle },
      completed: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', label: 'Completed', icon: CheckCircle },
      cancelled: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', label: 'Cancelled', icon: XCircle }
    };
    return configs[status] || configs.planning;
  };

  const getPriorityConfig = (priority) => {
    const configs = {
      low: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', label: 'Low' },
      medium: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', label: 'Medium' },
      high: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', label: 'High' },
      critical: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', label: 'Critical' }
    };
    return configs[priority] || configs.medium;
  };

  const getHealthConfig = (health) => {
    const configs = {
      on_track: { color: '#009846', icon: CheckCircle, label: 'On Track' },
      at_risk: { color: '#f59e0b', icon: AlertCircle, label: 'At Risk' },
      behind: { color: '#f97316', icon: Circle, label: 'Behind' },
      critical: { color: '#dc2626', icon: XCircle, label: 'Critical' },
      overdue: { color: '#dc2626', icon: AlertCircle, label: 'Overdue' },
      completed: { color: '#22c55e', icon: CheckCircle, label: 'Completed' }
    };
    return configs[health] || configs.on_track;
  };

  const getCardGradient = (status) => {
    const gradients = {
      planning: 'linear-gradient(135deg, #f59e0b, #d97706)',
      active: 'linear-gradient(135deg, #009846, #007a38)',
      on_hold: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      completed: 'linear-gradient(135deg, #22c55e, #16a34a)',
      cancelled: 'linear-gradient(135deg, #dc2626, #b91c1c)'
    };
    return gradients[status] || gradients.planning;
  };

  // ============================================
  // CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const url = editingId ? `${API_BASE_URL}/projects/${editingId}` : `${API_BASE_URL}/projects`;
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save project');
      }
      setSuccess(editingId ? 'Project updated' : 'Project created');
      await loadProjects();
      resetForm();
      setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', client: '', clientContact: '',
      clientPhone: '', clientEmail: '', siteId: '', budget: '',
      startDate: '', endDate: '', status: 'planning', priority: 'medium',
      projectManager: '', teamLead: '', notes: '', riskLevel: 'low'
    });
    setEditingId(null);
  };

  const handleEdit = (project) => {
    setEditingId(project.id);
    setFormData({
      name: project.name || '', description: project.description || '',
      client: project.client || '', clientContact: project.clientContact || '',
      clientPhone: project.clientPhone || '', clientEmail: project.clientEmail || '',
      siteId: project.siteId || '', budget: project.budget || '',
      startDate: project.startDate || '', endDate: project.endDate || '',
      status: project.status || 'planning', priority: project.priority || 'medium',
      projectManager: project.projectManager || '', teamLead: project.teamLead || '',
      notes: project.notes || '', riskLevel: project.riskLevel || 'low'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE', headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to delete project');
      setSuccess('Project deleted');
      await loadProjects();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
  };

  const toggleExpand = (id) => setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  const clearFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setPriorityFilter('all');
  };
  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all' || priorityFilter !== 'all';

  // ============================================
  // EXPORT
  // ============================================
  const exportDashboardReport = () => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      [`${CONFIG.COMPANY_NAME || 'Haji Younas Contracting'} - PROJECT DASHBOARD REPORT`],
      ['Generated:', new Date().toLocaleString()],
      ['Total Projects:', stats.total],
      ['Active Projects:', stats.active],
      ['Completed Projects:', stats.completed],
      ['On Hold Projects:', stats.onHold],
      ['Cancelled Projects:', stats.cancelled],
      ['Overdue Projects:', stats.overdue],
      [],
      ['=== FINANCIAL SUMMARY ==='],
      ['Metric', 'Amount (BD)'],
      ['Total Budget', stats.totalBudget],
      ['Total Actual Cost', stats.totalActual],
      ['Total Revenue', stats.totalRevenue],
      ['Total Profit', stats.totalProfit],
      ['Average Progress', `${stats.avgProgress.toFixed(1)}%`]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');
    const projectData = projects.map(p => ({
      'Code': p.code || `PRJ-${String(p.id).padStart(4, '0')}`,
      'Name': p.name,
      'Client': p.client || 'N/A',
      'Status': getStatusConfig(p.status).label,
      'Priority': getPriorityConfig(p.priority).label,
      'Budget': p.budget || 0,
      'Actual Cost': p.actualCost || 0,
      'Revenue': p.revenue || 0,
      'Profit': (p.revenue || 0) - (p.actualCost || 0),
      'Progress': `${(p.progress || 0).toFixed(1)}%`,
      'Start Date': p.startDate || 'N/A',
      'End Date': p.endDate || 'N/A',
      'Project Manager': p.projectManager || 'N/A',
      'Team Lead': p.teamLead || 'N/A',
      'Risk Level': p.riskLevel || 'N/A'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projectData), 'Projects');
    XLSX.writeFile(wb, `project_dashboard_report_${Utils.today()}.xlsx`);
  };

  // ============================================
  // PRINT REPORT
  // ============================================
  const generateReportHTML = () => {
    const companyName = data?.companyName || CONFIG.COMPANY_NAME || 'Haji Younas Contracting';
    const primary = '#0b1a12';
    const secondary = '#009846';
    const light = '#e8f5ee';
    const muted = '#5b7267';
    const border = '#c8d6ce';
    const text = '#0b1a12';
    const statusLabels = {
      planning: 'Planning', active: 'Active', on_hold: 'On Hold',
      completed: 'Completed', cancelled: 'Cancelled'
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Project Dashboard Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: #fff;
      font-family: 'Times New Roman', Arial, serif;
      color: ${text};
    }
    .report-container { width: 100%; display: flex; flex-direction: column; min-height: 100vh; position: relative; }
    .report-background { position: fixed; inset: 0; z-index: 0; pointer-events: none;
      display: flex; justify-content: center; align-items: center; opacity: 0.06; }
    .report-background img { width: 70%; max-width: 600px; }
    .report-content-wrapper { position: relative; z-index: 1; display: flex; flex-direction: column;
      min-height: 100vh; width: 100%; }
    .report-header-img img, .report-footer-img img { width: 100%; height: auto; display: block; }
    .report-content { flex: 1; padding: 20px 40px 30px; }
    .report-title { text-align: center; font-size: 20px; font-weight: 800; color: ${primary};
      letter-spacing: 2px; padding: 10px 0; border-bottom: 3px solid ${secondary};
      text-transform: uppercase; margin-bottom: 10px; }
    .report-period { text-align: center; font-size: 14px; color: ${muted}; margin-bottom: 16px; }
    .report-section { margin: 16px 0; }
    .report-section-title { font-size: 14px; font-weight: 700; color: ${primary};
      padding: 6px 12px; background: ${light}; border-left: 4px solid ${secondary};
      text-transform: uppercase; margin-bottom: 10px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .stat-box { padding: 12px 16px; border: 1px solid ${border}; border-radius: 4px; background: #fafafa; }
    .stat-box .label { font-size: 10px; color: ${muted}; text-transform: uppercase; font-weight: 600; }
    .stat-box .value { font-size: 18px; font-weight: 700; color: ${primary}; margin-top: 4px; }
    .stat-box .value.positive { color: #009846; }
    .stat-box .value.negative { color: #dc2626; }
    .report-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
    .report-table thead { background: ${primary}; }
    .report-table th { color: #fff; padding: 6px 8px; text-align: center; font-size: 9px;
      text-transform: uppercase; font-weight: 700; }
    .report-table td { padding: 5px 8px; border-bottom: 1px solid ${border};
      text-align: center; font-size: 10px; }
    .report-table td:first-child { text-align: left; font-weight: 600; }
    .report-table .positive { color: #009846; }
    .report-table .negative { color: #dc2626; }
    @media print {
      @page { margin: 0; size: A4 landscape; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-table thead, .report-table th, .stat-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    @media screen { .report-container { max-width: 100%; margin: 0 auto;
      box-shadow: 0 4px 30px rgba(0,0,0,0.12); border: 1px solid ${border}; } }
    @media screen and (max-width: 768px) {
      .report-content { padding: 12px 16px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .report-table { font-size: 9px; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-background"><img src='${background}' alt="Background" /></div>
    <div class="report-content-wrapper">
      <div class="report-header-img"><img src="${letterheadHeader}" alt="Letterhead" /></div>
      <div class="report-content">
        <div class="report-title">Project Dashboard Report</div>
        <div class="report-period">
          Generated: ${new Date().toLocaleString()} | Total Projects: ${stats.total}
        </div>
        <div class="report-section">
          <div class="report-section-title">Project Summary</div>
          <div class="stats-grid">
            <div class="stat-box"><div class="label">Total Projects</div><div class="value">${stats.total}</div></div>
            <div class="stat-box"><div class="label">Active</div><div class="value">${stats.active}</div></div>
            <div class="stat-box"><div class="label">Completed</div><div class="value">${stats.completed}</div></div>
            <div class="stat-box"><div class="label">Overdue</div><div class="value ${stats.overdue > 0 ? 'negative' : ''}">${stats.overdue}</div></div>
          </div>
        </div>
        <div class="report-section">
          <div class="report-section-title">Financial Summary</div>
          <div class="stats-grid">
            <div class="stat-box"><div class="label">Total Budget</div><div class="value">${Utils.formatCurrency(stats.totalBudget)}</div></div>
            <div class="stat-box"><div class="label">Total Actual Cost</div><div class="value">${Utils.formatCurrency(stats.totalActual)}</div></div>
            <div class="stat-box"><div class="label">Total Revenue</div><div class="value positive">${Utils.formatCurrency(stats.totalRevenue)}</div></div>
            <div class="stat-box"><div class="label">Total Profit</div><div class="value ${stats.isProfit ? 'positive' : 'negative'}">${Utils.formatCurrency(stats.totalProfit)}</div></div>
          </div>
        </div>
        ${filteredProjects.length > 0 ? `
          <div class="report-section">
            <div class="report-section-title">Project List</div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>#</th><th>Code</th><th>Project Name</th><th>Client</th>
                  <th>Status</th><th>Priority</th><th>Budget</th><th>Profit</th><th>Progress</th>
                </tr>
              </thead>
              <tbody>
                ${filteredProjects.slice(0, 30).map((project, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${project.code || `PRJ-${String(project.id).padStart(4, '0')}`}</td>
                    <td>${project.name}</td>
                    <td>${project.client || 'N/A'}</td>
                    <td>${statusLabels[project.status] || project.status}</td>
                    <td>${getPriorityConfig(project.priority).label}</td>
                    <td>${Utils.formatCurrencyShort(project.budget || 0)}</td>
                    <td class="${(project.revenue || 0) - (project.actualCost || 0) >= 0 ? 'positive' : 'negative'}">
                      ${Utils.formatCurrencyShort((project.revenue || 0) - (project.actualCost || 0))}
                    </td>
                    <td>${(project.progress || 0).toFixed(0)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
      <div class="report-footer-img"><img src="${letterheadFooter}" alt="Footer" /></div>
    </div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };<\/script>
</body>
</html>
    `;
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) { alert('Please allow popups to print'); return; }
    printWindow.document.write(generateReportHTML());
    printWindow.document.close();
    printWindow.focus();
  };

  // ============================================
  // CARD TOOLTIPS
  // ============================================
  const cardDetails = {
    total: { title: 'Total Projects', details: [
      { label: 'Total', value: stats.total },
      { label: 'Active', value: stats.active },
      { label: 'Completed', value: stats.completed },
      { label: 'On Hold', value: stats.onHold }
    ]},
    active: { title: 'Active Projects', details: [
      { label: 'Active', value: stats.active },
      { label: 'Planning', value: projects.filter(p => p.status === 'planning').length },
      { label: 'On Hold', value: stats.onHold },
      { label: 'Avg Progress', value: `${stats.avgProgress.toFixed(1)}%` }
    ]},
    completed: { title: 'Completed Projects', details: [
      { label: 'Completed', value: stats.completed },
      { label: 'Completion Rate', value: `${stats.completionRate.toFixed(1)}%` },
      { label: 'Total Revenue', value: Utils.formatCurrency(stats.totalRevenue) },
      { label: 'Total Profit', value: Utils.formatCurrency(stats.totalProfit) }
    ]},
    overdue: { title: 'Overdue Projects', details: [
      { label: 'Overdue', value: stats.overdue },
      { label: 'Active', value: stats.active },
      { label: 'On Hold', value: stats.onHold },
      { label: 'Critical Priority', value: projects.filter(p => p.priority === 'critical' && p.status !== 'completed').length }
    ]},
    budget: { title: 'Total Budget', details: [
      { label: 'Budget', value: Utils.formatCurrency(stats.totalBudget) },
      { label: 'Actual Cost', value: Utils.formatCurrency(stats.totalActual) },
      { label: 'Variance', value: Utils.formatCurrency(stats.totalBudget - stats.totalActual) },
      { label: 'Utilization', value: `${stats.budgetUtilization.toFixed(1)}%` }
    ]},
    revenue: { title: 'Total Revenue', details: [
      { label: 'Revenue', value: Utils.formatCurrency(stats.totalRevenue) },
      { label: 'Profit', value: Utils.formatCurrency(stats.totalProfit) },
      { label: 'Profit Margin', value: stats.totalRevenue > 0 ? `${((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)}%` : '0%' },
      { label: 'Completed', value: stats.completed }
    ]}
  };

  // ============================================
  // STATS CARDS
  // ============================================
  const statItems = [
    { id: 'total', icon: Briefcase, label: 'Total Projects', value: stats.total,
      meta: `${stats.completionRate.toFixed(0)}% completion rate`,
      color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)',
      accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'neutral' },
    { id: 'active', icon: Activity, label: 'Active Projects', value: stats.active,
      meta: `${stats.avgProgress.toFixed(0)}% avg progress`,
      color: '#009846', bg: 'rgba(0, 152, 70, 0.12)',
      accent: 'linear-gradient(90deg,#009846,#00b856)', trend: 'up' },
    { id: 'completed', icon: CheckCircle, label: 'Completed', value: stats.completed,
      meta: `${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}% of projects`,
      color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)',
      accent: 'linear-gradient(90deg,#22c55e,#16a34a)', trend: 'up' },
    { id: 'overdue', icon: AlertCircle, label: 'Overdue', value: stats.overdue,
      meta: stats.overdue > 0 ? 'Needs attention' : 'All on schedule',
      color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)',
      accent: 'linear-gradient(90deg,#dc2626,#ef4444)',
      trend: stats.overdue > 0 ? 'down' : 'neutral' },
    { id: 'budget', icon: Banknote, label: 'Total Budget',
      value: Utils.formatCurrencyShort(stats.totalBudget),
      meta: `${stats.budgetUtilization.toFixed(0)}% utilized`,
      color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)',
      accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'neutral' },
    { id: 'revenue', icon: TrendingUp, label: 'Total Revenue',
      value: Utils.formatCurrencyShort(stats.totalRevenue),
      meta: stats.isProfit ? 'Profitable' : 'In loss',
      color: '#009846', bg: 'rgba(0, 152, 70, 0.12)',
      accent: 'linear-gradient(90deg,#009846,#00b856)',
      trend: stats.isProfit ? 'up' : 'down' }
  ];

  const renderStats = () => (
    <div className="pd-stats-grid">
      {statItems.map(item => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="pd-stat-card"
            onMouseEnter={(e) => handleCardHover(item.id, e)}
            onMouseLeave={handleCardLeave}
            onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
          >
            <div className="pd-stat-accent" style={{ background: item.accent }} />
            <div className="pd-stat-icon" style={{ background: item.bg, color: item.color }}>
              <Icon size={20} />
            </div>
            <div className="pd-stat-content">
              <span className="pd-stat-label">{item.label}</span>
              <span className="pd-stat-value">{item.value}</span>
              <span className="pd-stat-meta">{item.meta}</span>
            </div>
            <div className={`pd-stat-trend ${item.trend}`}>
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
      <div className="pd-card-tooltip"
        style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
        <div className="pd-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
        <div className="pd-tooltip-body">
          {cardDetails[hoveredCard].details.map((d, i) => (
            <div key={i} className="pd-tooltip-row">
              <span className="pd-tooltip-label">{d.label}</span>
              <span className="pd-tooltip-value">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // TABS
  // ============================================
  const renderTabs = () => {
    const tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3, badge: null },
      { id: 'projects', label: 'Projects', icon: FolderKanban, badge: filteredProjects.length }
    ];
    return (
      <div className="pd-tabs" role="tablist">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`pd-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span className="pd-tab-badge">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // ============================================
  // DASHBOARD TAB CONTENT
  // ============================================
  const renderDashboardTab = () => (
    <div className="pd-tab-panel">
      {stats.total === 0 && !loading ? (
        <div className="pd-empty">
          <div className="pd-empty-icon-wrapper">
            <BarChart3 size={44} />
          </div>
          <h3>No data to display</h3>
          <p>Create your first project to see dashboard analytics.</p>
          <button type="button" className="pd-btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={15} /> Create Project
          </button>
        </div>
      ) : (
        renderDashboard()
      )}
    </div>
  );

  // ============================================
  // PROJECTS TAB CONTENT
  // ============================================
  const renderProjectsTab = () => (
    <div className="pd-tab-panel">
      {/* Filters */}
      <div className="pd-filters">
        <div className="pd-search-box">
          <Search size={15} className="pd-search-icon" />
          <input type="text" placeholder="Search projects..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button type="button" className="pd-clear-search" onClick={() => setSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="pd-filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="pd-filter-select">
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="pd-filter-select">
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        {hasActiveFilters && (
          <button type="button" className="pd-clear-filters" onClick={clearFilters}>
            <X size={13} /> Clear
          </button>
        )}
        <span className="pd-result-count">
          Showing {filteredProjects.length} of {projects.length}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="pd-loading">
          <div className="pd-loading-spinner" />
          <span>Loading projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="pd-empty">
          <div className="pd-empty-icon-wrapper">
            {hasActiveFilters ? <Search size={44} /> : <FolderKanban size={44} />}
          </div>
          <h3>{hasActiveFilters ? 'No matching projects' : 'No projects yet'}</h3>
          <p>{hasActiveFilters ? 'Try adjusting your search or filters.' : 'Create your first project to get started.'}</p>
          {hasActiveFilters ? (
            <button type="button" className="pd-btn-secondary" onClick={clearFilters}>
              <X size={14} /> Clear filters
            </button>
          ) : (
            <button type="button" className="pd-btn-primary"
              onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={15} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="pd-grid">
            {paginatedProjects.map((p, i) => renderProjectCard(p, i))}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );

  // ============================================
  // DASHBOARD CHARTS
  // ============================================
  const renderDashboard = () => {
    return (
      <div className="pd-dashboard-charts">
        {/* Row 1 */}
        <div className="pd-chart-grid pd-chart-grid-2">
          <div className="pd-chart-card">
            <div className="pd-chart-header">
              <div>
                <h3><LineChartIcon size={15} /> Top Revenue Projects</h3>
                <span>Highest earning projects</span>
              </div>
              <span className="pd-chart-badge">{projects.length} total</span>
            </div>
            <div className="pd-chart-body">
              <SparkCurve data={chartData.topRevenue} color="#009846" height={120} />
            </div>
            <div className="pd-chart-footer">
              {chartData.topRevenue.map((_, i) => <span key={i}>P{i+1}</span>)}
            </div>
          </div>

          <div className="pd-chart-card">
            <div className="pd-chart-header">
              <div>
                <h3><Gauge size={15} /> Key Metrics</h3>
                <span>Overall health</span>
              </div>
            </div>
            <div className="pd-gauges-row">
              <CircularGauge value={stats.avgProgress} size={110} color="#009846" label="AVG PROGRESS" />
              <CircularGauge value={stats.completionRate} size={110} color="#22c55e" label="COMPLETION" />
              <CircularGauge value={Math.min(stats.budgetUtilization, 100)} size={110}
                color={stats.budgetUtilization > 100 ? '#dc2626' : '#3b82f6'} label="BUDGET USE" />
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="pd-chart-grid pd-chart-grid-2">
          <div className="pd-chart-card">
            <div className="pd-chart-header">
              <div>
                <h3><BarChart3 size={15} /> Projects by Status</h3>
                <span>Current distribution</span>
              </div>
            </div>
            <div className="pd-chart-body pd-chart-body-pad">
              <StackedBars rows={chartData.statusBreakdown.map(s => ({
                label: s.label, total: s.value,
                segments: [{ label: s.label, value: s.value, color: s.color }]
              }))} />
            </div>
          </div>

          <div className="pd-chart-card">
            <div className="pd-chart-header">
              <div>
                <h3><Flame size={15} /> Projects by Priority</h3>
                <span>Distribution</span>
              </div>
            </div>
            <div className="pd-chart-body">
              <VerticalBars data={chartData.prioritySpread} />
            </div>
          </div>
        </div>

        {/* Row 3 — Progress buckets + Financials */}
        <div className="pd-chart-grid pd-chart-grid-2">
          <div className="pd-chart-card">
            <div className="pd-chart-header">
              <div>
                <h3><Target size={15} /> Progress Distribution</h3>
                <span>How far along are the projects?</span>
              </div>
            </div>
            <div className="pd-chart-body">
              <VerticalBars data={chartData.progressBuckets.map((b, i) => ({
                ...b,
                color: i === 0 ? 'linear-gradient(180deg,#dc2626,#b91c1c)'
                  : i === 1 ? 'linear-gradient(180deg,#f59e0b,#d97706)'
                  : i === 2 ? 'linear-gradient(180deg,#3b82f6,#2563eb)'
                  : 'linear-gradient(180deg,#009846,#007a38)'
              }))} />
            </div>
          </div>

          <div className="pd-chart-card">
            <div className="pd-chart-header">
              <div>
                <h3><Landmark size={15} /> Financial Overview</h3>
                <span>Budget vs Revenue</span>
              </div>
            </div>
            <div className="pd-chart-body pd-chart-body-pad">
              <StackedBars rows={chartData.financials} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // PROJECT CARD
  // ============================================
  const renderProjectCard = (project, index) => {
    const isExpanded = expandedProjects[project.id];
    const progress = project.progress || 0;
    const profit = (project.revenue || 0) - (project.actualCost || 0);
    const isProfit = profit >= 0;
    const statusConfig = getStatusConfig(project.status);
    const priorityConfig = getPriorityConfig(project.priority);
    const healthConfig = getHealthConfig(project.healthStatus);
    const gradient = getCardGradient(project.status);
    const StatusIcon = statusConfig.icon;
    const HealthIcon = healthConfig.icon;

    return (
      <div
        key={project.id}
        className="pd-project-card"
        style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}
      >
        <div className="pd-project-accent" style={{ background: gradient }} />
        <div className="pd-project-header">
          <div className="pd-project-title-section">
            <span className="pd-project-code">{project.code || `PRJ-${String(project.id).padStart(4, '0')}`}</span>
            <h3 className="pd-project-name">{project.name}</h3>
            {project.client && (
              <div className="pd-project-client"><User size={12} /><span>{project.client}</span></div>
            )}
          </div>
          <div className="pd-project-badges">
            <span className="pd-badge" style={{ background: statusConfig.bg, color: statusConfig.color }}>
              <StatusIcon size={12} /> {statusConfig.label}
            </span>
            <span className="pd-badge" style={{ background: priorityConfig.bg, color: priorityConfig.color }}>
              {priorityConfig.label}
            </span>
          </div>
        </div>

        <div className="pd-project-body">
          {/* Progress */}
          <div className="pd-progress-section">
            <div className="pd-progress-header">
              <span className="pd-progress-label">Progress</span>
              <span className="pd-progress-value">{progress.toFixed(0)}%</span>
            </div>
            <div className="pd-progress-bar">
              <div
                className="pd-progress-fill"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  background: progress >= 75
                    ? 'linear-gradient(90deg,#009846,#00b856)'
                    : progress >= 50
                      ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                      : 'linear-gradient(90deg,#dc2626,#ef4444)'
                }}
              />
            </div>
          </div>

          {/* Financials */}
          <div className="pd-financial-grid">
            <div className="pd-fin-item">
              <span className="pd-fin-label">Budget</span>
              <span className="pd-fin-value pd-fin-budget">{Utils.formatCurrencyShort(project.budget || 0)}</span>
            </div>
            <div className="pd-fin-item">
              <span className="pd-fin-label">Actual</span>
              <span className="pd-fin-value pd-fin-actual">{Utils.formatCurrencyShort(project.actualCost || 0)}</span>
            </div>
            <div className="pd-fin-item">
              <span className="pd-fin-label">Revenue</span>
              <span className="pd-fin-value pd-fin-revenue">{Utils.formatCurrencyShort(project.revenue || 0)}</span>
            </div>
            <div className="pd-fin-item">
              <span className="pd-fin-label">Profit</span>
              <span className={`pd-fin-value ${isProfit ? 'pd-fin-profit' : 'pd-fin-loss'}`}>
                {Utils.formatCurrencyShort(profit)}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="pd-project-meta">
            <div className="pd-meta-item">
              <Calendar size={12} />
              <span>
                {project.startDate ? Utils.formatDate(project.startDate) : 'N/A'}
                {project.endDate && ` → ${Utils.formatDate(project.endDate)}`}
              </span>
            </div>
            {project.siteName && (
              <div className="pd-meta-item"><Building2 size={12} /><span>{project.siteName}</span></div>
            )}
            <div className="pd-meta-item" style={{ color: healthConfig.color }}>
              <HealthIcon size={12} /> {healthConfig.label}
            </div>
          </div>

          {project.description && (
            <div className="pd-project-description">{project.description}</div>
          )}
        </div>

        <div className="pd-project-footer">
          <div className="pd-project-team">
            {project.projectManager && <span><User size={11} /> {project.projectManager}</span>}
            {project.teamLead && <span><Users size={11} /> {project.teamLead}</span>}
          </div>
          <div className="pd-project-actions">
            <button className="pd-icon-btn" onClick={(e) => {
              e.stopPropagation();
              setSelectedProject(project);
              setShowDetailModal(true);
            }} title="View"><Eye size={14} /></button>
            <button className="pd-icon-btn pd-icon-edit" onClick={(e) => {
              e.stopPropagation();
              handleEdit(project);
            }} title="Edit"><Edit size={14} /></button>
            <button className="pd-icon-btn pd-icon-danger" onClick={(e) => {
              e.stopPropagation();
              handleDelete(project.id);
            }} title="Delete"><Trash2 size={14} /></button>
            <button className="pd-icon-btn pd-icon-expand" onClick={(e) => {
              e.stopPropagation();
              toggleExpand(project.id);
            }} title="Expand">
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="pd-expanded">
            <div className="pd-expanded-grid">
              {project.clientContact && (
                <div className="pd-expanded-item">
                  <User size={12} />
                  <div>
                    <span className="pd-expanded-label">Contact</span>
                    <span className="pd-expanded-value">{project.clientContact}</span>
                  </div>
                </div>
              )}
              {project.clientPhone && (
                <div className="pd-expanded-item">
                  <Phone size={12} />
                  <div>
                    <span className="pd-expanded-label">Phone</span>
                    <span className="pd-expanded-value">{project.clientPhone}</span>
                  </div>
                </div>
              )}
              {project.clientEmail && (
                <div className="pd-expanded-item">
                  <Mail size={12} />
                  <div>
                    <span className="pd-expanded-label">Email</span>
                    <span className="pd-expanded-value">{project.clientEmail}</span>
                  </div>
                </div>
              )}
              {project.notes && (
                <div className="pd-expanded-item pd-expanded-full">
                  <FileText size={12} />
                  <div>
                    <span className="pd-expanded-label">Notes</span>
                    <span className="pd-expanded-value">{project.notes}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // PAGINATION
  // ============================================
  const renderPagination = () => {
    if (filteredProjects.length === 0) return null;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredProjects.length);
    return (
      <div className="pd-pagination">
        <div className="pd-pagination-info">
          Showing <strong>{startItem}</strong> – <strong>{endItem}</strong> of <strong>{filteredProjects.length}</strong> projects
        </div>
        <div className="pd-pagination-controls">
          <div className="pd-pagination-items">
            <span>Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="pd-pagination-select"
            >
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
              <option value={18}>18</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
          <div className="pd-pagination-buttons">
            <button className="pd-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
              <ChevronsLeft size={15} />
            </button>
            <button className="pd-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft size={15} />
            </button>
            {getPageNumbers().map(page => (
              <button key={page}
                className={`pd-page-btn ${page === currentPage ? 'active' : ''}`}
                onClick={() => goToPage(page)}>{page}</button>
            ))}
            <button className="pd-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
              <ChevronRight size={15} />
            </button>
            <button className="pd-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
              <ChevronsRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // FORM MODAL
  // ============================================
  const renderFormModal = () => (
    <ModalPortal>
      <div className="pd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="pd-modal-content" onClick={e => e.stopPropagation()}>
          <div className="pd-modal-header pd-modal-header-green">
            <div className="pd-modal-header-left">
              <div className="pd-modal-header-icon"><FolderKanban size={18} /></div>
              <div>
                <h3>{editingId ? 'Edit Project' : 'New Project'}</h3>
                <p className="pd-modal-subtitle">{editingId ? 'Update project details' : 'Create a new project'}</p>
              </div>
            </div>
            <button type="button" className="pd-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="pd-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="pd-form-row">
                <div className="pd-form-group">
                  <label>Project Name <span className="pd-required">*</span></label>
                  <input type="text" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required placeholder="Enter project name" className="pd-form-input" autoFocus />
                </div>
                <div className="pd-form-group">
                  <label>Client</label>
                  <input type="text" value={formData.client}
                    onChange={e => setFormData({ ...formData, client: e.target.value })}
                    placeholder="Client name" className="pd-form-input" />
                </div>
              </div>
              <div className="pd-form-group">
                <label>Description</label>
                <textarea value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project description" rows="2" className="pd-form-textarea" />
              </div>
              <div className="pd-form-row">
                <div className="pd-form-group">
                  <label>Site</label>
                  <select value={formData.siteId}
                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                    className="pd-form-select">
                    <option value="">Select Site</option>
                    {data?.sites?.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pd-form-group">
                  <label>Budget (BD)</label>
                  <input type="number" step="0.001" value={formData.budget}
                    onChange={e => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="0.000" className="pd-form-input" />
                </div>
              </div>
              <div className="pd-form-row">
                <div className="pd-form-group">
                  <label>Start Date</label>
                  <input type="date" value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="pd-form-input" />
                </div>
                <div className="pd-form-group">
                  <label>End Date</label>
                  <input type="date" value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="pd-form-input" />
                </div>
              </div>
              <div className="pd-form-row">
                <div className="pd-form-group">
                  <label>Status</label>
                  <select value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="pd-form-select">
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="pd-form-group">
                  <label>Priority</label>
                  <select value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="pd-form-select">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="pd-form-row">
                <div className="pd-form-group">
                  <label>Project Manager</label>
                  <input type="text" value={formData.projectManager}
                    onChange={e => setFormData({ ...formData, projectManager: e.target.value })}
                    placeholder="Project manager" className="pd-form-input" />
                </div>
                <div className="pd-form-group">
                  <label>Team Lead</label>
                  <input type="text" value={formData.teamLead}
                    onChange={e => setFormData({ ...formData, teamLead: e.target.value })}
                    placeholder="Team lead" className="pd-form-input" />
                </div>
              </div>
              <div className="pd-form-row">
                <div className="pd-form-group">
                  <label>Risk Level</label>
                  <select value={formData.riskLevel}
                    onChange={e => setFormData({ ...formData, riskLevel: e.target.value })}
                    className="pd-form-select">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="pd-form-group">
                  <label>Notes</label>
                  <input type="text" value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes" className="pd-form-input" />
                </div>
              </div>
              <div className="pd-form-actions">
                <button type="submit" className="pd-btn-primary" disabled={loading}>
                  <Save size={15} /> {loading ? 'Saving...' : (editingId ? 'Update Project' : 'Create Project')}
                </button>
                <button type="button" className="pd-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );

  // ============================================
  // DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedProject) return null;
    const p = selectedProject;
    const profit = (p.revenue || 0) - (p.actualCost || 0);
    const statusConfig = getStatusConfig(p.status);
    const priorityConfig = getPriorityConfig(p.priority);
    const healthConfig = getHealthConfig(p.healthStatus);
    const StatusIcon = statusConfig.icon;
    const HealthIcon = healthConfig.icon;
    const gradient = getCardGradient(p.status);

    return (
      <ModalPortal>
        <div className="pd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowDetailModal(false); setSelectedProject(null); } }}>
          <div className="pd-modal-content pd-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header" style={{ background: gradient }}>
              <div className="pd-modal-header-left">
                <div>
                  <h3>{p.name}</h3>
                  <p className="pd-modal-subtitle">
                    {p.code || `PRJ-${String(p.id).padStart(4, '0')}`}
                  </p>
                </div>
              </div>
              <button type="button" className="pd-modal-close" onClick={() => { setShowDetailModal(false); setSelectedProject(null); }}>
                <X size={18} />
              </button>
            </div>
            <div className="pd-modal-body">
              {/* Summary */}
              <div className="pd-detail-summary">
                <div className="pd-detail-summary-item">
                  <span className="pd-detail-summary-label">Status</span>
                  <span className="pd-badge" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                    <StatusIcon size={12} /> {statusConfig.label}
                  </span>
                </div>
                <div className="pd-detail-summary-item">
                  <span className="pd-detail-summary-label">Priority</span>
                  <span className="pd-badge" style={{ background: priorityConfig.bg, color: priorityConfig.color }}>
                    {priorityConfig.label}
                  </span>
                </div>
                <div className="pd-detail-summary-item">
                  <span className="pd-detail-summary-label">Health</span>
                  <span style={{ color: healthConfig.color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <HealthIcon size={13} /> {healthConfig.label}
                  </span>
                </div>
                <div className="pd-detail-summary-item">
                  <span className="pd-detail-summary-label">Progress</span>
                  <span style={{ fontWeight: 800 }}>{p.progress?.toFixed(0) || 0}%</span>
                </div>
              </div>

              {/* Financials */}
              <div className="pd-detail-section">
                <h4 className="pd-detail-section-title"><Banknote size={13} /> Financial Summary</h4>
                <div className="pd-detail-fin-grid">
                  <div className="pd-detail-fin-item" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <span className="pd-detail-fin-label">Budget</span>
                    <span className="pd-detail-fin-value">{Utils.formatCurrency(p.budget || 0)}</span>
                  </div>
                  <div className="pd-detail-fin-item" style={{ borderLeft: '4px solid #dc2626' }}>
                    <span className="pd-detail-fin-label">Actual Cost</span>
                    <span className="pd-detail-fin-value">{Utils.formatCurrency(p.actualCost || 0)}</span>
                  </div>
                  <div className="pd-detail-fin-item" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <span className="pd-detail-fin-label">Revenue</span>
                    <span className="pd-detail-fin-value">{Utils.formatCurrency(p.revenue || 0)}</span>
                  </div>
                  <div className="pd-detail-fin-item" style={{ borderLeft: `4px solid ${profit >= 0 ? '#009846' : '#dc2626'}` }}>
                    <span className="pd-detail-fin-label">Profit</span>
                    <span className={`pd-detail-fin-value ${profit >= 0 ? 'pd-text-green' : 'pd-text-red'}`}>
                      {Utils.formatCurrency(profit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client */}
              {p.client && (
                <div className="pd-detail-section">
                  <h4 className="pd-detail-section-title"><User size={13} /> Client Information</h4>
                  <div className="pd-detail-grid">
                    <div className="pd-detail-item">
                      <span className="pd-detail-item-label">Name</span>
                      <span className="pd-detail-item-value">{p.client}</span>
                    </div>
                    {p.clientContact && (
                      <div className="pd-detail-item">
                        <span className="pd-detail-item-label">Contact</span>
                        <span className="pd-detail-item-value">{p.clientContact}</span>
                      </div>
                    )}
                    {p.clientPhone && (
                      <div className="pd-detail-item">
                        <span className="pd-detail-item-label">Phone</span>
                        <span className="pd-detail-item-value">{p.clientPhone}</span>
                      </div>
                    )}
                    {p.clientEmail && (
                      <div className="pd-detail-item">
                        <span className="pd-detail-item-label">Email</span>
                        <span className="pd-detail-item-value">{p.clientEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {p.description && (
                <div className="pd-detail-section">
                  <h4 className="pd-detail-section-title"><FileText size={13} /> Description</h4>
                  <p className="pd-detail-text">{p.description}</p>
                </div>
              )}

              {/* Notes */}
              {p.notes && (
                <div className="pd-detail-section">
                  <h4 className="pd-detail-section-title"><FileText size={13} /> Notes</h4>
                  <p className="pd-detail-text">{p.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className={`pd-root ${mounted ? 'is-mounted' : ''}`}>
      {/* Ambient orbs */}
      <div className="pd-ambient">
        <div className="pd-ambient-orb pd-ambient-1" />
        <div className="pd-ambient-orb pd-ambient-2" />
        <div className="pd-ambient-orb pd-ambient-3" />
      </div>

      {/* Header */}
      <div className="pd-header">
        <div className="pd-header-left">
          <div className="pd-header-icon-wrapper">
            <FolderKanban size={22} />
          </div>
          <div>
            <h2>Project Management</h2>
            <p className="pd-header-subtitle">
              {stats.total} projects · {stats.active} active · {stats.completed} completed
            </p>
          </div>
        </div>
        <div className="pd-header-right">
          <button type="button" className="pd-btn-ghost" onClick={handlePrintReport}>
            <Printer size={14} /> Print
          </button>
          <button type="button" className="pd-btn-ghost" onClick={exportDashboardReport}>
            <Download size={14} /> Export
          </button>
          <button type="button" className="pd-btn-ghost" onClick={loadProjects}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="pd-btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={15} /> New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      {renderTabs()}

      {/* Stats (always visible) */}
      {renderStats()}
      {renderTooltip()}

      {/* Banners */}
      {error && <div className="pd-banner pd-banner-error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="pd-banner pd-banner-success"><CheckCircle size={15} /> {success}</div>}

      {/* Tab content */}
      {activeTab === 'dashboard' ? renderDashboardTab() : renderProjectsTab()}

      {/* Modals */}
      {showForm && renderFormModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default ProjectDashboard;