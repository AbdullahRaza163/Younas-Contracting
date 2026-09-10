// src/components/SitesManagerComponent.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2, Edit, Trash2, Plus, X, Save,
  MapPin, User, Phone, RefreshCw,
  TrendingUp, TrendingDown, BarChart3, Search,
  LayoutDashboard, Users, DollarSign,
  Calendar, Clock, Award, Crown, Star,
  Info, ArrowUpRight, ArrowDownRight,
  CheckCircle, AlertCircle, Target, Gauge,
  Zap, Sparkles, HardHat, Hash, Layers,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Activity, Flame
} from 'lucide-react';
import Utils from '../utils/Utils';
import './SitesManager.css';

const SitesManagerComponent = ({ data, addSite, updateSite, deleteSite, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | profit | loss | idle
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    manager: '',
    phone: ''
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
  // MEMOIZED DATA
  // ============================================
  const sites = data?.sites || [];
  const entries = data?.entries || [];

  const siteStats = useMemo(() => {
    return sites.map(site => {
      const siteEntries = entries.filter(e => e.siteId === site.id);
      const totalRevenue = siteEntries.reduce((sum, e) => sum + (e.revenue ?? e.kamai ?? 0), 0);
      const totalLabour = siteEntries.reduce((sum, e) => sum + (e.labour || 0), 0);
      const totalOH = siteEntries.reduce((sum, e) => sum + (e.ohShare ?? e.overhead ?? 0), 0);
      const totalOneTime = siteEntries.reduce((sum, e) => sum + (e.oneTime || 0), 0);
      const totalMaterial = siteEntries.reduce((sum, e) => sum + (e.materialCost || 0), 0);
      const totalEquipment = siteEntries.reduce((sum, e) => sum + (e.equipmentCost || 0), 0);
      const totalTransport = siteEntries.reduce((sum, e) => sum + (e.transportCost || 0), 0);
      const totalOther = siteEntries.reduce((sum, e) => sum + (e.otherExpense || 0), 0);

      const profit = totalRevenue - totalLabour - totalOH - totalOneTime
        - totalMaterial - totalEquipment - totalTransport - totalOther;
      const entryCount = siteEntries.length;
      const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      // Determine site health
      let health = 'idle';
      if (entryCount === 0) health = 'idle';
      else if (profit > 0) health = 'profit';
      else health = 'loss';

      return {
        ...site,
        totalRevenue,
        totalLabour,
        totalOH,
        totalOneTime,
        totalMaterial,
        totalEquipment,
        totalTransport,
        totalOther,
        profit,
        entryCount,
        margin,
        avgPerEntry: entryCount > 0 ? profit / entryCount : 0,
        isProfit: profit >= 0,
        health
      };
    });
  }, [sites, entries]);

  const filteredSites = useMemo(() => {
    let filtered = siteStats;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(site =>
        site.name.toLowerCase().includes(search) ||
        (site.location && site.location.toLowerCase().includes(search)) ||
        (site.manager && site.manager.toLowerCase().includes(search))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.health === statusFilter);
    }

    return filtered;
  }, [siteStats, searchTerm, statusFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);
  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSites.slice(startIndex, endIndex);
  }, [filteredSites, currentPage, itemsPerPage]);

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
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  // ============================================
  // SUMMARY
  // ============================================
  const summary = useMemo(() => {
    const totalSites = siteStats.length;
    const totalProfit = siteStats.reduce((sum, s) => sum + s.profit, 0);
    const totalRevenue = siteStats.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalLabour = siteStats.reduce((sum, s) => sum + s.totalLabour, 0);
    const totalOH = siteStats.reduce((sum, s) => sum + s.totalOH, 0);
    const profitSites = siteStats.filter(s => s.health === 'profit').length;
    const lossSites = siteStats.filter(s => s.health === 'loss').length;
    const idleSites = siteStats.filter(s => s.health === 'idle').length;
    const totalEntries = siteStats.reduce((sum, s) => sum + s.entryCount, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    let bestSite = null;
    let worstSite = null;
    if (siteStats.length > 0) {
      const withEntries = siteStats.filter(s => s.entryCount > 0);
      if (withEntries.length > 0) {
        const sorted = [...withEntries].sort((a, b) => b.profit - a.profit);
        bestSite = sorted[0];
        worstSite = sorted[sorted.length - 1];
      }
    }

    return {
      totalSites, totalProfit, totalRevenue, totalLabour, totalOH,
      profitSites, lossSites, idleSites, totalEntries, avgMargin,
      avgProfitPerSite: totalSites > 0 ? totalProfit / totalSites : 0,
      bestSite, worstSite
    };
  }, [siteStats]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    totalSites: {
      title: 'Total Sites',
      details: [
        { label: 'Total Sites', value: summary.totalSites },
        { label: 'Profitable', value: summary.profitSites },
        { label: 'In Loss', value: summary.lossSites },
        { label: 'Idle (no entries)', value: summary.idleSites }
      ]
    },
    totalRevenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Total Revenue', value: Utils.formatCurrency(summary.totalRevenue) },
        { label: 'Total Labour', value: Utils.formatCurrency(summary.totalLabour) },
        { label: 'Total Overhead', value: Utils.formatCurrency(summary.totalOH) },
        { label: 'Net Profit', value: Utils.formatCurrency(summary.totalProfit) }
      ]
    },
    totalProfit: {
      title: 'Net Profit',
      details: [
        { label: 'Total Profit', value: Utils.formatCurrency(summary.totalProfit) },
        { label: 'Profit Margin', value: `${summary.avgMargin.toFixed(1)}%` },
        { label: 'Total Revenue', value: Utils.formatCurrency(summary.totalRevenue) },
        { label: 'Avg per Site', value: Utils.formatCurrency(summary.avgProfitPerSite) }
      ]
    },
    entries: {
      title: 'Total Entries',
      details: [
        { label: 'Total Entries', value: summary.totalEntries },
        { label: 'Total Sites', value: summary.totalSites },
        { label: 'Avg per Site', value: summary.totalSites > 0 ? (summary.totalEntries / summary.totalSites).toFixed(1) : '0' },
        { label: 'Best Site', value: summary.bestSite?.name || 'N/A' }
      ]
    },
    profitSites: {
      title: 'Profitable Sites',
      details: [
        { label: 'Profitable', value: summary.profitSites },
        { label: 'In Loss', value: summary.lossSites },
        { label: 'Idle', value: summary.idleSites },
        {
          label: 'Success Rate',
          value: summary.totalSites > 0
            ? `${((summary.profitSites / summary.totalSites) * 100).toFixed(1)}%`
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
      showToast('Site name is required', 'error');
      return;
    }

    if (editingId) {
      updateSite(editingId, formData);
      showToast('Site updated');
    } else {
      addSite(formData);
      showToast('Site added');
    }

    setFormData({ name: '', location: '', manager: '', phone: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', manager: '', phone: '' });
    setEditingId(null);
  };

  const handleEdit = (site) => {
    setEditingId(site.id);
    setFormData({
      name: site.name || '',
      location: site.location || '',
      manager: site.manager || '',
      phone: site.phone || ''
    });
    setShowForm(true);
  };

  const handleDelete = (site) => {
    if (!window.confirm(`Delete site "${site.name}"? This cannot be undone.`)) return;
    deleteSite(site.id);
    showToast('Site deleted');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all';

  // ============================================
  // RENDER STATS
  // ============================================
  const statItems = [
    {
      id: 'totalSites',
      icon: Building2,
      label: 'Total Sites',
      value: summary.totalSites,
      meta: `${summary.profitSites} up · ${summary.lossSites} down`,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      accent: 'linear-gradient(90deg, #3b82f6, #60a5fa)'
    },
    {
      id: 'totalRevenue',
      icon: DollarSign,
      label: 'Total Revenue',
      value: Utils.formatCurrencyShort(summary.totalRevenue),
      meta: `${summary.totalEntries} entries`,
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
      accent: 'linear-gradient(90deg, #009846, #00b856)'
    },
    {
      id: 'totalProfit',
      icon: TrendingUp,
      label: 'Net Profit',
      value: Utils.formatCurrencyShort(summary.totalProfit),
      meta: `${summary.avgMargin.toFixed(1)}% margin`,
      color: summary.totalProfit >= 0 ? '#22c55e' : '#ef4444',
      bg: summary.totalProfit >= 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
      accent: summary.totalProfit >= 0
        ? 'linear-gradient(90deg, #009846, #00b856)'
        : 'linear-gradient(90deg, #dc2626, #ef4444)'
    },
    {
      id: 'profitSites',
      icon: Target,
      label: 'Profitable Sites',
      value: summary.profitSites,
      meta: summary.totalSites > 0
        ? `${((summary.profitSites / summary.totalSites) * 100).toFixed(0)}% success`
        : 'no sites',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
      accent: 'linear-gradient(90deg, #8b5cf6, #a78bfa)'
    }
  ];

  const renderStats = () => (
    <div className="sites-stats-grid">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className="sites-stat-card"
            onMouseEnter={(e) => handleCardHover(item.id, e)}
            onMouseLeave={handleCardLeave}
            onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
          >
            <div className="sites-stat-accent" style={{ background: item.accent }} />
            <div className="sites-stat-icon" style={{ background: item.bg, color: item.color }}>
              <Icon size={20} />
            </div>
            <div className="sites-stat-content">
              <span className="sites-stat-label">{item.label}</span>
              <span className="sites-stat-value">{item.value}</span>
              <span className="sites-stat-meta">{item.meta}</span>
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
        className="sites-card-tooltip"
        style={{
          position: 'fixed',
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          zIndex: 9999
        }}
      >
        <div className="sites-tooltip-header">
          <strong>{cardDetails[hoveredCard].title}</strong>
        </div>
        <div className="sites-tooltip-body">
          {cardDetails[hoveredCard].details.map((detail, idx) => (
            <div key={idx} className="sites-tooltip-row">
              <span className="sites-tooltip-label">{detail.label}</span>
              <span className="sites-tooltip-value">{detail.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = () => (
    <div
      className="sites-modal-overlay"
      onClick={() => { setShowForm(false); resetForm(); }}
    >
      <div className="sites-modal-content" onClick={e => e.stopPropagation()}>
        <div className="sites-modal-header">
          <div className="sites-modal-header-left">
            <div className="sites-modal-header-icon">
              {editingId ? <Edit size={20} /> : <Building2 size={20} />}
            </div>
            <div>
              <h3>{editingId ? 'Edit Site' : 'Add Site'}</h3>
              <p className="sites-modal-subtitle">
                {editingId ? 'Update site details' : 'Create a new construction site'}
              </p>
            </div>
          </div>
          <button
            className="sites-modal-close"
            onClick={() => { setShowForm(false); resetForm(); }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="sites-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="sites-form-row">
              <div className="sites-form-group">
                <label><Building2 size={13} /> Site Name <span className="sites-required">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Amwaj Residence"
                  required
                  className="sites-form-input"
                  autoFocus
                />
              </div>
              <div className="sites-form-group">
                <label><MapPin size={13} /> Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Amwaj Islands, Block 257"
                  className="sites-form-input"
                />
              </div>
            </div>

            <div className="sites-form-row">
              <div className="sites-form-group">
                <label><User size={13} /> Site Manager</label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={e => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="Manager name"
                  className="sites-form-input"
                />
              </div>
              <div className="sites-form-group">
                <label><Phone size={13} /> Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+973 ..."
                  className="sites-form-input"
                />
              </div>
            </div>

            <div className="sites-form-actions">
              <button type="submit" className="sites-btn-primary" disabled={loading}>
                <Save size={15} /> {loading ? 'Saving...' : (editingId ? 'Update Site' : 'Add Site')}
              </button>
              <button
                type="button"
                className="sites-btn-secondary"
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
  // RENDER BEST / WORST STRIP
  // ============================================
  const renderBestWorst = () => {
    if (!summary.bestSite && !summary.worstSite) return null;
    const { bestSite, worstSite } = summary;

    return (
      <div className="sites-highlight-grid">
        {bestSite && (
          <div className="sites-highlight sites-highlight-best">
            <div className="sites-highlight-left">
              <div className="sites-highlight-icon sites-highlight-icon-best">
                <Crown size={20} />
              </div>
              <div>
                <div className="sites-highlight-label">Best Performing Site</div>
                <div className="sites-highlight-name">{bestSite.name}</div>
                <div className="sites-highlight-meta">
                  {bestSite.entryCount} entries · {bestSite.location || 'No location'}
                </div>
              </div>
            </div>
            <div className="sites-highlight-value is-positive">
              <TrendingUp size={14} />
              {Utils.formatCurrencyShort(bestSite.profit)}
            </div>
          </div>
        )}
        {worstSite && (
          <div className="sites-highlight sites-highlight-worst">
            <div className="sites-highlight-left">
              <div className="sites-highlight-icon sites-highlight-icon-worst">
                <AlertCircle size={20} />
              </div>
              <div>
                <div className="sites-highlight-label">Needs Attention</div>
                <div className="sites-highlight-name">{worstSite.name}</div>
                <div className="sites-highlight-meta">
                  {worstSite.entryCount} entries · {worstSite.location || 'No location'}
                </div>
              </div>
            </div>
            <div className={`sites-highlight-value ${worstSite.profit >= 0 ? 'is-positive' : 'is-negative'}`}>
              {worstSite.profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Utils.formatCurrencyShort(worstSite.profit)}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className={`sites-manager-modern ${mounted ? 'is-mounted' : ''}`}>
      {/* Toast */}
      {toast && (
        <div className={`sites-toast sites-toast-${toast.type}`} key={toast.id}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Ambient orbs */}
      <div className="sites-ambient">
        <div className="sites-ambient-orb sites-ambient-1" />
        <div className="sites-ambient-orb sites-ambient-2" />
        <div className="sites-ambient-orb sites-ambient-3" />
      </div>

      {/* Header */}
      <div className="sites-header">
        <div className="sites-header-left">
          <div className="sites-header-icon-wrapper">
            <Building2 size={22} />
          </div>
          <div>
            <h2>Sites</h2>
            <p className="sites-header-subtitle">
              {summary.totalSites} site{summary.totalSites !== 1 ? 's' : ''} ·
              {' '}{summary.totalEntries} entr{summary.totalEntries === 1 ? 'y' : 'ies'} tracked
            </p>
          </div>
        </div>

        <div className="sites-header-right">
          <div className="sites-search-box">
            <Search size={16} className="sites-search-icon" />
            <input
              type="text"
              placeholder="Search sites, location, or manager..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="sites-clear-search" onClick={() => setSearchTerm('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <button className="sites-btn-ghost" onClick={refreshData}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            className="sites-btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <Plus size={15} /> Add Site
          </button>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}
      {renderTooltip()}

      {/* Best / Worst */}
      {renderBestWorst()}

      {/* Filters row */}
      <div className="sites-filters-row">
        <div className="sites-status-filter">
          {[
            { id: 'all', label: 'All Sites', icon: Layers, count: summary.totalSites },
            { id: 'profit', label: 'Profitable', icon: TrendingUp, count: summary.profitSites },
            { id: 'loss', label: 'In Loss', icon: TrendingDown, count: summary.lossSites },
            { id: 'idle', label: 'Idle', icon: Clock, count: summary.idleSites }
          ].map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                className={`sites-status-pill ${statusFilter === f.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.id)}
              >
                <Icon size={13} />
                <span>{f.label}</span>
                <span className="sites-pill-count">{f.count}</span>
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button className="sites-clear-filters" onClick={clearFilters}>
            <X size={13} /> Clear
          </button>
        )}

        <span className="sites-result-count">
          Showing {filteredSites.length} of {siteStats.length}
        </span>
      </div>

      {/* Error / success banners (kept, but toast covers most transient feedback) */}
      {error && !toast && <div className="sites-error-message"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="sites-success-message"><CheckCircle size={16} /> {success}</div>}

      {/* Sites Grid */}
      <div className="sites-grid">
        {paginatedSites.length === 0 ? (
          <div className="sites-empty-state">
            <div className="sites-empty-icon-wrapper">
              {hasActiveFilters ? <Search size={44} /> : <Building2 size={44} />}
            </div>
            <h3>{hasActiveFilters ? 'No matching sites' : 'No sites yet'}</h3>
            <p>
              {hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Add your first site by clicking the button above.'}
            </p>
            {hasActiveFilters ? (
              <button className="sites-btn-secondary" onClick={clearFilters}>
                <X size={14} /> Clear filters
              </button>
            ) : (
              <button
                className="sites-btn-primary"
                onClick={() => { resetForm(); setShowForm(true); }}
              >
                <Plus size={15} /> Add Site
              </button>
            )}
          </div>
        ) : (
          paginatedSites.map((site, i) => {
            const isProfit = site.health === 'profit';
            const isLoss = site.health === 'loss';
            const isIdle = site.health === 'idle';

            return (
              <div
                key={site.id}
                className={`sites-card sites-card-${site.health}`}
                style={{ animationDelay: `${Math.min(i * 60, 420)}ms` }}
              >
                {/* Card accent */}
                <div
                  className="sites-card-accent"
                  style={{
                    background: isProfit
                      ? 'linear-gradient(90deg, #009846, #00b856, #60a5fa)'
                      : isLoss
                        ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                        : 'linear-gradient(90deg, #94a3b8, #cbd5e1)'
                  }}
                />

                {/* Header */}
                <div className="sites-card-header">
                  <div className="sites-info">
                    <div
                      className="sites-avatar"
                      style={{
                        background: isProfit
                          ? 'linear-gradient(135deg, #009846, #007a38)'
                          : isLoss
                            ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                            : 'linear-gradient(135deg, #94a3b8, #64748b)'
                      }}
                    >
                      <span className="sites-avatar-text">
                        {site.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="sites-info-text">
                      <div className="sites-name">{site.name}</div>
                      <div className="sites-meta">
                        {site.location && (
                          <span className="sites-location">
                            <MapPin size={11} /> {site.location}
                          </span>
                        )}
                        {site.manager && (
                          <span className="sites-manager">
                            <User size={11} /> {site.manager}
                          </span>
                        )}
                        {!site.location && !site.manager && (
                          <span className="sites-meta-empty">No additional info</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`sites-profit-chip ${isProfit ? 'is-positive' : isLoss ? 'is-negative' : 'is-idle'}`}>
                    {isProfit ? <TrendingUp size={13} /> : isLoss ? <TrendingDown size={13} /> : <Clock size={13} />}
                    <span>{Utils.formatCurrencyShort(site.profit)}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="sites-card-body">
                  <div className="sites-stats-grid-mini">
                    <div className="sites-mini-stat">
                      <span className="sites-mini-label">Revenue</span>
                      <span className="sites-mini-value sites-mini-value-green">
                        {Utils.formatCurrencyShort(site.totalRevenue)}
                      </span>
                    </div>
                    <div className="sites-mini-stat">
                      <span className="sites-mini-label">Labour</span>
                      <span className="sites-mini-value sites-mini-value-red">
                        {Utils.formatCurrencyShort(site.totalLabour)}
                      </span>
                    </div>
                    <div className="sites-mini-stat">
                      <span className="sites-mini-label">Overhead</span>
                      <span className="sites-mini-value sites-mini-value-amber">
                        {Utils.formatCurrencyShort(site.totalOH)}
                      </span>
                    </div>
                    <div className="sites-mini-stat">
                      <span className="sites-mini-label">Entries</span>
                      <span className="sites-mini-value sites-mini-value-blue">
                        {site.entryCount}
                      </span>
                    </div>
                  </div>

                  {/* Margin bar */}
                  {site.totalRevenue > 0 && (
                    <div className="sites-margin-bar-wrap">
                      <div className="sites-margin-bar-label">
                        <Gauge size={11} />
                        <span>Margin {site.margin.toFixed(1)}%</span>
                      </div>
                      <div className="sites-margin-bar">
                        <div
                          className={`sites-margin-fill ${isProfit ? 'is-positive' : 'is-negative'}`}
                          style={{ width: `${Math.min(Math.abs(site.margin), 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {site.phone && (
                    <div className="sites-phone">
                      <Phone size={11} /> {site.phone}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="sites-card-footer">
                  <span className="sites-site-id">
                    <Hash size={11} /> {site.id}
                  </span>
                  <div className="sites-actions">
                    <button className="sites-btn-icon sites-btn-icon-edit" onClick={() => handleEdit(site)} title="Edit">
                      <Edit size={14} />
                    </button>
                    <button className="sites-btn-icon sites-btn-icon-danger" onClick={() => handleDelete(site)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filteredSites.length > 0 && (
        <div className="sites-pagination">
          <div className="sites-pagination-info">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredSites.length)} of {filteredSites.length} sites
          </div>
          <div className="sites-pagination-controls">
            <div className="sites-pagination-items">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="sites-pagination-select"
              >
                <option value={4}>4</option>
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
            <div className="sites-pagination-buttons">
              <button className="sites-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                <ChevronsLeft size={15} />
              </button>
              <button className="sites-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft size={15} />
              </button>
              {getPageNumbers().map(page => (
                <button
                  key={page}
                  className={`sites-page-btn ${page === currentPage ? 'active' : ''}`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
              <button className="sites-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                <ChevronRight size={15} />
              </button>
              <button className="sites-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
                <ChevronsRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && renderFormModal()}
    </div>
  );
};

export default SitesManagerComponent;