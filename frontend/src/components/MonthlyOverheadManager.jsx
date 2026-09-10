// src/components/MonthlyOverheadManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Save, X, Edit, Trash2, RefreshCw, 
  Building2, Calendar, DollarSign, AlertCircle, 
  ChevronDown, Filter, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Users, Clock,
  BarChart3, LayoutDashboard,
  FileText, Tag, ChevronUp
} from 'lucide-react';
import Utils from '../utils/Utils';
import ApiService from '../services/ApiService';
import './MonthlyOverheadManager.css';

const MonthlyOverheadManager = ({
  data,
  addMonthlyOverhead,
  updateMonthlyOverhead,
  deleteMonthlyOverhead,
  refreshData,
  selectedMonth,
  setSelectedMonth
}) => {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterType, setFilterType] = useState('month');
  const [customMonth, setCustomMonth] = useState(selectedMonth);
  const [viewMonth, setViewMonth] = useState(selectedMonth);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const [formData, setFormData] = useState({
    month: selectedMonth,
    categoryId: '',
    amount: '',
    siteIds: [],
    sitesCount: '1',
    workingDays: '26',
    notes: ''
  });

  // ============================================
  // MEMOIZED DATA
  // ============================================
  const sites = useMemo(() => data?.sites || [], [data]);
  const overheads = useMemo(() => data?.monthlyOverhead || [], [data]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setViewMonth(selectedMonth);
    setCustomMonth(selectedMonth);
  }, [selectedMonth]);

  // ============================================
  // LOAD CATEGORIES
  // ============================================
  const loadCategories = async () => {
    setLoadingCategories(true);
    setErrorMessage('');
    try {
      const response = await ApiService.getOverheadCategories();
      setCategories(response || []);
      if (!response || response.length === 0) {
        setErrorMessage('No categories found. Please create categories first.');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setErrorMessage('Failed to load categories. Please check the connection.');
    } finally {
      setLoadingCategories(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getDisplayMonth = () => {
    if (filterType === 'custom' && customMonth) {
      return customMonth;
    }
    return viewMonth;
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

  const getSiteNames = (overhead) => {
    if (overhead.siteNames && overhead.siteNames.length > 0) {
      return overhead.siteNames.join(', ');
    }
    
    if (!overhead.siteId) {
      const allNames = sites.map(s => s.name);
      return allNames.length > 0 ? allNames.join(', ') : 'All Sites';
    }
    
    const site = sites.find(s => s.id === overhead.siteId);
    return site?.name || 'Unknown Site';
  };

  const getSelectedSiteNames = () => {
    if (!formData.siteIds || formData.siteIds.length === 0) {
      return 'All Sites (Company-wide)';
    }
    if (formData.siteIds.length === sites.length) {
      return 'All Sites';
    }
    const names = formData.siteIds.map(id => {
      const site = sites.find(s => s.id === id);
      return site?.name || id;
    });
    return names.join(', ');
  };

  // ============================================
  // FILTERED OVERHEADS & SUMMARY
  // ============================================
  const filteredOverheads = useMemo(() => {
    const displayMonth = getDisplayMonth();
    return overheads.filter(o => o.month === displayMonth);
  }, [overheads, viewMonth, customMonth, filterType]);

  const summary = useMemo(() => {
    const total = filteredOverheads.reduce((sum, o) => sum + (o.amount || 0), 0);
    const workingDays = filteredOverheads.length > 0 ? (filteredOverheads[0].workingDays || 26) : 26;
    const sitesCount = filteredOverheads.length > 0 ? (filteredOverheads[0].sitesCount || 1) : 1;
    const perSite = sitesCount > 0 ? total / sitesCount : 0;
    const perDayPerSite = workingDays > 0 ? perSite / workingDays : 0;

    return {
      total,
      workingDays,
      sitesCount,
      perSite,
      perDayPerSite,
      count: filteredOverheads.length
    };
  }, [filteredOverheads]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    total: {
      title: 'Total Overhead',
      details: [
        { label: 'Total Amount', value: Utils.formatCurrency(summary?.total || 0) },
        { label: 'Number of Entries', value: summary?.count || 0 },
        { label: 'Categories', value: new Set(filteredOverheads?.map(o => o.categoryId)).size || 0 },
        { label: 'Avg Per Entry', value: summary?.count > 0 ? Utils.formatCurrency(summary.total / summary.count) : '0.000' }
      ]
    },
    perSite: {
      title: 'Per Site',
      details: [
        { label: 'Per Site', value: Utils.formatCurrency(summary?.perSite || 0) },
        { label: 'Total Overhead', value: Utils.formatCurrency(summary?.total || 0) },
        { label: 'Active Sites', value: summary?.sitesCount || 0 },
        { label: 'Per Day/Site', value: Utils.formatCurrency(summary?.perDayPerSite || 0) }
      ]
    },
    perDay: {
      title: 'Per Day / Site',
      details: [
        { label: 'Per Day/Site', value: Utils.formatCurrency(summary?.perDayPerSite || 0) },
        { label: 'Working Days', value: summary?.workingDays || 0 },
        { label: 'Per Site/Month', value: Utils.formatCurrency(summary?.perSite || 0) },
        { label: 'Total Sites', value: summary?.sitesCount || 0 }
      ]
    },
    workingDays: {
      title: 'Working Days',
      details: [
        { label: 'Working Days', value: summary?.workingDays || 0 },
        { label: 'Entries', value: summary?.count || 0 },
        { label: 'Total Overhead', value: Utils.formatCurrency(summary?.total || 0) },
        { label: 'Per Day', value: summary?.workingDays > 0 ? Utils.formatCurrency(summary.total / summary.workingDays) : '0.000' }
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
  // MONTH NAVIGATION
  // ============================================
  const navigateMonth = (direction) => {
    const currentMonth = getDisplayMonth();
    const [year, month] = currentMonth.split('-').map(Number);
    let newMonth = month + direction;
    let newYear = year;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear = year + 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear = year - 1;
    }
    
    const newMonthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    
    if (filterType === 'custom') {
      setCustomMonth(newMonthStr);
    } else {
      setViewMonth(newMonthStr);
      if (setSelectedMonth) {
        setSelectedMonth(newMonthStr);
      }
    }
  };

  // ============================================
  // FILTER HANDLERS
  // ============================================
  const handleFilterChange = (type) => {
    setFilterType(type);
    setShowFilterDropdown(false);
    if (type === 'month' && setSelectedMonth) {
      setSelectedMonth(viewMonth);
    }
  };

  const handleCustomMonthChange = (e) => {
    setCustomMonth(e.target.value);
  };

  const applyCustomMonth = () => {
    if (customMonth) {
      setShowFilterDropdown(false);
      if (setSelectedMonth) {
        setSelectedMonth(customMonth);
      }
    }
  };

  // ============================================
  // SITE SELECTION HANDLERS
  // ============================================
  const handleSiteToggle = (siteId) => {
    setFormData(prev => {
      let newSiteIds = [...prev.siteIds];
      if (newSiteIds.includes(siteId)) {
        newSiteIds = newSiteIds.filter(id => id !== siteId);
      } else {
        newSiteIds.push(siteId);
      }
      const count = newSiteIds.length > 0 ? newSiteIds.length : 1;
      return {
        ...prev,
        siteIds: newSiteIds,
        sitesCount: count.toString()
      };
    });
  };

  const handleSelectAllSites = () => {
    const allSiteIds = sites.map(s => s.id);
    setFormData(prev => ({
      ...prev,
      siteIds: allSiteIds,
      sitesCount: allSiteIds.length.toString()
    }));
  };

  const handleDeselectAllSites = () => {
    setFormData(prev => ({
      ...prev,
      siteIds: [],
      sitesCount: '1'
    }));
  };

  // ============================================
  // FORM RESET
  // ============================================
  const resetForm = () => {
    setFormData({
      month: getDisplayMonth(),
      categoryId: '',
      amount: '',
      siteIds: [],
      sitesCount: sites.length > 0 ? sites.length.toString() : '1',
      workingDays: '26',
      notes: ''
    });
    setEditingId(null);
    setErrorMessage('');
    setShowSiteDropdown(false);
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (!formData.categoryId) {
        setErrorMessage('Please select a category');
        setLoading(false);
        return;
      }

      const baseEntryData = {
        month: formData.month || getDisplayMonth(),
        categoryId: formData.categoryId,
        amount: parseFloat(formData.amount) || 0,
        workingDays: parseInt(formData.workingDays) || 26,
        notes: formData.notes || ''
      };

      const hasMultipleSites = formData.siteIds && formData.siteIds.length > 1;
      const hasNoSites = !formData.siteIds || formData.siteIds.length === 0;

      let createData;

      if (hasMultipleSites || hasNoSites) {
        const siteNames = hasMultipleSites 
          ? formData.siteIds.map(id => {
              const site = sites.find(s => s.id === id);
              return site?.name || id;
            })
          : sites.map(s => s.name);

        createData = {
          ...baseEntryData,
          siteId: null,
          sitesCount: hasMultipleSites ? formData.siteIds.length : parseInt(formData.sitesCount) || 1,
          siteNames: siteNames
        };
      } else {
        const singleSite = sites.find(s => s.id === formData.siteIds[0]);
        createData = {
          ...baseEntryData,
          siteId: formData.siteIds[0],
          sitesCount: 1,
          siteNames: [singleSite?.name || 'Unknown Site']
        };
      }

      if (editingId) {
        await updateMonthlyOverhead(editingId, createData);
      } else {
        await addMonthlyOverhead(createData);
      }

      await refreshData();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving overhead:', error);
      setErrorMessage(error.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (overhead) => {
    let siteIds = [];
    
    if (overhead.siteId) {
      siteIds = [overhead.siteId];
    } else if (overhead.siteNames && overhead.siteNames.length > 0) {
      siteIds = overhead.siteNames
        .map(name => {
          const site = sites.find(s => s.name === name);
          return site?.id;
        })
        .filter(id => id !== undefined);
      
      if (siteIds.length === 0 && overhead.siteNames.length > 0) {
        siteIds = overhead.siteNames
          .map(name => {
            const site = sites.find(s => 
              s.name.toLowerCase() === name.toLowerCase()
            );
            return site?.id;
          })
          .filter(id => id !== undefined);
      }
      
      if (siteIds.length === 0) {
        siteIds = sites.map(s => s.id);
      }
    } else {
      siteIds = sites.map(s => s.id);
    }

    setEditingId(overhead.id);
    setFormData({
      month: overhead.month || getDisplayMonth(),
      categoryId: overhead.categoryId || '',
      amount: overhead.amount?.toString() || '',
      siteIds: siteIds,
      sitesCount: overhead.sitesCount?.toString() || (siteIds.length > 0 ? siteIds.length.toString() : '1'),
      workingDays: overhead.workingDays?.toString() || '26',
      notes: overhead.notes || ''
    });
    setShowForm(true);
    setErrorMessage('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this overhead entry?')) return;
    try {
      await deleteMonthlyOverhead(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting overhead:', error);
      setErrorMessage('Failed to delete. Please try again.');
    }
  };

  // ============================================
  // STATS ITEMS
  // ============================================
  const statItems = [
    { 
      id: 'total', 
      icon: DollarSign, 
      label: 'Total Overhead', 
      value: Utils.formatCurrencyShort(summary.total),
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      trend: summary.count > 0 ? 'up' : 'neutral'
    },
    { 
      id: 'perSite', 
      icon: Building2, 
      label: 'Per Site', 
      value: Utils.formatCurrencyShort(summary.perSite),
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
      trend: summary.perSite > 0 ? 'up' : 'neutral'
    },
    { 
      id: 'perDay', 
      icon: Clock, 
      label: 'Per Day / Site', 
      value: Utils.formatCurrencyShort(summary.perDayPerSite),
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      trend: summary.perDayPerSite > 0 ? 'up' : 'neutral'
    },
    { 
      id: 'workingDays', 
      icon: Calendar, 
      label: 'Working Days', 
      value: summary.workingDays,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
      trend: 'neutral'
    }
  ];

  const displayMonth = getDisplayMonth();

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="monthly-overhead-manager-modern">
      {/* ==================== HEADER ==================== */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <LayoutDashboard size={28} />
            <span className="header-badge">Overhead</span>
          </div>
          <div>
            <h2>Monthly Overhead Management</h2>
            <p className="header-subtitle">Track and manage monthly overhead costs across all sites</p>
          </div>
        </div>
        <div className="header-right">
          {/* Month Navigation */}
          <div className="month-navigation">
            <button onClick={() => navigateMonth(-1)} className="month-nav-btn">
              <ChevronLeft size={18} />
            </button>
            <span className="month-display">{displayMonth}</span>
            <button onClick={() => navigateMonth(1)} className="month-nav-btn">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Filter Dropdown */}
          <div className="filter-dropdown">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="filter-btn">
              <Filter size={16} />
              {filterType === 'month' ? 'Current Month' : 'Custom'}
              <ChevronDown size={14} />
            </button>

            {showFilterDropdown && (
              <div className="dropdown-menu">
                <button onClick={() => handleFilterChange('month')} className={`menu-item ${filterType === 'month' ? 'active' : ''}`}>
                  📅 Current Month ({viewMonth})
                </button>
                <div className="divider" />
                <div className="custom-month-section">
                  <label>Custom Month</label>
                  <input type="month" value={customMonth} onChange={handleCustomMonthChange} />
                  <button onClick={applyCustomMonth} className="apply-btn">Apply Filter</button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
            <Plus size={18} /> Add Overhead
          </button>
          <button onClick={refreshData} className="btn-refresh-modern">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* ==================== ERROR MESSAGE ==================== */}
      {errorMessage && (
        <div className="error-message-modern">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      {/* ==================== STATS CARDS ==================== */}
      <div className="stats-grid">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="stat-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 })}
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
                {item.trend === 'neutral' && <BarChart3 size={16} color="#8a9bb5" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== TOOLTIP ==================== */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div
          className="overhead-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="overhead-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="overhead-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="overhead-tooltip-row">
                <span className="overhead-tooltip-label">{detail.label}</span>
                <span className="overhead-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== FORM MODAL ==================== */}
      {showForm && (
        <div className="overhead-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="overhead-modal-content" onClick={e => e.stopPropagation()}>
            <div className="overhead-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
              <div className="overhead-modal-header-left">
                {editingId ? <Edit size={24} color="#ffffff" /> : <Plus size={24} color="#ffffff" />}
                <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Overhead' : 'Add Monthly Overhead'}</h3>
              </div>
              <button className="overhead-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
                <X size={24} color="#ffffff" />
              </button>
            </div>
            <div className="overhead-modal-body">
              <form onSubmit={handleSubmit}>
                {/* Row 1: Month + Category */}
                <div className="form-row">
                  <div className="form-group">
                    <label><Calendar size={14} /> Month <span className="required">*</span></label>
                    <input
                      type="month"
                      value={formData.month}
                      onChange={e => setFormData({ ...formData, month: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label><Tag size={14} /> Category <span className="required">*</span></label>
                    <select
                      value={formData.categoryId}
                      onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                      required
                      className="form-select"
                    >
                      <option value="">Select Category</option>
                      {loadingCategories ? (
                        <option value="" disabled>Loading categories...</option>
                      ) : categories.length === 0 ? (
                        <option value="" disabled>No categories found</option>
                      ) : (
                        categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Row 2: Amount + Sites */}
                <div className="form-row">
                  <div className="form-group">
                    <label><DollarSign size={14} /> Amount (BD) <span className="required">*</span></label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.000"
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label><Building2 size={14} /> Apply to Sites</label>
                    <div className="site-selector">
                      <button
                        type="button"
                        onClick={() => setShowSiteDropdown(!showSiteDropdown)}
                        className="site-selector-btn"
                      >
                        <span className="selected-text">{getSelectedSiteNames()}</span>
                        <ChevronDown size={16} />
                      </button>
                      
                      {showSiteDropdown && (
                        <div className="site-dropdown">
                          <div className="dropdown-actions">
                            <button type="button" onClick={handleSelectAllSites}>Select All</button>
                            <button type="button" onClick={handleDeselectAllSites}>Deselect All</button>
                          </div>
                          {sites.map(site => (
                            <label key={site.id} className="site-item">
                              <input
                                type="checkbox"
                                checked={formData.siteIds.includes(site.id)}
                                onChange={() => handleSiteToggle(site.id)}
                              />
                              <span>{site.name}</span>
                            </label>
                          ))}
                          {sites.length === 0 && <div className="no-sites">No sites available</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 3: Sites Count + Working Days */}
                <div className="form-row">
                  <div className="form-group">
                    <label><Users size={14} /> Sites Count</label>
                    <input
                      type="number"
                      value={formData.sitesCount}
                      onChange={e => setFormData({ ...formData, sitesCount: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label><Clock size={14} /> Working Days</label>
                    <input
                      type="number"
                      value={formData.workingDays}
                      onChange={e => setFormData({ ...formData, workingDays: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label><FileText size={14} /> Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    className="form-input"
                  />
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TABLE ==================== */}
      <div className="table-container-modern">
        <div className="table-header-modern">
          <div className="table-title">
            <FileText size={18} />
            <h3>Overhead Entries</h3>
            <span className="table-count">{filteredOverheads.length} entries</span>
          </div>
        </div>
        <div className="table-responsive-modern">
          <table className="overhead-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="right">Amount</th>
                <th>Site(s)</th>
                <th className="center">Sites</th>
                <th className="right">Working Days</th>
                <th className="right">Per Site</th>
                <th className="right">Per Day/Site</th>
                <th className="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOverheads.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="8">
                    <div className="empty-state">
                      <FileText size={48} />
                      <h3>No Overhead Entries</h3>
                      <p>Click "Add Overhead" to set up monthly overhead for {displayMonth}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOverheads.map(overhead => (
                  <tr key={overhead.id}>
                    <td>
                      <span className="category-badge">{getCategoryName(overhead.categoryId)}</span>
                    </td>
                    <td className="right amount">
                      {Utils.formatCurrencyShort(overhead.amount)}
                    </td>
                    <td>
                      <div className="site-names">{getSiteNames(overhead)}</div>
                    </td>
                    <td className="center">
                      <span className="site-count-badge">{overhead.sitesCount || 1}</span>
                    </td>
                    <td className="right">{overhead.workingDays || 26}</td>
                    <td className="right per-site">
                      {Utils.formatCurrencyShort(overhead.perSite || 0)}
                    </td>
                    <td className="right per-day">
                      {Utils.formatCurrencyShort(overhead.perDayPerSite || 0)}
                    </td>
                    <td className="center">
                      <div className="action-buttons">
                        <button onClick={() => handleEdit(overhead)} className="btn-action" title="Edit">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(overhead.id)} className="btn-action delete" title="Delete">
                          <Trash2 size={14} />
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
    </div>
  );
};

export default MonthlyOverheadManager;