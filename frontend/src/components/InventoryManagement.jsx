// src/components/InventoryManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Plus, Search, Edit, Trash2, Eye, X, Save,
  RefreshCw, ChevronDown, ChevronUp, CheckCircle,
  AlertCircle, Clock, Building2, User, Calendar,
  DollarSign, TrendingUp, TrendingDown, Boxes,
  Truck, ShoppingCart, Warehouse, Tag, Layers,
  FileText, Shield, Users,
  AlertTriangle, Check, XCircle,
  Star, MapPin, Bell, Zap, Gauge,
  TrendingUp as TrendingUpIcon,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FolderKanban, Box, HardHat, Award, Landmark, Phone, Mail
} from 'lucide-react';
import Utils from '../utils/Utils';
import './InventoryManagement.css';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

const InventoryManagement = ({ data, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('materials');
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [summary, setSummary] = useState(null);
  const [showCostOptimizer, setShowCostOptimizer] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Data states
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);

  // Form state for materials
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    unit: '',
    unitPrice: '',
    quantity: '',
    minQuantity: '',
    maxQuantity: '',
    reorderLevel: '',
    location: '',
    warehouse: '',
    supplierId: '',
    description: '',
    status: 'active'
  });

  // Supplier form state
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    country: '',
    crNumber: '',
    vatNumber: '',
    paymentTerms: '',
    rating: 3,
    notes: ''
  });

  // Purchase order form
  const [poForm, setPoForm] = useState({
    supplierId: '',
    orderDate: Utils.today(),
    expectedDelivery: '',
    vatRate: 0,
    notes: '',
    items: []
  });

  // Stock adjustment form
  const [stockForm, setStockForm] = useState({
    quantity: '',
    movementType: 'adjustment',
    notes: ''
  });

  // PO Item form
  const [poItemForm, setPoItemForm] = useState({
    materialId: '',
    quantity: '',
    unitPrice: ''
  });

  // Auto-reorder state
  const [autoReorderResults, setAutoReorderResults] = useState(null);

  // ============================================
  // RESET FUNCTIONS
  // ============================================
  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      unit: '',
      unitPrice: '',
      quantity: '',
      minQuantity: '',
      maxQuantity: '',
      reorderLevel: '',
      location: '',
      warehouse: '',
      supplierId: '',
      description: '',
      status: 'active'
    });
    setEditingId(null);
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      city: '',
      country: '',
      crNumber: '',
      vatNumber: '',
      paymentTerms: '',
      rating: 3,
      notes: ''
    });
    setEditingId(null);
  };

  const resetPoForm = () => {
    setPoForm({
      supplierId: '',
      orderDate: Utils.today(),
      expectedDelivery: '',
      vatRate: 0,
      notes: '',
      items: []
    });
    setPoItemForm({
      materialId: '',
      quantity: '',
      unitPrice: ''
    });
    setEditingId(null);
  };

  const resetStockForm = () => {
    setStockForm({
      quantity: '',
      movementType: 'adjustment',
      notes: ''
    });
  };

  // ============================================
  // LOAD DATA
  // ============================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [materialsRes, categoriesRes, suppliersRes, ordersRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory/materials`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/inventory/categories`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/inventory/suppliers`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/inventory/purchase-orders`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/inventory/summary`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : {})
      ]);

      setMaterials(materialsRes);
      setCategories(categoriesRes);
      setSuppliers(suppliersRes);
      setPurchaseOrders(ordersRes);
      setSummary(summaryRes);

      if (viewMode === 'movements') {
        const movementsRes = await fetch(`${API_BASE_URL}/inventory/stock-movements`, {
          headers: { 'Accept': 'application/json' }
        });
        if (movementsRes.ok) {
          const movements = await movementsRes.json();
          setStockMovements(movements);
        }
      }

      checkLowStockAlerts(materialsRes);
      checkCostOptimization(materialsRes);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // AUTOMATION FUNCTIONS
  // ============================================
  const checkLowStockAlerts = (materialsList) => {
    const lowStock = materialsList.filter(m => m.quantity <= m.reorderLevel && m.reorderLevel > 0);
    if (lowStock.length > 0) {
      setSuccess(`⚠️ ${lowStock.length} items need reordering`);
      setTimeout(() => setSuccess(''), 6000);
    }
  };

  const checkCostOptimization = (materialsList) => {
    const opportunities = [];
    const grouped = materialsList.reduce((acc, m) => {
      if (!acc[m.categoryId]) acc[m.categoryId] = [];
      acc[m.categoryId].push(m);
      return acc;
    }, {});

    Object.keys(grouped).forEach(catId => {
      const items = grouped[catId];
      if (items.length > 1) {
        const sorted = items.sort((a, b) => a.unitPrice - b.unitPrice);
        const cheapest = sorted[0];
        const expensive = sorted[sorted.length - 1];
        if (expensive.unitPrice > cheapest.unitPrice * 1.3) {
          opportunities.push({
            category: categories.find(c => c.id === catId)?.name || catId,
            item: expensive.name,
            currentPrice: expensive.unitPrice,
            potentialPrice: cheapest.unitPrice,
            savings: expensive.unitPrice - cheapest.unitPrice,
            alternative: cheapest.name
          });
        }
      }
    });

    if (opportunities.length > 0) {
      setOptimizationResults(opportunities);
    }
  };

  const handleAutoReorder = async () => {
    const lowStockItems = materials.filter(m => m.quantity <= m.reorderLevel && m.reorderLevel > 0);
    
    if (lowStockItems.length === 0) {
      setSuccess('✅ All items are above reorder level');
      setTimeout(() => setSuccess(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const reorderItems = lowStockItems.map(m => ({
        materialId: m.id,
        quantity: Math.ceil(m.reorderLevel * 2),
        unitPrice: m.unitPrice,
        name: m.name
      }));

      const groupedBySupplier = reorderItems.reduce((acc, item) => {
        const material = materials.find(m => m.id === item.materialId);
        const supplierId = material?.supplierId || 'unknown';
        if (!acc[supplierId]) acc[supplierId] = [];
        acc[supplierId].push(item);
        return acc;
      }, {});

      setAutoReorderResults({
        totalItems: reorderItems.length,
        groupedBySupplier,
        estimatedCost: reorderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      });

      setSuccess(`📦 Auto-reorder prepared for ${reorderItems.length} items`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Failed to auto-reorder');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER MATERIALS
  // ============================================
  const filteredMaterials = useMemo(() => {
    let filtered = materials;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(search) ||
        (m.sku && m.sku.toLowerCase().includes(search))
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(m => m.categoryId === categoryFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }
    
    if (lowStockFilter) {
      filtered = filtered.filter(m => m.needsReorder);
    }
    
    return filtered;
  }, [materials, searchTerm, categoryFilter, statusFilter, lowStockFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredMaterials.slice(startIndex, endIndex);
  }, [filteredMaterials, currentPage, itemsPerPage]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, lowStockFilter]);

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      active: { color: '#22c55e', label: 'Active', icon: <CheckCircle size={12} /> },
      inactive: { color: '#6b7280', label: 'Inactive', icon: <XCircle size={12} /> },
      discontinued: { color: '#ef4444', label: 'Discontinued', icon: <AlertCircle size={12} /> },
      draft: { color: '#f59e0b', label: 'Draft', icon: <Clock size={12} /> },
      sent: { color: '#3b82f6', label: 'Sent', icon: <Check size={12} /> },
      confirmed: { color: '#8b5cf6', label: 'Confirmed', icon: <CheckCircle size={12} /> },
      received: { color: '#22c55e', label: 'Received', icon: <CheckCircle size={12} /> },
      cancelled: { color: '#ef4444', label: 'Cancelled', icon: <XCircle size={12} /> }
    };
    const c = config[status] || config.active;
    return (
      <span className={`status-badge ${status}`}>
        {c.icon} {c.label}
      </span>
    );
  };

  const getStockStatus = (material) => {
    if (material.quantity <= material.reorderLevel) {
      return { label: 'Low Stock', color: '#ef4444', icon: <AlertTriangle size={12} /> };
    } else if (material.quantity <= material.reorderLevel * 1.5) {
      return { label: 'Approaching Reorder', color: '#f59e0b', icon: <Clock size={12} /> };
    }
    return { label: 'In Stock', color: '#22c55e', icon: <CheckCircle size={12} /> };
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId 
        ? `${API_BASE_URL}/inventory/materials/${editingId}`
        : `${API_BASE_URL}/inventory/materials`;
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
        throw new Error(errorData.error || 'Failed to save material');
      }

      setSuccess(editingId ? '✅ Material updated!' : '✅ Material created!');
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

  const handleEdit = (material) => {
    setEditingId(material.id);
    setFormData({
      name: material.name || '',
      categoryId: material.categoryId || '',
      unit: material.unit || '',
      unitPrice: material.unitPrice || '',
      quantity: material.quantity || '',
      minQuantity: material.minQuantity || '',
      maxQuantity: material.maxQuantity || '',
      reorderLevel: material.reorderLevel || '',
      location: material.location || '',
      warehouse: material.warehouse || '',
      supplierId: material.supplierId || '',
      description: material.description || '',
      status: material.status || 'active'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await fetch(`${API_BASE_URL}/inventory/materials/${id}`, { method: 'DELETE' });
      setSuccess('✅ Material deleted!');
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId 
        ? `${API_BASE_URL}/inventory/suppliers/${editingId}`
        : `${API_BASE_URL}/inventory/suppliers`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(supplierForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save supplier');
      }

      setSuccess(editingId ? '✅ Supplier updated!' : '✅ Supplier created!');
      await loadData();
      resetSupplierForm();
      setShowSupplierForm(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/inventory/materials/${selectedItem.id}/stock-adjust`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quantity: parseFloat(stockForm.quantity),
            movementType: stockForm.movementType,
            notes: stockForm.notes,
            createdBy: 'User'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to adjust stock');
      }

      setSuccess('✅ Stock adjusted successfully!');
      await loadData();
      setShowAdjustStock(false);
      resetStockForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePOSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/inventory/purchase-orders`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(poForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create purchase order');
      }

      const result = await response.json();
      setSuccess(`✅ Purchase Order ${result.poNumber} created!`);
      await loadData();
      resetPoForm();
      setShowPurchaseForm(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPOItem = () => {
    if (!poItemForm.materialId || !poItemForm.quantity) return;
    
    const material = materials.find(m => m.id === poItemForm.materialId);
    if (!material) return;

    const newItem = {
      materialId: material.id,
      materialName: material.name,
      quantity: parseFloat(poItemForm.quantity),
      unitPrice: parseFloat(poItemForm.unitPrice) || material.unitPrice,
      total: (parseFloat(poItemForm.quantity) || 0) * (parseFloat(poItemForm.unitPrice) || material.unitPrice)
    };

    setPoForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setPoItemForm({ materialId: '', quantity: '', unitPrice: '' });
  };

  const handleRemovePOItem = (index) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  const renderStats = () => {
    if (!summary) return null;

    const statItems = [
      { id: 'total', icon: Package, label: 'Total Materials', value: summary.totalMaterials || 0, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
      { id: 'active', icon: CheckCircle, label: 'Active Items', value: summary.activeMaterials || 0, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
      { id: 'low', icon: AlertTriangle, label: 'Low Stock', value: summary.lowStockItems || 0, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
      { id: 'value', icon: DollarSign, label: 'Stock Value', value: Utils.formatCurrencyShort(summary.totalStockValue || 0), color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' }
    ];

    return (
      <div className="stats-grid">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="stat-card">
              <div className="stat-icon" style={{ background: item.bg, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">{item.label}</span>
                <span className="stat-value">{item.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAutomationWidgets = () => {
    const lowStockCount = materials.filter(m => m.quantity <= m.reorderLevel && m.reorderLevel > 0).length;
    const costSavingOpportunities = optimizationResults?.length || 0;

    return (
      <div className="automation-widgets">
        {lowStockCount > 0 && (
          <div className="automation-card alert">
            <div className="automation-icon"><Bell size={20} /></div>
            <div className="automation-content">
              <div className="automation-title">Low Stock Alert</div>
              <div className="automation-description">
                {lowStockCount} items need reordering
              </div>
              <button className="automation-btn" onClick={handleAutoReorder}>
                <Zap size={14} /> Auto-Reorder
              </button>
            </div>
          </div>
        )}

        {costSavingOpportunities > 0 && (
          <div className="automation-card success">
            <div className="automation-icon"><TrendingUpIcon size={20} /></div>
            <div className="automation-content">
              <div className="automation-title">Cost Savings Found</div>
              <div className="automation-description">
                {costSavingOpportunities} optimization opportunities
              </div>
              <button 
                className="automation-btn" 
                onClick={() => setShowCostOptimizer(!showCostOptimizer)}
              >
                <Gauge size={14} /> View Savings
              </button>
            </div>
          </div>
        )}

        {autoReorderResults && (
          <div className="automation-card success">
            <div className="automation-icon"><ShoppingCart size={20} /></div>
            <div className="automation-content">
              <div className="automation-title">Auto-Reorder Ready</div>
              <div className="automation-description">
                {autoReorderResults.totalItems} items • {Utils.formatCurrency(autoReorderResults.estimatedCost)}
              </div>
              <div className="automation-actions">
                {Object.entries(autoReorderResults.groupedBySupplier).map(([supplierId, items]) => {
                  const supplier = suppliers.find(s => s.id === supplierId);
                  return supplier && (
                    <button 
                      key={supplierId}
                      className="automation-btn primary"
                      onClick={() => {
                        setPoForm(prev => ({
                          ...prev,
                          supplierId: supplierId,
                          items: items.map(item => ({
                            materialId: item.materialId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice
                          }))
                        }));
                        setShowPurchaseForm(true);
                        setAutoReorderResults(null);
                      }}
                    >
                      <FileText size={14} /> PO from {supplier.name}
                    </button>
                  );
                })}
                <button 
                  className="automation-btn secondary"
                  onClick={() => setAutoReorderResults(null)}
                >
                  <X size={14} /> Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER MATERIALS LIST
  // ============================================
  const renderMaterialsList = () => {
    return (
      <div className="materials-container">
        <div className="section-header">
          <div className="section-header-left">
            <h3><Package size={18} /> Materials Inventory</h3>
            <span className="section-count">{filteredMaterials.length} items</span>
          </div>
          <div className="section-header-right">
            <button className="btn-refresh" onClick={loadData}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={16} /> Add Material
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <div className="filter-group">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon || '📦'} {c.name}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={lowStockFilter}
                onChange={(e) => setLowStockFilter(e.target.checked)}
              />
              Low Stock Only
            </label>
          </div>
        </div>

        {/* Materials Grid */}
        <div className="materials-grid">
          {paginatedMaterials.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <h3>No Materials Found</h3>
              <p>Add your first material to start tracking inventory.</p>
            </div>
          ) : (
            paginatedMaterials.map(material => {
              const stockStatus = getStockStatus(material);
              const isExpanded = expandedItems[material.id];
              
              return (
                <div key={material.id} className="material-card">
                  <div className="material-card-header">
                    <div className="material-info">
                      <div className="material-name">{material.name}</div>
                      <div className="material-sku">{material.sku || 'No SKU'}</div>
                    </div>
                    <div className="material-badges">
                      {getStatusBadge(material.status)}
                      <span className={`stock-badge ${material.needsReorder ? 'low' : 'good'}`}>
                        {stockStatus.icon} {stockStatus.label}
                      </span>
                    </div>
                  </div>

                  <div className="material-card-body">
                    <div className="material-details">
                      <div className="detail-item">
                        <span className="label">Category:</span>
                        <span>{categories.find(c => c.id === material.categoryId)?.name || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Unit:</span>
                        <span>{material.unit || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Unit Price:</span>
                        <span className="price">{Utils.formatCurrency(material.unitPrice)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Quantity:</span>
                        <span className={`quantity ${material.quantity <= material.reorderLevel ? 'low' : ''}`}>
                          {material.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="material-stock-bar">
                      <div className="stock-bar-track">
                        <div 
                          className="stock-bar-fill"
                          style={{
                            width: `${Math.min((material.quantity / (material.maxQuantity || 100)) * 100, 100)}%`,
                            background: material.quantity <= material.reorderLevel ? '#ef4444' : '#22c55e'
                          }}
                        />
                      </div>
                      <div className="stock-bar-labels">
                        <span>0</span>
                        <span>Reorder: {material.reorderLevel || 0}</span>
                        <span>{material.maxQuantity || 'Max'}</span>
                      </div>
                    </div>

                    {material.location && (
                      <div className="material-location">
                        <MapPin size={14} /> {material.location} {material.warehouse ? `(${material.warehouse})` : ''}
                      </div>
                    )}
                    {material.supplierId && suppliers.find(s => s.id === material.supplierId) && (
                      <div className="material-supplier">
                        <Truck size={14} /> {suppliers.find(s => s.id === material.supplierId)?.name}
                      </div>
                    )}
                  </div>

                  <div className="material-card-footer">
                    <div className="material-actions">
                      <button 
                        className="btn-icon" 
                        title="View Details"
                        onClick={() => {
                          setSelectedItem(material);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Edit"
                        onClick={() => handleEdit(material)}
                      >
                        <Edit size={15} />
                      </button>
                      <button 
                        className="btn-icon stock-adjust-btn" 
                        title="Adjust Stock"
                        onClick={() => {
                          setSelectedItem(material);
                          resetStockForm();
                          setShowAdjustStock(true);
                        }}
                      >
                        <RefreshCw size={14} /> 
                        <span className="btn-label">Adjust</span>
                      </button>
                      <button 
                        className="btn-icon danger" 
                        title="Delete"
                        onClick={() => handleDelete(material.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                      <button 
                        className={`btn-icon ${isExpanded ? 'expanded' : ''}`} 
                        onClick={() => toggleExpand(material.id)}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="material-expanded">
                      <div className="expanded-grid">
                        <div><strong>Description:</strong> {material.description || 'N/A'}</div>
                        <div><strong>Min Quantity:</strong> {material.minQuantity || 0}</div>
                        <div><strong>Max Quantity:</strong> {material.maxQuantity || 'N/A'}</div>
                        <div><strong>Stock Value:</strong> {Utils.formatCurrency((material.quantity || 0) * (material.unitPrice || 0))}</div>
                        <div><strong>Location:</strong> {material.location || 'N/A'}</div>
                        <div><strong>Warehouse:</strong> {material.warehouse || 'N/A'}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {filteredMaterials.length > 0 && (
          <div className="inventory-pagination">
            <div className="inventory-pagination-info">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMaterials.length)} of {filteredMaterials.length} items
            </div>
            <div className="inventory-pagination-controls">
              <div className="inventory-pagination-items">
                <span>Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="inventory-pagination-select"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="inventory-pagination-buttons">
                <button 
                  className="inventory-page-btn" 
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft size={16} />
                </button>
                <button 
                  className="inventory-page-btn" 
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    className={`inventory-page-btn ${page === currentPage ? 'active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  className="inventory-page-btn" 
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
                <button 
                  className="inventory-page-btn" 
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER SUPPLIERS LIST
  // ============================================
  const renderSuppliersList = () => {
    return (
      <div className="suppliers-container">
        <div className="section-header">
          <div className="section-header-left">
            <h3><Truck size={18} /> Suppliers</h3>
            <span className="section-count">{suppliers.length} suppliers</span>
          </div>
          <div className="section-header-right">
            <button className="btn-primary" onClick={() => { resetSupplierForm(); setShowSupplierForm(true); }}>
              <Plus size={16} /> Add Supplier
            </button>
          </div>
        </div>

        <div className="suppliers-grid">
          {suppliers.length === 0 ? (
            <div className="empty-state">
              <Truck size={48} />
              <h3>No Suppliers</h3>
              <p>Add suppliers to manage your supply chain.</p>
            </div>
          ) : (
            suppliers.map(supplier => (
              <div key={supplier.id} className="supplier-card">
                <div className="supplier-card-header">
                  <div className="supplier-info">
                    <div className="supplier-name">{supplier.name}</div>
                    <div className="supplier-contact">{supplier.contactPerson || 'No contact'}</div>
                  </div>
                  <div className="supplier-rating">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill={i < (supplier.rating || 3) ? '#f59e0b' : 'none'} stroke="#f59e0b" />
                    ))}
                  </div>
                </div>
                <div className="supplier-card-body">
                  {supplier.email && (
                    <div className="detail-item"><span className="label">Email:</span> {supplier.email}</div>
                  )}
                  {supplier.phone && (
                    <div className="detail-item"><span className="label">Phone:</span> {supplier.phone}</div>
                  )}
                  {supplier.paymentTerms && (
                    <div className="detail-item"><span className="label">Payment Terms:</span> {supplier.paymentTerms}</div>
                  )}
                  {supplier.crNumber && (
                    <div className="detail-item"><span className="label">CR #:</span> {supplier.crNumber}</div>
                  )}
                </div>
                <div className="supplier-card-footer">
                  <button className="btn-icon" onClick={() => {
                    setEditingId(supplier.id);
                    setSupplierForm({
                      name: supplier.name || '',
                      contactPerson: supplier.contactPerson || '',
                      email: supplier.email || '',
                      phone: supplier.phone || '',
                      mobile: supplier.mobile || '',
                      address: supplier.address || '',
                      city: supplier.city || '',
                      country: supplier.country || '',
                      crNumber: supplier.crNumber || '',
                      vatNumber: supplier.vatNumber || '',
                      paymentTerms: supplier.paymentTerms || '',
                      rating: supplier.rating || 3,
                      notes: supplier.notes || ''
                    });
                    setShowSupplierForm(true);
                  }}>
                    <Edit size={15} />
                  </button>
                  <button className="btn-icon danger" onClick={() => {
                    if (window.confirm('Delete this supplier?')) {
                      // Delete supplier logic
                    }
                  }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER PURCHASE ORDERS
  // ============================================
  const renderPurchaseOrders = () => {
    return (
      <div className="orders-container">
        <div className="section-header">
          <div className="section-header-left">
            <h3><ShoppingCart size={18} /> Purchase Orders</h3>
            <span className="section-count">{purchaseOrders.length} orders</span>
          </div>
          <div className="section-header-right">
            <button className="btn-primary" onClick={() => { resetPoForm(); setShowPurchaseForm(true); }}>
              <Plus size={16} /> New PO
            </button>
          </div>
        </div>

        <div className="orders-grid">
          {purchaseOrders.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart size={48} />
              <h3>No Purchase Orders</h3>
              <p>Create purchase orders to manage procurement.</p>
            </div>
          ) : (
            purchaseOrders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div className="order-info">
                    <div className="order-number">{order.poNumber}</div>
                    <div className="order-supplier">{order.supplierName}</div>
                    <div className="order-date">{Utils.formatDate(order.orderDate)}</div>
                  </div>
                  <div className="order-badges">
                    {getStatusBadge(order.status)}
                    <span className="order-total">{Utils.formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
                <div className="order-card-body">
                  <div className="order-items">
                    {order.items?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="order-item">
                        <span>{item.materialName}</span>
                        <span>{item.quantity} × {Utils.formatCurrencyShort(item.unitPrice)}</span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <div className="order-more">+{order.items.length - 3} more items</div>
                    )}
                  </div>
                </div>
                <div className="order-card-footer">
                  <button className="btn-icon" onClick={() => {
                    setSelectedItem(order);
                    setShowDetailModal(true);
                  }}>
                    <Eye size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER STOCK MOVEMENTS
  // ============================================
  const renderStockMovements = () => {
    return (
      <div className="movements-container">
        <div className="section-header">
          <div className="section-header-left">
            <h3><RefreshCw size={18} /> Stock Movements</h3>
            <span className="section-count">{stockMovements.length} records</span>
          </div>
          <div className="section-header-right">
            <button className="btn-refresh" onClick={loadData}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        <div className="movements-table-container">
          <table className="movements-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Previous</th>
                <th>New</th>
                <th>Date</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {stockMovements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state-cell">
                    <div className="empty-state-small">No stock movements recorded</div>
                  </td>
                </tr>
              ) : (
                stockMovements.map(movement => (
                  <tr key={movement.id}>
                    <td>{movement.materialName}</td>
                    <td>
                      <span className={`movement-type-badge ${movement.movementType}`}>
                        {movement.movementType}
                      </span>
                    </td>
                    <td className={movement.quantity > 0 ? 'positive' : 'negative'}>
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </td>
                    <td>{movement.previousQuantity}</td>
                    <td>{movement.newQuantity}</td>
                    <td>{Utils.formatDate(movement.createdAt)}</td>
                    <td>{movement.createdBy || 'System'}</td>
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
  // RENDER MATERIAL FORM MODAL
  // ============================================
  const renderMaterialFormModal = () => {
    return (
      <div className="inventory-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
        <div className="inventory-modal-content form-modal" onClick={e => e.stopPropagation()}>
          <div className="inventory-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="inventory-modal-header-left">
              {editingId ? <Edit size={24} color="#ffffff" /> : <Package size={24} color="#ffffff" />}
              <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Material' : 'New Material'}</h3>
            </div>
            <button className="inventory-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="inventory-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label><FileText size={14} /> Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Material name"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><FolderKanban size={14} /> Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon || '📦'} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><Boxes size={14} /> Unit <span className="required">*</span></label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="">Select Unit</option>
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilogram</option>
                    <option value="ton">Ton</option>
                    <option value="meter">Meter</option>
                    <option value="sqm">Square Meter</option>
                    <option value="box">Box</option>
                    <option value="roll">Roll</option>
                    <option value="sheet">Sheet</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><DollarSign size={14} /> Unit Price (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.unitPrice}
                    onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="0.000"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><Box size={14} /> Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><AlertCircle size={14} /> Reorder Level</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.reorderLevel}
                    onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })}
                    placeholder="0"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><ChevronDown size={14} /> Min Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minQuantity}
                    onChange={e => setFormData({ ...formData, minQuantity: e.target.value })}
                    placeholder="0"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><ChevronUp size={14} /> Max Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxQuantity}
                    onChange={e => setFormData({ ...formData, maxQuantity: e.target.value })}
                    placeholder="0"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><MapPin size={14} /> Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Aisle 1"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><Warehouse size={14} /> Warehouse</label>
                  <input
                    type="text"
                    value={formData.warehouse}
                    onChange={e => setFormData({ ...formData, warehouse: e.target.value })}
                    placeholder="e.g., Main"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><Truck size={14} /> Supplier</label>
                  <select
                    value={formData.supplierId}
                    onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label><Shield size={14} /> Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="form-select"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label><FileText size={14} /> Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional notes"
                  rows="2"
                  className="form-textarea"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
  // RENDER SUPPLIER FORM MODAL
  // ============================================
  const renderSupplierFormModal = () => {
    return (
      <div className="inventory-modal-overlay" onClick={() => { setShowSupplierForm(false); resetSupplierForm(); }}>
        <div className="inventory-modal-content form-modal" onClick={e => e.stopPropagation()}>
          <div className="inventory-modal-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <div className="inventory-modal-header-left">
              {editingId ? <Edit size={24} color="#ffffff" /> : <Truck size={24} color="#ffffff" />}
              <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Supplier' : 'New Supplier'}</h3>
            </div>
            <button className="inventory-modal-close" onClick={() => { setShowSupplierForm(false); resetSupplierForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="inventory-modal-body">
            <form onSubmit={handleSupplierSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label><Building2 size={14} /> Company Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={supplierForm.name}
                    onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    required
                    placeholder="Company name"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><User size={14} /> Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={e => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    placeholder="Contact person name"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><Mail size={14} /> Email</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="email@company.com"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><Phone size={14} /> Phone</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="Phone number"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><MapPin size={14} /> Address</label>
                  <input
                    type="text"
                    value={supplierForm.address}
                    onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    placeholder="Street address"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><Building2 size={14} /> City</label>
                  <input
                    type="text"
                    value={supplierForm.city}
                    onChange={e => setSupplierForm({ ...supplierForm, city: e.target.value })}
                    placeholder="City"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><Landmark size={14} /> CR Number</label>
                  <input
                    type="text"
                    value={supplierForm.crNumber}
                    onChange={e => setSupplierForm({ ...supplierForm, crNumber: e.target.value })}
                    placeholder="Commercial Registration"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><Tag size={14} /> VAT Number</label>
                  <input
                    type="text"
                    value={supplierForm.vatNumber}
                    onChange={e => setSupplierForm({ ...supplierForm, vatNumber: e.target.value })}
                    placeholder="VAT Registration"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><Clock size={14} /> Payment Terms</label>
                  <select
                    value={supplierForm.paymentTerms}
                    onChange={e => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Payment Terms</option>
                    <option value="net30">Net 30</option>
                    <option value="net60">Net 60</option>
                    <option value="cash">Cash</option>
                    <option value="advance">Advance Payment</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><Star size={14} /> Rating</label>
                  <select
                    value={supplierForm.rating}
                    onChange={e => setSupplierForm({ ...supplierForm, rating: parseInt(e.target.value) })}
                    className="form-select"
                  >
                    <option value="1">⭐ 1 Star</option>
                    <option value="2">⭐⭐ 2 Stars</option>
                    <option value="3">⭐⭐⭐ 3 Stars</option>
                    <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                    <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label><FileText size={14} /> Notes</label>
                <textarea
                  value={supplierForm.notes}
                  onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows="2"
                  className="form-textarea"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowSupplierForm(false); resetSupplierForm(); }}>
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
  // RENDER PURCHASE ORDER FORM MODAL
  // ============================================
  const renderPurchaseFormModal = () => {
    return (
      <div className="inventory-modal-overlay" onClick={() => { setShowPurchaseForm(false); resetPoForm(); }}>
        <div className="inventory-modal-content form-modal" onClick={e => e.stopPropagation()}>
          <div className="inventory-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="inventory-modal-header-left">
              <ShoppingCart size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>New Purchase Order</h3>
            </div>
            <button className="inventory-modal-close" onClick={() => { setShowPurchaseForm(false); resetPoForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="inventory-modal-body">
            <form onSubmit={handlePOSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label><Truck size={14} /> Supplier <span className="required">*</span></label>
                  <select
                    value={poForm.supplierId}
                    onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label><Calendar size={14} /> Order Date <span className="required">*</span></label>
                  <input
                    type="date"
                    value={poForm.orderDate}
                    onChange={e => setPoForm({ ...poForm, orderDate: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label><Calendar size={14} /> Expected Delivery</label>
                  <input
                    type="date"
                    value={poForm.expectedDelivery}
                    onChange={e => setPoForm({ ...poForm, expectedDelivery: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label><Percent size={14} /> VAT Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={poForm.vatRate}
                    onChange={e => setPoForm({ ...poForm, vatRate: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label><FileText size={14} /> Notes</label>
                <input
                  type="text"
                  value={poForm.notes}
                  onChange={e => setPoForm({ ...poForm, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="form-input"
                />
              </div>

              <div className="po-items-section">
                <h4>Order Items</h4>
                <div className="po-item-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Material</label>
                      <select
                        value={poItemForm.materialId}
                        onChange={e => setPoItemForm({ ...poItemForm, materialId: e.target.value })}
                        className="form-select"
                      >
                        <option value="">Select Material</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        value={poItemForm.quantity}
                        onChange={e => setPoItemForm({ ...poItemForm, quantity: e.target.value })}
                        placeholder="0"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit Price</label>
                      <input
                        type="number"
                        step="0.001"
                        value={poItemForm.unitPrice}
                        onChange={e => setPoItemForm({ ...poItemForm, unitPrice: e.target.value })}
                        placeholder="0.000"
                        className="form-input"
                      />
                    </div>
                    <button type="button" className="btn-primary" onClick={handleAddPOItem}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>

                <div className="po-items-list">
                  {poForm.items.map((item, index) => (
                    <div key={index} className="po-item-row">
                      <span className="item-name">{item.materialName}</span>
                      <span className="item-details">{item.quantity} × {Utils.formatCurrencyShort(item.unitPrice)}</span>
                      <span className="item-total">{Utils.formatCurrency(item.total)}</span>
                      <button className="btn-icon danger" onClick={() => handleRemovePOItem(index)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {poForm.items.length === 0 && (
                    <div className="empty-state-small">No items added yet</div>
                  )}
                </div>

                {poForm.items.length > 0 && (
                  <div className="po-summary">
                    <div className="summary-item">
                      <span>Subtotal:</span>
                      <span>{Utils.formatCurrency(poForm.items.reduce((sum, i) => sum + i.total, 0))}</span>
                    </div>
                    <div className="summary-item">
                      <span>VAT ({poForm.vatRate}%):</span>
                      <span>{Utils.formatCurrency(poForm.items.reduce((sum, i) => sum + i.total, 0) * (poForm.vatRate / 100))}</span>
                    </div>
                    <div className="summary-item total">
                      <span><strong>Total:</strong></span>
                      <span><strong>{Utils.formatCurrency(poForm.items.reduce((sum, i) => sum + i.total, 0) * (1 + poForm.vatRate / 100))}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading || poForm.items.length === 0}>
                  <Save size={16} /> {loading ? 'Creating...' : 'Create PO'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowPurchaseForm(false); resetPoForm(); }}>
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
  // RENDER STOCK ADJUSTMENT MODAL
  // ============================================
  const renderStockAdjustModal = () => {
    if (!selectedItem) return null;

    return (
      <div className="inventory-modal-overlay" onClick={() => { setShowAdjustStock(false); resetStockForm(); }}>
        <div className="inventory-modal-content form-modal" onClick={e => e.stopPropagation()}>
          <div className="inventory-modal-header" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <div className="inventory-modal-header-left">
              <RefreshCw size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Adjust Stock - {selectedItem.name}</h3>
            </div>
            <button className="inventory-modal-close" onClick={() => { setShowAdjustStock(false); resetStockForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="inventory-modal-body">
            <form onSubmit={handleAdjustStock}>
              <div className="form-group">
                <label>Current Quantity: <strong>{selectedItem.quantity}</strong> {selectedItem.unit}</label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity Change <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    value={stockForm.quantity}
                    onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })}
                    required
                    placeholder="Enter +/- quantity"
                    className="form-input"
                  />
                  <span className="form-hint">Use positive for addition, negative for removal</span>
                </div>
                <div className="form-group">
                  <label>Movement Type</label>
                  <select
                    value={stockForm.movementType}
                    onChange={e => setStockForm({ ...stockForm, movementType: e.target.value })}
                    className="form-select"
                  >
                    <option value="adjustment">Adjustment</option>
                    <option value="purchase">Purchase</option>
                    <option value="sale">Sale</option>
                    <option value="wastage">Wastage</option>
                    <option value="return">Return</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label><FileText size={14} /> Notes</label>
                <input
                  type="text"
                  value={stockForm.notes}
                  onChange={e => setStockForm({ ...stockForm, notes: e.target.value })}
                  placeholder="Reason for adjustment"
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Adjusting...' : 'Adjust Stock'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowAdjustStock(false); resetStockForm(); }}>
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
  // RENDER DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedItem) return null;

    return (
      <div className="inventory-modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="inventory-modal-content detail-modal" onClick={e => e.stopPropagation()}>
          <div className="inventory-modal-header" style={{ background: 'linear-gradient(135deg, #1a2332, #2a3a4a)' }}>
            <div className="inventory-modal-header-left">
              <Package size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Material Details</h3>
            </div>
            <button className="inventory-modal-close" onClick={() => setShowDetailModal(false)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="inventory-modal-body">
            <div className="detail-grid">
              <div className="detail-section">
                <h4><FileText size={14} /> Basic Information</h4>
                <div className="detail-row"><span className="label">Name:</span><span className="value">{selectedItem.name}</span></div>
                <div className="detail-row"><span className="label">SKU:</span><span className="value">{selectedItem.sku || 'N/A'}</span></div>
                <div className="detail-row"><span className="label">Category:</span><span className="value">{categories.find(c => c.id === selectedItem.categoryId)?.name || 'N/A'}</span></div>
                <div className="detail-row"><span className="label">Status:</span><span className="value">{getStatusBadge(selectedItem.status)}</span></div>
              </div>
              <div className="detail-section">
                <h4><DollarSign size={14} /> Stock Information</h4>
                <div className="detail-row"><span className="label">Quantity:</span><span className="value">{selectedItem.quantity}</span></div>
                <div className="detail-row"><span className="label">Unit:</span><span className="value">{selectedItem.unit}</span></div>
                <div className="detail-row"><span className="label">Unit Price:</span><span className="value amount">{Utils.formatCurrency(selectedItem.unitPrice)}</span></div>
                <div className="detail-row"><span className="label">Stock Value:</span><span className="value amount">{Utils.formatCurrency((selectedItem.quantity || 0) * (selectedItem.unitPrice || 0))}</span></div>
              </div>
              <div className="detail-section full-width">
                <h4><Settings size={14} /> Additional Information</h4>
                <div className="detail-row"><span className="label">Location:</span><span className="value">{selectedItem.location || 'N/A'}</span></div>
                <div className="detail-row"><span className="label">Warehouse:</span><span className="value">{selectedItem.warehouse || 'N/A'}</span></div>
                <div className="detail-row"><span className="label">Supplier:</span><span className="value">{suppliers.find(s => s.id === selectedItem.supplierId)?.name || 'N/A'}</span></div>
                <div className="detail-row"><span className="label">Description:</span><span className="value">{selectedItem.description || 'N/A'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER COST OPTIMIZER
  // ============================================
  const renderCostOptimizer = () => {
    if (!showCostOptimizer || !optimizationResults) return null;

    return (
      <div className="cost-optimizer-modal">
        <div className="cost-optimizer-content">
          <div className="cost-optimizer-header">
            <h3>💰 Cost Optimization Opportunities</h3>
            <button onClick={() => setShowCostOptimizer(false)}><X size={20} /></button>
          </div>
          <div className="cost-optimizer-body">
            {optimizationResults.map((opt, index) => (
              <div key={index} className="optimization-item">
                <div className="opt-category">{opt.category}</div>
                <div className="opt-details">
                  <span className="opt-current">{opt.item}: {Utils.formatCurrency(opt.currentPrice)}</span>
                  <span className="opt-arrow">→</span>
                  <span className="opt-alternative">{opt.alternative}: {Utils.formatCurrency(opt.potentialPrice)}</span>
                  <span className="opt-savings">Save {Utils.formatCurrency(opt.savings)} per unit</span>
                </div>
              </div>
            ))}
            <button className="btn-primary" onClick={() => {
              setSuccess('✅ Cost optimization suggestions applied!');
              setTimeout(() => setSuccess(''), 3000);
              setShowCostOptimizer(false);
            }}>
              <Save size={16} /> Apply Optimizations
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
    <div className="inventory-management-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <Package size={28} />
            <span className="header-badge">Inventory</span>
          </div>
          <div>
            <h2>Inventory Management</h2>
            <p className="header-subtitle">Track materials, stock levels, and suppliers</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-refresh-modern" onClick={loadData}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Automation Widgets */}
      {renderAutomationWidgets()}

      {/* Cost Optimizer */}
      {renderCostOptimizer()}

      {/* Messages */}
      {error && (
        <div className="error-message">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="success-message">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* View Tabs */}
      <div className="view-tabs-modern">
        <button
          className={`tab-btn ${viewMode === 'materials' ? 'active' : ''}`}
          onClick={() => setViewMode('materials')}
        >
          <Package size={16} /> Materials
        </button>
        <button
          className={`tab-btn ${viewMode === 'suppliers' ? 'active' : ''}`}
          onClick={() => setViewMode('suppliers')}
        >
          <Truck size={16} /> Suppliers
        </button>
        <button
          className={`tab-btn ${viewMode === 'orders' ? 'active' : ''}`}
          onClick={() => setViewMode('orders')}
        >
          <ShoppingCart size={16} /> Purchase Orders
        </button>
        <button
          className={`tab-btn ${viewMode === 'movements' ? 'active' : ''}`}
          onClick={() => setViewMode('movements')}
        >
          <RefreshCw size={16} /> Stock Movements
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          {/* <div className="loading-spinner"></div>
          <span>Loading...</span> */}
        </div>
      ) : (
        <>
          {viewMode === 'materials' && renderMaterialsList()}
          {viewMode === 'suppliers' && renderSuppliersList()}
          {viewMode === 'orders' && renderPurchaseOrders()}
          {viewMode === 'movements' && renderStockMovements()}
        </>
      )}

      {/* Modals */}
      {showForm && renderMaterialFormModal()}
      {showSupplierForm && renderSupplierFormModal()}
      {showPurchaseForm && renderPurchaseFormModal()}
      {showAdjustStock && renderStockAdjustModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default InventoryManagement;