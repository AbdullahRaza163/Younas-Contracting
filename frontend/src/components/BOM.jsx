// src/components/BOM.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, ClipboardList, TrendingUp as TrendingUpIcon, Edit, Trash2,
  PlusCircle, Save, X, Plus, Search, RefreshCw, CheckCircle, AlertCircle,
  Banknote, Layers, BarChart3, PieChart as PieChartIcon,
  Building2, Calendar, Sparkles, Minus, Users, Clock, Flame,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  LayoutDashboard, TrendingDown, Info, Loader2, AlertTriangle,
  Target, Calculator, ArrowUpRight, ArrowDownRight, Percent,
  Coffee, MapPin, Zap, FileText, GitBranch
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  ComposedChart, Area, Legend
} from 'recharts';
import Utils from '../utils/Utils';
import './BOM.css';
import useUnits from '../hooks/useUnits';
import ApiService from '../services/ApiService';

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
    <div className="bom-chart-tooltip">
      {label && <div className="bom-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="bom-chart-tooltip-row">
          <span className="bom-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="bom-chart-tooltip-name">{p.name}</span>
          <span className="bom-chart-tooltip-val">
            {formatter ? formatter(p.value, p.name) : Utils.formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// CONSTANTS
// ============================================
const DEFAULT_CATEGORIES = [
  'Construction', 'Steel', 'Cement', 'Sand', 'Gravel', 'Wood',
  'Electrical', 'Plumbing', 'Finishing', 'Painting', 'Glass', 'Insulation',
  'Bricks', 'Concrete', 'Roofing', 'Hardware'
];

const FALLBACK_UNITS = ['kg', 'ton', 'm3', 'm2', 'liters', 'pieces', 'rolls', 'sheets', 'bags', 'boxes'];

// ⭐ Benchmarking baselines — the industry-standard ranges we compare against.
// These are only used when we don't have enough historical data yet.
const BENCHMARKS = {
  residential: {
    cementPerM2: 0.18,   // tons/m²
    steelPerM2: 0.10,
    sandPerM2: 0.14,
    gravelPerM2: 0.12,
    woodPerM2: 0.05,
    labourHoursPerM2: 2.5,
    overheadPerM2: 8.0,  // BD/m² baseline
  },
  commercial: {
    cementPerM2: 0.22,
    steelPerM2: 0.14,
    sandPerM2: 0.16,
    gravelPerM2: 0.14,
    woodPerM2: 0.03,
    labourHoursPerM2: 3.2,
    overheadPerM2: 11.0,
  },
  industrial: {
    cementPerM2: 0.28,
    steelPerM2: 0.20,
    sandPerM2: 0.12,
    gravelPerM2: 0.18,
    woodPerM2: 0.02,
    labourHoursPerM2: 4.0,
    overheadPerM2: 14.0,
  },
};

// ============================================
// ⭐ HELPERS
// ============================================

/** Get the previous N months as "YYYY-MM" strings */
const getLastNMonths = (n = 6) => {
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out.reverse();
};

/** Days in a "YYYY-MM" month */
const daysInMonth = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

/** Match a material to a category keyword (cement, steel, etc.) */
const materialMatchesKeyword = (mat, keyword) => {
  const name = (mat.name || '').toLowerCase();
  const cat = (mat.category || '').toLowerCase();
  const k = keyword.toLowerCase();
  return name.includes(k) || cat.includes(k) || cat === k;
};

/** Match material keywords against entries — for historical consumption */
const getKeywordForMaterial = (mat) => {
  const name = (mat.name || '').toLowerCase();
  for (const k of ['cement', 'steel', 'sand', 'gravel', 'wood', 'bricks', 'concrete']) {
    if (name.includes(k)) return k;
  }
  return (mat.category || '').toLowerCase();
};

// ============================================
// ⭐ CORE: Historical Estimation Engine
// ============================================
const buildHistoricalAnalysis = (data) => {
  const entries = data?.entries || [];
  const attendance = data?.attendance || [];
  const workers = data?.workers || [];
  const monthlyOverhead = data?.monthlyOverhead || [];
  const sites = data?.sites || [];

  const workersMap = {};
  workers.forEach(w => { workersMap[w.id] = w; });

  // Group everything by month
  const byMonth = {};
  const addToMonth = (month, key, value) => {
    if (!byMonth[month]) byMonth[month] = {
      month, entries: [], attendance: [], overhead: 0,
      revenue: 0, materialCost: 0, labourCost: 0, equipmentCost: 0,
      transportCost: 0, otherExpense: 0, oneTimeCost: 0, wages: 0,
      totalHours: 0, presentDays: 0, sites: new Set(),
    };
    byMonth[month][key] += value;
  };

  // Entries
  entries.forEach(e => {
    const m = (e.date || '').slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = {
      month: m, entries: [], attendance: [], overhead: 0,
      revenue: 0, materialCost: 0, labourCost: 0, equipmentCost: 0,
      transportCost: 0, otherExpense: 0, oneTimeCost: 0, wages: 0,
      totalHours: 0, presentDays: 0, sites: new Set(),
    };
    byMonth[m].entries.push(e);
    byMonth[m].revenue += Number(e.kamai) || 0;
    byMonth[m].materialCost += Number(e.materialCost) || 0;
    byMonth[m].labourCost += Number(e.labour) || 0;
    byMonth[m].equipmentCost += Number(e.equipmentCost) || 0;
    byMonth[m].transportCost += Number(e.transportCost) || 0;
    byMonth[m].otherExpense += Number(e.otherExpense) || 0;
    byMonth[m].oneTimeCost += Number(e.oneTime) || 0;
    byMonth[m].overhead += Number(e.overhead) || 0;
    if (e.siteId) byMonth[m].sites.add(e.siteId);
  });

  // Attendance (for wages)
  attendance.forEach(a => {
    const m = (a.date || '').slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = {
      month: m, entries: [], attendance: [], overhead: 0,
      revenue: 0, materialCost: 0, labourCost: 0, equipmentCost: 0,
      transportCost: 0, otherExpense: 0, oneTimeCost: 0, wages: 0,
      totalHours: 0, presentDays: 0, sites: new Set(),
    };
    byMonth[m].attendance.push(a);
    byMonth[m].totalHours += Number(a.totalHours) || 0;
    if (a.present) byMonth[m].presentDays += 1;

    // Compute wage from worker rate
    const w = workersMap[a.workerId];
    if (w) {
      const hourly = Number(w.hourlyRate) || Number(w.dailyRate) || 0;
      const normal = Number(a.normalHours) || Number(a.totalHours) || 0;
      const ot = Number(a.overtimeHours) || 0;
      const otRate = Number(a.overtimeEnabled !== false ? 1.5 : 1.0);
      byMonth[m].wages += (normal * hourly) + (ot * hourly * otRate);
    }
  });

  // MonthlyOverhead — realized per month
  monthlyOverhead.forEach(o => {
    const m = o.month;
    if (!byMonth[m]) byMonth[m] = {
      month: m, entries: [], attendance: [], overhead: 0,
      revenue: 0, materialCost: 0, labourCost: 0, equipmentCost: 0,
      transportCost: 0, otherExpense: 0, oneTimeCost: 0, wages: 0,
      totalHours: 0, presentDays: 0, sites: new Set(),
    };
    // Frequency-aware total
    const freq = (o.frequency || 'monthly').toLowerCase();
    const wd = Number(o.workingDays) || 26;
    const amt = Number(o.amount) || 0;
    let monthly = amt;
    if (freq === 'daily') monthly = amt * wd;
    else if (freq === 'weekly') monthly = amt * Math.ceil(wd / 7);
    else if (freq === 'quarterly') monthly = amt / 3;
    else if (freq === 'yearly') monthly = amt / 12;
    byMonth[m].overhead += monthly;
  });

  // Convert Set → count
  Object.values(byMonth).forEach(m => {
    m.siteCount = m.sites.size;
    delete m.sites;
  });

  return byMonth;
};

// ============================================
// MAIN COMPONENT
// ============================================
const BOMComponent = ({ data, updateData, setTabLoading, setTabLoadingLabel }) => {
  const [activeTab, setActiveTab] = useState('estimate');
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Materials
  const [materials, setMaterials] = useState(() => data.materials || []);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const materialsLoadedRef = React.useRef(false);

  const { units: allUnits } = useUnits();
  const availableUnitNames = useMemo(() => {
    const active = (allUnits || []).filter(u => u.isActive);
    if (active.length > 0) return active.map(u => u.name);
    return FALLBACK_UNITS;
  }, [allUnits]);

  const normalizeMaterial = useCallback((m) => ({
    ...m,
    category: m.category || m.categoryName || 'Construction',
    supplier: m.supplier || m.supplierName || '',
    unit: m.unit || 'kg',
    unitPrice: Number(m.unitPrice ?? m.unit_price ?? 0) || 0,
    quantity: Number(m.quantity ?? 0) || 0,
    reorderLevel: Number(m.reorderLevel ?? m.reorder_level ?? 0) || 0,
  }), []);

  const fetchMaterials = useCallback(async ({ showLoader = true } = {}) => {
    setMaterialsLoading(true);
    if (showLoader && setTabLoading && setTabLoadingLabel) {
      setTabLoading(true);
      setTabLoadingLabel('Loading materials…');
    }
    try {
      const list = await ApiService.getMaterials();
      const normalized = (Array.isArray(list) ? list : []).map(normalizeMaterial);
      setMaterials(normalized);
      if (updateData) updateData({ materials: normalized });
      materialsLoadedRef.current = true;
    } catch (err) {
      console.error('[BOM] fetchMaterials failed:', err);
      showToast('Failed to load materials from server', 'error');
      if (!materialsLoadedRef.current && Array.isArray(data.materials)) {
        setMaterials(data.materials.map(normalizeMaterial));
      }
    } finally {
      setMaterialsLoading(false);
      if (showLoader && setTabLoading) setTabLoading(false);
    }
  }, [normalizeMaterial, updateData, setTabLoading, setTabLoadingLabel, data.materials]);

  useEffect(() => {
    if (!materialsLoadedRef.current) {
      fetchMaterials({ showLoader: false });
    }
  }, [fetchMaterials]);

  // Data
  const boms = useMemo(() => data.bom || [], [data.bom]);
  const sites = useMemo(() => data.sites || [], [data.sites]);
  const entries = useMemo(() => data.entries || [], [data.entries]);

  // ⭐ Historical analysis
  const historical = useMemo(() => buildHistoricalAnalysis(data), [data]);
  const last6Months = useMemo(() => getLastNMonths(6), []);
  const historyArray = useMemo(() =>
    last6Months.map(m => historical[m] || {
      month: m, revenue: 0, materialCost: 0, wages: 0, overhead: 0,
      equipmentCost: 0, transportCost: 0, otherExpense: 0, oneTimeCost: 0,
      totalHours: 0, presentDays: 0, siteCount: 0
    }), [last6Months, historical]);

  // ⭐ Averages from last 3 months (for material rate estimation)
  const recentHistory = useMemo(() => {
    const last3 = historyArray.slice(-3);
    const totals = last3.reduce((acc, m) => ({
      materialCost: acc.materialCost + m.materialCost,
      wages: acc.wages + m.wages,
      overhead: acc.overhead + m.overhead,
      totalHours: acc.totalHours + m.totalHours,
      presentDays: acc.presentDays + m.presentDays,
      revenue: acc.revenue + m.revenue,
      siteCount: acc.siteCount + (m.siteCount || 0),
      months: acc.months + 1,
    }), { materialCost: 0, wages: 0, overhead: 0, totalHours: 0, presentDays: 0, revenue: 0, siteCount: 0, months: 0 });

    const n = Math.max(1, totals.months);
    return {
      avgMaterialPerMonth: totals.materialCost / n,
      avgWagesPerMonth: totals.wages / n,
      avgOverheadPerMonth: totals.overhead / n,
      avgHoursPerMonth: totals.totalHours / n,
      avgPresentDaysPerMonth: totals.presentDays / n,
      avgRevenuePerMonth: totals.revenue / n,
      avgSiteCount: totals.siteCount / n,
      monthsAnalyzed: n,
    };
  }, [historyArray]);

  // Categories
  const categories = useMemo(() => {
    const custom = new Set(DEFAULT_CATEGORIES);
    materials.forEach(m => { if (m.category) custom.add(m.category); });
    return Array.from(custom).sort();
  }, [materials]);

  // UI state
  const [toast2, setToast2] = useState(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);
  const showToast = (message, type = 'success') =>
    setToast({ message, type, id: Date.now() });

  // ⭐ ESTIMATOR STATE
  const [estimateForm, setEstimateForm] = useState({
    projectType: 'residential',
    area: '',
    floors: '1',
    siteId: '',
    startDate: Utils.today(),
    includeOverhead: true,
    includeLabour: true,
    includeMaterial: true,
    overheadMode: 'historical', // 'historical' | 'manual'
    manualOverheadPerM2: '10',
    labourMode: 'historical',
    manualLabourPerM2: '15',
  });
  const [estimateResult, setEstimateResult] = useState(null);

  // ============================================
  // ⭐ CORE: GENERATE ESTIMATE
  // ============================================
  const generateEstimate = useCallback(() => {
    const area = parseFloat(estimateForm.area) || 0;
    const floors = Math.max(1, parseInt(estimateForm.floors) || 1);
    if (area <= 0) {
      showToast('Please enter a valid area (m²)', 'error');
      return;
    }

    const totalArea = area * floors;
    const cfg = BENCHMARKS[estimateForm.projectType] || BENCHMARKS.residential;
    const monthsAnalyzed = Math.max(1, recentHistory.monthsAnalyzed);

    // ── MATERIAL ──
    const materialLines = [];
    let totalMaterialCost = 0;
    let estimatedCount = 0;
    let historicalCount = 0;

    // Try to find each benchmarked material in inventory
    const materialKeys = ['cement', 'steel', 'sand', 'gravel', 'wood', 'bricks'];
    const keyToRateKey = {
      cement: 'cementPerM2',
      steel: 'steelPerM2',
      sand: 'sandPerM2',
      gravel: 'gravelPerM2',
      wood: 'woodPerM2',
      bricks: 'bricksPerM2',
    };

    for (const key of materialKeys) {
      // Try to match a real material
      const match = materials.find(m => materialMatchesKeyword(m, key));
      const rateKey = keyToRateKey[key];
      const benchmarkRate = cfg[rateKey] || 0;

      // ⭐ Try to derive a rate from historical data
      // historicalMaterialCost / (assumed avg area per project) — we don't know area,
      // so we use a pragmatic approximation: (historical material cost per site per month) / assumed 300m²
      const histMaterialPerSite = recentHistory.avgMaterialPerMonth / Math.max(1, recentHistory.avgSiteCount || 1);
      const assumedAreaPerSite = 300; // m² — baseline; improves as data accumulates
      const historicalRate = histMaterialPerSite > 0 ? histMaterialPerSite / assumedAreaPerSite : 0;

      // Pick the rate: benchmark × historical adjustment factor
      // Use blend: 60% historical, 40% benchmark when we have enough data
      let rate = benchmarkRate;
      let rateSource = 'benchmark';
      if (historicalRate > 0 && monthsAnalyzed >= 2) {
        rate = (historicalRate * 0.6) + (benchmarkRate * 0.4);
        rateSource = 'blended';
        historicalCount++;
      } else if (historicalRate > 0) {
        rate = historicalRate;
        rateSource = 'historical';
        historicalCount++;
      } else {
        estimatedCount++;
      }

      // Quantity for this project
      const quantity = rate * totalArea;

      // Unit price from inventory
      let unitPrice = match?.unitPrice || 0;
      if (!unitPrice) {
        // fallback pricing
        const fallbackPrices = { cement: 45, steel: 350, sand: 25, gravel: 30, wood: 180, bricks: 0.25 };
        unitPrice = fallbackPrices[key] || 50;
      }

      const cost = quantity * unitPrice;
      totalMaterialCost += cost;

      materialLines.push({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        unit: match?.unit || (key === 'bricks' ? 'pieces' : key === 'cement' || key === 'steel' ? 'ton' : 'm3'),
        quantity: Math.round(quantity * 100) / 100,
        unitPrice,
        cost: Math.round(cost * 1000) / 1000,
        rate,
        rateSource,
        matchedMaterial: match?.name || null,
        inInventory: !!match,
      });
    }

    // ── LABOUR ──
    let labourCost = 0;
    let labourSource = 'benchmark';
    if (estimateForm.includeLabour) {
      if (estimateForm.labourMode === 'historical' && recentHistory.avgWagesPerMonth > 0) {
        // Use avg wage per m² per month
        // Derive: avg monthly wages / assumed avg monthly area (approx 300m² per site × avg sites)
        const assumedMonthlyArea = 300 * Math.max(1, recentHistory.avgSiteCount || 1);
        const costPerM2 = recentHistory.avgWagesPerMonth / assumedMonthlyArea;
        labourCost = costPerM2 * totalArea;
        labourSource = 'historical';
      } else if (estimateForm.labourMode === 'manual') {
        labourCost = (parseFloat(estimateForm.manualLabourPerM2) || 0) * totalArea;
        labourSource = 'manual';
      } else {
        // Benchmark: estimated hours × avg hourly rate
        const estHours = cfg.labourHoursPerM2 * totalArea;
        const avgHourly = materials.length > 0
          ? materials.reduce((s, m) => s + m.unitPrice, 0) / materials.length / 100
          : 2.5;
        labourCost = estHours * Math.max(1, avgHourly);
        labourSource = 'benchmark';
      }
    }

    // ── OVERHEAD ──
    let overheadCost = 0;
    let overheadSource = 'benchmark';
    if (estimateForm.includeOverhead) {
      if (estimateForm.overheadMode === 'historical' && recentHistory.avgOverheadPerMonth > 0) {
        const assumedMonthlyArea = 300 * Math.max(1, recentHistory.avgSiteCount || 1);
        const costPerM2 = recentHistory.avgOverheadPerMonth / assumedMonthlyArea;
        overheadCost = costPerM2 * totalArea;
        overheadSource = 'historical';
      } else if (estimateForm.overheadMode === 'manual') {
        overheadCost = (parseFloat(estimateForm.manualOverheadPerM2) || 0) * totalArea;
        overheadSource = 'manual';
      } else {
        overheadCost = cfg.overheadPerM2 * totalArea;
        overheadSource = 'benchmark';
      }
    }

    // ── TIMELINE + HOURS ──
    const estimatedHours = cfg.labourHoursPerM2 * totalArea;
    const timeline = Math.max(1, Math.ceil(estimatedHours / 8 / 3)); // 3 workers baseline

    const totalCost = totalMaterialCost + labourCost + overheadCost;

    // ── COMPARISON with last month ──
    const lastMonth = historyArray[historyArray.length - 2] || null;
    const currentMonth = historyArray[historyArray.length - 1] || null;
    const momDelta = (() => {
      if (!lastMonth || !currentMonth) return null;
      const lastTotal = (lastMonth.materialCost || 0) + (lastMonth.wages || 0) + (lastMonth.overhead || 0);
      const currentTotal = (currentMonth.materialCost || 0) + (currentMonth.wages || 0) + (currentMonth.overhead || 0);
      if (lastTotal === 0) return null;
      return ((currentTotal - lastTotal) / Math.abs(lastTotal)) * 100;
    })();

    setEstimateResult({
      projectType: estimateForm.projectType,
      area,
      floors,
      totalArea,
      siteId: estimateForm.siteId,
      materialLines,
      totalMaterialCost,
      labourCost,
      labourSource,
      overheadCost,
      overheadSource,
      totalCost,
      estimatedHours,
      timeline,
      historicalCount,
      estimatedCount,
      momDelta,
      recentHistory,
      generatedAt: new Date().toISOString(),
    });

    showToast('Estimate generated');
  }, [estimateForm, materials, recentHistory, historyArray]);

  // ============================================
  // ⭐ SAVE ESTIMATE AS BOM
  // ============================================
  const saveEstimateAsBOM = useCallback(() => {
    if (!estimateResult) return;
    setSaving(true);
    try {
      const totalMaterialCost = estimateResult.totalMaterialCost;
      const labourCost = estimateResult.labourCost;
      const overhead = estimateResult.overheadCost;

      const bom = {
        id: Date.now().toString(),
        projectName: `${estimateResult.projectType.charAt(0).toUpperCase() + estimateResult.projectType.slice(1)} — ${estimateResult.totalArea.toFixed(0)}m²`,
        siteId: estimateResult.siteId,
        materials: estimateResult.materialLines.map(m => ({
          materialId: m.key,
          name: m.name,
          unit: m.unit,
          unitPrice: m.unitPrice,
          quantity: m.quantity,
          totalCost: m.cost,
        })),
        estimatedHours: estimateResult.estimatedHours,
        labourCost,
        overheadPercentage: 0,
        totalMaterialCost,
        overhead,
        totalCost: estimateResult.totalCost,
        createdAt: new Date().toISOString(),
        source: 'estimate',
      };

      if (updateData) updateData({ bom: [...boms, bom] });
      showToast('Estimate saved as BOM');
    } catch (err) {
      showToast('Failed to save BOM', 'error');
    } finally {
      setSaving(false);
    }
  }, [estimateResult, boms, updateData]);

  // ============================================
  // RENDER: ESTIMATE TAB
  // ============================================
  const renderEstimateTab = () => (
    <div className="bom-view">
      {/* ---- Form ---- */}
      <div className="bom-card">
        <div className="bom-card-header">
          <div className="bom-card-title">
            <span className="bom-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <Calculator size={16} />
            </span>
            <div>
              <h4>Project Estimator</h4>
              <span>Combines historical data with industry benchmarks</span>
            </div>
          </div>
          <div className="bom-history-badge">
            <Clock size={12} />
            <span>{recentHistory.monthsAnalyzed} months analyzed</span>
          </div>
        </div>

        <div className="bom-form-row">
          <div className="bom-form-group">
            <label>Project Type</label>
            <select value={estimateForm.projectType}
              onChange={e => setEstimateForm({ ...estimateForm, projectType: e.target.value })}
              className="bom-form-select">
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>
          <div className="bom-form-group">
            <label>Area (m²) <span className="bom-required">*</span></label>
            <input type="number" min="1" value={estimateForm.area}
              onChange={e => setEstimateForm({ ...estimateForm, area: e.target.value })}
              placeholder="e.g. 250" className="bom-form-input" />
          </div>
          <div className="bom-form-group">
            <label>Floors</label>
            <input type="number" min="1" value={estimateForm.floors}
              onChange={e => setEstimateForm({ ...estimateForm, floors: e.target.value })}
              className="bom-form-input" />
          </div>
        </div>

        <div className="bom-form-row">
          <div className="bom-form-group">
            <label>Site</label>
            <select value={estimateForm.siteId}
              onChange={e => setEstimateForm({ ...estimateForm, siteId: e.target.value })}
              className="bom-form-select">
              <option value="">Company-wide</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="bom-form-group">
            <label>Start Date</label>
            <input type="date" value={estimateForm.startDate}
              onChange={e => setEstimateForm({ ...estimateForm, startDate: e.target.value })}
              className="bom-form-input" />
          </div>
        </div>

        {/* Toggle section */}
        <div className="bom-toggles">
          <label className="bom-toggle-row">
            <input type="checkbox" checked={estimateForm.includeMaterial}
              onChange={e => setEstimateForm({ ...estimateForm, includeMaterial: e.target.checked })} />
            <Package size={13} />
            <span>Include Materials</span>
          </label>

          <label className="bom-toggle-row">
            <input type="checkbox" checked={estimateForm.includeLabour}
              onChange={e => setEstimateForm({ ...estimateForm, includeLabour: e.target.checked })} />
            <Users size={13} />
            <span>Include Labour</span>
          </label>

          <label className="bom-toggle-row">
            <input type="checkbox" checked={estimateForm.includeOverhead}
              onChange={e => setEstimateForm({ ...estimateForm, includeOverhead: e.target.checked })} />
            <Percent size={13} />
            <span>Include Overhead</span>
          </label>
        </div>

        {/* Overhead source */}
        {estimateForm.includeOverhead && (
          <div className="bom-source-row">
            <div className="bom-source-label">
              <Info size={12} />
              <span>Overhead source</span>
            </div>
            <div className="bom-source-buttons">
              <button
                type="button"
                className={`bom-source-btn ${estimateForm.overheadMode === 'historical' ? 'active' : ''}`}
                onClick={() => setEstimateForm({ ...estimateForm, overheadMode: 'historical' })}
                disabled={recentHistory.avgOverheadPerMonth === 0}>
                Historical ({Utils.formatCurrencyShort(recentHistory.avgOverheadPerMonth)}/mo)
              </button>
              <button
                type="button"
                className={`bom-source-btn ${estimateForm.overheadMode === 'benchmark' ? 'active' : ''}`}
                onClick={() => setEstimateForm({ ...estimateForm, overheadMode: 'benchmark' })}>
                Benchmark
              </button>
              <button
                type="button"
                className={`bom-source-btn ${estimateForm.overheadMode === 'manual' ? 'active' : ''}`}
                onClick={() => setEstimateForm({ ...estimateForm, overheadMode: 'manual' })}>
                Manual
              </button>
            </div>
            {estimateForm.overheadMode === 'manual' && (
              <input type="number" min="0" step="0.01" value={estimateForm.manualOverheadPerM2}
                onChange={e => setEstimateForm({ ...estimateForm, manualOverheadPerM2: e.target.value })}
                placeholder="BD per m²" className="bom-form-input" style={{ maxWidth: 160 }} />
            )}
          </div>
        )}

        {/* Labour source */}
        {estimateForm.includeLabour && (
          <div className="bom-source-row">
            <div className="bom-source-label">
              <Info size={12} />
              <span>Labour source</span>
            </div>
            <div className="bom-source-buttons">
              <button
                type="button"
                className={`bom-source-btn ${estimateForm.labourMode === 'historical' ? 'active' : ''}`}
                onClick={() => setEstimateForm({ ...estimateForm, labourMode: 'historical' })}
                disabled={recentHistory.avgWagesPerMonth === 0}>
                Historical ({Utils.formatCurrencyShort(recentHistory.avgWagesPerMonth)}/mo)
              </button>
              <button
                type="button"
                className={`bom-source-btn ${estimateForm.labourMode === 'benchmark' ? 'active' : ''}`}
                onClick={() => setEstimateForm({ ...estimateForm, labourMode: 'benchmark' })}>
                Benchmark
              </button>
              <button
                type="button"
                className={`bom-source-btn ${estimateForm.labourMode === 'manual' ? 'active' : ''}`}
                onClick={() => setEstimateForm({ ...estimateForm, labourMode: 'manual' })}>
                Manual
              </button>
            </div>
            {estimateForm.labourMode === 'manual' && (
              <input type="number" min="0" step="0.01" value={estimateForm.manualLabourPerM2}
                onChange={e => setEstimateForm({ ...estimateForm, manualLabourPerM2: e.target.value })}
                placeholder="BD per m²" className="bom-form-input" style={{ maxWidth: 160 }} />
            )}
          </div>
        )}

        <div className="bom-form-actions">
          <button className="bom-btn bom-btn-primary" onClick={generateEstimate}>
            <Sparkles size={14} /> Generate Estimate
          </button>
          {estimateResult && (
            <button className="bom-btn bom-btn-secondary" onClick={saveEstimateAsBOM} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save as BOM'}
            </button>
          )}
        </div>
      </div>

      {/* ---- Result ---- */}
      {estimateResult && (
        <>
          {/* Summary */}
          <div className="bom-estimate-summary">
            <div className="bom-estimate-item">
              <span className="bom-estimate-label">Project</span>
              <span className="bom-estimate-value" style={{ textTransform: 'capitalize' }}>{estimateResult.projectType}</span>
            </div>
            <div className="bom-estimate-item">
              <span className="bom-estimate-label">Total Area</span>
              <span className="bom-estimate-value">{estimateResult.totalArea.toFixed(0)} m²</span>
            </div>
            <div className="bom-estimate-item">
              <span className="bom-estimate-label">Floors</span>
              <span className="bom-estimate-value">{estimateResult.floors}</span>
            </div>
            <div className="bom-estimate-item">
              <span className="bom-estimate-label">Materials</span>
              <span className="bom-estimate-value">{Utils.formatCurrencyShort(estimateResult.totalMaterialCost)} BD</span>
            </div>
            <div className="bom-estimate-item">
              <span className="bom-estimate-label">Labour</span>
              <span className="bom-estimate-value">{Utils.formatCurrencyShort(estimateResult.labourCost)} BD</span>
              <span className="bom-estimate-meta">
                {estimateResult.labourSource === 'historical' ? '📊 historical' :
                 estimateResult.labourSource === 'manual' ? '✍️ manual' : '📐 benchmark'}
              </span>
            </div>
            <div className="bom-estimate-item">
              <span className="bom-estimate-label">Overhead</span>
              <span className="bom-estimate-value">{Utils.formatCurrencyShort(estimateResult.overheadCost)} BD</span>
              <span className="bom-estimate-meta">
                {estimateResult.overheadSource === 'historical' ? '📊 historical' :
                 estimateResult.overheadSource === 'manual' ? '✍️ manual' : '📐 benchmark'}
              </span>
            </div>
            <div className="bom-estimate-item highlight">
              <span className="bom-estimate-label">TOTAL ESTIMATE</span>
              <span className="bom-estimate-value bom-td-green">
                {Utils.formatCurrency(estimateResult.totalCost)}
              </span>
              {estimateResult.momDelta !== null && (
                <span className={`bom-estimate-delta ${estimateResult.momDelta >= 0 ? 'up' : 'down'}`}>
                  {estimateResult.momDelta >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {Math.abs(estimateResult.momDelta).toFixed(1)}% vs last month
                </span>
              )}
            </div>
          </div>

          {/* Material breakdown */}
          <div className="bom-card">
            <div className="bom-card-header">
              <div className="bom-card-title">
                <span className="bom-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  <Package size={16} />
                </span>
                <div>
                  <h4>Materials Required</h4>
                  <span>{estimateResult.materialLines.length} material types</span>
                </div>
              </div>
            </div>
            <div className="bom-table-wrap">
              <table className="bom-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th className="right">Quantity</th>
                    <th>Unit</th>
                    <th className="right">Rate (BD)</th>
                    <th className="right">Unit Price (BD)</th>
                    <th className="right">Cost (BD)</th>
                    <th className="center">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {estimateResult.materialLines.map((line, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{line.name}</strong>
                        {line.matchedMaterial && <span className="bom-match-badge" title={`Matched to inventory: ${line.matchedMaterial}`}>✓</span>}
                      </td>
                      <td className="right">{line.quantity.toFixed(2)}</td>
                      <td>{line.unit}</td>
                      <td className="right">{line.rate.toFixed(4)}</td>
                      <td className="right">{Utils.formatCurrency(line.unitPrice)}</td>
                      <td className="right bom-td-green"><strong>{Utils.formatCurrencyShort(line.cost)}</strong></td>
                      <td className="center">
                        <span className={`bom-source-tag ${line.rateSource}`}>
                          {line.rateSource === 'historical' && '📊 hist'}
                          {line.rateSource === 'blended' && '🔀 blend'}
                          {line.rateSource === 'benchmark' && '📐 bench'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bom-total-row">
                    <td colSpan={5}><strong>Material Subtotal</strong></td>
                    <td className="right bom-td-green"><strong>{Utils.formatCurrencyShort(estimateResult.totalMaterialCost)}</strong></td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Timeline */}
          <div className="bom-estimate-footer">
            <div className="bom-estimate-footer-item">
              <Clock size={14} />
              <div>
                <span className="bom-estimate-footer-label">Estimated Hours</span>
                <span className="bom-estimate-footer-value">{estimateResult.estimatedHours.toFixed(0)} hrs</span>
              </div>
            </div>
            <div className="bom-estimate-footer-item">
              <Calendar size={14} />
              <div>
                <span className="bom-estimate-footer-label">Timeline</span>
                <span className="bom-estimate-footer-value">{estimateResult.timeline} days</span>
              </div>
            </div>
            <div className="bom-estimate-footer-item">
              <Target size={14} />
              <div>
                <span className="bom-estimate-footer-label">Data Quality</span>
                <span className="bom-estimate-footer-value">
                  {estimateResult.historicalCount} historical · {estimateResult.estimatedCount} benchmark
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ============================================
  // RENDER: HISTORY TAB
  // ============================================
  const renderHistoryTab = () => {
    const chartData = historyArray.map(m => ({
      month: m.month.slice(5),
      material: m.materialCost || 0,
      labour: m.wages || 0,
      overhead: m.overhead || 0,
      revenue: m.revenue || 0,
      totalCost: (m.materialCost || 0) + (m.wages || 0) + (m.overhead || 0),
    }));

    return (
      <div className="bom-view">
        <div className="bom-card">
          <div className="bom-card-header">
            <div className="bom-card-title">
              <span className="bom-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Cost Trend (Last 6 Months)</h4>
                <span>Materials · Labour · Overhead</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="material" name="Material" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="labour" name="Labour" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="overhead" name="Overhead" stackId="a" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bom-card">
          <div className="bom-card-header">
            <div className="bom-card-title">
              <span className="bom-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <FileText size={16} />
              </span>
              <div>
                <h4>Monthly Breakdown</h4>
                <span>Historical cost & wage data</span>
              </div>
            </div>
          </div>
          <div className="bom-table-wrap">
            <table className="bom-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="right">Material</th>
                  <th className="right">Labour</th>
                  <th className="right">Overhead</th>
                  <th className="right">Total</th>
                  <th className="right">Revenue</th>
                  <th className="right">Hours</th>
                  <th className="right">Sites</th>
                </tr>
              </thead>
              <tbody>
                {historyArray.map((m, i) => {
                  const total = (m.materialCost || 0) + (m.wages || 0) + (m.overhead || 0);
                  return (
                    <tr key={i}>
                      <td><strong>{m.month}</strong></td>
                      <td className="right">{Utils.formatCurrencyShort(m.materialCost || 0)}</td>
                      <td className="right">{Utils.formatCurrencyShort(m.wages || 0)}</td>
                      <td className="right">{Utils.formatCurrencyShort(m.overhead || 0)}</td>
                      <td className="right bom-td-green"><strong>{Utils.formatCurrencyShort(total)}</strong></td>
                      <td className="right">{Utils.formatCurrencyShort(m.revenue || 0)}</td>
                      <td className="right">{(m.totalHours || 0).toFixed(1)}h</td>
                      <td className="right">{m.siteCount || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: SAVED BOMS TAB
  // ============================================
  const renderSavedBOMsTab = () => (
    <div className="bom-view">
      {boms.length === 0 ? (
        <div className="bom-empty">
          <div className="bom-empty-icon"><ClipboardList size={40} /></div>
          <h3>No Saved BOMs</h3>
          <p>Generate an estimate and click "Save as BOM" to store it here.</p>
        </div>
      ) : (
        <div className="bom-saved-grid">
          {boms.slice().reverse().map(b => (
            <div key={b.id} className="bom-saved-card">
              <div className="bom-saved-card-header">
                <div className="bom-saved-card-title">
                  <ClipboardList size={15} />
                  <span>{b.projectName}</span>
                </div>
                <div className="bom-saved-card-date">
                  <Calendar size={11} />
                  {Utils.formatDate(b.createdAt)}
                </div>
              </div>
              <div className="bom-saved-card-body">
                <div className="bom-saved-card-stat">
                  <span>Materials</span>
                  <strong>{Utils.formatCurrencyShort(b.totalMaterialCost || 0)}</strong>
                </div>
                <div className="bom-saved-card-stat">
                  <span>Labour</span>
                  <strong>{Utils.formatCurrencyShort(b.labourCost || 0)}</strong>
                </div>
                <div className="bom-saved-card-stat">
                  <span>Overhead</span>
                  <strong>{Utils.formatCurrencyShort(b.overhead || 0)}</strong>
                </div>
                <div className="bom-saved-card-stat highlight">
                  <span>Total</span>
                  <strong className="bom-td-green">{Utils.formatCurrencyShort(b.totalCost || 0)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className={`bom-root ${mounted ? 'is-mounted' : ''}`}>
      {toast && (
        <div className={`bom-toast bom-toast-${toast.type}`} key={toast.id}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="bom-ambient">
        <div className="bom-orb bom-orb-1" />
        <div className="bom-orb bom-orb-2" />
        <div className="bom-orb bom-orb-3" />
      </div>

      <div className="bom-header">
        <div className="bom-header-left">
          <div className="bom-header-icon">
            <Calculator size={22} />
            <span className="bom-header-badge"><Sparkles size={10} /> ESTIMATOR</span>
          </div>
          <div>
            <h2>Project Cost Estimator</h2>
            <p className="bom-header-subtitle">
              Historical data from last {recentHistory.monthsAnalyzed} months · {materials.length} materials · {boms.length} saved BOMs
            </p>
          </div>
        </div>
        <div className="bom-header-right">
          <button className="bom-btn bom-btn-ghost" onClick={() => fetchMaterials({ showLoader: true })} disabled={materialsLoading}>
            {materialsLoading ? <Loader2 size={14} className="bom-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>
      </div>

      <div className="bom-tabs">
        {[
          { id: 'estimate', label: 'Estimate', icon: Calculator },
          { id: 'history', label: 'History', icon: BarChart3 },
          { id: 'saved', label: 'Saved BOMs', icon: ClipboardList, badge: boms.length },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`bom-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="bom-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {activeTab === 'estimate' && renderEstimateTab()}
      {activeTab === 'history' && renderHistoryTab()}
      {activeTab === 'saved' && renderSavedBOMsTab()}
    </div>
  );
};

export default BOMComponent;