// src/hooks/useData.js
import { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';
import Utils from '../utils/Utils';

const useData = () => {
  const [data, setData] = useState({
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
    // ===== ADD THESE =====
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
    // ====================
    monthlyOverheadValue: 194,
    vatRate: 0,
    workingHours: 8,
    settings: {},
    companyName: 'Haji Younas Contracting',
    companyCr: '141997-1',
    companyAddress: '',
    companyPhone: '+973 37099957',
    companyEmail: 'hajiyounas.contracting@gmail.com'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenseSummary, setExpenseSummary] = useState(null);

  // ============================================
  // LOAD DATA - UPDATE THIS SECTION
  // ============================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Loading data...');

      // Fetch monthly summaries
      let monthlySummaryData = [];
      try {
        monthlySummaryData = await ApiService.getMonthlySummaries();
        console.log('📊 Monthly Summary from API:', monthlySummaryData);
      } catch (err) {
        console.error('❌ Error fetching monthly summaries:', err);
        monthlySummaryData = [];
      }

      // Fetch projects
      let projectsData = [];
      try {
        projectsData = await ApiService.getProjects();
        console.log('📋 Projects from API:', projectsData);
      } catch (err) {
        console.error('❌ Error fetching projects:', err);
        projectsData = [];
      }

      // Fetch clients
      let clientsData = [];
      try {
        clientsData = await ApiService.getClients();
        console.log('👤 Clients from API:', clientsData);
      } catch (err) {
        console.error('❌ Error fetching clients:', err);
        clientsData = [];
      }

      // ===== ADD THIS: Fetch equipment =====
      let equipmentData = [];
      try {
        equipmentData = await ApiService.getEquipment();
        console.log('🔧 Equipment from API:', equipmentData);
      } catch (err) {
        console.error('❌ Error fetching equipment:', err);
        equipmentData = [];
      }

      // ===== ADD THIS: Fetch equipment categories =====
      let equipmentCategoriesData = [];
      try {
        equipmentCategoriesData = await ApiService.getEquipmentCategories();
        console.log('📂 Equipment Categories from API:', equipmentCategoriesData);
      } catch (err) {
        console.error('❌ Error fetching equipment categories:', err);
        equipmentCategoriesData = [];
      }

      // Fetch Performance Data
      let performanceMetrics = null;
      let performanceRankings = [];
      let performanceTrends = [];
      let performanceKPIs = [];
      try {
        performanceMetrics = await ApiService.getPerformanceMetrics();
        performanceRankings = await ApiService.getPerformanceRankings();
        performanceTrends = await ApiService.getPerformanceTrends();
        performanceKPIs = await ApiService.getPerformanceKPIs();
        console.log('📊 Performance data loaded:', { performanceMetrics, performanceRankings, performanceTrends, performanceKPIs });
      } catch (err) {
        console.error('❌ Error loading performance data:', err);
      }

      // Fetch Leave Data
      let leaveTypes = [];
      let leaveRequests = [];
      let leaveBalances = [];
      let holidays = [];
      let leaveStats = null;
      try {
        leaveTypes = await ApiService.getLeaveTypes();
        leaveRequests = await ApiService.getLeaveRequests();
        leaveBalances = await ApiService.getLeaveBalances();
        holidays = await ApiService.getHolidays();
        leaveStats = await ApiService.getLeaveStats();
        console.log('📅 Leave data loaded:', { leaveTypes, leaveRequests, leaveBalances, holidays, leaveStats });
      } catch (err) {
        console.error('❌ Error loading leave data:', err);
      }

      // Fetch main data
      const [
        sites,
        workers,
        entries,
        attendance,
        settings,
        teams,
        expenses,
        invoices,
        items,
        monthlyOverhead,
        cumulativeTracker,
        overheadCategories
      ] = await Promise.all([
        ApiService.getSites().catch(() => []),
        ApiService.getWorkers().catch(() => []),
        ApiService.getEntries().catch(() => []),
        ApiService.getAttendance().catch(() => []),
        ApiService.getSettings().catch(() => ({})),
        ApiService.getTeams().catch(() => []),
        ApiService.getExpenses().catch(() => []),
        ApiService.getInvoices().catch(() => []),
        ApiService.getItems().catch(() => []),
        ApiService.getMonthlyOverhead ? ApiService.getMonthlyOverhead().catch(() => []) : Promise.resolve([]),
        ApiService.getCumulativeTracker ? ApiService.getCumulativeTracker().catch(() => []) : Promise.resolve([]),
        ApiService.getOverheadCategories ? ApiService.getOverheadCategories().catch(() => []) : Promise.resolve([])
      ]);

      // ===== UPDATE THIS: Include equipment in newData =====
      const newData = {
        sites: sites || [],
        workers: workers || [],
        entries: entries || [],
        attendance: attendance || [],
        teams: teams || [],
        expenses: expenses || [],
        invoices: invoices || [],
        items: items || [],
        materials: [],
        bom: [],
        monthlyOverhead: monthlyOverhead || [],
        cumulativeTracker: cumulativeTracker || [],
        monthlySummary: monthlySummaryData || [],
        overheadCategories: overheadCategories || [],
        projects: projectsData || [],
        clients: clientsData || [],
        // ===== ADD THESE =====
        equipment: equipmentData || [],
        equipmentCategories: equipmentCategoriesData || [],
        performanceMetrics: performanceMetrics || null,
        performanceRankings: performanceRankings || [],
        performanceTrends: performanceTrends || [],
        performanceKPIs: performanceKPIs || [],
        leaveTypes: leaveTypes || [],
        leaveRequests: leaveRequests || [],
        leaveBalances: leaveBalances || [],
        holidays: holidays || [],
        leaveStats: leaveStats || null,
        inspectionTypes: [],
        checklists: [],
        inspections: [],
        issues: [],
        safetyIncidents: [],
        qcSummary: null,
        // ====================
        monthlyOverheadValue: settings?.monthly_overhead || 194,
        vatRate: 0,
        workingHours: parseFloat(settings?.working_hours_per_day) || 8,
        settings: settings || {},
        companyName: settings?.company_name || 'Haji Younas Contracting',
        companyCr: settings?.company_cr || '141997-1',
        companyAddress: settings?.company_address || '',
        companyPhone: settings?.company_phone || '+973 37099957',
        companyEmail: settings?.company_email || 'hajiyounas.contracting@gmail.com'
      };

      console.log('🔧 Final equipment in data:', newData.equipment);
      console.log('🔧 Final equipment count:', newData.equipment?.length);
      console.log('📊 Final performance data:', {
        metrics: newData.performanceMetrics,
        rankings: newData.performanceRankings?.length,
        trends: newData.performanceTrends?.length,
        kpis: newData.performanceKPIs?.length
      });
      console.log('📅 Final leave data:', {
        types: newData.leaveTypes?.length,
        requests: newData.leaveRequests?.length,
        balances: newData.leaveBalances?.length,
        holidays: newData.holidays?.length,
        stats: newData.leaveStats
      });

      setData(newData);

      // Save to localStorage for backup
      try {
        localStorage.setItem('haji_younas_backup', JSON.stringify(newData));
      } catch (e) { }

      console.log('✅ Data loaded successfully');
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data from server. Make sure Flask is running.');

      // Try to load from backup
      try {
        const backup = localStorage.getItem('haji_younas_backup');
        if (backup) {
          const parsed = JSON.parse(backup);
          setData(parsed);
          console.log('📦 Loaded from backup');
        }
      } catch (e) { }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing data...');
    await loadData();
  }, [loadData]);

  // ============================================
  // ===== ADD THIS: EQUIPMENT ACTIONS =====
  // ============================================
  const addEquipment = useCallback(async (equipment) => {
    try {
      const newEquipment = await ApiService.createEquipment(equipment);
      setData(prev => ({
        ...prev,
        equipment: [...(prev.equipment || []), newEquipment]
      }));
      return newEquipment;
    } catch (err) {
      console.error('Failed to add equipment:', err);
      throw err;
    }
  }, []);

  const updateEquipment = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateEquipment(id, updates);
      setData(prev => ({
        ...prev,
        equipment: (prev.equipment || []).map(e => e.id === id ? updated : e)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update equipment:', err);
      throw err;
    }
  }, []);

  const deleteEquipment = useCallback(async (id) => {
    if (!window.confirm('Delete this equipment?')) return;
    try {
      await ApiService.deleteEquipment(id);
      setData(prev => ({
        ...prev,
        equipment: (prev.equipment || []).filter(e => e.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete equipment:', err);
      throw err;
    }
  }, []);

  const addMaintenance = useCallback(async (equipmentId, data) => {
    try {
      const result = await ApiService.addMaintenance(equipmentId, data);
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to add maintenance:', err);
      throw err;
    }
  }, [refreshData]);

  const assignEquipment = useCallback(async (equipmentId, data) => {
    try {
      const result = await ApiService.assignEquipment(equipmentId, data);
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to assign equipment:', err);
      throw err;
    }
  }, [refreshData]);

  const returnEquipment = useCallback(async (assignmentId, data) => {
    try {
      const result = await ApiService.returnEquipment(assignmentId, data);
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to return equipment:', err);
      throw err;
    }
  }, [refreshData]);

  const logEquipmentUsage = useCallback(async (equipmentId, data) => {
    try {
      const result = await ApiService.logUsage(equipmentId, data);
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to log equipment usage:', err);
      throw err;
    }
  }, [refreshData]);

  const calculateDepreciation = useCallback(async (equipmentId) => {
    try {
      const result = await ApiService.calculateDepreciation(equipmentId);
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to calculate depreciation:', err);
      throw err;
    }
  }, [refreshData]);

  // ============================================
  // QUALITY CONTROL ACTIONS
  // ============================================
  const loadQualityData = useCallback(async () => {
    try {
      const [types, checklists, inspections, issues, incidents, summary] = await Promise.all([
        ApiService.getInspectionTypes().catch(() => []),
        ApiService.getChecklists().catch(() => []),
        ApiService.getInspections().catch(() => []),
        ApiService.getIssues().catch(() => []),
        ApiService.getSafetyIncidents().catch(() => []),
        ApiService.getQCSummary().catch(() => ({}))
      ]);

      setData(prev => ({
        ...prev,
        inspectionTypes: types,
        checklists: checklists,
        inspections: inspections,
        issues: issues,
        safetyIncidents: incidents,
        qcSummary: summary
      }));
    } catch (err) {
      console.error('Failed to load quality data:', err);
    }
  }, []);

  // ============================================
  // PERFORMANCE ACTIONS
  // ============================================
  const loadPerformanceMetrics = useCallback(async (filters = {}) => {
    try {
      const metrics = await ApiService.getPerformanceMetrics(filters);
      setData(prev => ({
        ...prev,
        performanceMetrics: metrics
      }));
      return metrics;
    } catch (err) {
      console.error('Failed to load performance metrics:', err);
      throw err;
    }
  }, []);

  const loadPerformanceRankings = useCallback(async (filters = {}) => {
    try {
      const rankings = await ApiService.getPerformanceRankings(filters);
      setData(prev => ({
        ...prev,
        performanceRankings: rankings
      }));
      return rankings;
    } catch (err) {
      console.error('Failed to load performance rankings:', err);
      throw err;
    }
  }, []);

  const loadPerformanceTrends = useCallback(async (filters = {}) => {
    try {
      const trends = await ApiService.getPerformanceTrends(filters);
      setData(prev => ({
        ...prev,
        performanceTrends: trends
      }));
      return trends;
    } catch (err) {
      console.error('Failed to load performance trends:', err);
      throw err;
    }
  }, []);

  const loadPerformanceKPIs = useCallback(async () => {
    try {
      const kpis = await ApiService.getPerformanceKPIs();
      setData(prev => ({
        ...prev,
        performanceKPIs: kpis
      }));
      return kpis;
    } catch (err) {
      console.error('Failed to load performance KPIs:', err);
      throw err;
    }
  }, []);

  // ============================================
  // LEAVE & HOLIDAY ACTIONS
  // ============================================
  const loadLeaveTypes = useCallback(async () => {
    try {
      const types = await ApiService.getLeaveTypes();
      setData(prev => ({
        ...prev,
        leaveTypes: types
      }));
      return types;
    } catch (err) {
      console.error('Failed to load leave types:', err);
      throw err;
    }
  }, []);

  const createLeaveType = useCallback(async (data) => {
    try {
      const newType = await ApiService.createLeaveType(data);
      setData(prev => ({
        ...prev,
        leaveTypes: [...prev.leaveTypes, newType]
      }));
      return newType;
    } catch (err) {
      console.error('Failed to create leave type:', err);
      throw err;
    }
  }, []);

  const updateLeaveType = useCallback(async (id, data) => {
    try {
      const updated = await ApiService.updateLeaveType(id, data);
      setData(prev => ({
        ...prev,
        leaveTypes: prev.leaveTypes.map(t => t.id === id ? updated : t)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update leave type:', err);
      throw err;
    }
  }, []);

  const deleteLeaveType = useCallback(async (id) => {
    try {
      await ApiService.deleteLeaveType(id);
      setData(prev => ({
        ...prev,
        leaveTypes: prev.leaveTypes.filter(t => t.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete leave type:', err);
      throw err;
    }
  }, []);

  const loadLeaveRequests = useCallback(async (filters = {}) => {
    try {
      const requests = await ApiService.getLeaveRequests(filters);
      setData(prev => ({
        ...prev,
        leaveRequests: requests
      }));
      return requests;
    } catch (err) {
      console.error('Failed to load leave requests:', err);
      throw err;
    }
  }, []);

  const createLeaveRequest = useCallback(async (data) => {
    try {
      const newRequest = await ApiService.createLeaveRequest(data);
      setData(prev => ({
        ...prev,
        leaveRequests: [newRequest, ...prev.leaveRequests]
      }));
      return newRequest;
    } catch (err) {
      console.error('Failed to create leave request:', err);
      throw err;
    }
  }, []);

  const approveLeaveRequest = useCallback(async (id, data = {}) => {
    try {
      const approved = await ApiService.approveLeaveRequest(id, data);
      setData(prev => ({
        ...prev,
        leaveRequests: prev.leaveRequests.map(r => r.id === id ? approved : r)
      }));
      return approved;
    } catch (err) {
      console.error('Failed to approve leave request:', err);
      throw err;
    }
  }, []);

  const rejectLeaveRequest = useCallback(async (id, data = {}) => {
    try {
      const rejected = await ApiService.rejectLeaveRequest(id, data);
      setData(prev => ({
        ...prev,
        leaveRequests: prev.leaveRequests.map(r => r.id === id ? rejected : r)
      }));
      return rejected;
    } catch (err) {
      console.error('Failed to reject leave request:', err);
      throw err;
    }
  }, []);

  const cancelLeaveRequest = useCallback(async (id) => {
    try {
      const cancelled = await ApiService.cancelLeaveRequest(id);
      setData(prev => ({
        ...prev,
        leaveRequests: prev.leaveRequests.map(r => r.id === id ? cancelled : r)
      }));
      return cancelled;
    } catch (err) {
      console.error('Failed to cancel leave request:', err);
      throw err;
    }
  }, []);

  const loadLeaveBalances = useCallback(async (filters = {}) => {
    try {
      const balances = await ApiService.getLeaveBalances(filters);
      setData(prev => ({
        ...prev,
        leaveBalances: balances
      }));
      return balances;
    } catch (err) {
      console.error('Failed to load leave balances:', err);
      throw err;
    }
  }, []);

  const initializeLeaveBalances = useCallback(async (data) => {
    try {
      const result = await ApiService.initializeLeaveBalances(data);
      await loadLeaveBalances();
      return result;
    } catch (err) {
      console.error('Failed to initialize leave balances:', err);
      throw err;
    }
  }, [loadLeaveBalances]);

  const loadHolidays = useCallback(async (filters = {}) => {
    try {
      const holidays = await ApiService.getHolidays(filters);
      setData(prev => ({
        ...prev,
        holidays: holidays
      }));
      return holidays;
    } catch (err) {
      console.error('Failed to load holidays:', err);
      throw err;
    }
  }, []);

  const createHoliday = useCallback(async (data) => {
    try {
      const newHoliday = await ApiService.createHoliday(data);
      setData(prev => ({
        ...prev,
        holidays: [...prev.holidays, newHoliday]
      }));
      return newHoliday;
    } catch (err) {
      console.error('Failed to create holiday:', err);
      throw err;
    }
  }, []);

  const updateHoliday = useCallback(async (id, data) => {
    try {
      const updated = await ApiService.updateHoliday(id, data);
      setData(prev => ({
        ...prev,
        holidays: prev.holidays.map(h => h.id === id ? updated : h)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update holiday:', err);
      throw err;
    }
  }, []);

  const deleteHoliday = useCallback(async (id) => {
    try {
      await ApiService.deleteHoliday(id);
      setData(prev => ({
        ...prev,
        holidays: prev.holidays.filter(h => h.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete holiday:', err);
      throw err;
    }
  }, []);

  const loadLeaveStats = useCallback(async (filters = {}) => {
    try {
      const stats = await ApiService.getLeaveStats(filters);
      setData(prev => ({
        ...prev,
        leaveStats: stats
      }));
      return stats;
    } catch (err) {
      console.error('Failed to load leave stats:', err);
      throw err;
    }
  }, []);

  // ============================================
  // CLIENT ACTIONS
  // ============================================
  const addClient = useCallback(async (client) => {
    try {
      const newClient = await ApiService.createClient(client);
      setData(prev => ({
        ...prev,
        clients: [...(prev.clients || []), newClient]
      }));
      return newClient;
    } catch (err) {
      console.error('Failed to add client:', err);
      throw err;
    }
  }, []);

  const updateClient = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateClient(id, updates);
      setData(prev => ({
        ...prev,
        clients: (prev.clients || []).map(c => c.id === id ? updated : c)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update client:', err);
      throw err;
    }
  }, []);

  const deleteClient = useCallback(async (id) => {
    if (!window.confirm('Delete this client?')) return;
    try {
      await ApiService.deleteClient(id);
      setData(prev => ({
        ...prev,
        clients: (prev.clients || []).filter(c => c.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete client:', err);
      throw err;
    }
  }, []);

  // ============================================
  // PROJECT ACTIONS
  // ============================================
  const addProject = useCallback(async (project) => {
    try {
      const newProject = await ApiService.createProject(project);
      setData(prev => ({
        ...prev,
        projects: [...(prev.projects || []), newProject]
      }));
      return newProject;
    } catch (err) {
      console.error('Failed to add project:', err);
      throw err;
    }
  }, []);

  const updateProject = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateProject(id, updates);
      setData(prev => ({
        ...prev,
        projects: (prev.projects || []).map(p => p.id === id ? updated : p)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await ApiService.deleteProject(id);
      setData(prev => ({
        ...prev,
        projects: (prev.projects || []).filter(p => p.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete project:', err);
      throw err;
    }
  }, []);

  const calculateProject = useCallback(async (id) => {
    try {
      const result = await ApiService.calculateProject(id);
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to calculate project:', err);
      throw err;
    }
  }, [refreshData]);

  const getProjectSummary = useCallback(async () => {
    try {
      return await ApiService.getProjectSummary();
    } catch (err) {
      console.error('Failed to get project summary:', err);
      throw err;
    }
  }, []);

  // ============================================
  // MONTHLY OVERHEAD ACTIONS
  // ============================================
  const addMonthlyOverhead = useCallback(async (overhead) => {
    try {
      const newOverhead = await ApiService.createMonthlyOverhead(overhead);
      setData(prev => ({
        ...prev,
        monthlyOverhead: [...(prev.monthlyOverhead || []), newOverhead]
      }));
      return newOverhead;
    } catch (err) {
      console.error('Failed to add monthly overhead:', err);
      throw err;
    }
  }, []);

  const updateMonthlyOverhead = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateMonthlyOverhead(id, updates);
      setData(prev => ({
        ...prev,
        monthlyOverhead: (prev.monthlyOverhead || []).map(item =>
          item.id === id ? updated : item
        )
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update monthly overhead:', err);
      throw err;
    }
  }, []);

  const deleteMonthlyOverhead = useCallback(async (id) => {
    if (!window.confirm('Delete this overhead entry?')) return;
    try {
      await ApiService.deleteMonthlyOverhead(id);
      setData(prev => ({
        ...prev,
        monthlyOverhead: (prev.monthlyOverhead || []).filter(item => item.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete monthly overhead:', err);
      throw err;
    }
  }, []);

  // ============================================
  // MONTHLY SUMMARY ACTIONS
  // ============================================
  const addMonthlySummary = useCallback(async (summary) => {
    try {
      const newSummary = await ApiService.createMonthlySummary(summary);
      setData(prev => ({
        ...prev,
        monthlySummary: [...(prev.monthlySummary || []), newSummary]
      }));
      return newSummary;
    } catch (err) {
      console.error('Failed to add monthly summary:', err);
      throw err;
    }
  }, []);

  const updateMonthlySummary = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateMonthlySummary(id, updates);
      setData(prev => ({
        ...prev,
        monthlySummary: (prev.monthlySummary || []).map(item =>
          item.id === id ? updated : item
        )
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update monthly summary:', err);
      throw err;
    }
  }, []);

  const deleteMonthlySummary = useCallback(async (id) => {
    if (!window.confirm('Delete this monthly summary?')) return;
    try {
      await ApiService.deleteMonthlySummary(id);
      setData(prev => ({
        ...prev,
        monthlySummary: (prev.monthlySummary || []).filter(item => item.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete monthly summary:', err);
      throw err;
    }
  }, []);

  const calculateMonthlySummary = useCallback(async (month) => {
    try {
      console.log('📊 Calculating monthly summary for:', month);
      const result = await ApiService.calculateMonthlySummary(month);
      console.log('📊 Calculate result:', result);
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to calculate monthly summary:', err);
      throw err;
    }
  }, [refreshData]);

  // ============================================
  // CUMULATIVE TRACKER ACTIONS
  // ============================================
  const addCumulativeEntry = useCallback(async (entry) => {
    try {
      const newEntry = await ApiService.createCumulativeTracker(entry);
      setData(prev => ({
        ...prev,
        cumulativeTracker: [...(prev.cumulativeTracker || []), newEntry]
      }));
      return newEntry;
    } catch (err) {
      console.error('Failed to add cumulative entry:', err);
      throw err;
    }
  }, []);

  const fetchMonthlyExpenseSummary = useCallback(async (month) => {
    try {
      const summary = await ApiService.getMonthlyExpenseSummary(month);
      setExpenseSummary(summary);
      return summary;
    } catch (err) {
      console.error('Failed to fetch monthly expense summary:', err);
      return null;
    }
  }, []);

  const clockInWorker = useCallback(async (workerId, date, siteId) => {
    try {
      const now = new Date().toISOString();
      const attendanceData = {
        workerId,
        date,
        siteId,              // ← the fix
        checkedIn: now,
        checkedOut: null,
        present: true
      };
      const result = await ApiService.createAttendance(attendanceData);
      setData(prev => {
        const existing = prev.attendance.find(a => a.workerId === workerId && a.date === date);
        if (existing) {
          return {
            ...prev,
            attendance: prev.attendance.map(a =>
              a.workerId === workerId && a.date === date ? result : a
            )
          };
        } else {
          return { ...prev, attendance: [...prev.attendance, result] };
        }
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
    const existing = data.attendance.find(
      a => a.workerId === workerId && a.date === date && !a.checkedOut
    );
    if (!existing) throw new Error('Worker not checked in');
    if (existing.checkedOut) throw new Error('Worker already clocked out');

    // Update the existing row instead of creating a new one
    const result = await ApiService.updateAttendance(existing.id, {
      checkedOut: now
    });

    setData(prev => ({
      ...prev,
      attendance: prev.attendance.map(a =>
        a.id === existing.id ? result : a
      )
    }));
    return result;
  } catch (err) {
    console.error('Failed to clock out:', err);
    throw err;
  }
}, [data.attendance]);

  // ============================================
  // ENTRY ACTIONS
  // ============================================
  const addEntry = useCallback(async (entry) => {
    try {
      const newEntry = await ApiService.createEntry(entry);
      setData(prev => ({ ...prev, entries: [newEntry, ...prev.entries] }));
      return newEntry;
    } catch (err) {
      console.error('Failed to add entry:', err);
      throw err;
    }
  }, []);

  const updateEntry = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateEntry(id, updates);
      setData(prev => ({
        ...prev,
        entries: prev.entries.map(e => e.id === id ? updated : e)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update entry:', err);
      throw err;
    }
  }, []);

  const deleteEntry = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await ApiService.deleteEntry(id);
      setData(prev => ({ ...prev, entries: prev.entries.filter(e => e.id !== id) }));
    } catch (err) {
      console.error('Failed to delete entry:', err);
      throw err;
    }
  }, []);

  // ============================================
  // SITE ACTIONS
  // ============================================
  const addSite = useCallback(async (site) => {
    try {
      const newSite = await ApiService.createSite(site);
      setData(prev => ({ ...prev, sites: [...prev.sites, newSite] }));
      return newSite;
    } catch (err) {
      console.error('Failed to add site:', err);
      throw err;
    }
  }, []);

  const updateSite = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateSite(id, updates);
      setData(prev => ({
        ...prev,
        sites: prev.sites.map(s => s.id === id ? updated : s)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update site:', err);
      throw err;
    }
  }, []);

  const deleteSite = useCallback(async (id) => {
    if (!window.confirm('Delete this site? All associated entries will be removed.')) return;
    try {
      await ApiService.deleteSite(id);
      setData(prev => ({
        ...prev,
        sites: prev.sites.filter(s => s.id !== id),
        entries: prev.entries.filter(e => e.siteId !== id)
      }));
    } catch (err) {
      console.error('Failed to delete site:', err);
      throw err;
    }
  }, []);

  // ============================================
  // WORKER ACTIONS
  // ============================================
  const addWorker = useCallback(async (worker) => {
    try {
      const newWorker = await ApiService.createWorker(worker);
      setData(prev => ({ ...prev, workers: [...prev.workers, newWorker] }));
      return newWorker;
    } catch (err) {
      console.error('Failed to add worker:', err);
      throw err;
    }
  }, []);

  const updateWorker = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateWorker(id, updates);
      setData(prev => ({
        ...prev,
        workers: prev.workers.map(w => w.id === id ? updated : w)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update worker:', err);
      throw err;
    }
  }, []);

  const deleteWorker = useCallback(async (id) => {
    if (!window.confirm('Delete this worker? All attendance records will be removed.')) return;
    try {
      await ApiService.deleteWorker(id);
      setData(prev => ({
        ...prev,
        workers: prev.workers.filter(w => w.id !== id),
        attendance: prev.attendance.filter(a => a.workerId !== id)
      }));
    } catch (err) {
      console.error('Failed to delete worker:', err);
      throw err;
    }
  }, []);

  // ============================================
  // TEAM ACTIONS
  // ============================================
  const addTeam = useCallback(async (team) => {
    try {
      const newTeam = await ApiService.createTeam(team);
      setData(prev => ({ ...prev, teams: [...(prev.teams || []), newTeam] }));
      return newTeam;
    } catch (err) {
      console.error('Failed to add team:', err);
      throw err;
    }
  }, []);

  const updateTeam = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateTeam(id, updates);
      setData(prev => ({
        ...prev,
        teams: (prev.teams || []).map(t => t.id === id ? updated : t)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update team:', err);
      throw err;
    }
  }, []);

  const deleteTeam = useCallback(async (id) => {
    if (!window.confirm('Delete this team?')) return;
    try {
      await ApiService.deleteTeam(id);
      setData(prev => ({
        ...prev,
        teams: (prev.teams || []).filter(t => t.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete team:', err);
      throw err;
    }
  }, []);

  const addTeamMember = useCallback(async (teamId, member) => {
    try {
      const newMember = await ApiService.addTeamMember(teamId, member);
      setData(prev => ({
        ...prev,
        teams: (prev.teams || []).map(t =>
          t.id === teamId
            ? { ...t, members: [...(t.members || []), newMember] }
            : t
        )
      }));
      return newMember;
    } catch (err) {
      console.error('Failed to add team member:', err);
      throw err;
    }
  }, []);

  const removeTeamMember = useCallback(async (teamId, memberId) => {
    try {
      await ApiService.removeTeamMember(teamId, memberId);
      setData(prev => ({
        ...prev,
        teams: (prev.teams || []).map(t =>
          t.id === teamId
            ? { ...t, members: (t.members || []).filter(m => m.id !== memberId) }
            : t
        )
      }));
    } catch (err) {
      console.error('Failed to remove team member:', err);
      throw err;
    }
  }, []);

  // ============================================
  // EXPENSE ACTIONS
  // ============================================
  const addExpense = useCallback(async (expense) => {
    try {
      const newExpense = await ApiService.createExpense(expense);
      setData(prev => ({ ...prev, expenses: [...(prev.expenses || []), newExpense] }));
      return newExpense;
    } catch (err) {
      console.error('Failed to add expense:', err);
      throw err;
    }
  }, []);

  const updateExpense = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateExpense(id, updates);
      setData(prev => ({
        ...prev,
        expenses: (prev.expenses || []).map(e => e.id === id ? updated : e)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update expense:', err);
      throw err;
    }
  }, []);

  const deleteExpense = useCallback(async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await ApiService.deleteExpense(id);
      setData(prev => ({
        ...prev,
        expenses: (prev.expenses || []).filter(e => e.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete expense:', err);
      throw err;
    }
  }, []);

  // ============================================
  // INVOICE ACTIONS
  // ============================================
  const addInvoice = useCallback(async (invoice) => {
    try {
      const newInvoice = await ApiService.createInvoice(invoice);
      setData(prev => ({ ...prev, invoices: [...(prev.invoices || []), newInvoice] }));
      return newInvoice;
    } catch (err) {
      console.error('Failed to add invoice:', err);
      throw err;
    }
  }, []);

  const updateInvoice = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateInvoice(id, updates);
      setData(prev => ({
        ...prev,
        invoices: (prev.invoices || []).map(i => i.id === id ? updated : i)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update invoice:', err);
      throw err;
    }
  }, []);

  const deleteInvoice = useCallback(async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await ApiService.deleteInvoice(id);
      setData(prev => ({
        ...prev,
        invoices: (prev.invoices || []).filter(i => i.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      throw err;
    }
  }, []);

  // ============================================
  // ITEM ACTIONS
  // ============================================
  const addItem = useCallback(async (item) => {
    try {
      const newItem = await ApiService.createItem(item);
      setData(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
      return newItem;
    } catch (err) {
      console.error('Failed to add item:', err);
      throw err;
    }
  }, []);

  const updateItem = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateItem(id, updates);
      setData(prev => ({
        ...prev,
        items: (prev.items || []).map(i => i.id === id ? updated : i)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update item:', err);
      throw err;
    }
  }, []);

  const deleteItem = useCallback(async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await ApiService.deleteItem(id);
      setData(prev => ({
        ...prev,
        items: (prev.items || []).filter(i => i.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete item:', err);
      throw err;
    }
  }, []);

  // ============================================
  // DATA UPDATE
  // ============================================
  const updateData = useCallback((newData) => {
    setData(prev => ({ ...prev, ...newData }));
  }, []);

  // ============================================
  // RETURN STATEMENT - UPDATE WITH ALL ACTIONS
  // ============================================
  return {
    data,
    loading,
    error,
    loadData,
    refreshData,
    updateData,

    // Equipment actions
    addEquipment,
    updateEquipment,
    deleteEquipment,
    addMaintenance,
    assignEquipment,
    returnEquipment,
    logEquipmentUsage,
    calculateDepreciation,

    // Client actions
    addClient,
    updateClient,
    deleteClient,

    // Project actions
    addProject,
    updateProject,
    deleteProject,
    calculateProject,
    getProjectSummary,

    // Entry actions
    addEntry,
    updateEntry,
    deleteEntry,

    // Site actions
    addSite,
    updateSite,
    deleteSite,

    // Worker actions
    addWorker,
    updateWorker,
    deleteWorker,

    // Attendance actions
    clockInWorker,
    clockOutWorker,

    // Team actions
    addTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,

    // Expense actions
    addExpense,
    updateExpense,
    deleteExpense,

    // Invoice actions
    addInvoice,
    updateInvoice,
    deleteInvoice,

    // Item actions
    addItem,
    updateItem,
    deleteItem,

    // Monthly Overhead actions
    addMonthlyOverhead,
    updateMonthlyOverhead,
    deleteMonthlyOverhead,

    // Monthly Summary actions
    addMonthlySummary,
    updateMonthlySummary,
    deleteMonthlySummary,
    calculateMonthlySummary,

    // Cumulative Tracker actions
    addCumulativeEntry,

    // Expense Summary
    expenseSummary,
    fetchMonthlyExpenseSummary,

    // Quality Control
    loadQualityData,

    // Performance
    loadPerformanceMetrics,
    loadPerformanceRankings,
    loadPerformanceTrends,
    loadPerformanceKPIs,

    // Leave & Holiday
    loadLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    loadLeaveRequests,
    createLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    cancelLeaveRequest,
    loadLeaveBalances,
    initializeLeaveBalances,
    loadHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    loadLeaveStats
  };
};

export default useData;