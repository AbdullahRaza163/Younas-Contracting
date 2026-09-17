// src/components/ClientInvoicesManager.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Edit, Trash2, FileText, Eye, Printer, X, Save, Plus,
  Search, RefreshCw, Calendar,
  Receipt, AlertCircle, CheckCircle, TrendingUp, TrendingDown,
  LayoutDashboard, Info, Clock, Send, Layers,
  Banknote, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Crown as CrownIcon, Minus as MinusIcon,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sparkles,
  Building2, User, Phone, MapPin, Package, Tag
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Area
} from 'recharts';
import Utils from '../utils/Utils';
import './ClientInvoicesManager.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';
import useClientInvoices from '../hooks/useClientInvoices';
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
    <div className="cinv-chart-tooltip">
      {label && <div className="cinv-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="cinv-chart-tooltip-row">
          <span className="cinv-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="cinv-chart-tooltip-name">{p.name}</span>
          <span className="cinv-chart-tooltip-val">
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
const ClientInvoicesManager = ({ showLoader, hideLoader }) => {
  const {
    invoices,
    loading,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    refresh,
    getNextNumber,
  } = useClientInvoices({
    // Pass loader callbacks so the hook can trigger the global loader
    onLoaderStart: showLoader,
    onLoaderEnd: hideLoader,
  });

  // ... (rest of component unchanged)

  // ---------- Units hook (isolated) ----------
  const { units: allUnits } = useUnits();

  // ---------- Clients list ----------
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  // ---------- ⭐ Items list (from Items table) ----------
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Load clients once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setClientsLoading(true);
      try {
        const list = await ApiService.getClients();
        if (!cancelled) setClients(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('[ClientInvoices] failed to load clients:', err);
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setClientsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ⭐ Load items once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItemsLoading(true);
      try {
        const list = await ApiService.getItems();
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('[ClientInvoices] failed to load items:', err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setItemsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ============================================
  // STATE
  // ============================================
  const [editingId, setEditingId] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState('overview');

  // Filters
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [invoiceDateFrom, setInvoiceDateFrom] = useState('');
  const [invoiceDateTo, setInvoiceDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientId: '',
    siteName: '',
    clientName: '', clientAddress: '', clientCrn: '',
    invoiceDate: Utils.today(),
    dueDate: Utils.addDays(Utils.today(), 30),
    vatRate: 0, invoiceType: 'simple', status: 'draft',
    items: [], notes: '', subject: '', cpr: '', contactPerson: ''
  });

  // ⭐ Item form now has `itemId` to track selected item from the Items dropdown
  const [itemForm, setItemForm] = useState({
    itemId: '',
    description: '',
    quantity: '1',
    unit: 'SQ.M',
    unitPrice: '',
    total: ''
  });

  // ⭐ Item search state for the item picker
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);

  // ============================================
  // ⭐ Active units from Units table
  // ============================================
  const activeUnits = useMemo(
    () => allUnits
      .filter(u => u.isActive)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [allUnits]
  );

  const commonUnits = useMemo(() => {
    if (activeUnits.length > 0) return activeUnits;
    return [
      { id: 'unit-sqm', name: 'SQ.M', symbol: 'm²' },
      { id: 'unit-sqft', name: 'SQ.FT', symbol: 'ft²' },
      { id: 'unit-m2', name: 'M2', symbol: 'm²' },
      { id: 'unit-ft2', name: 'FT2', symbol: 'ft²' },
      { id: 'unit-m3', name: 'M3', symbol: 'm³' },
      { id: 'unit-pcs', name: 'PCS', symbol: 'pc' },
      { id: 'unit-kg', name: 'KG', symbol: 'kg' },
      { id: 'unit-ton', name: 'TON', symbol: 't' },
      { id: 'unit-liters', name: 'LITERS', symbol: 'L' },
      { id: 'unit-hours', name: 'HOURS', symbol: 'h' },
      { id: 'unit-days', name: 'DAYS', symbol: 'd' },
      { id: 'unit-box', name: 'BOX', symbol: 'box' },
      { id: 'unit-roll', name: 'ROLL', symbol: 'roll' },
    ];
  }, [activeUnits]);

  // ⭐ Filtered items list for the picker dropdown
  const filteredItems = useMemo(() => {
    if (!itemSearchTerm.trim()) return items.slice(0, 50);
    const q = itemSearchTerm.trim().toLowerCase();
    return items
      .filter(it =>
        (it.name || '').toLowerCase().includes(q) ||
        (it.sku || '').toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [items, itemSearchTerm]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Fetch next invoice number when opening form (new invoice only)
  useEffect(() => {
    if (showForm && !editingId && !formData.invoiceNumber) {
      getNextNumber().then(num => {
        if (num) setFormData(prev => ({ ...prev, invoiceNumber: num }));
      });
    }
  }, [showForm, editingId, formData.invoiceNumber, getNextNumber]);

  // ============================================
  // CLIENT PICKER HANDLER
  // ============================================
  const handleClientSelect = (clientId) => {
    if (!clientId) {
      setFormData(prev => ({
        ...prev,
        clientId: '',
        clientName: '',
        clientAddress: '',
        clientCrn: '',
        contactPerson: '',
        cpr: '',
      }));
      return;
    }

    const c = clients.find(x => x.id === clientId);
    if (!c) return;

    setFormData(prev => ({
      ...prev,
      clientId,
      clientName: c.name || '',
      clientAddress: c.address || prev.clientAddress || '',
      clientCrn:
        c.crn ||
        c.crNumber ||
        c.commercialRegistration ||
        c.clientCrn ||
        prev.clientCrn ||
        '',
      contactPerson:
        c.contactPerson ||
        c.contact ||
        c.contactName ||
        prev.contactPerson ||
        '',
      cpr:
        c.cpr ||
        c.cprNumber ||
        prev.cpr ||
        '',
      siteName:
        c.siteName ||
        c.site ||
        prev.siteName ||
        '',
    }));
  };

  // ============================================
  // ⭐ ITEM PICKER HANDLER
  // ============================================
  const handleItemSelect = (itemId) => {
    if (!itemId) {
      setItemForm(prev => ({ ...prev, itemId: '' }));
      return;
    }

    const it = items.find(x => x.id === itemId);
    if (!it) return;

    // Determine the unit: prefer the item's unit if it exists in our units list
    let unitName = it.unit || '';
    if (unitName) {
      const match = commonUnits.find(u => u.name === unitName);
      if (!match) unitName = commonUnits[0]?.name || 'SQ.M';
    } else {
      unitName = commonUnits[0]?.name || 'SQ.M';
    }

    // Determine price: try several field names
    const price =
      it.unitPrice ??
      it.price ??
      it.rate ??
      it.sellingPrice ??
      it.salePrice ??
      '';

    setItemForm(prev => ({
      ...prev,
      itemId: it.id,
      description: it.name || '',
      unit: unitName,
      unitPrice: price !== '' && price !== null && price !== undefined ? String(price) : '',
      quantity: prev.quantity || '1',
    }));
  };

  // ============================================
  // STATS
  // ============================================
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
  const draftInvoices = invoices.filter(i => i.status === 'draft').length;
  const sentInvoices = invoices.filter(i => i.status === 'sent').length;
  const totalAmount = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.totalAmount || 0), 0);
  const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.totalAmount || 0), 0);
  const avgInvoice = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

  const kpiItems = [
    { id: 'total', icon: FileText, label: 'Total Invoices', value: totalInvoices,
      meta: `${draftInvoices} drafts`, color: '#3b82f6',
      accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'paid', icon: CheckCircle, label: 'Paid', value: paidInvoices,
      meta: Utils.formatCurrencyShort(paidAmount), color: '#10b981',
      accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'sent', icon: Send, label: 'Sent', value: sentInvoices,
      meta: `${totalInvoices > 0 ? ((sentInvoices / totalInvoices) * 100).toFixed(0) : 0}% of total`,
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'up' },
    { id: 'overdue', icon: AlertCircle, label: 'Overdue', value: overdueInvoices,
      meta: Utils.formatCurrencyShort(overdueAmount), color: '#ef4444',
      accent: 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: overdueInvoices > 0 ? 'down' : 'flat' },
    { id: 'amount', icon: Banknote, label: 'Total Amount',
      value: Utils.formatCurrencyShort(totalAmount),
      meta: `Avg ${Utils.formatCurrencyShort(avgInvoice)}`, color: '#10b981',
      accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' }
  ];

  const cardDetails = {
    total: { title: 'Total Invoices', details: [
      { label: 'Total', value: totalInvoices },
      { label: 'Paid', value: paidInvoices },
      { label: 'Overdue', value: overdueInvoices },
      { label: 'Draft', value: draftInvoices }
    ]},
    paid: { title: 'Paid Invoices', details: [
      { label: 'Paid', value: paidInvoices },
      { label: 'Amount', value: Utils.formatCurrency(paidAmount) },
      { label: 'Total', value: totalInvoices },
      { label: 'Rate', value: `${totalInvoices > 0 ? ((paidInvoices / totalInvoices) * 100).toFixed(1) : 0}%` }
    ]},
    sent: { title: 'Sent Invoices', details: [
      { label: 'Sent', value: sentInvoices },
      { label: 'Draft', value: draftInvoices },
      { label: 'Total', value: totalInvoices },
      { label: 'Rate', value: `${totalInvoices > 0 ? ((sentInvoices / totalInvoices) * 100).toFixed(1) : 0}%` }
    ]},
    overdue: { title: 'Overdue Invoices', details: [
      { label: 'Overdue', value: overdueInvoices },
      { label: 'Amount', value: Utils.formatCurrency(overdueAmount) },
      { label: 'Total', value: totalInvoices },
      { label: 'Rate', value: `${totalInvoices > 0 ? ((overdueInvoices / totalInvoices) * 100).toFixed(1) : 0}%` }
    ]},
    amount: { title: 'Total Amount', details: [
      { label: 'Total', value: Utils.formatCurrency(totalAmount) },
      { label: 'Average', value: Utils.formatCurrency(avgInvoice) },
      { label: 'Max', value: totalInvoices > 0 ? Utils.formatCurrency(Math.max(...invoices.map(i => i.totalAmount || 0))) : '0' },
      { label: 'Paid', value: Utils.formatCurrency(paidAmount) }
    ]}
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // FILTERS + PAGINATION
  // ============================================
  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (invoiceSearchTerm) {
      const search = invoiceSearchTerm.toLowerCase();
      list = list.filter(inv =>
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(search)) ||
        (inv.clientName && inv.clientName.toLowerCase().includes(search))
      );
    }
    if (invoiceStatusFilter !== 'all') list = list.filter(inv => inv.status === invoiceStatusFilter);
    if (invoiceDateFrom) list = list.filter(inv => inv.invoiceDate >= invoiceDateFrom);
    if (invoiceDateTo) list = list.filter(inv => inv.invoiceDate <= invoiceDateTo);
    return list.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
  }, [invoices, invoiceSearchTerm, invoiceStatusFilter, invoiceDateFrom, invoiceDateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [invoiceSearchTerm, invoiceStatusFilter, invoiceDateFrom, invoiceDateTo, itemsPerPage, viewMode]);

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const getPageNumbers = () => {
    const pages = []; const max = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ============================================
  // CHART DATA
  // ============================================
  const statusChartData = useMemo(() => ([
    { name: 'Paid', value: paidInvoices, color: '#10b981' },
    { name: 'Sent', value: sentInvoices, color: '#8b5cf6' },
    { name: 'Draft', value: draftInvoices, color: '#f59e0b' },
    { name: 'Overdue', value: overdueInvoices, color: '#ef4444' }
  ].filter(d => d.value > 0)), [paidInvoices, sentInvoices, draftInvoices, overdueInvoices]);

  const monthlyTrendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const monthInvoices = invoices.filter(inv => inv.invoiceDate && inv.invoiceDate.startsWith(key));
      const total = monthInvoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
      const paid = monthInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((s, inv) => s + (inv.totalAmount || 0), 0);
      months.push({ label, total, paid, count: monthInvoices.length });
    }
    return months;
  }, [invoices]);

  const topClientsData = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      const key = inv.clientName || 'Unknown';
      if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
      map[key].total += (inv.totalAmount || 0);
      map[key].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(c => ({
        name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name,
        fullName: c.name,
        value: c.total,
        count: c.count
      }));
  }, [invoices]);

  const statusAmountData = useMemo(() => {
    const map = { paid: 0, sent: 0, draft: 0, overdue: 0 };
    invoices.forEach(inv => {
      if (map[inv.status] !== undefined) map[inv.status] += (inv.totalAmount || 0);
    });
    return [
      { name: 'Paid', value: map.paid, color: '#10b981' },
      { name: 'Sent', value: map.sent, color: '#8b5cf6' },
      { name: 'Draft', value: map.draft, color: '#f59e0b' },
      { name: 'Overdue', value: map.overdue, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [invoices]);

  // ============================================
  // ITEM HELPERS
  // ============================================
  const handleItemAdd = () => {
    if (!itemForm.description || !itemForm.unitPrice) return;
    const quantity = parseFloat(itemForm.quantity) || 1;
    const unitPrice = parseFloat(itemForm.unitPrice) || 0;
    const newItem = {
      id: Date.now().toString(),
      itemId: itemForm.itemId || null,           // ⭐ track source item
      description: itemForm.description,
      quantity,
      unit: itemForm.unit || 'SQ.M',
      unitPrice,
      total: quantity * unitPrice
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setItemForm({
      itemId: '',
      description: '',
      quantity: '1',
      unit: commonUnits[0]?.name || 'SQ.M',
      unitPrice: '',
      total: ''
    });
    setItemSearchTerm('');
    setShowItemPicker(false);
  };

  const handleItemRemove = (id) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const calculateTotals = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const vatAmount = formData.invoiceType === 'vat' ? subtotal * (parseFloat(formData.vatRate) / 100) : 0;
    return { subtotal, vatAmount, total: subtotal + vatAmount };
  }, [formData.items, formData.vatRate, formData.invoiceType]);

  // ============================================
  // CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientName) { alert('Client name is required'); return; }
    const invoice = {
      ...formData,
      subtotal: calculateTotals.subtotal,
      vatAmount: calculateTotals.vatAmount,
      totalAmount: calculateTotals.total,
      amountInWords: Utils.convertAmountToWords(calculateTotals.total)
    };
    try {
      if (editingId) {
        await updateInvoice(editingId, invoice);
      } else {
        await addInvoice(invoice);
      }
      resetForm();
      setShowForm(false);
    } catch (err) {
      alert('Failed to save invoice: ' + (err.message || 'Unknown error'));
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      clientId: '',
      siteName: '',
      clientName: '', clientAddress: '', clientCrn: '',
      invoiceDate: Utils.today(),
      dueDate: Utils.addDays(Utils.today(), 30),
      vatRate: 0, invoiceType: 'simple', status: 'draft',
      items: [], notes: '', subject: '', cpr: '', contactPerson: ''
    });
    setEditingId(null);
    setItemForm({
      itemId: '',
      description: '',
      quantity: '1',
      unit: commonUnits[0]?.name || 'SQ.M',
      unitPrice: '',
      total: ''
    });
    setItemSearchTerm('');
    setShowItemPicker(false);
  };

  const openAddModal = () => { resetForm(); setShowForm(true); };

  const openEditModal = (invoice) => {
    const matched = clients.find(c => c.name === invoice.clientName);
    setEditingId(invoice.id);
    setFormData({
      invoiceNumber: invoice.invoiceNumber || '',
      clientId: invoice.clientId || matched?.id || '',
      siteName: invoice.siteName || '',
      clientName: invoice.clientName || '',
      clientAddress: invoice.clientAddress || '',
      clientCrn: invoice.clientCrn || '',
      invoiceDate: invoice.invoiceDate || Utils.today(),
      dueDate: invoice.dueDate || Utils.addDays(Utils.today(), 30),
      vatRate: invoice.vatRate || 0,
      invoiceType: invoice.invoiceType || 'simple',
      status: invoice.status || 'draft',
      items: invoice.items || [],
      notes: invoice.notes || '',
      subject: invoice.subject || '',
      cpr: invoice.cpr || '',
      contactPerson: invoice.contactPerson || ''
    });
    setShowForm(true);
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { label: 'Draft', icon: Clock },
      sent: { label: 'Sent', icon: Send },
      paid: { label: 'Paid', icon: CheckCircle },
      overdue: { label: 'Overdue', icon: AlertCircle }
    };
    const c = config[status] || config.draft;
    const Icon = c.icon;
    return (
      <span className={`cinv-status ${status}`}>
        <Icon size={11} /> {c.label}
      </span>
    );
  };

  // ============================================
  // PRINT TEMPLATE
  // ============================================
  const generateInvoiceHTML = (invoice) => {
    const items = invoice.items || [];
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const vatAmount = invoice.invoiceType === 'vat' ? subtotal * (parseFloat(invoice.vatRate) / 100) : 0;
    const total = subtotal + vatAmount;
    const primary = '#1a3c6e', secondary = '#c9a84c', light = '#e8edf3',
      muted = '#6a6a8a', border = '#d4d9e0', text = '#1a1a2e';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Client Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0 !important; padding: 0 !important; border: 0 !important; box-sizing: border-box !important; }
    html, body { width: 100% !important; height: 100% !important; background: #ffffff !important;
      font-family: 'Times New Roman', Arial, serif !important; color: ${text} !important; }
    .cinv-print-container { width: 100% !important; display: flex !important; flex-direction: column !important;
      min-height: 100vh !important; position: relative !important; background: #ffffff !important; }
    .cinv-print-background { position: fixed !important; inset: 0 !important; z-index: 0 !important;
      pointer-events: none !important; display: flex !important; justify-content: center !important;
      align-items: center !important; opacity: 0.08 !important; }
    .cinv-print-background img { width: 70% !important; max-width: 600px !important; height: auto !important; }
    .cinv-print-content-wrapper { position: relative !important; z-index: 1 !important; display: flex !important;
      flex-direction: column !important; min-height: 100vh !important; width: 100% !important; }
    .cinv-print-header-img img, .cinv-print-footer-img img { width: 100% !important; height: auto !important; display: block !important; }
    .cinv-print-content-section { flex: 1 !important; padding: 8px 30px 12px !important; }
    .cinv-print-top { display: flex !important; justify-content: space-between !important; align-items: flex-start !important;
      margin: 0 0 12px 0 !important; padding: 10px 14px !important; border-bottom: 2px solid ${primary} !important; }
    .cinv-print-bill-to h3 { font-size: 12px !important; font-weight: 700 !important; color: ${primary} !important;
      margin: 0 0 4px 0 !important; text-transform: uppercase !important; letter-spacing: 1px !important; }
    .cinv-print-client-name { font-weight: 700 !important; font-size: 15px !important; color: ${primary} !important; margin: 0 0 3px 0 !important; }
    .cinv-print-client-detail { font-size: 12px !important; color: ${muted} !important; margin: 1px 0 !important; line-height: 1.4 !important; }
    .cinv-print-right { text-align: right !important; }
    .cinv-print-title { font-size: 24px !important; font-weight: 800 !important; color: ${primary} !important; letter-spacing: 2px !important; }
    .cinv-print-number { font-size: 14px !important; color: ${muted} !important; font-weight: 600 !important; }
    .cinv-print-detail { font-size: 12px !important; color: ${muted} !important; margin: 1px 0 !important; }
    .cinv-print-detail strong { color: ${primary} !important; }
    .cinv-print-status { display: inline-block !important; padding: 3px 14px !important; border-radius: 20px !important;
      font-size: 10px !important; font-weight: 700 !important; text-transform: uppercase !important; margin-top: 3px !important; color: #ffffff !important; }
    .cinv-print-status-paid { background: #22c55e !important; }
    .cinv-print-status-draft { background: #f59e0b !important; }
    .cinv-print-status-sent { background: #3b82f6 !important; }
    .cinv-print-status-overdue { background: #ef4444 !important; }
    .cinv-print-subject { margin: 8px 0 10px 0 !important; padding: 6px 0 !important; font-size: 13px !important;
      font-weight: 600 !important; color: ${primary} !important; border-bottom: 1px solid ${border} !important; }
    .cinv-print-salutation { margin: 6px 0 10px 0 !important; font-size: 13px !important; color: ${text} !important; }
    .cinv-print-table { width: 100% !important; border-collapse: collapse !important; margin: 10px 0 !important; font-size: 12px !important; background: #ffffff !important; }
    .cinv-print-table thead { background: ${primary} !important; }
    .cinv-print-table th { color: #ffffff !important; padding: 8px 10px !important; text-align: center !important;
      font-size: 11px !important; text-transform: uppercase !important; font-weight: 700 !important; letter-spacing: 0.5px !important; }
    .cinv-print-table td { padding: 6px 10px !important; border-bottom: 1px solid ${border} !important; text-align: center !important; }
    .cinv-print-totals { margin: 10px 0 10px auto !important; padding: 10px 16px !important; background: ${light} !important;
      max-width: 320px !important; border: 2px solid ${secondary} !important; }
    .cinv-print-total-row { display: flex !important; justify-content: space-between !important; padding: 3px 0 !important; font-size: 13px !important; }
    .cinv-print-grand { border-top: 2px solid ${secondary} !important; margin-top: 4px !important; padding-top: 8px !important;
      font-size: 18px !important; font-weight: 800 !important; }
    .cinv-print-words { font-size: 11px !important; color: ${muted} !important; font-style: italic !important;
      border-top: 1px solid ${border} !important; margin-top: 6px !important; padding-top: 6px !important; text-align: center !important; }
    .cinv-print-notes { padding: 8px 14px !important; border: 1px solid ${border} !important; border-left: 4px solid ${secondary} !important;
      margin: 10px 0 !important; font-size: 12px !important; color: ${muted} !important; background: #fafafa !important; }
    .cinv-print-signature { margin-top: 20px !important; padding-top: 10px !important; border-top: 1px solid ${border} !important; text-align: right !important; }
    @media print { @page { margin: 0 !important; size: A4 !important; }
      html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  </style>
</head>
<body>
  <div class="cinv-print-container">
    <div class="cinv-print-background"><img src='${background}' alt="bg" /></div>
    <div class="cinv-print-content-wrapper">
      <div class="cinv-print-header-img"><img src="${letterheadHeader}" alt="Header" /></div>
      <div class="cinv-print-content-section">
        <div class="cinv-print-top">
          <div class="cinv-print-bill-to">
            <h3>To,</h3>
            <div class="cinv-print-client-name">${invoice.clientName || ''}</div>
            ${invoice.clientAddress ? `<div class="cinv-print-client-detail">${invoice.clientAddress}</div>` : ''}
            ${invoice.clientCrn ? `<div class="cinv-print-client-detail">CRN: ${invoice.clientCrn}</div>` : ''}
          </div>
          <div class="cinv-print-right">
            <div class="cinv-print-title">CLIENT INVOICE</div>
            <div class="cinv-print-number">#${invoice.invoiceNumber || 'DRAFT'}</div>
            <div class="cinv-print-detail"><strong>Date:</strong> ${Utils.formatDate(invoice.invoiceDate)}</div>
            <div class="cinv-print-detail"><strong>Due:</strong> ${Utils.formatDate(invoice.dueDate)}</div>
            <div class="cinv-print-status cinv-print-status-${invoice.status || 'draft'}">${(invoice.status || 'draft').toUpperCase()}</div>
          </div>
        </div>
        ${invoice.subject ? `<div class="cinv-print-subject">Subject: ${invoice.subject}</div>` : ''}
        <div class="cinv-print-salutation">Dear Sir,</div>
        <div class="cinv-print-salutation" style="margin-top:-6px !important;font-weight:400 !important;">
          We are pleased to submit our Invoice for the below mentioned work as follows.
        </div>
        <table class="cinv-print-table">
          <thead><tr><th>Sr. No.</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>
            ${items.length === 0
              ? `<tr><td colspan="6" style="text-align:center;padding:15px;color:${muted};">No items</td></tr>`
              : items.map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td style="text-align:left;">${item.description || ''}</td>
                <td>${item.quantity || 0}</td>
                <td>${item.unit || 'SQ.M'}</td>
                <td>${Utils.formatCurrencyShort(item.unitPrice || 0)}</td>
                <td>${Utils.formatCurrencyShort(item.total || 0)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="cinv-print-totals">
          <div class="cinv-print-total-row"><span>Subtotal:</span><span>${Utils.formatCurrencyShort(subtotal)}</span></div>
          ${invoice.invoiceType === 'vat' ? `<div class="cinv-print-total-row"><span>VAT (${invoice.vatRate || 10}%):</span><span>${Utils.formatCurrencyShort(vatAmount)}</span></div>` : ''}
          <div class="cinv-print-total-row cinv-print-grand"><span>TOTAL:</span><span>${Utils.formatCurrencyShort(total)}</span></div>
          <div class="cinv-print-words">${Utils.convertAmountToWords(total)}</div>
        </div>
        ${invoice.notes ? `<div class="cinv-print-notes"><strong>Note:</strong> ${invoice.notes}</div>` : ''}
        <div class="cinv-print-signature">
          <div style="font-weight:700;font-size:14px;color:${primary};">Yours faithfully,</div>
          <div style="margin-top:10px;">
            <div style="font-weight:700;font-size:14px;color:${primary};">${invoice.contactPerson || ''}</div>
            <div style="font-size:12px;color:${muted};">${invoice.cpr || ''}</div>
          </div>
        </div>
      </div>
      <div class="cinv-print-footer-img"><img src="${letterheadFooter}" alt="Footer" /></div>
    </div>
  </div>
  <script>window.onload = function(){ window.print(); };<\/script>
</body>
</html>`;
  };

  const handlePrintInvoice = (invoice) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { alert('Please allow popups to print'); return; }
    printWindow.document.write(generateInvoiceHTML(invoice));
    printWindow.document.close();
    printWindow.focus();
  };

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="cinv-view">
      <div className="cinv-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="cinv-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="cinv-kpi-accent" style={{ background: item.accent }} />
              <div className="cinv-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="cinv-kpi-content">
                <span className="cinv-kpi-label">{item.label}</span>
                <span className="cinv-kpi-value">{item.value}</span>
                <span className="cinv-kpi-meta">{item.meta}</span>
              </div>
              <div className={`cinv-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <TrendingDown size={15} />}
                {item.trend === 'flat' && <MinusIcon size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="cinv-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="cinv-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="cinv-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="cinv-tooltip-row">
                <span className="cinv-tooltip-label">{d.label}</span>
                <span className="cinv-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cinv-grid-1-1">
        <div className="cinv-card-panel">
          <div className="cinv-card-panel-header">
            <div className="cinv-card-panel-title">
              <span className="cinv-card-panel-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Client Invoices by Status</h4>
                <span>{totalInvoices} total</span>
              </div>
            </div>
          </div>
          {statusChartData.length > 0 ? (
            <div className="cinv-donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="cinv-donut-legend">
                {statusChartData.map((d, i) => (
                  <div key={i} className="cinv-donut-item">
                    <span className="cinv-donut-dot" style={{ background: d.color }} />
                    <span className="cinv-donut-name">{d.name}</span>
                    <span className="cinv-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="cinv-empty-mini">No invoices</div>}
        </div>

        <div className="cinv-card-panel">
          <div className="cinv-card-panel-header">
            <div className="cinv-card-panel-title">
              <span className="cinv-card-panel-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Banknote size={16} />
              </span>
              <div>
                <h4>Amount by Status</h4>
                <span>{Utils.formatCurrencyShort(totalAmount)}</span>
              </div>
            </div>
          </div>
          {statusAmountData.length > 0 ? (
            <div className="cinv-donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={statusAmountData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {statusAmountData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="cinv-donut-legend">
                {statusAmountData.map((d, i) => (
                  <div key={i} className="cinv-donut-item">
                    <span className="cinv-donut-dot" style={{ background: d.color }} />
                    <span className="cinv-donut-name">{d.name}</span>
                    <span className="cinv-donut-val">{Utils.formatCurrencyShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="cinv-empty-mini">No amounts</div>}
        </div>
      </div>

      <div className="cinv-card-panel">
        <div className="cinv-card-panel-header">
          <div className="cinv-card-panel-title">
            <span className="cinv-card-panel-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
              <LineChartIcon size={16} />
            </span>
            <div>
              <h4>12-Month Client Invoice Trend</h4>
              <span>Total vs Paid by month</span>
            </div>
          </div>
          <div className="cinv-legend">
            <span><i style={{ background: '#10b981' }} />Paid</span>
            <span><i style={{ background: '#3b82f6' }} />Total</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyTrendData}>
            <defs>
              <linearGradient id="cinvTotalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cinvPaidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
            <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
            <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5}
              fill="url(#cinvTotalGrad)" name="Total" />
            <Area type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={2.5}
              fill="url(#cinvPaidGrad)" name="Paid" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {topClientsData.length > 0 && (
        <div className="cinv-card-panel">
          <div className="cinv-card-panel-header">
            <div className="cinv-card-panel-title">
              <span className="cinv-card-panel-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <CrownIcon size={16} />
              </span>
              <div>
                <h4>Top Clients by Invoice Amount</h4>
                <span>Highest value clients</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topClientsData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <defs>
                <linearGradient id="cinvTopClients" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
                tickLine={false} axisLine={false} width={120} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Amount" fill="url(#cinvTopClients)" radius={[0, 8, 8, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  // ============================================
  // INVOICES TAB
  // ============================================
  const renderInvoicesTab = () => (
    <div className="cinv-view">
      <div className="cinv-filters">
        <div className="cinv-search-box">
          <Search size={15} className="cinv-search-icon" />
          <input type="text" value={invoiceSearchTerm}
            onChange={e => setInvoiceSearchTerm(e.target.value)}
            placeholder="Search by invoice # or client..."
            className="cinv-search-input" />
          {invoiceSearchTerm && (
            <button className="cinv-clear-search" onClick={() => setInvoiceSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="cinv-filter-group">
          <select value={invoiceStatusFilter}
            onChange={e => setInvoiceStatusFilter(e.target.value)}
            className="cinv-filter-select">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <input type="date" value={invoiceDateFrom}
            onChange={e => setInvoiceDateFrom(e.target.value)}
            className="cinv-filter-date" />
          <input type="date" value={invoiceDateTo}
            onChange={e => setInvoiceDateTo(e.target.value)}
            className="cinv-filter-date" />
        </div>
        {(invoiceSearchTerm || invoiceStatusFilter !== 'all' || invoiceDateFrom || invoiceDateTo) && (
          <button className="cinv-btn-clear" onClick={() => {
            setInvoiceSearchTerm(''); setInvoiceStatusFilter('all');
            setInvoiceDateFrom(''); setInvoiceDateTo('');
          }}>
            <X size={13} /> Clear
          </button>
        )}
        <span className="cinv-result-count">
          Showing {filteredInvoices.length} of {totalInvoices}
        </span>
        <button className="cinv-btn-primary" onClick={openAddModal}>
          <Plus size={14} /> New Client Invoice
        </button>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="cinv-empty">
          <div className="cinv-empty-icon"><FileText size={40} /></div>
          <h3>No Client Invoices Found</h3>
          <p>Try adjusting your filters or create a new client invoice.</p>
          <button className="cinv-btn-primary" onClick={openAddModal}>
            <Plus size={14} /> Create Client Invoice
          </button>
        </div>
      ) : (
        <>
          <div className="cinv-cards-grid">
            {paginatedInvoices.map((invoice, index) => (
              <div key={invoice.id} className="cinv-card"
                style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
                <div className="cinv-card-accent" style={{
                  background: invoice.status === 'paid' ? 'linear-gradient(90deg,#10b981,#34d399)'
                    : invoice.status === 'overdue' ? 'linear-gradient(90deg,#ef4444,#f87171)'
                    : invoice.status === 'sent' ? 'linear-gradient(90deg,#8b5cf6,#a78bfa)'
                    : 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                }} />
                <div className="cinv-card-header">
                  <div className="cinv-card-number">
                    <FileText size={12} />
                    {invoice.invoiceNumber || 'Draft'}
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>
                <div className="cinv-card-body">
                  <div className="cinv-card-client">{invoice.clientName}</div>
                  <div className="cinv-card-amount">
                    {Utils.formatCurrency(invoice.totalAmount || invoice.subtotal || 0)}
                  </div>
                  <div className="cinv-card-meta">
                    <span className="cinv-card-meta-item">
                      <Calendar size={11} /> {Utils.formatDate(invoice.invoiceDate)}
                    </span>
                    <span className="cinv-card-meta-item">
                      <Receipt size={11} /> {invoice.items?.length || 0} items
                    </span>
                  </div>
                </div>
                <div className="cinv-card-footer">
                  <div className="cinv-card-actions">
                    <button className="cinv-icon-btn cinv-icon-view" title="View"
                      onClick={() => setViewingInvoice(invoice)}>
                      <Eye size={14} />
                    </button>
                    <button className="cinv-icon-btn cinv-icon-print" title="Print"
                      onClick={() => handlePrintInvoice(invoice)}>
                      <Printer size={14} />
                    </button>
                    <button className="cinv-icon-btn cinv-icon-edit" title="Edit"
                      onClick={() => openEditModal(invoice)}>
                      <Edit size={14} />
                    </button>
                    <button className="cinv-icon-btn cinv-icon-danger" title="Delete"
                      onClick={() => setShowDeleteConfirm(invoice.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="cinv-pagination">
            <div className="cinv-pagination-info">
              Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong>–
              <strong>{Math.min(currentPage * itemsPerPage, filteredInvoices.length)}</strong> of{' '}
              <strong>{filteredInvoices.length}</strong>
            </div>
            <div className="cinv-pagination-controls">
              <div className="cinv-pagination-items">
                <span>Show:</span>
                <select value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="cinv-pagination-select">
                  {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="cinv-pagination-buttons">
                <button className="cinv-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft size={13} />
                </button>
                <button className="cinv-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft size={13} />
                </button>
                {getPageNumbers().map(p => (
                  <button key={p} className={`cinv-page-btn ${p === currentPage ? 'active' : ''}`}
                    onClick={() => goToPage(p)}>{p}</button>
                ))}
                <button className="cinv-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  <ChevronRight size={13} />
                </button>
                <button className="cinv-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
                  <ChevronsRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ============================================
  // VIEW MODAL
  // ============================================
  const ViewInvoiceModal = ({ invoice, onClose }) => {
    if (!invoice) return null;
    const items = invoice.items || [];
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const vatAmount = invoice.invoiceType === 'vat' ? subtotal * (parseFloat(invoice.vatRate) / 100) : 0;
    const total = subtotal + vatAmount;
    return (
      <ModalPortal>
        <div className="cinv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="cinv-modal" onClick={e => e.stopPropagation()}>
            <div className="cinv-modal-header" style={{ background: 'linear-gradient(135deg, #0b1a12, #1f3a2c)' }}>
              <div className="cinv-modal-header-left">
                <div className="cinv-modal-icon"><FileText size={18} /></div>
                <div>
                  <h3>Client Invoice Preview</h3>
                  <p className="cinv-modal-sub">#{invoice.invoiceNumber} · {invoice.clientName}</p>
                </div>
              </div>
              <div className="cinv-modal-actions">
                <button className="cinv-btn-ghost-light" onClick={() => handlePrintInvoice(invoice)}>
                  <Printer size={14} /> Print
                </button>
                <button className="cinv-modal-close" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="cinv-modal-body cinv-preview-body">
              <img src={letterheadHeader} alt="Header" className="cinv-preview-letterhead" />
              <div className="cinv-preview-content">
                <div className="cinv-preview-top">
                  <div>
                    <div className="cinv-preview-label">To,</div>
                    <div className="cinv-preview-client">{invoice.clientName}</div>
                    {invoice.clientAddress && <div className="cinv-preview-detail">{invoice.clientAddress}</div>}
                    {invoice.clientCrn && <div className="cinv-preview-detail">CRN: {invoice.clientCrn}</div>}
                  </div>
                  <div className="cinv-preview-right">
                    <div className="cinv-preview-title">CLIENT INVOICE</div>
                    <div className="cinv-preview-number">#{invoice.invoiceNumber}</div>
                    <div className="cinv-preview-detail"><strong>Date:</strong> {Utils.formatDate(invoice.invoiceDate)}</div>
                    <div className="cinv-preview-detail"><strong>Due:</strong> {Utils.formatDate(invoice.dueDate)}</div>
                    <div className="cinv-preview-status">{getStatusBadge(invoice.status)}</div>
                  </div>
                </div>
                {invoice.subject && <div className="cinv-preview-subject">Subject: {invoice.subject}</div>}
                <table className="cinv-preview-table">
                  <thead>
                    <tr>
                      <th>Sr.</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: 15 }}>No items</td></tr>
                    ) : items.map((it, i) => (
                      <tr key={it.id || i}>
                        <td>{i + 1}</td>
                        <td>{it.description}</td>
                        <td className="right">{it.quantity}</td>
                        <td>{it.unit}</td>
                        <td className="right">{Utils.formatCurrencyShort(it.unitPrice)}</td>
                        <td className="right"><strong>{Utils.formatCurrencyShort(it.total)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="cinv-preview-totals">
                  <div className="cinv-preview-total-row"><span>Subtotal:</span><span>{Utils.formatCurrencyShort(subtotal)}</span></div>
                  {invoice.invoiceType === 'vat' && (
                    <div className="cinv-preview-total-row"><span>VAT ({invoice.vatRate}%):</span><span>{Utils.formatCurrencyShort(vatAmount)}</span></div>
                  )}
                  <div className="cinv-preview-grand"><span>TOTAL:</span><span>{Utils.formatCurrencyShort(total)}</span></div>
                  <div className="cinv-preview-words">{Utils.convertAmountToWords(total)}</div>
                </div>
                {invoice.notes && <div className="cinv-preview-notes"><strong>Note:</strong> {invoice.notes}</div>}
              </div>
              <img src={letterheadFooter} alt="Footer" className="cinv-preview-letterhead" />
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  // ============================================
  // FORM MODAL
  // ============================================
  const renderFormModal = () => {
    const selectedClient = formData.clientId
      ? clients.find(c => c.id === formData.clientId)
      : null;

    const selectedItem = itemForm.itemId
      ? items.find(it => it.id === itemForm.itemId)
      : null;

    return (
      <ModalPortal>
        <div className="cinv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
          <div className="cinv-modal cinv-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="cinv-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <div className="cinv-modal-header-left">
                <div className="cinv-modal-icon">
                  {editingId ? <Edit size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3>{editingId ? 'Edit Client Invoice' : 'New Client Invoice'}</h3>
                  <p className="cinv-modal-sub">{editingId ? 'Update invoice details' : 'Create a new client invoice'}</p>
                </div>
              </div>
              <button className="cinv-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
                <X size={18} />
              </button>
            </div>
            <div className="cinv-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="cinv-form-row">
                  <div className="cinv-form-group">
                    <label>Invoice No</label>
                    <input type="text" value={formData.invoiceNumber} disabled
                      className="cinv-form-input cinv-disabled" />
                    <small className="cinv-hint">Auto-generated</small>
                  </div>

                  {/* ⭐ CLIENT DROPDOWN */}
                  <div className="cinv-form-group">
                    <label><Building2 size={12} /> Client <span className="cinv-required">*</span></label>
                    <select
                      value={formData.clientId || ''}
                      required
                      onChange={e => handleClientSelect(e.target.value)}
                      className="cinv-form-select"
                      disabled={clientsLoading}
                    >
                      <option value="">
                        {clientsLoading
                          ? 'Loading clients…'
                          : clients.length === 0
                            ? 'No clients — enter manually below'
                            : 'Select a client…'}
                      </option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.crn ? ` · CRN ${c.crn}` : ''}
                        </option>
                      ))}
                    </select>
                    {clients.length > 0 && (
                      <small className="cinv-hint">
                        <Info size={10} /> Selecting a client auto-fills address, CRN, contact &amp; CPR
                      </small>
                    )}
                    {clients.length === 0 && !clientsLoading && (
                      <small className="cinv-hint" style={{ color: '#b45309' }}>
                        <AlertCircle size={10} /> No clients found — type client details manually below
                      </small>
                    )}
                  </div>
                </div>

                {/* ⭐ Client preview */}
                {selectedClient && (
                  <div className="cinv-client-preview">
                    <div className="cinv-client-preview-avatar">
                      {(selectedClient.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="cinv-client-preview-info">
                      <div className="cinv-client-preview-name">{selectedClient.name}</div>
                      <div className="cinv-client-preview-meta">
                        {selectedClient.crn && (
                          <span><Building2 size={10} /> CRN: {selectedClient.crn}</span>
                        )}
                        {selectedClient.contactPerson && (
                          <span><User size={10} /> {selectedClient.contactPerson}</span>
                        )}
                        {selectedClient.phone && (
                          <span><Phone size={10} /> {selectedClient.phone}</span>
                        )}
                        {selectedClient.address && (
                          <span><MapPin size={10} /> {selectedClient.address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="cinv-form-row">
                  <div className="cinv-form-group">
                    <label>Client Name <span className="cinv-required">*</span></label>
                    <input
                      type="text"
                      value={formData.clientName}
                      required
                      readOnly={!!formData.clientId}
                      onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder={formData.clientId ? 'Auto-filled from selected client' : 'Type client name'}
                      className={`cinv-form-input ${formData.clientId ? 'cinv-disabled' : ''}`}
                    />
                  </div>
                  <div className="cinv-form-group">
                    <label>Client Address</label>
                    <input
                      type="text"
                      value={formData.clientAddress}
                      readOnly={!!formData.clientId}
                      onChange={e => setFormData({ ...formData, clientAddress: e.target.value })}
                      placeholder="Client address"
                      className={`cinv-form-input ${formData.clientId ? 'cinv-disabled' : ''}`}
                    />
                  </div>
                </div>

                <div className="cinv-form-row">
                  <div className="cinv-form-group">
                    <label>Client CRN</label>
                    <input
                      type="text"
                      value={formData.clientCrn}
                      readOnly={!!formData.clientId}
                      onChange={e => setFormData({ ...formData, clientCrn: e.target.value })}
                      placeholder="Commercial Registration #"
                      className={`cinv-form-input ${formData.clientId ? 'cinv-disabled' : ''}`}
                    />
                  </div>
                  <div className="cinv-form-group">
                    <label>Contact Person</label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      readOnly={!!formData.clientId}
                      onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="Contact person name"
                      className={`cinv-form-input ${formData.clientId ? 'cinv-disabled' : ''}`}
                    />
                  </div>
                </div>

                <div className="cinv-form-row">
                  <div className="cinv-form-group">
                    <label>CPR No.</label>
                    <input
                      type="text"
                      value={formData.cpr}
                      readOnly={!!formData.clientId}
                      onChange={e => setFormData({ ...formData, cpr: e.target.value })}
                      placeholder="CPR Number"
                      className={`cinv-form-input ${formData.clientId ? 'cinv-disabled' : ''}`}
                    />
                  </div>
                  <div className="cinv-form-group">
                    <label>Site Name (free text)</label>
                    <input type="text" value={formData.siteName}
                      onChange={e => setFormData({ ...formData, siteName: e.target.value })}
                      placeholder="Site name"
                      className="cinv-form-input" />
                  </div>
                </div>

                <div className="cinv-form-row">
                  <div className="cinv-form-group">
                    <label>Status</label>
                    <select value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="cinv-form-select">
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  <div className="cinv-form-group">
                    <label>Invoice Type</label>
                    <select value={formData.invoiceType}
                      onChange={e => setFormData({
                        ...formData,
                        invoiceType: e.target.value,
                        vatRate: e.target.value === 'simple' ? 0 : (formData.vatRate || 10)
                      })}
                      className="cinv-form-select">
                      <option value="simple">Simple (No VAT)</option>
                      <option value="vat">With VAT</option>
                    </select>
                  </div>
                </div>

                <div className="cinv-form-row">
                  <div className="cinv-form-group">
                    <label>Invoice Date</label>
                    <input type="date" value={formData.invoiceDate}
                      onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })}
                      className="cinv-form-input" />
                  </div>
                  <div className="cinv-form-group">
                    <label>Due Date</label>
                    <input type="date" value={formData.dueDate}
                      onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                      className="cinv-form-input" />
                  </div>
                </div>

                <div className="cinv-form-row">
                  <div className="cinv-form-group">
                    <label>Subject</label>
                    <input type="text" value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Subject of invoice"
                      className="cinv-form-input" />
                  </div>
                  <div className="cinv-form-group">
                    <label>VAT Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.vatRate}
                      disabled={formData.invoiceType !== 'vat'}
                      onChange={e => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 0 })}
                      className={`cinv-form-input ${formData.invoiceType !== 'vat' ? 'cinv-disabled' : ''}`}
                    />
                  </div>
                </div>

                <div className="cinv-items-section">
                  <div className="cinv-section-title">
                    <Receipt size={14} /> Invoice Items
                  </div>

                  {/* ⭐ ITEM PICKER + item form */}
                  <div className="cinv-item-form-grid">
                    {/* Item picker (combobox-style) */}
                    <div className="cinv-form-group" style={{ position: 'relative' }}>
                      <label><Package size={11} /> Item (from Items table)</label>
                      <div className="cinv-item-combobox">
                        <input
                          type="text"
                          value={
                            selectedItem
                              ? selectedItem.name
                              : itemForm.description
                          }
                          onChange={e => {
                            setItemSearchTerm(e.target.value);
                            setShowItemPicker(true);
                            // If user is typing, clear itemId and use as free text
                            setItemForm(prev => ({
                              ...prev,
                              itemId: '',
                              description: e.target.value,
                            }));
                          }}
                          onFocus={() => setShowItemPicker(true)}
                          onBlur={() => setTimeout(() => setShowItemPicker(false), 150)}
                          placeholder={
                            itemsLoading
                              ? 'Loading items…'
                              : items.length === 0
                                ? 'No items — type description'
                                : 'Search item name or SKU…'
                          }
                          className="cinv-form-input"
                          disabled={itemsLoading}
                        />
                        {selectedItem && (
                          <button
                            type="button"
                            className="cinv-clear-item"
                            onClick={() => {
                              setItemForm(prev => ({ ...prev, itemId: '', description: '' }));
                              setItemSearchTerm('');
                            }}
                            title="Clear item"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {showItemPicker && !itemsLoading && items.length > 0 && (
                        <div className="cinv-item-picker">
                          <div className="cinv-item-picker-header">
                            <Package size={12} /> {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
                            {itemSearchTerm && ` matching "${itemSearchTerm}"`}
                          </div>
                          {filteredItems.length === 0 ? (
                            <div className="cinv-item-picker-empty">
                              No items match — you can type a custom description instead
                            </div>
                          ) : (
                            <div className="cinv-item-picker-list">
                              {filteredItems.map(it => (
                                <button
                                  key={it.id}
                                  type="button"
                                  className="cinv-item-picker-row"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleItemSelect(it.id);
                                    setShowItemPicker(false);
                                    setItemSearchTerm('');
                                  }}
                                >
                                  <div className="cinv-item-picker-info">
                                    <div className="cinv-item-picker-name">{it.name}</div>
                                    <div className="cinv-item-picker-meta">
                                      {it.sku && <span className="cinv-item-picker-sku">SKU: {it.sku}</span>}
                                      {it.category && <span><Tag size={9} /> {it.category}</span>}
                                      {it.unit && <span>Unit: {it.unit}</span>}
                                    </div>
                                  </div>
                                  <div className="cinv-item-picker-price">
                                    {Utils.formatCurrency(it.unitPrice || it.price || 0)}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="cinv-form-group">
                      <label>Qty</label>
                      <input type="number" step="0.01" value={itemForm.quantity}
                        onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })}
                        placeholder="Qty"
                        className="cinv-form-input" />
                    </div>
                    <div className="cinv-form-group">
                      <label>Unit</label>
                      <select value={itemForm.unit}
                        onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                        className="cinv-form-select">
                        {commonUnits.map(u => (
                          <option key={u.id || u.name} value={u.name}>
                            {u.name}{u.symbol ? ` (${u.symbol})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="cinv-form-group">
                      <label>Unit Price</label>
                      <input type="number" step="0.001" value={itemForm.unitPrice}
                        onChange={e => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                        placeholder="Price"
                        className="cinv-form-input" />
                    </div>
                    <button type="button" className="cinv-btn-add-item" onClick={handleItemAdd}>
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  {/* ⭐ Selected item preview */}
                  {selectedItem && (
                    <div className="cinv-item-preview">
                      <Package size={12} />
                      <span className="cinv-item-preview-name">{selectedItem.name}</span>
                      {selectedItem.sku && (
                        <span className="cinv-item-preview-sku">SKU: {selectedItem.sku}</span>
                      )}
                      {selectedItem.category && (
                        <span className="cinv-item-preview-cat">{selectedItem.category}</span>
                      )}
                    </div>
                  )}

                  <div className="cinv-items-list">
                    {formData.items.map(item => (
                      <div key={item.id} className="cinv-item-row">
                        <span className="cinv-item-desc">
                          {item.itemId && <Package size={10} style={{ marginRight: 4, verticalAlign: 'middle', opacity: 0.5 }} />}
                          {item.description}
                        </span>
                        <span className="cinv-item-qty">{item.quantity} × {item.unit}</span>
                        <span className="cinv-item-price">{Utils.formatCurrencyShort(item.unitPrice)}</span>
                        <span className="cinv-item-total">{Utils.formatCurrency(item.total)}</span>
                        <button type="button" className="cinv-btn-remove"
                          onClick={() => handleItemRemove(item.id)}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {formData.items.length === 0 && (
                      <div className="cinv-empty-items">No items added yet</div>
                    )}
                  </div>
                </div>

                <div className="cinv-totals-section">
                  <div className="cinv-total-row-calc">
                    <span>Subtotal:</span>
                    <span>{Utils.formatCurrency(calculateTotals.subtotal)}</span>
                  </div>
                  {formData.invoiceType === 'vat' && (
                    <div className="cinv-total-row-calc">
                      <span>VAT ({formData.vatRate}%):</span>
                      <span>{Utils.formatCurrency(calculateTotals.vatAmount)}</span>
                    </div>
                  )}
                  <div className="cinv-total-row-calc cinv-grand-total">
                    <span>Total:</span>
                    <span>{Utils.formatCurrency(calculateTotals.total)}</span>
                  </div>
                  <div className="cinv-amount-words">
                    {Utils.convertAmountToWords(calculateTotals.total)}
                  </div>
                </div>

                <div className="cinv-form-group">
                  <label>Notes</label>
                  <textarea value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Invoice notes (will appear on invoice)"
                    rows="2"
                    className="cinv-form-textarea" />
                </div>

                <div className="cinv-form-actions">
                  <button type="submit" className="cinv-btn-primary">
                    <Save size={14} /> {editingId ? 'Update Invoice' : 'Create Invoice'}
                  </button>
                  <button type="button" className="cinv-btn-secondary"
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
  };

  // ============================================
  // DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm) return null;
    return (
      <ModalPortal>
        <div className="cinv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(null); }}>
          <div className="cinv-modal cinv-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="cinv-modal-header" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
              <div className="cinv-modal-header-left">
                <div className="cinv-modal-icon"><Trash2 size={18} /></div>
                <div>
                  <h3>Delete Client Invoice</h3>
                  <p className="cinv-modal-sub">This action cannot be undone</p>
                </div>
              </div>
              <button className="cinv-modal-close" onClick={() => setShowDeleteConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="cinv-modal-body">
              <div className="cinv-delete-content">
                <div className="cinv-delete-icon"><AlertCircle size={40} /></div>
                <p className="cinv-delete-text">Are you sure you want to delete this client invoice?</p>
                <p className="cinv-delete-subtext">This action cannot be undone.</p>
                <div className="cinv-delete-actions">
                  <button className="cinv-btn-danger" onClick={async () => {
                    try { await deleteInvoice(showDeleteConfirm); } catch (e) { alert(e.message); }
                    setShowDeleteConfirm(null);
                  }}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button className="cinv-btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
                    Cancel
                  </button>
                </div>
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
    <div className={`cinv-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="cinv-ambient">
        <div className="cinv-orb cinv-orb-1" />
        <div className="cinv-orb cinv-orb-2" />
        <div className="cinv-orb cinv-orb-3" />
      </div>

      <div className="cinv-header">
        <div className="cinv-header-left">
          <div className="cinv-header-icon-wrapper">
            <FileText size={22} />
            <span className="cinv-header-badge"><Sparkles size={10} /> CLIENT INVOICES</span>
          </div>
          <div>
            <h2>Client Invoice Management</h2>
            <p className="cinv-header-subtitle">
              {totalInvoices} client invoices · {paidInvoices} paid · {Utils.formatCurrencyShort(totalAmount)} total
            </p>
          </div>
        </div>
        <div className="cinv-header-right">
          <button className="cinv-btn-ghost" onClick={() => refresh()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="cinv-btn-primary" onClick={openAddModal}>
            <Plus size={14} /> New Client Invoice
          </button>
        </div>
      </div>

      <div className="cinv-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'invoices', label: 'Invoices', icon: FileText, badge: filteredInvoices.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`cinv-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="cinv-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="cinv-loading">
          <RefreshCw size={20} className="cinv-spin" /> Loading client invoices...
        </div>
      ) : (
        viewMode === 'overview' ? renderOverviewTab() : renderInvoicesTab()
      )}

      {showForm && renderFormModal()}
      {viewingInvoice && (
        <ViewInvoiceModal invoice={viewingInvoice} onClose={() => setViewingInvoice(null)} />
      )}
      {renderDeleteConfirm()}
    </div>
  );
};

export default ClientInvoicesManager;