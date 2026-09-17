// src/components/WorkersManagerComponent.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  HardHat, Edit, Trash2, Plus, X, Save, Search, Users, UserCheck, UserX,
  Clock, Banknote, Phone, Mail, MapPin, Calendar, TrendingUp, TrendingDown,
  Award, Shield, Briefcase, Eye, RefreshCw, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle,
  CheckCircle, LayoutDashboard, User, UserPlus, Crown, Activity, Timer,
  Info, Hash, Layers, Sparkles, Zap, FileText, Target, Star, CircleDot,
  Sun, Moon, Percent, ToggleLeft, ToggleRight, Calculator
} from 'lucide-react';
import Utils from '../utils/Utils';
import { useTheme } from '../context/ThemeContext';
import './WorkersManager.css';

const WorkersManagerComponent = ({ data, addWorker, updateWorker, deleteWorker }) => {
  // ============================================
  // STATE
  // ============================================
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deductionFilter, setDeductionFilter] = useState('all'); // all | with | without
  const [expandedWorkers, setExpandedWorkers] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState(null);

  const { theme, toggleTheme, isDark } = useTheme();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

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
    notes: '',
    // ⭐ NEW deduction fields
    deductionEnabled: false,
    deductionPercentage: ''
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
  const workers = useMemo(() => data.workers || [], [data.workers]);

  const filteredWorkers = useMemo(() => {
    let filtered = workers;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(w =>
        w.name?.toLowerCase().includes(search) ||
        (w.role && w.role.toLowerCase().includes(search)) ||
        (w.phone && w.phone.includes(search)) ||
        (w.email && w.email.toLowerCase().includes(search))
      );
    }

    if (roleFilter !== 'all') filtered = filtered.filter(w => w.role === roleFilter);

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') filtered = filtered.filter(w => w.status !== 'inactive');
      else filtered = filtered.filter(w => w.status === 'inactive');
    }

    // ⭐ Deduction filter
    if (deductionFilter === 'with') {
      filtered = filtered.filter(w => w.deductionEnabled && Number(w.deductionPercentage) > 0);
    } else if (deductionFilter === 'without') {
      filtered = filtered.filter(w => !w.deductionEnabled || Number(w.deductionPercentage) === 0);
    }

    return filtered;
  }, [workers, searchTerm, roleFilter, statusFilter, deductionFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredWorkers.length / itemsPerPage));

  const paginatedWorkers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredWorkers.slice(startIndex, endIndex);
  }, [filteredWorkers, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter, statusFilter, deductionFilter, itemsPerPage]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const goToPage = (page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
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

  const roles = useMemo(() => {
    const uniqueRoles = ['all', ...new Set((data.workers || []).map(w => w.role).filter(Boolean))];
    return uniqueRoles;
  }, [data.workers]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const total = workers.length;
    const active = workers.filter(w => w.status !== 'inactive').length;
    const inactive = total - active;
    const totalDailyCost = workers.reduce((sum, w) => sum + (w.dailyRate || 0), 0);
    const avgRate = total > 0 ? totalDailyCost / total : 0;
    const totalRoles = roles.length - 1;

    // ⭐ Deduction stats
    const withDeduction = workers.filter(w => w.deductionEnabled && Number(w.deductionPercentage) > 0);
    const deductionCount = withDeduction.length;
    const avgDeductionPct = deductionCount > 0
      ? withDeduction.reduce((s, w) => s + Number(w.deductionPercentage || 0), 0) / deductionCount
      : 0;
    const totalDeductionImpact = withDeduction.reduce((s, w) => {
      const pct = Math.max(0, Math.min(100, Number(w.deductionPercentage) || 0));
      return s + (w.dailyRate || 0) * (pct / 100);
    }, 0);

    return {
      total, active, inactive, totalDailyCost, avgRate, totalRoles,
      deductionCount, avgDeductionPct, totalDeductionImpact
    };
  }, [workers, roles]);

  const cardDetails = {
    total: {
      title: 'Total Workers',
      details: [
        { label: 'Total Workers', value: stats.total },
        { label: 'Active Workers', value: stats.active },
        { label: 'Inactive', value: stats.inactive },
        { label: 'Roles Available', value: stats.totalRoles }
      ]
    },
    active: {
      title: 'Active Workers',
      details: [
        { label: 'Active Workers', value: stats.active },
        { label: 'Total Workers', value: stats.total },
        { label: 'Inactive', value: stats.inactive },
        { label: 'Active Rate', value: stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    cost: {
      title: 'Daily Labor Cost',
      details: [
        { label: 'Total Daily Cost', value: Utils.formatCurrency(stats.totalDailyCost) },
        { label: 'Average Rate', value: Utils.formatCurrency(stats.avgRate) },
        { label: 'Total Workers', value: stats.total },
        { label: 'Monthly Estimate', value: Utils.formatCurrency(stats.totalDailyCost * 26) }
      ]
    },
    deduction: {
      title: 'Salary Deductions',
      details: [
        { label: 'Workers with Deduction', value: stats.deductionCount },
        { label: 'Average Deduction %', value: `${stats.avgDeductionPct.toFixed(1)}%` },
        { label: 'Daily Impact', value: Utils.formatCurrency(stats.totalDeductionImpact) },
        { label: 'Monthly Impact (26d)', value: Utils.formatCurrency(stats.totalDeductionImpact * 26) }
      ]
    },
    inactive: {
      title: 'Inactive Workers',
      details: [
        { label: 'Inactive', value: stats.inactive },
        { label: 'Active', value: stats.active },
        { label: 'Total Workers', value: stats.total },
        { label: 'Inactive Rate', value: stats.total > 0 ? `${((stats.inactive / stats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    }
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // WORKER STATS
  // ============================================
  const getWorkerStats = (workerId) => {
    const workerAttendance = data.attendance?.filter(a => a.workerId === workerId) || [];
    const totalHours = workerAttendance.reduce((sum, a) => {
      if (a.checkedIn && a.checkedOut) return sum + Utils.calculateHoursWorked(a.checkedIn, a.checkedOut);
      if (typeof a.totalHours === 'number' && a.totalHours > 0) return sum + a.totalHours;
      return sum;
    }, 0);

    const daysPresent = workerAttendance.filter(a => a.present).length;
    const hourlyRate = (data.workers?.find(w => w.id === workerId)?.dailyRate / 8) || 0;
    const totalWages = workerAttendance.reduce((sum, a) => {
      if (typeof a.wageEarned === 'number' && a.wageEarned > 0) return sum + a.wageEarned;
      const h = a.checkedIn && a.checkedOut
        ? Utils.calculateHoursWorked(a.checkedIn, a.checkedOut)
        : (a.totalHours || 0);
      return sum + h * hourlyRate;
    }, 0);

    return { totalHours, daysPresent, totalWages };
  };

  // ============================================
  // HANDLERS
  // ============================================
  const resetForm = () => {
    setFormData({
      name: '', role: '', dailyRate: '', phone: '', email: '', address: '',
      emergencyContact: '', emergencyPhone: '', skills: '', experience: '', notes: '',
      deductionEnabled: false, deductionPercentage: ''
    });
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Worker name is required', 'error');
      return;
    }

    // ⭐ Validate deduction percentage
    const pct = parseFloat(formData.deductionPercentage) || 0;
    if (formData.deductionEnabled && (pct < 0 || pct > 100)) {
      showToast('Deduction % must be between 0 and 100', 'error');
      return;
    }

    const payload = {
      ...formData,
      deductionPercentage: formData.deductionEnabled ? pct : 0,
      deductionEnabled: !!formData.deductionEnabled
    };

    if (editingId) {
      updateWorker(editingId, payload);
      showToast('Worker updated');
    } else {
      addWorker(payload);
      showToast('Worker added');
    }

    resetForm();
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
      notes: worker.notes || '',
      deductionEnabled: !!worker.deductionEnabled,
      deductionPercentage: worker.deductionPercentage ? String(worker.deductionPercentage) : ''
    });
    setShowForm(true);
  };

  const toggleExpand = (id) => {
    setExpandedWorkers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = (worker) => {
    if (!window.confirm(`Delete worker "${worker.name}"? This cannot be undone.`)) return;
    deleteWorker(worker.id);
    showToast('Worker deleted');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setDeductionFilter('all');
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    deductionFilter !== 'all';

  // ⭐ Compute effective daily rate after deduction
  const getEffectiveDailyRate = (worker) => {
    if (!worker.deductionEnabled) return worker.dailyRate || 0;
    const pct = Math.max(0, Math.min(100, Number(worker.deductionPercentage) || 0));
    return (worker.dailyRate || 0) * (1 - pct / 100);
  };

  // ============================================
  // ROLE COLORS
  // ============================================
  const roleColors = {
    'Mason': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    'Helper': { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
    'Supervisor': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    'Manager': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
    'Driver': { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
    'Operator': { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' }
  };
  const getRoleStyle = (role) =>
    roleColors[role] || { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)' };

  // ============================================
  // RENDER WORKER CARD
  // ============================================
  const renderWorkerCard = (worker, index) => {
    const isExpanded = expandedWorkers[worker.id];
    const workerStats = getWorkerStats(worker.id);
    const roleStyle = getRoleStyle(worker.role);
    const isActive = worker.status !== 'inactive';
    const hasDeduction = worker.deductionEnabled && Number(worker.deductionPercentage) > 0;

    return (
      <div
        key={worker.id}
        className={`wk-card ${hasDeduction ? 'wk-card-with-deduction' : ''}`}
        style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}
      >
        <div className="wk-card-accent" style={{ background: roleStyle.gradient }} />

        <div className="wk-card-header">
          <div className="wk-info">
            <div className="wk-avatar" style={{ background: roleStyle.gradient }}>
              <span className="wk-avatar-text">{worker.name.charAt(0).toUpperCase()}</span>
              <span className={`wk-status-dot ${isActive ? 'active' : 'inactive'}`} />
            </div>
            <div className="wk-info-text">
              <div className="wk-name">{worker.name}</div>
              <div className="wk-role" style={{ color: roleStyle.color, background: roleStyle.bg }}>
                <Briefcase size={11} />
                {worker.role || 'No role'}
              </div>
            </div>
          </div>
          <div className="wk-rate-chip">
            <Banknote size={12} />
            <span>{Utils.formatCurrencyShort(worker.dailyRate || 0)}</span>
            <span className="wk-rate-unit">/day</span>
          </div>
        </div>

        {/* ⭐ Deduction badge — only if enabled */}
        {hasDeduction && (
          <div className="wk-deduction-banner">
            <div className="wk-deduction-badge">
              <Percent size={11} />
              <span>Deduction Applied</span>
              <strong>{Number(worker.deductionPercentage).toFixed(2)}%</strong>
            </div>
            <div className="wk-deduction-net">
              <Calculator size={11} />
              <span>Net daily</span>
              <strong>{Utils.formatCurrencyShort(getEffectiveDailyRate(worker))}</strong>
            </div>
          </div>
        )}

        <div className="wk-card-body">
          <div className="wk-mini-stats">
            <div className="wk-mini-stat">
              <div className="wk-mini-icon wk-mini-icon-blue"><Clock size={12} /></div>
              <div className="wk-mini-content">
                <span className="wk-mini-label">Hours</span>
                <span className="wk-mini-value">{workerStats.totalHours.toFixed(1)}h</span>
              </div>
            </div>
            <div className="wk-mini-stat">
              <div className="wk-mini-icon wk-mini-icon-green"><Calendar size={12} /></div>
              <div className="wk-mini-content">
                <span className="wk-mini-label">Days</span>
                <span className="wk-mini-value">{workerStats.daysPresent}</span>
              </div>
            </div>
            <div className="wk-mini-stat">
              <div className="wk-mini-icon wk-mini-icon-amber"><Banknote size={12} /></div>
              <div className="wk-mini-content">
                <span className="wk-mini-label">Wages</span>
                <span className="wk-mini-value">{Utils.formatCurrencyShort(workerStats.totalWages)}</span>
              </div>
            </div>
          </div>

          {(worker.phone || worker.skills) && (
            <div className="wk-card-info">
              {worker.phone && (
                <div className="wk-info-line">
                  <Phone size={12} />
                  <span>{worker.phone}</span>
                </div>
              )}
              {worker.skills && (
                <div className="wk-info-line wk-info-line-skills">
                  <Award size={12} />
                  <span>{worker.skills}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="wk-card-footer">
          <span className={`wk-status-pill ${isActive ? 'active' : 'inactive'}`}>
            <span className="wk-status-pill-dot" />
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <div className="wk-actions">
            <button
              type="button"
              className="wk-btn-icon"
              onClick={() => { setSelectedWorker(worker); setShowDetailModal(true); }}
              title="View details"
            >
              <Eye size={14} />
            </button>
            <button
              type="button"
              className="wk-btn-icon wk-btn-icon-edit"
              onClick={() => handleEdit(worker)}
              title="Edit"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              className="wk-btn-icon wk-btn-icon-danger"
              onClick={() => handleDelete(worker)}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              className="wk-btn-icon wk-btn-icon-expand"
              onClick={() => toggleExpand(worker.id)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="wk-expanded">
            <div className="wk-expanded-grid">
              {worker.email && (
                <div className="wk-expanded-item">
                  <Mail size={13} />
                  <div>
                    <span className="wk-expanded-label">Email</span>
                    <span className="wk-expanded-value">{worker.email}</span>
                  </div>
                </div>
              )}
              {worker.address && (
                <div className="wk-expanded-item">
                  <MapPin size={13} />
                  <div>
                    <span className="wk-expanded-label">Address</span>
                    <span className="wk-expanded-value">{worker.address}</span>
                  </div>
                </div>
              )}
              {worker.emergencyContact && (
                <div className="wk-expanded-item">
                  <Shield size={13} />
                  <div>
                    <span className="wk-expanded-label">Emergency Contact</span>
                    <span className="wk-expanded-value">{worker.emergencyContact}</span>
                  </div>
                </div>
              )}
              {worker.emergencyPhone && (
                <div className="wk-expanded-item">
                  <Phone size={13} />
                  <div>
                    <span className="wk-expanded-label">Emergency Phone</span>
                    <span className="wk-expanded-value">{worker.emergencyPhone}</span>
                  </div>
                </div>
              )}
              {worker.experience && (
                <div className="wk-expanded-item">
                  <Timer size={13} />
                  <div>
                    <span className="wk-expanded-label">Experience</span>
                    <span className="wk-expanded-value">{worker.experience} years</span>
                  </div>
                </div>
              )}
              {worker.id && (
                <div className="wk-expanded-item">
                  <Hash size={13} />
                  <div>
                    <span className="wk-expanded-label">Worker ID</span>
                    <span className="wk-expanded-value wk-expanded-mono">{worker.id}</span>
                  </div>
                </div>
              )}

              {/* ⭐ Deduction info in expanded section */}
              <div className={`wk-expanded-item wk-expanded-full wk-expanded-deduction ${hasDeduction ? 'active' : 'inactive'}`}>
                {hasDeduction ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                <div>
                  <span className="wk-expanded-label">Salary Deduction</span>
                  <span className="wk-expanded-value">
                    {hasDeduction
                      ? `${Number(worker.deductionPercentage).toFixed(2)}% will be deducted from salary`
                      : 'No deduction'}
                  </span>
                </div>
              </div>

              {worker.notes && (
                <div className="wk-expanded-item wk-expanded-full">
                  <Info size={13} />
                  <div>
                    <span className="wk-expanded-label">Notes</span>
                    <span className="wk-expanded-value">{worker.notes}</span>
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
  // RENDER DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedWorker) return null;
    const w = selectedWorker;
    const workerStats = getWorkerStats(w.id);
    const roleStyle = getRoleStyle(w.role);
    const isActive = w.status !== 'inactive';
    const hasDeduction = w.deductionEnabled && Number(w.deductionPercentage) > 0;
    const effectiveRate = getEffectiveDailyRate(w);
    const dailyDeductionAmount = (w.dailyRate || 0) - effectiveRate;

    return (
      <div className="wk-modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="wk-modal-content wk-detail-modal" onClick={e => e.stopPropagation()}>
          <div className="wk-modal-header wk-modal-header-dark">
            <div className="wk-modal-header-left">
              <div className="wk-modal-avatar" style={{ background: roleStyle.gradient }}>
                <span>{w.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="wk-modal-header-text">
                <h3>{w.name}</h3>
                <p className="wk-modal-subtitle">
                  {w.role || 'No role'} · {Utils.formatCurrency(w.dailyRate || 0)}/day
                </p>
              </div>
            </div>
            <div className="wk-modal-actions">
              <button
                type="button"
                className="wk-modal-btn-edit"
                onClick={() => { setShowDetailModal(false); handleEdit(w); }}
              >
                <Edit size={15} /> Edit
              </button>
              <button type="button" className="wk-modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="wk-modal-body">
            <div className={`wk-detail-status-banner ${isActive ? 'is-active' : 'is-inactive'}`}>
              <div className="wk-detail-status-icon">
                {isActive ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              </div>
              <div>
                <div className="wk-detail-status-label">Current Status</div>
                <div className="wk-detail-status-value">
                  {isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>

            <div className="wk-detail-stats">
              <div className="wk-detail-stat">
                <div className="wk-detail-stat-icon wk-detail-stat-icon-blue">
                  <Clock size={16} />
                </div>
                <div>
                  <span className="wk-detail-stat-label">Total Hours</span>
                  <span className="wk-detail-stat-value">{workerStats.totalHours.toFixed(1)}h</span>
                </div>
              </div>
              <div className="wk-detail-stat">
                <div className="wk-detail-stat-icon wk-detail-stat-icon-green">
                  <Calendar size={16} />
                </div>
                <div>
                  <span className="wk-detail-stat-label">Days Present</span>
                  <span className="wk-detail-stat-value">{workerStats.daysPresent}</span>
                </div>
              </div>
              <div className="wk-detail-stat">
                <div className="wk-detail-stat-icon wk-detail-stat-icon-amber">
                  <Banknote size={16} />
                </div>
                <div>
                  <span className="wk-detail-stat-label">Total Wages</span>
                  <span className="wk-detail-stat-value">{Utils.formatCurrency(workerStats.totalWages)}</span>
                </div>
              </div>
              <div className="wk-detail-stat">
                <div className="wk-detail-stat-icon wk-detail-stat-icon-purple">
                  <Banknote size={16} />
                </div>
                <div>
                  <span className="wk-detail-stat-label">Daily Rate</span>
                  <span className="wk-detail-stat-value">{Utils.formatCurrency(w.dailyRate || 0)}</span>
                </div>
              </div>
            </div>

            {/* ⭐ Deduction card in detail modal */}
            <div className={`wk-detail-deduction-card ${hasDeduction ? 'active' : ''}`}>
              <div className="wk-detail-deduction-icon">
                {hasDeduction ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              </div>
              <div className="wk-detail-deduction-content">
                <div className="wk-detail-deduction-title">
                  Salary Deduction
                  <span className={`wk-detail-deduction-state ${hasDeduction ? 'on' : 'off'}`}>
                    {hasDeduction ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                {hasDeduction ? (
                  <div className="wk-detail-deduction-body">
                    <div className="wk-detail-deduction-row">
                      <span>Percentage</span>
                      <strong>{Number(w.deductionPercentage).toFixed(2)}%</strong>
                    </div>
                    <div className="wk-detail-deduction-row">
                      <span>Gross daily rate</span>
                      <strong>{Utils.formatCurrency(w.dailyRate || 0)}</strong>
                    </div>
                    <div className="wk-detail-deduction-row deduction">
                      <span>Daily deduction</span>
                      <strong>- {Utils.formatCurrency(dailyDeductionAmount)}</strong>
                    </div>
                    <div className="wk-detail-deduction-row net">
                      <span>Effective daily rate</span>
                      <strong>{Utils.formatCurrency(effectiveRate)}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="wk-detail-deduction-empty">
                    No deduction is applied to this worker's salary.
                  </div>
                )}
              </div>
            </div>

            <div className="wk-detail-section">
              <h4 className="wk-detail-section-title">
                <User size={14} /> Contact Information
              </h4>
              <div className="wk-detail-grid">
                {w.phone && (
                  <div className="wk-detail-item">
                    <Phone size={13} />
                    <div>
                      <span className="wk-detail-item-label">Phone</span>
                      <span className="wk-detail-item-value">{w.phone}</span>
                    </div>
                  </div>
                )}
                {w.email && (
                  <div className="wk-detail-item">
                    <Mail size={13} />
                    <div>
                      <span className="wk-detail-item-label">Email</span>
                      <span className="wk-detail-item-value">{w.email}</span>
                    </div>
                  </div>
                )}
                {w.address && (
                  <div className="wk-detail-item">
                    <MapPin size={13} />
                    <div>
                      <span className="wk-detail-item-label">Address</span>
                      <span className="wk-detail-item-value">{w.address}</span>
                    </div>
                  </div>
                )}
                {w.emergencyContact && (
                  <div className="wk-detail-item">
                    <Shield size={13} />
                    <div>
                      <span className="wk-detail-item-label">Emergency Contact</span>
                      <span className="wk-detail-item-value">{w.emergencyContact}</span>
                    </div>
                  </div>
                )}
                {w.emergencyPhone && (
                  <div className="wk-detail-item">
                    <Phone size={13} />
                    <div>
                      <span className="wk-detail-item-label">Emergency Phone</span>
                      <span className="wk-detail-item-value">{w.emergencyPhone}</span>
                    </div>
                  </div>
                )}
                {!w.phone && !w.email && !w.address && !w.emergencyContact && !w.emergencyPhone && (
                  <div className="wk-detail-empty">No contact information on file</div>
                )}
              </div>
            </div>

            <div className="wk-detail-section">
              <h4 className="wk-detail-section-title">
                <Briefcase size={14} /> Work Information
              </h4>
              <div className="wk-detail-grid">
                {w.role && (
                  <div className="wk-detail-item">
                    <Briefcase size={13} />
                    <div>
                      <span className="wk-detail-item-label">Role</span>
                      <span className="wk-detail-item-value">{w.role}</span>
                    </div>
                  </div>
                )}
                {w.skills && (
                  <div className="wk-detail-item">
                    <Award size={13} />
                    <div>
                      <span className="wk-detail-item-label">Skills</span>
                      <span className="wk-detail-item-value">{w.skills}</span>
                    </div>
                  </div>
                )}
                {w.experience && (
                  <div className="wk-detail-item">
                    <Timer size={13} />
                    <div>
                      <span className="wk-detail-item-label">Experience</span>
                      <span className="wk-detail-item-value">{w.experience} years</span>
                    </div>
                  </div>
                )}
                {w.id && (
                  <div className="wk-detail-item">
                    <Hash size={13} />
                    <div>
                      <span className="wk-detail-item-label">Worker ID</span>
                      <span className="wk-detail-item-value wk-detail-item-mono">{w.id}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {w.notes && (
              <div className="wk-detail-section">
                <h4 className="wk-detail-section-title">
                  <FileText size={14} /> Notes
                </h4>
                <p className="wk-detail-notes-text">{w.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER FORM MODAL (with deduction fields)
  // ============================================
  const renderFormModal = () => (
    <div
      className="wk-modal-overlay"
      onClick={() => { setShowForm(false); resetForm(); }}
    >
      <div className="wk-modal-content wk-form-modal" onClick={e => e.stopPropagation()}>
        <div className="wk-modal-header wk-modal-header-green">
          <div className="wk-modal-header-left">
            <div className="wk-modal-header-icon">
              {editingId ? <Edit size={20} /> : <UserPlus size={20} />}
            </div>
            <div className="wk-modal-header-text">
              <h3>{editingId ? 'Edit Worker' : 'New Worker'}</h3>
              <p className="wk-modal-subtitle">
                {editingId ? 'Update worker details' : 'Add a new worker to your workforce'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="wk-modal-close"
            onClick={() => { setShowForm(false); resetForm(); }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="wk-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="wk-form-row">
              <div className="wk-form-group">
                <label><User size={12} /> Worker Name <span className="wk-required">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter worker name"
                  required
                  className="wk-form-input"
                  autoFocus
                />
              </div>
              <div className="wk-form-group">
                <label><Briefcase size={12} /> Role</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Mason, Helper, Supervisor"
                  className="wk-form-input"
                />
              </div>
            </div>

            <div className="wk-form-row">
              <div className="wk-form-group">
                <label><Banknote size={12} /> Daily Rate (BD)</label>
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
                <label><Phone size={12} /> Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+973 ..."
                  className="wk-form-input"
                />
              </div>
            </div>

            <div className="wk-form-row">
              <div className="wk-form-group">
                <label><Mail size={12} /> Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="wk-form-input"
                />
              </div>
              <div className="wk-form-group">
                <label><MapPin size={12} /> Address</label>
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
                <label><Shield size={12} /> Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                  placeholder="Contact person name"
                  className="wk-form-input"
                />
              </div>
              <div className="wk-form-group">
                <label><Phone size={12} /> Emergency Phone</label>
                <input
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  placeholder="Emergency number"
                  className="wk-form-input"
                />
              </div>
            </div>

            <div className="wk-form-row">
              <div className="wk-form-group">
                <label><Award size={12} /> Skills</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={e => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="e.g., Masonry, Carpentry"
                  className="wk-form-input"
                />
              </div>
              <div className="wk-form-group">
                <label><Timer size={12} /> Experience (years)</label>
                <input
                  type="number"
                  value={formData.experience}
                  onChange={e => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="Years"
                  className="wk-form-input"
                />
              </div>
            </div>

            {/* ⭐ DEDUCTION SECTION */}
            <div className={`wk-form-deduction-block ${formData.deductionEnabled ? 'active' : ''}`}>
              <div className="wk-form-deduction-header">
                <div className="wk-form-deduction-header-left">
                  <div className="wk-form-deduction-icon">
                    <Percent size={16} />
                  </div>
                  <div>
                    <div className="wk-form-deduction-title">Salary Deduction</div>
                    <div className="wk-form-deduction-subtitle">
                      {formData.deductionEnabled
                        ? 'Deduction will be applied to this worker\'s salary'
                        : 'No deduction applied'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`wk-deduction-toggle ${formData.deductionEnabled ? 'on' : 'off'}`}
                  onClick={() => setFormData({ ...formData, deductionEnabled: !formData.deductionEnabled })}
                  aria-label={formData.deductionEnabled ? 'Disable deduction' : 'Enable deduction'}
                >
                  {formData.deductionEnabled ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                </button>
              </div>

              {formData.deductionEnabled && (
                <div className="wk-form-deduction-body">
                  <div className="wk-form-group">
                    <label><Percent size={12} /> Deduction Percentage (0–100)</label>
                    <div className="wk-form-percent-input">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.deductionPercentage}
                        onChange={e => setFormData({ ...formData, deductionPercentage: e.target.value })}
                        placeholder="e.g., 5"
                        className="wk-form-input"
                      />
                      <span className="wk-form-percent-suffix">%</span>
                    </div>
                  </div>

                  {/* Live preview */}
                  {parseFloat(formData.dailyRate) > 0 && parseFloat(formData.deductionPercentage) > 0 && (
                    <div className="wk-form-deduction-preview">
                      <div className="wk-preview-row">
                        <span>Gross daily rate</span>
                        <strong>{Utils.formatCurrency(parseFloat(formData.dailyRate))}</strong>
                      </div>
                      <div className="wk-preview-row deduction">
                        <span>Deduction ({parseFloat(formData.deductionPercentage).toFixed(2)}%)</span>
                        <strong>
                          - {Utils.formatCurrency(
                            parseFloat(formData.dailyRate) * (parseFloat(formData.deductionPercentage) / 100)
                          )}
                        </strong>
                      </div>
                      <div className="wk-preview-row net">
                        <span>Net daily rate</span>
                        <strong>
                          {Utils.formatCurrency(
                            parseFloat(formData.dailyRate) * (1 - parseFloat(formData.deductionPercentage) / 100)
                          )}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="wk-form-group">
              <label><FileText size={12} /> Notes</label>
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
                <Save size={15} /> {editingId ? 'Update Worker' : 'Add Worker'}
              </button>
              <button
                type="button"
                className="wk-btn-secondary"
                onClick={() => { setShowForm(false); resetForm(); }}
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
  // STAT CARDS (now 5 cards including deduction)
  // ============================================
  const statItems = [
    {
      id: 'total',
      icon: Users,
      label: 'Total Workers',
      value: stats.total,
      meta: `${stats.totalRoles} distinct roles`,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      accent: 'linear-gradient(90deg, #3b82f6, #60a5fa)'
    },
    {
      id: 'active',
      icon: UserCheck,
      label: 'Active Workers',
      value: stats.active,
      meta: stats.total > 0
        ? `${((stats.active / stats.total) * 100).toFixed(0)}% of workforce`
        : 'no workers',
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
      accent: 'linear-gradient(90deg, #009846, #00b856)'
    },
    {
      id: 'cost',
      icon: Banknote,
      label: 'Daily Labor Cost',
      value: Utils.formatCurrencyShort(stats.totalDailyCost),
      meta: `avg ${Utils.formatCurrencyShort(stats.avgRate)}/worker`,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      accent: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
    },
    // ⭐ NEW deduction stat card
    {
      id: 'deduction',
      icon: Percent,
      label: 'With Deduction',
      value: stats.deductionCount,
      meta: stats.deductionCount > 0
        ? `avg ${stats.avgDeductionPct.toFixed(1)}% deducted`
        : 'no deductions',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
      accent: 'linear-gradient(90deg, #8b5cf6, #a78bfa)'
    },
    {
      id: 'inactive',
      icon: UserX,
      label: 'Inactive',
      value: stats.inactive,
      meta: stats.total > 0
        ? `${((stats.inactive / stats.total) * 100).toFixed(0)}% of workforce`
        : 'no workers',
      color: '#dc2626',
      bg: 'rgba(220, 38, 38, 0.12)',
      accent: 'linear-gradient(90deg, #dc2626, #ef4444)'
    }
  ];

  const renderStats = () => (
    <div className="wk-stats-grid">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className="wk-stat-card"
            onMouseEnter={(e) => handleCardHover(item.id, e)}
            onMouseLeave={handleCardLeave}
            onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
          >
            <div className="wk-stat-accent" style={{ background: item.accent }} />
            <div className="wk-stat-icon-wrapper" style={{ background: item.bg, color: item.color }}>
              <Icon size={20} />
            </div>
            <div className="wk-stat-content">
              <span className="wk-stat-label">{item.label}</span>
              <span className="wk-stat-value">{item.value}</span>
              <span className="wk-stat-meta">{item.meta}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ============================================
  // RENDER TOOLTIP
  // ============================================
  const renderTooltip = () => {
    if (!hoveredCard || !cardDetails[hoveredCard]) return null;
    return (
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
    );
  };

  // ============================================
  // RENDER PAGINATION
  // ============================================
  const renderPagination = () => {
    if (filteredWorkers.length === 0) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredWorkers.length);

    return (
      <div className="wk-pagination">
        <div className="wk-pagination-info">
          Showing <strong>{startItem}</strong> – <strong>{endItem}</strong> of <strong>{filteredWorkers.length}</strong> workers
        </div>

        <div className="wk-pagination-controls">
          <div className="wk-pagination-items">
            <span>Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="wk-pagination-select"
            >
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
              <option value={18}>18</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>

          <div className="wk-pagination-buttons">
            <button className="wk-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1} title="First page">
              <ChevronsLeft size={15} />
            </button>
            <button className="wk-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} title="Previous page">
              <ChevronLeft size={15} />
            </button>

            {getPageNumbers().map(page => (
              <button
                key={page}
                className={`wk-page-btn ${page === currentPage ? 'active' : ''}`}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}

            <button className="wk-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} title="Next page">
              <ChevronRight size={15} />
            </button>
            <button className="wk-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} title="Last page">
              <ChevronsRight size={15} />
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
    <div className={`wk-management ${mounted ? 'is-mounted' : ''}`}>
      {toast && (
        <div className={`wk-toast wk-toast-${toast.type}`} key={toast.id}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="wk-ambient">
        <div className="wk-ambient-orb wk-ambient-1" />
        <div className="wk-ambient-orb wk-ambient-2" />
        <div className="wk-ambient-orb wk-ambient-3" />
      </div>

      {/* Header */}
      <div className="wk-header">
        <div className="wk-header-left">
          <div className="wk-header-icon-wrapper">
            <Users size={22} />
          </div>
          <div>
            <h2>Workers</h2>
            <p className="wk-header-subtitle">
              {stats.total} worker{stats.total !== 1 ? 's' : ''} · {stats.active} active · {stats.totalRoles} role{stats.totalRoles !== 1 ? 's' : ''} · {stats.deductionCount} with deduction
            </p>
          </div>
        </div>
        <div className="wk-header-right">
          <div className="wk-search-box">
            <Search size={15} className="wk-search-icon" />
            <input
              type="text"
              placeholder="Search name, role, phone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button type="button" className="wk-clear-search" onClick={() => setSearchTerm('')}>
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="wk-btn-ghost wk-theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>

          <button type="button" className="wk-btn-ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            className="wk-btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <Plus size={15} /> New Worker
          </button>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}
      {renderTooltip()}

      {/* Filters */}
      <div className="wk-filters-row">
        <div className="wk-status-filter">
          {[
            { id: 'all', label: 'All Workers', icon: Layers, count: stats.total },
            { id: 'active', label: 'Active', icon: CheckCircle, count: stats.active },
            { id: 'inactive', label: 'Inactive', icon: AlertCircle, count: stats.inactive }
          ].map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                type="button"
                className={`wk-status-pill ${statusFilter === f.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.id)}
              >
                <Icon size={12} />
                <span>{f.label}</span>
                <span className="wk-pill-count">{f.count}</span>
              </button>
            );
          })}
        </div>

        {/* ⭐ Deduction filter */}
        <div className="wk-deduction-filter">
          <Percent size={13} className="wk-deduction-filter-icon" />
          <select
            value={deductionFilter}
            onChange={(e) => setDeductionFilter(e.target.value)}
            className="wk-deduction-select"
          >
            <option value="all">All Deductions</option>
            <option value="with">With Deduction ({stats.deductionCount})</option>
            <option value="without">Without Deduction ({stats.total - stats.deductionCount})</option>
          </select>
        </div>

        {roles.length > 1 && (
          <div className="wk-role-filter">
            <Briefcase size={13} className="wk-role-filter-icon" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="wk-role-select"
            >
              <option value="all">All Roles</option>
              {roles.filter(r => r !== 'all').map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilters && (
          <button type="button" className="wk-clear-filters" onClick={clearFilters}>
            <X size={13} /> Clear
          </button>
        )}

        <span className="wk-result-count">
          Showing {filteredWorkers.length} of {stats.total}
        </span>
      </div>

      {/* Content */}
      {filteredWorkers.length === 0 ? (
        <div className="wk-empty-state">
          <div className="wk-empty-icon-wrapper">
            {hasActiveFilters ? <Search size={44} /> : <HardHat size={44} />}
          </div>
          <h3>{hasActiveFilters ? 'No matching workers' : 'No workers yet'}</h3>
          <p>
            {hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Add your first worker to get started.'}
          </p>
          {hasActiveFilters ? (
            <button type="button" className="wk-btn-secondary" onClick={clearFilters}>
              <X size={14} /> Clear filters
            </button>
          ) : (
            <button
              type="button"
              className="wk-btn-primary"
              onClick={() => { resetForm(); setShowForm(true); }}
            >
              <Plus size={15} /> Add Worker
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="wk-grid">
            {paginatedWorkers.map((w, i) => renderWorkerCard(w, i))}
          </div>
          {renderPagination()}
        </>
      )}

      {/* Modals */}
      {showForm && renderFormModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default WorkersManagerComponent;