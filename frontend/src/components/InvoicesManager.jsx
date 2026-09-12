// src/components/InvoicesManagerComponent.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Edit, Trash2, FileText, Download, Eye, Printer, X, Save, Plus, Minus,
  Search, RefreshCw, DollarSign, Calendar, Building2, User, MapPin,
  CreditCard, Receipt, AlertCircle, CheckCircle, TrendingUp, TrendingDown,
  LayoutDashboard, Users, Briefcase, Award, Star, Gauge, Timer, Activity,
  Zap, Shield, Crown, Sparkles, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Filter, Info, Clock, Send, MoreHorizontal, Layers,
  Wallet, Percent, CircleDollarSign, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Flame, Target, Minus as MinusIcon, Crown as CrownIcon
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ComposedChart,
  Area, AreaChart, Line
} from 'recharts';
import Utils from '../utils/Utils';
import './InvoicesManager.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';

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
// MAIN COMPONENT
// ============================================
const InvoicesManagerComponent = ({ data, addInvoice, updateInvoice, deleteInvoice }) => {
  const [editingId, setEditingId] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const printRef = useRef();
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [mounted, setMounted] = useState(false);

  const [viewMode, setViewMode] = useState('overview'); // overview | invoices

  // Invoice search/filter states
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [invoiceDateFrom, setInvoiceDateFrom] = useState('');
  const [invoiceDateTo, setInvoiceDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const count = (data.invoices || []).length + 1;
    return `INV-${year}-${String(count).padStart(4, '0')}`;
  };

  const [formData, setFormData] = useState({
    invoiceNumber: generateInvoiceNumber(),
    siteId: '', clientName: '', clientAddress: '', clientCrn: '',
    invoiceDate: Utils.today(),
    dueDate: Utils.addDays(Utils.today(), 30),
    subtotal: '', vatRate: 0, invoiceType: 'simple', status: 'draft',
    items: [], notes: '', subject: '', cpr: '', contactPerson: ''
  });

  const [itemForm, setItemForm] = useState({
    description: '', quantity: '1', unit: 'SQ.M', unitPrice: '', total: ''
  });

  const availableItems = data.items || [];
  const commonUnits = ['SQ.M', 'SQ.FT', 'PCS', 'KG', 'TON', 'M3', 'M2', 'FT2', 'LITERS', 'HOURS', 'DAYS', 'BOX', 'ROLL'];

  // ============================================
  // STATS
  // ============================================
  const totalInvoices = (data.invoices || []).length;
  const paidInvoices = (data.invoices || []).filter(i => i.status === 'paid').length;
  const overdueInvoices = (data.invoices || []).filter(i => i.status === 'overdue').length;
  const draftInvoices = (data.invoices || []).filter(i => i.status === 'draft').length;
  const sentInvoices = (data.invoices || []).filter(i => i.status === 'sent').length;
  const totalAmount = (data.invoices || []).reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const paidAmount = (data.invoices || []).filter(i => i.status === 'paid').reduce((s, i) => s + (i.totalAmount || 0), 0);
  const overdueAmount = (data.invoices || []).filter(i => i.status === 'overdue').reduce((s, i) => s + (i.totalAmount || 0), 0);
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
    { id: 'amount', icon: DollarSign, label: 'Total Amount',
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
      { label: 'Max', value: totalInvoices > 0 ? Utils.formatCurrency(Math.max(...(data.invoices || []).map(i => i.totalAmount || 0))) : '0' },
      { label: 'Paid', value: Utils.formatCurrency(paidAmount) }
    ]}
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // FILTERED + PAGINATION
  // ============================================
  const filteredInvoices = useMemo(() => {
    let invoices = data.invoices || [];
    if (invoiceSearchTerm) {
      const search = invoiceSearchTerm.toLowerCase();
      invoices = invoices.filter(inv =>
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(search)) ||
        (inv.clientName && inv.clientName.toLowerCase().includes(search))
      );
    }
    if (invoiceStatusFilter !== 'all') invoices = invoices.filter(inv => inv.status === invoiceStatusFilter);
    if (invoiceDateFrom) invoices = invoices.filter(inv => inv.invoiceDate >= invoiceDateFrom);
    if (invoiceDateTo) invoices = invoices.filter(inv => inv.invoiceDate <= invoiceDateTo);
    return invoices.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
  }, [data.invoices, invoiceSearchTerm, invoiceStatusFilter, invoiceDateFrom, invoiceDateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [invoiceSearchTerm, invoiceStatusFilter, invoiceDateFrom, invoiceDateTo, itemsPerPage, viewMode]);

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const getPageNumbers = () => {
    const pages = []; const max = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  useEffect(() => {
    if (!editingId) {
      setFormData(prev => ({ ...prev, invoiceNumber: generateInvoiceNumber() }));
    }
  }, [data.invoices, editingId]);

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
      const monthInvoices = (data.invoices || []).filter(inv =>
        inv.invoiceDate && inv.invoiceDate.startsWith(key)
      );
      const total = monthInvoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
      const paid = monthInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((s, inv) => s + (inv.totalAmount || 0), 0);
      months.push({ label, total, paid, count: monthInvoices.length });
    }
    return months;
  }, [data.invoices]);

  const topClientsData = useMemo(() => {
    const map = {};
    (data.invoices || []).forEach(inv => {
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
  }, [data.invoices]);

  const statusAmountData = useMemo(() => {
    const map = { paid: 0, sent: 0, draft: 0, overdue: 0 };
    (data.invoices || []).forEach(inv => {
      if (map[inv.status] !== undefined) map[inv.status] += (inv.totalAmount || 0);
    });
    return [
      { name: 'Paid', value: map.paid, color: '#10b981' },
      { name: 'Sent', value: map.sent, color: '#8b5cf6' },
      { name: 'Draft', value: map.draft, color: '#f59e0b' },
      { name: 'Overdue', value: map.overdue, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [data.invoices]);

  // ============================================
  // ITEM HELPERS
  // ============================================
  const handleItemSelect = (item) => {
    setItemForm({
      description: item.name,
      quantity: '1',
      unit: item.unit || 'SQ.M',
      unitPrice: item.unitPrice?.toString() || '0',
      total: (item.unitPrice || 0).toString()
    });
    setShowItemSearch(false);
    setItemSearchTerm('');
  };

  const handleItemAdd = () => {
    if (!itemForm.description || !itemForm.unitPrice) return;
    const quantity = parseFloat(itemForm.quantity) || 1;
    const unitPrice = parseFloat(itemForm.unitPrice) || 0;
    const newItem = {
      id: Date.now().toString(),
      description: itemForm.description,
      quantity, unit: itemForm.unit || 'SQ.M', unitPrice,
      total: quantity * unitPrice
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setItemForm({ description: '', quantity: '1', unit: 'SQ.M', unitPrice: '', total: '' });
  };

  const handleItemRemove = (id) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const filteredItems = useMemo(() => {
    if (!itemSearchTerm) return availableItems.slice(0, 10);
    return availableItems.filter(item =>
      item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(itemSearchTerm.toLowerCase()))
    );
  }, [availableItems, itemSearchTerm]);

  const calculateTotals = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const vatAmount = formData.invoiceType === 'vat' ? subtotal * (parseFloat(formData.vatRate) / 100) : 0;
    return { subtotal, vatAmount, total: subtotal + vatAmount };
  }, [formData.items, formData.vatRate, formData.invoiceType]);

  // ============================================
  // CRUD
  // ============================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.clientName) { alert('Client name is required'); return; }
    const invoice = {
      ...formData,
      invoiceNumber: formData.invoiceNumber || generateInvoiceNumber(),
      subtotal: calculateTotals.subtotal,
      vatAmount: calculateTotals.vatAmount,
      totalAmount: calculateTotals.total,
      amountInWords: Utils.convertAmountToWords(calculateTotals.total)
    };
    if (editingId) {
      updateInvoice(editingId, invoice);
      setEditingId(null);
    } else {
      addInvoice(invoice);
    }
    resetForm();
    setShowForm(false);
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: generateInvoiceNumber(),
      siteId: '', clientName: '', clientAddress: '', clientCrn: '',
      invoiceDate: Utils.today(),
      dueDate: Utils.addDays(Utils.today(), 30),
      subtotal: '', vatRate: 0, invoiceType: 'simple', status: 'draft',
      items: [], notes: '', subject: '', cpr: '', contactPerson: ''
    });
    setEditingId(null);
    setItemForm({ description: '', quantity: '1', unit: 'SQ.M', unitPrice: '', total: '' });
  };

  const openAddModal = () => { resetForm(); setShowForm(true); };

  const openEditModal = (invoice) => {
    setEditingId(invoice.id);
    setFormData({
      invoiceNumber: invoice.invoiceNumber || '',
      siteId: invoice.siteId || '',
      clientName: invoice.clientName || '',
      clientAddress: invoice.clientAddress || '',
      clientCrn: invoice.clientCrn || '',
      invoiceDate: invoice.invoiceDate || Utils.today(),
      dueDate: invoice.dueDate || Utils.addDays(Utils.today(), 30),
      subtotal: invoice.subtotal || '',
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
      <span className={`inv-status ${status}`}>
        <Icon size={11} /> {c.label}
      </span>
    );
  };

  // ============================================
  // PRINT TEMPLATE (unchanged)
  // ============================================
  const generateInvoiceHTML = (invoice) => {
    const companyPhone = data.companyPhone || '+973 37099957';
    const items = invoice.items || [];
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const vatAmount = invoice.invoiceType === 'vat' ? subtotal * (parseFloat(invoice.vatRate) / 100) : 0;
    const total = subtotal + vatAmount;
    const primary = '#1a3c6e';
    const secondary = '#c9a84c';
    const light = '#e8edf3';
    const muted = '#6a6a8a';
    const border = '#d4d9e0';
    const text = '#1a1a2e';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0 !important; padding: 0 !important; border: 0 !important; box-sizing: border-box !important; }
    html, body { width: 100% !important; height: 100% !important; background: #ffffff !important;
      font-family: 'Times New Roman', Arial, serif !important; color: ${text} !important; }
    .inv-container { width: 100% !important; display: flex !important; flex-direction: column !important;
      min-height: 100vh !important; position: relative !important; background: #ffffff !important; }
    .inv-background { position: fixed !important; inset: 0 !important; z-index: 0 !important;
      pointer-events: none !important; display: flex !important; justify-content: center !important;
      align-items: center !important; opacity: 0.08 !important; }
    .inv-background img { width: 70% !important; max-width: 600px !important; height: auto !important; }
    .inv-content-wrapper { position: relative !important; z-index: 1 !important; display: flex !important;
      flex-direction: column !important; min-height: 100vh !important; width: 100% !important; }
    .inv-header-img img, .inv-footer-img img { width: 100% !important; height: auto !important; display: block !important; }
    .inv-content-section { flex: 1 !important; padding: 8px 30px 12px !important; }
    .inv-top { display: flex !important; justify-content: space-between !important; align-items: flex-start !important;
      margin: 0 0 12px 0 !important; padding: 10px 14px !important; border-bottom: 2px solid ${primary} !important; }
    .inv-bill-to h3 { font-size: 12px !important; font-weight: 700 !important; color: ${primary} !important;
      margin: 0 0 4px 0 !important; text-transform: uppercase !important; letter-spacing: 1px !important; }
    .inv-client-name { font-weight: 700 !important; font-size: 15px !important; color: ${primary} !important; margin: 0 0 3px 0 !important; }
    .inv-client-detail { font-size: 12px !important; color: ${muted} !important; margin: 1px 0 !important; line-height: 1.4 !important; }
    .inv-right { text-align: right !important; }
    .inv-title { font-size: 24px !important; font-weight: 800 !important; color: ${primary} !important; letter-spacing: 2px !important; }
    .inv-number { font-size: 14px !important; color: ${muted} !important; font-weight: 600 !important; }
    .inv-detail { font-size: 12px !important; color: ${muted} !important; margin: 1px 0 !important; }
    .inv-detail strong { color: ${primary} !important; }
    .inv-status { display: inline-block !important; padding: 3px 14px !important; border-radius: 20px !important;
      font-size: 10px !important; font-weight: 700 !important; text-transform: uppercase !important; margin-top: 3px !important; color: #ffffff !important; }
    .inv-status-paid { background: #22c55e !important; }
    .inv-status-draft { background: #f59e0b !important; }
    .inv-status-sent { background: #3b82f6 !important; }
    .inv-status-overdue { background: #ef4444 !important; }
    .inv-subject { margin: 8px 0 10px 0 !important; padding: 6px 0 !important; font-size: 13px !important;
      font-weight: 600 !important; color: ${primary} !important; border-bottom: 1px solid ${border} !important; }
    .inv-salutation { margin: 6px 0 10px 0 !important; font-size: 13px !important; color: ${text} !important; }
    .inv-table { width: 100% !important; border-collapse: collapse !important; margin: 10px 0 !important; font-size: 12px !important; background: #ffffff !important; }
    .inv-table thead { background: ${primary} !important; }
    .inv-table th { color: #ffffff !important; padding: 8px 10px !important; text-align: center !important;
      font-size: 11px !important; text-transform: uppercase !important; font-weight: 700 !important; letter-spacing: 0.5px !important; }
    .inv-table td { padding: 6px 10px !important; border-bottom: 1px solid ${border} !important; text-align: center !important; }
    .inv-totals { margin: 10px 0 10px auto !important; padding: 10px 16px !important; background: ${light} !important;
      max-width: 320px !important; border: 2px solid ${secondary} !important; }
    .inv-total-row { display: flex !important; justify-content: space-between !important; padding: 3px 0 !important; font-size: 13px !important; }
    .inv-grand { border-top: 2px solid ${secondary} !important; margin-top: 4px !important; padding-top: 8px !important;
      font-size: 18px !important; font-weight: 800 !important; }
    .inv-words { font-size: 11px !important; color: ${muted} !important; font-style: italic !important;
      border-top: 1px solid ${border} !important; margin-top: 6px !important; padding-top: 6px !important; text-align: center !important; }
    .inv-notes { padding: 8px 14px !important; border: 1px solid ${border} !important; border-left: 4px solid ${secondary} !important;
      margin: 10px 0 !important; font-size: 12px !important; color: ${muted} !important; background: #fafafa !important; }
    .inv-signature { margin-top: 20px !important; padding-top: 10px !important; border-top: 1px solid ${border} !important; text-align: right !important; }
    @media print { @page { margin: 0 !important; size: A4 !important; }
      html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  </style>
</head>
<body>
  <div class="inv-container">
    <div class="inv-background"><img src='${background}' alt="bg" /></div>
    <div class="inv-content-wrapper">
      <div class="inv-header-img"><img src="${letterheadHeader}" alt="Header" /></div>
      <div class="inv-content-section">
        <div class="inv-top">
          <div class="inv-bill-to">
            <h3>To,</h3>
            <div class="inv-client-name">${invoice.clientName || ''}</div>
            ${invoice.clientAddress ? `<div class="inv-client-detail">${invoice.clientAddress}</div>` : ''}
            ${invoice.clientCrn ? `<div class="inv-client-detail">CRN: ${invoice.clientCrn}</div>` : ''}
          </div>
          <div class="inv-right">
            <div class="inv-title">INVOICE</div>
            <div class="inv-number">#${invoice.invoiceNumber || 'DRAFT'}</div>
            <div class="inv-detail"><strong>Date:</strong> ${Utils.formatDate(invoice.invoiceDate)}</div>
            <div class="inv-detail"><strong>Due:</strong> ${Utils.formatDate(invoice.dueDate)}</div>
            <div class="inv-status inv-status-${invoice.status || 'draft'}">${(invoice.status || 'draft').toUpperCase()}</div>
          </div>
        </div>
        ${invoice.subject ? `<div class="inv-subject">Subject: ${invoice.subject}</div>` : ''}
        <div class="inv-salutation">Dear Sir,</div>
        <div class="inv-salutation" style="margin-top:-6px !important;font-weight:400 !important;">
          We are pleased to submit our Invoice for the below mentioned work as follows.
        </div>
        <table class="inv-table">
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
        <div class="inv-totals">
          <div class="inv-total-row"><span>Subtotal:</span><span>${Utils.formatCurrencyShort(subtotal)}</span></div>
          ${invoice.invoiceType === 'vat' ? `<div class="inv-total-row"><span>VAT (${invoice.vatRate || 10}%):</span><span>${Utils.formatCurrencyShort(vatAmount)}</span></div>` : ''}
          <div class="inv-total-row inv-grand"><span>TOTAL:</span><span>${Utils.formatCurrencyShort(total)}</span></div>
          <div class="inv-words">${Utils.convertAmountToWords(total)}</div>
        </div>
        ${invoice.notes ? `<div class="inv-notes"><strong>Note:</strong> ${invoice.notes}</div>` : ''}
        <div class="inv-signature">
          <div style="font-weight:700;font-size:14px;color:${primary};">Yours faithfully,</div>
          <div style="margin-top:10px;">
            <div style="font-weight:700;font-size:14px;color:${primary};">${invoice.contactPerson || 'Riffat Afza'}</div>
            <div style="font-size:12px;color:${muted};">${invoice.cpr || 'CPR No. 570713994'}</div>
            <div style="font-size:12px;color:${muted};">Mob. ${companyPhone}</div>
          </div>
        </div>
      </div>
      <div class="inv-footer-img"><img src="${letterheadFooter}" alt="Footer" /></div>
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
                {item.trend === 'flat' && <MinusIcon size={15} />}
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

      {/* Row 1 — Status donut + Amount by status donut */}
      <div className="inv-grid-1-1">
        <div className="inv-card-panel">
          <div className="inv-card-panel-header">
            <div className="inv-card-panel-title">
              <span className="inv-card-panel-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Invoices by Status</h4>
                <span>{totalInvoices} total invoices</span>
              </div>
            </div>
          </div>
          {statusChartData.length > 0 ? (
            <div className="inv-donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="inv-donut-legend">
                {statusChartData.map((d, i) => (
                  <div key={i} className="inv-donut-item">
                    <span className="inv-donut-dot" style={{ background: d.color }} />
                    <span className="inv-donut-name">{d.name}</span>
                    <span className="inv-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="inv-empty-mini">No invoices</div>}
        </div>

        <div className="inv-card-panel">
          <div className="inv-card-panel-header">
            <div className="inv-card-panel-title">
              <span className="inv-card-panel-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <CircleDollarSign size={16} />
              </span>
              <div>
                <h4>Amount by Status</h4>
                <span>{Utils.formatCurrencyShort(totalAmount)}</span>
              </div>
            </div>
          </div>
          {statusAmountData.length > 0 ? (
            <div className="inv-donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={statusAmountData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {statusAmountData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="inv-donut-legend">
                {statusAmountData.map((d, i) => (
                  <div key={i} className="inv-donut-item">
                    <span className="inv-donut-dot" style={{ background: d.color }} />
                    <span className="inv-donut-name">{d.name}</span>
                    <span className="inv-donut-val">{Utils.formatCurrencyShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="inv-empty-mini">No amounts</div>}
        </div>
      </div>

      {/* Row 2 — 12-month trend */}
      <div className="inv-card-panel">
        <div className="inv-card-panel-header">
          <div className="inv-card-panel-title">
            <span className="inv-card-panel-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
              <LineChartIcon size={16} />
            </span>
            <div>
              <h4>12-Month Invoice Trend</h4>
              <span>Total vs Paid by month</span>
            </div>
          </div>
          <div className="inv-legend">
            <span><i style={{ background: '#10b981' }} />Paid</span>
            <span><i style={{ background: '#3b82f6' }} />Total</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyTrendData}>
            <defs>
              <linearGradient id="invTotalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="invPaidGrad" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#invTotalGrad)" name="Total" />
            <Area type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={2.5}
              fill="url(#invPaidGrad)" name="Paid" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3 — Top clients bar */}
      {topClientsData.length > 0 && (
        <div className="inv-card-panel">
          <div className="inv-card-panel-header">
            <div className="inv-card-panel-title">
              <span className="inv-card-panel-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
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
                <linearGradient id="invTopClients" x1="0" y1="0" x2="1" y2="0">
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
              <Bar dataKey="value" name="Amount" fill="url(#invTopClients)" radius={[0, 8, 8, 0]} barSize={22} />
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
    <div className="inv-view">
      {/* Filters */}
      <div className="inv-filters">
        <div className="inv-search-box">
          <Search size={15} className="inv-search-icon" />
          <input type="text" value={invoiceSearchTerm}
            onChange={e => setInvoiceSearchTerm(e.target.value)}
            placeholder="Search by invoice # or client..."
            className="inv-search-input" />
          {invoiceSearchTerm && (
            <button className="inv-clear-search" onClick={() => setInvoiceSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="inv-filter-group">
          <select value={invoiceStatusFilter}
            onChange={e => setInvoiceStatusFilter(e.target.value)}
            className="inv-filter-select">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <input type="date" value={invoiceDateFrom}
            onChange={e => setInvoiceDateFrom(e.target.value)}
            className="inv-filter-date" />
          <input type="date" value={invoiceDateTo}
            onChange={e => setInvoiceDateTo(e.target.value)}
            className="inv-filter-date" />
        </div>
        {(invoiceSearchTerm || invoiceStatusFilter !== 'all' || invoiceDateFrom || invoiceDateTo) && (
          <button className="inv-btn-clear" onClick={() => {
            setInvoiceSearchTerm(''); setInvoiceStatusFilter('all');
            setInvoiceDateFrom(''); setInvoiceDateTo('');
          }}>
            <X size={13} /> Clear
          </button>
        )}
        <span className="inv-result-count">
          Showing {filteredInvoices.length} of {totalInvoices}
        </span>
        <button className="inv-btn-primary" onClick={openAddModal}>
          <Plus size={14} /> New Invoice
        </button>
      </div>

      {/* Content */}
      {filteredInvoices.length === 0 ? (
        <div className="inv-empty">
          <div className="inv-empty-icon"><FileText size={40} /></div>
          <h3>No Invoices Found</h3>
          <p>Try adjusting your filters or create a new invoice.</p>
          <button className="inv-btn-primary" onClick={openAddModal}>
            <Plus size={14} /> Create Invoice
          </button>
        </div>
      ) : (
        <>
          <div className="inv-cards-grid">
            {paginatedInvoices.map((invoice, index) => (
              <div key={invoice.id} className="inv-card"
                style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
                <div className="inv-card-accent" style={{
                  background: invoice.status === 'paid' ? 'linear-gradient(90deg,#10b981,#34d399)'
                    : invoice.status === 'overdue' ? 'linear-gradient(90deg,#ef4444,#f87171)'
                    : invoice.status === 'sent' ? 'linear-gradient(90deg,#8b5cf6,#a78bfa)'
                    : 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                }} />
                <div className="inv-card-header">
                  <div className="inv-card-number">
                    <FileText size={12} />
                    {invoice.invoiceNumber || 'Draft'}
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>
                <div className="inv-card-body">
                  <div className="inv-card-client">{invoice.clientName}</div>
                  <div className="inv-card-amount">
                    {Utils.formatCurrency(invoice.totalAmount || invoice.subtotal || 0)}
                  </div>
                  <div className="inv-card-meta">
                    <span className="inv-card-meta-item">
                      <Calendar size={11} /> {Utils.formatDate(invoice.invoiceDate)}
                    </span>
                    <span className="inv-card-meta-item">
                      <Receipt size={11} /> {invoice.items?.length || 0} items
                    </span>
                  </div>
                </div>
                <div className="inv-card-footer">
                  <div className="inv-card-actions">
                    <button className="inv-icon-btn inv-icon-view" title="View"
                      onClick={() => setViewingInvoice(invoice)}>
                      <Eye size={14} />
                    </button>
                    <button className="inv-icon-btn inv-icon-print" title="Print"
                      onClick={() => handlePrintInvoice(invoice)}>
                      <Printer size={14} />
                    </button>
                    <button className="inv-icon-btn inv-icon-edit" title="Edit"
                      onClick={() => openEditModal(invoice)}>
                      <Edit size={14} />
                    </button>
                    <button className="inv-icon-btn inv-icon-danger" title="Delete"
                      onClick={() => setShowDeleteConfirm(invoice.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="inv-pagination">
            <div className="inv-pagination-info">
              Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong>–
              <strong>{Math.min(currentPage * itemsPerPage, filteredInvoices.length)}</strong> of{' '}
              <strong>{filteredInvoices.length}</strong>
            </div>
            <div className="inv-pagination-controls">
              <div className="inv-pagination-items">
                <span>Show:</span>
                <select value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="inv-pagination-select">
                  {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="inv-pagination-buttons">
                <button className="inv-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft size={13} />
                </button>
                <button className="inv-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft size={13} />
                </button>
                {getPageNumbers().map(p => (
                  <button key={p} className={`inv-page-btn ${p === currentPage ? 'active' : ''}`}
                    onClick={() => goToPage(p)}>{p}</button>
                ))}
                <button className="inv-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  <ChevronRight size={13} />
                </button>
                <button className="inv-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
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
  // VIEW INVOICE MODAL
  // ============================================
  const ViewInvoiceModal = ({ invoice, onClose }) => {
    if (!invoice) return null;
    const items = invoice.items || [];
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const vatAmount = invoice.invoiceType === 'vat' ? subtotal * (parseFloat(invoice.vatRate) / 100) : 0;
    const total = subtotal + vatAmount;
    return (
      <ModalPortal>
        <div className="inv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #0b1a12, #1f3a2c)' }}>
              <div className="inv-modal-header-left">
                <div className="inv-modal-icon"><FileText size={18} /></div>
                <div>
                  <h3>Invoice Preview</h3>
                  <p className="inv-modal-sub">#{invoice.invoiceNumber} · {invoice.clientName}</p>
                </div>
              </div>
              <div className="inv-modal-actions">
                <button className="inv-btn-ghost-light" onClick={() => handlePrintInvoice(invoice)}>
                  <Printer size={14} /> Print
                </button>
                <button className="inv-modal-close" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="inv-modal-body inv-preview-body">
              <img src={letterheadHeader} alt="Header" className="inv-preview-letterhead" />
              <div className="inv-preview-content">
                <div className="inv-preview-top">
                  <div>
                    <div className="inv-preview-label">To,</div>
                    <div className="inv-preview-client">{invoice.clientName}</div>
                    {invoice.clientAddress && <div className="inv-preview-detail">{invoice.clientAddress}</div>}
                    {invoice.clientCrn && <div className="inv-preview-detail">CRN: {invoice.clientCrn}</div>}
                  </div>
                  <div className="inv-preview-right">
                    <div className="inv-preview-title">INVOICE</div>
                    <div className="inv-preview-number">#{invoice.invoiceNumber}</div>
                    <div className="inv-preview-detail"><strong>Date:</strong> {Utils.formatDate(invoice.invoiceDate)}</div>
                    <div className="inv-preview-detail"><strong>Due:</strong> {Utils.formatDate(invoice.dueDate)}</div>
                    <div className="inv-preview-status">{getStatusBadge(invoice.status)}</div>
                  </div>
                </div>
                {invoice.subject && <div className="inv-preview-subject">Subject: {invoice.subject}</div>}
                <table className="inv-preview-table">
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
                <div className="inv-preview-totals">
                  <div className="inv-preview-total-row"><span>Subtotal:</span><span>{Utils.formatCurrencyShort(subtotal)}</span></div>
                  {invoice.invoiceType === 'vat' && (
                    <div className="inv-preview-total-row"><span>VAT ({invoice.vatRate}%):</span><span>{Utils.formatCurrencyShort(vatAmount)}</span></div>
                  )}
                  <div className="inv-preview-grand"><span>TOTAL:</span><span>{Utils.formatCurrencyShort(total)}</span></div>
                  <div className="inv-preview-words">{Utils.convertAmountToWords(total)}</div>
                </div>
                {invoice.notes && <div className="inv-preview-notes"><strong>Note:</strong> {invoice.notes}</div>}
              </div>
              <img src={letterheadFooter} alt="Footer" className="inv-preview-letterhead" />
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  // ============================================
  // FORM MODAL (unchanged logic)
  // ============================================
  const renderFormModal = () => (
    <ModalPortal>
      <div className="inv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="inv-modal inv-modal-lg" onClick={e => e.stopPropagation()}>
          <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="inv-modal-header-left">
              <div className="inv-modal-icon">
                {editingId ? <Edit size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit Invoice' : 'New Invoice'}</h3>
                <p className="inv-modal-sub">{editingId ? 'Update invoice details' : 'Create a new invoice'}</p>
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
                  <label>Invoice No</label>
                  <input type="text" value={formData.invoiceNumber} disabled
                    className="inv-form-input inv-disabled" />
                  <small className="inv-hint">Auto-generated</small>
                </div>
                <div className="inv-form-group">
                  <label>Client Name <span className="inv-required">*</span></label>
                  <input type="text" value={formData.clientName} required
                    onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Client name" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Site</label>
                  <select value={formData.siteId}
                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                    className="inv-form-select">
                    <option value="">Select Site</option>
                    {data.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="inv-form-group">
                  <label>Status</label>
                  <select value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="inv-form-select">
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Invoice Date</label>
                  <input type="date" value={formData.invoiceDate}
                    onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>Due Date</label>
                  <input type="date" value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Subject</label>
                  <input type="text" value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Subject of invoice" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>Contact Person</label>
                  <input type="text" value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Contact person name" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>CPR No.</label>
                  <input type="text" value={formData.cpr}
                    onChange={e => setFormData({ ...formData, cpr: e.target.value })}
                    placeholder="CPR Number" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>Client Address</label>
                  <input type="text" value={formData.clientAddress}
                    onChange={e => setFormData({ ...formData, clientAddress: e.target.value })}
                    placeholder="Client address" className="inv-form-input" />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label>Client CRN</label>
                  <input type="text" value={formData.clientCrn}
                    onChange={e => setFormData({ ...formData, clientCrn: e.target.value })}
                    placeholder="Commercial Registration #" className="inv-form-input" />
                </div>
                <div className="inv-form-group">
                  <label>Invoice Type</label>
                  <select value={formData.invoiceType}
                    onChange={e => setFormData({ ...formData, invoiceType: e.target.value, vatRate: e.target.value === 'simple' ? 0 : formData.vatRate || 10 })}
                    className="inv-form-select">
                    <option value="simple">Simple (No VAT)</option>
                    <option value="vat">With VAT</option>
                  </select>
                </div>
              </div>

              <div className="inv-items-section">
                <div className="inv-section-title">
                  <Receipt size={14} /> Invoice Items
                </div>

                <div className="inv-item-form-grid">
                  <div className="inv-form-group" style={{ position: 'relative' }}>
                    <label>Description</label>
                    <div className="inv-item-search">
                      <input type="text" value={itemForm.description}
                        onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                        placeholder="Search or type item..."
                        onFocus={() => setShowItemSearch(true)}
                        className="inv-form-input" />
                      <button type="button" className="inv-btn-search"
                        onClick={() => setShowItemSearch(!showItemSearch)}>
                        <Search size={14} />
                      </button>
                    </div>
                    {showItemSearch && (
                      <div className="inv-item-dropdown">
                        <input type="text" value={itemSearchTerm}
                          onChange={e => setItemSearchTerm(e.target.value)}
                          placeholder="Search items..." autoFocus
                          className="inv-dropdown-search" />
                        {filteredItems.length === 0 ? (
                          <div className="inv-dropdown-empty">No items found</div>
                        ) : filteredItems.map(item => (
                          <div key={item.id} className="inv-dropdown-item"
                            onClick={() => handleItemSelect(item)}>
                            <div>
                              <div className="inv-dropdown-name">{item.name}</div>
                              <div className="inv-dropdown-meta">{item.category} · {item.unit}</div>
                            </div>
                            <div className="inv-dropdown-price">{Utils.formatCurrency(item.unitPrice)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="inv-form-group">
                    <label>Qty</label>
                    <input type="number" step="0.01" value={itemForm.quantity}
                      onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })}
                      placeholder="Qty" className="inv-form-input" />
                  </div>
                  <div className="inv-form-group">
                    <label>Unit</label>
                    <select value={itemForm.unit}
                      onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                      className="inv-form-select">
                      {commonUnits.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="inv-form-group">
                    <label>Unit Price</label>
                    <input type="number" step="0.001" value={itemForm.unitPrice}
                      onChange={e => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                      placeholder="Price" className="inv-form-input" />
                  </div>
                  <button type="button" className="inv-btn-add-item" onClick={handleItemAdd}>
                    <Plus size={14} /> Add
                  </button>
                </div>

                <div className="inv-items-list">
                  {formData.items.map(item => (
                    <div key={item.id} className="inv-item-row">
                      <span className="inv-item-desc">{item.description}</span>
                      <span className="inv-item-qty">{item.quantity} × {item.unit}</span>
                      <span className="inv-item-price">{Utils.formatCurrencyShort(item.unitPrice)}</span>
                      <span className="inv-item-total">{Utils.formatCurrency(item.total)}</span>
                      <button type="button" className="inv-btn-remove"
                        onClick={() => handleItemRemove(item.id)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {formData.items.length === 0 && (
                    <div className="inv-empty-items">No items added yet</div>
                  )}
                </div>
              </div>

              <div className="inv-totals-section">
                <div className="inv-total-row-calc">
                  <span>Subtotal:</span>
                  <span>{Utils.formatCurrency(calculateTotals.subtotal)}</span>
                </div>
                {formData.invoiceType === 'vat' && (
                  <div className="inv-total-row-calc">
                    <span>VAT ({formData.vatRate}%):</span>
                    <span>{Utils.formatCurrency(calculateTotals.vatAmount)}</span>
                  </div>
                )}
                <div className="inv-total-row-calc inv-grand-total">
                  <span>Total:</span>
                  <span>{Utils.formatCurrency(calculateTotals.total)}</span>
                </div>
                <div className="inv-amount-words">
                  {Utils.convertAmountToWords(calculateTotals.total)}
                </div>
              </div>

              <div className="inv-form-group">
                <label>Notes</label>
                <textarea value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Invoice notes (will appear on invoice)"
                  rows="2" className="inv-form-textarea" />
              </div>

              <div className="inv-form-actions">
                <button type="submit" className="inv-btn-primary" disabled={loading}>
                  <Save size={14} /> {editingId ? 'Update Invoice' : 'Create Invoice'}
                </button>
                <button type="button" className="inv-btn-secondary"
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
  // DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm) return null;
    return (
      <ModalPortal>
        <div className="inv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(null); }}>
          <div className="inv-modal inv-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
              <div className="inv-modal-header-left">
                <div className="inv-modal-icon"><Trash2 size={18} /></div>
                <div>
                  <h3>Delete Invoice</h3>
                  <p className="inv-modal-sub">This action cannot be undone</p>
                </div>
              </div>
              <button className="inv-modal-close" onClick={() => setShowDeleteConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="inv-modal-body">
              <div className="inv-delete-content">
                <div className="inv-delete-icon"><AlertCircle size={40} /></div>
                <p className="inv-delete-text">Are you sure you want to delete this invoice?</p>
                <p className="inv-delete-subtext">This action cannot be undone.</p>
                <div className="inv-delete-actions">
                  <button className="inv-btn-danger" onClick={() => {
                    deleteInvoice(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                  }}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button className="inv-btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
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
    <div className={`inv-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="inv-ambient">
        <div className="inv-orb inv-orb-1" />
        <div className="inv-orb inv-orb-2" />
        <div className="inv-orb inv-orb-3" />
      </div>

      {/* Header */}
      <div className="inv-header">
        <div className="inv-header-left">
          <div className="inv-header-icon-wrapper">
            <FileText size={22} />
            <span className="inv-header-badge"><Sparkles size={10} /> INVOICES</span>
          </div>
          <div>
            <h2>Invoice Management</h2>
            <p className="inv-header-subtitle">
              {totalInvoices} invoices · {paidInvoices} paid · {Utils.formatCurrencyShort(totalAmount)} total
            </p>
          </div>
        </div>
        <div className="inv-header-right">
          <button className="inv-btn-ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="inv-btn-primary" onClick={openAddModal}>
            <Plus size={14} /> New Invoice
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="inv-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'invoices', label: 'Invoices', icon: FileText, badge: filteredInvoices.length }
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

      {viewMode === 'overview' ? renderOverviewTab() : renderInvoicesTab()}

      {showForm && renderFormModal()}
      {viewingInvoice && (
        <ViewInvoiceModal invoice={viewingInvoice} onClose={() => setViewingInvoice(null)} />
      )}
      {renderDeleteConfirm()}
    </div>
  );
};

export default InvoicesManagerComponent;