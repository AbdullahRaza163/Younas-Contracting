// src/hooks/useData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import ApiService from '../services/ApiService';
import Utils from '../utils/Utils';

// ============================================
// TIMEOUT HELPER
// ============================================
const withTimeout = (promise, ms = 12000, label = 'request') => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ]);
};

// ⭐ Safe single fetch with fallback
const safeFetch = async (promise, fallback, ms, label) => {
  try {
    return await withTimeout(promise, ms, label);
  } catch (err) {
    console.warn(`⚠️ [useData] ${label} failed:`, err.message);
    return fallback;
  }
};

// ============================================
// DEFAULT STATE
// ============================================
const DEFAULT_STATE = {
  sites: [],
  workers: [],
  entries: [],
  attendance: [],
  teams: [],
  expenses: [],
  invoices: [],
  items: [],
  materials: [],
  bom: [],
  monthlyOverhead: [],
  cumulativeTracker: [],
  monthlySummary: [],
  overheadCategories: [],
  projects: [],
  clients: [],
  equipment: [],
  equipmentCategories: [],
  performanceMetrics: null,
  performanceRankings: [],
  performanceTrends: [],
  performanceKPIs: [],
  leaveTypes: [],
  leaveRequests: [],
  leaveBalances: [],
  holidays: [],
  leaveStats: null,
  inspectionTypes: [],
  checklists: [],
  inspections: [],
  issues: [],
  safetyIncidents: [],
  qcSummary: null,
  monthlyOverheadValue: 194,
  vatRate: 0,
  workingHours: 8,
  settings: {},
  companyName: 'Haji Younas Contracting',
  companyCr: '141997-1',
  companyAddress: '',
  companyPhone: '+973 37099957',
  companyEmail: 'hajiyounas.contracting@gmail.com',
};

const CACHE_KEY = 'haji_younas_backup';

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch (e) {
    return null;
  }
};

