// src/components/InvoicesManagerComponent.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Edit,
  Trash2,
  FileText,
  Download,
  Eye,
  Printer,
  X,
  Save,
  Plus,
  Minus,
  Search,
  RefreshCw,
  DollarSign,
  Calendar,
  Building2,
  User,
  MapPin,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  Users,
  Briefcase,
  Award,
  Star,
  Gauge,
  Timer,
  Activity,
  Zap,
  Shield,
  Crown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Filter,
  Info,
  Clock,
  Send
} from 'lucide-react';
import Utils from '../utils/Utils';
import './InvoicesManager.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';

const InvoicesManagerComponent = ({ data, addInvoice, updateInvoice, deleteInvoice }) => {
  // ============================================
  // STATE
  // ============================================
  const [editingId, setEditingId] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const printRef = useRef();
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Invoice search/filter states
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [invoiceDateFrom, setInvoiceDateFrom] = useState('');
  const [invoiceDateTo, setInvoiceDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  // Generate invoice number
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const count = (data.invoices || []).length + 1;
    return `INV-${year}-${String(count).padStart(4, '0')}`;
  };

  const [formData, setFormData] = useState({
    invoiceNumber: generateInvoiceNumber(),
    siteId: '',
    clientName: '',
    clientAddress: '',
    clientCrn: '',
    invoiceDate: Utils.today(),
    dueDate: Utils.addDays(Utils.today(), 30),
    subtotal: '',
    vatRate: 0,
    invoiceType: 'simple',
    status: 'draft',
    items: [],
    notes: '',
    subject: '',
    cpr: '',
    contactPerson: ''
  });

  const [itemForm, setItemForm] = useState({
    description: '',
    quantity: '1',
    unit: 'SQ.M',
    unitPrice: '',
    total: ''
  });

  // Get available items from inventory
  const availableItems = data.items || [];

  // Common units for dropdown
  const commonUnits = ['SQ.M', 'SQ.FT', 'PCS', 'KG', 'TON', 'M3', 'M2', 'FT2', 'LITERS', 'HOURS', 'DAYS', 'BOX', 'ROLL'];

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const totalInvoices = (data.invoices || []).length;
  const paidInvoices = (data.invoices || []).filter(i => i.status === 'paid').length;
  const overdueInvoices = (data.invoices || []).filter(i => i.status === 'overdue').length;
  const totalAmount = (data.invoices || []).reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const cardDetails = {
    total: {
      title: 'Total Invoices',
      details: [
        { label: 'Total Invoices', value: totalInvoices },
        { label: 'Paid', value: paidInvoices },
        { label: 'Overdue', value: overdueInvoices },
        { label: 'Draft', value: (data.invoices || []).filter(i => i.status === 'draft').length }
      ]
    },
    paid: {
      title: 'Paid Invoices',
      details: [
        { label: 'Paid', value: paidInvoices },
        { label: 'Total Amount', value: Utils.formatCurrency(totalAmount) },
        { label: 'Total Invoices', value: totalInvoices },
        { label: 'Payment Rate', value: totalInvoices > 0 ? `${((paidInvoices / totalInvoices) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    overdue: {
      title: 'Overdue Invoices',
      details: [
        { label: 'Overdue', value: overdueInvoices },
        { label: 'Total Invoices', value: totalInvoices },
        { label: 'Paid', value: paidInvoices },
        { label: 'Overdue Rate', value: totalInvoices > 0 ? `${((overdueInvoices / totalInvoices) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    amount: {
      title: 'Total Amount',
      details: [
        { label: 'Total Amount', value: Utils.formatCurrency(totalAmount) },
        { label: 'Avg Invoice', value: totalInvoices > 0 ? Utils.formatCurrency(totalAmount / totalInvoices) : '0.000' },
        { label: 'Total Invoices', value: totalInvoices },
        { label: 'Max Invoice', value: totalInvoices > 0 ? Utils.formatCurrency(Math.max(...(data.invoices || []).map(i => i.totalAmount || 0))) : '0.000' }
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
  // FILTERED INVOICES
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

    if (invoiceStatusFilter !== 'all') {
      invoices = invoices.filter(inv => inv.status === invoiceStatusFilter);
    }

    if (invoiceDateFrom) {
      invoices = invoices.filter(inv => inv.invoiceDate >= invoiceDateFrom);
    }
    if (invoiceDateTo) {
      invoices = invoices.filter(inv => inv.invoiceDate <= invoiceDateTo);
    }

    return invoices.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
  }, [data.invoices, invoiceSearchTerm, invoiceStatusFilter, invoiceDateFrom, invoiceDateTo]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredInvoices.slice(startIndex, endIndex);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [invoiceSearchTerm, invoiceStatusFilter, invoiceDateFrom, invoiceDateTo]);

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

  // Auto-generate invoice number when form opens
  useEffect(() => {
    if (!editingId) {
      setFormData(prev => ({
        ...prev,
        invoiceNumber: generateInvoiceNumber()
      }));
    }
  }, [data.invoices, editingId]);

  // Handle item selection from dropdown
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
    const total = quantity * unitPrice;
    const newItem = {
      id: Date.now().toString(),
      description: itemForm.description,
      quantity: quantity,
      unit: itemForm.unit || 'SQ.M',
      unitPrice: unitPrice,
      total: total
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setItemForm({ description: '', quantity: '1', unit: 'SQ.M', unitPrice: '', total: '' });
  };

  const handleItemRemove = (id) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  // Filter items for search dropdown
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
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  }, [formData.items, formData.vatRate, formData.invoiceType]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.clientName) {
      alert('Client name is required');
      return;
    }

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
      siteId: '',
      clientName: '',
      clientAddress: '',
      clientCrn: '',
      invoiceDate: Utils.today(),
      dueDate: Utils.addDays(Utils.today(), 30),
      subtotal: '',
      vatRate: 0,
      invoiceType: 'simple',
      status: 'draft',
      items: [],
      notes: '',
      subject: '',
      cpr: '',
      contactPerson: ''
    });
    setEditingId(null);
    setItemForm({ description: '', quantity: '1', unit: 'SQ.M', unitPrice: '', total: '' });
  };

  const openAddModal = () => {
    resetForm();
    setShowForm(true);
  };

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
    const colors = {
      draft: '#f59e0b',
      sent: '#3b82f6',
      paid: '#22c55e',
      overdue: '#ef4444'
    };
    const labels = {
      draft: 'Draft',
      sent: 'Sent',
      paid: 'Paid',
      overdue: 'Overdue'
    };
    const icons = {
      draft: Clock,
      sent: Send,
      paid: CheckCircle,
      overdue: AlertCircle
    };
    const Icon = icons[status] || Clock;
    return (
      <span className={`inv-status-badge ${status}`}>
        <Icon size={12} />
        {labels[status] || status}
      </span>
    );
  };

  // ============================================
  // GENERATE INVOICE HTML
  // ============================================
  const generateInvoiceHTML = (invoice) => {
    const companyName = data.companyName || 'Haji Younas Contracting';
    const companyAddress = data.companyAddress || 'Flat/Shop 21, Bldg A0365, Road 55, Block 210, Muharraq';
    const companyPhone = data.companyPhone || '+973 37099957';
    const companyEmail = data.companyEmail || 'hajiyounas.contracting@gmail.com';
    const companyCr = data.companyCr || '141997-1';

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
    html, body {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      font-family: 'Times New Roman', Arial, serif !important;
      color: ${text} !important;
    }
    .inv-container {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 100vh !important;
      position: relative !important;
    }
    .inv-background {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 0 !important;
      pointer-events: none !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      opacity: 0.08 !important;
    }
    .inv-background img {
      width: 70% !important;
      max-width: 600px !important;
      height: auto !important;
      display: block !important;
    }
    .inv-content-wrapper {
      position: relative !important;
      z-index: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 100vh !important;
      width: 100% !important;
    }
    .inv-header-section { flex-shrink: 0 !important; width: 100% !important; background: #ffffff !important; }
    .inv-header-img { width: 100% !important; max-width: 100% !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .inv-header-img img { width: 100% !important; height: auto !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .inv-content-section { flex: 1 !important; width: 100% !important; padding: 8px 30px 12px 30px !important; background: transparent !important; }
    .inv-top { display: flex !important; justify-content: space-between !important; align-items: flex-start !important; margin: 0 0 12px 0 !important; padding: 10px 14px !important; border-bottom: 2px solid ${primary} !important; }
    .inv-bill-to h3 { font-size: 12px !important; font-weight: 700 !important; color: ${primary} !important; margin: 0 0 4px 0 !important; text-transform: uppercase !important; letter-spacing: 1px !important; }
    .inv-client-name { font-weight: 700 !important; font-size: 15px !important; color: ${primary} !important; margin: 0 0 3px 0 !important; }
    .inv-client-detail { font-size: 12px !important; color: ${muted} !important; margin: 1px 0 !important; line-height: 1.4 !important; }
    .inv-right { text-align: right !important; }
    .inv-title { font-size: 24px !important; font-weight: 800 !important; color: ${primary} !important; margin: 0 !important; letter-spacing: 2px !important; }
    .inv-number { font-size: 14px !important; color: ${muted} !important; margin: 2px 0 !important; font-weight: 600 !important; }
    .inv-detail { font-size: 12px !important; color: ${muted} !important; margin: 1px 0 !important; }
    .inv-detail strong { color: ${primary} !important; }
    .inv-status { display: inline-block !important; padding: 3px 14px !important; border-radius: 20px !important; font-size: 10px !important; font-weight: 700 !important; text-transform: uppercase !important; margin-top: 3px !important; color: #ffffff !important; }
    .inv-status-paid { background: #22c55e !important; }
    .inv-status-draft { background: #f59e0b !important; }
    .inv-status-sent { background: #3b82f6 !important; }
    .inv-status-overdue { background: #ef4444 !important; }
    .inv-subject { margin: 8px 0 10px 0 !important; padding: 6px 0 !important; font-size: 13px !important; font-weight: 600 !important; color: ${primary} !important; border-bottom: 1px solid ${border} !important; }
    .inv-salutation { margin: 6px 0 10px 0 !important; font-size: 13px !important; color: ${text} !important; }
    .inv-table { width: 100% !important; border-collapse: collapse !important; margin: 10px 0 !important; font-size: 12px !important; background: #ffffff !important; }
    .inv-table thead { background: ${primary} !important; }
    .inv-table th { color: #ffffff !important; padding: 8px 10px !important; text-align: center !important; font-size: 11px !important; text-transform: uppercase !important; font-weight: 700 !important; letter-spacing: 0.5px !important; }
    .inv-table th:first-child { width: 8% !important; }
    .inv-table th:nth-child(2) { width: 42% !important; text-align: left !important; }
    .inv-table th:nth-child(3) { width: 12% !important; }
    .inv-table th:nth-child(4) { width: 12% !important; }
    .inv-table th:nth-child(5) { width: 12% !important; }
    .inv-table th:last-child { width: 14% !important; }
    .inv-table td { padding: 6px 10px !important; border-bottom: 1px solid ${border} !important; text-align: center !important; }
    .inv-table td:nth-child(2) { text-align: left !important; }
    .inv-table td:last-child { font-weight: 700 !important; color: ${primary} !important; }
    .inv-table tbody tr:last-child td { border-bottom: none !important; }
    .inv-table .inv-section-header { background: ${light} !important; font-weight: 700 !important; color: ${primary} !important; }
    .inv-totals { margin: 10px 0 10px auto !important; padding: 10px 16px !important; background: ${light} !important; max-width: 320px !important; border: 2px solid ${secondary} !important; }
    .inv-total-row { display: flex !important; justify-content: space-between !important; padding: 3px 0 !important; font-size: 13px !important; }
    .inv-total-row .lbl { color: ${muted} !important; }
    .inv-total-row .val { font-weight: 600 !important; }
    .inv-grand { border-top: 2px solid ${secondary} !important; margin-top: 4px !important; padding-top: 8px !important; font-size: 18px !important; font-weight: 800 !important; }
    .inv-grand .lbl { color: ${primary} !important; }
    .inv-grand .val { color: ${primary} !important; }
    .inv-words { font-size: 11px !important; color: ${muted} !important; font-style: italic !important; border-top: 1px solid ${border} !important; margin-top: 6px !important; padding-top: 6px !important; text-align: center !important; }
    .inv-notes { padding: 8px 14px !important; border-left: 4px solid ${secondary} !important; margin: 10px 0 !important; font-size: 12px !important; color: ${muted} !important; background: #fafafa !important; border: 1px solid ${border} !important; border-left: 4px solid ${secondary} !important; }
    .inv-notes strong { color: ${primary} !important; }
    .inv-signature { margin-top: 20px !important; padding-top: 10px !important; border-top: 1px solid ${border} !important; text-align: right !important; }
    .inv-signature .sign-name { font-weight: 700 !important; font-size: 14px !important; color: ${primary} !important; }
    .inv-signature .sign-detail { font-size: 12px !important; color: ${muted} !important; }
    .inv-footer-section { flex-shrink: 0 !important; width: 100% !important; margin-top: auto !important; background: #ffffff !important; }
    .inv-footer-img { width: 100% !important; max-width: 100% !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .inv-footer-img img { width: 100% !important; height: auto !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    @media print {
      @page { margin: 0 !important; padding: 0 !important; size: A4 !important; }
      html, body {
        margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important;
        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
      }
      .inv-container { min-height: 100vh !important; width: 100% !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .inv-background { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; opacity: 0.08 !important; position: fixed !important; }
      .inv-top { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; border-bottom: 2px solid ${primary} !important; }
      .inv-table thead { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${primary} !important; }
      .inv-table th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${primary} !important; color: #ffffff !important; }
      .inv-table .inv-section-header { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${light} !important; }
      .inv-status { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .inv-totals { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${light} !important; }
      .inv-header-img img, .inv-footer-img img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .inv-footer-section { margin-top: auto !important; }
    }
    @media screen {
      .inv-container { max-width: 100% !important; margin: 0 auto !important; box-shadow: 0 4px 30px rgba(0,0,0,0.12) !important; border: 1px solid ${border} !important; }
    }
    @media screen and (max-width: 768px) {
      .inv-content-section { padding: 6px 12px 10px 12px !important; }
      .inv-top { flex-direction: column !important; gap: 8px !important; padding: 10px 12px !important; }
      .inv-right { text-align: left !important; width: 100% !important; }
      .inv-title { font-size: 20px !important; }
      .inv-totals { max-width: 100% !important; margin-left: 0 !important; padding: 10px 14px !important; }
      .inv-table { font-size: 11px !important; }
      .inv-table th, .inv-table td { padding: 4px 6px !important; }
      .inv-grand { font-size: 16px !important; }
    }
    @media screen and (max-width: 480px) {
      .inv-content-section { padding: 4px 6px 8px 6px !important; }
      .inv-table { font-size: 9px !important; }
      .inv-table th, .inv-table td { padding: 3px 4px !important; }
      .inv-totals { padding: 8px 10px !important; }
      .inv-total-row { font-size: 12px !important; }
      .inv-grand { font-size: 14px !important; }
    }
  </style>
</head>
<body>
  <div class="inv-container">
    <div class="inv-background"><img src='${background}' alt="Background" /></div>
    <div class="inv-content-wrapper">
      <div class="inv-header-section">
        <div class="inv-header-img"><img src="${letterheadHeader}" alt="Letterhead" /></div>
      </div>
      <div class="inv-content-section">
        <div class="inv-top">
          <div class="inv-bill-to">
            <h3>To,</h3>
            <div class="inv-client-name">${invoice.clientName || ''}</div>
            ${invoice.clientAddress ? `<div class="inv-client-detail">${invoice.clientAddress}</div>` : ''}
            ${invoice.clientCrn ? `<div class="inv-client-detail">CRN: ${invoice.clientCrn}</div>` : ''}
            ${invoice.siteName ? `<div class="inv-client-detail">Site: ${invoice.siteName}</div>` : ''}
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
        <div class="inv-salutation" style="margin-top: -6px !important; font-weight: 400 !important;">
          We are pleased to submit our Invoice for the below mentioned work as follows.
        </div>
        <table class="inv-table">
          <thead><tr><th>Sr. No.</th><th>Description</th><th>Quantity</th><th>Unit</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>
            ${items.length === 0 ? `
              <tr><td colspan="6" style="text-align:center;padding:15px;color:${muted};">No items</td></tr>
            ` : items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.description || ''}</td>
                <td style="text-align:right;">${item.quantity || 0}</td>
                <td>${item.unit || 'SQ.M'}</td>
                <td style="text-align:right;">${Utils.formatCurrencyShort(item.unitPrice || 0)}</td>
                <td style="text-align:right;">${Utils.formatCurrencyShort(item.total || 0)}</td>
              </tr>
            `).join('')}
            ${items.length > 0 ? `
              <tr>
                <td colspan="5" style="text-align:right;font-weight:700;padding:8px 10px;border-top:2px solid ${primary};">Total</td>
                <td style="text-align:right;font-weight:700;padding:8px 10px;border-top:2px solid ${primary};color:${primary};">${Utils.formatCurrencyShort(subtotal)}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>
        <div class="inv-totals">
          <div class="inv-total-row"><span class="lbl">Subtotal:</span><span class="val">${Utils.formatCurrencyShort(subtotal)}</span></div>
          ${invoice.invoiceType === 'vat' ? `
            <div class="inv-total-row"><span class="lbl">VAT (${invoice.vatRate || 10}%):</span><span class="val">${Utils.formatCurrencyShort(vatAmount)}</span></div>
          ` : ''}
          <div class="inv-total-row inv-grand"><span class="lbl">TOTAL:</span><span class="val">${Utils.formatCurrencyShort(total)}</span></div>
          <div class="inv-words">${Utils.convertAmountToWords(total)}</div>
        </div>
        ${invoice.notes ? `<div class="inv-notes"><strong>Note:</strong> ${invoice.notes}</div>` : ''}
        <div class="inv-signature">
          <div class="sign-name">Yours faithfully,</div>
          <div style="margin-top: 10px !important;">
            <div class="sign-name">${invoice.contactPerson || 'Riffat Afza'}</div>
            <div class="sign-detail">${invoice.cpr || 'CPR No. 570713994'}</div>
            <div class="sign-detail">Mob. ${companyPhone}</div>
          </div>
        </div>
      </div>
      <div class="inv-footer-section">
        <div class="inv-footer-img"><img src="${letterheadFooter}" alt="Footer" /></div>
      </div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>
    `;
  };

  // ============================================
  // PRINT FUNCTION
  // ============================================
  const handlePrintInvoice = (invoice) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    const printHTML = generateInvoiceHTML(invoice);
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
  };

  // ============================================
  // VIEW INVOICE MODAL
  // ============================================
  const ViewInvoiceModal = ({ invoice, onClose }) => {
    if (!invoice) return null;

    const items = invoice.items || [];
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const vatAmount = invoice.invoiceType === 'vat' ? subtotal * (parseFloat(invoice.vatRate) / 100) : 0;
    const total = subtotal + vatAmount;

    return (
      <div className="inv-modal-overlay" onClick={onClose}>
        <div className="inv-modal-content" onClick={e => e.stopPropagation()}>
          <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #1a2332, #2a3a4a)' }}>
            <div className="inv-modal-header-left">
              <FileText size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Invoice Preview</h3>
            </div>
            <div className="inv-modal-actions">
              <button className="inv-modal-btn-print" onClick={() => handlePrintInvoice(invoice)}>
                <Printer size={16} /> Print
              </button>
              <button className="inv-modal-close" onClick={onClose}>
                <X size={24} color="#ffffff" />
              </button>
            </div>
          </div>
          <div className="inv-modal-body" style={{ padding: '0', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ background: '#ffffff', padding: '0', color: '#1a1a2e', fontFamily: 'Times New Roman, Arial, serif' }}>
              <img src={letterheadHeader} alt="Letterhead Header" style={{ width: '100%', height: 'auto', display: 'block' }} />
              <div style={{ padding: '0 30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0', padding: '10px 14px', borderBottom: '2px solid #1a3c6e' }}>
                  <div>
                    <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#1a3c6e', margin: '0 0 4px 0', textTransform: 'uppercase' }}>To,</h3>
                    <p style={{ fontWeight: '700', fontSize: '15px', margin: '0 0 3px 0', color: '#1a3c6e' }}>{invoice.clientName}</p>
                    {invoice.clientAddress && <p style={{ fontSize: '12px', color: '#6a6a8a', margin: '1px 0' }}>{invoice.clientAddress}</p>}
                    {invoice.clientCrn && <p style={{ fontSize: '12px', color: '#6a6a8a', margin: '1px 0' }}>CRN: {invoice.clientCrn}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1a3c6e' }}>INVOICE</div>
                    <div style={{ fontSize: '14px', color: '#6a6a8a' }}>#{invoice.invoiceNumber}</div>
                    <div style={{ fontSize: '12px', color: '#6a6a8a' }}><strong style={{ color: '#1a3c6e' }}>Date:</strong> {Utils.formatDate(invoice.invoiceDate)}</div>
                    <div style={{ fontSize: '12px', color: '#6a6a8a' }}><strong style={{ color: '#1a3c6e' }}>Due:</strong> {Utils.formatDate(invoice.dueDate)}</div>
                    <div style={{ marginTop: '4px' }}>{getStatusBadge(invoice.status)}</div>
                  </div>
                </div>
                {invoice.subject && <div style={{ margin: '8px 0 10px 0', padding: '6px 0', fontSize: '13px', fontWeight: '600', color: '#1a3c6e', borderBottom: '1px solid #d4d9e0' }}>Subject: {invoice.subject}</div>}
                <div style={{ margin: '6px 0 10px 0', fontSize: '13px', color: '#1a1a2e' }}>Dear Sir,</div>
                <div style={{ margin: '-6px 0 10px 0', fontSize: '13px', color: '#1a1a2e' }}>We are pleased to submit our Invoice for the below mentioned work as follows.</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#1a3c6e', color: '#ffffff' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '8%' }}>Sr. No.</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', width: '42%' }}>Description</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '12%' }}>Quantity</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '12%' }}>Unit</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '12%' }}>Rate</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '14%' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '15px', color: '#6a6a8a' }}>No items</td></tr>
                    ) : items.map((item, index) => (
                      <tr key={item.id || index} style={{ borderBottom: '1px solid #d4d9e0' }}>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left' }}>{item.description}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>{item.unit || 'SQ.M'}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{Utils.formatCurrencyShort(item.unitPrice)}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: '#1a3c6e' }}>{Utils.formatCurrencyShort(item.total)}</td>
                      </tr>
                    ))}
                    {items.length > 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'right', fontWeight: '700', padding: '8px 10px', borderTop: '2px solid #1a3c6e' }}>Total</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', padding: '8px 10px', borderTop: '2px solid #1a3c6e', color: '#1a3c6e' }}>{Utils.formatCurrencyShort(subtotal)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div style={{ margin: '10px 0 10px auto', padding: '10px 16px', background: '#e8edf3', maxWidth: '320px', border: '2px solid #c9a84c' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '13px' }}>
                    <span style={{ color: '#6a6a8a' }}>Subtotal:</span>
                    <span style={{ fontWeight: '600' }}>{Utils.formatCurrencyShort(subtotal)}</span>
                  </div>
                  {invoice.invoiceType === 'vat' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '13px' }}>
                      <span style={{ color: '#6a6a8a' }}>VAT ({invoice.vatRate}%):</span>
                      <span style={{ fontWeight: '600' }}>{Utils.formatCurrencyShort(vatAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '18px', fontWeight: '700', borderTop: '2px solid #c9a84c', marginTop: '4px', paddingTop: '8px' }}>
                    <span style={{ color: '#1a3c6e' }}>TOTAL:</span>
                    <span style={{ color: '#1a3c6e' }}>{Utils.formatCurrencyShort(total)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6a6a8a', fontStyle: 'italic', borderTop: '1px solid #d4d9e0', marginTop: '6px', paddingTop: '6px', textAlign: 'center' }}>
                    {Utils.convertAmountToWords(total)}
                  </div>
                </div>
                {invoice.notes && (
                  <div style={{ padding: '8px 14px', border: '1px solid #d4d9e0', borderLeft: '4px solid #c9a84c', margin: '10px 0', fontSize: '12px', color: '#6a6a8a', background: '#fafafa' }}>
                    <strong style={{ color: '#1a3c6e' }}>Note:</strong> {invoice.notes}
                  </div>
                )}
                <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #d4d9e0', textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a3c6e' }}>Yours faithfully,</div>
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a3c6e' }}>{invoice.contactPerson || 'Riffat Afza'}</div>
                    <div style={{ fontSize: '12px', color: '#6a6a8a' }}>{invoice.cpr || 'CPR No. 570713994'}</div>
                    <div style={{ fontSize: '12px', color: '#6a6a8a' }}>Mob. {data.companyPhone || '+973 37099957'}</div>
                  </div>
                </div>
              </div>
              <img src={letterheadFooter} alt="Letterhead Footer" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
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
      <div className="inv-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
        <div className="inv-modal-content inv-form-modal" onClick={e => e.stopPropagation()}>
          <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="inv-modal-header-left">
              {editingId ? <Edit size={24} color="#ffffff" /> : <Plus size={24} color="#ffffff" />}
              <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Invoice' : 'New Invoice'}</h3>
            </div>
            <button className="inv-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="inv-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label><FileText size={14} /> Invoice No</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    disabled
                    className="inv-form-input inv-disabled"
                  />
                  <small className="inv-hint">Auto-generated</small>
                </div>
                <div className="inv-form-group">
                  <label><User size={14} /> Client Name <span className="inv-required">*</span></label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Client name"
                    required
                    className="inv-form-input"
                  />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label><Building2 size={14} /> Site</label>
                  <select
                    value={formData.siteId}
                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                    className="inv-form-select"
                  >
                    <option value="">Select Site</option>
                    {data.sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div className="inv-form-group">
                  <label><Shield size={14} /> Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="inv-form-select"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label><Calendar size={14} /> Invoice Date</label>
                  <input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="inv-form-input"
                  />
                </div>
                <div className="inv-form-group">
                  <label><Calendar size={14} /> Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="inv-form-input"
                  />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label><FileText size={14} /> Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Subject of invoice"
                    className="inv-form-input"
                  />
                </div>
                <div className="inv-form-group">
                  <label><User size={14} /> Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Contact person name"
                    className="inv-form-input"
                  />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label><CreditCard size={14} /> CPR No.</label>
                  <input
                    type="text"
                    value={formData.cpr}
                    onChange={e => setFormData({ ...formData, cpr: e.target.value })}
                    placeholder="CPR Number"
                    className="inv-form-input"
                  />
                </div>
                <div className="inv-form-group">
                  <label><MapPin size={14} /> Client Address</label>
                  <input
                    type="text"
                    value={formData.clientAddress}
                    onChange={e => setFormData({ ...formData, clientAddress: e.target.value })}
                    placeholder="Client address"
                    className="inv-form-input"
                  />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-form-group">
                  <label><CreditCard size={14} /> Client CRN</label>
                  <input
                    type="text"
                    value={formData.clientCrn}
                    onChange={e => setFormData({ ...formData, clientCrn: e.target.value })}
                    placeholder="Commercial Registration Number"
                    className="inv-form-input"
                  />
                </div>
                <div className="inv-form-group">
                  <label><Receipt size={14} /> Invoice Type</label>
                  <select
                    value={formData.invoiceType}
                    onChange={e => setFormData({ ...formData, invoiceType: e.target.value, vatRate: e.target.value === 'simple' ? 0 : formData.vatRate || 10 })}
                    className="inv-form-select"
                  >
                    <option value="simple">Simple (No VAT)</option>
                    <option value="vat">With VAT</option>
                  </select>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="inv-items-section">
                <h4><Receipt size={16} /> Invoice Items</h4>
                <div className="inv-item-form">
                  <div className="inv-form-row" style={{ gridTemplateColumns: '2fr 0.8fr 0.8fr 1fr auto' }}>
                    <div className="inv-form-group" style={{ position: 'relative' }}>
                      <label>Item Description</label>
                      <div className="inv-item-search">
                        <input
                          type="text"
                          value={itemForm.description}
                          onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                          placeholder="Search or type item..."
                          onFocus={() => setShowItemSearch(true)}
                          className="inv-form-input"
                        />
                        <button
                          type="button"
                          className="inv-btn-search"
                          onClick={() => setShowItemSearch(!showItemSearch)}
                        >
                          <Search size={16} />
                        </button>
                      </div>
                      {showItemSearch && (
                        <div className="inv-item-dropdown">
                          <input
                            type="text"
                            value={itemSearchTerm}
                            onChange={e => setItemSearchTerm(e.target.value)}
                            placeholder="Search items..."
                            autoFocus
                            className="inv-dropdown-search"
                          />
                          {filteredItems.length === 0 ? (
                            <div className="inv-dropdown-empty">No items found</div>
                          ) : (
                            filteredItems.map(item => (
                              <div
                                key={item.id}
                                className="inv-dropdown-item"
                                onClick={() => handleItemSelect(item)}
                              >
                                <div>
                                  <div className="inv-dropdown-name">{item.name}</div>
                                  <div className="inv-dropdown-meta">{item.category} • {item.unit}</div>
                                </div>
                                <div className="inv-dropdown-price">{Utils.formatCurrency(item.unitPrice)}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <div className="inv-form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        value={itemForm.quantity}
                        onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })}
                        placeholder="Qty"
                        className="inv-form-input"
                      />
                    </div>
                    <div className="inv-form-group">
                      <label>Unit</label>
                      <select
                        value={itemForm.unit}
                        onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                        className="inv-form-select"
                      >
                        {commonUnits.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                    <div className="inv-form-group">
                      <label>Unit Price</label>
                      <input
                        type="number"
                        step="0.001"
                        value={itemForm.unitPrice}
                        onChange={e => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                        placeholder="Price"
                        className="inv-form-input inv-price"
                      />
                    </div>
                    <button type="button" className="inv-btn-add-item" onClick={handleItemAdd}>
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>

                <div className="inv-items-list">
                  {formData.items.map((item) => (
                    <div key={item.id} className="inv-item-row">
                      <span className="inv-item-desc">{item.description}</span>
                      <span className="inv-item-qty">{item.quantity} × {item.unit}</span>
                      <span className="inv-item-price">{Utils.formatCurrencyShort(item.unitPrice)}</span>
                      <span className="inv-item-total">{Utils.formatCurrency(item.total)}</span>
                      <button className="inv-btn-remove" onClick={() => handleItemRemove(item.id)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {formData.items.length === 0 && (
                    <div className="inv-empty-items">No items added</div>
                  )}
                </div>
              </div>

              {/* Totals */}
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
                  <span><strong>Total:</strong></span>
                  <span><strong>{Utils.formatCurrency(calculateTotals.total)}</strong></span>
                </div>
                <div className="inv-amount-words">
                  {Utils.convertAmountToWords(calculateTotals.total)}
                </div>
              </div>

              <div className="inv-form-group">
                <label><FileText size={14} /> Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Invoice notes (will appear on invoice)"
                  rows="2"
                  className="inv-form-textarea"
                />
              </div>

              <div className="inv-form-actions">
                <button type="submit" className="inv-btn-primary" disabled={loading}>
                  <Save size={16} /> {editingId ? 'Update Invoice' : 'Create Invoice'}
                </button>
                <button type="button" className="inv-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
  // RENDER DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm) return null;
    return (
      <div className="inv-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
        <div className="inv-modal-content inv-delete-modal" onClick={e => e.stopPropagation()}>
          <div className="inv-modal-header" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
            <div className="inv-modal-header-left">
              <Trash2 size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Delete Invoice</h3>
            </div>
            <button className="inv-modal-close" onClick={() => setShowDeleteConfirm(null)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="inv-modal-body">
            <div className="inv-delete-content">
              <AlertCircle size={48} color="#dc2626" />
              <p>Are you sure you want to delete this invoice?</p>
              <p className="inv-delete-subtext">This action cannot be undone.</p>
              <div className="inv-delete-actions">
                <button className="inv-btn-danger" onClick={() => {
                  deleteInvoice(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}>
                  <Trash2 size={16} /> Delete
                </button>
                <button className="inv-btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="inv-container-modern">
      {/* Header */}
      <div className="inv-header">
        <div className="inv-header-left">
          <div className="inv-header-icon-wrapper">
            <FileText size={28} />
            <span className="inv-header-badge">Invoices</span>
          </div>
          <div>
            <h2>Invoice Management</h2>
            <p className="inv-header-subtitle">Create and manage professional invoices</p>
          </div>
        </div>
        <div className="inv-header-right">
          <button className="inv-btn-refresh" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="inv-btn-primary" onClick={openAddModal}>
            <Plus size={18} /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="inv-stats-grid">
        <div
          className="inv-stat-card"
          onMouseEnter={(e) => handleCardHover('total', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="inv-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <FileText size={22} />
          </div>
          <div className="inv-stat-content">
            <span className="inv-stat-label">Total Invoices</span>
            <span className="inv-stat-value">{totalInvoices}</span>
          </div>
          <div className="inv-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="inv-stat-card"
          onMouseEnter={(e) => handleCardHover('paid', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="inv-stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <CheckCircle size={22} />
          </div>
          <div className="inv-stat-content">
            <span className="inv-stat-label">Paid</span>
            <span className="inv-stat-value">{paidInvoices}</span>
          </div>
          <div className="inv-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="inv-stat-card"
          onMouseEnter={(e) => handleCardHover('overdue', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="inv-stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <AlertCircle size={22} />
          </div>
          <div className="inv-stat-content">
            <span className="inv-stat-label">Overdue</span>
            <span className="inv-stat-value">{overdueInvoices}</span>
          </div>
          <div className="inv-stat-trend">
            <TrendingDown size={16} />
          </div>
        </div>

        <div
          className="inv-stat-card"
          onMouseEnter={(e) => handleCardHover('amount', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="inv-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <DollarSign size={22} />
          </div>
          <div className="inv-stat-content">
            <span className="inv-stat-label">Total Amount</span>
            <span className="inv-stat-value">{Utils.formatCurrencyShort(totalAmount)}</span>
          </div>
          <div className="inv-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div
          className="inv-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="inv-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="inv-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="inv-tooltip-row">
                <span className="inv-tooltip-label">{detail.label}</span>
                <span className="inv-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="inv-filters">
        <div className="inv-search-box">
          <Search size={18} className="inv-search-icon" />
          <input
            type="text"
            value={invoiceSearchTerm}
            onChange={e => setInvoiceSearchTerm(e.target.value)}
            placeholder="Search by invoice # or client..."
            className="inv-search-input"
          />
        </div>
        <select
          value={invoiceStatusFilter}
          onChange={e => setInvoiceStatusFilter(e.target.value)}
          className="inv-filter-select"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <input
          type="date"
          value={invoiceDateFrom}
          onChange={e => setInvoiceDateFrom(e.target.value)}
          className="inv-filter-date"
          placeholder="From"
        />
        <span className="inv-filter-to">to</span>
        <input
          type="date"
          value={invoiceDateTo}
          onChange={e => setInvoiceDateTo(e.target.value)}
          className="inv-filter-date"
          placeholder="To"
        />
        <button className="inv-btn-clear" onClick={() => {
          setInvoiceSearchTerm('');
          setInvoiceStatusFilter('all');
          setInvoiceDateFrom('');
          setInvoiceDateTo('');
        }}>
          <X size={14} /> Clear
        </button>
      </div>

      {/* Invoice Cards */}
      <div className="inv-cards-grid">
        {paginatedInvoices.map(invoice => (
          <div key={invoice.id} className="inv-card">
            <div className="inv-card-header">
              <div className="inv-card-number">{invoice.invoiceNumber || 'Draft'}</div>
              {getStatusBadge(invoice.status)}
            </div>
            <div className="inv-card-body">
              <div className="inv-card-client">{invoice.clientName}</div>
              <div className="inv-card-amount">{Utils.formatCurrency(invoice.totalAmount || invoice.subtotal || 0)}</div>
              <div className="inv-card-date">{Utils.formatDate(invoice.invoiceDate)}</div>
              <div className="inv-card-items">{invoice.items?.length || 0} items</div>
            </div>
            <div className="inv-card-actions">
              <button className="inv-btn-action inv-btn-view" onClick={() => setViewingInvoice(invoice)}>
                <Eye size={14} /> View
              </button>
              <button className="inv-btn-action inv-btn-print" onClick={() => handlePrintInvoice(invoice)}>
                <Printer size={14} /> Print
              </button>
              <button className="inv-btn-action inv-btn-edit" onClick={() => openEditModal(invoice)}>
                <Edit size={14} /> Edit
              </button>
              <button className="inv-btn-action inv-btn-delete" onClick={() => setShowDeleteConfirm(invoice.id)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}

        {filteredInvoices.length === 0 && (
          <div className="inv-empty-state">
            <FileText size={64} />
            <h3>No Invoices Found</h3>
            <p>Try adjusting your search filters or create a new invoice.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredInvoices.length > 0 && (
        <div className="inv-pagination">
          <div className="inv-pagination-info">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
          </div>
          <div className="inv-pagination-controls">
            <div className="inv-pagination-items">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="inv-pagination-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="inv-pagination-buttons">
              <button className="inv-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                <ChevronsLeft size={16} />
              </button>
              <button className="inv-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers().map(page => (
                <button
                  key={page}
                  className={`inv-page-btn ${page === currentPage ? 'active' : ''}`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
              <button className="inv-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                <ChevronRight size={16} />
              </button>
              <button className="inv-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && renderFormModal()}
      {viewingInvoice && (
        <ViewInvoiceModal
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
        />
      )}
      {renderDeleteConfirm()}
    </div>
  );
};

export default InvoicesManagerComponent;