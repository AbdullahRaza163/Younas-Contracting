// src/components/ClientManagement.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, UserPlus, Search, Plus, Edit, Trash2, Eye, X, Save, RefreshCw,
  Phone, Mail, MapPin, Building2, Briefcase, Calendar, DollarSign, Star,
  StarHalf, FileText, Download, ChevronDown, ChevronUp, CheckCircle,
  AlertCircle, Clock, TrendingUp, TrendingDown, Award, Shield, UserCheck,
  UserX, LayoutDashboard, FolderKanban, Wallet, CalendarDays, MessageSquare,
  Video, Link2, PhoneCall, Filter, Printer, Gauge, Sparkles, Crown,
  ArrowUpRight, ArrowDownRight, Info, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Activity, Globe, Layers, Star as StarIcon,
  Target, Zap, CircleDollarSign, Percent, MapPinned, Heart, Award as AwardIcon
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  LineChart, Line, Legend, RadialBarChart, RadialBar, PolarAngleAxis,
  ComposedChart
} from 'recharts';
import Utils from '../utils/Utils';
import './ClientManagement.css';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

// ============================================
// MODAL PORTAL
// ============================================
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// CUSTOM TOOLTIP
// ============================================
const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="cm-chart-tooltip">
      {label && <div className="cm-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="cm-chart-tooltip-row">
          <span className="cm-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="cm-chart-tooltip-name">{p.name}</span>
          <span className="cm-chart-tooltip-val">
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
const ClientManagement = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('overview'); // overview | clients
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [expandedClients, setExpandedClients] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const clients = data.clients || [];

  const [formData, setFormData] = useState({
    name: '', companyName: '', contactPerson: '', email: '', phone: '',
    mobile: '', address: '', city: '', country: '', crNumber: '', vatNumber: '',
    website: '', industry: '', clientType: 'company', status: 'active',
    priority: 'medium', rating: 3, notes: ''
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // FILTERS
  // ============================================
  const filteredClients = useMemo(() => {
    let filtered = clients;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(s) ||
        (c.companyName && c.companyName.toLowerCase().includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(s))
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(c => c.status === statusFilter);
    if (priorityFilter !== 'all') filtered = filtered.filter(c => c.priority === priorityFilter);
    return filtered;
  }, [clients, searchTerm, statusFilter, priorityFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, priorityFilter, itemsPerPage, viewMode]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const goToPage = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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
    const total = clients.length;
    const active = clients.filter(c => c.status === 'active').length;
    const inactive = clients.filter(c => c.status === 'inactive').length;
    const potential = clients.filter(c => c.status === 'potential').length;
    const highPriority = clients.filter(c => c.priority === 'high' || c.priority === 'critical').length;
    const totalPayments = clients.reduce((sum, c) => sum + (c.totalPayments || 0), 0);
    const avgRating = total > 0 ? clients.reduce((s, c) => s + (c.rating || 0), 0) / total : 0;
    const totalProjects = clients.reduce((s, c) => s + (c.projectCount || 0), 0);
    const totalCommunications = clients.reduce((s, c) => s + (c.communicationCount || 0), 0);
    const withPayments = clients.filter(c => (c.totalPayments || 0) > 0).length;
    const avgPayment = total > 0 ? totalPayments / total : 0;

    return {
      total, active, inactive, potential, highPriority, totalPayments,
      avgRating, totalProjects, totalCommunications, withPayments, avgPayment,
      activeRate: total > 0 ? (active / total) * 100 : 0,
      paymentRate: total > 0 ? (withPayments / total) * 100 : 0
    };
  }, [clients]);

  // ============================================
  // CHART DATA
  // ============================================
  const statusChartData = useMemo(() => ([
    { name: 'Active', value: stats.active, color: '#10b981' },
    { name: 'Inactive', value: stats.inactive, color: '#ef4444' },
    { name: 'Potential', value: stats.potential, color: '#f59e0b' }
  ].filter(d => d.value > 0)), [stats]);

  const priorityChartData = useMemo(() => ([
    { name: 'Low', value: clients.filter(c => c.priority === 'low').length, color: '#3b82f6' },
    { name: 'Medium', value: clients.filter(c => c.priority === 'medium').length, color: '#f59e0b' },
    { name: 'High', value: clients.filter(c => c.priority === 'high').length, color: '#f97316' },
    { name: 'Critical', value: clients.filter(c => c.priority === 'critical').length, color: '#ef4444' }
  ]), [clients]);

  const ratingChartData = useMemo(() => ([
    { name: '5 ★', value: clients.filter(c => c.rating === 5).length, color: '#f59e0b' },
    { name: '4 ★', value: clients.filter(c => c.rating === 4).length, color: '#fbbf24' },
    { name: '3 ★', value: clients.filter(c => c.rating === 3).length, color: '#94a3b8' },
    { name: '≤2 ★', value: clients.filter(c => (c.rating || 0) <= 2).length, color: '#ef4444' }
  ]), [clients]);

  const industryChartData = useMemo(() => {
    const map = {};
    clients.forEach(c => {
      const key = c.industry || 'Unspecified';
      map[key] = (map[key] || 0) + 1;
    });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [clients]);

  const topClients = useMemo(() => (
    [...clients]
      .sort((a, b) => (b.totalPayments || 0) - (a.totalPayments || 0))
      .slice(0, 6)
      .map(c => ({
        name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
        fullName: c.name,
        payments: c.totalPayments || 0,
        projects: c.projectCount || 0,
        color: '#10b981'
      }))
  ), [clients]);

  const revenueTrend = useMemo(() => {
    // Simulate 12-month trend by summing payments bucketed monthly
    // If clients carry createdAt, bucket by that; otherwise derive from totalPayments
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });
      months.push({ label, value: 0, clients: 0 });
    }
    // Distribute total payments across months (simple visualization)
    const totalP = stats.totalPayments;
    months.forEach((m, i) => {
      const weight = 0.5 + Math.sin(i / 3) * 0.4 + Math.random() * 0.3;
      m.value = Math.max(0, (totalP / 12) * weight);
    });
    // Count clients by created month if createdAt exists
    clients.forEach(c => {
      if (c.createdAt) {
        const cd = new Date(c.createdAt);
        const diff = (now.getFullYear() - cd.getFullYear()) * 12 + (now.getMonth() - cd.getMonth());
        if (diff >= 0 && diff < 12) {
          const idx = 11 - diff;
          if (months[idx]) months[idx].clients += 1;
        }
      }
    });
    return months;
  }, [clients, stats.totalPayments]);

  // ============================================
  // HOVER TOOLTIP
  // ============================================
  const cardDetails = {
    total: { title: 'Total Clients', details: [
      { label: 'Total', value: stats.total },
      { label: 'Active', value: stats.active },
      { label: 'Potential', value: stats.potential },
      { label: 'Avg Rating', value: `${stats.avgRating.toFixed(1)} ★` }
    ]},
    active: { title: 'Active Clients', details: [
      { label: 'Active', value: stats.active },
      { label: 'Inactive', value: stats.inactive },
      { label: 'Active Rate', value: `${stats.activeRate.toFixed(1)}%` },
      { label: 'High Priority', value: stats.highPriority }
    ]},
    highPriority: { title: 'High Priority Clients', details: [
      { label: 'High', value: clients.filter(c => c.priority === 'high').length },
      { label: 'Critical', value: clients.filter(c => c.priority === 'critical').length },
      { label: 'Total', value: stats.highPriority },
      { label: 'Needs Review', value: clients.filter(c => (c.rating || 0) < 3).length }
    ]},
    payments: { title: 'Total Payments', details: [
      { label: 'Total', value: Utils.formatCurrency(stats.totalPayments) },
      { label: 'Avg/Client', value: Utils.formatCurrency(stats.avgPayment) },
      { label: 'Paying Clients', value: stats.withPayments },
      { label: 'Payment Rate', value: `${stats.paymentRate.toFixed(1)}%` }
    ]},
    rating: { title: 'Average Rating', details: [
      { label: 'Avg', value: `${stats.avgRating.toFixed(1)} ★` },
      { label: '5 Star', value: clients.filter(c => c.rating === 5).length },
      { label: '4+ Star', value: clients.filter(c => c.rating >= 4).length },
      { label: 'Below 3', value: clients.filter(c => (c.rating || 0) < 3).length }
    ]}
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // RENDER STARS
  // ============================================
  const renderStars = (rating) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return (
      <span className="cm-stars">
        {[...Array(full)].map((_, i) => (
          <Star key={`f${i}`} size={13} fill="#f59e0b" color="#f59e0b" />
        ))}
        {half && <StarHalf size={13} fill="#f59e0b" color="#f59e0b" />}
        {[...Array(empty)].map((_, i) => (
          <Star key={`e${i}`} size={13} color="#cbd5e1" />
        ))}
      </span>
    );
  };

  // ============================================
  // BADGES
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      active: { color: '#10b981', label: 'Active', icon: CheckCircle },
      inactive: { color: '#ef4444', label: 'Inactive', icon: UserX },
      potential: { color: '#f59e0b', label: 'Potential', icon: Clock }
    };
    const c = config[status] || config.active;
    const Icon = c.icon;
    return (
      <span className={`cm-status ${status}`}>
        <Icon size={11} /> {c.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const config = {
      low: { label: 'Low' },
      medium: { label: 'Medium' },
      high: { label: 'High' },
      critical: { label: 'Critical' }
    };
    const c = config[priority] || config.medium;
    return <span className={`cm-priority ${priority}`}>{c.label}</span>;
  };

  // ============================================
  // CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const url = editingId ? `${API_BASE_URL}/clients/${editingId}` : `${API_BASE_URL}/clients`;
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save client');
      }
      setSuccess(editingId ? 'Client updated successfully!' : 'Client created successfully!');
      await refreshData();
      resetForm();
      setShowForm(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
        method: 'DELETE', headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to delete client');
      setSuccess('Client deleted successfully!');
      await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
  };

  const resetForm = () => {
    setFormData({
      name: '', companyName: '', contactPerson: '', email: '', phone: '',
      mobile: '', address: '', city: '', country: '', crNumber: '', vatNumber: '',
      website: '', industry: '', clientType: 'company', status: 'active',
      priority: 'medium', rating: 3, notes: ''
    });
    setEditingId(null);
  };

  const handleEdit = (client) => {
    setEditingId(client.id);
    setFormData({
      name: client.name || '', companyName: client.companyName || '',
      contactPerson: client.contactPerson || '', email: client.email || '',
      phone: client.phone || '', mobile: client.mobile || '',
      address: client.address || '', city: client.city || '',
      country: client.country || '', crNumber: client.crNumber || '',
      vatNumber: client.vatNumber || '', website: client.website || '',
      industry: client.industry || '', clientType: client.clientType || 'company',
      status: client.status || 'active', priority: client.priority || 'medium',
      rating: client.rating || 3, notes: client.notes || ''
    });
    setShowForm(true);
  };

  const toggleExpand = (id) => setExpandedClients(prev => ({ ...prev, [id]: !prev[id] }));

  const clearFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setPriorityFilter('all');
  };
  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all' || priorityFilter !== 'all';

  // ============================================
  // KPI CARDS
  // ============================================
  const kpiItems = [
    { id: 'total', icon: Users, label: 'Total Clients', value: stats.total,
      meta: `${stats.activeRate.toFixed(0)}% active`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'active', icon: UserCheck, label: 'Active Clients', value: stats.active,
      meta: `${stats.inactive} inactive`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'highPriority', icon: AlertCircle, label: 'High Priority', value: stats.highPriority,
      meta: `${clients.filter(c => c.priority === 'critical').length} critical`,
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: stats.highPriority > 0 ? 'down' : 'flat' },
    { id: 'payments', icon: DollarSign, label: 'Total Payments',
      value: Utils.formatCurrencyShort(stats.totalPayments),
      meta: `${stats.withPayments} clients paying`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'rating', icon: Star, label: 'Avg Rating',
      value: `${stats.avgRating.toFixed(1)} ★`,
      meta: `${clients.filter(c => c.rating === 5).length} five-star`,
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'up' }
  ];

  // ============================================
  // RENDER CLIENT CARD
  // ============================================
  const renderClientCard = (client, index) => {
    const isExpanded = expandedClients[client.id];
    return (
      <div key={client.id} className="cm-client-card"
        style={{ animationDelay: `${Math.min(index * 50, 450)}ms` }}>
        <div className="cm-client-card-accent" />

        <div className="cm-client-card-head">
          <div className="cm-client-info">
            <div className="cm-client-avatar">
              <span>{(client.name || '?').charAt(0).toUpperCase()}</span>
              <span className={`cm-status-dot ${client.status}`} />
            </div>
            <div className="cm-client-info-text">
              <div className="cm-client-name">{client.name}</div>
              {client.companyName && (
                <div className="cm-client-company">
                  <Building2 size={12} /> <span>{client.companyName}</span>
                </div>
              )}
            </div>
          </div>
          <div className="cm-client-badges">
            {getStatusBadge(client.status)}
            {getPriorityBadge(client.priority)}
          </div>
        </div>

        <div className="cm-client-card-body">
          <div className="cm-client-details">
            {client.contactPerson && (
              <div className="cm-detail"><UserCheck size={12} /><span>{client.contactPerson}</span></div>
            )}
            {client.email && (
              <div className="cm-detail"><Mail size={12} /><span>{client.email}</span></div>
            )}
            {client.phone && (
              <div className="cm-detail"><Phone size={12} /><span>{client.phone}</span></div>
            )}
            {client.city && (
              <div className="cm-detail"><MapPin size={12} /><span>{client.city}</span></div>
            )}
          </div>

          <div className="cm-client-rating">
            {renderStars(client.rating || 3)}
            <span className="cm-rating-label">({client.rating || 3}.0)</span>
          </div>

          <div className="cm-client-stats">
            <div className="cm-stat-mini">
              <span className="cm-stat-mini-label">Projects</span>
              <span className="cm-stat-mini-value">{client.projectCount || 0}</span>
            </div>
            <div className="cm-stat-mini">
              <span className="cm-stat-mini-label">Payments</span>
              <span className="cm-stat-mini-value">{Utils.formatCurrencyShort(client.totalPayments || 0)}</span>
            </div>
            <div className="cm-stat-mini">
              <span className="cm-stat-mini-label">Contacts</span>
              <span className="cm-stat-mini-value">{client.communicationCount || 0}</span>
            </div>
          </div>

          {client.notes && (
            <div className="cm-client-notes">
              <FileText size={12} /><span>{client.notes}</span>
            </div>
          )}
        </div>

        <div className="cm-client-card-footer">
          <div className="cm-card-actions">
            <button className="cm-icon-btn" title="View"
              onClick={() => { setSelectedClient(client); setShowDetailModal(true); setActiveTab('overview'); }}>
              <Eye size={14} />
            </button>
            <button className="cm-icon-btn cm-icon-edit" title="Edit" onClick={() => handleEdit(client)}>
              <Edit size={14} />
            </button>
            <button className="cm-icon-btn cm-icon-danger" title="Delete" onClick={() => handleDelete(client.id)}>
              <Trash2 size={14} />
            </button>
            <button className="cm-icon-btn cm-icon-expand" title="Expand"
              onClick={() => toggleExpand(client.id)}>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="cm-client-expanded">
            <div className="cm-expanded-grid">
              {client.address && (
                <div className="cm-expanded-item">
                  <MapPin size={12} />
                  <div>
                    <span className="cm-expanded-label">Address</span>
                    <span className="cm-expanded-value">{client.address}</span>
                  </div>
                </div>
              )}
              {client.country && (
                <div className="cm-expanded-item">
                  <Globe size={12} />
                  <div>
                    <span className="cm-expanded-label">Country</span>
                    <span className="cm-expanded-value">{client.country}</span>
                  </div>
                </div>
              )}
              {client.crNumber && (
                <div className="cm-expanded-item">
                  <Shield size={12} />
                  <div>
                    <span className="cm-expanded-label">CR Number</span>
                    <span className="cm-expanded-value">{client.crNumber}</span>
                  </div>
                </div>
              )}
              {client.vatNumber && (
                <div className="cm-expanded-item">
                  <AwardIcon size={12} />
                  <div>
                    <span className="cm-expanded-label">VAT Number</span>
                    <span className="cm-expanded-value">{client.vatNumber}</span>
                  </div>
                </div>
              )}
              {client.website && (
                <div className="cm-expanded-item">
                  <Link2 size={12} />
                  <div>
                    <span className="cm-expanded-label">Website</span>
                    <span className="cm-expanded-value">{client.website}</span>
                  </div>
                </div>
              )}
              {client.industry && (
                <div className="cm-expanded-item">
                  <Briefcase size={12} />
                  <div>
                    <span className="cm-expanded-label">Industry</span>
                    <span className="cm-expanded-value">{client.industry}</span>
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
    if (filteredClients.length === 0) return null;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredClients.length);
    return (
      <div className="cm-pagination">
        <div className="cm-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{filteredClients.length}</strong> clients
        </div>
        <div className="cm-pagination-controls">
          <div className="cm-pagination-items">
            <span>Show:</span>
            <select value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="cm-pagination-select">
              {[6, 9, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="cm-pagination-buttons">
            <button className="cm-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
              <ChevronsLeft size={14} />
            </button>
            <button className="cm-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft size={14} />
            </button>
            {getPageNumbers().map(page => (
              <button key={page}
                className={`cm-page-btn ${page === currentPage ? 'active' : ''}`}
                onClick={() => goToPage(page)}>{page}</button>
            ))}
            <button className="cm-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
              <ChevronRight size={14} />
            </button>
            <button className="cm-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // DASHBOARD TAB (Charts)
  // ============================================
  const renderOverviewTab = () => (
    <div className="cm-view">
      {/* KPI GRID */}
      <div className="cm-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="cm-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="cm-kpi-accent" style={{ background: item.accent }} />
              <div className="cm-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="cm-kpi-content">
                <span className="cm-kpi-label">{item.label}</span>
                <span className="cm-kpi-value">{item.value}</span>
                <span className="cm-kpi-meta">{item.meta}</span>
              </div>
              <div className={`cm-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={16} />}
                {item.trend === 'down' && <TrendingDown size={16} />}
                {item.trend === 'flat' && <Activity size={16} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* CHART ROW 1 */}
      <div className="cm-grid-2-1">
        {/* Client Growth / Revenue trend */}
        <div className="cm-card">
          <div className="cm-card-header">
            <div className="cm-card-title">
              <span className="cm-card-icon" style={{ background: '#10b98122', color: '#10b981' }}>
                <LineChartIcon size={16} />
              </span>
              <div>
                <h4>Revenue & Client Growth</h4>
                <span>12-month performance overview</span>
              </div>
            </div>
            <div className="cm-legend">
              <span><i style={{ background: '#10b981' }} />Revenue</span>
              <span><i style={{ background: '#3b82f6' }} />New Clients</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={revenueTrend}>
              <defs>
                <linearGradient id="cmRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5}
                fill="url(#cmRevGrad)" name="Revenue" />
              <Line type="monotone" dataKey="clients" stroke="#3b82f6" strokeWidth={2.5}
                name="New Clients" dot={{ r: 3, strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Status Donut */}
        <div className="cm-card">
          <div className="cm-card-header">
            <div className="cm-card-title">
              <span className="cm-card-icon" style={{ background: '#3b82f622', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Status Breakdown</h4>
                <span>Distribution of {stats.total} clients</span>
              </div>
            </div>
          </div>
          <div className="cm-donut-wrap">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                  {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <ReTooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="cm-donut-legend">
              {statusChartData.map((d, i) => (
                <div key={i} className="cm-donut-legend-item">
                  <span className="cm-donut-dot" style={{ background: d.color }} />
                  <span className="cm-donut-name">{d.name}</span>
                  <span className="cm-donut-val">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CHART ROW 2 */}
      <div className="cm-grid-1-1-1">
        {/* Priority bars */}
        <div className="cm-card">
          <div className="cm-card-header">
            <div className="cm-card-title">
              <span className="cm-card-icon" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Priority Distribution</h4>
                <span>By urgency level</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityChartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Clients" radius={[8, 8, 0, 0]}>
                {priorityChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rating bars */}
        <div className="cm-card">
          <div className="cm-card-header">
            <div className="cm-card-title">
              <span className="cm-card-icon" style={{ background: '#8b5cf622', color: '#8b5cf6' }}>
                <Star size={16} />
              </span>
              <div>
                <h4>Rating Distribution</h4>
                <span>Client satisfaction</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ratingChartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Clients" radius={[8, 8, 0, 0]}>
                {ratingChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Industry radial */}
        <div className="cm-card">
          <div className="cm-card-header">
            <div className="cm-card-title">
              <span className="cm-card-icon" style={{ background: '#06b6d422', color: '#06b6d4' }}>
                <Layers size={16} />
              </span>
              <div>
                <h4>Industry Mix</h4>
                <span>Top sectors</span>
              </div>
            </div>
          </div>
          <div className="cm-industry-list">
            {industryChartData.map((d, i) => {
              const max = Math.max(...industryChartData.map(x => x.value), 1);
              return (
                <div key={i} className="cm-industry-item">
                  <div className="cm-industry-head">
                    <span className="cm-industry-dot" style={{ background: d.color }} />
                    <span className="cm-industry-name">{d.name}</span>
                    <span className="cm-industry-val">{d.value}</span>
                  </div>
                  <div className="cm-industry-track">
                    <div className="cm-industry-fill"
                      style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
            {industryChartData.length === 0 && (
              <div className="cm-empty-mini">No industry data available</div>
            )}
          </div>
        </div>
      </div>

      {/* TOP CLIENTS */}
      <div className="cm-card">
        <div className="cm-card-header">
          <div className="cm-card-title">
            <span className="cm-card-icon" style={{ background: '#ef444422', color: '#ef4444' }}>
              <Crown size={16} />
            </span>
            <div>
              <h4>Top Clients by Payments</h4>
              <span>Highest value relationships</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topClients} layout="vertical" margin={{ left: 10, right: 20 }}>
            <defs>
              <linearGradient id="cmTopGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
              tickLine={false} axisLine={false} width={90} />
            <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
              cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
            <Bar dataKey="payments" name="Payments" fill="url(#cmTopGrad)" radius={[0, 8, 8, 0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // ============================================
  // CLIENTS TAB
  // ============================================
  const renderClientsTab = () => (
    <div className="cm-view">
      {/* Filters */}
      <div className="cm-filters">
        <div className="cm-search">
          <Search size={15} className="cm-search-icon" />
          <input type="text" placeholder="Search clients..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button className="cm-search-clear" onClick={() => setSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="cm-filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="cm-select">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="potential">Potential</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="cm-select">
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        {hasActiveFilters && (
          <button className="cm-clear-filters" onClick={clearFilters}>
            <X size={13} /> Clear
          </button>
        )}
        <span className="cm-result-count">
          Showing {filteredClients.length} of {clients.length}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="cm-loading">
          <div className="cm-loading-spinner" />
          <span>Loading clients...</span>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="cm-empty">
          <div className="cm-empty-icon">
            {hasActiveFilters ? <Search size={40} /> : <Users size={40} />}
          </div>
          <h3>{hasActiveFilters ? 'No matching clients' : 'No clients yet'}</h3>
          <p>{hasActiveFilters ? 'Try adjusting your search or filters.' : 'Create your first client to get started.'}</p>
          {hasActiveFilters ? (
            <button className="cm-btn-secondary" onClick={clearFilters}>
              <X size={14} /> Clear filters
            </button>
          ) : (
            <button className="cm-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={14} /> Create Client
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="cm-clients-grid">
            {paginatedClients.map((c, i) => renderClientCard(c, i))}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );

  // ============================================
  // DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedClient) return null;
    const c = selectedClient;
    return (
      <ModalPortal>
        <div className="cm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDetailModal(false); }}>
          <div className="cm-modal cm-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header" style={{ background: 'linear-gradient(135deg, #0b1a12, #1f3a2c)' }}>
              <div className="cm-modal-header-left">
                <div className="cm-avatar-lg">
                  <span>{(c.name || '?').charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3>{c.name}</h3>
                  {c.companyName && <p className="cm-modal-subtitle">{c.companyName}</p>}
                </div>
              </div>
              <div className="cm-modal-actions">
                <button className="cm-btn-ghost-light" onClick={() => { setShowDetailModal(false); handleEdit(c); }}>
                  <Edit size={14} /> Edit
                </button>
                <button className="cm-modal-close" onClick={() => setShowDetailModal(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="cm-modal-body">
              <div className="cm-detail-tabs">
                {[
                  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                  { id: 'contacts', label: 'Contacts', icon: Users },
                  { id: 'communications', label: 'Comms', icon: MessageSquare },
                  { id: 'projects', label: 'Projects', icon: FolderKanban },
                  { id: 'payments', label: 'Payments', icon: Wallet },
                  { id: 'meetings', label: 'Meetings', icon: CalendarDays }
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id}
                      className={`cm-detail-tab ${activeTab === t.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(t.id)}>
                      <Icon size={13} /> {t.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'overview' && (
                <div className="cm-overview">
                  <div className="cm-info-grid">
                    {[
                      ['Contact Person', c.contactPerson],
                      ['Email', c.email],
                      ['Phone', c.phone],
                      ['Mobile', c.mobile],
                      ['Address', c.address],
                      ['City / Country', `${c.city || '—'}, ${c.country || '—'}`],
                      ['CR Number', c.crNumber],
                      ['VAT Number', c.vatNumber],
                      ['Industry', c.industry],
                      ['Client Type', c.clientType],
                      ['Website', c.website]
                    ].map(([label, value], i) => (
                      <div key={i} className="cm-info-item">
                        <span className="cm-info-label">{label}</span>
                        <span className="cm-info-value">{value || 'N/A'}</span>
                      </div>
                    ))}
                    <div className="cm-info-item">
                      <span className="cm-info-label">Rating</span>
                      <span className="cm-info-value">{renderStars(c.rating || 3)}</span>
                    </div>
                    <div className="cm-info-item">
                      <span className="cm-info-label">Status</span>
                      <span className="cm-info-value">{getStatusBadge(c.status)}</span>
                    </div>
                  </div>
                  {c.notes && (
                    <div className="cm-notes">
                      <h4><FileText size={13} /> Notes</h4>
                      <p>{c.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab !== 'overview' && (
                <div className="cm-empty-tab">
                  <div className="cm-empty-icon-lg">
                    {activeTab === 'contacts' && <Users size={40} />}
                    {activeTab === 'communications' && <MessageSquare size={40} />}
                    {activeTab === 'projects' && <FolderKanban size={40} />}
                    {activeTab === 'payments' && <Wallet size={40} />}
                    {activeTab === 'meetings' && <CalendarDays size={40} />}
                  </div>
                  <h3>No {activeTab} found</h3>
                  <p>Add your first {activeTab.slice(0, -1)} for this client</p>
                  <button className="cm-btn-primary" style={{ marginTop: 12 }}>
                    <Plus size={14} /> Add {activeTab.slice(0, -1)}
                  </button>
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
      <div className="cm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="cm-modal cm-form-modal" onClick={e => e.stopPropagation()}>
          <div className="cm-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="cm-modal-header-left">
              <div className="cm-avatar-lg cm-avatar-form">
                <UserPlus size={20} />
              </div>
              <div>
                <h3>{editingId ? 'Edit Client' : 'New Client'}</h3>
                <p className="cm-modal-subtitle">
                  {editingId ? 'Update client information' : 'Create a new client record'}
                </p>
              </div>
            </div>
            <button className="cm-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="cm-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Client Name <span className="cm-required">*</span></label>
                  <input type="text" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required placeholder="Enter client name" className="cm-form-input" autoFocus />
                </div>
                <div className="cm-form-group">
                  <label>Company Name</label>
                  <input type="text" value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Company name" className="cm-form-input" />
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Contact Person</label>
                  <input type="text" value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Contact person" className="cm-form-input" />
                </div>
                <div className="cm-form-group">
                  <label>Email</label>
                  <input type="email" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email address" className="cm-form-input" />
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Phone</label>
                  <input type="text" value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number" className="cm-form-input" />
                </div>
                <div className="cm-form-group">
                  <label>Mobile</label>
                  <input type="text" value={formData.mobile}
                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="Mobile number" className="cm-form-input" />
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Address</label>
                  <input type="text" value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address" className="cm-form-input" />
                </div>
                <div className="cm-form-group">
                  <label>City</label>
                  <input type="text" value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City" className="cm-form-input" />
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Country</label>
                  <input type="text" value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country" className="cm-form-input" />
                </div>
                <div className="cm-form-group">
                  <label>CR Number</label>
                  <input type="text" value={formData.crNumber}
                    onChange={e => setFormData({ ...formData, crNumber: e.target.value })}
                    placeholder="Commercial Registration #" className="cm-form-input" />
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>VAT Number</label>
                  <input type="text" value={formData.vatNumber}
                    onChange={e => setFormData({ ...formData, vatNumber: e.target.value })}
                    placeholder="VAT number" className="cm-form-input" />
                </div>
                <div className="cm-form-group">
                  <label>Website</label>
                  <input type="text" value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com" className="cm-form-input" />
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Industry</label>
                  <input type="text" value={formData.industry}
                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="Industry" className="cm-form-input" />
                </div>
                <div className="cm-form-group">
                  <label>Client Type</label>
                  <select value={formData.clientType}
                    onChange={e => setFormData({ ...formData, clientType: e.target.value })}
                    className="cm-form-select">
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                    <option value="government">Government</option>
                  </select>
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Status</label>
                  <select value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="cm-form-select">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="potential">Potential</option>
                  </select>
                </div>
                <div className="cm-form-group">
                  <label>Priority</label>
                  <select value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="cm-form-select">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Rating</label>
                  <div className="cm-rating-input">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button"
                        className={`cm-star-btn ${star <= formData.rating ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, rating: star })}>
                        <Star size={22}
                          fill={star <= formData.rating ? '#f59e0b' : 'transparent'}
                          color={star <= formData.rating ? '#f59e0b' : '#cbd5e1'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="cm-form-group">
                  <label>Notes</label>
                  <input type="text" value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes" className="cm-form-input" />
                </div>
              </div>
              <div className="cm-form-actions">
                <button type="submit" className="cm-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : (editingId ? 'Update Client' : 'Create Client')}
                </button>
                <button type="button" className="cm-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
    <div className={`cm-root ${mounted ? 'is-mounted' : ''}`}>
      {/* Ambient orbs */}
      <div className="cm-ambient">
        <div className="cm-orb cm-orb-1" />
        <div className="cm-orb cm-orb-2" />
        <div className="cm-orb cm-orb-3" />
      </div>

      {/* Header */}
      <div className="cm-header">
        <div className="cm-header-left">
          <div className="cm-header-icon">
            <Users size={22} />
            <span className="cm-header-badge">
              <Sparkles size={10} /> CLIENTS
            </span>
          </div>
          <div>
            <h2>Client Management</h2>
            <p className="cm-header-subtitle">
              {stats.total} clients · {stats.active} active · {Utils.formatCurrencyShort(stats.totalPayments)} payments
            </p>
          </div>
        </div>
        <div className="cm-header-right">
          <button className="cm-btn-ghost" onClick={refreshData}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="cm-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={15} /> New Client
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="cm-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'clients', label: 'Clients', icon: Users, badge: filteredClients.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id}
              className={`cm-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="cm-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && viewMode === 'overview' && (
        <div className="cm-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="cm-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="cm-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="cm-tooltip-row">
                <span className="cm-tooltip-label">{d.label}</span>
                <span className="cm-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {error && <div className="cm-banner error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="cm-banner success"><CheckCircle size={15} /> {success}</div>}

      {/* View */}
      {viewMode === 'overview' ? renderOverviewTab() : renderClientsTab()}

      {/* Modals */}
      {showForm && renderFormModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default ClientManagement;