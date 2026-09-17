// src/components/InventoryManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, Plus, Search, Edit, Trash2, Eye, X, Save, RefreshCw,
  ChevronDown, ChevronUp, CheckCircle, AlertCircle, Clock, Building2,
  User, Calendar, DollarSign, TrendingUp, TrendingDown, Boxes, Truck,
  ShoppingCart, Warehouse, Tag, Layers, FileText, Shield, Users,
  AlertTriangle, Check, XCircle, Star, MapPin, Bell, Zap, Gauge,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FolderKanban,
  Box, HardHat, Award, Landmark, Phone, Mail, BarChart3,
  PieChart as PieChartIcon, LineChart as LineChartIcon,
  LayoutDashboard, Sparkles, Flame, Target, Percent, Wallet,
  Minus, Crown, CircleDollarSign, ClipboardList, PackageCheck,
  PackageX, PackageSearch, Loader2, Info
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, LineChart as ReLineChart, Line
} from 'recharts';
import Utils from '../utils/Utils';
import './InventoryManagement.css';
import useUnits from '../hooks/useUnits';

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
    <div className="inv-chart-tooltip">
      {label && <div className="inv-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="inv-chart-tooltip-row">
          <span className="inv-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="inv-chart-tooltip-name">{p.name}</span>
          <span className="inv-chart-tooltip-val">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// FALLBACK UNITS
// ============================================
const FALLBACK_UNITS = ['pcs', 'kg', 'ton', 'm', 'm2', 'm3', 'liter', 'box', 'roll', 'sheet', 'bag', 'set'];

// ============================================
// MAIN COMPONENT
// ============================================
const InventoryManagement = ({
  data,
  refreshData,
  setTabLoading,
  setTabLoadingLabel,
  showLoader: externalShowLoader,   // ← renamed
  hideLoader: externalHideLoader,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('overview');
  const [mounted, setMounted] = useState(false);

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
  const [autoReorderResults, setAutoReorderResults] = useState(null);

  // ---------- Units from Units table ----------
  const { units: allUnits } = useUnits();

  const availableUnitNames = useMemo(() => {
    const active = (allUnits || []).filter(u => u.isActive);
    if (active.length > 0) {
      return [...active]
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(u => u.name);
    }
    return FALLBACK_UNITS;
  }, [allUnits]);

  // Pagination
  const [matPage, setMatPage] = useState(1);
  const [matPer, setMatPer] = useState(10);
  const [supPage, setSupPage] = useState(1);
  const [supPer, setSupPer] = useState(9);
  const [ordPage, setOrdPage] = useState(1);
  const [ordPer, setOrdPer] = useState(9);
  const [movPage, setMovPage] = useState(1);
  const [movPer, setMovPer] = useState(10);

  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);

  const [formData, setFormData] = useState({
    name: '', categoryId: '', unit: '', unitPrice: '', quantity: '',
    minQuantity: '', maxQuantity: '', reorderLevel: '', location: '',
    warehouse: '', supplierId: '', description: '', status: 'active'
  });

  const [supplierForm, setSupplierForm] = useState({
    name: '', contactPerson: '', email: '', phone: '', mobile: '',
    address: '', city: '', country: '', crNumber: '', vatNumber: '',
    paymentTerms: '', rating: 3, notes: ''
  });

  const [poForm, setPoForm] = useState({
    supplierId: '', orderDate: Utils.today(), expectedDelivery: '',
    vatRate: 0, notes: '', items: []
  });

  const [stockForm, setStockForm] = useState({
    quantity: '', movementType: 'adjustment', notes: ''
  });

  // ⭐ poItemForm now includes materialUnit
  const [poItemForm, setPoItemForm] = useState({
    materialId: '', quantity: '', unitPrice: '', materialUnit: ''
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // GLOBAL LOADER — works with either prop shape
  // ============================================
  const showGlobalLoader = useCallback((label = 'Loading…') => {
  if (typeof externalShowLoader === 'function') {
    externalShowLoader(label);   // ← reference-counted loader from useData
    return;
  }
  // Fallback: immediate set (only if showLoader wasn't passed)
  if (setTabLoading) {
    setTabLoading(true);
    if (setTabLoadingLabel) setTabLoadingLabel(label);
  }
}, [externalShowLoader, setTabLoading, setTabLoadingLabel]);

const hideGlobalLoader = useCallback(() => {
  if (typeof externalHideLoader === 'function') {
    externalHideLoader();        // ← reference-counted loader from useData
    return;
  }
  if (setTabLoading) setTabLoading(false);
}, [externalHideLoader, setTabLoading]);
  
  // ============================================
  // RESET
  // ============================================
  const resetForm = () => {
    setFormData({
      name: '', categoryId: '', unit: '', unitPrice: '', quantity: '',
      minQuantity: '', maxQuantity: '', reorderLevel: '', location: '',
      warehouse: '', supplierId: '', description: '', status: 'active'
    });
    setEditingId(null);
  };
  const resetSupplierForm = () => {
    setSupplierForm({
      name: '', contactPerson: '', email: '', phone: '', mobile: '',
      address: '', city: '', country: '', crNumber: '', vatNumber: '',
      paymentTerms: '', rating: 3, notes: ''
    });
    setEditingId(null);
  };
  const resetPoForm = () => {
    setPoForm({
      supplierId: '', orderDate: Utils.today(), expectedDelivery: '',
      vatRate: 0, notes: '', items: []
    });
    setPoItemForm({ materialId: '', quantity: '', unitPrice: '', materialUnit: '' });
    setEditingId(null);
  };
  const resetStockForm = () => setStockForm({ quantity: '', movementType: 'adjustment', notes: '' });

  // ============================================
  // LOAD
  // ============================================
  const loadData = useCallback(async ({ showLoader = false } = {}) => {
    setLoading(true); setError('');
    if (showLoader) showGlobalLoader('Loading inventory…');
    try {
      const [materialsRes, categoriesRes, suppliersRes, ordersRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory/materials`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/inventory/categories`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/inventory/suppliers`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/inventory/purchase-orders`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/inventory/summary`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : {})
      ]);
      setMaterials(materialsRes);
      setCategories(categoriesRes);
      setSuppliers(suppliersRes);
      setPurchaseOrders(ordersRes);
      setSummary(summaryRes);
      if (viewMode === 'movements') {
        const mv = await fetch(`${API_BASE_URL}/inventory/stock-movements`, { headers: { 'Accept': 'application/json' } });
        if (mv.ok) setStockMovements(await mv.json());
      }
      checkLowStockAlerts(materialsRes);
      checkCostOptimization(materialsRes, categoriesRes);
    } catch (err) { setError(err.message); }
    finally {
      setLoading(false);
      if (showLoader) hideGlobalLoader();
    }
  }, [viewMode, showGlobalLoader, hideGlobalLoader]);

  useEffect(() => { loadData(); }, [loadData]);

  // ============================================
  // AUTOMATION
  // ============================================
  const checkLowStockAlerts = (list) => {
    const low = list.filter(m => m.quantity <= m.reorderLevel && m.reorderLevel > 0);
    if (low.length > 0) {
      setSuccess(`${low.length} items need reordering`);
      setTimeout(() => setSuccess(''), 6000);
    }
  };

  const checkCostOptimization = (list, cats) => {
    const opps = [];
    const grouped = list.reduce((acc, m) => {
      if (!acc[m.categoryId]) acc[m.categoryId] = [];
      acc[m.categoryId].push(m);
      return acc;
    }, {});
    Object.keys(grouped).forEach(catId => {
      const items = grouped[catId];
      if (items.length > 1) {
        const sorted = [...items].sort((a, b) => a.unitPrice - b.unitPrice);
        const cheapest = sorted[0];
        const expensive = sorted[sorted.length - 1];
        if (expensive.unitPrice > cheapest.unitPrice * 1.3) {
          opps.push({
            category: cats.find(c => c.id === catId)?.name || catId,
            item: expensive.name,
            currentPrice: expensive.unitPrice,
            potentialPrice: cheapest.unitPrice,
            savings: expensive.unitPrice - cheapest.unitPrice,
            alternative: cheapest.name
          });
        }
      }
    });
    if (opps.length > 0) setOptimizationResults(opps);
  };

  const handleAutoReorder = async () => {
    const lowItems = materials.filter(m => m.quantity <= m.reorderLevel && m.reorderLevel > 0);
    if (lowItems.length === 0) {
      setSuccess('All items are above reorder level');
      setTimeout(() => setSuccess(''), 3000);
      return;
    }
    setLoading(true);
    showGlobalLoader('Preparing auto-reorder…');
    try {
      const reorderItems = lowItems.map(m => ({
        materialId: m.id, quantity: Math.ceil(m.reorderLevel * 2),
        unitPrice: m.unitPrice, name: m.name
      }));
      const groupedBySupplier = reorderItems.reduce((acc, item) => {
        const material = materials.find(m => m.id === item.materialId);
        const sid = material?.supplierId || 'unknown';
        if (!acc[sid]) acc[sid] = [];
        acc[sid].push(item);
        return acc;
      }, {});
      setAutoReorderResults({
        totalItems: reorderItems.length,
        groupedBySupplier,
        estimatedCost: reorderItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0)
      });
      setSuccess(`Auto-reorder prepared for ${reorderItems.length} items`);
      setTimeout(() => setSuccess(''), 5000);
    } catch { setError('Failed to auto-reorder'); }
    finally {
      setLoading(false);
      hideGlobalLoader();
    }
  };

  // ============================================
  // FILTER
  // ============================================
  const filteredMaterials = useMemo(() => {
    let f = materials;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(m => m.name?.toLowerCase().includes(s) || (m.sku && m.sku.toLowerCase().includes(s)));
    }
    if (categoryFilter !== 'all') f = f.filter(m => m.categoryId === categoryFilter);
    if (statusFilter !== 'all') f = f.filter(m => m.status === statusFilter);
    if (lowStockFilter) f = f.filter(m => m.needsReorder);
    return f;
  }, [materials, searchTerm, categoryFilter, statusFilter, lowStockFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const paginate = (list, page, per) => {
    const total = Math.max(1, Math.ceil(list.length / per));
    const p = Math.max(1, Math.min(page, total));
    const start = (p - 1) * per;
    return { total, page: p, items: list.slice(start, start + per) };
  };
  const getPageNumbers = (current, total) => {
    const pages = []; const max = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };
  const renderPagination = (current, total, per, setPer, setPage, count, label = 'items') => {
    if (count === 0) return null;
    const startItem = (current - 1) * per + 1;
    const endItem = Math.min(current * per, count);
    return (
      <div className="inv-pagination">
        <div className="inv-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{count}</strong> {label}
        </div>
        <div className="inv-pagination-controls">
          <div className="inv-pagination-items">
            <span>Show:</span>
            <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} className="inv-pagination-select">
              {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="inv-pagination-buttons">
            <button className="inv-page-btn" onClick={() => setPage(1)} disabled={current === 1}><ChevronsLeft size={13} /></button>
            <button className="inv-page-btn" onClick={() => setPage(current - 1)} disabled={current === 1}><ChevronLeft size={13} /></button>
            {getPageNumbers(current, total).map(p => (
              <button key={p} className={`inv-page-btn ${p === current ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="inv-page-btn" onClick={() => setPage(current + 1)} disabled={current === total}><ChevronRight size={13} /></button>
            <button className="inv-page-btn" onClick={() => setPage(total)} disabled={current === total}><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => { setMatPage(1); }, [searchTerm, categoryFilter, statusFilter, lowStockFilter, matPer]);

  // ============================================
  // HELPERS
  // ============================================
  const getStatusBadge = (status) => {
    const cfg = {
      active: { color: '#10b981', label: 'Active', icon: CheckCircle },
      inactive: { color: '#64748b', label: 'Inactive', icon: XCircle },
      discontinued: { color: '#ef4444', label: 'Discontinued', icon: AlertCircle },
      draft: { color: '#f59e0b', label: 'Draft', icon: Clock },
      sent: { color: '#3b82f6', label: 'Sent', icon: Check },
      confirmed: { color: '#8b5cf6', label: 'Confirmed', icon: CheckCircle },
      received: { color: '#10b981', label: 'Received', icon: PackageCheck },
      cancelled: { color: '#ef4444', label: 'Cancelled', icon: XCircle }
    };
    const c = cfg[status] || cfg.active;
    const Icon = c.icon;
    return (
      <span className={`inv-status ${status}`}>
        <Icon size={10} /> {c.label}
      </span>
    );
  };

  const getStockStatus = (m) => {
    if (m.quantity <= m.reorderLevel) return { label: 'Low Stock', color: '#ef4444', icon: AlertTriangle };
    if (m.quantity <= m.reorderLevel * 1.5) return { label: 'Approaching', color: '#f59e0b', icon: Clock };
    return { label: 'In Stock', color: '#10b981', icon: CheckCircle };
  };

  const toggleExpand = (id) => setExpandedItems(p => ({ ...p, [id]: !p[id] }));

  // ============================================
  // CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    showGlobalLoader(editingId ? 'Updating material…' : 'Saving material…');
    try {
      const url = editingId ? `${API_BASE_URL}/inventory/materials/${editingId}` : `${API_BASE_URL}/inventory/materials`;
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save material');
      }
      setSuccess(editingId ? 'Material updated!' : 'Material created!');
      await loadData();
      resetForm(); setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); hideGlobalLoader(); }
  };

  const handleEdit = (m) => {
    setEditingId(m.id);
    setFormData({
      name: m.name || '', categoryId: m.categoryId || '', unit: m.unit || '',
      unitPrice: m.unitPrice || '', quantity: m.quantity || '',
      minQuantity: m.minQuantity || '', maxQuantity: m.maxQuantity || '',
      reorderLevel: m.reorderLevel || '', location: m.location || '',
      warehouse: m.warehouse || '', supplierId: m.supplierId || '',
      description: m.description || '', status: m.status || 'active'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    showGlobalLoader('Deleting material…');
    try {
      await fetch(`${API_BASE_URL}/inventory/materials/${id}`, { method: 'DELETE' });
      setSuccess('Material deleted!');
      await loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { hideGlobalLoader(); }
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    showGlobalLoader(editingId ? 'Updating supplier…' : 'Saving supplier…');
    try {
      const url = editingId ? `${API_BASE_URL}/inventory/suppliers/${editingId}` : `${API_BASE_URL}/inventory/suppliers`;
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save supplier');
      }
      setSuccess(editingId ? 'Supplier updated!' : 'Supplier created!');
      await loadData();
      resetSupplierForm(); setShowSupplierForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); hideGlobalLoader(); }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setLoading(true); setError(''); setSuccess('');
    showGlobalLoader('Adjusting stock…');
    try {
      const r = await fetch(`${API_BASE_URL}/inventory/materials/${selectedItem.id}/stock-adjust`, {
        method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseFloat(stockForm.quantity),
          movementType: stockForm.movementType,
          notes: stockForm.notes, createdBy: 'User'
        })
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to adjust stock');
      }
      setSuccess('Stock adjusted!');
      await loadData();
      setShowAdjustStock(false); resetStockForm();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); hideGlobalLoader(); }
  };

  const handlePOSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    showGlobalLoader('Creating purchase order…');
    try {
      const r = await fetch(`${API_BASE_URL}/inventory/purchase-orders`, {
        method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(poForm)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create purchase order');
      }
      const result = await r.json();
      setSuccess(`PO ${result.poNumber} created!`);
      await loadData();
      resetPoForm(); setShowPurchaseForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); hideGlobalLoader(); }
  };

  // ⭐ NEW: Auto-fill unit + price when material changes
  const handlePOItemMaterialSelect = (materialId) => {
    if (!materialId) {
      setPoItemForm({ materialId: '', quantity: '', unitPrice: '', materialUnit: '' });
      return;
    }
    const mat = materials.find(m => m.id === materialId);
    if (!mat) {
      setPoItemForm(prev => ({ ...prev, materialId }));
      return;
    }
    setPoItemForm({
      materialId: mat.id,
      quantity: '',
      unitPrice: mat.unitPrice != null ? String(mat.unitPrice) : '',
      materialUnit: mat.unit || '',
    });
  };

  const handleAddPOItem = () => {
    if (!poItemForm.materialId || !poItemForm.quantity) return;
    const mat = materials.find(m => m.id === poItemForm.materialId);
    if (!mat) return;

    const q = parseFloat(poItemForm.quantity) || 0;
    const p = parseFloat(poItemForm.unitPrice);
    const finalPrice = isNaN(p) ? (mat.unitPrice || 0) : p;
    const unit = poItemForm.materialUnit || mat.unit || '';

    setPoForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          materialId: mat.id,
          materialName: mat.name,
          materialSku: mat.sku || '',
          unit,
          quantity: q,
          unitPrice: finalPrice,
          total: q * finalPrice,
        }
      ]
    }));

    setPoItemForm({ materialId: '', quantity: '', unitPrice: '', materialUnit: '' });
  };

  const handleRemovePOItem = (index) => {
    setPoForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // ============================================
  // CHART DATA
  // ============================================
  const categoryChartData = useMemo(() => {
    const map = {};
    materials.forEach(m => {
      const key = categories.find(c => c.id === m.categoryId)?.name || 'Uncategorized';
      map[key] = (map[key] || 0) + 1;
    });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [materials, categories]);

  const stockValueByCategory = useMemo(() => {
    const map = {};
    materials.forEach(m => {
      const key = categories.find(c => c.id === m.categoryId)?.name || 'Uncategorized';
      map[key] = (map[key] || 0) + ((m.quantity || 0) * (m.unitPrice || 0));
    });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return Object.entries(map)
      .map(([name, value], i) => ({
        name: name.length > 12 ? name.slice(0, 12) + '…' : name,
        fullName: name, value, color: palette[i % palette.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [materials, categories]);

  const stockStatusData = useMemo(() => {
    const low = materials.filter(m => m.quantity <= m.reorderLevel && m.reorderLevel > 0).length;
    const approaching = materials.filter(m => m.quantity > m.reorderLevel && m.quantity <= m.reorderLevel * 1.5).length;
    const good = materials.length - low - approaching;
    return [
      { name: 'Good', value: good, color: '#10b981' },
      { name: 'Approaching', value: approaching, color: '#f59e0b' },
      { name: 'Low Stock', value: low, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [materials]);

  const topValueItems = useMemo(() => (
    [...materials]
      .map(m => ({ ...m, stockValue: (m.quantity || 0) * (m.unitPrice || 0) }))
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 8)
      .map(m => ({
        name: m.name.length > 14 ? m.name.slice(0, 14) + '…' : m.name,
        value: m.stockValue, color: '#10b981'
      }))
  ), [materials]);

  const poStatusData = useMemo(() => {
    const map = {};
    purchaseOrders.forEach(o => { map[o.status || 'draft'] = (map[o.status || 'draft'] || 0) + 1; });
    const palette = {
      draft: '#94a3b8', sent: '#3b82f6', confirmed: '#8b5cf6',
      received: '#10b981', cancelled: '#ef4444'
    };
    return Object.entries(map).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value, color: palette[name] || '#10b981'
    }));
  }, [purchaseOrders]);

  // ============================================
  // KPIs
  // ============================================
  const kpiItems = [
    { id: 'total', icon: Package, label: 'Total Materials',
      value: summary?.totalMaterials || materials.length,
      meta: `${categories.length} categories`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'active', icon: CheckCircle, label: 'Active Items',
      value: summary?.activeMaterials || materials.filter(m => m.status === 'active').length,
      meta: `${materials.filter(m => m.status === 'inactive').length} inactive`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'low', icon: AlertTriangle, label: 'Low Stock',
      value: summary?.lowStockItems || materials.filter(m => m.quantity <= m.reorderLevel && m.reorderLevel > 0).length,
      meta: 'Need reordering',
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: (summary?.lowStockItems || 0) > 0 ? 'down' : 'flat' },
    { id: 'value', icon: DollarSign, label: 'Stock Value',
      value: Utils.formatCurrencyShort(summary?.totalStockValue ||
        materials.reduce((s, m) => s + (m.quantity || 0) * (m.unitPrice || 0), 0)),
      meta: `${suppliers.length} suppliers`,
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'up' }
  ];

  const cardDetails = {
    total: { title: 'Total Materials', details: [
      { label: 'Total', value: materials.length },
      { label: 'Categories', value: categories.length },
      { label: 'Active', value: materials.filter(m => m.status === 'active').length },
      { label: 'Suppliers', value: suppliers.length }
    ]},
    active: { title: 'Active Items', details: [
      { label: 'Active', value: materials.filter(m => m.status === 'active').length },
      { label: 'Inactive', value: materials.filter(m => m.status === 'inactive').length },
      { label: 'Discontinued', value: materials.filter(m => m.status === 'discontinued').length },
      { label: 'Total', value: materials.length }
    ]},
    low: { title: 'Low Stock', details: [
      { label: 'Low Stock', value: materials.filter(m => m.quantity <= m.reorderLevel && m.reorderLevel > 0).length },
      { label: 'Approaching', value: materials.filter(m => m.quantity > m.reorderLevel && m.quantity <= m.reorderLevel * 1.5).length },
      { label: 'Good', value: materials.filter(m => m.quantity > m.reorderLevel * 1.5).length },
      { label: 'Total', value: materials.length }
    ]},
    value: { title: 'Stock Value', details: [
      { label: 'Total', value: Utils.formatCurrency(materials.reduce((s, m) => s + (m.quantity || 0) * (m.unitPrice || 0), 0)) },
      { label: 'Avg', value: materials.length ? Utils.formatCurrency(materials.reduce((s, m) => s + (m.quantity || 0) * (m.unitPrice || 0), 0) / materials.length) : '0' },
      { label: 'Highest', value: Utils.formatCurrency(Math.max(...materials.map(m => (m.quantity || 0) * (m.unitPrice || 0)), 0)) },
      { label: 'Items', value: materials.length }
    ]}
  };

  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const handleCardHover = (id, e) => { setHoveredCard(id); setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 }); };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // AUTOMATION WIDGETS
  // ============================================
  const renderAutomationWidgets = () => {
    const lowStockCount = materials.filter(m => m.quantity <= m.reorderLevel && m.reorderLevel > 0).length;
    const costCount = optimizationResults?.length || 0;
    if (lowStockCount === 0 && costCount === 0 && !autoReorderResults) return null;
    return (
      <div className="inv-automation-grid">
        {lowStockCount > 0 && (
          <div className="inv-automation-card alert">
            <div className="inv-automation-icon"><Bell size={20} /></div>
            <div className="inv-automation-content">
              <span className="inv-automation-title">Low Stock Alert</span>
              <span className="inv-automation-desc">{lowStockCount} items need reordering</span>
            </div>
            <button className="inv-btn inv-btn-primary" onClick={handleAutoReorder}>
              <Zap size={13} /> Auto-Reorder
            </button>
          </div>
        )}
        {costCount > 0 && (
          <div className="inv-automation-card success">
            <div className="inv-automation-icon"><TrendingUp size={20} /></div>
            <div className="inv-automation-content">
              <span className="inv-automation-title">Cost Savings Found</span>
              <span className="inv-automation-desc">{costCount} optimization opportunities</span>
            </div>
            <button className="inv-btn inv-btn-secondary" onClick={() => setShowCostOptimizer(true)}>
              <Gauge size={13} /> View
            </button>
          </div>
        )}
        {autoReorderResults && (
          <div className="inv-automation-card info">
            <div className="inv-automation-icon"><ShoppingCart size={20} /></div>
            <div className="inv-automation-content">
              <span className="inv-automation-title">Auto-Reorder Ready</span>
              <span className="inv-automation-desc">
                {autoReorderResults.totalItems} items · {Utils.formatCurrency(autoReorderResults.estimatedCost)}
              </span>
            </div>
            <button className="inv-btn inv-btn-ghost" onClick={() => setAutoReorderResults(null)}>
              <X size={13} /> Dismiss
            </button>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="inv-view">
      <div className="inv-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="inv-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="inv-kpi-accent" style={{ background: item.accent }} />
              <div className="inv-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="inv-kpi-content">
                <span className="inv-kpi-label">{item.label}</span>
                <span className="inv-kpi-value">{item.value}</span>
                <span className="inv-kpi-meta">{item.meta}</span>
              </div>
              <div className={`inv-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <TrendingDown size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="inv-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="inv-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="inv-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="inv-tooltip-row">
                <span className="inv-tooltip-label">{d.label}</span>
                <span className="inv-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {renderAutomationWidgets()}

      <div className="inv-grid-1-1">
        <div className="inv-card">
          <div className="inv-card-header">
            <div className="inv-card-title">
              <span className="inv-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <PackageCheck size={16} />
              </span>
              <div>
                <h4>Stock Health</h4>
                <span>Material status overview</span>
              </div>
            </div>
          </div>
          {stockStatusData.length > 0 ? (
            <div className="inv-donut-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stockStatusData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                    {stockStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="inv-donut-legend">
                {stockStatusData.map((d, i) => (
                  <div key={i} className="inv-donut-item">
                    <span className="inv-donut-dot" style={{ background: d.color }} />
                    <span className="inv-donut-name">{d.name}</span>
                    <span className="inv-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="inv-empty-mini">No materials yet</div>}
        </div>

        <div className="inv-card">
          <div className="inv-card-header">
            <div className="inv-card-title">
              <span className="inv-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Items by Category</h4>
                <span>{categories.length} categories</span>
              </div>
            </div>
          </div>
          {categoryChartData.length > 0 ? (
            <div className="inv-donut-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                    {categoryChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="inv-donut-legend">
                {categoryChartData.map((d, i) => (
                  <div key={i} className="inv-donut-item">
                    <span className="inv-donut-dot" style={{ background: d.color }} />
                    <span className="inv-donut-name">{d.name}</span>
                    <span className="inv-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="inv-empty-mini">No data</div>}
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-card-header">
          <div className="inv-card-title">
            <span className="inv-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <BarChart3 size={16} />
            </span>
            <div>
              <h4>Stock Value by Category</h4>
              <span>Quantity × Unit Price</span>
            </div>
          </div>
        </div>
        {stockValueByCategory.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stockValueByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                {stockValueByCategory.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="inv-empty-mini">No data</div>}
      </div>

      {topValueItems.length > 0 && (
        <div className="inv-card">
          <div className="inv-card-header">
            <div className="inv-card-title">
              <span className="inv-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <Crown size={16} />
              </span>
              <div>
                <h4>Top Value Items</h4>
                <span>Highest stock value</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topValueItems} layout="vertical" margin={{ left: 10, right: 20 }}>
              <defs>
                <linearGradient id="invTopGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
                tickLine={false} axisLine={false} width={110} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Value" fill="url(#invTopGrad)" radius={[0, 8, 8, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {poStatusData.length > 0 && (
        <div className="inv-card">
          <div className="inv-card-header">
            <div className="inv-card-title">
              <span className="inv-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <ClipboardList size={16} />
              </span>
              <div>
                <h4>Purchase Orders by Status</h4>
                <span>{purchaseOrders.length} total orders</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={poStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Orders" radius={[8, 8, 0, 0]} barSize={44}>
                {poStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  // ============================================
  // MATERIALS TAB
  // ============================================
  const renderMaterialsTab = () => {
    const { total, page, items } = paginate(filteredMaterials, matPage, matPer);
    if (page !== matPage) setMatPage(page);
    return (
      <div className="inv-view">
        <div className="inv-filters">
          <div className="inv-search">
            <Search size={15} className="inv-search-icon" />
            <input type="text" placeholder="Search materials by name or SKU..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="inv-search-clear" onClick={() => setSearchTerm('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <div className="inv-filter-group">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="inv-select">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="inv-select">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
            <label className="inv-checkbox">
              <input type="checkbox" checked={lowStockFilter}
                onChange={(e) => setLowStockFilter(e.target.checked)} />
              Low Stock Only
            </label>
          </div>
          <span className="inv-result-count">
            {filteredMaterials.length} of {materials.length}
          </span>
          <button className="inv-btn inv-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Add Material
          </button>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="inv-empty">
            <div className="inv-empty-icon"><Package size={40} /></div>
            <h3>No Materials Found</h3>
            <p>Add your first material to start tracking inventory.</p>
          </div>
        ) : (
          <>
            <div className="inv-materials-grid">
              {items.map((m, index) => {
                const stockStatus = getStockStatus(m);
                const StockIcon = stockStatus.icon;
                const isExpanded = expandedItems[m.id];
                const supplier = suppliers.find(s => s.id === m.supplierId);
                const cat = categories.find(c => c.id === m.categoryId);
                return (
                  <div key={m.id} className="inv-material-card" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
                    <div className="inv-material-accent" style={{
                      background: m.needsReorder
                        ? 'linear-gradient(90deg,#ef4444,#f87171)'
                        : stockStatus.color === '#f59e0b'
                        ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                        : 'linear-gradient(90deg,#10b981,#34d399)'
                    }} />
                    <div className="inv-material-header">
                      <div className="inv-material-info">
                        <div className="inv-material-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                          <Package size={18} />
                        </div>
                        <div className="inv-material-title">
                          <div className="inv-material-name">{m.name}</div>
                          <div className="inv-material-sku">{m.sku || 'No SKU'}</div>
                        </div>
                      </div>
                      <div className="inv-material-badges">
                        {getStatusBadge(m.status)}
                        <span className="inv-stock-badge" style={{
                          background: `${stockStatus.color}1f`, color: stockStatus.color
                        }}>
                          <StockIcon size={10} /> {stockStatus.label}
                        </span>
                      </div>
                    </div>

                    <div className="inv-material-body">
                      <div className="inv-material-details">
                        <div className="inv-detail-item">
                          <span className="inv-detail-label">Category</span>
                          <span className="inv-detail-value">{cat?.name || '—'}</span>
                        </div>
                        <div className="inv-detail-item">
                          <span className="inv-detail-label">Unit</span>
                          <span className="inv-detail-value">{m.unit || '—'}</span>
                        </div>
                        <div className="inv-detail-item">
                          <span className="inv-detail-label">Price</span>
                          <span className="inv-detail-value inv-td-green">
                            {Utils.formatCurrencyShort(m.unitPrice)}
                          </span>
                        </div>
                        <div className="inv-detail-item">
                          <span className="inv-detail-label">Qty</span>
                          <span className={`inv-detail-value ${m.quantity <= m.reorderLevel ? 'inv-td-red' : ''}`}>
                            {m.quantity || 0}
                          </span>
                        </div>
                      </div>

                      <div className="inv-stock-bar">
                        <div className="inv-stock-track">
                          <div className="inv-stock-fill"
                            style={{
                              width: `${Math.min((m.quantity / (m.maxQuantity || 100)) * 100, 100)}%`,
                              background: m.quantity <= m.reorderLevel ? '#ef4444' : '#10b981'
                            }} />
                        </div>
                        <div className="inv-stock-labels">
                          <span>0</span>
                          <span>Reorder: {m.reorderLevel || 0}</span>
                          <span>{m.maxQuantity || 'Max'}</span>
                        </div>
                      </div>

                      {m.location && (
                        <div className="inv-material-meta">
                          <MapPin size={11} /> {m.location} {m.warehouse ? `(${m.warehouse})` : ''}
                        </div>
                      )}
                      {supplier && (
                        <div className="inv-material-meta">
                          <Truck size={11} /> {supplier.name}
                        </div>
                      )}
                    </div>

                    <div className="inv-material-footer">
                      <div className="inv-material-actions">
                        <button className="inv-icon-btn" title="View"
                          onClick={() => { setSelectedItem(m); setShowDetailModal(true); }}>
                          <Eye size={13} />
                        </button>
                        <button className="inv-icon-btn inv-icon-edit" title="Edit"
                          onClick={() => handleEdit(m)}>
                          <Edit size={13} />
                        </button>
                        <button className="inv-icon-btn inv-icon-adjust" title="Adjust Stock"
                          onClick={() => { setSelectedItem(m); resetStockForm(); setShowAdjustStock(true); }}>
                          <RefreshCw size={13} />
                        </button>
                        <button className="inv-icon-btn inv-icon-danger" title="Delete"
                          onClick={() => handleDelete(m.id)}>
                          <Trash2 size={13} />
                        </button>
                        <button className="inv-icon-btn inv-icon-expand"
                          onClick={() => toggleExpand(m.id)}>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="inv-material-expanded">
                        <div className="inv-expanded-grid">
                          <div><strong>Description:</strong> {m.description || '—'}</div>
                          <div><strong>Min Qty:</strong> {m.minQuantity || 0}</div>
                          <div><strong>Max Qty:</strong> {m.maxQuantity || '—'}</div>
                          <div><strong>Stock Value:</strong> {Utils.formatCurrency((m.quantity || 0) * (m.unitPrice || 0))}</div>
                          <div><strong>Location:</strong> {m.location || '—'}</div>
                          <div><strong>Warehouse:</strong> {m.warehouse || '—'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {renderPagination(matPage, total, matPer, setMatPer, setMatPage, filteredMaterials.length, 'items')}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // SUPPLIERS TAB
  // ============================================
  const renderSuppliersTab = () => {
    const { total, page, items } = paginate(suppliers, supPage, supPer);
    if (page !== supPage) setSupPage(page);
    return (
      <div className="inv-view">
        <div className="inv-filters">
          <span className="inv-result-count" style={{ marginLeft: 0 }}>
            {suppliers.length} suppliers
          </span>
          <button className="inv-btn inv-btn-primary" style={{ marginLeft: 'auto' }}
            onClick={() => { resetSupplierForm(); setShowSupplierForm(true); }}>
            <Plus size={14} /> Add Supplier
          </button>
        </div>

        {suppliers.length === 0 ? (
          <div className="inv-empty">
            <div className="inv-empty-icon"><Truck size={40} /></div>
            <h3>No Suppliers</h3>
            <p>Add suppliers to manage your supply chain.</p>
          </div>
        ) : (
          <>
            <div className="inv-suppliers-grid">
              {items.map((s, index) => (
                <div key={s.id} className="inv-supplier-card" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
                  <div className="inv-supplier-header">
                    <div className="inv-supplier-info">
                      <div className="inv-supplier-icon">
                        <Truck size={18} />
                      </div>
                      <div>
                        <div className="inv-supplier-name">{s.name}</div>
                        <div className="inv-supplier-contact">{s.contactPerson || 'No contact'}</div>
                      </div>
                    </div>
                    <div className="inv-supplier-rating">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={13} fill={i < (s.rating || 3) ? '#f59e0b' : 'none'} stroke="#f59e0b" />
                      ))}
                    </div>
                  </div>
                  <div className="inv-supplier-body">
                    {s.email && <div className="inv-supplier-row"><Mail size={12} /><span>{s.email}</span></div>}
                    {s.phone && <div className="inv-supplier-row"><Phone size={12} /><span>{s.phone}</span></div>}
                    {s.paymentTerms && <div className="inv-supplier-row"><Clock size={12} /><span>{s.paymentTerms}</span></div>}
                    {s.crNumber && <div className="inv-supplier-row"><Landmark size={12} /><span>CR: {s.crNumber}</span></div>}
                  </div>
                  <div className="inv-supplier-footer">
                    <div className="inv-material-actions">
                      <button className="inv-icon-btn inv-icon-edit" onClick={() => {
                        setEditingId(s.id);
                        setSupplierForm({
                          name: s.name || '', contactPerson: s.contactPerson || '',
                          email: s.email || '', phone: s.phone || '', mobile: s.mobile || '',
                          address: s.address || '', city: s.city || '', country: s.country || '',
                          crNumber: s.crNumber || '', vatNumber: s.vatNumber || '',
                          paymentTerms: s.paymentTerms || '', rating: s.rating || 3, notes: s.notes || ''
                        });
                        setShowSupplierForm(true);
                      }}>
                        <Edit size={13} />
                      </button>
                      <button className="inv-icon-btn inv-icon-danger" onClick={() => {
                        if (window.confirm('Delete this supplier?')) { /* delete logic */ }
                      }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {renderPagination(supPage, total, supPer, setSupPer, setSupPage, suppliers.length, 'suppliers')}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // ORDERS TAB
  // ============================================
  const renderOrdersTab = () => {
    const { total, page, items } = paginate(purchaseOrders, ordPage, ordPer);
    if (page !== ordPage) setOrdPage(page);
    return (
      <div className="inv-view">
        <div className="inv-filters">
          <span className="inv-result-count" style={{ marginLeft: 0 }}>
            {purchaseOrders.length} orders
          </span>
          <button className="inv-btn inv-btn-primary" style={{ marginLeft: 'auto' }}
            onClick={() => { resetPoForm(); setShowPurchaseForm(true); }}>
            <Plus size={14} /> New PO
          </button>
        </div>

        {purchaseOrders.length === 0 ? (
          <div className="inv-empty">
            <div className="inv-empty-icon"><ShoppingCart size={40} /></div>
            <h3>No Purchase Orders</h3>
            <p>Create purchase orders to manage procurement.</p>
          </div>
        ) : (
          <>
            <div className="inv-orders-grid">
              {items.map((o, index) => (
                <div key={o.id} className="inv-order-card" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
                  <div className="inv-order-header">
                    <div>
                      <div className="inv-order-number">{o.poNumber}</div>
                      <div className="inv-order-supplier">{o.supplierName}</div>
                      <div className="inv-order-date"><Calendar size={11} /> {Utils.formatDate(o.orderDate)}</div>
                    </div>
                    <div className="inv-order-badges">
                      {getStatusBadge(o.status)}
                      <div className="inv-order-total">{Utils.formatCurrency(o.totalAmount)}</div>
                    </div>
                  </div>
                  <div className="inv-order-body">
                    {o.items?.slice(0, 3).map((item, i) => (
                      <div key={i} className="inv-order-item">
                        <span>{item.materialName}</span>
                        <span>{item.quantity} {item.unit || ''} × {Utils.formatCurrencyShort(item.unitPrice)}</span>
                      </div>
                    ))}
                    {o.items?.length > 3 && <div className="inv-order-more">+{o.items.length - 3} more</div>}
                  </div>
                  <div className="inv-order-footer">
                    <button className="inv-icon-btn" onClick={() => { setSelectedItem(o); setShowDetailModal(true); }}>
                      <Eye size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {renderPagination(ordPage, total, ordPer, setOrdPer, setOrdPage, purchaseOrders.length, 'orders')}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // MOVEMENTS TAB
  // ============================================
  const renderMovementsTab = () => {
    const { total, page, items } = paginate(stockMovements, movPage, movPer);
    if (page !== movPage) setMovPage(page);
    return (
      <div className="inv-view">
        <div className="inv-card">
          <div className="inv-card-header">
            <div className="inv-card-title">
              <span className="inv-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <RefreshCw size={16} />
              </span>
              <div>
                <h4>Stock Movements</h4>
                <span>{stockMovements.length} records</span>
              </div>
            </div>
            <button className="inv-btn inv-btn-ghost" onClick={() => loadData({ showLoader: true })}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {stockMovements.length === 0 ? (
            <div className="inv-empty-mini">No stock movements recorded</div>
          ) : (
            <>
              <div className="inv-table-wrap">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Type</th>
                      <th className="right">Quantity</th>
                      <th className="right">Previous</th>
                      <th className="right">New</th>
                      <th>Date</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m, i) => (
                      <tr key={m.id} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                        <td><strong>{m.materialName}</strong></td>
                        <td><span className={`inv-movement-type ${m.movementType}`}>{m.movementType}</span></td>
                        <td className={`right ${m.quantity > 0 ? 'inv-td-green' : 'inv-td-red'}`}>
                          {m.quantity > 0 ? '+' : ''}{m.quantity}
                        </td>
                        <td className="right">{m.previousQuantity}</td>
                        <td className="right"><strong>{m.newQuantity}</strong></td>
                        <td>{Utils.formatDate(m.createdAt)}</td>
                        <td>{m.createdBy || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination(movPage, total, movPer, setMovPer, setMovPage, stockMovements.length, 'records')}
            </>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // MATERIAL FORM MODAL — with Units from Units table
  // ============================================
  const renderMaterialFormModal = () => (
    <ModalPortal>
      <div className="inv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="inv-modal" onClick={e => e.stopPropagation()}>
          <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="inv-modal-header-left">
              <div className="inv-modal-icon">
                {editingId ? <Edit size={18} /> : <Package size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit Material' : 'New Material'}</h3>
                <p className="inv-modal-sub">{editingId ? 'Update material details' : 'Add a new material'}</p>
              </div>
            </div>
            <button className="inv-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="inv-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Name <span className="inv-required">*</span></label>
                  <input type="text" value={formData.name} required autoFocus
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Material name" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>Category</label>
                  <select value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="inv-form-select">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Unit <span className="inv-required">*</span></label>
                  <select value={formData.unit} required
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="inv-form-select">
                    <option value="">Select Unit</option>
                    {availableUnitNames.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <span className="inv-form-hint" style={{ fontSize: 11, color: '#94a3b8' }}>
                    <Info size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                    Manage units in Setup → Units
                  </span>
                </div>
                <div className="inv-form-group">
                  <label>Unit Price (BD)</label>
                  <input type="number" step="0.001" value={formData.unitPrice}
                    onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="0.000" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Quantity</label>
                  <input type="number" step="0.01" value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>Reorder Level</label>
                  <input type="number" step="0.01" value={formData.reorderLevel}
                    onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })}
                    placeholder="0" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Min Quantity</label>
                  <input type="number" step="0.01" value={formData.minQuantity}
                    onChange={e => setFormData({ ...formData, minQuantity: e.target.value })}
                    placeholder="0" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>Max Quantity</label>
                  <input type="number" step="0.01" value={formData.maxQuantity}
                    onChange={e => setFormData({ ...formData, maxQuantity: e.target.value })}
                    placeholder="0" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Location</label>
                  <input type="text" value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Aisle 1" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>Warehouse</label>
                  <input type="text" value={formData.warehouse}
                    onChange={e => setFormData({ ...formData, warehouse: e.target.value })}
                    placeholder="e.g. Main" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Supplier</label>
                  <select value={formData.supplierId}
                    onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                    className="inv-form-select">
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="inv-form-group">
                  <label>Status</label>
                  <select value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="inv-form-select">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              <div className="inv-form-group">
                <label>Description</label>
                <textarea value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional notes" rows="2" className="inv-form-textarea" />
              </div>

              <div className="inv-form-actions">
                <button type="submit" className="inv-btn inv-btn-primary" disabled={loading}>
                  {loading ? <Loader2 size={14} className="inv-spin" /> : <Save size={14} />}
                  {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="inv-btn inv-btn-secondary"
                  onClick={() => { setShowForm(false); resetForm(); }}>
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
  // SUPPLIER FORM MODAL
  // ============================================
  const renderSupplierFormModal = () => (
    <ModalPortal>
      <div className="inv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowSupplierForm(false); resetSupplierForm(); } }}>
        <div className="inv-modal" onClick={e => e.stopPropagation()}>
          <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <div className="inv-modal-header-left">
              <div className="inv-modal-icon">
                {editingId ? <Edit size={18} /> : <Truck size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit Supplier' : 'New Supplier'}</h3>
                <p className="inv-modal-sub">{editingId ? 'Update supplier details' : 'Add a new supplier'}</p>
              </div>
            </div>
            <button className="inv-modal-close" onClick={() => { setShowSupplierForm(false); resetSupplierForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="inv-modal-body">
            <form onSubmit={handleSupplierSubmit}>
              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Company Name <span className="inv-required">*</span></label>
                  <input type="text" value={supplierForm.name} required
                    onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="Company name" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>Contact Person</label>
                  <input type="text" value={supplierForm.contactPerson}
                    onChange={e => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    placeholder="Contact name" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Email</label>
                  <input type="email" value={supplierForm.email}
                    onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="email@company.com" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>Phone</label>
                  <input type="text" value={supplierForm.phone}
                    onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="Phone" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Address</label>
                  <input type="text" value={supplierForm.address}
                    onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    placeholder="Street address" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>City</label>
                  <input type="text" value={supplierForm.city}
                    onChange={e => setSupplierForm({ ...supplierForm, city: e.target.value })}
                    placeholder="City" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>CR Number</label>
                  <input type="text" value={supplierForm.crNumber}
                    onChange={e => setSupplierForm({ ...supplierForm, crNumber: e.target.value })}
                    placeholder="Commercial Registration" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>VAT Number</label>
                  <input type="text" value={supplierForm.vatNumber}
                    onChange={e => setSupplierForm({ ...supplierForm, vatNumber: e.target.value })}
                    placeholder="VAT Registration" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Payment Terms</label>
                  <select value={supplierForm.paymentTerms}
                    onChange={e => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                    className="inv-form-select">
                    <option value="">Select Payment Terms</option>
                    <option value="net30">Net 30</option>
                    <option value="net60">Net 60</option>
                    <option value="cash">Cash</option>
                    <option value="advance">Advance</option>
                  </select>
                </div>
                <div className="inv-form-group">
                  <label>Rating</label>
                  <select value={supplierForm.rating}
                    onChange={e => setSupplierForm({ ...supplierForm, rating: parseInt(e.target.value) })}
                    className="inv-form-select">
                    <option value="1">1 Star</option>
                    <option value="2">2 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="5">5 Stars</option>
                  </select>
                </div>
              </div>

              <div className="inv-form-group">
                <label>Notes</label>
                <textarea value={supplierForm.notes}
                  onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  placeholder="Additional notes" rows="2" className="inv-form-textarea" />
              </div>

              <div className="inv-form-actions">
                <button type="submit" className="inv-btn inv-btn-primary" disabled={loading}>
                  {loading ? <Loader2 size={14} className="inv-spin" /> : <Save size={14} />}
                  {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="inv-btn inv-btn-secondary"
                  onClick={() => { setShowSupplierForm(false); resetSupplierForm(); }}>
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
  // PURCHASE ORDER FORM MODAL — ⭐ AUTO-FILL UNIT + PRICE
  // ============================================
  const renderPurchaseFormModal = () => (
    <ModalPortal>
      <div className="inv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowPurchaseForm(false); resetPoForm(); } }}>
        <div className="inv-modal inv-modal-lg" onClick={e => e.stopPropagation()}>
          <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="inv-modal-header-left">
              <div className="inv-modal-icon"><ShoppingCart size={18} /></div>
              <div>
                <h3>New Purchase Order</h3>
                <p className="inv-modal-sub">Create a PO for a supplier</p>
              </div>
            </div>
            <button className="inv-modal-close" onClick={() => { setShowPurchaseForm(false); resetPoForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="inv-modal-body">
            <form onSubmit={handlePOSubmit}>
              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Supplier <span className="inv-required">*</span></label>
                  <select value={poForm.supplierId} required
                    onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })}
                    className="inv-form-select">
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="inv-form-group">
                  <label>Order Date <span className="inv-required">*</span></label>
                  <input type="date" value={poForm.orderDate} required
                    onChange={e => setPoForm({ ...poForm, orderDate: e.target.value })}
                    className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Expected Delivery</label>
                  <input type="date" value={poForm.expectedDelivery}
                    onChange={e => setPoForm({ ...poForm, expectedDelivery: e.target.value })}
                    className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>VAT Rate (%)</label>
                  <input type="number" step="0.1" value={poForm.vatRate}
                    onChange={e => setPoForm({ ...poForm, vatRate: parseFloat(e.target.value) || 0 })}
                    placeholder="0" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-group">
                <label>Notes</label>
                <input type="text" value={poForm.notes}
                  onChange={e => setPoForm({ ...poForm, notes: e.target.value })}
                  placeholder="Additional notes" className="inv-form-input" />
              </div>

              <div className="inv-po-section">
                <h4 className="inv-po-title">Order Items</h4>

                {/* ⭐ PO ITEM FORM: Material → Unit → Qty → Price → Add */}
                <div className="inv-po-item-form">
                  <select
                    value={poItemForm.materialId}
                    onChange={e => handlePOItemMaterialSelect(e.target.value)}
                    className="inv-form-select"
                  >
                    <option value="">Select Material</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}{m.sku ? ` · ${m.sku}` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Auto-filled Unit (read-only) */}
                  <input
                    type="text"
                    value={poItemForm.materialUnit || ''}
                    readOnly
                    placeholder="Unit"
                    className="inv-form-input"
                    style={{ background: 'rgba(148,163,184,0.08)', cursor: 'not-allowed' }}
                    title="Auto-filled from material"
                  />

                  <input
                    type="number"
                    step="0.01"
                    value={poItemForm.quantity}
                    onChange={e => setPoItemForm({ ...poItemForm, quantity: e.target.value })}
                    placeholder="Qty"
                    className="inv-form-input"
                  />

                  <input
                    type="number"
                    step="0.001"
                    value={poItemForm.unitPrice}
                    onChange={e => setPoItemForm({ ...poItemForm, unitPrice: e.target.value })}
                    placeholder="Price"
                    className="inv-form-input"
                    title="Auto-filled from material — edit to override"
                  />

                  <button
                    type="button"
                    className="inv-btn inv-btn-primary"
                    onClick={handleAddPOItem}
                    disabled={!poItemForm.materialId || !poItemForm.quantity}
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>

                {poItemForm.materialId && (
                  <div className="inv-po-item-hint">
                    <Info size={11} />
                    <span>Unit &amp; price auto-filled from the material — you can change the price.</span>
                  </div>
                )}

                <div className="inv-po-items">
                  {poForm.items.length === 0 ? (
                    <div className="inv-empty-mini">No items added yet</div>
                  ) : poForm.items.map((item, i) => (
                    <div key={i} className="inv-po-item">
                      <span className="inv-po-name">
                        {item.materialName}
                        {item.materialSku ? <small> · {item.materialSku}</small> : null}
                      </span>
                      <span className="inv-po-details">
                        {item.quantity} {item.unit || ''} × {Utils.formatCurrencyShort(item.unitPrice)}
                      </span>
                      <span className="inv-po-total">{Utils.formatCurrency(item.total)}</span>
                      <button className="inv-icon-btn inv-icon-danger" onClick={() => handleRemovePOItem(i)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {poForm.items.length > 0 && (
                  <div className="inv-po-summary">
                    <div className="inv-po-summary-row">
                      <span>Subtotal:</span>
                      <span>{Utils.formatCurrency(poForm.items.reduce((s, i) => s + i.total, 0))}</span>
                    </div>
                    <div className="inv-po-summary-row">
                      <span>VAT ({poForm.vatRate}%):</span>
                      <span>{Utils.formatCurrency(poForm.items.reduce((s, i) => s + i.total, 0) * (poForm.vatRate / 100))}</span>
                    </div>
                    <div className="inv-po-summary-row total">
                      <span>Total:</span>
                      <strong>{Utils.formatCurrency(poForm.items.reduce((s, i) => s + i.total, 0) * (1 + poForm.vatRate / 100))}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="inv-form-actions">
                <button type="submit" className="inv-btn inv-btn-primary"
                  disabled={loading || poForm.items.length === 0}>
                  {loading ? <Loader2 size={14} className="inv-spin" /> : <Save size={14} />}
                  {loading ? 'Creating...' : 'Create PO'}
                </button>
                <button type="button" className="inv-btn inv-btn-secondary"
                  onClick={() => { setShowPurchaseForm(false); resetPoForm(); }}>
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
  // STOCK ADJUST MODAL
  // ============================================
  const renderStockAdjustModal = () => {
    if (!selectedItem) return null;
    return (
      <ModalPortal>
        <div className="inv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowAdjustStock(false); resetStockForm(); } }}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
              <div className="inv-modal-header-left">
                <div className="inv-modal-icon"><RefreshCw size={18} /></div>
                <div>
                  <h3>Adjust Stock</h3>
                  <p className="inv-modal-sub">{selectedItem.name}</p>
                </div>
              </div>
              <button className="inv-modal-close" onClick={() => { setShowAdjustStock(false); resetStockForm(); }}>
                <X size={18} />
              </button>
            </div>
            <div className="inv-modal-body">
              <form onSubmit={handleAdjustStock}>
                <div className="inv-form-group">
                  <label>Current Quantity</label>
                  <input type="text" value={`${selectedItem.quantity} ${selectedItem.unit || ''}`}
                    disabled className="inv-form-input" />
                </div>

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Quantity Change <span className="inv-required">*</span></label>
                    <input type="number" step="0.01" value={stockForm.quantity} required
                      onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })}
                      placeholder="+/- quantity" className="inv-form-input" />
                    <span className="inv-form-hint">Positive for addition, negative for removal</span>
                  </div>
                  <div className="inv-form-group">
                    <label>Movement Type</label>
                    <select value={stockForm.movementType}
                      onChange={e => setStockForm({ ...stockForm, movementType: e.target.value })}
                      className="inv-form-select">
                      <option value="adjustment">Adjustment</option>
                      <option value="purchase">Purchase</option>
                      <option value="sale">Sale</option>
                      <option value="wastage">Wastage</option>
                      <option value="return">Return</option>
                    </select>
                  </div>
                </div>

                <div className="inv-form-group">
                  <label>Notes</label>
                  <input type="text" value={stockForm.notes}
                    onChange={e => setStockForm({ ...stockForm, notes: e.target.value })}
                    placeholder="Reason" className="inv-form-input" />
                </div>

                <div className="inv-form-actions">
                  <button type="submit" className="inv-btn inv-btn-primary" disabled={loading}>
                    {loading ? <Loader2 size={14} className="inv-spin" /> : <Save size={14} />}
                    {loading ? 'Adjusting...' : 'Adjust Stock'}
                  </button>
                  <button type="button" className="inv-btn inv-btn-secondary"
                    onClick={() => { setShowAdjustStock(false); resetStockForm(); }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  // ============================================
  // DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedItem) return null;
    return (
      <ModalPortal>
        <div className="inv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDetailModal(false); }}>
          <div className="inv-modal inv-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #0b1a12, #1f3a2c)' }}>
              <div className="inv-modal-header-left">
                <div className="inv-modal-icon"><Package size={18} /></div>
                <div>
                  <h3>{selectedItem.poNumber ? `PO ${selectedItem.poNumber}` : selectedItem.name}</h3>
                  <p className="inv-modal-sub">{selectedItem.poNumber ? selectedItem.supplierName : 'Material details'}</p>
                </div>
              </div>
              <button className="inv-modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="inv-modal-body">
              {selectedItem.poNumber ? (
                <div className="inv-detail-grid">
                  <div className="inv-detail-section">
                    <h4>Order Info</h4>
                    <div className="inv-detail-row"><span>Supplier:</span><strong>{selectedItem.supplierName}</strong></div>
                    <div className="inv-detail-row"><span>Order Date:</span><strong>{Utils.formatDate(selectedItem.orderDate)}</strong></div>
                    <div className="inv-detail-row"><span>Status:</span>{getStatusBadge(selectedItem.status)}</div>
                    <div className="inv-detail-row"><span>Total:</span><strong className="inv-td-green">{Utils.formatCurrency(selectedItem.totalAmount)}</strong></div>
                  </div>
                  <div className="inv-detail-section full-width">
                    <h4>Items</h4>
                    {selectedItem.items?.map((item, i) => (
                      <div key={i} className="inv-detail-row">
                        <span>{item.materialName}</span>
                        <strong>{item.quantity} {item.unit || ''} × {Utils.formatCurrencyShort(item.unitPrice)} = {Utils.formatCurrency(item.total)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="inv-detail-grid">
                  <div className="inv-detail-section">
                    <h4>Basic Information</h4>
                    <div className="inv-detail-row"><span>Name:</span><strong>{selectedItem.name}</strong></div>
                    <div className="inv-detail-row"><span>SKU:</span><strong>{selectedItem.sku || 'N/A'}</strong></div>
                    <div className="inv-detail-row"><span>Category:</span><strong>{categories.find(c => c.id === selectedItem.categoryId)?.name || 'N/A'}</strong></div>
                    <div className="inv-detail-row"><span>Status:</span>{getStatusBadge(selectedItem.status)}</div>
                  </div>
                  <div className="inv-detail-section">
                    <h4>Stock Info</h4>
                    <div className="inv-detail-row"><span>Quantity:</span><strong>{selectedItem.quantity}</strong></div>
                    <div className="inv-detail-row"><span>Unit:</span><strong>{selectedItem.unit}</strong></div>
                    <div className="inv-detail-row"><span>Unit Price:</span><strong>{Utils.formatCurrency(selectedItem.unitPrice)}</strong></div>
                    <div className="inv-detail-row"><span>Stock Value:</span><strong className="inv-td-green">{Utils.formatCurrency((selectedItem.quantity || 0) * (selectedItem.unitPrice || 0))}</strong></div>
                  </div>
                  <div className="inv-detail-section full-width">
                    <h4>Additional Information</h4>
                    <div className="inv-detail-row"><span>Location:</span><strong>{selectedItem.location || 'N/A'}</strong></div>
                    <div className="inv-detail-row"><span>Warehouse:</span><strong>{selectedItem.warehouse || 'N/A'}</strong></div>
                    <div className="inv-detail-row"><span>Supplier:</span><strong>{suppliers.find(s => s.id === selectedItem.supplierId)?.name || 'N/A'}</strong></div>
                    <div className="inv-detail-row"><span>Description:</span><strong>{selectedItem.description || 'N/A'}</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  // ============================================
  // COST OPTIMIZER MODAL
  // ============================================
  const renderCostOptimizer = () => {
    if (!showCostOptimizer || !optimizationResults) return null;
    return (
      <ModalPortal>
        <div className="inv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCostOptimizer(false); }}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <div className="inv-modal-header-left">
                <div className="inv-modal-icon"><TrendingUp size={18} /></div>
                <div>
                  <h3>Cost Optimization Opportunities</h3>
                  <p className="inv-modal-sub">{optimizationResults.length} potential savings</p>
                </div>
              </div>
              <button className="inv-modal-close" onClick={() => setShowCostOptimizer(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="inv-modal-body">
              {optimizationResults.map((opt, i) => (
                <div key={i} className="inv-optimization-item">
                  <div className="inv-opt-category">{opt.category}</div>
                  <div className="inv-opt-details">
                    <span className="inv-opt-current">{opt.item}: {Utils.formatCurrency(opt.currentPrice)}</span>
                    <span className="inv-opt-arrow">→</span>
                    <span className="inv-opt-alt">{opt.alternative}: {Utils.formatCurrency(opt.potentialPrice)}</span>
                  </div>
                  <div className="inv-opt-savings">
                    Save {Utils.formatCurrency(opt.savings)} per unit
                  </div>
                </div>
              ))}
              <div className="inv-form-actions">
                <button className="inv-btn inv-btn-primary" onClick={() => {
                  setSuccess('Cost optimization suggestions applied!');
                  setTimeout(() => setSuccess(''), 3000);
                  setShowCostOptimizer(false);
                }}>
                  <Save size={14} /> Apply Optimizations
                </button>
                <button className="inv-btn inv-btn-secondary" onClick={() => setShowCostOptimizer(false)}>
                  Close
                </button>
              </div>
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
    <div className={`inv-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="inv-ambient">
        <div className="inv-orb inv-orb-1" />
        <div className="inv-orb inv-orb-2" />
        <div className="inv-orb inv-orb-3" />
      </div>

      <div className="inv-header">
        <div className="inv-header-left">
          <div className="inv-header-icon">
            <Package size={22} />
            <span className="inv-header-badge"><Sparkles size={10} /> INVENTORY</span>
          </div>
          <div>
            <h2>Inventory Management</h2>
            <p className="inv-header-subtitle">
              {materials.length} materials · {suppliers.length} suppliers · {purchaseOrders.length} orders
            </p>
          </div>
        </div>
        <div className="inv-header-right">
          <button className="inv-btn inv-btn-ghost" onClick={() => loadData({ showLoader: true })}>
            {loading ? <Loader2 size={14} className="inv-spin" /> : <RefreshCw size={14} />}
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="inv-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'materials', label: 'Materials', icon: Package, badge: materials.length },
          { id: 'suppliers', label: 'Suppliers', icon: Truck, badge: suppliers.length },
          { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart, badge: purchaseOrders.length },
          { id: 'movements', label: 'Stock Movements', icon: RefreshCw }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`inv-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="inv-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {error && <div className="inv-message error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="inv-message success"><CheckCircle size={15} /> {success}</div>}

      {loading && viewMode !== 'overview' && viewMode !== 'materials' ? (
        <div className="inv-loading">
          <div className="inv-loading-spinner" />
          <span>Loading...</span>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && renderOverviewTab()}
          {viewMode === 'materials' && renderMaterialsTab()}
          {viewMode === 'suppliers' && renderSuppliersTab()}
          {viewMode === 'orders' && renderOrdersTab()}
          {viewMode === 'movements' && renderMovementsTab()}
        </>
      )}

      {showForm && renderMaterialFormModal()}
      {showSupplierForm && renderSupplierFormModal()}
      {showPurchaseForm && renderPurchaseFormModal()}
      {showAdjustStock && renderStockAdjustModal()}
      {showDetailModal && renderDetailModal()}
      {renderCostOptimizer()}
    </div>
  );
};

export default InventoryManagement;