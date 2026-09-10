// src/components/EntriesManager.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Building2,
  DollarSign,
  Users,
  Receipt,
  FileText,
  X,
  Filter,
  Search,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Info,
  Eye,
  Printer,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  LayoutDashboard,
  Wallet,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Star,
  Gauge,
  Timer,
  Activity,
  Zap,
  Shield,
  Crown,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import Utils from '../utils/Utils';
import './EntriesManager.css';

const EntriesManagerComponent = ({ data, addEntry, updateEntry, deleteEntry }) => {
  // ============================================
  // STATE
  // ============================================
  const [formData, setFormData] = useState({
    date: Utils.today(),
    siteId: '',
    kamai: '',
    labour: '',
    oneTime: '',
    note: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [filter, setFilter] = useState({ site: '', dateFrom: '', dateTo: '' });
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hoveredEntry, setHoveredEntry] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const dailyOH = useMemo(() =>
    Utils.calculateDailyOH(data.monthlyOverhead, new Date(formData.date)),
    [data.monthlyOverhead, formData.date]
  );

  // ============================================
  // HELPERS
  // ============================================
  const isAutoEntry = (entry) => {
    return entry?.source === 'auto' || (entry?.id && String(entry.id).startsWith('auto-'));
  };

  const getSourceBadge = (entry) => {
    const auto = isAutoEntry(entry);
    const overridden = entry?.manualOverride;

    if (auto) {
      return {
        label: 'Auto',
        className: 'em-source-badge em-source-auto',
        icon: <Zap size={11} />
      };
    }
    if (overridden) {
      return {
        label: 'Override',
        className: 'em-source-badge em-source-override',
        icon: <Edit size={11} />
      };
    }
    return {
      label: 'Manual',
      className: 'em-source-badge em-source-manual',
      icon: <Edit size={11} />
    };
  };

  // ============================================
  // FILTERED ENTRIES
  // ============================================
  const filteredEntries = useMemo(() => {
    return (data.entries || []).filter(entry => {
      if (filter.site && entry.siteId !== filter.site) return false;
      if (filter.dateFrom && entry.date < filter.dateFrom) return false;
      if (filter.dateTo && entry.date > filter.dateTo) return false;
      return true;
    }).sort((a, b) => {
      const d = (b.date || '').localeCompare(a.date || '');
      if (d !== 0) return d;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [data.entries, filter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredEntries.slice(startIndex, endIndex);
  }, [filteredEntries, currentPage, itemsPerPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const totalEntries = filteredEntries.length;
  const totalRevenue = filteredEntries.reduce((sum, e) => sum + (e.kamai || 0), 0);
  const totalProfit = filteredEntries.reduce((sum, e) => sum + Utils.calculateEntryProfit(e), 0);
  const avgProfit = totalEntries > 0 ? totalProfit / totalEntries : 0;

  const cardDetails = {
    entries: {
      title: 'Total Entries',
      details: [
        { label: 'Total Entries', value: totalEntries },
        { label: 'Total Revenue', value: Utils.formatCurrency(totalRevenue) },
        { label: 'Total Profit', value: Utils.formatCurrency(totalProfit) },
        { label: 'Avg Profit/Entry', value: Utils.formatCurrency(avgProfit) }
      ]
    },
    revenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Total Revenue', value: Utils.formatCurrency(totalRevenue) },
        { label: 'Total Entries', value: totalEntries },
        { label: 'Avg Revenue/Entry', value: totalEntries > 0 ? Utils.formatCurrency(totalRevenue / totalEntries) : '0.000' },
        { label: 'Total Profit', value: Utils.formatCurrency(totalProfit) }
      ]
    },
    profit: {
      title: 'Total Profit',
      details: [
        { label: 'Total Profit', value: Utils.formatCurrency(totalProfit) },
        { label: 'Total Revenue', value: Utils.formatCurrency(totalRevenue) },
        { label: 'Profit Margin', value: totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0%' },
        { label: 'Avg Profit/Entry', value: Utils.formatCurrency(avgProfit) }
      ]
    },
    avg: {
      title: 'Avg Profit/Entry',
      details: [
        { label: 'Avg Profit/Entry', value: Utils.formatCurrency(avgProfit) },
        { label: 'Total Entries', value: totalEntries },
        { label: 'Total Profit', value: Utils.formatCurrency(totalProfit) },
        { label: 'Best Entry', value: totalEntries > 0 ? Utils.formatCurrency(Math.max(...filteredEntries.map(e => Utils.calculateEntryProfit(e)))) : '0.000' }
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
  // HANDLERS
  // ============================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.siteId) {
      setErrorMessage('Please select a site');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const entry = {
      date: formData.date,
      siteId: formData.siteId,
      kamai: parseFloat(formData.kamai) || 0,
      labour: parseFloat(formData.labour) || 0,
      overhead: dailyOH,
      oneTime: parseFloat(formData.oneTime) || 0,
      note: formData.note,
      manualOverride: isOverrideMode || !!editingId
    };

    try {
      if (editingId) {
        updateEntry(editingId, entry);
        setSuccessMessage('Entry updated successfully!');
        setEditingId(null);
      } else if (isOverrideMode) {
        // Creating a manual override for a (date, site) that had an auto row.
        // The backend upserts by (date, site).
        addEntry(entry);
        setSuccessMessage('Override saved successfully!');
      } else {
        addEntry(entry);
        setSuccessMessage('Entry added successfully!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);

      resetForm();
      setShowModal(false);
    } catch (err) {
      setErrorMessage('Failed to save entry. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleDelete = (id) => {
    try {
      deleteEntry(id);
      setSuccessMessage('Entry deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowDeleteConfirm(null);
      if (paginatedEntries.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      setErrorMessage('Failed to delete entry. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      date: Utils.today(),
      siteId: '',
      kamai: '',
      labour: '',
      oneTime: '',
      note: ''
    });
    setEditingId(null);
    setIsOverrideMode(false);
  };

  const openEditModal = (entry) => {
    setEditingId(entry.id);
    setIsOverrideMode(false);
    setFormData({
      date: entry.date,
      siteId: entry.siteId,
      kamai: (entry.kamai || 0).toString(),
      labour: (entry.labour || 0).toString(),
      oneTime: (entry.oneTime || 0).toString(),
      note: entry.note || ''
    });
    setShowModal(true);
  };

  // Opens the form prefilled with the auto-computed values so the user
  // can confirm/save them as a manual override for that date+site.
  const openOverrideModal = (entry) => {
    setEditingId(null);
    setIsOverrideMode(true);
    setFormData({
      date: entry.date,
      siteId: entry.siteId,
      kamai: (entry.kamai || 0).toString(),
      labour: (entry.labour || 0).toString(),
      oneTime: (entry.oneTime || 0).toString(),
      note: entry.note || ''
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getSiteName = (id) => data.sites.find(s => s.id === id)?.name || 'Unknown Site';

  // ============================================
  // PAGINATION HELPERS
  // ============================================
  const goToPage = (page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = () => {
    const modalTitle = editingId
      ? 'Edit Entry'
      : isOverrideMode
        ? 'Override Auto Entry'
        : 'New Entry';

    const submitLabel = editingId
      ? 'Update Entry'
      : isOverrideMode
        ? 'Save Override'
        : 'Add Entry';

    return (
      <div className="em-modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
        <div className="em-modal-content em-entry-modal" onClick={e => e.stopPropagation()}>
          <div className="em-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="em-modal-header-left">
              {editingId ? <Edit size={24} color="#ffffff" /> : isOverrideMode ? <Zap size={24} color="#ffffff" /> : <Plus size={24} color="#ffffff" />}
              <h3 style={{ color: '#ffffff' }}>{modalTitle}</h3>
            </div>
            <button className="em-modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="em-modal-body">
            {isOverrideMode && (
              <div className="em-override-notice">
                <Zap size={16} />
                <span>You're editing an auto-computed entry. Saving will lock in these values as a manual override.</span>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="em-form-row">
                <div className="em-form-group">
                  <label><Calendar size={14} /> Date <span className="em-required">*</span></label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                    disabled={isOverrideMode}
                    className={`em-form-input ${isOverrideMode ? 'em-disabled-input' : ''}`}
                  />
                </div>
                <div className="em-form-group">
                  <label><Building2 size={14} /> Site <span className="em-required">*</span></label>
                  <select
                    value={formData.siteId}
                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                    required
                    disabled={isOverrideMode}
                    className={`em-form-select ${isOverrideMode ? 'em-disabled-input' : ''}`}
                  >
                    <option value="">Select Site</option>
                    {data.sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="em-form-row">
                <div className="em-form-group">
                  <label><DollarSign size={14} /> Revenue (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.kamai}
                    onChange={e => setFormData({ ...formData, kamai: e.target.value })}
                    placeholder="0.000"
                    className="em-form-input"
                  />
                </div>
                <div className="em-form-group">
                  <label><Users size={14} /> Labour Cost (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.labour}
                    onChange={e => setFormData({ ...formData, labour: e.target.value })}
                    placeholder="0.000"
                    className="em-form-input"
                  />
                </div>
              </div>

              <div className="em-form-row">
                <div className="em-form-group">
                  <label><Receipt size={14} /> Overhead (Auto) BD</label>
                  <input
                    type="text"
                    value={Utils.formatCurrency(dailyOH)}
                    disabled
                    className="em-form-input em-disabled-input"
                  />
                </div>
                <div className="em-form-group">
                  <label><FileText size={14} /> One-Time Expense BD</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.oneTime}
                    onChange={e => setFormData({ ...formData, oneTime: e.target.value })}
                    placeholder="0.000"
                    className="em-form-input"
                  />
                </div>
              </div>

              <div className="em-form-group">
                <label><FileText size={14} /> Note</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  placeholder="What work was done today?"
                  className="em-form-input"
                />
              </div>

              <div className="em-form-actions">
                <button type="submit" className="em-btn-primary">
                  <Save size={16} /> {submitLabel}
                </button>
                <button type="button" className="em-btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
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
  // RENDER DELETE CONFIRMATION
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm) return null;

    const target = filteredEntries.find(e => e.id === showDeleteConfirm);
    const isOverride = target?.manualOverride;

    return (
      <div className="em-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
        <div className="em-modal-content em-delete-modal" onClick={e => e.stopPropagation()}>
          <div className="em-modal-header" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
            <div className="em-modal-header-left">
              <Trash2 size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>{isOverride ? 'Revert to Auto' : 'Delete Entry'}</h3>
            </div>
            <button className="em-modal-close" onClick={() => setShowDeleteConfirm(null)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="em-modal-body">
            <div className="em-delete-content">
              <AlertCircle size={48} color="#dc2626" />
              {isOverride ? (
                <>
                  <p>Revert this entry back to its auto-computed values?</p>
                  <p className="em-delete-subtext">The manual override will be removed and the entry will be re-computed from attendance, expenses, and invoices.</p>
                </>
              ) : (
                <>
                  <p>Are you sure you want to delete this entry?</p>
                  <p className="em-delete-subtext">This action cannot be undone.</p>
                </>
              )}
              <div className="em-delete-actions">
                <button className="em-btn-danger" onClick={() => handleDelete(showDeleteConfirm)}>
                  <Trash2 size={16} /> {isOverride ? 'Revert' : 'Delete'}
                </button>
                <button className="em-btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
                  Cancel
                </button>
              </div>
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
    <div className="em-container">
      {/* Header */}
      <div className="em-header">
        <div className="em-header-left">
          <div className="em-header-icon-wrapper">
            <FileText size={28} />
            <span className="em-header-badge">Entries</span>
          </div>
          <div>
            <h2>Manage Entries</h2>
            <p className="em-header-subtitle">Auto-computed from attendance, expenses & invoices — override when needed</p>
          </div>
        </div>
        <div className="em-header-right">
          <button className="em-btn-refresh" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="em-btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            New Entry
          </button>
        </div>
      </div>

      {/* Stats Cards with Tooltips */}
      <div className="em-stats-grid">
        <div
          className="em-stat-card"
          onMouseEnter={(e) => handleCardHover('entries', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="em-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <FileText size={22} />
          </div>
          <div className="em-stat-content">
            <span className="em-stat-label">Total Entries</span>
            <span className="em-stat-value">{totalEntries}</span>
          </div>
          <div className="em-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="em-stat-card"
          onMouseEnter={(e) => handleCardHover('revenue', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="em-stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <DollarSign size={22} />
          </div>
          <div className="em-stat-content">
            <span className="em-stat-label">Total Revenue</span>
            <span className="em-stat-value">{Utils.formatCurrencyShort(totalRevenue)}</span>
          </div>
          <div className="em-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="em-stat-card"
          onMouseEnter={(e) => handleCardHover('profit', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="em-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <TrendingUp size={22} />
          </div>
          <div className="em-stat-content">
            <span className="em-stat-label">Total Profit</span>
            <span className="em-stat-value" style={{ color: totalProfit >= 0 ? '#22c55e' : '#dc2626' }}>
              {Utils.formatCurrencyShort(totalProfit)}
            </span>
          </div>
          <div className="em-stat-trend">
            {totalProfit >= 0 ? <TrendingUp size={16} style={{ color: '#22c55e' }} /> : <TrendingDown size={16} style={{ color: '#dc2626' }} />}
          </div>
        </div>

        <div
          className="em-stat-card"
          onMouseEnter={(e) => handleCardHover('avg', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="em-stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <Award size={22} />
          </div>
          <div className="em-stat-content">
            <span className="em-stat-label">Avg Profit/Entry</span>
            <span className="em-stat-value" style={{ color: avgProfit >= 0 ? '#22c55e' : '#dc2626' }}>
              {Utils.formatCurrencyShort(avgProfit)}
            </span>
          </div>
          <div className="em-stat-trend">
            <Award size={16} />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div
          className="em-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="em-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="em-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="em-tooltip-row">
                <span className="em-tooltip-label">{detail.label}</span>
                <span className="em-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {errorMessage && (
        <div className="em-error-message">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="em-success-message">
          <CheckCircle size={16} /> {successMessage}
        </div>
      )}

      {/* Filters */}
      <div className="em-filters-section">
        <div className="em-filter-group">
          <div className="em-filter-item">
            <Building2 size={16} />
            <select
              value={filter.site}
              onChange={e => setFilter({ ...filter, site: e.target.value })}
              className="em-filter-select"
            >
              <option value="">All Sites</option>
              {data.sites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>
          <div className="em-filter-item">
            <Calendar size={16} />
            <input
              type="date"
              value={filter.dateFrom}
              onChange={e => setFilter({ ...filter, dateFrom: e.target.value })}
              placeholder="From"
              className="em-filter-date"
            />
          </div>
          <div className="em-filter-item">
            <Calendar size={16} />
            <input
              type="date"
              value={filter.dateTo}
              onChange={e => setFilter({ ...filter, dateTo: e.target.value })}
              placeholder="To"
              className="em-filter-date"
            />
          </div>
        </div>
        <div className="em-filter-actions">
          <span className="em-filter-count">{totalEntries} entries</span>
          <button className="em-btn-clear-filter" onClick={() => setFilter({ site: '', dateFrom: '', dateTo: '' })}>
            <X size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Entries Grid */}
      <div className="em-entries-grid">
        {paginatedEntries.map(entry => {
          const profit = Utils.calculateEntryProfit(entry);
          const siteName = getSiteName(entry.siteId);
          const auto = isAutoEntry(entry);
          const badge = getSourceBadge(entry);

          return (
            <div
              key={entry.id}
              className={`em-entry-card ${auto ? 'em-entry-auto' : ''}`}
              onMouseEnter={() => setHoveredEntry(entry.id)}
              onMouseLeave={() => setHoveredEntry(null)}
            >
              <div className="em-entry-header">
                <div className="em-entry-left">
                  <div className="em-entry-date">
                    <Calendar size={14} />
                    {Utils.formatDate(entry.date)}
                  </div>
                  <div className="em-entry-site">
                    <Building2 size={14} />
                    {siteName}
                  </div>
                  <div className={badge.className}>
                    {badge.icon}
                    <span>{badge.label}</span>
                  </div>
                </div>
                <div className={`em-entry-profit ${profit >= 0 ? 'em-positive' : 'em-negative'}`}>
                  {profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Utils.formatCurrency(profit)}
                </div>
              </div>

              <div className="em-entry-details-grid">
                <div className="em-detail-item">
                  <span className="em-detail-label">Revenue</span>
                  <span className="em-detail-value">{Utils.formatCurrency(entry.kamai)}</span>
                </div>
                <div className="em-detail-item">
                  <span className="em-detail-label">Labour</span>
                  <span className="em-detail-value">{Utils.formatCurrency(entry.labour)}</span>
                </div>
                <div className="em-detail-item">
                  <span className="em-detail-label">Overhead</span>
                  <span className="em-detail-value">{Utils.formatCurrency(entry.overhead)}</span>
                </div>
                <div className="em-detail-item">
                  <span className="em-detail-label">One-Time</span>
                  <span className="em-detail-value">{Utils.formatCurrency(entry.oneTime)}</span>
                </div>
              </div>

              {entry.note && (
                <div className="em-entry-note">
                  <FileText size={14} />
                  <span>{entry.note}</span>
                </div>
              )}

              <div className="em-entry-actions">
                {auto ? (
                  <button className="em-btn-action em-btn-override" onClick={() => openOverrideModal(entry)}>
                    <Zap size={16} /> Override
                  </button>
                ) : (
                  <>
                    <button className="em-btn-action em-btn-edit" onClick={() => openEditModal(entry)}>
                      <Edit size={16} /> Edit
                    </button>
                    {entry.manualOverride && (
                      <button
                        className="em-btn-action em-btn-revert"
                        onClick={() => setShowDeleteConfirm(entry.id)}
                        title="Remove override and revert to auto"
                      >
                        <RotateCcw size={16} /> Revert
                      </button>
                    )}
                    <button className="em-btn-action em-btn-delete" onClick={() => setShowDeleteConfirm(entry.id)}>
                      <Trash2 size={16} /> Delete
                    </button>
                  </>
                )}
              </div>

              {/* Hover Details */}
              {hoveredEntry === entry.id && (
                <div className="em-entry-hover">
                  <div className="em-hover-content">
                    <div className="em-hover-row">
                      <span>Revenue</span>
                      <span>{Utils.formatCurrency(entry.kamai)}</span>
                    </div>
                    <div className="em-hover-row">
                      <span>Labour</span>
                      <span>{Utils.formatCurrency(entry.labour)}</span>
                    </div>
                    <div className="em-hover-row">
                      <span>Overhead</span>
                      <span>{Utils.formatCurrency(entry.overhead)}</span>
                    </div>
                    <div className="em-hover-row">
                      <span>One-Time</span>
                      <span>{Utils.formatCurrency(entry.oneTime)}</span>
                    </div>
                    <div className="em-hover-row em-hover-total">
                      <span>Profit</span>
                      <span style={{ color: profit >= 0 ? '#22c55e' : '#dc2626' }}>
                        {Utils.formatCurrency(profit)}
                      </span>
                    </div>
                    {entry.note && (
                      <div className="em-hover-row em-hover-note">
                        <span>Note</span>
                        <span>{entry.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredEntries.length === 0 && (
          <div className="em-empty-state">
            <div className="em-empty-icon-wrapper">
              <FileText size={64} />
            </div>
            <h3>No entries found</h3>
            <p>Add your first entry by clicking the "New Entry" button above!</p>
            <button className="em-btn-primary" onClick={openAddModal}>
              <Plus size={18} /> Add Entry
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredEntries.length > 0 && (
        <div className="em-pagination">
          <div className="em-pagination-info">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredEntries.length)} of {filteredEntries.length} entries
          </div>
          <div className="em-pagination-controls">
            <div className="em-pagination-items-per-page">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="em-pagination-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="em-pagination-buttons">
              <button
                className="em-pagination-btn"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                className="em-pagination-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>

              {getPageNumbers().map(page => (
                <button
                  key={page}
                  className={`em-pagination-btn ${page === currentPage ? 'em-pagination-active' : ''}`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                className="em-pagination-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
              <button
                className="em-pagination-btn"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && renderFormModal()}
      {renderDeleteConfirm()}
    </div>
  );
};

export default EntriesManagerComponent;