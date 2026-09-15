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

// ⭐ Load cache synchronously so the app renders instantly
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

  // ⭐ GLOBAL TAB LOADER — shows overlay while lazy loader fetches
  const [tabLoading, setTabLoading] = useState(false);
  const [tabLoadingLabel, setTabLoadingLabel] = useState('');

  const hasLoadedOnce = useRef(!!initialCache);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const loadedTabsRef = useRef(new Set());

  // ============================================
  // ⭐ GENERIC LAZY LOADER WRAPPER
  // Shows the overlay only if the fetch takes more than 300ms
  // ============================================
  const runLazy = useCallback(async (key, label, fn) => {
    if (loadedTabsRef.current.has(key)) return;
    loadedTabsRef.current.add(key);

    // ⭐ Delay showing the overlay — avoids a flash on fast fetches
    let showTimer = setTimeout(() => {
      setTabLoading(true);
      setTabLoadingLabel(label);
    }, 300);

    try {
      await fn();
    } finally {
      clearTimeout(showTimer);
      setTabLoading(false);
      setTabLoadingLabel('');
    }
  }, []);

  // ============================================
  // CORE FETCH — only essentials
  // ============================================
  const fetchCore = useCallback(async ({ silent = false } = {}) => {
    if (!hasLoadedOnce.current && !silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const [sites, workers, teams, attendance, settings] = await withTimeout(
        Promise.all([
          ApiService.getSites().catch(() => []),
          ApiService.getWorkers().catch(() => []),
          ApiService.getTeams().catch(() => []),
          ApiService.getAttendance({ month: currentMonth }).catch(() => []),
          ApiService.getSettings().catch(() => ({})),
        ]),
        15000,
        'coreData'
      );

      setData(prev => ({
        ...prev,
        sites: sites || [],
        workers: workers || [],
        teams: teams || [],
        attendance: attendance || [],
        settings: settings || {},
        workingHours: parseFloat(settings?.working_hours_per_day) || 8,
        monthlyOverheadValue: settings?.monthly_overhead || prev.monthlyOverheadValue,
        companyName: settings?.company_name || prev.companyName,
        companyCr: settings?.company_cr || prev.companyCr,
        companyAddress: settings?.company_address || prev.companyAddress,
        companyPhone: settings?.company_phone || prev.companyPhone,
        companyEmail: settings?.company_email || prev.companyEmail,
      }));

      hasLoadedOnce.current = true;
      console.log('✅ Core data loaded');
    } catch (err) {
      console.error('❌ Core load failed:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      try {
        const snapshot = dataRef.current;
        localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
      } catch (e) { /* ignore quota */ }
    }
  }, []);

  // ============================================
  // BACKGROUND FETCH — projects, entries, etc.
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
      setData(prev => ({ ...prev, ...patch }));
      console.log('✅ Background data loaded:', Object.keys(patch).join(', '));
      try {
        const snapshot = { ...dataRef.current, ...patch };
        localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
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
  // LAZY LOADERS — each wrapped with runLazy
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
    }
  }, []);

  const clockOutWorker = useCallback(async (workerId, date) => {
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
    }
  }, []);

  // ============================================
  // CRUD ACTIONS
  // ============================================
  const addEquipment = useCallback(async (equipment) => {
    try {
      const newEquipment = await ApiService.createEquipment(equipment);
      setData(prev => ({ ...prev, equipment: [...(prev.equipment || []), newEquipment] }));
      return newEquipment;
    } catch (err) { console.error('Failed to add equipment:', err); throw err; }
  }, []);

  const updateEquipment = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateEquipment(id, updates);
      setData(prev => ({ ...prev, equipment: (prev.equipment || []).map(e => e.id === id ? updated : e) }));
      return updated;
    } catch (err) { console.error('Failed to update equipment:', err); throw err; }
  }, []);

  const deleteEquipment = useCallback(async (id) => {
    if (!window.confirm('Delete this equipment?')) return;
    try {
      await ApiService.deleteEquipment(id);
      setData(prev => ({ ...prev, equipment: (prev.equipment || []).filter(e => e.id !== id) }));
    } catch (err) { console.error('Failed to delete equipment:', err); throw err; }
  }, []);

  const addMaintenance = useCallback(async (equipmentId, data) => {
    try {
      const result = await ApiService.addMaintenance(equipmentId, data);
      loadedTabsRef.current.delete('equipment');
      await loadEquipment();
      return result;
    } catch (err) { console.error('Failed to add maintenance:', err); throw err; }
  }, [loadEquipment]);

  const assignEquipment = useCallback(async (equipmentId, data) => {
    try {
      const result = await ApiService.assignEquipment(equipmentId, data);
      loadedTabsRef.current.delete('equipment');
      await loadEquipment();
      return result;
    } catch (err) { console.error('Failed to assign equipment:', err); throw err; }
  }, [loadEquipment]);

  const returnEquipment = useCallback(async (assignmentId, data) => {
    try {
      const result = await ApiService.returnEquipment(assignmentId, data);
      loadedTabsRef.current.delete('equipment');
      await loadEquipment();
      return result;
    } catch (err) { console.error('Failed to return equipment:', err); throw err; }
  }, [loadEquipment]);

  const logEquipmentUsage = useCallback(async (equipmentId, data) => {
    try {
      const result = await ApiService.logUsage(equipmentId, data);
      loadedTabsRef.current.delete('equipment');
      await loadEquipment();
      return result;
    } catch (err) { console.error('Failed to log equipment usage:', err); throw err; }
  }, [loadEquipment]);

  const calculateDepreciation = useCallback(async (equipmentId) => {
    try {
      const result = await ApiService.calculateDepreciation(equipmentId);
      loadedTabsRef.current.delete('equipment');
      await loadEquipment();
      return result;
    } catch (err) { console.error('Failed to calculate depreciation:', err); throw err; }
  }, [loadEquipment]);

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

  // Leave
  const loadLeaveTypes = useCallback(async () => {
    try { const t = await ApiService.getLeaveTypes(); setData(prev => ({ ...prev, leaveTypes: t })); return t; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const createLeaveType = useCallback(async (d) => {
    try { const n = await ApiService.createLeaveType(d); setData(prev => ({ ...prev, leaveTypes: [...prev.leaveTypes, n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const updateLeaveType = useCallback(async (id, d) => {
    try { const u = await ApiService.updateLeaveType(id, d); setData(prev => ({ ...prev, leaveTypes: prev.leaveTypes.map(t => t.id === id ? u : t) })); return u; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const deleteLeaveType = useCallback(async (id) => {
    try { await ApiService.deleteLeaveType(id); setData(prev => ({ ...prev, leaveTypes: prev.leaveTypes.filter(t => t.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const loadLeaveRequests = useCallback(async (filters = {}) => {
    try { const r = await ApiService.getLeaveRequests(filters); setData(prev => ({ ...prev, leaveRequests: r })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const createLeaveRequest = useCallback(async (d) => {
    try { const n = await ApiService.createLeaveRequest(d); setData(prev => ({ ...prev, leaveRequests: [n, ...prev.leaveRequests] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const approveLeaveRequest = useCallback(async (id, d = {}) => {
    try { const a = await ApiService.approveLeaveRequest(id, d); setData(prev => ({ ...prev, leaveRequests: prev.leaveRequests.map(r => r.id === id ? a : r) })); return a; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const rejectLeaveRequest = useCallback(async (id, d = {}) => {
    try { const r = await ApiService.rejectLeaveRequest(id, d); setData(prev => ({ ...prev, leaveRequests: prev.leaveRequests.map(x => x.id === id ? r : x) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const cancelLeaveRequest = useCallback(async (id) => {
    try { const c = await ApiService.cancelLeaveRequest(id); setData(prev => ({ ...prev, leaveRequests: prev.leaveRequests.map(r => r.id === id ? c : r) })); return c; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const loadLeaveBalances = useCallback(async (filters = {}) => {
    try { const b = await ApiService.getLeaveBalances(filters); setData(prev => ({ ...prev, leaveBalances: b })); return b; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const initializeLeaveBalances = useCallback(async (d) => {
    try { const r = await ApiService.initializeLeaveBalances(d); await loadLeaveBalances(); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, [loadLeaveBalances]);

  const loadHolidays = useCallback(async (filters = {}) => {
    try { const h = await ApiService.getHolidays(filters); setData(prev => ({ ...prev, holidays: h })); return h; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const createHoliday = useCallback(async (d) => {
    try { const n = await ApiService.createHoliday(d); setData(prev => ({ ...prev, holidays: [...prev.holidays, n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const updateHoliday = useCallback(async (id, d) => {
    try { const u = await ApiService.updateHoliday(id, d); setData(prev => ({ ...prev, holidays: prev.holidays.map(h => h.id === id ? u : h) })); return u; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const deleteHoliday = useCallback(async (id) => {
    try { await ApiService.deleteHoliday(id); setData(prev => ({ ...prev, holidays: prev.holidays.filter(h => h.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const loadLeaveStats = useCallback(async (filters = {}) => {
    try { const s = await ApiService.getLeaveStats(filters); setData(prev => ({ ...prev, leaveStats: s })); return s; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // Client
  const addClient = useCallback(async (client) => {
    try { const n = await ApiService.createClient(client); setData(prev => ({ ...prev, clients: [...(prev.clients || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateClient = useCallback(async (id, u) => {
    try { const r = await ApiService.updateClient(id, u); setData(prev => ({ ...prev, clients: (prev.clients || []).map(c => c.id === id ? r : c) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteClient = useCallback(async (id) => {
    if (!window.confirm('Delete this client?')) return;
    try { await ApiService.deleteClient(id); setData(prev => ({ ...prev, clients: (prev.clients || []).filter(c => c.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // Project
  const addProject = useCallback(async (project) => {
    try { const n = await ApiService.createProject(project); setData(prev => ({ ...prev, projects: [...(prev.projects || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateProject = useCallback(async (id, u) => {
    try { const r = await ApiService.updateProject(id, u); setData(prev => ({ ...prev, projects: (prev.projects || []).map(p => p.id === id ? r : p) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteProject = useCallback(async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try { await ApiService.deleteProject(id); setData(prev => ({ ...prev, projects: (prev.projects || []).filter(p => p.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const calculateProject = useCallback(async (id) => {
    try { return await ApiService.calculateProject(id); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const getProjectSummary = useCallback(async () => {
    try { return await ApiService.getProjectSummary(); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // Monthly overhead
  const addMonthlyOverhead = useCallback(async (o) => {
    try { const n = await ApiService.createMonthlyOverhead(o); setData(prev => ({ ...prev, monthlyOverhead: [...(prev.monthlyOverhead || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateMonthlyOverhead = useCallback(async (id, u) => {
    try { const r = await ApiService.updateMonthlyOverhead(id, u); setData(prev => ({ ...prev, monthlyOverhead: (prev.monthlyOverhead || []).map(i => i.id === id ? r : i) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteMonthlyOverhead = useCallback(async (id) => {
    if (!window.confirm('Delete this overhead entry?')) return;
    try { await ApiService.deleteMonthlyOverhead(id); setData(prev => ({ ...prev, monthlyOverhead: (prev.monthlyOverhead || []).filter(i => i.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // Monthly summary
  const addMonthlySummary = useCallback(async (s) => {
    try { const n = await ApiService.createMonthlySummary(s); setData(prev => ({ ...prev, monthlySummary: [...(prev.monthlySummary || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateMonthlySummary = useCallback(async (id, u) => {
    try { const r = await ApiService.updateMonthlySummary(id, u); setData(prev => ({ ...prev, monthlySummary: (prev.monthlySummary || []).map(i => i.id === id ? r : i) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteMonthlySummary = useCallback(async (id) => {
    if (!window.confirm('Delete this monthly summary?')) return;
    try { await ApiService.deleteMonthlySummary(id); setData(prev => ({ ...prev, monthlySummary: (prev.monthlySummary || []).filter(i => i.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const calculateMonthlySummary = useCallback(async (month) => {
    try {
      const result = await ApiService.calculateMonthlySummary(month);
      loadedTabsRef.current.delete('monthlySummary');
      await loadMonthlySummary();
      return result;
    } catch (err) { console.error('Failed:', err); throw err; }
  }, [loadMonthlySummary]);

  // Cumulative
  const addCumulativeEntry = useCallback(async (e) => {
    try { const n = await ApiService.createCumulativeTracker(e); setData(prev => ({ ...prev, cumulativeTracker: [...(prev.cumulativeTracker || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  const fetchMonthlyExpenseSummary = useCallback(async (month) => {
    try { const s = await ApiService.getMonthlyExpenseSummary(month); setExpenseSummary(s); return s; }
    catch (err) { console.error('Failed:', err); return null; }
  }, []);

  // Entries
  const addEntry = useCallback(async (entry) => {
    try { const n = await ApiService.createEntry(entry); setData(prev => ({ ...prev, entries: [n, ...prev.entries] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateEntry = useCallback(async (id, u) => {
    try { const r = await ApiService.updateEntry(id, u); setData(prev => ({ ...prev, entries: prev.entries.map(e => e.id === id ? r : e) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteEntry = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try { await ApiService.deleteEntry(id); setData(prev => ({ ...prev, entries: prev.entries.filter(e => e.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // Sites
  const addSite = useCallback(async (site) => {
    try { const n = await ApiService.createSite(site); setData(prev => ({ ...prev, sites: [...prev.sites, n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateSite = useCallback(async (id, u) => {
    try { const r = await ApiService.updateSite(id, u); setData(prev => ({ ...prev, sites: prev.sites.map(s => s.id === id ? r : s) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteSite = useCallback(async (id) => {
    if (!window.confirm('Delete this site?')) return;
    try {
      await ApiService.deleteSite(id);
      setData(prev => ({ ...prev, sites: prev.sites.filter(s => s.id !== id), entries: prev.entries.filter(e => e.siteId !== id) }));
    } catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // Workers
  const addWorker = useCallback(async (worker) => {
    try { const n = await ApiService.createWorker(worker); setData(prev => ({ ...prev, workers: [...prev.workers, n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateWorker = useCallback(async (id, u) => {
    try { const r = await ApiService.updateWorker(id, u); setData(prev => ({ ...prev, workers: prev.workers.map(w => w.id === id ? r : w) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteWorker = useCallback(async (id) => {
    if (!window.confirm('Delete this worker?')) return;
    try {
      await ApiService.deleteWorker(id);
      setData(prev => ({ ...prev, workers: prev.workers.filter(w => w.id !== id), attendance: prev.attendance.filter(a => a.workerId !== id) }));
    } catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // Teams
  const addTeam = useCallback(async (team) => {
    try { const n = await ApiService.createTeam(team); setData(prev => ({ ...prev, teams: [...(prev.teams || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateTeam = useCallback(async (id, u) => {
    try { const r = await ApiService.updateTeam(id, u); setData(prev => ({ ...prev, teams: (prev.teams || []).map(t => t.id === id ? r : t) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteTeam = useCallback(async (id) => {
    if (!window.confirm('Delete this team?')) return;
    try { await ApiService.deleteTeam(id); setData(prev => ({ ...prev, teams: (prev.teams || []).filter(t => t.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const addTeamMember = useCallback(async (teamId, member) => {
    try {
      const n = await ApiService.addTeamMember(teamId, member);
      setData(prev => ({ ...prev, teams: (prev.teams || []).map(t => t.id === teamId ? { ...t, members: [...(t.members || []), n] } : t) }));
      return n;
    } catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const removeTeamMember = useCallback(async (teamId, memberId) => {
    try {
      await ApiService.removeTeamMember(teamId, memberId);
      setData(prev => ({ ...prev, teams: (prev.teams || []).map(t => t.id === teamId ? { ...t, members: (t.members || []).filter(m => m.id !== memberId) } : t) }));
    } catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // Expenses
  const addExpense = useCallback(async (e) => {
    try { const n = await ApiService.createExpense(e); setData(prev => ({ ...prev, expenses: [...(prev.expenses || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateExpense = useCallback(async (id, u) => {
    try { const r = await ApiService.updateExpense(id, u); setData(prev => ({ ...prev, expenses: (prev.expenses || []).map(e => e.id === id ? r : e) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteExpense = useCallback(async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await ApiService.deleteExpense(id); setData(prev => ({ ...prev, expenses: (prev.expenses || []).filter(e => e.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // Invoices
  const addInvoice = useCallback(async (i) => {
    try { const n = await ApiService.createInvoice(i); setData(prev => ({ ...prev, invoices: [...(prev.invoices || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateInvoice = useCallback(async (id, u) => {
    try { const r = await ApiService.updateInvoice(id, u); setData(prev => ({ ...prev, invoices: (prev.invoices || []).map(i => i.id === id ? r : i) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteInvoice = useCallback(async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try { await ApiService.deleteInvoice(id); setData(prev => ({ ...prev, invoices: (prev.invoices || []).filter(i => i.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

  // Items
  const addItem = useCallback(async (i) => {
    try { const n = await ApiService.createItem(i); setData(prev => ({ ...prev, items: [...(prev.items || []), n] })); return n; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const updateItem = useCallback(async (id, u) => {
    try { const r = await ApiService.updateItem(id, u); setData(prev => ({ ...prev, items: (prev.items || []).map(i => i.id === id ? r : i) })); return r; }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);
  const deleteItem = useCallback(async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try { await ApiService.deleteItem(id); setData(prev => ({ ...prev, items: (prev.items || []).filter(i => i.id !== id) })); }
    catch (err) { console.error('Failed:', err); throw err; }
  }, []);

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
    tabLoading,        // ⭐ NEW
    tabLoadingLabel,   // ⭐ NEW
    error,
    loadData,
    refreshData,
    updateData,

    // Lazy loaders
    loadEntries,
    loadExpenses,
    loadInvoices,
    loadItems,
    loadProjects,
    loadClients,
    loadEquipment,
    loadPerformance,
    loadLeave,
    loadQuality,
    loadMonthlyOverhead,
    loadMonthlySummary,
    loadCumulativeTracker,

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