const useData = () => {
  const initialCache = loadCache();

  const [data, setData] = useState(initialCache || DEFAULT_STATE);
  const [loading, setLoading] = useState(!initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expenseSummary, setExpenseSummary] = useState(null);

  // ⭐ GLOBAL TAB LOADER
  const [tabLoading, setTabLoading] = useState(false);
  const [tabLoadingLabel, setTabLoadingLabel] = useState('');

  // ⭐ Reference counter so overlapping requests don't flicker
  const loaderCountRef = useRef(0);
  const loaderTimerRef = useRef(null);

  /**
   * showLoader(label): starts a loader session.
   * Debounced by 200ms — if the operation finishes before that,
   * the loader never appears (avoids flashing on fast ops).
   */
  const showLoader = useCallback((label = 'Loading…') => {
    loaderCountRef.current += 1;
    if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
    loaderTimerRef.current = setTimeout(() => {
      setTabLoading(true);
      setTabLoadingLabel(label);
    }, 200);
  }, []);

  const hideLoader = useCallback(() => {
    loaderCountRef.current = Math.max(0, loaderCountRef.current - 1);
    if (loaderCountRef.current === 0) {
      if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
      setTabLoading(false);
      setTabLoadingLabel('');
    }
  }, []);

  const hasLoadedOnce = useRef(!!initialCache);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const loadedTabsRef = useRef(new Set());

  // ============================================
  // LAZY LOADER WRAPPER
  // ============================================
  const runLazy = useCallback(async (key, label, fn) => {
    if (loadedTabsRef.current.has(key)) return;
    loadedTabsRef.current.add(key);

    showLoader(label);
    try {
      await fn();
    } finally {
      hideLoader();
    }
  }, [showLoader, hideLoader]);

  // ============================================
  // CORE FETCH
  // ============================================
  const fetchCore = useCallback(async ({ silent = false } = {}) => {
    if (!hasLoadedOnce.current && !silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const currentMonth = new Date().toISOString().slice(0, 7);

    try {
      const [sites, workers, teams, attendance, settings] = await Promise.all([
        safeFetch(ApiService.getSites(),     [], 20000, 'getSites'),
        safeFetch(ApiService.getWorkers(),   [], 20000, 'getWorkers'),
        safeFetch(ApiService.getTeams(),     [], 20000, 'getTeams'),
        safeFetch(ApiService.getAttendance({ month: currentMonth }), [], 45000, 'getAttendance'),
        safeFetch(ApiService.getSettings(),  {}, 20000, 'getSettings'),
      ]);

      const patch = {
        sites: sites || [],
        workers: workers || [],
        teams: teams || [],
        attendance: attendance || [],
        settings: settings || {},
        workingHours: parseFloat(settings?.working_hours_per_day) || 8,
        monthlyOverheadValue: settings?.monthly_overhead,
        companyName: settings?.company_name,
        companyCr: settings?.company_cr,
        companyAddress: settings?.company_address,
        companyPhone: settings?.company_phone,
        companyEmail: settings?.company_email,
      };

      Object.keys(patch).forEach(k => {
        if (patch[k] === undefined) delete patch[k];
      });

      const merged = { ...dataRef.current, ...patch };
      setData(merged);
      dataRef.current = merged;

      hasLoadedOnce.current = true;
      console.log('✅ Core data loaded', {
        sites: patch.sites?.length || 0,
        workers: patch.workers?.length || 0,
        teams: patch.teams?.length || 0,
        attendance: patch.attendance?.length || 0,
      });

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
      } catch (e) { /* ignore quota */ }
    } catch (err) {
      console.error('❌ Core load failed:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ============================================
  // TARGETED REFRESHES
  // ============================================
  const refreshAttendance = useCallback(async (month) => {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    showLoader('Refreshing attendance…');
    try {
      const attendance = await withTimeout(
        ApiService.getAttendance({ month: targetMonth }),
        45000,
        'refreshAttendance'
      );
      const patch = { attendance: attendance || [] };
      const merged = { ...dataRef.current, ...patch };
      setData(merged);
      dataRef.current = merged;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
      } catch (e) { /* ignore quota */ }
      console.log('✅ Attendance refreshed:', attendance?.length || 0);
      return attendance;
    } catch (err) {
      console.error('❌ refreshAttendance failed:', err.message);
      throw err;
    } finally {
      hideLoader();
    }
  }, [showLoader, hideLoader]);

  // ============================================
  // BACKGROUND FETCH
  // ============================================
  const fetchBackground = useCallback(async () => {
    console.log('🔄 Background fetch starting...');

    const tasks = [
      ApiService.getProjects().then(v => ({ key: 'projects', value: v || [] })).catch(() => null),
      ApiService.getEntries().then(v => ({ key: 'entries', value: v || [] })).catch(() => null),
      ApiService.getClients().then(v => ({ key: 'clients', value: v || [] })).catch(() => null),
      ApiService.getEquipment().then(v => ({ key: 'equipment', value: v || [] })).catch(() => null),
      ApiService.getEquipmentCategories().then(v => ({ key: 'equipmentCategories', value: v || [] })).catch(() => null),
      ApiService.getExpenses().then(v => ({ key: 'expenses', value: v || [] })).catch(() => null),
      ApiService.getInvoices().then(v => ({ key: 'invoices', value: v || [] })).catch(() => null),
      ApiService.getItems().then(v => ({ key: 'items', value: v || [] })).catch(() => null),
      ApiService.getMaterials().then(v => ({ key: 'materials', value: v || [] })).catch(() => null),
      ApiService.getMonthlyOverhead().then(v => ({ key: 'monthlyOverhead', value: v || [] })).catch(() => null),
      ApiService.getOverheadCategories().then(v => ({ key: 'overheadCategories', value: v || [] })).catch(() => null),
      ApiService.getCumulativeTracker().then(v => ({ key: 'cumulativeTracker', value: v || [] })).catch(() => null),
      ApiService.getMonthlySummaries().then(v => ({ key: 'monthlySummary', value: v || [] })).catch(() => null),
    ];

    const results = await Promise.allSettled(tasks);

    const patch = {};
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value) {
        patch[r.value.key] = r.value.value;
      }
    });

    if (Object.keys(patch).length > 0) {
      const merged = { ...dataRef.current, ...patch };
      setData(merged);
      dataRef.current = merged;
      console.log('✅ Background data loaded:', Object.keys(patch).join(', '));
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
      } catch (e) { /* ignore quota */ }
    }
  }, []);

  // ============================================
  // PUBLIC LOADERS
  // ============================================
  const loadData = useCallback(() => fetchCore({ silent: false }), [fetchCore]);
  const refreshData = useCallback(() => fetchCore({ silent: true }), [fetchCore]);

  // ============================================
  // BOOT SEQUENCE
  // ============================================
  useEffect(() => {
    fetchCore({ silent: true }).then(() => {
      fetchBackground();
    });
  }, [fetchCore, fetchBackground]);

  // ============================================
  // LAZY LOADERS
  // ============================================
  const loadEntries = useCallback(() => runLazy('entries', 'Loading entries…', async () => {
    try {
      const entries = await withTimeout(ApiService.getEntries(), 10000, 'getEntries');
      setData(prev => ({ ...prev, entries: entries || [] }));
      console.log('✅ Loaded entries:', entries?.length || 0);
    } catch (err) {
      console.error('❌ getEntries:', err.message);
      loadedTabsRef.current.delete('entries');
    }
  }), [runLazy]);

  const loadExpenses = useCallback(() => runLazy('expenses', 'Loading expenses…', async () => {
    try {
      const expenses = await withTimeout(ApiService.getExpenses(), 10000, 'getExpenses');
      setData(prev => ({ ...prev, expenses: expenses || [] }));
      console.log('✅ Loaded expenses:', expenses?.length || 0);
    } catch (err) {
      console.error('❌ getExpenses:', err.message);
      loadedTabsRef.current.delete('expenses');
    }
  }), [runLazy]);

  const loadInvoices = useCallback(() => runLazy('invoices', 'Loading invoices…', async () => {
    try {
      const invoices = await withTimeout(ApiService.getInvoices(), 10000, 'getInvoices');
      setData(prev => ({ ...prev, invoices: invoices || [] }));
      console.log('✅ Loaded invoices:', invoices?.length || 0);
    } catch (err) {
      console.error('❌ getInvoices:', err.message);
      loadedTabsRef.current.delete('invoices');
    }
  }), [runLazy]);

  const loadItems = useCallback(() => runLazy('items', 'Loading items…', async () => {
    try {
      const items = await withTimeout(ApiService.getItems(), 10000, 'getItems');
      setData(prev => ({ ...prev, items: items || [] }));
      console.log('✅ Loaded items:', items?.length || 0);
    } catch (err) {
      console.error('❌ getItems:', err.message);
      loadedTabsRef.current.delete('items');
    }
  }), [runLazy]);

  // ⭐ Materials lazy loader (used by BOM screen)
  const loadMaterials = useCallback(() => runLazy('materials', 'Loading materials…', async () => {
    try {
      const materials = await withTimeout(ApiService.getMaterials(), 15000, 'getMaterials');
      setData(prev => ({ ...prev, materials: materials || [] }));
      console.log('✅ Loaded materials:', materials?.length || 0);
    } catch (err) {
      console.error('❌ getMaterials:', err.message);
      loadedTabsRef.current.delete('materials');
    }
  }), [runLazy]);

  const loadProjects = useCallback(() => runLazy('projects', 'Loading projects…', async () => {
    try {
      const projects = await withTimeout(ApiService.getProjects(), 10000, 'getProjects');
      setData(prev => ({ ...prev, projects: projects || [] }));
      console.log('✅ Loaded projects:', projects?.length || 0);
    } catch (err) {
      console.error('❌ getProjects:', err.message);
      loadedTabsRef.current.delete('projects');
    }
  }), [runLazy]);

  const loadClients = useCallback(() => runLazy('clients', 'Loading clients…', async () => {
    try {
      const clients = await withTimeout(ApiService.getClients(), 10000, 'getClients');
      setData(prev => ({ ...prev, clients: clients || [] }));
      console.log('✅ Loaded clients:', clients?.length || 0);
    } catch (err) {
      console.error('❌ getClients:', err.message);
      loadedTabsRef.current.delete('clients');
    }
  }), [runLazy]);

  const loadEquipment = useCallback(() => runLazy('equipment', 'Loading equipment…', async () => {
    try {
      const [equipment, equipmentCategories] = await withTimeout(
        Promise.all([
          ApiService.getEquipment().catch(() => []),
          ApiService.getEquipmentCategories().catch(() => []),
        ]),
        10000,
        'equipmentBatch'
      );
      setData(prev => ({
        ...prev,
        equipment: equipment || [],
        equipmentCategories: equipmentCategories || [],
      }));
      console.log('✅ Loaded equipment:', equipment?.length || 0);
    } catch (err) {
      console.error('❌ equipment batch:', err.message);
      loadedTabsRef.current.delete('equipment');
    }
  }), [runLazy]);

  const loadPerformance = useCallback(() => runLazy('performance', 'Loading performance analytics…', async () => {
    try {
      const [metrics, rankings, trends, kpis] = await withTimeout(
        Promise.all([
          ApiService.getPerformanceMetrics().catch(() => null),
          ApiService.getPerformanceRankings().catch(() => []),
          ApiService.getPerformanceTrends().catch(() => []),
          ApiService.getPerformanceKPIs().catch(() => []),
        ]),
        12000,
        'performanceBatch'
      );
      setData(prev => ({
        ...prev,
        performanceMetrics: metrics,
        performanceRankings: rankings || [],
        performanceTrends: trends || [],
        performanceKPIs: kpis || [],
      }));
      console.log('✅ Loaded performance data');
    } catch (err) {
      console.error('❌ performance batch:', err.message);
      loadedTabsRef.current.delete('performance');
    }
  }), [runLazy]);

  const loadLeave = useCallback(() => runLazy('leave', 'Loading leave data…', async () => {
    try {
      const [types, requests, balances, holidays, stats] = await withTimeout(
        Promise.all([
          ApiService.getLeaveTypes().catch(() => []),
          ApiService.getLeaveRequests().catch(() => []),
          ApiService.getLeaveBalances().catch(() => []),
          ApiService.getHolidays().catch(() => []),
          ApiService.getLeaveStats().catch(() => null),
        ]),
        12000,
        'leaveBatch'
      );
      setData(prev => ({
        ...prev,
        leaveTypes: types || [],
        leaveRequests: requests || [],
        leaveBalances: balances || [],
        holidays: holidays || [],
        leaveStats: stats,
      }));
      console.log('✅ Loaded leave data');
    } catch (err) {
      console.error('❌ leave batch:', err.message);
      loadedTabsRef.current.delete('leave');
    }
  }), [runLazy]);

  const loadQuality = useCallback(() => runLazy('quality', 'Loading quality control…', async () => {
    try {
      const [types, checklists, inspections, issues, incidents, summary] = await withTimeout(
        Promise.all([
          ApiService.getInspectionTypes().catch(() => []),
          ApiService.getChecklists().catch(() => []),
          ApiService.getInspections().catch(() => []),
          ApiService.getIssues().catch(() => []),
          ApiService.getSafetyIncidents().catch(() => []),
          ApiService.getQCSummary().catch(() => null),
        ]),
        12000,
        'qualityBatch'
      );
      setData(prev => ({
        ...prev,
        inspectionTypes: types || [],
        checklists: checklists || [],
        inspections: inspections || [],
        issues: issues || [],
        safetyIncidents: incidents || [],
        qcSummary: summary,
      }));
      console.log('✅ Loaded quality data');
    } catch (err) {
      console.error('❌ quality batch:', err.message);
      loadedTabsRef.current.delete('quality');
    }
  }), [runLazy]);

  const loadMonthlyOverhead = useCallback(() => runLazy('monthlyOverhead', 'Loading monthly overhead…', async () => {
    try {
      const [overhead, categories] = await withTimeout(
        Promise.all([
          ApiService.getMonthlyOverhead().catch(() => []),
          ApiService.getOverheadCategories().catch(() => []),
        ]),
        10000,
        'monthlyOverheadBatch'
      );
      setData(prev => ({
        ...prev,
        monthlyOverhead: overhead || [],
        overheadCategories: categories || [],
      }));
      console.log('✅ Loaded monthly overhead');
    } catch (err) {
      console.error('❌ monthly overhead batch:', err.message);
      loadedTabsRef.current.delete('monthlyOverhead');
    }
  }), [runLazy]);

  const loadMonthlySummary = useCallback(() => runLazy('monthlySummary', 'Loading monthly summary…', async () => {
    try {
      const summaries = await withTimeout(ApiService.getMonthlySummaries(), 10000, 'getMonthlySummaries');
      setData(prev => ({ ...prev, monthlySummary: summaries || [] }));
      console.log('✅ Loaded monthly summary:', summaries?.length || 0);
    } catch (err) {
      console.error('❌ getMonthlySummaries:', err.message);
      loadedTabsRef.current.delete('monthlySummary');
    }
  }), [runLazy]);

  const loadCumulativeTracker = useCallback(() => runLazy('cumulative', 'Loading cumulative tracker…', async () => {
    try {
      const tracker = await withTimeout(ApiService.getCumulativeTracker(), 10000, 'getCumulativeTracker');
      setData(prev => ({ ...prev, cumulativeTracker: tracker || [] }));
      console.log('✅ Loaded cumulative tracker:', tracker?.length || 0);
    } catch (err) {
      console.error('❌ getCumulativeTracker:', err.message);
      loadedTabsRef.current.delete('cumulative');
    }
  }), [runLazy]);

  // ============================================
  // ATTENDANCE
  // ============================================
  const clockInWorker = useCallback(async (workerId, date, siteId) => {
    showLoader('Clocking in worker…');
    try {
      const now = new Date().toISOString();
      const result = await ApiService.createAttendance({
        workerId, date, siteId, checkedIn: now, checkedOut: null, present: true
      });
      setData(prev => {
        const existing = prev.attendance.find(a => a.workerId === workerId && a.date === date);
        if (existing) {
          return {
            ...prev,
            attendance: prev.attendance.map(a =>
              a.workerId === workerId && a.date === date ? result : a
            )
          };
        }
        return { ...prev, attendance: [...prev.attendance, result] };
      });
      return result;
    } catch (err) {
      console.error('Failed to clock in:', err);
      throw err;
    } finally {
      hideLoader();
    }
  }, [showLoader, hideLoader]);

  const clockOutWorker = useCallback(async (workerId, date) => {
    showLoader('Clocking out worker…');
    try {
      const now = new Date().toISOString();
      const current = dataRef.current.attendance || [];
      const existing = current.find(a => a.workerId === workerId && a.date === date && !a.checkedOut);
      if (!existing) throw new Error('Worker not checked in');
      if (existing.checkedOut) throw new Error('Worker already clocked out');

      const result = await ApiService.updateAttendance(existing.id, { checkedOut: now });
      setData(prev => ({
        ...prev,
        attendance: prev.attendance.map(a => a.id === existing.id ? result : a)
      }));
      return result;
    } catch (err) {
      console.error('Failed to clock out:', err);
      throw err;
    } finally {
      hideLoader();
    }
  }, [showLoader, hideLoader]);

  // ============================================
  // MATERIALS
  // ============================================
  const addMaterial = useCallback(async (payload) => {
    showLoader('Saving material…');
    try {
      const created = await ApiService.createMaterial(payload);
      setData(prev => ({ ...prev, materials: [created, ...(prev.materials || [])] }));
      loadedTabsRef.current.add('materials');
      return created;
    } catch (err) {
      console.error('Failed to add material:', err);
      throw err;
    } finally {
      hideLoader();
    }
  }, [showLoader, hideLoader]);

  const updateMaterial = useCallback(async (id, updates) => {
    showLoader('Updating material…');
    try {
      const updated = await ApiService.updateMaterial(id, updates);
      setData(prev => ({
        ...prev,
        materials: (prev.materials || []).map(m => m.id === id ? updated : m)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update material:', err);
      throw err;
    } finally {
      hideLoader();
    }
  }, [showLoader, hideLoader]);

  const deleteMaterial = useCallback(async (id) => {
    showLoader('Deleting material…');
    try {
      await ApiService.deleteMaterial(id);
      setData(prev => ({
        ...prev,
        materials: (prev.materials || []).filter(m => m.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete material:', err);
      throw err;
    } finally {
      hideLoader();
    }
  }, [showLoader, hideLoader]);

  // ============================================
  // BOM (local only — no backend table yet)
  // ============================================
  const addBOM = useCallback((bom) => {
    setData(prev => ({ ...prev, bom: [...(prev.bom || []), bom] }));
    return bom;
  }, []);

  const updateBOM = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      bom: (prev.bom || []).map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  }, []);

  const deleteBOM = useCallback((id) => {
    setData(prev => ({
      ...prev,
      bom: (prev.bom || []).filter(b => b.id !== id)
    }));
  }, []);

  // ============================================
  // EQUIPMENT
  // ============================================
  const addEquipment = useCallback(async (equipment) => {
    showLoader('Saving equipment…');
    try {
      const newEquipment = await ApiService.createEquipment(equipment);
      setData(prev => ({ ...prev, equipment: [...(prev.equipment || []), newEquipment] }));
      return newEquipment;
    } catch (err) { console.error('Failed to add equipment:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateEquipment = useCallback(async (id, updates) => {
    showLoader('Updating equipment…');
    try {
      const updated = await ApiService.updateEquipment(id, updates);
      setData(prev => ({ ...prev, equipment: (prev.equipment || []).map(e => e.id === id ? updated : e) }));
      return updated;
    } catch (err) { console.error('Failed to update equipment:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteEquipment = useCallback(async (id) => {
    if (!window.confirm('Delete this equipment?')) return;
    showLoader('Deleting equipment…');
    try {
      await ApiService.deleteEquipment(id);
      setData(prev => ({ ...prev, equipment: (prev.equipment || []).filter(e => e.id !== id) }));
    } catch (err) { console.error('Failed to delete equipment:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const addMaintenance = useCallback(async (equipmentId, data) => {
    showLoader('Adding maintenance…');
    try {
      const result = await ApiService.addMaintenance(equipmentId, data);
      loadedTabsRef.current.delete('equipment');
      await loadEquipment();
      return result;
    } catch (err) { console.error('Failed to add maintenance:', err); throw err; }
    finally { hideLoader(); }
  }, [loadEquipment, showLoader, hideLoader]);

  const assignEquipment = useCallback(async (equipmentId, data) => {
    showLoader('Assigning equipment…');
    try {
      const result = await ApiService.assignEquipment(equipmentId, data);
      loadedTabsRef.current.delete('equipment');
      await loadEquipment();
      return result;
    } catch (err) { console.error('Failed to assign equipment:', err); throw err; }
    finally { hideLoader(); }
  }, [loadEquipment, showLoader, hideLoader]);

  const returnEquipment = useCallback(async (assignmentId, data) => {
    showLoader('Returning equipment…');
    try {
      const result = await ApiService.returnEquipment(assignmentId, data);
      loadedTabsRef.current.delete('equipment');
      await loadEquipment();
      return result;
    } catch (err) { console.error('Failed to return equipment:', err); throw err; }
    finally { hideLoader(); }
  }, [loadEquipment, showLoader, hideLoader]);

  const logEquipmentUsage = useCallback(async (equipmentId, data) => {
    showLoader('Logging equipment usage…');
    try {
      const result = await ApiService.logUsage(equipmentId, data);
      loadedTabsRef.current.delete('equipment');
      await loadEquipment();
      return result;
    } catch (err) { console.error('Failed to log equipment usage:', err); throw err; }
    finally { hideLoader(); }
  }, [loadEquipment, showLoader, hideLoader]);

  const calculateDepreciation = useCallback(async (equipmentId) => {
    showLoader('Calculating depreciation…');
    try {
      const result = await ApiService.calculateDepreciation(equipmentId);
      loadedTabsRef.current.delete('equipment');
      await loadEquipment();
      return result;
    } catch (err) { console.error('Failed to calculate depreciation:', err); throw err; }
    finally { hideLoader(); }
  }, [loadEquipment, showLoader, hideLoader]);

  const loadQualityData = loadQuality;

  const loadPerformanceMetrics = useCallback(async (filters = {}) => {
    try {
      const metrics = await ApiService.getPerformanceMetrics(filters);
      setData(prev => ({ ...prev, performanceMetrics: metrics }));
      return metrics;
    } catch (err) { console.error('Failed to load performance metrics:', err); throw err; }
  }, []);

  const loadPerformanceRankings = useCallback(async (filters = {}) => {
    try {
      const rankings = await ApiService.getPerformanceRankings(filters);
      setData(prev => ({ ...prev, performanceRankings: rankings }));
      return rankings;
    } catch (err) { console.error('Failed to load performance rankings:', err); throw err; }
  }, []);

  const loadPerformanceTrends = useCallback(async (filters = {}) => {
    try {
      const trends = await ApiService.getPerformanceTrends(filters);
      setData(prev => ({ ...prev, performanceTrends: trends }));
      return trends;
    } catch (err) { console.error('Failed to load performance trends:', err); throw err; }
  }, []);

  const loadPerformanceKPIs = useCallback(async () => {
    try {
      const kpis = await ApiService.getPerformanceKPIs();
      setData(prev => ({ ...prev, performanceKPIs: kpis }));
      return kpis;
    } catch (err) { console.error('Failed to load performance KPIs:', err); throw err; }
  }, []);

  // ============================================
  // LEAVE
  // ============================================
  const loadLeaveTypes = useCallback(async () => {
    try { const t = await ApiService.getLeaveTypes(); setData(prev => ({ ...prev, leaveTypes: t })); return t; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const createLeaveType = useCallback(async (d) => {
    showLoader('Creating leave type…');
    try { const n = await ApiService.createLeaveType(d); setData(prev => ({ ...prev, leaveTypes: [...prev.leaveTypes, n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateLeaveType = useCallback(async (id, d) => {
    showLoader('Updating leave type…');
    try { const u = await ApiService.updateLeaveType(id, d); setData(prev => ({ ...prev, leaveTypes: prev.leaveTypes.map(t => t.id === id ? u : t) })); return u; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteLeaveType = useCallback(async (id) => {
    showLoader('Deleting leave type…');
    try { await ApiService.deleteLeaveType(id); setData(prev => ({ ...prev, leaveTypes: prev.leaveTypes.filter(t => t.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const loadLeaveRequests = useCallback(async (filters = {}) => {
    try { const r = await ApiService.getLeaveRequests(filters); setData(prev => ({ ...prev, leaveRequests: r })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const createLeaveRequest = useCallback(async (d) => {
    showLoader('Creating leave request…');
    try { const n = await ApiService.createLeaveRequest(d); setData(prev => ({ ...prev, leaveRequests: [n, ...prev.leaveRequests] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const approveLeaveRequest = useCallback(async (id, d = {}) => {
    showLoader('Approving leave request…');
    try { const a = await ApiService.approveLeaveRequest(id, d); setData(prev => ({ ...prev, leaveRequests: prev.leaveRequests.map(r => r.id === id ? a : r) })); return a; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const rejectLeaveRequest = useCallback(async (id, d = {}) => {
    showLoader('Rejecting leave request…');
    try { const r = await ApiService.rejectLeaveRequest(id, d); setData(prev => ({ ...prev, leaveRequests: prev.leaveRequests.map(x => x.id === id ? r : x) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const cancelLeaveRequest = useCallback(async (id) => {
    showLoader('Cancelling leave request…');
    try { const c = await ApiService.cancelLeaveRequest(id); setData(prev => ({ ...prev, leaveRequests: prev.leaveRequests.map(r => r.id === id ? c : r) })); return c; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const loadLeaveBalances = useCallback(async (filters = {}) => {
    try { const b = await ApiService.getLeaveBalances(filters); setData(prev => ({ ...prev, leaveBalances: b })); return b; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const initializeLeaveBalances = useCallback(async (d) => {
    showLoader('Initializing leave balances…');
    try { const r = await ApiService.initializeLeaveBalances(d); await loadLeaveBalances(); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [loadLeaveBalances, showLoader, hideLoader]);

  const loadHolidays = useCallback(async (filters = {}) => {
    try { const h = await ApiService.getHolidays(filters); setData(prev => ({ ...prev, holidays: h })); return h; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const createHoliday = useCallback(async (d) => {
    showLoader('Creating holiday…');
    try { const n = await ApiService.createHoliday(d); setData(prev => ({ ...prev, holidays: [...prev.holidays, n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateHoliday = useCallback(async (id, d) => {
    showLoader('Updating holiday…');
    try { const u = await ApiService.updateHoliday(id, d); setData(prev => ({ ...prev, holidays: prev.holidays.map(h => h.id === id ? u : h) })); return u; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteHoliday = useCallback(async (id) => {
    showLoader('Deleting holiday…');
    try { await ApiService.deleteHoliday(id); setData(prev => ({ ...prev, holidays: prev.holidays.filter(h => h.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const loadLeaveStats = useCallback(async (filters = {}) => {
    try { const s = await ApiService.getLeaveStats(filters); setData(prev => ({ ...prev, leaveStats: s })); return s; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // ============================================
  // CLIENT
  // ============================================
  const addClient = useCallback(async (client) => {
    showLoader('Saving client…');
    try { const n = await ApiService.createClient(client); setData(prev => ({ ...prev, clients: [...(prev.clients || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateClient = useCallback(async (id, u) => {
    showLoader('Updating client…');
    try { const r = await ApiService.updateClient(id, u); setData(prev => ({ ...prev, clients: (prev.clients || []).map(c => c.id === id ? r : c) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteClient = useCallback(async (id) => {
    if (!window.confirm('Delete this client?')) return;
    showLoader('Deleting client…');
    try { await ApiService.deleteClient(id); setData(prev => ({ ...prev, clients: (prev.clients || []).filter(c => c.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  // ============================================
  // PROJECT
  // ============================================
  const addProject = useCallback(async (project) => {
    showLoader('Saving project…');
    try { const n = await ApiService.createProject(project); setData(prev => ({ ...prev, projects: [...(prev.projects || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateProject = useCallback(async (id, u) => {
    showLoader('Updating project…');
    try { const r = await ApiService.updateProject(id, u); setData(prev => ({ ...prev, projects: (prev.projects || []).map(p => p.id === id ? r : p) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteProject = useCallback(async (id) => {
    if (!window.confirm('Delete this project?')) return;
    showLoader('Deleting project…');
    try { await ApiService.deleteProject(id); setData(prev => ({ ...prev, projects: (prev.projects || []).filter(p => p.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const calculateProject = useCallback(async (id) => {
    try { return await ApiService.calculateProject(id); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const getProjectSummary = useCallback(async () => {
    try { return await ApiService.getProjectSummary(); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // ============================================
  // MONTHLY OVERHEAD
  // ============================================
  const addMonthlyOverhead = useCallback(async (o) => {
    showLoader('Saving overhead…');
    try { const n = await ApiService.createMonthlyOverhead(o); setData(prev => ({ ...prev, monthlyOverhead: [...(prev.monthlyOverhead || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateMonthlyOverhead = useCallback(async (id, u) => {
    showLoader('Updating overhead…');
    try { const r = await ApiService.updateMonthlyOverhead(id, u); setData(prev => ({ ...prev, monthlyOverhead: (prev.monthlyOverhead || []).map(i => i.id === id ? r : i) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteMonthlyOverhead = useCallback(async (id) => {
    if (!window.confirm('Delete this overhead entry?')) return;
    showLoader('Deleting overhead…');
    try { await ApiService.deleteMonthlyOverhead(id); setData(prev => ({ ...prev, monthlyOverhead: (prev.monthlyOverhead || []).filter(i => i.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  // ============================================
  // MONTHLY SUMMARY
  // ============================================
  const addMonthlySummary = useCallback(async (s) => {
    showLoader('Saving monthly summary…');
    try { const n = await ApiService.createMonthlySummary(s); setData(prev => ({ ...prev, monthlySummary: [...(prev.monthlySummary || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateMonthlySummary = useCallback(async (id, u) => {
    showLoader('Updating monthly summary…');
    try { const r = await ApiService.updateMonthlySummary(id, u); setData(prev => ({ ...prev, monthlySummary: (prev.monthlySummary || []).map(i => i.id === id ? r : i) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteMonthlySummary = useCallback(async (id) => {
    if (!window.confirm('Delete this monthly summary?')) return;
    showLoader('Deleting monthly summary…');
    try { await ApiService.deleteMonthlySummary(id); setData(prev => ({ ...prev, monthlySummary: (prev.monthlySummary || []).filter(i => i.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const calculateMonthlySummary = useCallback(async (month) => {
    showLoader('Calculating monthly summary…');
    try {
      const result = await ApiService.calculateMonthlySummary(month);
      loadedTabsRef.current.delete('monthlySummary');
      await loadMonthlySummary();
      return result;
    } catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [loadMonthlySummary, showLoader, hideLoader]);

  // ============================================
  // CUMULATIVE
  // ============================================
  const addCumulativeEntry = useCallback(async (e) => {
    showLoader('Saving cumulative entry…');
    try { const n = await ApiService.createCumulativeTracker(e); setData(prev => ({ ...prev, cumulativeTracker: [...(prev.cumulativeTracker || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const fetchMonthlyExpenseSummary = useCallback(async (month) => {
    try { const s = await ApiService.getMonthlyExpenseSummary(month); setExpenseSummary(s); return s; }
    catch (err) { console.error('Failed:', err); return null; }
  }, []);

  // ============================================
  // ENTRIES
  // ============================================
  const addEntry = useCallback(async (entry) => {
    showLoader('Saving entry…');
    try { const n = await ApiService.createEntry(entry); setData(prev => ({ ...prev, entries: [n, ...prev.entries] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateEntry = useCallback(async (id, u) => {
    showLoader('Updating entry…');
    try { const r = await ApiService.updateEntry(id, u); setData(prev => ({ ...prev, entries: prev.entries.map(e => e.id === id ? r : e) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteEntry = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    showLoader('Deleting entry…');
    try { await ApiService.deleteEntry(id); setData(prev => ({ ...prev, entries: prev.entries.filter(e => e.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  // ============================================
  // SITES
  // ============================================
  const addSite = useCallback(async (site) => {
    showLoader('Saving site…');
    try { const n = await ApiService.createSite(site); setData(prev => ({ ...prev, sites: [...prev.sites, n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateSite = useCallback(async (id, u) => {
    showLoader('Updating site…');
    try { const r = await ApiService.updateSite(id, u); setData(prev => ({ ...prev, sites: prev.sites.map(s => s.id === id ? r : s) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteSite = useCallback(async (id) => {
    if (!window.confirm('Delete this site?')) return;
    showLoader('Deleting site…');
    try {
      await ApiService.deleteSite(id);
      setData(prev => ({ ...prev, sites: prev.sites.filter(s => s.id !== id), entries: prev.entries.filter(e => e.siteId !== id) }));
    } catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  // ============================================
  // WORKERS
  // ============================================
  const addWorker = useCallback(async (worker) => {
    showLoader('Saving worker…');
    try { const n = await ApiService.createWorker(worker); setData(prev => ({ ...prev, workers: [...prev.workers, n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateWorker = useCallback(async (id, u) => {
    showLoader('Updating worker…');
    try { const r = await ApiService.updateWorker(id, u); setData(prev => ({ ...prev, workers: prev.workers.map(w => w.id === id ? r : w) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteWorker = useCallback(async (id) => {
    if (!window.confirm('Delete this worker?')) return;
    showLoader('Deleting worker…');
    try {
      await ApiService.deleteWorker(id);
      setData(prev => ({ ...prev, workers: prev.workers.filter(w => w.id !== id), attendance: prev.attendance.filter(a => a.workerId !== id) }));
    } catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  // ============================================
  // TEAMS
  // ============================================
  const addTeam = useCallback(async (team) => {
    showLoader('Saving team…');
    try { const n = await ApiService.createTeam(team); setData(prev => ({ ...prev, teams: [...(prev.teams || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateTeam = useCallback(async (id, u) => {
    showLoader('Updating team…');
    try { const r = await ApiService.updateTeam(id, u); setData(prev => ({ ...prev, teams: (prev.teams || []).map(t => t.id === id ? r : t) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteTeam = useCallback(async (id) => {
    if (!window.confirm('Delete this team?')) return;
    showLoader('Deleting team…');
    try { await ApiService.deleteTeam(id); setData(prev => ({ ...prev, teams: (prev.teams || []).filter(t => t.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const addTeamMember = useCallback(async (teamId, member) => {
    showLoader('Adding team member…');
    try {
      const n = await ApiService.addTeamMember(teamId, member);
      setData(prev => ({ ...prev, teams: (prev.teams || []).map(t => t.id === teamId ? { ...t, members: [...(t.members || []), n] } : t) }));
      return n;
    } catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const removeTeamMember = useCallback(async (teamId, memberId) => {
    showLoader('Removing team member…');
    try {
      await ApiService.removeTeamMember(teamId, memberId);
      setData(prev => ({ ...prev, teams: (prev.teams || []).map(t => t.id === teamId ? { ...t, members: (t.members || []).filter(m => m.id !== memberId) } : t) }));
    } catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  // ============================================
  // EXPENSES
  // ============================================
  const addExpense = useCallback(async (e) => {
    showLoader('Saving expense…');
    try { const n = await ApiService.createExpense(e); setData(prev => ({ ...prev, expenses: [...(prev.expenses || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateExpense = useCallback(async (id, u) => {
    showLoader('Updating expense…');
    try { const r = await ApiService.updateExpense(id, u); setData(prev => ({ ...prev, expenses: (prev.expenses || []).map(e => e.id === id ? r : e) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteExpense = useCallback(async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    showLoader('Deleting expense…');
    try { await ApiService.deleteExpense(id); setData(prev => ({ ...prev, expenses: (prev.expenses || []).filter(e => e.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  // ============================================
  // INVOICES
  // ============================================
  const addInvoice = useCallback(async (i) => {
    showLoader('Saving invoice…');
    try { const n = await ApiService.createInvoice(i); setData(prev => ({ ...prev, invoices: [...(prev.invoices || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateInvoice = useCallback(async (id, u) => {
    showLoader('Updating invoice…');
    try { const r = await ApiService.updateInvoice(id, u); setData(prev => ({ ...prev, invoices: (prev.invoices || []).map(i => i.id === id ? r : i) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteInvoice = useCallback(async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    showLoader('Deleting invoice…');
    try { await ApiService.deleteInvoice(id); setData(prev => ({ ...prev, invoices: (prev.invoices || []).filter(i => i.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  // ============================================
  // ITEMS
  // ============================================
  const addItem = useCallback(async (i) => {
    showLoader('Saving item…');
    try { const n = await ApiService.createItem(i); setData(prev => ({ ...prev, items: [...(prev.items || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateItem = useCallback(async (id, u) => {
    showLoader('Updating item…');
    try { const r = await ApiService.updateItem(id, u); setData(prev => ({ ...prev, items: (prev.items || []).map(i => i.id === id ? r : i) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const deleteItem = useCallback(async (id) => {
    if (!window.confirm('Delete this item?')) return;
    showLoader('Deleting item…');
    try { await ApiService.deleteItem(id); setData(prev => ({ ...prev, items: (prev.items || []).filter(i => i.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
    finally { hideLoader(); }
  }, [showLoader, hideLoader]);

  const updateData = useCallback((newData) => {
    setData(prev => ({ ...prev, ...newData }));
  }, []);

  // ============================================
  // RETURN
  // ============================================
  return {
    data,
    loading,
    refreshing,
    tabLoading,
    tabLoadingLabel,
    showLoader,
    hideLoader,
    setTabLoading,
    setTabLoadingLabel,
    error,
    loadData,
    refreshData,
    refreshAttendance,
    updateData,

    // Lazy loaders
    loadEntries,
    loadExpenses,
    loadInvoices,
    loadItems,
    loadMaterials,
    loadProjects,
    loadClients,
    loadEquipment,
    loadPerformance,
    loadLeave,
    loadQuality,
    loadMonthlyOverhead,
    loadMonthlySummary,
    loadCumulativeTracker,

    // Materials
    addMaterial,
    updateMaterial,
    deleteMaterial,

    // BOM (local)
    addBOM,
    updateBOM,
    deleteBOM,

    // Equipment
    addEquipment, updateEquipment, deleteEquipment,
    addMaintenance, assignEquipment, returnEquipment,
    logEquipmentUsage, calculateDepreciation,

    // Client
    addClient, updateClient, deleteClient,

    // Project
    addProject, updateProject, deleteProject, calculateProject, getProjectSummary,

    // Entry
    addEntry, updateEntry, deleteEntry,

    // Site
    addSite, updateSite, deleteSite,

    // Worker
    addWorker, updateWorker, deleteWorker,

    // Attendance
    clockInWorker, clockOutWorker,

    // Team
    addTeam, updateTeam, deleteTeam, addTeamMember, removeTeamMember,

    // Expense
    addExpense, updateExpense, deleteExpense,

    // Invoice
    addInvoice, updateInvoice, deleteInvoice,

    // Item
    addItem, updateItem, deleteItem,

    // Monthly Overhead
    addMonthlyOverhead, updateMonthlyOverhead, deleteMonthlyOverhead,

    // Monthly Summary
    addMonthlySummary, updateMonthlySummary, deleteMonthlySummary, calculateMonthlySummary,

    // Cumulative
    addCumulativeEntry,

    // Expense summary
    expenseSummary, fetchMonthlyExpenseSummary,

    // Quality
    loadQualityData,

    // Performance
    loadPerformanceMetrics, loadPerformanceRankings, loadPerformanceTrends, loadPerformanceKPIs,

    // Leave & Holiday
    loadLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType,
    loadLeaveRequests, createLeaveRequest, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest,
    loadLeaveBalances, initializeLeaveBalances,
    loadHolidays, createHoliday, updateHoliday, deleteHoliday,
    loadLeaveStats,
  };
};

export default useData;