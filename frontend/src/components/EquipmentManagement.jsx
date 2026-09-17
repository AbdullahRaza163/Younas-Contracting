// src/components/EquipmentManagement.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Edit, Trash2, Eye, X, Save, RefreshCw, ChevronDown,
  ChevronUp, CheckCircle, AlertCircle, Wrench, Building2, User, Calendar,
  TrendingUp, TrendingDown, Settings, Shield, FileText, MapPin,
  Package, LayoutDashboard, Users, Gauge, Timer, Activity, Award, Clock,
  HardHat, Fuel, Box, Briefcase, Layers, Zap, ArrowRightLeft, Truck, Home,
  History, List as ListIcon, MoreVertical, ExternalLink, CheckSquare, Square,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BarChart3,
  PieChart as PieChartIcon, LineChart as LineChartIcon, Sparkles, Crown,
  ArrowUpRight, ArrowDownRight, Minus, Target, Percent, Banknote,
  Flame
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  LineChart, Line, Legend, ComposedChart
} from 'recharts';
import Utils from '../utils/Utils';
import './EquipmentManagement.css';
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
// CHART TOOLTIP
// ============================================
const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="eq-chart-tooltip">
      {label && <div className="eq-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="eq-chart-tooltip-row">
          <span className="eq-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="eq-chart-tooltip-name">{p.name}</span>
          <span className="eq-chart-tooltip-val">
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
const EquipmentManagement = ({ data, refreshData }) => {
  const [equipment, setEquipment] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [usage, setUsage] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewTab, setViewTab] = useState('overview'); // overview | inventory
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [expandedItems, setExpandedItems] = useState({});
  const [expandedSites, setExpandedSites] = useState({});
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const [formData, setFormData] = useState({
    name: '', categoryId: '', manufacturer: '', model: '', serialNumber: '',
    yearManufactured: '', purchaseDate: '', purchasePrice: '',
    status: 'available', condition: 'good', location: '', siteId: '',
    maintenanceIntervalDays: 30, warrantyExpiry: '', insurancePolicy: '',
    insuranceExpiry: '', notes: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceDate: Utils.today(), maintenanceType: 'routine', description: '',
    cost: '', performedBy: '', vendor: '', hoursSpent: '',
    nextMaintenanceDate: '', partsReplaced: '', status: 'completed', notes: ''
  });

  const [assignmentForm, setAssignmentForm] = useState({
    assignedToType: 'site', siteId: '', workerId: '',
    assignedDate: Utils.today(), expectedReturnDate: '', notes: ''
  });

  const [returnForm, setReturnForm] = useState({
    actualReturnDate: Utils.today(), conditionOnReturn: 'good', notes: ''
  });

  const [bulkAssignForm, setBulkAssignForm] = useState({
    siteId: '', assignedDate: Utils.today(), notes: ''
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // LOAD
  // ============================================
  const loadEquipment = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API_BASE_URL}/equipment`, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('Failed to load equipment');
      const result = await r.json();
      setEquipment(Array.isArray(result) ? result : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/equipment/categories`, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) return;
      const result = await r.json();
      setCategories(Array.isArray(result) ? result : []);
    } catch {}
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/equipment/assignments`, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) return;
      const result = await r.json();
      setAssignments(Array.isArray(result) ? result : []);
    } catch {}
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/equipment/usage`, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) return;
      const result = await r.json();
      setUsage(Array.isArray(result) ? result : []);
    } catch {}
  }, []);

  const loadMaintenance = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/equipment/maintenance`, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) return;
      const result = await r.json();
      setMaintenance(Array.isArray(result) ? result : []);
    } catch {}
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadEquipment(), loadCategories(), loadAssignments(), loadUsage(), loadMaintenance()]);
  }, [loadEquipment, loadCategories, loadAssignments, loadUsage, loadMaintenance]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ============================================
  // LOOKUPS
  // ============================================
  const sitesMap = useMemo(() => {
    const m = {}; (data.sites || []).forEach(s => { m[s.id] = s; }); return m;
  }, [data.sites]);

  const workersMap = useMemo(() => {
    const m = {}; (data.workers || []).forEach(w => { m[w.id] = w; }); return m;
  }, [data.workers]);

  const getActiveAssignment = useCallback((equipmentId) =>
    assignments.find(a => a.equipmentId === equipmentId && !a.actualReturnDate) || null,
  [assignments]);

  const getSiteForEquipment = useCallback((item) => {
    if (item.siteId && sitesMap[item.siteId]) return sitesMap[item.siteId];
    const active = getActiveAssignment(item.id);
    if (active?.siteId && sitesMap[active.siteId]) return sitesMap[active.siteId];
    if (active?.assignedToType === 'site' && active.assignedToId && sitesMap[active.assignedToId]) return sitesMap[active.assignedToId];
    return null;
  }, [sitesMap, getActiveAssignment]);

  const getWorkerForEquipment = useCallback((item) => {
    if (item.assignedToWorkerId && workersMap[item.assignedToWorkerId]) return workersMap[item.assignedToWorkerId];
    const active = getActiveAssignment(item.id);
    if (active?.assignedToType === 'worker' && active.assignedToId && workersMap[active.assignedToId]) return workersMap[active.assignedToId];
    return null;
  }, [workersMap, getActiveAssignment]);

  const getEquipmentHistory = useCallback((id) =>
    assignments.filter(a => a.equipmentId === id)
      .sort((a, b) => (b.assignedDate || '').localeCompare(a.assignedDate || '')),
  [assignments]);

  const getMaintenanceForEquipment = useCallback((id) =>
    maintenance.filter(m => m.equipmentId === id)
      .sort((a, b) => (b.maintenanceDate || '').localeCompare(a.maintenanceDate || '')),
  [maintenance]);

  const getUsageForEquipment = useCallback((id) =>
    usage.filter(u => u.equipmentId === id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
  [usage]);

  // ============================================
  // FILTERED
  // ============================================
  const filteredEquipment = useMemo(() => {
    let f = equipment;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(e =>
        e.name?.toLowerCase().includes(s) ||
        (e.code && e.code.toLowerCase().includes(s)) ||
        (e.model && e.model.toLowerCase().includes(s)) ||
        (e.serialNumber && e.serialNumber.toLowerCase().includes(s)) ||
        (e.location && e.location.toLowerCase().includes(s))
      );
    }
    if (statusFilter !== 'all') f = f.filter(e => e.status === statusFilter);
    if (categoryFilter !== 'all') f = f.filter(e => e.categoryId === categoryFilter);
    if (siteFilter !== 'all') {
      f = f.filter(e => {
        const site = getSiteForEquipment(e);
        return siteFilter === 'unassigned' ? !site : site?.id === siteFilter;
      });
    }
    return f;
  }, [equipment, searchTerm, statusFilter, categoryFilter, siteFilter, getSiteForEquipment]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredEquipment.length / itemsPerPage));
  const paginatedEquipment = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEquipment.slice(start, start + itemsPerPage);
  }, [filteredEquipment, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, categoryFilter, siteFilter, itemsPerPage, viewMode, viewTab]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const goToPage = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  const getPageNumbers = () => {
    const pages = []; const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const equipmentBySite = useMemo(() => {
    const groups = {};
    (data.sites || []).forEach(s => { groups[s.id] = { site: s, items: [] }; });
    groups['__unassigned__'] = { site: null, items: [] };
    filteredEquipment.forEach(item => {
      const site = getSiteForEquipment(item);
      if (site) {
        if (!groups[site.id]) groups[site.id] = { site, items: [] };
        groups[site.id].items.push(item);
      } else {
        groups['__unassigned__'].items.push(item);
      }
    });
    return Object.values(groups).filter(g => g.items.length > 0);
  }, [filteredEquipment, data.sites, getSiteForEquipment]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const total = equipment.length;
    const available = equipment.filter(e => e.status === 'available').length;
    const assigned = equipment.filter(e => e.status === 'assigned').length;
    const maintenanceCount = equipment.filter(e => e.status === 'maintenance').length;
    const repair = equipment.filter(e => e.status === 'repair').length;
    const onSite = equipment.filter(e => !!getSiteForEquipment(e)).length;
    const totalValue = equipment.reduce((s, e) => s + (e.currentValue || 0), 0);
    const totalPurchase = equipment.reduce((s, e) => s + (e.purchasePrice || 0), 0);
    const activeAssignments = assignments.filter(a => !a.actualReturnDate).length;
    const totalMaintenanceCost = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
    const avgValue = total > 0 ? totalValue / total : 0;
    const avgConditionScore = (() => {
      const scoreMap = { excellent: 100, good: 75, fair: 50, poor: 25, critical: 0 };
      if (total === 0) return 0;
      return equipment.reduce((s, e) => s + (scoreMap[e.condition] || 50), 0) / total;
    })();

    return {
      total, available, assigned, maintenance: maintenanceCount, repair,
      onSite, totalValue, totalPurchase, activeAssignments,
      totalMaintenanceCost, avgValue, avgConditionScore,
      utilizationRate: total > 0 ? (assigned / total) * 100 : 0,
      availabilityRate: total > 0 ? (available / total) * 100 : 0
    };
  }, [equipment, assignments, maintenance, getSiteForEquipment]);

  // ============================================
  // CHART DATA
  // ============================================
  const statusChartData = useMemo(() => ([
    { name: 'Available', value: stats.available, color: '#10b981' },
    { name: 'Assigned', value: stats.assigned, color: '#3b82f6' },
    { name: 'Maintenance', value: stats.maintenance, color: '#f59e0b' },
    { name: 'Repair', value: stats.repair, color: '#ef4444' }
  ].filter(d => d.value > 0)), [stats]);

  const categoryChartData = useMemo(() => {
    const map = {};
    equipment.forEach(e => {
      const key = categories.find(c => c.id === e.categoryId)?.name || 'Uncategorized';
      map[key] = (map[key] || 0) + 1;
    });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [equipment, categories]);

  const siteValueChartData = useMemo(() => (
    equipmentBySite.map(g => ({
      name: g.site?.name?.slice(0, 14) || 'Unassigned',
      shortName: (g.site?.name || 'Unassigned').length > 14 ? (g.site.name.slice(0, 14) + '…') : (g.site?.name || 'Unassigned'),
      value: g.items.reduce((s, e) => s + (e.currentValue || 0), 0),
      count: g.items.length
    })).sort((a, b) => b.value - a.value).slice(0, 8)
  ), [equipmentBySite]);

  const conditionChartData = useMemo(() => ([
    { name: 'Excellent', value: equipment.filter(e => e.condition === 'excellent').length, color: '#10b981' },
    { name: 'Good', value: equipment.filter(e => e.condition === 'good').length, color: '#3b82f6' },
    { name: 'Fair', value: equipment.filter(e => e.condition === 'fair').length, color: '#f59e0b' },
    { name: 'Poor', value: equipment.filter(e => e.condition === 'poor').length, color: '#f97316' },
    { name: 'Critical', value: equipment.filter(e => e.condition === 'critical').length, color: '#ef4444' }
  ].filter(d => d.value > 0)), [equipment]);

  // Maintenance cost trend (last 12 months)
  const maintenanceTrendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const monthCost = maintenance
        .filter(m => m.maintenanceDate && m.maintenanceDate.startsWith(key))
        .reduce((s, m) => s + (m.cost || 0), 0);
      months.push({ label, cost: monthCost });
    }
    return months;
  }, [maintenance]);

  // ============================================
  // KPI CARDS
  // ============================================
  const kpiItems = [
    { id: 'total', icon: Package, label: 'Total Equipment', value: stats.total,
      meta: `${categories.length} categories`, color: '#3b82f6',
      accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'available', icon: CheckCircle, label: 'Available', value: stats.available,
      meta: `${stats.availabilityRate.toFixed(0)}% available`, color: '#10b981',
      accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'onSite', icon: MapPin, label: 'On Site', value: stats.onSite,
      meta: `${stats.activeAssignments} active`, color: '#8b5cf6',
      accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'up' },
    { id: 'assigned', icon: User, label: 'Assigned', value: stats.assigned,
      meta: `${stats.utilizationRate.toFixed(0)}% utilized`, color: '#3b82f6',
      accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'maintenance', icon: Wrench, label: 'Under Maintenance', value: stats.maintenance + stats.repair,
      meta: `${Utils.formatCurrencyShort(stats.totalMaintenanceCost)} cost`, color: '#f59e0b',
      accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
      trend: stats.maintenance + stats.repair > 0 ? 'down' : 'flat' },
    { id: 'value', icon: Banknote, label: 'Asset Value',
      value: Utils.formatCurrencyShort(stats.totalValue),
      meta: `Avg ${Utils.formatCurrencyShort(stats.avgValue)}`, color: '#f59e0b',
      accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'up' }
  ];

  const cardDetails = {
    total: { title: 'Total Equipment', details: [
      { label: 'Total', value: stats.total },
      { label: 'Available', value: stats.available },
      { label: 'Assigned', value: stats.assigned },
      { label: 'Maintenance', value: stats.maintenance }
    ]},
    available: { title: 'Available', details: [
      { label: 'Available', value: stats.available },
      { label: 'Availability Rate', value: `${stats.availabilityRate.toFixed(1)}%` },
      { label: 'Total', value: stats.total },
      { label: 'Avg Condition', value: `${stats.avgConditionScore.toFixed(0)}%` }
    ]},
    assigned: { title: 'Assigned', details: [
      { label: 'Assigned', value: stats.assigned },
      { label: 'Active Assignments', value: stats.activeAssignments },
      { label: 'Utilization', value: `${stats.utilizationRate.toFixed(1)}%` },
      { label: 'Total', value: stats.total }
    ]},
    onSite: { title: 'On Site', details: [
      { label: 'On Site', value: stats.onSite },
      { label: 'Active Sites', value: Object.keys(equipmentBySite.reduce((a, g) => ({ ...a, [g.site?.id || 'unassigned']: 1 }), {})).length },
      { label: 'Total', value: stats.total },
      { label: 'On-Site Rate', value: `${stats.total > 0 ? ((stats.onSite / stats.total) * 100).toFixed(1) : 0}%` }
    ]},
    maintenance: { title: 'Maintenance', details: [
      { label: 'In Maintenance', value: stats.maintenance },
      { label: 'In Repair', value: stats.repair },
      { label: 'Total Cost', value: Utils.formatCurrency(stats.totalMaintenanceCost) },
      { label: 'Records', value: maintenance.length }
    ]},
    value: { title: 'Asset Value', details: [
      { label: 'Total Value', value: Utils.formatCurrency(stats.totalValue) },
      { label: 'Purchase Value', value: Utils.formatCurrency(stats.totalPurchase) },
      { label: 'Depreciated', value: Utils.formatCurrency(stats.totalPurchase - stats.totalValue) },
      { label: 'Avg Value', value: Utils.formatCurrency(stats.avgValue) }
    ]}
  };

  const handleCardHover = (id, e) => {
    setHoveredCard(id);
    setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // BADGES & ICONS
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      available: { color: '#10b981', label: 'Available', icon: CheckCircle },
      assigned: { color: '#3b82f6', label: 'Assigned', icon: User },
      maintenance: { color: '#f59e0b', label: 'Maintenance', icon: Wrench },
      repair: { color: '#ef4444', label: 'Repair', icon: AlertCircle },
      out_of_service: { color: '#6b7280', label: 'Out of Service', icon: AlertCircle },
      disposed: { color: '#94a3b8', label: 'Disposed', icon: X }
    };
    const c = config[status] || config.available;
    const Icon = c.icon;
    return <span className={`eq-status-badge ${status}`}><Icon size={11} /> {c.label}</span>;
  };

  const getConditionBadge = (condition) => {
    const config = {
      excellent: { label: 'Excellent' },
      good: { label: 'Good' },
      fair: { label: 'Fair' },
      poor: { label: 'Poor' },
      critical: { label: 'Critical' }
    };
    const c = config[condition] || config.good;
    return <span className={`eq-condition-badge ${condition}`}>{c.label}</span>;
  };

  const getCategoryIcon = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    const map = {
      excavator: <HardHat size={20} />, bulldozer: <HardHat size={20} />,
      crane: <Briefcase size={20} />, loader: <Package size={20} />,
      truck: <Truck size={20} />, generator: <Zap size={20} />,
      compressor: <Settings size={20} />, pump: <Fuel size={20} />,
      welder: <Wrench size={20} />, forklift: <Layers size={20} />,
      default: <Wrench size={20} />
    };
    const key = cat?.name?.toLowerCase() || 'default';
    return map[key] || map.default;
  };

  // ============================================
  // CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const url = editingId ? `${API_BASE_URL}/equipment/${editingId}` : `${API_BASE_URL}/equipment`;
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save equipment');
      }
      setSuccess(editingId ? 'Equipment updated!' : 'Equipment created!');
      await loadAll();
      if (refreshData) await refreshData();
      resetForm(); setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this equipment?')) return;
    try {
      const r = await fetch(`${API_BASE_URL}/equipment/${id}`, {
        method: 'DELETE', headers: { 'Accept': 'application/json' }
      });
      if (!r.ok) throw new Error('Failed to delete');
      setSuccess('Equipment deleted!');
      await loadAll();
      if (refreshData) await refreshData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
  };

  const resetForm = () => {
    setFormData({
      name: '', categoryId: '', manufacturer: '', model: '', serialNumber: '',
      yearManufactured: '', purchaseDate: '', purchasePrice: '',
      status: 'available', condition: 'good', location: '', siteId: '',
      maintenanceIntervalDays: 30, warrantyExpiry: '', insurancePolicy: '',
      insuranceExpiry: '', notes: ''
    });
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '', categoryId: item.categoryId || '',
      manufacturer: item.manufacturer || '', model: item.model || '',
      serialNumber: item.serialNumber || '', yearManufactured: item.yearManufactured || '',
      purchaseDate: item.purchaseDate || '', purchasePrice: item.purchasePrice || '',
      status: item.status || 'available', condition: item.condition || 'good',
      location: item.location || '', siteId: item.siteId || '',
      maintenanceIntervalDays: item.maintenanceIntervalDays || 30,
      warrantyExpiry: item.warrantyExpiry || '',
      insurancePolicy: item.insurancePolicy || '',
      insuranceExpiry: item.insuranceExpiry || '', notes: item.notes || ''
    });
    setShowForm(true);
  };

  const toggleExpand = (id) => setExpandedItems(p => ({ ...p, [id]: !p[id] }));
  const toggleSiteExpand = (id) => setExpandedSites(p => ({ ...p, [id]: p[id] === false ? true : false }));
  const toggleSelect = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleSelectAll = () => {
    const ids = filteredEquipment.map(e => e.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.includes(id));
    if (allSelected) setSelectedIds(p => p.filter(id => !ids.includes(id)));
    else setSelectedIds(p => Array.from(new Set([...p, ...ids])));
  };

  // ============================================
  // ASSIGN / RETURN / BULK
  // ============================================
  const openAssignModal = (item) => {
    setSelectedEquipment(item);
    setAssignmentForm({
      assignedToType: 'site', siteId: item.siteId || '', workerId: '',
      assignedDate: Utils.today(), expectedReturnDate: '', notes: ''
    });
    setShowAssignmentForm(true);
  };
  const openReturnModal = (item) => {
    setSelectedEquipment(item);
    setReturnForm({ actualReturnDate: Utils.today(), conditionOnReturn: item.condition || 'good', notes: '' });
    setShowReturnForm(true);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const payload = {
        equipmentId: selectedEquipment.id,
        assignedToType: assignmentForm.assignedToType,
        assignedToId: assignmentForm.assignedToType === 'site' ? assignmentForm.siteId : assignmentForm.workerId,
        siteId: assignmentForm.assignedToType === 'site' ? assignmentForm.siteId : null,
        workerId: assignmentForm.assignedToType === 'worker' ? assignmentForm.workerId : null,
        assignedDate: assignmentForm.assignedDate,
        expectedReturnDate: assignmentForm.expectedReturnDate || null,
        notes: assignmentForm.notes
      };
      const r = await fetch(`${API_BASE_URL}/equipment/${selectedEquipment.id}/assign`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to assign');
      }
      setSuccess('Equipment assigned!');
      await loadAll();
      if (refreshData) await refreshData();
      setShowAssignmentForm(false); setSelectedEquipment(null);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch(`${API_BASE_URL}/equipment/${selectedEquipment.id}/return`, {
        method: 'PUT',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: selectedEquipment.id,
          actualReturnDate: returnForm.actualReturnDate,
          conditionOnReturn: returnForm.conditionOnReturn,
          notes: returnForm.notes
        })
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to return');
      }
      setSuccess('Equipment returned!');
      await loadAll();
      if (refreshData) await refreshData();
      setShowReturnForm(false); setSelectedEquipment(null);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    if (!bulkAssignForm.siteId || selectedIds.length === 0) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const results = await Promise.all(selectedIds.map(id =>
        fetch(`${API_BASE_URL}/equipment/${id}/assign`, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipmentId: id, assignedToType: 'site',
            assignedToId: bulkAssignForm.siteId, siteId: bulkAssignForm.siteId,
            assignedDate: bulkAssignForm.assignedDate, notes: bulkAssignForm.notes
          })
        })
      ));
      const failures = results.filter(r => !r.ok);
      if (failures.length > 0) throw new Error(`${failures.length} of ${selectedIds.length} assignments failed`);
      setSuccess(`${selectedIds.length} equipment assigned!`);
      await loadAll();
      if (refreshData) await refreshData();
      setShowBulkAssignModal(false); setSelectedIds([]);
      setBulkAssignForm({ siteId: '', assignedDate: Utils.today(), notes: '' });
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch(`${API_BASE_URL}/equipment/${selectedEquipment.id}/maintenance`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceForm)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add maintenance');
      }
      setSuccess('Maintenance record added!');
      await loadAll();
      if (refreshData) await refreshData();
      setShowMaintenanceForm(false);
      setMaintenanceForm({
        maintenanceDate: Utils.today(), maintenanceType: 'routine', description: '',
        cost: '', performedBy: '', vendor: '', hoursSpent: '',
        nextMaintenanceDate: '', partsReplaced: '', status: 'completed', notes: ''
      });
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ============================================
  // RENDER EQUIPMENT CARD
  // ============================================
  const renderEquipmentCard = (item, index = 0) => {
    const isExpanded = expandedItems[item.id];
    const site = getSiteForEquipment(item);
    const worker = getWorkerForEquipment(item);
    const isSelected = selectedIds.includes(item.id);
    return (
      <div key={item.id}
        className={`eq-card ${isSelected ? 'eq-card-selected' : ''}`}
        style={{ animationDelay: `${Math.min(index * 50, 450)}ms` }}>
        <div className="eq-card-header">
          <div className="eq-info">
            <button className="eq-select-toggle" type="button"
              onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
              title={isSelected ? 'Unselect' : 'Select'}>
              {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
            </button>
            <div className="eq-icon-wrapper">
              <span className="eq-icon">{getCategoryIcon(item.categoryId)}</span>
              <span className={`eq-status-dot ${item.status}`}></span>
            </div>
            <div className="eq-info-text">
              <div className="eq-name">{item.name}</div>
              <div className="eq-code">{item.code || `EQ-${String(item.id).padStart(4, '0')}`}</div>
            </div>
          </div>
          <div className="eq-badges">
            {getStatusBadge(item.status)}
            {getConditionBadge(item.condition)}
          </div>
        </div>
        <div className="eq-card-body">
          {site ? (
            <div className="eq-site-strip eq-site-strip-active">
              <div className="eq-site-strip-left">
                <Building2 size={13} />
                <div>
                  <div className="eq-site-strip-label">Currently at</div>
                  <div className="eq-site-strip-name">{site.name}</div>
                </div>
              </div>
              {worker && (
                <div className="eq-site-strip-worker">
                  <User size={11} /> <span>{worker.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="eq-site-strip eq-site-strip-empty">
              <div className="eq-site-strip-left">
                <Home size={13} />
                <div>
                  <div className="eq-site-strip-label">Not assigned</div>
                  <div className="eq-site-strip-name">In storage</div>
                </div>
              </div>
            </div>
          )}
          <div className="eq-details-grid">
            {item.categoryName && <div className="eq-detail-item"><LayoutDashboard size={13} /><span>{item.categoryName}</span></div>}
            {item.manufacturer && <div className="eq-detail-item"><Building2 size={13} /><span>{item.manufacturer}</span></div>}
            {item.model && <div className="eq-detail-item"><Settings size={13} /><span>{item.model}</span></div>}
            {item.serialNumber && <div className="eq-detail-item"><FileText size={13} /><span>{item.serialNumber}</span></div>}
          </div>
          <div className="eq-stats-grid">
            <div className="eq-stat-item">
              <span className="eq-stat-label">Value</span>
              <span className="eq-stat-value">{Utils.formatCurrencyShort(item.currentValue || 0)}</span>
            </div>
            <div className="eq-stat-item">
              <span className="eq-stat-label">Hours</span>
              <span className="eq-stat-value">{item.totalHoursUsed?.toFixed(1) || 0}h</span>
            </div>
            <div className="eq-stat-item">
              <span className="eq-stat-label">Maint.</span>
              <span className="eq-stat-value">{getMaintenanceForEquipment(item.id).length || item.maintenanceCount || 0}</span>
            </div>
          </div>
          {item.location && <div className="eq-location"><MapPin size={13} /><span>{item.location}</span></div>}
          {item.nextMaintenanceDate && (
            <div className="eq-maintenance-date">
              <Calendar size={13} /><span>Next: {Utils.formatDate(item.nextMaintenanceDate)}</span>
            </div>
          )}
        </div>
        <div className="eq-card-footer">
          <div className="eq-actions">
            {site ? (
              <button className="eq-btn-icon eq-btn-return" onClick={() => openReturnModal(item)} title="Return">
                <Home size={15} />
              </button>
            ) : (
              <button className="eq-btn-icon eq-btn-assign" onClick={() => openAssignModal(item)} title="Assign">
                <ArrowRightLeft size={15} />
              </button>
            )}
            <button className="eq-btn-icon" onClick={() => { setSelectedEquipment(item); setShowDetailModal(true); setActiveTab('overview'); }} title="View">
              <Eye size={15} />
            </button>
            <button className="eq-btn-icon" onClick={() => handleEdit(item)} title="Edit">
              <Edit size={15} />
            </button>
            <button className="eq-btn-icon eq-btn-danger" onClick={() => handleDelete(item.id)} title="Delete">
              <Trash2 size={15} />
            </button>
            <button className="eq-btn-icon eq-btn-expand" onClick={() => toggleExpand(item.id)} title="Expand">
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="eq-expanded">
            <div className="eq-expanded-grid">
              <div className="eq-expanded-item"><Calendar size={13} /><span><strong>Purchase:</strong> {item.purchaseDate ? Utils.formatDate(item.purchaseDate) : 'N/A'}</span></div>
              <div className="eq-expanded-item"><Banknote size={13} /><span><strong>Price:</strong> {Utils.formatCurrency(item.purchasePrice || 0)}</span></div>
              <div className="eq-expanded-item"><Gauge size={13} /><span><strong>Depreciation:</strong> {item.depreciationMethod || 'Straight Line'} ({item.depreciationRate || 10}%)</span></div>
              <div className="eq-expanded-item"><Timer size={13} /><span><strong>Useful Life:</strong> {item.usefulLifeYears || 5} yrs</span></div>
              <div className="eq-expanded-item"><Award size={13} /><span><strong>Salvage:</strong> {Utils.formatCurrency(item.salvageValue || 0)}</span></div>
              {item.warrantyExpiry && <div className="eq-expanded-item"><Shield size={13} /><span><strong>Warranty:</strong> {Utils.formatDate(item.warrantyExpiry)}</span></div>}
            </div>
            {item.notes && (
              <div className="eq-expanded-notes"><FileText size={13} /><span><strong>Notes:</strong> {item.notes}</span></div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER LIST ROW
  // ============================================
  const renderEquipmentRow = (item) => {
    const site = getSiteForEquipment(item);
    const worker = getWorkerForEquipment(item);
    const isSelected = selectedIds.includes(item.id);
    return (
      <div key={item.id} className={`eq-row ${isSelected ? 'eq-row-selected' : ''}`}>
        <button className="eq-select-toggle" type="button" onClick={() => toggleSelect(item.id)}>
          {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
        </button>
        <div className="eq-row-icon">{getCategoryIcon(item.categoryId)}</div>
        <div className="eq-row-main">
          <div className="eq-row-name">{item.name}</div>
          <div className="eq-row-code">{item.code || `EQ-${String(item.id).padStart(4, '0')}`}</div>
        </div>
        <div className="eq-row-col">{item.categoryName || '—'}</div>
        <div className="eq-row-col">{getStatusBadge(item.status)}</div>
        <div className="eq-row-col eq-row-site">
          {site ? <span className="eq-row-site-name"><Building2 size={12} /> {site.name}</span> : <span className="eq-row-site-empty">—</span>}
        </div>
        <div className="eq-row-col eq-row-worker">
          {worker ? <span className="eq-row-worker-name"><User size={12} /> {worker.name}</span> : <span className="eq-row-worker-empty">—</span>}
        </div>
        <div className="eq-row-col eq-row-value">{Utils.formatCurrencyShort(item.currentValue || 0)}</div>
        <div className="eq-row-actions">
          {site ? (
            <button className="eq-btn-icon eq-btn-return" onClick={() => openReturnModal(item)} title="Return">
              <Home size={14} />
            </button>
          ) : (
            <button className="eq-btn-icon eq-btn-assign" onClick={() => openAssignModal(item)} title="Assign">
              <ArrowRightLeft size={14} />
            </button>
          )}
          <button className="eq-btn-icon" onClick={() => { setSelectedEquipment(item); setShowDetailModal(true); setActiveTab('overview'); }} title="View">
            <Eye size={14} />
          </button>
          <button className="eq-btn-icon" onClick={() => handleEdit(item)} title="Edit">
            <Edit size={14} />
          </button>
          <button className="eq-btn-icon eq-btn-danger" onClick={() => handleDelete(item.id)} title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // PAGINATION BAR
  // ============================================
  const renderPagination = () => {
    if (filteredEquipment.length === 0) return null;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredEquipment.length);
    return (
      <div className="eq-pagination">
        <div className="eq-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{filteredEquipment.length}</strong> equipment
        </div>
        <div className="eq-pagination-controls">
          <div className="eq-pagination-items">
            <span>Show:</span>
            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="eq-pagination-select">
              {[6, 9, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="eq-pagination-buttons">
            <button className="eq-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}><ChevronsLeft size={14} /></button>
            <button className="eq-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft size={14} /></button>
            {getPageNumbers().map(p => (
              <button key={p} className={`eq-page-btn ${p === currentPage ? 'active' : ''}`} onClick={() => goToPage(p)}>{p}</button>
            ))}
            <button className="eq-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight size={14} /></button>
            <button className="eq-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight size={14} /></button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // OVERVIEW TAB (charts)
  // ============================================
  const renderOverviewTab = () => (
    <div className="eq-view">
      {/* KPI GRID */}
      <div className="eq-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="eq-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="eq-kpi-accent" style={{ background: item.accent }} />
              <div className="eq-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="eq-kpi-content">
                <span className="eq-kpi-label">{item.label}</span>
                <span className="eq-kpi-value">{item.value}</span>
                <span className="eq-kpi-meta">{item.meta}</span>
              </div>
              <div className={`eq-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={16} />}
                {item.trend === 'down' && <TrendingDown size={16} />}
                {item.trend === 'flat' && <Minus size={16} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* TOOLTIP */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="eq-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="eq-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="eq-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="eq-tooltip-row">
                <span className="eq-tooltip-label">{d.label}</span>
                <span className="eq-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROW 1: Site value bar + Status donut */}
      <div className="eq-grid-2-1">
        <div className="eq-card">
          <div className="eq-card-header">
            <div className="eq-card-title">
              <span className="eq-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Asset Value by Site</h4>
                <span>Distribution of equipment value</span>
              </div>
            </div>
          </div>
          {siteValueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={siteValueChartData}>
                <defs>
                  <linearGradient id="eqSiteVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="shortName" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" name="Value" fill="url(#eqSiteVal)" radius={[8, 8, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="eq-empty-mini">No data</div>}
        </div>

        <div className="eq-card">
          <div className="eq-card-header">
            <div className="eq-card-title">
              <span className="eq-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Status Breakdown</h4>
                <span>Equipment by status</span>
              </div>
            </div>
          </div>
          <div className="eq-donut-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                  {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <ReTooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="eq-donut-legend">
              {statusChartData.map((d, i) => (
                <div key={i} className="eq-donut-item">
                  <span className="eq-donut-dot" style={{ background: d.color }} />
                  <span className="eq-donut-name">{d.name}</span>
                  <span className="eq-donut-val">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Category bars + Condition bars + Maintenance cost trend */}
      <div className="eq-grid-3">
        <div className="eq-card">
          <div className="eq-card-header">
            <div className="eq-card-title">
              <span className="eq-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <Layers size={16} />
              </span>
              <div>
                <h4>Equipment by Category</h4>
                <span>Count per category</span>
              </div>
            </div>
          </div>
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" name="Equipment" radius={[0, 8, 8, 0]} barSize={20}>
                  {categoryChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="eq-empty-mini">No data</div>}
        </div>

        <div className="eq-card">
          <div className="eq-card-header">
            <div className="eq-card-title">
              <span className="eq-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Gauge size={16} />
              </span>
              <div>
                <h4>Condition Distribution</h4>
                <span>Asset health</span>
              </div>
            </div>
          </div>
          {conditionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={conditionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" name="Equipment" radius={[8, 8, 0, 0]} barSize={32}>
                  {conditionChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="eq-empty-mini">No data</div>}
        </div>

        <div className="eq-card">
          <div className="eq-card-header">
            <div className="eq-card-title">
              <span className="eq-card-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <LineChartIcon size={16} />
              </span>
              <div>
                <h4>Maintenance Cost Trend</h4>
                <span>Last 12 months</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={maintenanceTrendData}>
              <defs>
                <linearGradient id="eqMaintGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
              <Area type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2.5}
                fill="url(#eqMaintGrad)" name="Cost" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROW 3: Top most valuable equipment */}
      <div className="eq-card">
        <div className="eq-card-header">
          <div className="eq-card-title">
            <span className="eq-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <Crown size={16} />
            </span>
            <div>
              <h4>Top 8 Most Valuable Equipment</h4>
              <span>Highest current value</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={[...equipment].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0)).slice(0, 8)
              .map(e => ({ name: (e.name || '').slice(0, 14), value: e.currentValue || 0 }))}
            layout="vertical" margin={{ left: 10, right: 20 }}>
            <defs>
              <linearGradient id="eqTopVal" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={120} />
            <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
              cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
            <Bar dataKey="value" name="Value" fill="url(#eqTopVal)" radius={[0, 8, 8, 0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // ============================================
  // INVENTORY TAB
  // ============================================
  const renderInventoryTab = () => (
    <div className="eq-view">
      {/* Filters */}
      <div className="eq-filters-section">
        <div className="eq-search-box">
          <Search size={16} className="eq-search-icon" />
          <input type="text" placeholder="Search by name, code, model, serial..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button className="eq-clear-search" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="eq-filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="eq-select">
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="maintenance">Maintenance</option>
            <option value="repair">Repair</option>
            <option value="out_of_service">Out of Service</option>
            <option value="disposed">Disposed</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="eq-select">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="eq-select">
            <option value="all">All Sites</option>
            <option value="unassigned">Unassigned</option>
            {data.sites?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="eq-view-toggle">
          <button className={`eq-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid">
            <ListIcon size={14} /> Grid
          </button>
          <button className={`eq-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List">
            <ListIcon size={14} /> List
          </button>
          <button className={`eq-view-btn ${viewMode === 'site' ? 'active' : ''}`} onClick={() => setViewMode('site')} title="By Site">
            <Building2 size={14} /> By Site
          </button>
        </div>
      </div>

      {/* Bulk bar */}
      {selectedIds.length > 0 && (
        <div className="eq-bulk-bar">
          <div className="eq-bulk-info">
            <CheckSquare size={15} /> <span>{selectedIds.length} selected</span>
          </div>
          <div className="eq-bulk-actions">
            <button className="eq-bulk-btn" onClick={() => setShowBulkAssignModal(true)}>
              <ArrowRightLeft size={13} /> Assign to Site
            </button>
            <button className="eq-bulk-btn eq-bulk-btn-ghost" onClick={() => setSelectedIds([])}>
              <X size={13} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="eq-loading-state">
          <div className="eq-loading-spinner" />
          <span>Loading equipment...</span>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="eq-empty-state">
          <div className="eq-empty-icon-wrapper"><Package size={40} /></div>
          <h3>No Equipment Found</h3>
          <p>Add your first equipment or adjust filters.</p>
          <button className="eq-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={15} /> Add Equipment
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div className="eq-grid">
            {paginatedEquipment.map((item, i) => renderEquipmentCard(item, i))}
          </div>
          {renderPagination()}
        </>
      ) : viewMode === 'list' ? (
        <>
          <div className="eq-list">
            <div className="eq-list-header">
              <button className="eq-select-toggle" onClick={toggleSelectAll} title="Select all">
                {filteredEquipment.length > 0 && filteredEquipment.every(e => selectedIds.includes(e.id))
                  ? <CheckSquare size={15} /> : <Square size={15} />}
              </button>
              <div className="eq-row-icon-spacer" />
              <div className="eq-row-main">Equipment</div>
              <div className="eq-row-col">Category</div>
              <div className="eq-row-col">Status</div>
              <div className="eq-row-col">Site</div>
              <div className="eq-row-col">Operator</div>
              <div className="eq-row-col">Value</div>
              <div className="eq-row-actions">Actions</div>
            </div>
            {paginatedEquipment.map(renderEquipmentRow)}
          </div>
          {renderPagination()}
        </>
      ) : (
        <>
          <div className="eq-site-groups">
            {equipmentBySite.map(group => {
              const siteId = group.site?.id || '__unassigned__';
              const isExpanded = expandedSites[siteId] !== false;
              const totalValue = group.items.reduce((s, e) => s + (e.currentValue || 0), 0);
              return (
                <div key={siteId} className="eq-site-group">
                  <button className="eq-site-group-header" onClick={() => toggleSiteExpand(siteId)}>
                    <div className="eq-site-group-left">
                      <div className={`eq-site-group-icon ${group.site ? 'has-site' : 'empty-site'}`}>
                        {group.site ? <Building2 size={16} /> : <Home size={16} />}
                      </div>
                      <div>
                        <div className="eq-site-group-name">{group.site?.name || 'Unassigned'}</div>
                        <div className="eq-site-group-meta">
                          {group.items.length} items{totalValue > 0 && ` · ${Utils.formatCurrencyShort(totalValue)} value`}
                        </div>
                      </div>
                    </div>
                    <div className="eq-site-group-right">
                      <span className="eq-site-group-count">{group.items.length}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="eq-site-group-body">
                      {group.items.map((item, i) => renderEquipmentCard(item, i))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  // ============================================
  // DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedEquipment) return null;
    const e = selectedEquipment;
    const site = getSiteForEquipment(e);
    const worker = getWorkerForEquipment(e);
    const history = getEquipmentHistory(e.id);
    const maintenanceRecords = getMaintenanceForEquipment(e.id);
    const usageRecords = getUsageForEquipment(e.id);
    return (
      <ModalPortal>
        <div className="eq-modal-overlay" onClick={(ev) => { if (ev.target === ev.currentTarget) setShowDetailModal(false); }}>
          <div className="eq-modal-content eq-detail-modal" onClick={ev => ev.stopPropagation()}>
            <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #0b1a12, #1f3a2c)' }}>
              <div className="eq-modal-header-left">
                <div className="eq-modal-icon-large">{getCategoryIcon(e.categoryId)}</div>
                <div>
                  <h3>{e.name}</h3>
                  <div className="eq-modal-subtitle">
                    {e.code || `EQ-${String(e.id).padStart(4, '0')}`}
                    {site && ` · ${site.name}`}
                  </div>
                </div>
              </div>
              <div className="eq-modal-actions">
                {site ? (
                  <button className="eq-modal-btn-edit" onClick={() => { setShowDetailModal(false); openReturnModal(e); }}>
                    <Home size={14} /> Return
                  </button>
                ) : (
                  <button className="eq-modal-btn-edit" onClick={() => { setShowDetailModal(false); openAssignModal(e); }}>
                    <ArrowRightLeft size={14} /> Assign
                  </button>
                )}
                <button className="eq-modal-btn-edit" onClick={() => { setShowDetailModal(false); handleEdit(e); }}>
                  <Edit size={14} /> Edit
                </button>
                <button className="eq-modal-close" onClick={() => setShowDetailModal(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="eq-modal-body">
              {site && (
                <div className="eq-detail-site-banner">
                  <div className="eq-detail-site-banner-left">
                    <div className="eq-detail-site-banner-icon"><Building2 size={18} /></div>
                    <div>
                      <div className="eq-detail-site-banner-label">Currently assigned to</div>
                      <div className="eq-detail-site-banner-name">{site.name}</div>
                      {site.location && <div className="eq-detail-site-banner-loc">{site.location}</div>}
                    </div>
                  </div>
                  {worker && (
                    <div className="eq-detail-site-banner-worker">
                      <User size={13} /> <span>Operator: {worker.name}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="eq-detail-tabs">
                {[
                  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                  { id: 'history', label: 'Site History', icon: History, count: history.length },
                  { id: 'maintenance', label: 'Maintenance', icon: Wrench, count: maintenanceRecords.length },
                  { id: 'usage', label: 'Usage', icon: Activity, count: usageRecords.length },
                  { id: 'depreciation', label: 'Depreciation', icon: TrendingDown }
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} className={`eq-tab-btn ${activeTab === t.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(t.id)}>
                      <Icon size={13} /> {t.label}
                      {t.count > 0 && <span className="eq-tab-count">{t.count}</span>}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'overview' && (
                <div className="eq-overview-tab">
                  <div className="eq-info-grid">
                    {[
                      ['Category', e.categoryName],
                      ['Manufacturer', e.manufacturer],
                      ['Model', e.model],
                      ['Serial Number', e.serialNumber],
                      ['Year Manufactured', e.yearManufactured],
                      ['Location', e.location],
                      ['Total Hours', e.totalHoursUsed ? `${e.totalHoursUsed.toFixed(1)}h` : '—'],
                      ['Current Site', site?.name || 'Unassigned']
                    ].map(([label, value], i) => (
                      <div key={i} className="eq-info-item">
                        <span className="eq-info-label">{label}</span>
                        <span className="eq-info-value">{value || 'N/A'}</span>
                      </div>
                    ))}
                    <div className="eq-info-item">
                      <span className="eq-info-label">Status</span>
                      <span className="eq-info-value">{getStatusBadge(e.status)}</span>
                    </div>
                    <div className="eq-info-item">
                      <span className="eq-info-label">Condition</span>
                      <span className="eq-info-value">{getConditionBadge(e.condition)}</span>
                    </div>
                  </div>

                  <div className="eq-financial-section">
                    <h4><Banknote size={14} /> Financial Information</h4>
                    <div className="eq-financial-grid">
                      {[
                        ['Purchase Date', e.purchaseDate ? Utils.formatDate(e.purchaseDate) : 'N/A'],
                        ['Purchase Price', Utils.formatCurrency(e.purchasePrice || 0)],
                        ['Current Value', Utils.formatCurrency(e.currentValue || 0), '#047857'],
                        ['Depreciation Method', e.depreciationMethod || 'Straight Line'],
                        ['Depreciation Rate', `${e.depreciationRate || 10}%`],
                        ['Useful Life', `${e.usefulLifeYears || 5} years`],
                        ['Salvage Value', Utils.formatCurrency(e.salvageValue || 0)],
                        ['Maintenance Cost', Utils.formatCurrency(e.totalMaintenanceCost || 0), '#b91c1c']
                      ].map(([label, value, color], i) => (
                        <div key={i} className="eq-fin-item">
                          <span className="eq-fin-label">{label}</span>
                          <span className="eq-fin-value" style={color ? { color } : {}}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {e.notes && (
                    <div className="eq-notes-section">
                      <h4><FileText size={14} /> Notes</h4>
                      <p>{e.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="eq-history-tab">
                  {history.length === 0 ? (
                    <div className="eq-empty-tab">
                      <div className="eq-empty-icon-wrapper"><History size={40} /></div>
                      <h3>No assignment history</h3>
                      <p>Assign this equipment to a site to start tracking.</p>
                    </div>
                  ) : (
                    <div className="eq-history-list">
                      {history.map((a, i) => {
                        const aSite = a.siteId ? sitesMap[a.siteId] : (a.assignedToType === 'site' ? sitesMap[a.assignedToId] : null);
                        const aWorker = a.workerId ? workersMap[a.workerId] : (a.assignedToType === 'worker' ? workersMap[a.assignedToId] : null);
                        const isActive = !a.actualReturnDate;
                        return (
                          <div key={a.id || i} className={`eq-history-item ${isActive ? 'eq-history-item-active' : ''}`}>
                            <div className="eq-history-timeline">
                              <span className={`eq-history-dot ${isActive ? 'active' : ''}`} />
                              {i < history.length - 1 && <span className="eq-history-line" />}
                            </div>
                            <div className="eq-history-body">
                              <div className="eq-history-head">
                                <div className="eq-history-site">
                                  {aSite ? <><Building2 size={13} /> <strong>{aSite.name}</strong></>
                                    : <><Home size={13} /> <strong>Storage</strong></>}
                                </div>
                                {isActive && <span className="eq-history-current">Current</span>}
                              </div>
                              <div className="eq-history-meta">
                                <span><Calendar size={11} /> {a.assignedDate ? Utils.formatDate(a.assignedDate) : '—'}</span>
                                {a.actualReturnDate && <span><Calendar size={11} /> Returned {Utils.formatDate(a.actualReturnDate)}</span>}
                                {a.expectedReturnDate && !a.actualReturnDate && <span><Clock size={11} /> Due {Utils.formatDate(a.expectedReturnDate)}</span>}
                                {aWorker && <span><User size={11} /> {aWorker.name}</span>}
                              </div>
                              {a.notes && <div className="eq-history-notes"><FileText size={11} /> {a.notes}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div className="eq-history-tab">
                  {maintenanceRecords.length === 0 ? (
                    <div className="eq-empty-tab">
                      <div className="eq-empty-icon-wrapper"><Wrench size={40} /></div>
                      <h3>No maintenance records</h3>
                      <p>Add maintenance records to track servicing.</p>
                      <button className="eq-btn-primary" style={{ marginTop: 12 }} onClick={() => setShowMaintenanceForm(true)}>
                        <Plus size={14} /> Add Maintenance
                      </button>
                    </div>
                  ) : (
                    <div className="eq-history-list">
                      {maintenanceRecords.map((m, i) => (
                        <div key={m.id || i} className="eq-history-item">
                          <div className="eq-history-timeline">
                            <span className="eq-history-dot" />
                            {i < maintenanceRecords.length - 1 && <span className="eq-history-line" />}
                          </div>
                          <div className="eq-history-body">
                            <div className="eq-history-head">
                              <div className="eq-history-site">
                                <Wrench size={13} /> <strong>{m.maintenanceType || 'Maintenance'}</strong>
                              </div>
                              <span className="eq-history-cost">{Utils.formatCurrency(m.cost || 0)}</span>
                            </div>
                            <div className="eq-history-meta">
                              <span><Calendar size={11} /> {m.maintenanceDate ? Utils.formatDate(m.maintenanceDate) : '—'}</span>
                              {m.performedBy && <span><User size={11} /> {m.performedBy}</span>}
                              {m.vendor && <span><Building2 size={11} /> {m.vendor}</span>}
                              {m.hoursSpent && <span><Clock size={11} /> {m.hoursSpent}h</span>}
                            </div>
                            {m.description && <div className="eq-history-notes"><FileText size={11} /> {m.description}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'usage' && (
                <div className="eq-history-tab">
                  {usageRecords.length === 0 ? (
                    <div className="eq-empty-tab">
                      <div className="eq-empty-icon-wrapper"><Activity size={40} /></div>
                      <h3>No usage records</h3>
                      <p>Track daily hours, fuel, and operator usage.</p>
                    </div>
                  ) : (
                    <div className="eq-history-list">
                      {usageRecords.map((u, i) => (
                        <div key={u.id || i} className="eq-history-item">
                          <div className="eq-history-timeline">
                            <span className="eq-history-dot" />
                            {i < usageRecords.length - 1 && <span className="eq-history-line" />}
                          </div>
                          <div className="eq-history-body">
                            <div className="eq-history-head">
                              <div className="eq-history-site">
                                <Activity size={13} /> <strong>{u.date ? Utils.formatDate(u.date) : '—'}</strong>
                              </div>
                              {u.hoursUsed && <span className="eq-history-cost">{u.hoursUsed}h</span>}
                            </div>
                            <div className="eq-history-meta">
                              {u.siteId && sitesMap[u.siteId] && <span><Building2 size={11} /> {sitesMap[u.siteId].name}</span>}
                              {u.operatorName && <span><User size={11} /> {u.operatorName}</span>}
                              {u.fuelUsed && <span><Fuel size={11} /> {u.fuelUsed}L</span>}
                              {u.fuelCost && <span><Banknote size={11} /> {Utils.formatCurrency(u.fuelCost)}</span>}
                            </div>
                            {u.notes && <div className="eq-history-notes"><FileText size={11} /> {u.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'depreciation' && (
                <div className="eq-depreciation-tab">
                  <div className="eq-depreciation-grid">
                    <div className="eq-dep-card">
                      <div className="eq-dep-label">Purchase Price</div>
                      <div className="eq-dep-value">{Utils.formatCurrency(e.purchasePrice || 0)}</div>
                    </div>
                    <div className="eq-dep-card">
                      <div className="eq-dep-label">Current Value</div>
                      <div className="eq-dep-value" style={{ color: '#047857' }}>{Utils.formatCurrency(e.currentValue || 0)}</div>
                    </div>
                    <div className="eq-dep-card">
                      <div className="eq-dep-label">Total Depreciated</div>
                      <div className="eq-dep-value" style={{ color: '#b91c1c' }}>
                        {Utils.formatCurrency((e.purchasePrice || 0) - (e.currentValue || 0))}
                      </div>
                    </div>
                    <div className="eq-dep-card">
                      <div className="eq-dep-label">Depreciation Rate</div>
                      <div className="eq-dep-value">{e.depreciationRate || 10}% / yr</div>
                    </div>
                    <div className="eq-dep-card">
                      <div className="eq-dep-label">Method</div>
                      <div className="eq-dep-value">{e.depreciationMethod || 'Straight Line'}</div>
                    </div>
                    <div className="eq-dep-card">
                      <div className="eq-dep-label">Salvage Value</div>
                      <div className="eq-dep-value">{Utils.formatCurrency(e.salvageValue || 0)}</div>
                    </div>
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
  // FORM MODAL
  // ============================================
  const renderFormModal = () => (
    <ModalPortal>
      <div className="eq-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="eq-modal-content eq-form-modal" onClick={e => e.stopPropagation()}>
          <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="eq-modal-header-left">
              <div className="eq-modal-icon"><Package size={18} /></div>
              <div>
                <h3>{editingId ? 'Edit Equipment' : 'New Equipment'}</h3>
                <p className="eq-modal-sub">{editingId ? 'Update details' : 'Add new asset'}</p>
              </div>
            </div>
            <button className="eq-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="eq-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Equipment Name <span className="eq-required">*</span></label>
                  <input type="text" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required placeholder="Equipment name" className="eq-form-input" autoFocus />
                </div>
                <div className="eq-form-group">
                  <label>Category</label>
                  <select value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="eq-form-select">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Manufacturer</label>
                  <input type="text" value={formData.manufacturer}
                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="Manufacturer" className="eq-form-input" />
                </div>
                <div className="eq-form-group">
                  <label>Model</label>
                  <input type="text" value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Model" className="eq-form-input" />
                </div>
              </div>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Serial Number</label>
                  <input type="text" value={formData.serialNumber}
                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="Serial number" className="eq-form-input" />
                </div>
                <div className="eq-form-group">
                  <label>Year Manufactured</label>
                  <input type="number" value={formData.yearManufactured}
                    onChange={e => setFormData({ ...formData, yearManufactured: e.target.value })}
                    placeholder="Year" className="eq-form-input" />
                </div>
              </div>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Purchase Date</label>
                  <input type="date" value={formData.purchaseDate}
                    onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="eq-form-input" />
                </div>
                <div className="eq-form-group">
                  <label>Purchase Price (BD)</label>
                  <input type="number" step="0.001" value={formData.purchasePrice}
                    onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                    placeholder="0.000" className="eq-form-input" />
                </div>
              </div>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Status</label>
                  <select value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="eq-form-select">
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="repair">Repair</option>
                    <option value="out_of_service">Out of Service</option>
                    <option value="disposed">Disposed</option>
                  </select>
                </div>
                <div className="eq-form-group">
                  <label>Condition</label>
                  <select value={formData.condition}
                    onChange={e => setFormData({ ...formData, condition: e.target.value })}
                    className="eq-form-select">
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Location</label>
                  <input type="text" value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Location" className="eq-form-input" />
                </div>
                <div className="eq-form-group">
                  <label>Site</label>
                  <select value={formData.siteId}
                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                    className="eq-form-select">
                    <option value="">Select Site</option>
                    {data.sites?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Maintenance Interval (days)</label>
                  <input type="number" value={formData.maintenanceIntervalDays}
                    onChange={e => setFormData({ ...formData, maintenanceIntervalDays: e.target.value })}
                    placeholder="30" className="eq-form-input" />
                </div>
                <div className="eq-form-group">
                  <label>Warranty Expiry</label>
                  <input type="date" value={formData.warrantyExpiry}
                    onChange={e => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                    className="eq-form-input" />
                </div>
              </div>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Insurance Policy</label>
                  <input type="text" value={formData.insurancePolicy}
                    onChange={e => setFormData({ ...formData, insurancePolicy: e.target.value })}
                    placeholder="Policy number" className="eq-form-input" />
                </div>
                <div className="eq-form-group">
                  <label>Insurance Expiry</label>
                  <input type="date" value={formData.insuranceExpiry}
                    onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    className="eq-form-input" />
                </div>
              </div>
              <div className="eq-form-group">
                <label>Notes</label>
                <textarea value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes" rows="2" className="eq-form-textarea" />
              </div>
              <div className="eq-form-actions">
                <button type="submit" className="eq-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="eq-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
  // ASSIGN MODAL
  // ============================================
  const renderAssignmentForm = () => {
    if (!selectedEquipment) return null;
    return (
      <ModalPortal>
        <div className="eq-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowAssignmentForm(false); setSelectedEquipment(null); } }}>
          <div className="eq-modal-content eq-assignment-modal" onClick={e => e.stopPropagation()}>
            <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              <div className="eq-modal-header-left">
                <div className="eq-modal-icon"><ArrowRightLeft size={18} /></div>
                <div>
                  <h3>Assign Equipment</h3>
                  <p className="eq-modal-sub">{selectedEquipment.name}</p>
                </div>
              </div>
              <button className="eq-modal-close" onClick={() => { setShowAssignmentForm(false); setSelectedEquipment(null); }}>
                <X size={18} />
              </button>
            </div>
            <div className="eq-modal-body">
              <form onSubmit={handleAssign}>
                <div className="eq-form-group">
                  <label>Assign To <span className="eq-required">*</span></label>
                  <div className="eq-toggle-group">
                    <button type="button"
                      className={`eq-toggle-btn ${assignmentForm.assignedToType === 'site' ? 'active' : ''}`}
                      onClick={() => setAssignmentForm({ ...assignmentForm, assignedToType: 'site' })}>
                      <Building2 size={13} /> Site
                    </button>
                    <button type="button"
                      className={`eq-toggle-btn ${assignmentForm.assignedToType === 'worker' ? 'active' : ''}`}
                      onClick={() => setAssignmentForm({ ...assignmentForm, assignedToType: 'worker' })}>
                      <User size={13} /> Worker
                    </button>
                  </div>
                </div>
                {assignmentForm.assignedToType === 'site' ? (
                  <div className="eq-form-group">
                    <label>Site <span className="eq-required">*</span></label>
                    <select value={assignmentForm.siteId}
                      onChange={e => setAssignmentForm({ ...assignmentForm, siteId: e.target.value })}
                      required className="eq-form-select">
                      <option value="">Select Site</option>
                      {data.sites?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="eq-form-group">
                    <label>Worker <span className="eq-required">*</span></label>
                    <select value={assignmentForm.workerId}
                      onChange={e => setAssignmentForm({ ...assignmentForm, workerId: e.target.value })}
                      required className="eq-form-select">
                      <option value="">Select Worker</option>
                      {data.workers?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="eq-form-row">
                  <div className="eq-form-group">
                    <label>Assigned Date <span className="eq-required">*</span></label>
                    <input type="date" value={assignmentForm.assignedDate}
                      onChange={e => setAssignmentForm({ ...assignmentForm, assignedDate: e.target.value })}
                      required className="eq-form-input" />
                  </div>
                  <div className="eq-form-group">
                    <label>Expected Return</label>
                    <input type="date" value={assignmentForm.expectedReturnDate}
                      onChange={e => setAssignmentForm({ ...assignmentForm, expectedReturnDate: e.target.value })}
                      className="eq-form-input" />
                  </div>
                </div>
                <div className="eq-form-group">
                  <label>Notes</label>
                  <textarea value={assignmentForm.notes}
                    onChange={e => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                    placeholder="Purpose or notes" rows="2" className="eq-form-textarea" />
                </div>
                <div className="eq-form-actions">
                  <button type="submit" className="eq-btn-primary" disabled={loading}>
                    <ArrowRightLeft size={14} /> {loading ? 'Assigning...' : 'Assign'}
                  </button>
                  <button type="button" className="eq-btn-secondary" onClick={() => { setShowAssignmentForm(false); setSelectedEquipment(null); }}>
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
  // RETURN MODAL
  // ============================================
  const renderReturnForm = () => {
    if (!selectedEquipment) return null;
    const activeSite = getSiteForEquipment(selectedEquipment);
    return (
      <ModalPortal>
        <div className="eq-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowReturnForm(false); setSelectedEquipment(null); } }}>
          <div className="eq-modal-content eq-assignment-modal" onClick={e => e.stopPropagation()}>
            <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <div className="eq-modal-header-left">
                <div className="eq-modal-icon"><Home size={18} /></div>
                <div>
                  <h3>Return Equipment</h3>
                  <p className="eq-modal-sub">
                    {selectedEquipment.name} {activeSite && `· from ${activeSite.name}`}
                  </p>
                </div>
              </div>
              <button className="eq-modal-close" onClick={() => { setShowReturnForm(false); setSelectedEquipment(null); }}>
                <X size={18} />
              </button>
            </div>
            <div className="eq-modal-body">
              <form onSubmit={handleReturn}>
                <div className="eq-form-row">
                  <div className="eq-form-group">
                    <label>Return Date <span className="eq-required">*</span></label>
                    <input type="date" value={returnForm.actualReturnDate}
                      onChange={e => setReturnForm({ ...returnForm, actualReturnDate: e.target.value })}
                      required className="eq-form-input" />
                  </div>
                  <div className="eq-form-group">
                    <label>Condition on Return</label>
                    <select value={returnForm.conditionOnReturn}
                      onChange={e => setReturnForm({ ...returnForm, conditionOnReturn: e.target.value })}
                      className="eq-form-select">
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="eq-form-group">
                  <label>Notes</label>
                  <textarea value={returnForm.notes}
                    onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })}
                    placeholder="Damage or issues noted" rows="2" className="eq-form-textarea" />
                </div>
                <div className="eq-form-actions">
                  <button type="submit" className="eq-btn-primary" disabled={loading}>
                    <Home size={14} /> {loading ? 'Returning...' : 'Mark as Returned'}
                  </button>
                  <button type="button" className="eq-btn-secondary" onClick={() => { setShowReturnForm(false); setSelectedEquipment(null); }}>
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
  // BULK ASSIGN MODAL
  // ============================================
  const renderBulkAssignModal = () => (
    <ModalPortal>
      <div className="eq-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowBulkAssignModal(false); }}>
        <div className="eq-modal-content eq-assignment-modal" onClick={e => e.stopPropagation()}>
          <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <div className="eq-modal-header-left">
              <div className="eq-modal-icon"><ArrowRightLeft size={18} /></div>
              <div>
                <h3>Bulk Assign</h3>
                <p className="eq-modal-sub">{selectedIds.length} items selected</p>
              </div>
            </div>
            <button className="eq-modal-close" onClick={() => setShowBulkAssignModal(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="eq-modal-body">
            <form onSubmit={handleBulkAssign}>
              <div className="eq-form-group">
                <label>Site <span className="eq-required">*</span></label>
                <select value={bulkAssignForm.siteId}
                  onChange={e => setBulkAssignForm({ ...bulkAssignForm, siteId: e.target.value })}
                  required className="eq-form-select">
                  <option value="">Select Site</option>
                  {data.sites?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="eq-form-group">
                <label>Assigned Date</label>
                <input type="date" value={bulkAssignForm.assignedDate}
                  onChange={e => setBulkAssignForm({ ...bulkAssignForm, assignedDate: e.target.value })}
                  className="eq-form-input" />
              </div>
              <div className="eq-form-group">
                <label>Notes</label>
                <textarea value={bulkAssignForm.notes}
                  onChange={e => setBulkAssignForm({ ...bulkAssignForm, notes: e.target.value })}
                  placeholder="Notes" rows="2" className="eq-form-textarea" />
              </div>
              <div className="eq-form-actions">
                <button type="submit" className="eq-btn-primary" disabled={loading}>
                  <ArrowRightLeft size={14} /> {loading ? 'Assigning...' : `Assign ${selectedIds.length} items`}
                </button>
                <button type="button" className="eq-btn-secondary" onClick={() => setShowBulkAssignModal(false)}>
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
  // MAINTENANCE MODAL
  // ============================================
  const renderMaintenanceForm = () => (
    <ModalPortal>
      <div className="eq-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowMaintenanceForm(false); }}>
        <div className="eq-modal-content eq-maintenance-form-modal" onClick={e => e.stopPropagation()}>
          <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="eq-modal-header-left">
              <div className="eq-modal-icon"><Wrench size={18} /></div>
              <div>
                <h3>Add Maintenance Record</h3>
                <p className="eq-modal-sub">Log servicing and repairs</p>
              </div>
            </div>
            <button className="eq-modal-close" onClick={() => setShowMaintenanceForm(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="eq-modal-body">
            <form onSubmit={handleAddMaintenance}>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Date <span className="eq-required">*</span></label>
                  <input type="date" value={maintenanceForm.maintenanceDate}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, maintenanceDate: e.target.value })}
                    required className="eq-form-input" />
                </div>
                <div className="eq-form-group">
                  <label>Type <span className="eq-required">*</span></label>
                  <select value={maintenanceForm.maintenanceType}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, maintenanceType: e.target.value })}
                    required className="eq-form-select">
                    <option value="routine">Routine</option>
                    <option value="preventive">Preventive</option>
                    <option value="corrective">Corrective</option>
                    <option value="emergency">Emergency</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
              </div>
              <div className="eq-form-group">
                <label>Description</label>
                <textarea value={maintenanceForm.description}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  placeholder="Description" rows="2" className="eq-form-textarea" />
              </div>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Cost (BD)</label>
                  <input type="number" step="0.001" value={maintenanceForm.cost}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                    placeholder="0.000" className="eq-form-input" />
                </div>
                <div className="eq-form-group">
                  <label>Performed By</label>
                  <input type="text" value={maintenanceForm.performedBy}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, performedBy: e.target.value })}
                    placeholder="Who performed" className="eq-form-input" />
                </div>
              </div>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Vendor</label>
                  <input type="text" value={maintenanceForm.vendor}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, vendor: e.target.value })}
                    placeholder="Vendor" className="eq-form-input" />
                </div>
                <div className="eq-form-group">
                  <label>Hours Spent</label>
                  <input type="number" step="0.5" value={maintenanceForm.hoursSpent}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, hoursSpent: e.target.value })}
                    placeholder="0" className="eq-form-input" />
                </div>
              </div>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Next Maintenance Date</label>
                  <input type="date" value={maintenanceForm.nextMaintenanceDate}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, nextMaintenanceDate: e.target.value })}
                    className="eq-form-input" />
                </div>
                <div className="eq-form-group">
                  <label>Status</label>
                  <select value={maintenanceForm.status}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
                    className="eq-form-select">
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="eq-form-group">
                <label>Parts Replaced</label>
                <input type="text" value={maintenanceForm.partsReplaced}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, partsReplaced: e.target.value })}
                  placeholder="Comma separated" className="eq-form-input" />
              </div>
              <div className="eq-form-group">
                <label>Notes</label>
                <input type="text" value={maintenanceForm.notes}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                  placeholder="Additional notes" className="eq-form-input" />
              </div>
              <div className="eq-form-actions">
                <button type="submit" className="eq-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : 'Add Maintenance'}
                </button>
                <button type="button" className="eq-btn-secondary" onClick={() => setShowMaintenanceForm(false)}>
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
    <div className={`eq-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="eq-ambient">
        <div className="eq-orb eq-orb-1" />
        <div className="eq-orb eq-orb-2" />
        <div className="eq-orb eq-orb-3" />
      </div>

      {/* Header */}
      <div className="eq-header">
        <div className="eq-header-left">
          <div className="eq-header-icon-wrapper">
            <Wrench size={22} />
            <span className="eq-header-badge"><Sparkles size={10} /> EQUIPMENT</span>
          </div>
          <div>
            <h2>Equipment &amp; Asset Management</h2>
            <p className="eq-header-subtitle">
              {stats.total} assets · {stats.onSite} on site · {Utils.formatCurrencyShort(stats.totalValue)} value
            </p>
          </div>
        </div>
        <div className="eq-header-right">
          <button className="eq-btn-ghost" onClick={loadAll}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="eq-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={15} /> New Equipment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="eq-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'inventory', label: 'Inventory', icon: Package, badge: filteredEquipment.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id}
              className={`eq-tab ${viewTab === t.id ? 'active' : ''}`}
              onClick={() => setViewTab(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="eq-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      {error && <div className="eq-message error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="eq-message success"><CheckCircle size={15} /> {success}</div>}

      {/* View */}
      {viewTab === 'overview' ? renderOverviewTab() : renderInventoryTab()}

      {/* Modals */}
      {showForm && renderFormModal()}
      {showDetailModal && renderDetailModal()}
      {showAssignmentForm && renderAssignmentForm()}
      {showReturnForm && renderReturnForm()}
      {showBulkAssignModal && renderBulkAssignModal()}
      {showMaintenanceForm && renderMaintenanceForm()}
    </div>
  );
};

export default EquipmentManagement;