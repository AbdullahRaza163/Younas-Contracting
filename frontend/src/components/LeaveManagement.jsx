// src/components/LeaveManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar, Clock, Users, UserCheck, UserX, Plus, Edit, Trash2, Eye, X,
  Save, RefreshCw, Search, Filter, ChevronDown, ChevronUp, CheckCircle,
  AlertCircle, FileText, Printer, Download, Mail, Phone, User, Building2,
  Star, StarHalf, TrendingUp, TrendingDown, Award, LayoutDashboard,
  FolderKanban, Wallet, CalendarDays, MessageSquare, Video, Link2, Unlink,
  PhoneCall, Mail as MailIcon, Gauge, Sparkles, Crown, ArrowUpRight,
  ArrowDownRight, Info, Zap, Shield, HardHat, Briefcase, Timer, Activity,
  Clock as ClockIcon, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Flame, Target, Percent, Layers, Minus
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  LineChart, Line, Legend, ComposedChart
} from 'recharts';
import Utils from '../utils/Utils';
import './LeaveManagement.css';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

// ============================================
// PORTAL
// ============================================
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// CHART TOOLTIP
// ============================================
const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="lm-chart-tooltip">
      {label && <div className="lm-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="lm-chart-tooltip-row">
          <span className="lm-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="lm-chart-tooltip-name">{p.name}</span>
          <span className="lm-chart-tooltip-val">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const LeaveManagement = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('overview'); // overview | requests | balances | holidays | calendar
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // Pagination
  const [requestPage, setRequestPage] = useState(1);
  const [requestPerPage, setRequestPerPage] = useState(10);
  const [balancePage, setBalancePage] = useState(1);
  const [balancePerPage, setBalancePerPage] = useState(6);
  const [holidayPage, setHolidayPage] = useState(1);
  const [holidayPerPage, setHolidayPerPage] = useState(9);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveStats, setLeaveStats] = useState(null);

  const [formData, setFormData] = useState({
    workerId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '', notes: ''
  });

  const [holidayForm, setHolidayForm] = useState({
    name: '', date: '', description: '', isRecurring: false, type: 'public'
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // LOAD
  // ============================================
  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [requests, types, balances, holidaysData, stats] = await Promise.all([
        fetch(`${API_BASE_URL}/leave/requests`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/leave/types`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/leave/balances?year=${selectedYear}`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/leave/holidays?year=${selectedYear}`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/leave/stats?year=${selectedYear}`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : {})
      ]);
      setLeaveRequests(requests);
      setLeaveTypes(types);
      setLeaveBalances(balances);
      setHolidays(holidaysData);
      setLeaveStats(stats);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { loadData(); }, [loadData, selectedYear]);

  // ============================================
  // FILTERED
  // ============================================
  const filteredRequests = useMemo(() => {
    let filtered = leaveRequests;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.workerName?.toLowerCase().includes(s) || r.reason?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(r => r.status === statusFilter);
    if (leaveTypeFilter !== 'all') filtered = filtered.filter(r => r.leaveTypeId === leaveTypeFilter);
    return filtered;
  }, [leaveRequests, searchTerm, statusFilter, leaveTypeFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const paginate = (items, page, perPage) => {
    const total = Math.max(1, Math.ceil(items.length / perPage));
    const p = Math.max(1, Math.min(page, total));
    const start = (p - 1) * perPage;
    return { total, page: p, items: items.slice(start, start + perPage) };
  };
  const getPageNumbers = (current, total) => {
    const pages = []; const max = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };
  const renderPaginationBar = (current, total, perPage, setPerPage, setPage, count) => {
    if (count === 0) return null;
    const startItem = (current - 1) * perPage + 1;
    const endItem = Math.min(current * perPage, count);
    return (
      <div className="lm-pagination">
        <div className="lm-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{count}</strong>
        </div>
        <div className="lm-pagination-controls">
          <div className="lm-pagination-items">
            <span>Show:</span>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="lm-pagination-select">
              {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="lm-pagination-buttons">
            <button className="lm-page-btn" onClick={() => setPage(1)} disabled={current === 1}><ChevronsLeft size={13} /></button>
            <button className="lm-page-btn" onClick={() => setPage(current - 1)} disabled={current === 1}><ChevronLeft size={13} /></button>
            {getPageNumbers(current, total).map(p => (
              <button key={p} className={`lm-page-btn ${p === current ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="lm-page-btn" onClick={() => setPage(current + 1)} disabled={current === total}><ChevronRight size={13} /></button>
            <button className="lm-page-btn" onClick={() => setPage(total)} disabled={current === total}><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // STATS
  // ============================================
  const computedStats = useMemo(() => {
    const total = leaveRequests.length;
    const pending = leaveRequests.filter(r => r.status === 'pending').length;
    const approved = leaveRequests.filter(r => r.status === 'approved').length;
    const rejected = leaveRequests.filter(r => r.status === 'rejected').length;
    const cancelled = leaveRequests.filter(r => r.status === 'cancelled').length;
    const totalDays = leaveRequests.filter(r => r.status === 'approved')
      .reduce((s, r) => s + (r.totalDays || 0), 0);
    const today = Utils.today();
    const onLeaveToday = leaveRequests.filter(r =>
      r.status === 'approved' && r.startDate <= today && r.endDate >= today
    ).length;
    const approvalRate = total > 0 ? (approved / total) * 100 : 0;

    return {
      total, pending, approved, rejected, cancelled, totalDays, onLeaveToday, approvalRate,
      // Use API stats if provided, fall back to computed
      ...(leaveStats || {})
    };
  }, [leaveRequests, leaveStats]);

  // ============================================
  // CHART DATA
  // ============================================
  const statusChartData = useMemo(() => ([
    { name: 'Pending', value: computedStats.pending, color: '#f59e0b' },
    { name: 'Approved', value: computedStats.approved, color: '#10b981' },
    { name: 'Rejected', value: computedStats.rejected, color: '#ef4444' },
    { name: 'Cancelled', value: computedStats.cancelled, color: '#94a3b8' }
  ].filter(d => d.value > 0)), [computedStats]);

  const typeChartData = useMemo(() => {
    const map = {};
    leaveRequests.forEach(r => {
      const key = r.leaveTypeName || 'Unknown';
      if (!map[key]) map[key] = { name: key, value: 0, days: 0 };
      map[key].value += 1;
      map[key].days += r.totalDays || 0;
    });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((d, i) => ({ ...d, color: palette[i % palette.length] }));
  }, [leaveRequests]);

  const topWorkersChart = useMemo(() => {
    const map = {};
    leaveRequests.filter(r => r.status === 'approved').forEach(r => {
      const key = r.workerName || 'Unknown';
      map[key] = (map[key] || 0) + (r.totalDays || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leaveRequests]);

  const monthlyTrend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const monthReqs = leaveRequests.filter(r => r.startDate && r.startDate.startsWith(key));
      const approved = monthReqs.filter(r => r.status === 'approved').length;
      const pending = monthReqs.filter(r => r.status === 'pending').length;
      const days = monthReqs.filter(r => r.status === 'approved').reduce((s, r) => s + (r.totalDays || 0), 0);
      months.push({ label, total: monthReqs.length, approved, pending, days });
    }
    return months;
  }, [leaveRequests]);

  // ============================================
  // KPI CARDS
  // ============================================
  const kpiItems = [
    { id: 'total', icon: FileText, label: 'Total Requests', value: computedStats.total,
      meta: `${computedStats.approvalRate.toFixed(0)}% approved`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'pending', icon: ClockIcon, label: 'Pending', value: computedStats.pending,
      meta: 'Awaiting review',
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
      trend: computedStats.pending > 0 ? 'down' : 'flat' },
    { id: 'approved', icon: CheckCircle, label: 'Approved', value: computedStats.approved,
      meta: `${computedStats.totalDays} total days`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'rejected', icon: UserX, label: 'Rejected', value: computedStats.rejected,
      meta: `${computedStats.cancelled} cancelled`,
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)', trend: 'down' },
    { id: 'days', icon: Calendar, label: 'Total Days', value: computedStats.totalDays,
      meta: `Avg ${computedStats.approved > 0 ? (computedStats.totalDays / computedStats.approved).toFixed(1) : 0} per request`,
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'up' },
    { id: 'onLeave', icon: Users, label: 'On Leave Today', value: computedStats.onLeaveToday,
      meta: `${(data.workers?.length || 0) - computedStats.onLeaveToday} available`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' }
  ];

  const cardDetails = {
    total: { title: 'Total Requests', details: [
      { label: 'Total', value: computedStats.total },
      { label: 'Pending', value: computedStats.pending },
      { label: 'Approved', value: computedStats.approved },
      { label: 'Rejected', value: computedStats.rejected }
    ]},
    pending: { title: 'Pending', details: [
      { label: 'Pending', value: computedStats.pending },
      { label: 'Total Requests', value: computedStats.total },
      { label: 'Pending Rate', value: `${computedStats.total > 0 ? ((computedStats.pending / computedStats.total) * 100).toFixed(1) : 0}%` },
      { label: 'Needs Review', value: computedStats.pending }
    ]},
    approved: { title: 'Approved', details: [
      { label: 'Approved', value: computedStats.approved },
      { label: 'Total Days', value: computedStats.totalDays },
      { label: 'Approval Rate', value: `${computedStats.approvalRate.toFixed(1)}%` },
      { label: 'Avg Days', value: computedStats.approved > 0 ? (computedStats.totalDays / computedStats.approved).toFixed(1) : 0 }
    ]},
    rejected: { title: 'Rejected', details: [
      { label: 'Rejected', value: computedStats.rejected },
      { label: 'Cancelled', value: computedStats.cancelled },
      { label: 'Total Requests', value: computedStats.total },
      { label: 'Rejection Rate', value: `${computedStats.total > 0 ? ((computedStats.rejected / computedStats.total) * 100).toFixed(1) : 0}%` }
    ]},
    days: { title: 'Total Days', details: [
      { label: 'Total Days', value: computedStats.totalDays },
      { label: 'Approved Requests', value: computedStats.approved },
      { label: 'Avg Days', value: computedStats.approved > 0 ? (computedStats.totalDays / computedStats.approved).toFixed(1) : 0 },
      { label: 'On Leave Today', value: computedStats.onLeaveToday }
    ]},
    onLeave: { title: 'On Leave Today', details: [
      { label: 'On Leave', value: computedStats.onLeaveToday },
      { label: 'Total Workers', value: data.workers?.length || 0 },
      { label: 'Available', value: (data.workers?.length || 0) - computedStats.onLeaveToday },
      { label: 'Leave Rate', value: `${data.workers?.length > 0 ? ((computedStats.onLeaveToday / data.workers.length) * 100).toFixed(1) : 0}%` }
    ]}
  };

  const handleCardHover = (id, e) => {
    setHoveredCard(id);
    setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // BADGES
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', icon: ClockIcon },
      approved: { label: 'Approved', icon: CheckCircle },
      rejected: { label: 'Rejected', icon: X },
      cancelled: { label: 'Cancelled', icon: X }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`lm-status ${status}`}>
        <Icon size={11} /> {c.label}
      </span>
    );
  };

  // ============================================
  // CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const url = editingId ? `${API_BASE_URL}/leave/requests/${editingId}` : `${API_BASE_URL}/leave/requests`;
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save leave request');
      }
      setSuccess(editingId ? 'Leave request updated!' : 'Leave request created!');
      await loadData();
      resetForm(); setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this leave request?')) return;
    try {
      const r = await fetch(`${API_BASE_URL}/leave/requests/${id}/approve`, {
        method: 'PUT', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'Manager' })
      });
      if (!r.ok) throw new Error('Failed to approve');
      setSuccess('Leave request approved!');
      await loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this leave request?')) return;
    try {
      const r = await fetch(`${API_BASE_URL}/leave/requests/${id}/reject`, {
        method: 'PUT', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Request rejected' })
      });
      if (!r.ok) throw new Error('Failed to reject');
      setSuccess('Leave request rejected!');
      await loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this leave request?')) return;
    try {
      await fetch(`${API_BASE_URL}/leave/requests/${id}`, { method: 'DELETE' });
      setSuccess('Leave request deleted!');
      await loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
  };

  const resetForm = () => {
    setFormData({ workerId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '', notes: '' });
    setEditingId(null);
  };

  const handleEdit = (request) => {
    setEditingId(request.id);
    setFormData({
      workerId: request.workerId || '',
      leaveTypeId: request.leaveTypeId || '',
      startDate: request.startDate || '',
      endDate: request.endDate || '',
      reason: request.reason || '',
      notes: request.notes || ''
    });
    setShowForm(true);
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch(`${API_BASE_URL}/leave/holidays`, {
        method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayForm)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save holiday');
      }
      setSuccess('Holiday added!');
      await loadData();
      setHolidayForm({ name: '', date: '', description: '', isRecurring: false, type: 'public' });
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await fetch(`${API_BASE_URL}/leave/holidays/${id}`, { method: 'DELETE' });
      setSuccess('Holiday deleted!');
      await loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
  };

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="lm-view">
      <div className="lm-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="lm-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="lm-kpi-accent" style={{ background: item.accent }} />
              <div className="lm-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="lm-kpi-content">
                <span className="lm-kpi-label">{item.label}</span>
                <span className="lm-kpi-value">{item.value}</span>
                <span className="lm-kpi-meta">{item.meta}</span>
              </div>
              <div className={`lm-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <TrendingDown size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="lm-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="lm-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="lm-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="lm-tooltip-row">
                <span className="lm-tooltip-label">{d.label}</span>
                <span className="lm-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 — monthly trend + status donut */}
      <div className="lm-grid-2-1">
        <div className="lm-card">
          <div className="lm-card-header">
            <div className="lm-card-title">
              <span className="lm-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <LineChartIcon size={16} />
              </span>
              <div>
                <h4>Leave Requests Trend</h4>
                <span>Last 12 months</span>
              </div>
            </div>
            <div className="lm-legend">
              <span><i style={{ background: '#10b981' }} />Approved</span>
              <span><i style={{ background: '#f59e0b' }} />Pending</span>
              <span><i style={{ background: '#8b5cf6' }} />Days</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="lmApprovedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <ReTooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2.5}
                fill="url(#lmApprovedGrad)" name="Approved" />
              <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2.5}
                name="Pending" dot={{ r: 3, strokeWidth: 2 }} />
              <Line type="monotone" dataKey="days" stroke="#8b5cf6" strokeWidth={2.5}
                name="Days" dot={{ r: 3, strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="lm-card">
          <div className="lm-card-header">
            <div className="lm-card-title">
              <span className="lm-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Status Breakdown</h4>
                <span>All requests</span>
              </div>
            </div>
          </div>
          <div className="lm-donut-wrap">
            {statusChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                      {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <ReTooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="lm-donut-legend">
                  {statusChartData.map((d, i) => (
                    <div key={i} className="lm-donut-item">
                      <span className="lm-donut-dot" style={{ background: d.color }} />
                      <span className="lm-donut-name">{d.name}</span>
                      <span className="lm-donut-val">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="lm-empty-mini">No data</div>}
          </div>
        </div>
      </div>

      {/* Row 2 — Top workers + Leave types */}
      <div className="lm-grid-1-1">
        <div className="lm-card">
          <div className="lm-card-header">
            <div className="lm-card-title">
              <span className="lm-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Top Workers by Leave Days</h4>
                <span>Approved leaves only</span>
              </div>
            </div>
          </div>
          {topWorkersChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topWorkersChart} layout="vertical" margin={{ left: 10, right: 20 }}>
                <defs>
                  <linearGradient id="lmTopWorkers" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
                  tickLine={false} axisLine={false} width={110} />
                <ReTooltip content={<ChartTooltip formatter={(v) => `${v} days`} />}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" name="Days" fill="url(#lmTopWorkers)" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="lm-empty-mini">No approved leaves</div>}
        </div>

        <div className="lm-card">
          <div className="lm-card-header">
            <div className="lm-card-title">
              <span className="lm-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Layers size={16} />
              </span>
              <div>
                <h4>Leave Types Distribution</h4>
                <span>Requests by type</span>
              </div>
            </div>
          </div>
          {typeChartData.length > 0 ? (
            <div className="lm-breakdown">
              {typeChartData.map((d, i) => {
                const max = Math.max(...typeChartData.map(x => x.value), 1);
                return (
                  <div key={i} className="lm-breakdown-row">
                    <div className="lm-breakdown-head">
                      <span className="lm-breakdown-dot" style={{ background: d.color }} />
                      <span className="lm-breakdown-name">{d.name}</span>
                      <span className="lm-breakdown-val">{d.value} req · {d.days}d</span>
                    </div>
                    <div className="lm-breakdown-track">
                      <div className="lm-breakdown-fill"
                        style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="lm-empty-mini">No leave types used</div>}
        </div>
      </div>

      {/* Row 3 — yearly summary bar */}
      <div className="lm-card">
        <div className="lm-card-header">
          <div className="lm-card-title">
            <span className="lm-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <Target size={16} />
            </span>
            <div>
              <h4>Status by Month</h4>
              <span>Approved vs Pending vs Rejected</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // ============================================
  // REQUESTS TAB
  // ============================================
  const renderRequestsTab = () => {
    const { total, page, items } = paginate(filteredRequests, requestPage, requestPerPage);
    if (page !== requestPage) setRequestPage(page);
    return (
      <div className="lm-view">
        <div className="lm-filters">
          <div className="lm-search">
            <Search size={15} className="lm-search-icon" />
            <input type="text" placeholder="Search requests..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="lm-search-clear" onClick={() => setSearchTerm('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <div className="lm-filter-group">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="lm-select">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={leaveTypeFilter} onChange={(e) => setLeaveTypeFilter(e.target.value)} className="lm-select">
              <option value="all">All Types</option>
              {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <span className="lm-result-count">
            Showing {filteredRequests.length} of {leaveRequests.length}
          </span>
          <button className="lm-btn lm-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> New Request
          </button>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="lm-empty">
            <div className="lm-empty-icon"><FileText size={40} /></div>
            <h3>No leave requests found</h3>
            <p>Create your first leave request or adjust filters.</p>
          </div>
        ) : (
          <>
            <div className="lm-table-wrap">
              <table className="lm-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th className="right">Days</th>
                    <th className="center">Status</th>
                    <th className="center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((request, i) => (
                    <tr key={request.id} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                      <td>
                        <div className="lm-employee-cell">
                          <div className="lm-employee-avatar">
                            {(request.workerName || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="lm-employee-name">{request.workerName}</span>
                        </div>
                      </td>
                      <td><span className="lm-leave-type">{request.leaveTypeName}</span></td>
                      <td>{Utils.formatDate(request.startDate)}</td>
                      <td>{Utils.formatDate(request.endDate)}</td>
                      <td className="right"><span className="lm-days-badge">{request.totalDays} days</span></td>
                      <td className="center">{getStatusBadge(request.status)}</td>
                      <td className="center">
                        <div className="lm-action-btns">
                          {request.status === 'pending' && (
                            <>
                              <button className="lm-btn-small lm-btn-approve" onClick={() => handleApprove(request.id)}>
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button className="lm-btn-small lm-btn-reject" onClick={() => handleReject(request.id)}>
                                <X size={12} /> Reject
                              </button>
                            </>
                          )}
                          <button className="lm-icon-btn" title="View" onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}>
                            <Eye size={13} />
                          </button>
                          <button className="lm-icon-btn lm-icon-edit" title="Edit" onClick={() => handleEdit(request)}>
                            <Edit size={13} />
                          </button>
                          <button className="lm-icon-btn lm-icon-danger" title="Delete" onClick={() => handleDelete(request.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPaginationBar(requestPage, total, requestPerPage, setRequestPerPage, setRequestPage, filteredRequests.length)}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // BALANCES TAB
  // ============================================
  const renderBalancesTab = () => {
    const grouped = Object.values(leaveBalances.reduce((acc, b) => {
      if (!acc[b.workerId]) acc[b.workerId] = { workerName: b.workerName, workerId: b.workerId, balances: [] };
      acc[b.workerId].balances.push(b);
      return acc;
    }, {}));
    const { total, page, items } = paginate(grouped, balancePage, balancePerPage);
    if (page !== balancePage) setBalancePage(page);
    return (
      <div className="lm-view">
        <div className="lm-filters">
          <div className="lm-filter-group">
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="lm-select">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <span className="lm-result-count">{grouped.length} workers</span>
        </div>
        {grouped.length === 0 ? (
          <div className="lm-empty">
            <div className="lm-empty-icon"><Users size={40} /></div>
            <h3>No Leave Balances</h3>
            <p>No balances for {selectedYear}</p>
          </div>
        ) : (
          <>
            <div className="lm-balances-grid">
              {items.map(worker => (
                <div key={worker.workerId} className="lm-balance-card">
                  <div className="lm-balance-head">
                    <div className="lm-balance-avatar">
                      {(worker.workerName || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="lm-balance-name">{worker.workerName}</span>
                  </div>
                  <div className="lm-balance-items">
                    {worker.balances.map(b => {
                      const pct = b.totalDays > 0 ? (b.usedDays / b.totalDays) * 100 : 0;
                      const low = b.remainingDays < 3;
                      return (
                        <div key={b.id} className="lm-balance-item">
                          <div className="lm-balance-item-head">
                            <span className="lm-balance-type">{b.leaveTypeName}</span>
                            <span className="lm-balance-total">{b.totalDays}d</span>
                          </div>
                          <div className="lm-balance-progress">
                            <div className="lm-balance-progress-fill"
                              style={{ width: `${pct}%`, background: low ? '#ef4444' : '#10b981' }} />
                          </div>
                          <div className="lm-balance-meta">
                            <span className="lm-balance-used">{b.usedDays} used</span>
                            <span className={`lm-balance-remaining ${low ? 'low' : ''}`}>
                              {b.remainingDays} remaining
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {renderPaginationBar(balancePage, total, balancePerPage, setBalancePerPage, setBalancePage, grouped.length)}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // HOLIDAYS TAB
  // ============================================
  const renderHolidaysTab = () => {
    const { total, page, items } = paginate(holidays, holidayPage, holidayPerPage);
    if (page !== holidayPage) setHolidayPage(page);
    return (
      <div className="lm-view">
        <div className="lm-filters">
          <div className="lm-filter-group">
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="lm-select">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <span className="lm-result-count">{holidays.length} holidays</span>
        </div>

        {holidays.length === 0 ? (
          <div className="lm-empty">
            <div className="lm-empty-icon"><Calendar size={40} /></div>
            <h3>No Holidays</h3>
            <p>No holidays added for {selectedYear}</p>
          </div>
        ) : (
          <>
            <div className="lm-holidays-grid">
              {items.map(h => {
                const d = new Date(h.date);
                return (
                  <div key={h.id} className="lm-holiday-card">
                    <div className="lm-holiday-date">
                      <span className="lm-holiday-day">{d.getDate()}</span>
                      <span className="lm-holiday-month">{Utils.getShortMonthName(h.date)}</span>
                    </div>
                    <div className="lm-holiday-info">
                      <div className="lm-holiday-name">{h.name}</div>
                      <div className="lm-holiday-badges">
                        <span className={`lm-holiday-type ${h.type}`}>{h.type}</span>
                        {h.isRecurring && <span className="lm-recurring">Recurring</span>}
                      </div>
                      {h.description && <div className="lm-holiday-desc">{h.description}</div>}
                    </div>
                    <button className="lm-icon-btn lm-icon-danger" onClick={() => handleDeleteHoliday(h.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
            {renderPaginationBar(holidayPage, total, holidayPerPage, setHolidayPerPage, setHolidayPage, holidays.length)}
          </>
        )}

        {/* Holiday form */}
        <div className="lm-card">
          <div className="lm-card-header">
            <div className="lm-card-title">
              <span className="lm-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <Plus size={16} />
              </span>
              <div>
                <h4>Add New Holiday</h4>
                <span>Create a public or company holiday</span>
              </div>
            </div>
          </div>
          <form onSubmit={handleHolidaySubmit} className="lm-form">
            <div className="lm-form-row">
              <div className="lm-form-group">
                <label>Holiday Name <span className="lm-required">*</span></label>
                <input type="text" value={holidayForm.name} required
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  placeholder="e.g. Eid Al Fitr" className="lm-form-input" />
              </div>
              <div className="lm-form-group">
                <label>Date <span className="lm-required">*</span></label>
                <input type="date" value={holidayForm.date} required
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="lm-form-input" />
              </div>
            </div>
            <div className="lm-form-row">
              <div className="lm-form-group">
                <label>Type</label>
                <select value={holidayForm.type}
                  onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })}
                  className="lm-form-select">
                  <option value="public">Public</option>
                  <option value="company">Company</option>
                  <option value="religious">Religious</option>
                </select>
              </div>
              <div className="lm-form-group">
                <label>Recurring</label>
                <label className="lm-checkbox">
                  <input type="checkbox" checked={holidayForm.isRecurring}
                    onChange={(e) => setHolidayForm({ ...holidayForm, isRecurring: e.target.checked })} />
                  Recurring annually
                </label>
              </div>
            </div>
            <div className="lm-form-group">
              <label>Description</label>
              <input type="text" value={holidayForm.description}
                onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                placeholder="Optional description" className="lm-form-input" />
            </div>
            <div className="lm-form-actions">
              <button type="submit" className="lm-btn lm-btn-primary" disabled={loading}>
                <Save size={14} /> {loading ? 'Saving...' : 'Add Holiday'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============================================
  // CALENDAR TAB
  // ============================================
  const renderCalendarTab = () => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const firstDay = new Date(curYear, curMonth, 1).getDay();
    const leaveDays = leaveRequests.filter(r => r.status === 'approved');
    const monthHolidays = holidays.filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    });
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const hasLeave = (date) => leaveDays.some(r => {
      const s = new Date(r.startDate); const e = new Date(r.endDate);
      return date >= s && date <= e;
    });
    const isHoliday = (date) => monthHolidays.some(h => {
      const hd = new Date(h.date);
      return hd.getDate() === date.getDate() && hd.getMonth() === date.getMonth() && hd.getFullYear() === date.getFullYear();
    });
    const leaveCount = (date) => leaveDays.filter(r => {
      const s = new Date(r.startDate); const e = new Date(r.endDate);
      return date >= s && date <= e;
    }).length;

    return (
      <div className="lm-view">
        <div className="lm-card">
          <div className="lm-card-header">
            <div className="lm-card-title">
              <span className="lm-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <CalendarDays size={16} />
              </span>
              <div>
                <h4>{monthNames[curMonth]} {curYear}</h4>
                <span>{daysInMonth} days · {monthHolidays.length} holidays</span>
              </div>
            </div>
          </div>
          <div className="lm-calendar-grid">
            {dayNames.map(d => <div key={d} className="lm-calendar-day-header">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="lm-calendar-day empty" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(curYear, curMonth, day);
              const isWeekend = date.getDay() === 5 || date.getDay() === 6;
              const holiday = isHoliday(date);
              const hasLeaveDay = hasLeave(date);
              const count = leaveCount(date);
              return (
                <div key={day} className={`lm-calendar-day ${holiday ? 'holiday' : ''} ${isWeekend ? 'weekend' : ''} ${hasLeaveDay ? 'has-leave' : ''}`}>
                  <span className="lm-day-number">{day}</span>
                  {hasLeaveDay && <span className="lm-day-leave">{count}</span>}
                  {holiday && <span className="lm-day-holiday">🎉</span>}
                </div>
              );
            })}
          </div>
          <div className="lm-calendar-legend">
            <span><i style={{ background: '#f59e0b' }} />Holiday</span>
            <span><i style={{ background: '#94a3b8' }} />Weekend</span>
            <span><i style={{ background: '#10b981' }} />Leave Day</span>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedRequest) return null;
    const r = selectedRequest;
    return (
      <ModalPortal>
        <div className="lm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDetailModal(false); }}>
          <div className="lm-modal" onClick={e => e.stopPropagation()}>
            <div className="lm-modal-header" style={{ background: 'linear-gradient(135deg, #0b1a12, #1f3a2c)' }}>
              <div className="lm-modal-header-left">
                <div className="lm-modal-icon"><FileText size={18} /></div>
                <div>
                  <h3>Leave Request</h3>
                  <p className="lm-modal-sub">{r.workerName}</p>
                </div>
              </div>
              <button className="lm-modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="lm-modal-body">
              <div className="lm-detail-grid">
                {[
                  ['Employee', r.workerName],
                  ['Leave Type', r.leaveTypeName],
                  ['Start Date', Utils.formatDate(r.startDate)],
                  ['End Date', Utils.formatDate(r.endDate)],
                  ['Total Days', `${r.totalDays} days`]
                ].map(([label, value], i) => (
                  <div key={i} className="lm-detail-item">
                    <span className="lm-detail-label">{label}</span>
                    <span className="lm-detail-value">{value}</span>
                  </div>
                ))}
                <div className="lm-detail-item">
                  <span className="lm-detail-label">Status</span>
                  <span className="lm-detail-value">{getStatusBadge(r.status)}</span>
                </div>
              </div>
              {r.reason && (
                <div className="lm-detail-section">
                  <h4><FileText size={13} /> Reason</h4>
                  <p>{r.reason}</p>
                </div>
              )}
              {r.notes && (
                <div className="lm-detail-section">
                  <h4><FileText size={13} /> Notes</h4>
                  <p>{r.notes}</p>
                </div>
              )}
              {r.approvedBy && (
                <div className="lm-detail-section">
                  <h4><CheckCircle size={13} /> Approved By</h4>
                  <p>{r.approvedBy} on {Utils.formatDate(r.approvedDate)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  // ============================================
  // FORM MODAL
  // ============================================
  const renderFormModal = () => (
    <ModalPortal>
      <div className="lm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="lm-modal" onClick={e => e.stopPropagation()}>
          <div className="lm-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="lm-modal-header-left">
              <div className="lm-modal-icon">
                {editingId ? <Edit size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit Leave Request' : 'New Leave Request'}</h3>
                <p className="lm-modal-sub">{editingId ? 'Update request details' : 'Create a new leave request'}</p>
              </div>
            </div>
            <button className="lm-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="lm-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="lm-form-row">
                <div className="lm-form-group">
                  <label>Employee <span className="lm-required">*</span></label>
                  <select value={formData.workerId}
                    onChange={e => setFormData({ ...formData, workerId: e.target.value })}
                    required className="lm-form-select">
                    <option value="">Select Employee</option>
                    {data.workers?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="lm-form-group">
                  <label>Leave Type <span className="lm-required">*</span></label>
                  <select value={formData.leaveTypeId}
                    onChange={e => setFormData({ ...formData, leaveTypeId: e.target.value })}
                    required className="lm-form-select">
                    <option value="">Select Type</option>
                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.daysAllowed}d)</option>)}
                  </select>
                </div>
              </div>
              <div className="lm-form-row">
                <div className="lm-form-group">
                  <label>Start Date <span className="lm-required">*</span></label>
                  <input type="date" value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    required className="lm-form-input" />
                </div>
                <div className="lm-form-group">
                  <label>End Date <span className="lm-required">*</span></label>
                  <input type="date" value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    required className="lm-form-input" />
                </div>
              </div>
              <div className="lm-form-group">
                <label>Reason <span className="lm-required">*</span></label>
                <textarea value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  required placeholder="Reason for leave" rows="3" className="lm-form-textarea" />
              </div>
              <div className="lm-form-group">
                <label>Notes</label>
                <input type="text" value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes" className="lm-form-input" />
              </div>
              <div className="lm-form-actions">
                <button type="submit" className="lm-btn lm-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="lm-btn lm-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
  // MAIN RENDER
  // ============================================
  return (
    <div className={`lm-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="lm-ambient">
        <div className="lm-orb lm-orb-1" />
        <div className="lm-orb lm-orb-2" />
        <div className="lm-orb lm-orb-3" />
      </div>

      <div className="lm-header">
        <div className="lm-header-left">
          <div className="lm-header-icon">
            <Calendar size={22} />
            <span className="lm-header-badge"><Sparkles size={10} /> LEAVE</span>
          </div>
          <div>
            <h2>Leave &amp; Holiday Management</h2>
            <p className="lm-header-subtitle">
              {computedStats.total} requests · {computedStats.approved} approved · {computedStats.onLeaveToday} on leave today
            </p>
          </div>
        </div>
        <div className="lm-header-right">
          <button className="lm-btn lm-btn-ghost" onClick={loadData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="lm-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'requests', label: 'Requests', icon: FileText, badge: filteredRequests.length },
          { id: 'balances', label: 'Balances', icon: Users },
          { id: 'holidays', label: 'Holidays', icon: Calendar },
          { id: 'calendar', label: 'Calendar', icon: CalendarDays }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`lm-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="lm-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {error && <div className="lm-message error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="lm-message success"><CheckCircle size={15} /> {success}</div>}

      {loading && viewMode !== 'overview' ? (
        <div className="lm-loading">
          <div className="lm-loading-spinner" />
          <span>Loading...</span>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && renderOverviewTab()}
          {viewMode === 'requests' && renderRequestsTab()}
          {viewMode === 'balances' && renderBalancesTab()}
          {viewMode === 'holidays' && renderHolidaysTab()}
          {viewMode === 'calendar' && renderCalendarTab()}
        </>
      )}

      {showForm && renderFormModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default LeaveManagement;