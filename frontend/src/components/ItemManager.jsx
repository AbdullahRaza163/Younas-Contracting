// src/components/ItemManager.jsx
import React, { useState, useMemo } from 'react';
import {
  Edit,
  Trash2,
  Package,
  Plus,
  Save,
  X,
  Search,
  RefreshCw,
  DollarSign,
  Tag,
  Box,
  Layers,
  Award,
  Star,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  User,
  Calendar,
  Building2,
  Settings,
  Zap,
  Shield,
  Crown,
  Sparkles,
  Briefcase,
  Timer,
  Activity,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Filter,
  Clock,
  FileText,
  Wallet,
  CreditCard,
  Banknote,
  Percent,
  HardHat,
  Layers as LayersIcon,
  Boxes,
  FolderKanban
} from 'lucide-react';
import Utils from '../utils/Utils';
import './ItemManager.css';

const ItemManagerComponent = ({ data, addItem, updateItem, deleteItem }) => {
  // ============================================
  // STATE
  // ============================================
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Materials',
    unit: 'pcs',
    unitPrice: '',
    description: '',
    sku: '',
    taxRate: '0',
    isTaxable: false
  });

  const categories = [
    'Materials', 'Labour', 'Equipment', 'Transport', 'Services',
    'Maintenance', 'Electrical', 'Plumbing', 'Carpentry', 'Painting',
    'Tiling', 'Marble', 'Steel', 'Cement', 'Sand', 'Gravel'
  ];

  const units = ['SQ.M', 'SQ.FT', 'PCS', 'KG', 'TON', 'M3', 'M2', 'FT2', 'LITERS', 'HOURS', 'DAYS', 'BOX', 'ROLL'];

  // ============================================
  // STATS
  // ============================================
  const totalItems = (data.items || []).length;
  const totalCategories = new Set((data.items || []).map(i => i.category)).size;
  const totalValue = (data.items || []).reduce((sum, i) => sum + (i.unitPrice || 0), 0);

  const cardDetails = {
    total: {
      title: 'Total Items',
      details: [
        { label: 'Total Items', value: totalItems },
        { label: 'Categories', value: totalCategories },
        { label: 'Total Value', value: Utils.formatCurrency(totalValue) },
        { label: 'Avg Price', value: totalItems > 0 ? Utils.formatCurrency(totalValue / totalItems) : '0.000' }
      ]
    },
    categories: {
      title: 'Categories',
      details: [
        { label: 'Categories', value: totalCategories },
        { label: 'Total Items', value: totalItems },
        { label: 'Most Items', value: categories.reduce((a, b) => {
          const countA = (data.items || []).filter(i => i.category === a).length;
          const countB = (data.items || []).filter(i => i.category === b).length;
          return countA > countB ? a : b;
        }) || 'N/A' }
      ]
    },
    value: {
      title: 'Total Value',
      details: [
        { label: 'Total Value', value: Utils.formatCurrency(totalValue) },
        { label: 'Total Items', value: totalItems },
        { label: 'Avg Value', value: totalItems > 0 ? Utils.formatCurrency(totalValue / totalItems) : '0.000' },
        { label: 'Highest Price', value: totalItems > 0 ? Utils.formatCurrency(Math.max(...(data.items || []).map(i => i.unitPrice || 0))) : '0.000' }
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
  // HANDLE SUBMIT
  // ============================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Item name is required');
      return;
    }

    const item = {
      id: editingId || Date.now().toString(),
      ...formData,
      unitPrice: parseFloat(formData.unitPrice) || 0,
      taxRate: parseFloat(formData.taxRate) || 0,
      isTaxable: formData.isTaxable,
      createdAt: new Date().toISOString()
    };

    if (editingId) {
      updateItem(editingId, item);
      setEditingId(null);
    } else {
      addItem(item);
    }

    resetForm();
    setShowForm(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Materials',
      unit: 'pcs',
      unitPrice: '',
      description: '',
      sku: '',
      taxRate: '0',
      isTaxable: false
    });
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      category: item.category || 'Materials',
      unit: item.unit || 'pcs',
      unitPrice: item.unitPrice?.toString() || '',
      description: item.description || '',
      sku: item.sku || '',
      taxRate: item.taxRate?.toString() || '0',
      isTaxable: item.isTaxable || false
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this item?')) return;
    deleteItem(id);
    setShowDeleteConfirm(null);
  };

  // ============================================
  // FILTERED ITEMS
  // ============================================
  const filteredItems = useMemo(() => {
    const items = data.items || [];
    let filtered = items;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search) ||
        (item.sku && item.sku.toLowerCase().includes(search))
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    return filtered;
  }, [data.items, searchTerm, categoryFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

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

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = () => {
    return (
      <div className="item-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
        <div className="item-modal-content item-form-modal" onClick={e => e.stopPropagation()}>
          <div className="item-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="item-modal-header-left">
              {editingId ? <Edit size={24} color="#ffffff" /> : <Package size={24} color="#ffffff" />}
              <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Item' : 'New Item'}</h3>
            </div>
            <button className="item-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="item-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="item-form-row">
                <div className="item-form-group">
                  <label><FileText size={14} /> Item Name <span className="item-required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter item name"
                    required
                    className="item-form-input"
                  />
                </div>
                <div className="item-form-group">
                  <label><FolderKanban size={14} /> Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="item-form-select"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="item-form-row">
                <div className="item-form-group">
                  <label><Tag size={14} /> SKU (Stock Keeping Unit)</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g., MAT-001"
                    className="item-form-input"
                  />
                </div>
                <div className="item-form-group">
                  <label><Boxes size={14} /> Unit</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="item-form-select"
                  >
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="item-form-row">
                <div className="item-form-group">
                  <label><DollarSign size={14} /> Unit Price (BD) <span className="item-required">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.unitPrice}
                    onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="0.000"
                    required
                    className="item-form-input"
                  />
                </div>
                <div className="item-form-group">
                  <label><FileText size={14} /> Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Item description"
                    className="item-form-input"
                  />
                </div>
              </div>

              <div className="item-form-row">
                <div className="item-form-group">
                  <label><Percent size={14} /> Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={e => setFormData({ ...formData, taxRate: e.target.value })}
                    placeholder="0"
                    className="item-form-input"
                  />
                </div>
                <div className="item-form-group">
                  <label className="item-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isTaxable}
                      onChange={e => setFormData({ ...formData, isTaxable: e.target.checked })}
                    />
                    Is Taxable
                  </label>
                </div>
              </div>

              <div className="item-form-actions">
                <button type="submit" className="item-btn-primary">
                  <Save size={16} /> {editingId ? 'Update Item' : 'Add Item'}
                </button>
                <button type="button" className="item-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
  // RENDER DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm) return null;
    return (
      <div className="item-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
        <div className="item-modal-content item-delete-modal" onClick={e => e.stopPropagation()}>
          <div className="item-modal-header" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
            <div className="item-modal-header-left">
              <Trash2 size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Delete Item</h3>
            </div>
            <button className="item-modal-close" onClick={() => setShowDeleteConfirm(null)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="item-modal-body">
            <div className="item-delete-content">
              <AlertCircle size={48} color="#dc2626" />
              <p>Are you sure you want to delete this item?</p>
              <p className="item-delete-subtext">This action cannot be undone.</p>
              <div className="item-delete-actions">
                <button className="item-btn-danger" onClick={() => handleDelete(showDeleteConfirm)}>
                  <Trash2 size={16} /> Delete
                </button>
                <button className="item-btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
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
    <div className="item-manager-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <Package size={28} />
            <span className="header-badge">Items</span>
          </div>
          <div>
            <h2>Item & Inventory Management</h2>
            <p className="header-subtitle">Manage your inventory items and pricing</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-refresh-modern" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="item-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} />
            New Item
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="item-stats-grid">
        <div
          className="item-stat-card"
          onMouseEnter={(e) => handleCardHover('total', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="item-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Package size={22} />
          </div>
          <div className="item-stat-content">
            <span className="item-stat-label">Total Items</span>
            <span className="item-stat-value">{totalItems}</span>
          </div>
          <div className="item-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="item-stat-card"
          onMouseEnter={(e) => handleCardHover('categories', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="item-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <Layers size={22} />
          </div>
          <div className="item-stat-content">
            <span className="item-stat-label">Categories</span>
            <span className="item-stat-value">{totalCategories}</span>
          </div>
          <div className="item-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="item-stat-card"
          onMouseEnter={(e) => handleCardHover('value', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="item-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <DollarSign size={22} />
          </div>
          <div className="item-stat-content">
            <span className="item-stat-label">Total Value</span>
            <span className="item-stat-value">{Utils.formatCurrencyShort(totalValue)}</span>
          </div>
          <div className="item-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div
          className="item-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="item-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="item-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="item-tooltip-row">
                <span className="item-tooltip-label">{detail.label}</span>
                <span className="item-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="item-filters-section">
        <div className="item-search-box">
          <Search size={18} className="item-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="item-search-input"
          />
          {searchTerm && (
            <button className="item-clear-search" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="item-filter-group">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className={categoryFilter !== 'all' ? 'filter-active' : ''}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Grid */}
      <div className="items-grid">
        {paginatedItems.length === 0 ? (
          <div className="empty-state">
            <Package size={64} />
            <h3>No Items Found</h3>
            <p>Add your first item by clicking the "New Item" button above.</p>
          </div>
        ) : (
          paginatedItems.map(item => (
            <div key={item.id} className="item-card">
              <div className="item-card-header">
                <div className="item-card-info">
                  <div className="item-icon-wrapper">
                    <Package size={18} />
                  </div>
                  <div>
                    <div className="item-name">{item.name}</div>
                    <div className="item-meta">
                      <span className="item-category">{item.category}</span>
                      {item.sku && <span className="item-sku">SKU: {item.sku}</span>}
                      <span className="item-unit">{item.unit}</span>
                    </div>
                  </div>
                </div>
                <div className="item-price">
                  <span className="price-value">{Utils.formatCurrency(item.unitPrice)}</span>
                  {item.isTaxable && <span className="tax-badge">+ VAT</span>}
                </div>
              </div>

              {item.description && (
                <div className="item-description">{item.description}</div>
              )}

              <div className="item-card-footer">
                <div className="item-actions">
                  <button className="btn-icon btn-edit" onClick={() => handleEdit(item)}>
                    <Edit size={14} /> Edit
                  </button>
                  <button className="btn-icon btn-delete" onClick={() => setShowDeleteConfirm(item.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredItems.length > 0 && (
        <div className="item-pagination">
          <div className="item-pagination-info">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
          </div>
          <div className="item-pagination-controls">
            <div className="item-pagination-items">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="item-pagination-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="item-pagination-buttons">
              <button 
                className="item-page-btn" 
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft size={16} />
              </button>
              <button 
                className="item-page-btn" 
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              
              {getPageNumbers().map(page => (
                <button
                  key={page}
                  className={`item-page-btn ${page === currentPage ? 'active' : ''}`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
              
              <button 
                className="item-page-btn" 
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
              <button 
                className="item-page-btn" 
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
      {showForm && renderFormModal()}
      {renderDeleteConfirm()}
    </div>
  );
};

export default ItemManagerComponent;