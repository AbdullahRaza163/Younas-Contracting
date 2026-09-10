// src/components/EquipmentManagement.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Wrench,
  Building2,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Settings,
  Shield,
  FileText,
  MapPin,
  Package,
  LayoutDashboard,
  Users,
  Gauge,
  Timer,
  Activity,
  Award,
  Clock,
  HardHat,
  Fuel,
  Box,
  Briefcase,
  Layers,
  Zap,
  ArrowRightLeft,
  Truck,
  Home,
  History,
  Filter as FilterIcon,

  List as ListIcon,
  MoreVertical,
  ExternalLink,
  CheckSquare,
  Square
} from 'lucide-react';
import Utils from '../utils/Utils';
import './EquipmentManagement.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const EquipmentManagement = ({ data, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'site' | 'list'
  const [expandedItems, setExpandedItems] = useState({});
  const [expandedSites, setExpandedSites] = useState({});
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    yearManufactured: '',
    purchaseDate: '',
    purchasePrice: '',
    status: 'available',
    condition: 'good',
    location: '',
    siteId: '',
    maintenanceIntervalDays: 30,
    warrantyExpiry: '',
    insurancePolicy: '',
    insuranceExpiry: '',
    notes: ''
  });

  // Maintenance form
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceDate: Utils.today(),
    maintenanceType: 'routine',
    description: '',
    cost: '',
    performedBy: '',
    vendor: '',
    hoursSpent: '',
    nextMaintenanceDate: '',
    partsReplaced: '',
    status: 'completed',
    notes: ''
  });

  // Assignment form (assign equipment to site/worker)
  const [assignmentForm, setAssignmentForm] = useState({
    assignedToType: 'site',   // 'site' | 'worker'
    siteId: '',
    workerId: '',
    assignedDate: Utils.today(),
    expectedReturnDate: '',
    notes: ''
  });

  // Return form (return equipment from site/worker)
  const [returnForm, setReturnForm] = useState({
    actualReturnDate: Utils.today(),
    conditionOnReturn: 'good',
    notes: ''
  });

  // Usage form
  const [usageForm, setUsageForm] = useState({
    date: Utils.today(),
    hoursUsed: '',
    fuelUsed: '',
    fuelCost: '',
    operatorName: '',
    siteId: '',
    projectId: '',
    notes: ''
  });

  // Bulk assign form
  const [bulkAssignForm, setBulkAssignForm] = useState({
    siteId: '',
    assignedDate: Utils.today(),
    notes: ''
  });

  // ============================================
  // LOAD DATA
  // ============================================
  const loadEquipment = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/equipment`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to load equipment');
      const result = await response.json();
      setEquipment(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/equipment/categories`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to load categories');
      const result = await response.json();
      setCategories(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/equipment/assignments`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) return;
      const result = await response.json();
      setAssignments(Array.isArray(result) ? result : []);
    } catch (err) {
      console.warn('Assignments endpoint unavailable:', err.message);
    }
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/equipment/usage`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) return;
      const result = await response.json();
      setUsage(Array.isArray(result) ? result : []);
    } catch (err) {
      console.warn('Usage endpoint unavailable:', err.message);
    }
  }, []);

  const loadMaintenance = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/equipment/maintenance`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) return;
      const result = await response.json();
      setMaintenance(Array.isArray(result) ? result : []);
    } catch (err) {
      console.warn('Maintenance endpoint unavailable:', err.message);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadEquipment(),
      loadCategories(),
      loadAssignments(),
      loadUsage(),
      loadMaintenance()
    ]);
  }, [loadEquipment, loadCategories, loadAssignments, loadUsage, loadMaintenance]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ============================================
  // HELPERS — SITE / ASSIGNMENT LOOKUPS
  // ============================================
  const sitesMap = useMemo(() => {
    const m = {};
    (data.sites || []).forEach(s => { m[s.id] = s; });
    return m;
  }, [data.sites]);

  const workersMap = useMemo(() => {
    const m = {};
    (data.workers || []).forEach(w => { m[w.id] = w; });
    return m;
  }, [data.workers]);

  const getActiveAssignment = useCallback((equipmentId) => {
    return assignments.find(a =>
      a.equipmentId === equipmentId && !a.actualReturnDate
    ) || null;
  }, [assignments]);

  const getSiteForEquipment = useCallback((item) => {
    // 1. Direct site_id on equipment record
    if (item.siteId && sitesMap[item.siteId]) {
      return sitesMap[item.siteId];
    }
    // 2. Active assignment with a site
    const active = getActiveAssignment(item.id);
    if (active?.siteId && sitesMap[active.siteId]) {
      return sitesMap[active.siteId];
    }
    if (active?.assignedToType === 'site' && active.assignedToId && sitesMap[active.assignedToId]) {
      return sitesMap[active.assignedToId];
    }
    return null;
  }, [sitesMap, getActiveAssignment]);

  const getWorkerForEquipment = useCallback((item) => {
    if (item.assignedToWorkerId && workersMap[item.assignedToWorkerId]) {
      return workersMap[item.assignedToWorkerId];
    }
    const active = getActiveAssignment(item.id);
    if (active?.assignedToType === 'worker' && active.assignedToId && workersMap[active.assignedToId]) {
      return workersMap[active.assignedToId];
    }
    return null;
  }, [workersMap, getActiveAssignment]);

  const getEquipmentHistory = useCallback((equipmentId) => {
    return assignments
      .filter(a => a.equipmentId === equipmentId)
      .sort((a, b) => (b.assignedDate || '').localeCompare(a.assignedDate || ''));
  }, [assignments]);

  const getMaintenanceForEquipment = useCallback((equipmentId) => {
    return maintenance
      .filter(m => m.equipmentId === equipmentId)
      .sort((a, b) => (b.maintenanceDate || '').localeCompare(a.maintenanceDate || ''));
  }, [maintenance]);

  const getUsageForEquipment = useCallback((equipmentId) => {
    return usage
      .filter(u => u.equipmentId === equipmentId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [usage]);

  // ============================================
  // FILTER EQUIPMENT
  // ============================================
  const filteredEquipment = useMemo(() => {
    let filtered = equipment;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.name?.toLowerCase().includes(search) ||
        (e.code && e.code.toLowerCase().includes(search)) ||
        (e.model && e.model.toLowerCase().includes(search)) ||
        (e.serialNumber && e.serialNumber.toLowerCase().includes(search)) ||
        (e.location && e.location.toLowerCase().includes(search))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.categoryId === categoryFilter);
    }

    if (siteFilter !== 'all') {
      filtered = filtered.filter(e => {
        const site = getSiteForEquipment(e);
        return siteFilter === 'unassigned' ? !site : site?.id === siteFilter;
      });
    }

    return filtered;
  }, [equipment, searchTerm, statusFilter, categoryFilter, siteFilter, getSiteForEquipment]);

  // ============================================
  // GROUP EQUIPMENT BY SITE
  // ============================================
  const equipmentBySite = useMemo(() => {
    const groups = {};
    // Pre-create a group for every site
    (data.sites || []).forEach(s => {
      groups[s.id] = { site: s, items: [] };
    });
    groups['__unassigned__'] = { site: null, items: [] };

    filteredEquipment.forEach(item => {
      const site = getSiteForEquipment(item);
      if (site) {
        if (!groups[site.id]) {
          groups[site.id] = { site, items: [] };
        }
        groups[site.id].items.push(item);
      } else {
        groups['__unassigned__'].items.push(item);
      }
    });

    return Object.values(groups).filter(g => g.items.length > 0);
  }, [filteredEquipment, data.sites, getSiteForEquipment]);

  // ============================================
  // STATISTICS
  // ============================================
  const stats = useMemo(() => {
    const total = equipment.length;
    const available = equipment.filter(e => e.status === 'available').length;
    const assigned = equipment.filter(e => e.status === 'assigned').length;
    const maintenance = equipment.filter(e => e.status === 'maintenance').length;
    const repair = equipment.filter(e => e.status === 'repair').length;
    const onSite = equipment.filter(e => !!getSiteForEquipment(e)).length;
    const totalValue = equipment.reduce((sum, e) => sum + (e.currentValue || 0), 0);
    const activeAssignments = assignments.filter(a => !a.actualReturnDate).length;

    const siteDistribution = {};
    equipment.forEach(e => {
      const site = getSiteForEquipment(e);
      const key = site?.id || '__unassigned__';
      siteDistribution[key] = (siteDistribution[key] || 0) + 1;
    });

    return {
      total, available, assigned, maintenance, repair, onSite,
      totalValue, activeAssignments, siteDistribution
    };
  }, [equipment, assignments, getSiteForEquipment]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    total: {
      title: 'Total Equipment',
      details: [
        { label: 'Total Equipment', value: stats.total },
        { label: 'Available', value: stats.available },
        { label: 'Assigned', value: stats.assigned },
        { label: 'Under Maintenance', value: stats.maintenance }
      ]
    },
    available: {
      title: 'Available Equipment',
      details: [
        { label: 'Available', value: stats.available },
        { label: 'Ready for Assignment', value: stats.available },
        { label: 'Total Equipment', value: stats.total },
        { label: 'Availability Rate', value: stats.total > 0 ? `${((stats.available / stats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    assigned: {
      title: 'Assigned Equipment',
      details: [
        { label: 'Assigned', value: stats.assigned },
        { label: 'Active Site Assignments', value: stats.activeAssignments },
        { label: 'Total Equipment', value: stats.total },
        { label: 'Utilization Rate', value: stats.total > 0 ? `${((stats.assigned / stats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    onSite: {
      title: 'Currently On Site',
      details: [
        { label: 'On Site', value: stats.onSite },
        { label: 'Total Equipment', value: stats.total },
        { label: 'On-Site Rate', value: stats.total > 0 ? `${((stats.onSite / stats.total) * 100).toFixed(1)}%` : '0%' },
        { label: 'Active Sites', value: Object.keys(stats.siteDistribution).filter(k => k !== '__unassigned__' && stats.siteDistribution[k] > 0).length }
      ]
    },
    maintenance: {
      title: 'Under Maintenance',
      details: [
        { label: 'In Maintenance', value: stats.maintenance },
        { label: 'In Repair', value: stats.repair },
        { label: 'Total Unavailable', value: stats.maintenance + stats.repair },
        { label: 'Maintenance Rate', value: stats.total > 0 ? `${(((stats.maintenance + stats.repair) / stats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    value: {
      title: 'Total Asset Value',
      details: [
        { label: 'Total Value', value: Utils.formatCurrency(stats.totalValue) },
        { label: 'Average Value', value: stats.total > 0 ? Utils.formatCurrency(stats.totalValue / stats.total) : '0.000' },
        { label: 'Total Equipment', value: stats.total },
        { label: 'Asset Health', value: stats.total > 0 ? `${((stats.available / stats.total) * 100).toFixed(1)}%` : '0%' }
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
  // GET STATUS / CONDITION BADGES
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      available: { color: '#22c55e', label: 'Available', icon: CheckCircle },
      assigned: { color: '#3b82f6', label: 'Assigned', icon: User },
      maintenance: { color: '#f59e0b', label: 'Maintenance', icon: Wrench },
      repair: { color: '#ef4444', label: 'Repair', icon: AlertCircle },
      out_of_service: { color: '#6b7280', label: 'Out of Service', icon: AlertCircle },
      disposed: { color: '#8b949e', label: 'Disposed', icon: X }
    };
    const c = config[status] || config.available;
    const Icon = c.icon;
    return (
      <span className={`eq-status-badge ${status}`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  const getConditionBadge = (condition) => {
    const config = {
      excellent: { color: '#22c55e', label: 'Excellent' },
      good: { color: '#3b82f6', label: 'Good' },
      fair: { color: '#f59e0b', label: 'Fair' },
      poor: { color: '#f97316', label: 'Poor' },
      critical: { color: '#ef4444', label: 'Critical' }
    };
    const c = config[condition] || config.good;
    return (
      <span className={`eq-condition-badge ${condition}`}>
        {c.label}
      </span>
    );
  };

  // ============================================
  // GET CATEGORY ICON
  // ============================================
  const getCategoryIcon = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    const iconMap = {
      'excavator': <HardHat size={20} />,
      'bulldozer': <HardHat size={20} />,
      'crane': <Briefcase size={20} />,
      'loader': <Package size={20} />,
      'truck': <Truck size={20} />,
      'generator': <Zap size={20} />,
      'compressor': <Settings size={20} />,
      'pump': <Fuel size={20} />,
      'welder': <Wrench size={20} />,
      'forklift': <Layers size={20} />,
      'default': <Wrench size={20} />
    };
    const iconKey = cat?.name?.toLowerCase() || 'default';
    return iconMap[iconKey] || iconMap.default;
  };

  // ============================================
  // HANDLE CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId
        ? `${API_BASE_URL}/equipment/${editingId}`
        : `${API_BASE_URL}/equipment`;
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
        throw new Error(errorData.error || 'Failed to save equipment');
      }

      setSuccess(editingId ? 'Equipment updated successfully!' : 'Equipment created successfully!');
      await loadAll();
      if (refreshData) await refreshData();
      resetForm();
      setShowForm(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this equipment?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/equipment/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to delete equipment');

      setSuccess('Equipment deleted successfully!');
      await loadAll();
      if (refreshData) await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      yearManufactured: '',
      purchaseDate: '',
      purchasePrice: '',
      status: 'available',
      condition: 'good',
      location: '',
      siteId: '',
      maintenanceIntervalDays: 30,
      warrantyExpiry: '',
      insurancePolicy: '',
      insuranceExpiry: '',
      notes: ''
    });
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      categoryId: item.categoryId || '',
      manufacturer: item.manufacturer || '',
      model: item.model || '',
      serialNumber: item.serialNumber || '',
      yearManufactured: item.yearManufactured || '',
      purchaseDate: item.purchaseDate || '',
      purchasePrice: item.purchasePrice || '',
      status: item.status || 'available',
      condition: item.condition || 'good',
      location: item.location || '',
      siteId: item.siteId || '',
      maintenanceIntervalDays: item.maintenanceIntervalDays || 30,
      warrantyExpiry: item.warrantyExpiry || '',
      insurancePolicy: item.insurancePolicy || '',
      insuranceExpiry: item.insuranceExpiry || '',
      notes: item.notes || ''
    });
    setShowForm(true);
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleSiteExpand = (siteId) => {
    setExpandedSites(prev => ({
      ...prev,
      [siteId]: !prev[siteId]
    }));
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredEquipment.map(e => e.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // ============================================
  // SITE ASSIGNMENT ACTIONS
  // ============================================
  const openAssignModal = (item) => {
    setSelectedEquipment(item);
    setAssignmentForm({
      assignedToType: 'site',
      siteId: item.siteId || '',
      workerId: '',
      assignedDate: Utils.today(),
      expectedReturnDate: '',
      notes: ''
    });
    setShowAssignmentForm(true);
  };

  const openReturnModal = (item) => {
    setSelectedEquipment(item);
    setReturnForm({
      actualReturnDate: Utils.today(),
      conditionOnReturn: item.condition || 'good',
      notes: ''
    });
    setShowReturnForm(true);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        equipmentId: selectedEquipment.id,
        assignedToType: assignmentForm.assignedToType,
        assignedToId: assignmentForm.assignedToType === 'site'
          ? assignmentForm.siteId
          : assignmentForm.workerId,
        siteId: assignmentForm.assignedToType === 'site' ? assignmentForm.siteId : null,
        workerId: assignmentForm.assignedToType === 'worker' ? assignmentForm.workerId : null,
        assignedDate: assignmentForm.assignedDate,
        expectedReturnDate: assignmentForm.expectedReturnDate || null,
        notes: assignmentForm.notes
      };

      const response = await fetch(`${API_BASE_URL}/equipment/${selectedEquipment.id}/assign`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to assign equipment');
      }

      setSuccess('Equipment assigned successfully!');
      await loadAll();
      if (refreshData) await refreshData();
      setShowAssignmentForm(false);
      setSelectedEquipment(null);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        equipmentId: selectedEquipment.id,
        actualReturnDate: returnForm.actualReturnDate,
        conditionOnReturn: returnForm.conditionOnReturn,
        notes: returnForm.notes
      };

      const response = await fetch(`${API_BASE_URL}/equipment/${selectedEquipment.id}/return`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to return equipment');
      }

      setSuccess('Equipment returned successfully!');
      await loadAll();
      if (refreshData) await refreshData();
      setShowReturnForm(false);
      setSelectedEquipment(null);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    if (!bulkAssignForm.siteId || selectedIds.length === 0) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Assign each selected equipment to the same site
      const results = await Promise.all(selectedIds.map(id =>
        fetch(`${API_BASE_URL}/equipment/${id}/assign`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            equipmentId: id,
            assignedToType: 'site',
            assignedToId: bulkAssignForm.siteId,
            siteId: bulkAssignForm.siteId,
            assignedDate: bulkAssignForm.assignedDate,
            notes: bulkAssignForm.notes
          })
        })
      ));

      const failures = results.filter(r => !r.ok);
      if (failures.length > 0) {
        throw new Error(`${failures.length} of ${selectedIds.length} assignments failed`);
      }

      setSuccess(`${selectedIds.length} equipment assigned to site!`);
      await loadAll();
      if (refreshData) await refreshData();
      setShowBulkAssignModal(false);
      setSelectedIds([]);
      setBulkAssignForm({ siteId: '', assignedDate: Utils.today(), notes: '' });
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HANDLE MAINTENANCE
  // ============================================
  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/equipment/${selectedEquipment.id}/maintenance`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maintenanceForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add maintenance');
      }

      setSuccess('Maintenance record added successfully!');
      await loadAll();
      if (refreshData) await refreshData();
      setShowMaintenanceForm(false);
      setMaintenanceForm({
        maintenanceDate: Utils.today(),
        maintenanceType: 'routine',
        description: '',
        cost: '',
        performedBy: '',
        vendor: '',
        hoursSpent: '',
        nextMaintenanceDate: '',
        partsReplaced: '',
        status: 'completed',
        notes: ''
      });
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER EQUIPMENT CARD
  // ============================================
  const renderEquipmentCard = (item) => {
    const isExpanded = expandedItems[item.id];
    const site = getSiteForEquipment(item);
    const worker = getWorkerForEquipment(item);
    const isSelected = selectedIds.includes(item.id);

    return (
      <div
        key={item.id}
        className={`eq-card ${isSelected ? 'eq-card-selected' : ''}`}
        onMouseEnter={() => setHoveredCard(item.id)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div className="eq-card-header">
          <div className="eq-info">
            <button
              className="eq-select-toggle"
              onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
              title={isSelected ? 'Unselect' : 'Select'}
              type="button"
            >
              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>
            <div className="eq-icon-wrapper">
              <span className="eq-icon">{getCategoryIcon(item.categoryId)}</span>
              <span className={`eq-status-dot ${item.status}`}></span>
            </div>
            <div>
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
          {/* Site assignment strip */}
          {site ? (
            <div className="eq-site-strip eq-site-strip-active">
              <div className="eq-site-strip-left">
                <Building2 size={14} />
                <div>
                  <div className="eq-site-strip-label">Currently at</div>
                  <div className="eq-site-strip-name">{site.name}</div>
                </div>
              </div>
              {worker && (
                <div className="eq-site-strip-worker">
                  <User size={12} />
                  <span>{worker.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="eq-site-strip eq-site-strip-empty">
              <div className="eq-site-strip-left">
                <Home size={14} />
                <div>
                  <div className="eq-site-strip-label">Not assigned</div>
                  <div className="eq-site-strip-name">In storage / Available</div>
                </div>
              </div>
            </div>
          )}

          <div className="eq-details-grid">
            {item.categoryName && (
              <div className="eq-detail-item">
                <LayoutDashboard size={14} />
                <span>{item.categoryName}</span>
              </div>
            )}
            {item.manufacturer && (
              <div className="eq-detail-item">
                <Building2 size={14} />
                <span>{item.manufacturer}</span>
              </div>
            )}
            {item.model && (
              <div className="eq-detail-item">
                <Settings size={14} />
                <span>{item.model}</span>
              </div>
            )}
            {item.serialNumber && (
              <div className="eq-detail-item">
                <FileText size={14} />
                <span>{item.serialNumber}</span>
              </div>
            )}
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
              <span className="eq-stat-label">Maintenance</span>
              <span className="eq-stat-value">{getMaintenanceForEquipment(item.id).length || item.maintenanceCount || 0}</span>
            </div>
          </div>

          {item.location && (
            <div className="eq-location">
              <MapPin size={14} />
              <span>{item.location}</span>
            </div>
          )}

          {item.nextMaintenanceDate && (
            <div className="eq-maintenance-date">
              <Calendar size={14} />
              <span>Next Maintenance: {Utils.formatDate(item.nextMaintenanceDate)}</span>
            </div>
          )}
        </div>

        <div className="eq-card-footer">
          <div className="eq-actions">
            {site ? (
              <button
                className="eq-btn-icon eq-btn-return"
                onClick={() => openReturnModal(item)}
                title="Return to storage"
              >
                <Home size={16} />
              </button>
            ) : (
              <button
                className="eq-btn-icon eq-btn-assign"
                onClick={() => openAssignModal(item)}
                title="Assign to site"
              >
                <ArrowRightLeft size={16} />
              </button>
            )}
            <button
              className="eq-btn-icon"
              onClick={() => {
                setSelectedEquipment(item);
                setShowDetailModal(true);
                setActiveTab('overview');
              }}
              title="View Details"
            >
              <Eye size={16} />
            </button>
            <button
              className="eq-btn-icon"
              onClick={() => handleEdit(item)}
              title="Edit"
            >
              <Edit size={16} />
            </button>
            <button
              className="eq-btn-icon eq-btn-danger"
              onClick={() => handleDelete(item.id)}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
            <button
              className="eq-btn-icon eq-btn-expand"
              onClick={() => toggleExpand(item.id)}
              title="Expand"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="eq-expanded">
            <div className="eq-expanded-grid">
              <div className="eq-expanded-item">
                <Calendar size={14} />
                <span><strong>Purchase:</strong> {item.purchaseDate ? Utils.formatDate(item.purchaseDate) : 'N/A'}</span>
              </div>
              <div className="eq-expanded-item">
                <DollarSign size={14} />
                <span><strong>Price:</strong> {Utils.formatCurrency(item.purchasePrice || 0)}</span>
              </div>
              <div className="eq-expanded-item">
                <Gauge size={14} />
                <span><strong>Depreciation:</strong> {item.depreciationMethod || 'Straight Line'} ({item.depreciationRate || 10}%)</span>
              </div>
              <div className="eq-expanded-item">
                <Timer size={14} />
                <span><strong>Useful Life:</strong> {item.usefulLifeYears || 5} years</span>
              </div>
              <div className="eq-expanded-item">
                <Award size={14} />
                <span><strong>Salvage Value:</strong> {Utils.formatCurrency(item.salvageValue || 0)}</span>
              </div>
              {item.warrantyExpiry && (
                <div className="eq-expanded-item">
                  <Shield size={14} />
                  <span><strong>Warranty:</strong> {Utils.formatDate(item.warrantyExpiry)}</span>
                </div>
              )}
            </div>
            {item.notes && (
              <div className="eq-expanded-notes">
                <FileText size={14} />
                <span><strong>Notes:</strong> {item.notes}</span>
              </div>
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
        <button
          className="eq-select-toggle"
          onClick={() => toggleSelect(item.id)}
          type="button"
        >
          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
        <div className="eq-row-icon">{getCategoryIcon(item.categoryId)}</div>
        <div className="eq-row-main">
          <div className="eq-row-name">{item.name}</div>
          <div className="eq-row-code">{item.code || `EQ-${String(item.id).padStart(4, '0')}`}</div>
        </div>
        <div className="eq-row-col">{item.categoryName || '—'}</div>
        <div className="eq-row-col">{getStatusBadge(item.status)}</div>
        <div className="eq-row-col eq-row-site">
          {site ? (
            <span className="eq-row-site-name">
              <Building2 size={12} /> {site.name}
            </span>
          ) : (
            <span className="eq-row-site-empty">—</span>
          )}
        </div>
        <div className="eq-row-col eq-row-worker">
          {worker ? (
            <span className="eq-row-worker-name"><User size={12} /> {worker.name}</span>
          ) : (
            <span className="eq-row-worker-empty">—</span>
          )}
        </div>
        <div className="eq-row-col eq-row-value">
          {Utils.formatCurrencyShort(item.currentValue || 0)}
        </div>
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
  // RENDER DETAIL MODAL
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
      <div className="eq-modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="eq-modal-content eq-detail-modal" onClick={ev => ev.stopPropagation()}>
          <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #1a2332, #2a3a4a)' }}>
            <div className="eq-modal-header-left">
              <div className="eq-modal-icon-large">
                {getCategoryIcon(e.categoryId)}
              </div>
              <div>
                <h3 style={{ color: '#ffffff' }}>{e.name}</h3>
                <div className="eq-modal-subtitle" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {e.code || `EQ-${String(e.id).padStart(4, '0')}`}
                  {site && <> · <Building2 size={12} style={{ verticalAlign: '-2px' }} /> {site.name}</>}
                </div>
              </div>
            </div>
            <div className="eq-modal-actions">
              {site ? (
                <button className="eq-modal-btn-edit" onClick={() => { setShowDetailModal(false); openReturnModal(e); }}>
                  <Home size={16} /> Return
                </button>
              ) : (
                <button className="eq-modal-btn-edit" onClick={() => { setShowDetailModal(false); openAssignModal(e); }}>
                  <ArrowRightLeft size={16} /> Assign
                </button>
              )}
              <button className="eq-modal-btn-edit" onClick={() => { setShowDetailModal(false); handleEdit(e); }}>
                <Edit size={16} /> Edit
              </button>
              <button className="eq-modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} color="#ffffff" />
              </button>
            </div>
          </div>

          <div className="eq-modal-body">
            {/* Site banner */}
            {site && (
              <div className="eq-detail-site-banner">
                <div className="eq-detail-site-banner-left">
                  <div className="eq-detail-site-banner-icon">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div className="eq-detail-site-banner-label">Currently assigned to</div>
                    <div className="eq-detail-site-banner-name">{site.name}</div>
                    {site.location && <div className="eq-detail-site-banner-loc">{site.location}</div>}
                  </div>
                </div>
                {worker && (
                  <div className="eq-detail-site-banner-worker">
                    <User size={14} />
                    <span>Operator: {worker.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="eq-detail-tabs">
              <button
                className={`eq-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <LayoutDashboard size={14} /> Overview
              </button>
              <button
                className={`eq-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <History size={14} /> Site History
                {history.length > 0 && <span className="eq-tab-count">{history.length}</span>}
              </button>
              <button
                className={`eq-tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
                onClick={() => setActiveTab('maintenance')}
              >
                <Wrench size={14} /> Maintenance
                {maintenanceRecords.length > 0 && <span className="eq-tab-count">{maintenanceRecords.length}</span>}
              </button>
              <button
                className={`eq-tab-btn ${activeTab === 'usage' ? 'active' : ''}`}
                onClick={() => setActiveTab('usage')}
              >
                <Activity size={14} /> Usage
                {usageRecords.length > 0 && <span className="eq-tab-count">{usageRecords.length}</span>}
              </button>
              <button
                className={`eq-tab-btn ${activeTab === 'depreciation' ? 'active' : ''}`}
                onClick={() => setActiveTab('depreciation')}
              >
                <TrendingDown size={14} /> Depreciation
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="eq-overview-tab">
                <div className="eq-info-grid">
                  <div className="eq-info-item">
                    <span className="eq-info-label">Category</span>
                    <span className="eq-info-value">{e.categoryName || 'N/A'}</span>
                  </div>
                  <div className="eq-info-item">
                    <span className="eq-info-label">Manufacturer</span>
                    <span className="eq-info-value">{e.manufacturer || 'N/A'}</span>
                  </div>
                  <div className="eq-info-item">
                    <span className="eq-info-label">Model</span>
                    <span className="eq-info-value">{e.model || 'N/A'}</span>
                  </div>
                  <div className="eq-info-item">
                    <span className="eq-info-label">Serial Number</span>
                    <span className="eq-info-value">{e.serialNumber || 'N/A'}</span>
                  </div>
                  <div className="eq-info-item">
                    <span className="eq-info-label">Year Manufactured</span>
                    <span className="eq-info-value">{e.yearManufactured || 'N/A'}</span>
                  </div>
                  <div className="eq-info-item">
                    <span className="eq-info-label">Status</span>
                    <span className="eq-info-value">{getStatusBadge(e.status)}</span>
                  </div>
                  <div className="eq-info-item">
                    <span className="eq-info-label">Condition</span>
                    <span className="eq-info-value">{getConditionBadge(e.condition)}</span>
                  </div>
                  <div className="eq-info-item">
                    <span className="eq-info-label">Current Site</span>
                    <span className="eq-info-value">{site?.name || 'Unassigned'}</span>
                  </div>
                  <div className="eq-info-item">
                    <span className="eq-info-label">Location</span>
                    <span className="eq-info-value">{e.location || 'N/A'}</span>
                  </div>
                  <div className="eq-info-item">
                    <span className="eq-info-label">Total Hours</span>
                    <span className="eq-info-value">{e.totalHoursUsed?.toFixed(1) || 0}h</span>
                  </div>
                </div>

                <div className="eq-financial-section">
                  <h4><DollarSign size={16} /> Financial Information</h4>
                  <div className="eq-financial-grid">
                    <div className="eq-fin-item">
                      <span className="eq-fin-label">Purchase Date</span>
                      <span className="eq-fin-value">{e.purchaseDate ? Utils.formatDate(e.purchaseDate) : 'N/A'}</span>
                    </div>
                    <div className="eq-fin-item">
                      <span className="eq-fin-label">Purchase Price</span>
                      <span className="eq-fin-value">{Utils.formatCurrency(e.purchasePrice || 0)}</span>
                    </div>
                    <div className="eq-fin-item">
                      <span className="eq-fin-label">Current Value</span>
                      <span className="eq-fin-value" style={{ color: '#22c55e' }}>{Utils.formatCurrency(e.currentValue || 0)}</span>
                    </div>
                    <div className="eq-fin-item">
                      <span className="eq-fin-label">Depreciation Method</span>
                      <span className="eq-fin-value">{e.depreciationMethod || 'Straight Line'}</span>
                    </div>
                    <div className="eq-fin-item">
                      <span className="eq-fin-label">Depreciation Rate</span>
                      <span className="eq-fin-value">{e.depreciationRate || 10}%</span>
                    </div>
                    <div className="eq-fin-item">
                      <span className="eq-fin-label">Useful Life</span>
                      <span className="eq-fin-value">{e.usefulLifeYears || 5} years</span>
                    </div>
                    <div className="eq-fin-item">
                      <span className="eq-fin-label">Salvage Value</span>
                      <span className="eq-fin-value">{Utils.formatCurrency(e.salvageValue || 0)}</span>
                    </div>
                    <div className="eq-fin-item">
                      <span className="eq-fin-label">Maintenance Cost</span>
                      <span className="eq-fin-value" style={{ color: '#ef4444' }}>{Utils.formatCurrency(e.totalMaintenanceCost || 0)}</span>
                    </div>
                  </div>
                </div>

                {e.notes && (
                  <div className="eq-notes-section">
                    <h4><FileText size={16} /> Notes</h4>
                    <p>{e.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Site History Tab */}
            {activeTab === 'history' && (
              <div className="eq-history-tab">
                {history.length === 0 ? (
                  <div className="eq-empty-tab">
                    <div className="eq-empty-icon-wrapper">
                      <History size={48} />
                    </div>
                    <h3>No assignment history</h3>
                    <p>Assign this equipment to a site to start tracking its movements.</p>
                    {!site && (
                      <button className="eq-btn-primary" style={{ marginTop: '12px' }} onClick={() => { setShowDetailModal(false); openAssignModal(e); }}>
                        <ArrowRightLeft size={16} /> Assign to Site
                      </button>
                    )}
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
                            <span className={`eq-history-dot ${isActive ? 'active' : ''}`}></span>
                            {i < history.length - 1 && <span className="eq-history-line"></span>}
                          </div>
                          <div className="eq-history-body">
                            <div className="eq-history-head">
                              <div className="eq-history-site">
                                {aSite ? (
                                  <><Building2 size={14} /> <strong>{aSite.name}</strong></>
                                ) : (
                                  <><Home size={14} /> <strong>Storage</strong></>
                                )}
                              </div>
                              {isActive && <span className="eq-history-current">Current</span>}
                            </div>
                            <div className="eq-history-meta">
                              <span><Calendar size={12} /> {a.assignedDate ? Utils.formatDate(a.assignedDate) : '—'}</span>
                              {a.actualReturnDate && (
                                <span><Calendar size={12} /> Returned {Utils.formatDate(a.actualReturnDate)}</span>
                              )}
                              {a.expectedReturnDate && !a.actualReturnDate && (
                                <span><Clock size={12} /> Due {Utils.formatDate(a.expectedReturnDate)}</span>
                              )}
                              {aWorker && (
                                <span><User size={12} /> {aWorker.name}</span>
                              )}
                            </div>
                            {a.notes && (
                              <div className="eq-history-notes">
                                <FileText size={12} /> {a.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
              <div className="eq-history-tab">
                {maintenanceRecords.length === 0 ? (
                  <div className="eq-empty-tab">
                    <div className="eq-empty-icon-wrapper">
                      <Wrench size={48} />
                    </div>
                    <h3>No maintenance records</h3>
                    <p>Add maintenance records to track servicing and repairs.</p>
                    <button className="eq-btn-primary" style={{ marginTop: '12px' }} onClick={() => setShowMaintenanceForm(true)}>
                      <Plus size={16} /> Add Maintenance
                    </button>
                  </div>
                ) : (
                  <div className="eq-history-list">
                    {maintenanceRecords.map((m, i) => (
                      <div key={m.id || i} className="eq-history-item">
                        <div className="eq-history-timeline">
                          <span className="eq-history-dot"></span>
                          {i < maintenanceRecords.length - 1 && <span className="eq-history-line"></span>}
                        </div>
                        <div className="eq-history-body">
                          <div className="eq-history-head">
                            <div className="eq-history-site">
                              <Wrench size={14} /> <strong>{m.maintenanceType || 'Maintenance'}</strong>
                            </div>
                            <span className="eq-history-cost">
                              {Utils.formatCurrency(m.cost || 0)}
                            </span>
                          </div>
                          <div className="eq-history-meta">
                            <span><Calendar size={12} /> {m.maintenanceDate ? Utils.formatDate(m.maintenanceDate) : '—'}</span>
                            {m.performedBy && <span><User size={12} /> {m.performedBy}</span>}
                            {m.vendor && <span><Building2 size={12} /> {m.vendor}</span>}
                            {m.hoursSpent && <span><Clock size={12} /> {m.hoursSpent}h</span>}
                          </div>
                          {m.description && (
                            <div className="eq-history-notes">
                              <FileText size={12} /> {m.description}
                            </div>
                          )}
                          {m.partsReplaced && (
                            <div className="eq-history-notes">
                              <Package size={12} /> {m.partsReplaced}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && (
              <div className="eq-history-tab">
                {usageRecords.length === 0 ? (
                  <div className="eq-empty-tab">
                    <div className="eq-empty-icon-wrapper">
                      <Activity size={48} />
                    </div>
                    <h3>No usage records</h3>
                    <p>Track daily hours, fuel, and operator usage.</p>
                  </div>
                ) : (
                  <div className="eq-history-list">
                    {usageRecords.map((u, i) => (
                      <div key={u.id || i} className="eq-history-item">
                        <div className="eq-history-timeline">
                          <span className="eq-history-dot"></span>
                          {i < usageRecords.length - 1 && <span className="eq-history-line"></span>}
                        </div>
                        <div className="eq-history-body">
                          <div className="eq-history-head">
                            <div className="eq-history-site">
                              <Activity size={14} /> <strong>{u.date ? Utils.formatDate(u.date) : '—'}</strong>
                            </div>
                            {u.hoursUsed && (
                              <span className="eq-history-cost">{u.hoursUsed}h</span>
                            )}
                          </div>
                          <div className="eq-history-meta">
                            {u.siteId && sitesMap[u.siteId] && <span><Building2 size={12} /> {sitesMap[u.siteId].name}</span>}
                            {u.operatorName && <span><User size={12} /> {u.operatorName}</span>}
                            {u.fuelUsed && <span><Fuel size={12} /> {u.fuelUsed}L</span>}
                            {u.fuelCost && <span><DollarSign size={12} /> {Utils.formatCurrency(u.fuelCost)}</span>}
                          </div>
                          {u.notes && (
                            <div className="eq-history-notes">
                              <FileText size={12} /> {u.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Depreciation Tab */}
            {activeTab === 'depreciation' && (
              <div className="eq-depreciation-tab">
                <div className="eq-depreciation-grid">
                  <div className="eq-dep-card">
                    <div className="eq-dep-label">Purchase Price</div>
                    <div className="eq-dep-value">{Utils.formatCurrency(e.purchasePrice || 0)}</div>
                  </div>
                  <div className="eq-dep-card">
                    <div className="eq-dep-label">Current Value</div>
                    <div className="eq-dep-value" style={{ color: '#22c55e' }}>{Utils.formatCurrency(e.currentValue || 0)}</div>
                  </div>
                  <div className="eq-dep-card">
                    <div className="eq-dep-label">Total Depreciated</div>
                    <div className="eq-dep-value" style={{ color: '#ef4444' }}>
                      {Utils.formatCurrency((e.purchasePrice || 0) - (e.currentValue || 0))}
                    </div>
                  </div>
                  <div className="eq-dep-card">
                    <div className="eq-dep-label">Depreciation Rate</div>
                    <div className="eq-dep-value">{e.depreciationRate || 10}% / year</div>
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
    );
  };

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = () => {
    return (
      <div className="eq-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
        <div className="eq-modal-content eq-form-modal" onClick={ev => ev.stopPropagation()}>
          <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="eq-modal-header-left">
              <Package size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Equipment' : 'New Equipment'}</h3>
            </div>
            <button className="eq-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="eq-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Equipment Name <span className="eq-required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Equipment name"
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="eq-form-select"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Manufacturer</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="Manufacturer"
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Model"
                    className="eq-form-input"
                  />
                </div>
              </div>

              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Serial Number</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="Serial number"
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Year Manufactured</label>
                  <input
                    type="number"
                    value={formData.yearManufactured}
                    onChange={e => setFormData({ ...formData, yearManufactured: e.target.value })}
                    placeholder="Year"
                    className="eq-form-input"
                  />
                </div>
              </div>

              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Purchase Price (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.purchasePrice}
                    onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                    placeholder="0.000"
                    className="eq-form-input"
                  />
                </div>
              </div>

              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="eq-form-select"
                  >
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
                  <select
                    value={formData.condition}
                    onChange={e => setFormData({ ...formData, condition: e.target.value })}
                    className="eq-form-select"
                  >
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
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Location"
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Site</label>
                  <select
                    value={formData.siteId}
                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                    className="eq-form-select"
                  >
                    <option value="">Select Site</option>
                    {data.sites?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Maintenance Interval (days)</label>
                  <input
                    type="number"
                    value={formData.maintenanceIntervalDays}
                    onChange={e => setFormData({ ...formData, maintenanceIntervalDays: e.target.value })}
                    placeholder="30"
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Warranty Expiry</label>
                  <input
                    type="date"
                    value={formData.warrantyExpiry}
                    onChange={e => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                    className="eq-form-input"
                  />
                </div>
              </div>

              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Insurance Policy</label>
                  <input
                    type="text"
                    value={formData.insurancePolicy}
                    onChange={e => setFormData({ ...formData, insurancePolicy: e.target.value })}
                    placeholder="Insurance policy number"
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Insurance Expiry</label>
                  <input
                    type="date"
                    value={formData.insuranceExpiry}
                    onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    className="eq-form-input"
                  />
                </div>
              </div>

              <div className="eq-form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows="2"
                  className="eq-form-textarea"
                />
              </div>

              <div className="eq-form-actions">
                <button type="submit" className="eq-btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="eq-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
  // RENDER ASSIGNMENT FORM MODAL
  // ============================================
  const renderAssignmentForm = () => {
    if (!selectedEquipment) return null;
    return (
      <div className="eq-modal-overlay" onClick={() => { setShowAssignmentForm(false); setSelectedEquipment(null); }}>
        <div className="eq-modal-content eq-assignment-modal" onClick={ev => ev.stopPropagation()}>
          <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <div className="eq-modal-header-left">
              <ArrowRightLeft size={24} color="#ffffff" />
              <div>
                <h3 style={{ color: '#ffffff' }}>Assign Equipment</h3>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{selectedEquipment.name}</div>
              </div>
            </div>
            <button className="eq-modal-close" onClick={() => { setShowAssignmentForm(false); setSelectedEquipment(null); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="eq-modal-body">
            <form onSubmit={handleAssign}>
              <div className="eq-form-group">
                <label>Assign To <span className="eq-required">*</span></label>
                <div className="eq-toggle-group">
                  <button
                    type="button"
                    className={`eq-toggle-btn ${assignmentForm.assignedToType === 'site' ? 'active' : ''}`}
                    onClick={() => setAssignmentForm({ ...assignmentForm, assignedToType: 'site' })}
                  >
                    <Building2 size={14} /> Site
                  </button>
                  <button
                    type="button"
                    className={`eq-toggle-btn ${assignmentForm.assignedToType === 'worker' ? 'active' : ''}`}
                    onClick={() => setAssignmentForm({ ...assignmentForm, assignedToType: 'worker' })}
                  >
                    <User size={14} /> Worker
                  </button>
                </div>
              </div>

              {assignmentForm.assignedToType === 'site' ? (
                <div className="eq-form-group">
                  <label>Site <span className="eq-required">*</span></label>
                  <select
                    value={assignmentForm.siteId}
                    onChange={e => setAssignmentForm({ ...assignmentForm, siteId: e.target.value })}
                    required
                    className="eq-form-select"
                  >
                    <option value="">Select Site</option>
                    {data.sites?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="eq-form-group">
                  <label>Worker <span className="eq-required">*</span></label>
                  <select
                    value={assignmentForm.workerId}
                    onChange={e => setAssignmentForm({ ...assignmentForm, workerId: e.target.value })}
                    required
                    className="eq-form-select"
                  >
                    <option value="">Select Worker</option>
                    {data.workers?.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Assigned Date <span className="eq-required">*</span></label>
                  <input
                    type="date"
                    value={assignmentForm.assignedDate}
                    onChange={e => setAssignmentForm({ ...assignmentForm, assignedDate: e.target.value })}
                    required
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Expected Return</label>
                  <input
                    type="date"
                    value={assignmentForm.expectedReturnDate}
                    onChange={e => setAssignmentForm({ ...assignmentForm, expectedReturnDate: e.target.value })}
                    className="eq-form-input"
                  />
                </div>
              </div>

              <div className="eq-form-group">
                <label>Notes</label>
                <textarea
                  value={assignmentForm.notes}
                  onChange={e => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                  placeholder="Purpose or additional notes"
                  rows="2"
                  className="eq-form-textarea"
                />
              </div>

              <div className="eq-form-actions">
                <button type="submit" className="eq-btn-primary" disabled={loading}>
                  <ArrowRightLeft size={16} /> {loading ? 'Assigning...' : 'Assign'}
                </button>
                <button type="button" className="eq-btn-secondary" onClick={() => { setShowAssignmentForm(false); setSelectedEquipment(null); }}>
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
  // RENDER RETURN FORM MODAL
  // ============================================
  const renderReturnForm = () => {
    if (!selectedEquipment) return null;
    const activeSite = getSiteForEquipment(selectedEquipment);
    return (
      <div className="eq-modal-overlay" onClick={() => { setShowReturnForm(false); setSelectedEquipment(null); }}>
        <div className="eq-modal-content eq-assignment-modal" onClick={ev => ev.stopPropagation()}>
          <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="eq-modal-header-left">
              <Home size={24} color="#ffffff" />
              <div>
                <h3 style={{ color: '#ffffff' }}>Return Equipment</h3>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                  {selectedEquipment.name} {activeSite && `· from ${activeSite.name}`}
                </div>
              </div>
            </div>
            <button className="eq-modal-close" onClick={() => { setShowReturnForm(false); setSelectedEquipment(null); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="eq-modal-body">
            <form onSubmit={handleReturn}>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Return Date <span className="eq-required">*</span></label>
                  <input
                    type="date"
                    value={returnForm.actualReturnDate}
                    onChange={e => setReturnForm({ ...returnForm, actualReturnDate: e.target.value })}
                    required
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Condition on Return</label>
                  <select
                    value={returnForm.conditionOnReturn}
                    onChange={e => setReturnForm({ ...returnForm, conditionOnReturn: e.target.value })}
                    className="eq-form-select"
                  >
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
                <textarea
                  value={returnForm.notes}
                  onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="Any damage or issues noted"
                  rows="2"
                  className="eq-form-textarea"
                />
              </div>

              <div className="eq-form-actions">
                <button type="submit" className="eq-btn-primary" disabled={loading}>
                  <Home size={16} /> {loading ? 'Returning...' : 'Mark as Returned'}
                </button>
                <button type="button" className="eq-btn-secondary" onClick={() => { setShowReturnForm(false); setSelectedEquipment(null); }}>
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
  // RENDER BULK ASSIGN MODAL
  // ============================================
  const renderBulkAssignModal = () => {
    return (
      <div className="eq-modal-overlay" onClick={() => setShowBulkAssignModal(false)}>
        <div className="eq-modal-content eq-assignment-modal" onClick={ev => ev.stopPropagation()}>
          <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <div className="eq-modal-header-left">
              <ArrowRightLeft size={24} color="#ffffff" />
              <div>
                <h3 style={{ color: '#ffffff' }}>Bulk Assign to Site</h3>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                  {selectedIds.length} equipment selected
                </div>
              </div>
            </div>
            <button className="eq-modal-close" onClick={() => setShowBulkAssignModal(false)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="eq-modal-body">
            <form onSubmit={handleBulkAssign}>
              <div className="eq-form-group">
                <label>Site <span className="eq-required">*</span></label>
                <select
                  value={bulkAssignForm.siteId}
                  onChange={e => setBulkAssignForm({ ...bulkAssignForm, siteId: e.target.value })}
                  required
                  className="eq-form-select"
                >
                  <option value="">Select Site</option>
                  {data.sites?.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="eq-form-group">
                <label>Assigned Date</label>
                <input
                  type="date"
                  value={bulkAssignForm.assignedDate}
                  onChange={e => setBulkAssignForm({ ...bulkAssignForm, assignedDate: e.target.value })}
                  className="eq-form-input"
                />
              </div>
              <div className="eq-form-group">
                <label>Notes</label>
                <textarea
                  value={bulkAssignForm.notes}
                  onChange={e => setBulkAssignForm({ ...bulkAssignForm, notes: e.target.value })}
                  placeholder="Notes for this assignment"
                  rows="2"
                  className="eq-form-textarea"
                />
              </div>
              <div className="eq-form-actions">
                <button type="submit" className="eq-btn-primary" disabled={loading}>
                  <ArrowRightLeft size={16} /> {loading ? 'Assigning...' : `Assign ${selectedIds.length} items`}
                </button>
                <button type="button" className="eq-btn-secondary" onClick={() => setShowBulkAssignModal(false)}>
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
  // RENDER MAINTENANCE FORM MODAL
  // ============================================
  const renderMaintenanceForm = () => {
    return (
      <div className="eq-modal-overlay" onClick={() => setShowMaintenanceForm(false)}>
        <div className="eq-modal-content eq-maintenance-form-modal" onClick={ev => ev.stopPropagation()}>
          <div className="eq-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="eq-modal-header-left">
              <Wrench size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Add Maintenance Record</h3>
            </div>
            <button className="eq-modal-close" onClick={() => setShowMaintenanceForm(false)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="eq-modal-body">
            <form onSubmit={handleAddMaintenance}>
              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Maintenance Date <span className="eq-required">*</span></label>
                  <input
                    type="date"
                    value={maintenanceForm.maintenanceDate}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, maintenanceDate: e.target.value })}
                    required
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Type <span className="eq-required">*</span></label>
                  <select
                    value={maintenanceForm.maintenanceType}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, maintenanceType: e.target.value })}
                    required
                    className="eq-form-select"
                  >
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
                <textarea
                  value={maintenanceForm.description}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  placeholder="Maintenance description"
                  rows="2"
                  className="eq-form-textarea"
                />
              </div>

              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Cost (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={maintenanceForm.cost}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                    placeholder="0.000"
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Performed By</label>
                  <input
                    type="text"
                    value={maintenanceForm.performedBy}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, performedBy: e.target.value })}
                    placeholder="Who performed maintenance"
                    className="eq-form-input"
                  />
                </div>
              </div>

              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Vendor</label>
                  <input
                    type="text"
                    value={maintenanceForm.vendor}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, vendor: e.target.value })}
                    placeholder="Maintenance vendor"
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Hours Spent</label>
                  <input
                    type="number"
                    step="0.5"
                    value={maintenanceForm.hoursSpent}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, hoursSpent: e.target.value })}
                    placeholder="0"
                    className="eq-form-input"
                  />
                </div>
              </div>

              <div className="eq-form-row">
                <div className="eq-form-group">
                  <label>Next Maintenance Date</label>
                  <input
                    type="date"
                    value={maintenanceForm.nextMaintenanceDate}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, nextMaintenanceDate: e.target.value })}
                    className="eq-form-input"
                  />
                </div>
                <div className="eq-form-group">
                  <label>Status</label>
                  <select
                    value={maintenanceForm.status}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
                    className="eq-form-select"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="eq-form-group">
                <label>Parts Replaced</label>
                <input
                  type="text"
                  value={maintenanceForm.partsReplaced}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, partsReplaced: e.target.value })}
                  placeholder="Parts replaced (comma separated)"
                  className="eq-form-input"
                />
              </div>

              <div className="eq-form-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={maintenanceForm.notes}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="eq-form-input"
                />
              </div>

              <div className="eq-form-actions">
                <button type="submit" className="eq-btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : 'Add Maintenance'}
                </button>
                <button type="button" className="eq-btn-secondary" onClick={() => setShowMaintenanceForm(false)}>
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
  const allFilteredSelected = filteredEquipment.length > 0 &&
    filteredEquipment.every(e => selectedIds.includes(e.id));

  return (
    <div className="eq-management">
      {/* Header */}
      <div className="eq-header">
        <div className="eq-header-left">
          <div className="eq-header-icon-wrapper">
            <Wrench size={28} />
            <span className="eq-header-badge">Equipment</span>
          </div>
          <div>
            <h2>Equipment & Asset Management</h2>
            <p className="eq-header-subtitle">
              Track equipment by site, status, and lifecycle
            </p>
          </div>
        </div>
        <div className="eq-header-right">
          <button className="eq-btn-refresh" onClick={loadAll}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="eq-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} />
            New Equipment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="eq-stats-grid">
        <div
          className="eq-stat-card"
          onMouseEnter={(e) => handleCardHover('total', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="eq-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Package size={22} />
          </div>
          <div className="eq-stat-content">
            <span className="eq-stat-label">Total Equipment</span>
            <span className="eq-stat-value">{stats.total}</span>
          </div>
          <div className="eq-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="eq-stat-card"
          onMouseEnter={(e) => handleCardHover('available', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="eq-stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <CheckCircle size={22} />
          </div>
          <div className="eq-stat-content">
            <span className="eq-stat-label">Available</span>
            <span className="eq-stat-value">{stats.available}</span>
          </div>
          <div className="eq-stat-progress">
            <div className="eq-stat-progress-bar" style={{ width: stats.total > 0 ? `${(stats.available / stats.total) * 100}%` : '0%' }}></div>
          </div>
        </div>

        <div
          className="eq-stat-card"
          onMouseEnter={(e) => handleCardHover('onSite', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="eq-stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <MapPin size={22} />
          </div>
          <div className="eq-stat-content">
            <span className="eq-stat-label">On Site</span>
            <span className="eq-stat-value">{stats.onSite}</span>
          </div>
          <div className="eq-stat-progress">
            <div className="eq-stat-progress-bar" style={{ width: stats.total > 0 ? `${(stats.onSite / stats.total) * 100}%` : '0%', background: '#8b5cf6' }}></div>
          </div>
        </div>

        <div
          className="eq-stat-card"
          onMouseEnter={(e) => handleCardHover('assigned', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="eq-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <User size={22} />
          </div>
          <div className="eq-stat-content">
            <span className="eq-stat-label">Assigned</span>
            <span className="eq-stat-value">{stats.assigned}</span>
          </div>
          <div className="eq-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="eq-stat-card"
          onMouseEnter={(e) => handleCardHover('maintenance', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="eq-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Wrench size={22} />
          </div>
          <div className="eq-stat-content">
            <span className="eq-stat-label">Maintenance</span>
            <span className="eq-stat-value">{stats.maintenance + stats.repair}</span>
          </div>
          <div className="eq-stat-trend">
            <TrendingDown size={16} />
          </div>
        </div>

        <div
          className="eq-stat-card"
          onMouseEnter={(e) => handleCardHover('value', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="eq-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <DollarSign size={22} />
          </div>
          <div className="eq-stat-content">
            <span className="eq-stat-label">Total Value</span>
            <span className="eq-stat-value">{Utils.formatCurrencyShort(stats.totalValue)}</span>
          </div>
          <div className="eq-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div
          className="eq-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="eq-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="eq-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="eq-tooltip-row">
                <span className="eq-tooltip-label">{detail.label}</span>
                <span className="eq-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + View toggle */}
      <div className="eq-filters-section">
        <div className="eq-search-box">
          <Search size={18} className="eq-search-icon" />
          <input
            type="text"
            placeholder="Search by name, code, model, serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="eq-clear-search" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="eq-filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="maintenance">Maintenance</option>
            <option value="repair">Repair</option>
            <option value="out_of_service">Out of Service</option>
            <option value="disposed">Disposed</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <option value="all">All Sites</option>
            <option value="unassigned">Unassigned</option>
            {data.sites?.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="eq-view-toggle">
          <button
            className={`eq-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <ListIcon size={16} /> Grid
          </button>
          <button
            className={`eq-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <ListIcon size={16} /> List
          </button>
          <button
            className={`eq-view-btn ${viewMode === 'site' ? 'active' : ''}`}
            onClick={() => setViewMode('site')}
            title="Group by site"
          >
            <Building2 size={16} /> By Site
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="eq-bulk-bar">
          <div className="eq-bulk-info">
            <CheckSquare size={16} />
            <span>{selectedIds.length} selected</span>
          </div>
          <div className="eq-bulk-actions">
            <button
              className="eq-bulk-btn"
              onClick={() => setShowBulkAssignModal(true)}
            >
              <ArrowRightLeft size={14} /> Assign to Site
            </button>
            <button
              className="eq-bulk-btn eq-bulk-btn-ghost"
              onClick={() => setSelectedIds([])}
            >
              <X size={14} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Error/Success */}
      {error && <div className="eq-error-message"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="eq-success-message"><CheckCircle size={16} /> {success}</div>}

      {/* Content */}
      {loading ? (
        <div className="eq-loading-state">
          <div className="eq-loading-spinner"></div>
          <span>Loading equipment...</span>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="eq-empty-state">
          <div className="eq-empty-icon-wrapper">
            <Package size={64} />
          </div>
          <h3>No Equipment Found</h3>
          <p>Add your first equipment or adjust filters to see results.</p>
          <button className="eq-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> Add Equipment
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="eq-grid">
          {filteredEquipment.map(renderEquipmentCard)}
        </div>
      ) : viewMode === 'list' ? (
        <div className="eq-list">
          <div className="eq-list-header">
            <button className="eq-select-toggle" onClick={toggleSelectAll} title="Select all">
              {allFilteredSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>
            <div className="eq-row-icon-spacer"></div>
            <div className="eq-row-main">Equipment</div>
            <div className="eq-row-col">Category</div>
            <div className="eq-row-col">Status</div>
            <div className="eq-row-col">Site</div>
            <div className="eq-row-col">Operator</div>
            <div className="eq-row-col">Value</div>
            <div className="eq-row-actions">Actions</div>
          </div>
          {filteredEquipment.map(renderEquipmentRow)}
        </div>
      ) : (
        <div className="eq-site-groups">
          {equipmentBySite.map(group => {
            const siteId = group.site?.id || '__unassigned__';
            const isExpanded = expandedSites[siteId] !== false; // default expanded
            const totalValue = group.items.reduce((s, e) => s + (e.currentValue || 0), 0);
            return (
              <div key={siteId} className="eq-site-group">
                <button
                  className="eq-site-group-header"
                  onClick={() => toggleSiteExpand(siteId)}
                >
                  <div className="eq-site-group-left">
                    <div className={`eq-site-group-icon ${group.site ? 'has-site' : 'empty-site'}`}>
                      {group.site ? <Building2 size={18} /> : <Home size={18} />}
                    </div>
                    <div>
                      <div className="eq-site-group-name">
                        {group.site?.name || 'Unassigned'}
                      </div>
                      <div className="eq-site-group-meta">
                        {group.items.length} items
                        {totalValue > 0 && <> · {Utils.formatCurrencyShort(totalValue)} value</>}
                        {group.site?.location && <> · {group.site.location}</>}
                      </div>
                    </div>
                  </div>
                  <div className="eq-site-group-right">
                    <span className="eq-site-group-count">{group.items.length}</span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="eq-site-group-body">
                    {group.items.map(renderEquipmentCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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