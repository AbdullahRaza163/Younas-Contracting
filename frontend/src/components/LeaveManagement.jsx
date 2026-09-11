// src/components/LeaveManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  UserX,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  FileText,
  Printer,
  Download,
  Mail,
  Phone,
  User,
  Building2,
  Star,
  StarHalf,
  TrendingUp,
  TrendingDown,
  Award,
  LayoutDashboard,
  FolderKanban,
  Wallet,
  CalendarDays,
  MessageSquare,
  Video,
  Link2,
  Unlink,
  PhoneCall,
  Mail as MailIcon,
  Gauge,
  Sparkles,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Zap,
  Shield,
  HardHat,
  Briefcase,
  Timer,
  Activity,
  Clock as ClockIcon
} from 'lucide-react';
import Utils from '../utils/Utils';
import './LeaveManagement.css';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

const LeaveManagement = ({ data, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('requests');
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

  // Data states
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveStats, setLeaveStats] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    workerId: '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    notes: ''
  });

  // Holiday form
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    description: '',
    isRecurring: false,
    type: 'public'
  });

  // ============================================
  // LOAD DATA
  // ============================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [requests, types, balances, holidaysData, stats] = await Promise.all([
        fetch(`${API_BASE_URL}/leave/requests`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/leave/types`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/leave/balances?year=${selectedYear}`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/leave/holidays?year=${selectedYear}`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/leave/stats?year=${selectedYear}`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : {})
      ]);

      setLeaveRequests(requests);
      setLeaveTypes(types);
      setLeaveBalances(balances);
      setHolidays(holidaysData);
      setLeaveStats(stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData, selectedYear]);

  // ============================================
  // FILTER DATA
  // ============================================
  const filteredRequests = useMemo(() => {
    let filtered = leaveRequests;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.workerName?.toLowerCase().includes(search) ||
        r.reason?.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (leaveTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.leaveTypeId === leaveTypeFilter);
    }

    return filtered;
  }, [leaveRequests, searchTerm, statusFilter, leaveTypeFilter]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    total: {
      title: 'Total Requests',
      details: [
        { label: 'Total Requests', value: leaveStats?.total || 0 },
        { label: 'Pending', value: leaveStats?.pending || 0 },
        { label: 'Approved', value: leaveStats?.approved || 0 },
        { label: 'Rejected', value: leaveStats?.rejected || 0 }
      ]
    },
    pending: {
      title: 'Pending Requests',
      details: [
        { label: 'Pending', value: leaveStats?.pending || 0 },
        { label: 'Awaiting Approval', value: leaveStats?.pending || 0 },
        { label: 'Total Requests', value: leaveStats?.total || 0 },
        { label: 'Pending Rate', value: leaveStats?.total > 0 ? `${((leaveStats.pending / leaveStats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    approved: {
      title: 'Approved Requests',
      details: [
        { label: 'Approved', value: leaveStats?.approved || 0 },
        { label: 'Total Requests', value: leaveStats?.total || 0 },
        { label: 'Total Days', value: leaveStats?.totalDays || 0 },
        { label: 'Approval Rate', value: leaveStats?.total > 0 ? `${((leaveStats.approved / leaveStats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    rejected: {
      title: 'Rejected Requests',
      details: [
        { label: 'Rejected', value: leaveStats?.rejected || 0 },
        { label: 'Total Requests', value: leaveStats?.total || 0 },
        { label: 'Cancelled', value: leaveStats?.cancelled || 0 },
        { label: 'Rejection Rate', value: leaveStats?.total > 0 ? `${((leaveStats.rejected / leaveStats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    days: {
      title: 'Total Leave Days',
      details: [
        { label: 'Total Days', value: leaveStats?.totalDays || 0 },
        { label: 'Approved Requests', value: leaveStats?.approved || 0 },
        { label: 'Avg Days/Request', value: leaveStats?.approved > 0 ? `${(leaveStats.totalDays / leaveStats.approved).toFixed(1)}` : '0' },
        { label: 'On Leave Today', value: leaveStats?.onLeaveToday || 0 }
      ]
    },
    onLeave: {
      title: 'On Leave Today',
      details: [
        { label: 'On Leave Today', value: leaveStats?.onLeaveToday || 0 },
        { label: 'Total Workers', value: data.workers?.length || 0 },
        { label: 'Available Today', value: (data.workers?.length || 0) - (leaveStats?.onLeaveToday || 0) },
        { label: 'Leave Rate Today', value: data.workers?.length > 0 ? `${((leaveStats?.onLeaveToday || 0) / data.workers.length * 100).toFixed(1)}%` : '0%' }
      ]
    }
  };

  // ============================================
  // HANDLE HOVER FOR TOOLTIPS
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
  // GET STATUS BADGE
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      pending: { color: '#f59e0b', label: 'Pending', icon: ClockIcon },
      approved: { color: '#22c55e', label: 'Approved', icon: CheckCircle },
      rejected: { color: '#ef4444', label: 'Rejected', icon: X },
      cancelled: { color: '#6b7280', label: 'Cancelled', icon: X }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`leave-status-badge ${status}`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  // ============================================
  // HANDLE LEAVE REQUEST CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId
        ? `${API_BASE_URL}/leave/requests/${editingId}`
        : `${API_BASE_URL}/leave/requests`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save leave request');
      }

      const result = await response.json();
      setSuccess(editingId ? 'Leave request updated!' : 'Leave request created!');
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

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this leave request?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/leave/requests/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approvedBy: 'Manager' })
      });
      if (!response.ok) throw new Error('Failed to approve');
      setSuccess('Leave request approved!');
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this leave request?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/leave/requests/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: 'Request rejected' })
      });
      if (!response.ok) throw new Error('Failed to reject');
      setSuccess('Leave request rejected!');
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this leave request?')) return;
    try {
      await fetch(`${API_BASE_URL}/leave/requests/${id}`, { method: 'DELETE' });
      setSuccess('Leave request deleted!');
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      workerId: '',
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      reason: '',
      notes: ''
    });
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

  // ============================================
  // HANDLE HOLIDAY CRUD
  // ============================================
  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/leave/holidays`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(holidayForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save holiday');
      }

      setSuccess('Holiday added successfully!');
      await loadData();
      setHolidayForm({
        name: '',
        date: '',
        description: '',
        isRecurring: false,
        type: 'public'
      });
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await fetch(`${API_BASE_URL}/leave/holidays/${id}`, { method: 'DELETE' });
      setSuccess('Holiday deleted!');
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  const renderStats = () => {
    if (!leaveStats) return null;

    // Stat configurations for cleaner rendering
    const statItems = [
      { id: 'total', icon: FileText, label: 'Total Requests', value: leaveStats.total || 0, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
      { id: 'pending', icon: ClockIcon, label: 'Pending', value: leaveStats.pending || 0, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      { id: 'approved', icon: CheckCircle, label: 'Approved', value: leaveStats.approved || 0, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
      { id: 'rejected', icon: UserX, label: 'Rejected', value: leaveStats.rejected || 0, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
      { id: 'days', icon: Calendar, label: 'Total Days', value: leaveStats.totalDays || 0, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      { id: 'onLeave', icon: Users, label: 'On Leave Today', value: leaveStats.onLeaveToday || 0, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' }
    ];

    return (
      <div className="stats-grid-modern">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="stat-card-modern"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon-wrapper" style={{ background: item.bg, color: item.color }}>
                <Icon size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-label">{item.label}</span>
                <span className="stat-value">{item.value}</span>
              </div>
              <div className="stat-trend">
                <TrendingUp size={16} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // RENDER LEAVE REQUESTS TABLE
  // ============================================
  const renderRequestsTable = () => {
    return (
      <div className="requests-container">
        <div className="table-header-modern">
          <div className="table-header-left">
            <h4><FileText size={18} /> Leave Requests</h4>
            <span className="table-count">{filteredRequests.length} requests</span>
          </div>
          <button className="btn-primary-modern" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} /> New Request
          </button>
        </div>

        {/* Filters */}
        <div className="filters-section-modern">
          <div className="search-box-modern">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <div className="filter-group-modern">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={leaveTypeFilter} onChange={(e) => setLeaveTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {leaveTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="leave-table-modern">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state-cell">
                    <div className="empty-state-small">
                      <FileText size={32} />
                      <p>No leave requests found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request, index) => (
                  <tr key={request.id} className="animate-row" style={{ animationDelay: `${index * 30}ms` }}>
                    <td>
                      <div className="employee-info">
                        <span className="employee-name">{request.workerName}</span>
                      </div>
                    </td>
                    <td><span className="leave-type-label">{request.leaveTypeName}</span></td>
                    <td>{Utils.formatDate(request.startDate)}</td>
                    <td>{Utils.formatDate(request.endDate)}</td>
                    <td><span className="days-badge">{request.totalDays} days</span></td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>
                      <div className="action-buttons">
                        {request.status === 'pending' && (
                          <>
                            <button className="btn-approve" onClick={() => handleApprove(request.id)}>
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button className="btn-reject" onClick={() => handleReject(request.id)}>
                              <X size={14} /> Reject
                            </button>
                          </>
                        )}
                        <button className="btn-icon" onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailModal(true);
                        }}>
                          <Eye size={16} />
                        </button>
                        <button className="btn-icon" onClick={() => handleEdit(request)}>
                          <Edit size={16} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDelete(request.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER LEAVE BALANCES
  // ============================================
  const renderBalances = () => {
    // Group balances by worker
    const groupedBalances = leaveBalances.reduce((acc, balance) => {
      if (!acc[balance.workerId]) {
        acc[balance.workerId] = {
          workerName: balance.workerName,
          balances: []
        };
      }
      acc[balance.workerId].balances.push(balance);
      return acc;
    }, {});

    return (
      <div className="balances-container">
        <div className="table-header-modern">
          <div className="table-header-left">
            <h4><Users size={18} /> Leave Balances - {selectedYear}</h4>
            <span className="table-count">{Object.keys(groupedBalances).length} workers</span>
          </div>
          <div className="year-selector">
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="balances-grid">
          {Object.keys(groupedBalances).length === 0 ? (
            <div className="empty-state-modern">
              <Users size={48} />
              <h3>No Leave Balances</h3>
              <p>No leave balances found for {selectedYear}</p>
            </div>
          ) : (
            Object.keys(groupedBalances).map(workerId => {
              const worker = groupedBalances[workerId];
              return (
                <div key={workerId} className="balance-card-modern">
                  <div className="balance-header">
                    <div className="balance-worker">
                      <div className="worker-avatar">
                        <span>{worker.workerName.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="worker-name">{worker.workerName}</span>
                    </div>
                  </div>
                  <div className="balance-items">
                    {worker.balances.map(balance => (
                      <div key={balance.id} className="balance-item-modern">
                        <div className="balance-type-info">
                          <span className="balance-type">{balance.leaveTypeName}</span>
                          <span className="balance-total">{balance.totalDays} days</span>
                        </div>
                        <div className="balance-details">
                          <div className="balance-usage">
                            <span className="balance-used">{balance.usedDays} used</span>
                            <span className="balance-remaining">{balance.remainingDays} remaining</span>
                          </div>
                          <div className="balance-progress">
                            <div className="balance-progress-fill" style={{
                              width: `${(balance.usedDays / balance.totalDays) * 100}%`,
                              background: balance.remainingDays < 3 ? '#ef4444' : '#22c55e'
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER HOLIDAYS
  // ============================================
  const renderHolidays = () => {
    return (
      <div className="holidays-container">
        <div className="table-header-modern">
          <div className="table-header-left">
            <h4><Calendar size={18} /> Holidays - {selectedYear}</h4>
            <span className="table-count">{holidays.length} holidays</span>
          </div>
          <button className="btn-primary-modern" onClick={() => {
            setHolidayForm({
              name: '',
              date: '',
              description: '',
              isRecurring: false,
              type: 'public'
            });
            document.getElementById('holiday-form')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <Plus size={16} /> Add Holiday
          </button>
        </div>

        <div className="holidays-grid">
          {holidays.length === 0 ? (
            <div className="empty-state-modern">
              <Calendar size={48} />
              <h3>No Holidays</h3>
              <p>No holidays added for {selectedYear}</p>
            </div>
          ) : (
            holidays.map(holiday => (
              <div key={holiday.id} className="holiday-card-modern">
                <div className="holiday-date">
                  <span className="holiday-day">{new Date(holiday.date).getDate()}</span>
                  <span className="holiday-month">{Utils.getShortMonthName(holiday.date)}</span>
                </div>
                <div className="holiday-info">
                  <div className="holiday-name">{holiday.name}</div>
                  <div className="holiday-type">
                    <span className={`holiday-type-badge ${holiday.type}`}>
                      {holiday.type}
                    </span>
                    {holiday.isRecurring && <span className="recurring-badge">Recurring</span>}
                  </div>
                  {holiday.description && <div className="holiday-description">{holiday.description}</div>}
                </div>
                <button className="btn-icon danger" onClick={() => handleDeleteHoliday(holiday.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Holiday Form */}
        <div id="holiday-form" className="holiday-form-container">
          <h4><Plus size={16} /> Add New Holiday</h4>
          <form onSubmit={handleHolidaySubmit} className="holiday-form">
            <div className="form-row-modern">
              <div className="form-group-modern">
                <label>Holiday Name <span className="required">*</span></label>
                <input
                  type="text"
                  value={holidayForm.name}
                  onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  required
                  placeholder="e.g., Eid Al Fitr"
                  className="form-input"
                />
              </div>
              <div className="form-group-modern">
                <label>Date <span className="required">*</span></label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  required
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-row-modern">
              <div className="form-group-modern">
                <label>Type</label>
                <select
                  value={holidayForm.type}
                  onChange={e => setHolidayForm({ ...holidayForm, type: e.target.value })}
                  className="form-select"
                >
                  <option value="public">Public</option>
                  <option value="company">Company</option>
                  <option value="religious">Religious</option>
                </select>
              </div>
              <div className="form-group-modern">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={holidayForm.isRecurring}
                    onChange={e => setHolidayForm({ ...holidayForm, isRecurring: e.target.checked })}
                  />
                  Recurring annually
                </label>
              </div>
            </div>
            <div className="form-group-modern">
              <label>Description</label>
              <input
                type="text"
                value={holidayForm.description}
                onChange={e => setHolidayForm({ ...holidayForm, description: e.target.value })}
                placeholder="Holiday description"
                className="form-input"
              />
            </div>
            <div className="form-actions-modern">
              <button type="submit" className="btn-primary-modern" disabled={loading}>
                <Save size={16} /> {loading ? 'Saving...' : 'Add Holiday'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER CALENDAR VIEW
  // ============================================
  const renderCalendar = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const leaveDays = leaveRequests.filter(r => {
      if (r.status !== 'approved') return false;
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return (
        (start.getMonth() === currentMonth && start.getFullYear() === currentYear) ||
        (end.getMonth() === currentMonth && end.getFullYear() === currentYear)
      );
    });

    const monthHolidays = holidays.filter(h => {
      const date = new Date(h.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const hasLeaveOnDay = (date) => {
      return leaveDays.some(r => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        return date >= start && date <= end;
      });
    };

    const isHolidayOnDay = (date) => {
      return monthHolidays.some(h => {
        const hDate = new Date(h.date);
        return hDate.getDate() === date.getDate() &&
          hDate.getMonth() === date.getMonth() &&
          hDate.getFullYear() === date.getFullYear();
      });
    };

    const getLeaveCountOnDay = (date) => {
      return leaveDays.filter(r => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        return date >= start && date <= end;
      }).length;
    };

    return (
      <div className="calendar-container-modern">
        <div className="table-header-modern">
          <div className="table-header-left">
            <h4><Calendar size={18} /> Leave Calendar - {monthNames[currentMonth]} {currentYear}</h4>
            <span className="table-count">{daysInMonth} days</span>
          </div>
          <div className="calendar-nav">
            <span className="calendar-info">
              <CalendarDays size={14} /> {daysInMonth} days in this month
            </span>
          </div>
        </div>

        <div className="calendar-grid-modern">
          {dayNames.map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}

          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(currentYear, currentMonth, day);

            const isWeekend = date.getDay() === 5 || date.getDay() === 6;
            const isHoliday = isHolidayOnDay(date);
            const hasLeave = hasLeaveOnDay(date);
            const leaveCount = getLeaveCountOnDay(date);

            return (
              <div
                key={day}
                className={`calendar-day 
                  ${isHoliday ? 'holiday' : ''} 
                  ${isWeekend ? 'weekend' : ''} 
                  ${hasLeave ? 'has-leave' : ''}
                `}
              >
                <span className="day-number">{day}</span>
                {hasLeave && (
                  <div className="day-leave-info">
                    <span className="leave-count">{leaveCount}</span>
                  </div>
                )}
                {isHoliday && (
                  <div className="day-holiday-info">
                    <span>🎉</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="calendar-legend-modern">
          <div className="legend-item">
            <span className="legend-color holiday-color"></span>
            <span>Holiday</span>
          </div>
          <div className="legend-item">
            <span className="legend-color weekend-color"></span>
            <span>Weekend (Fri/Sat)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color leave-color"></span>
            <span>Leave Day</span>
          </div>
        </div>

        <div className="calendar-month-info">
          <div className="info-item">
            <span className="info-label">Total Days:</span>
            <span className="info-value">{daysInMonth}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Weekend Days:</span>
            <span className="info-value">
              {Array.from({ length: daysInMonth }).filter((_, i) => {
                const day = i + 1;
                const date = new Date(currentYear, currentMonth, day);
                return date.getDay() === 5 || date.getDay() === 6;
              }).length}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Holidays:</span>
            <span className="info-value">{monthHolidays.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Leave Days:</span>
            <span className="info-value">
              {Array.from({ length: daysInMonth }).filter((_, i) => {
                const day = i + 1;
                const date = new Date(currentYear, currentMonth, day);
                return hasLeaveOnDay(date);
              }).length}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedRequest) return null;
    const r = selectedRequest;

    return (
      <div className="modal-overlay-modern" onClick={() => setShowDetailModal(false)}>
        <div className="modal-content-modern detail-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header-modern" style={{ background: 'linear-gradient(135deg, #1a2332, #2a3a4a)' }}>
            <div className="modal-header-left">
              <FileText size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Leave Request Details</h3>
            </div>
            <button className="modal-close-modern" onClick={() => setShowDetailModal(false)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="modal-body-modern">
            <div className="detail-grid-modern">
              <div className="detail-item">
                <span className="label"><User size={14} /> Employee</span>
                <span className="value">{r.workerName}</span>
              </div>
              <div className="detail-item">
                <span className="label"><Calendar size={14} /> Leave Type</span>
                <span className="value">{r.leaveTypeName}</span>
              </div>
              <div className="detail-item">
                <span className="label"><Calendar size={14} /> Start Date</span>
                <span className="value">{Utils.formatDate(r.startDate)}</span>
              </div>
              <div className="detail-item">
                <span className="label"><Calendar size={14} /> End Date</span>
                <span className="value">{Utils.formatDate(r.endDate)}</span>
              </div>
              <div className="detail-item">
                <span className="label"><Clock size={14} /> Total Days</span>
                <span className="value">{r.totalDays} days</span>
              </div>
              <div className="detail-item">
                <span className="label"><CheckCircle size={14} /> Status</span>
                <span className="value">{getStatusBadge(r.status)}</span>
              </div>
            </div>
            {r.reason && (
              <div className="detail-reason">
                <h4><FileText size={14} /> Reason</h4>
                <p>{r.reason}</p>
              </div>
            )}
            {r.notes && (
              <div className="detail-notes">
                <h4><FileText size={14} /> Notes</h4>
                <p>{r.notes}</p>
              </div>
            )}
            {r.approvedBy && (
              <div className="detail-approved">
                <h4><CheckCircle size={14} /> Approved By</h4>
                <p>{r.approvedBy} on {Utils.formatDate(r.approvedDate)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = () => {
    return (
      <div className="modal-overlay-modern" onClick={() => { setShowForm(false); resetForm(); }}>
        <div className="modal-content-modern form-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header-modern" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="modal-header-left">
              {editingId ? <Edit size={24} color="#ffffff" /> : <Plus size={24} color="#ffffff" />}
              <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Leave Request' : 'New Leave Request'}</h3>
            </div>
            <button className="modal-close-modern" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="modal-body-modern">
            <form onSubmit={handleSubmit}>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Employee <span className="required">*</span></label>
                  <select
                    value={formData.workerId}
                    onChange={e => setFormData({ ...formData, workerId: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="">Select Employee</option>
                    {data.workers?.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-modern">
                  <label>Leave Type <span className="required">*</span></label>
                  <select
                    value={formData.leaveTypeId}
                    onChange={e => setFormData({ ...formData, leaveTypeId: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="">Select Type</option>
                    {leaveTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name} ({type.daysAllowed} days)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Start Date <span className="required">*</span></label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group-modern">
                  <label>End Date <span className="required">*</span></label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group-modern">
                <label>Reason <span className="required">*</span></label>
                <textarea
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  required
                  placeholder="Reason for leave"
                  rows="3"
                  className="form-textarea"
                />
              </div>

              <div className="form-group-modern">
                <label>Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="form-input"
                />
              </div>

              <div className="form-actions-modern">
                <button type="submit" className="btn-primary-modern" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update Request' : 'Create Request')}
                </button>
                <button type="button" className="btn-secondary-modern" onClick={() => { setShowForm(false); resetForm(); }}>
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
  // MAIN RENDER
  // ============================================
  return (
    <div className="leave-management-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <Calendar size={28} />
            <span className="header-badge">Leave</span>
          </div>
          <div>
            <h2>Leave & Holiday Management</h2>
            <p className="header-subtitle">Track employee leave requests, balances, and holidays</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-refresh-modern" onClick={loadData}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div 
          className="card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="tooltip-row">
                <span className="tooltip-label">{detail.label}</span>
                <span className="tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error/Success */}
      {error && <div className="error-message-modern"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="success-message-modern"><CheckCircle size={16} /> {success}</div>}

      {/* View Tabs */}
      <div className="view-tabs-modern">
        <button
          className={`tab-btn ${viewMode === 'requests' ? 'active' : ''}`}
          onClick={() => setViewMode('requests')}
        >
          <FileText size={16} /> Requests
        </button>
        <button
          className={`tab-btn ${viewMode === 'balances' ? 'active' : ''}`}
          onClick={() => setViewMode('balances')}
        >
          <Users size={16} /> Balances
        </button>
        <button
          className={`tab-btn ${viewMode === 'holidays' ? 'active' : ''}`}
          onClick={() => setViewMode('holidays')}
        >
          <Calendar size={16} /> Holidays
        </button>
        <button
          className={`tab-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          <CalendarDays size={16} /> Calendar
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-state-modern">
          <div className="loading-spinner-modern"></div>
          <span>Loading...</span>
        </div>
      ) : (
        <>
          {viewMode === 'requests' && renderRequestsTable()}
          {viewMode === 'balances' && renderBalances()}
          {viewMode === 'holidays' && renderHolidays()}
          {viewMode === 'calendar' && renderCalendar()}
        </>
      )}

      {/* Modals */}
      {showForm && renderFormModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default LeaveManagement;