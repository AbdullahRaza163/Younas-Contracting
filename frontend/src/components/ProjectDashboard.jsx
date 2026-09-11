// src/components/ProjectDashboard.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Building2,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  RefreshCw,
  Printer,
  Download,
  Activity,
  Briefcase,
  Phone,
  Mail,
  User,
  FolderKanban,
  Wallet,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Filter,
  Info,
  Gauge,
  Target,
  Award,
  Zap,
  Timer,
  Layers,
  Circle,
  CircleDot,
  PlayCircle,
  PauseCircle,
  BarChart3,
  PieChart,
  Clock10,
  ListChecks,
  BadgeCheck,
  BadgeInfo,
  BadgeAlert,
  BadgeX,
  Sparkle,
  Bolt,
  GanttChart,
  SquareKanban,
  ClipboardList,
  Boxes,
  LayoutGrid,
  LayoutList,
  PanelTop,
  PanelLeft,
  PanelRight,
  PanelBottom,
  LayoutTemplate,
  Table2,
  SquareStack,
  Layers2,
  Layers3,
  Package,
  Package2,
  PackageCheck,
  PackageX,
  PackageOpen,
  Box,
  BoxSelect,
  Blocks,
  Folders,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderDot,
  FolderArchive,
  FolderClock,
  FolderSearch,
  FolderSync,
  FolderTree,
  FolderInput,
  FolderOutput,
  FolderUp,
  FolderDown,
  FolderCog,
  FolderLock,
  FolderKey,
  FolderMinus,
  FolderX,
  FolderGit,
  FolderGit2,
  FolderCheck,
  FolderHeart,
  FolderStar,
  FolderCode,
  FolderSymlink,
  FolderFile,
  FolderShare,
  Clipboard,
  ClipboardCheck,
  ClipboardCopy,
  ClipboardMinus,
  ClipboardPaste,
  ClipboardX,
  ClipboardEdit,
  ClipboardType,
  ClipboardPen,
  ClipboardSignature,
  FileBox,
  FileClock,
  FileCode,
  FileCog,
  FileDiff,
  FileDigit,
  FileDown,
  FileHeart,
  FileImage,
  FileInput,
  FileJson,
  FileKey,
  FileLock,
  FileMinus,
  FileOutput,
  FilePen,
  FilePlus,
  FileQuestion,
  FileScan,
  FileSearch,
  FileSignature,
  FileSpreadsheet,
  FileSymlink,
  FileTerminal,
  FileType,
  FileUp,
  FileUser,
  FileVideo,
  FileVolume,
  FileWarning,
  FileX,
  FileBadge,
  FileChartColumn,
  FileChartLine,
  FileChartPie,
  FileCheck2,
  XCircle,
  CircleAlert as AlertCircleIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Utils from '../utils/Utils';

import './ProjectDashboard.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

const ProjectDashboard = ({ data, refreshData }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isOpening, setIsOpening] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client: '',
    clientContact: '',
    clientPhone: '',
    clientEmail: '',
    siteId: '',
    budget: '',
    startDate: '',
    endDate: '',
    status: 'planning',
    priority: 'medium',
    projectManager: '',
    teamLead: '',
    notes: '',
    riskLevel: 'low'
  });

  // Load projects
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to load projects');
      const result = await response.json();
      setProjects(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.code?.toLowerCase().includes(search) ||
        (p.client && p.client.toLowerCase().includes(search))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(p => p.priority === priorityFilter);
    }
    
    return filtered;
  }, [projects, searchTerm, statusFilter, priorityFilter]);

  // Project statistics
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active' || p.status === 'planning').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const cancelled = projects.filter(p => p.status === 'cancelled').length;
    const onHold = projects.filter(p => p.status === 'on_hold').length;
    const overdue = projects.filter(p => p.status !== 'completed' && p.endDate && p.endDate < Utils.today()).length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalActual = projects.reduce((sum, p) => sum + (p.actualCost || 0), 0);
    const totalRevenue = projects.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const totalProfit = projects.reduce((sum, p) => sum + ((p.revenue || 0) - (p.actualCost || 0)), 0);
    const avgProgress = projects.length > 0 ? projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length : 0;
    
    return { 
      total, 
      active, 
      completed, 
      cancelled,
      onHold,
      overdue, 
      totalBudget, 
      totalActual, 
      totalRevenue,
      totalProfit,
      avgProgress,
      isProfit: totalProfit >= 0
    };
  }, [projects]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId 
        ? `${API_BASE_URL}/projects/${editingId}`
        : `${API_BASE_URL}/projects`;
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
        throw new Error(errorData.error || 'Failed to save project');
      }

      const result = await response.json();
      setSuccess(editingId ? 'Project updated successfully!' : 'Project created successfully!');
      await loadProjects();
      resetForm();
      setShowForm(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      client: '',
      clientContact: '',
      clientPhone: '',
      clientEmail: '',
      siteId: '',
      budget: '',
      startDate: '',
      endDate: '',
      status: 'planning',
      priority: 'medium',
      projectManager: '',
      teamLead: '',
      notes: '',
      riskLevel: 'low'
    });
    setEditingId(null);
  };

  // Handle edit
  const handleEdit = (project) => {
    setEditingId(project.id);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      client: project.client || '',
      clientContact: project.clientContact || '',
      clientPhone: project.clientPhone || '',
      clientEmail: project.clientEmail || '',
      siteId: project.siteId || '',
      budget: project.budget || '',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      projectManager: project.projectManager || '',
      teamLead: project.teamLead || '',
      notes: project.notes || '',
      riskLevel: project.riskLevel || 'low'
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to delete project');
      
      setSuccess('Project deleted successfully!');
      await loadProjects();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle expand
  const toggleExpand = (id) => {
    setExpandedProjects(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Handle hover for tooltips
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

  // Get status config
  const getStatusConfig = (status) => {
    const configs = {
      planning: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', label: 'Planning', icon: Clock },
      active: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', label: 'Active', icon: PlayCircle },
      on_hold: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', label: 'On Hold', icon: PauseCircle },
      completed: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', label: 'Completed', icon: CheckCircle },
      cancelled: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', label: 'Cancelled', icon: XCircle }
    };
    return configs[status] || configs.planning;
  };

  // Get priority config
  const getPriorityConfig = (priority) => {
    const configs = {
      low: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', label: 'Low' },
      medium: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', label: 'Medium' },
      high: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', label: 'High' },
      critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', label: 'Critical' }
    };
    return configs[priority] || configs.medium;
  };

  // Get health config
  const getHealthConfig = (health) => {
    const configs = {
      on_track: { color: '#22c55e', icon: CheckCircle, label: 'On Track' },
      at_risk: { color: '#f59e0b', icon: AlertCircle, label: 'At Risk' },
      behind: { color: '#f97316', icon: Circle, label: 'Behind' },
      critical: { color: '#ef4444', icon: XCircle, label: 'Critical' },
      overdue: { color: '#ef4444', icon: AlertCircle, label: 'Overdue' },
      completed: { color: '#3b82f6', icon: CheckCircle, label: 'Completed' }
    };
    return configs[health] || configs.on_track;
  };

  // Get card gradient based on status
  const getCardGradient = (status) => {
    const gradients = {
      planning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      active: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      on_hold: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      completed: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      cancelled: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    };
    return gradients[status] || gradients.planning;
  };

  // Export dashboard report (Excel)
  const exportDashboardReport = () => {
    const wb = XLSX.utils.book_new();
    
    const summaryData = [
      [`${CONFIG.COMPANY_NAME || 'Haji Younas Contracting'} - PROJECT DASHBOARD REPORT`],
      ['Generated:', new Date().toLocaleString()],
      ['Total Projects:', stats.total],
      ['Active Projects:', stats.active],
      ['Completed Projects:', stats.completed],
      ['On Hold Projects:', stats.onHold],
      ['Cancelled Projects:', stats.cancelled],
      ['Overdue Projects:', stats.overdue],
      [],
      ['=== FINANCIAL SUMMARY ==='],
      ['Metric', 'Amount (BD)'],
      ['Total Budget', stats.totalBudget],
      ['Total Actual Cost', stats.totalActual],
      ['Total Revenue', stats.totalRevenue],
      ['Total Profit', stats.totalProfit],
      ['Average Progress', `${stats.avgProgress.toFixed(1)}%`],
      []
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const projectData = projects.map(p => ({
      'Code': p.code || `PRJ-${String(p.id).padStart(4, '0')}`,
      'Name': p.name,
      'Client': p.client || 'N/A',
      'Status': getStatusConfig(p.status).label,
      'Priority': getPriorityConfig(p.priority).label,
      'Budget': p.budget || 0,
      'Actual Cost': p.actualCost || 0,
      'Revenue': p.revenue || 0,
      'Profit': (p.revenue || 0) - (p.actualCost || 0),
      'Progress': `${(p.progress || 0).toFixed(1)}%`,
      'Start Date': p.startDate || 'N/A',
      'End Date': p.endDate || 'N/A',
      'Project Manager': p.projectManager || 'N/A',
      'Team Lead': p.teamLead || 'N/A',
      'Risk Level': p.riskLevel || 'N/A'
    }));
    const wsProjects = XLSX.utils.json_to_sheet(projectData);
    XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects');

    XLSX.writeFile(wb, `project_dashboard_report_${Utils.today()}.xlsx`);
  };

  // ============================================
  // GENERATE REPORT HTML - A4 Professional Format
  // ============================================
  const generateReportHTML = () => {
    const companyName = data?.companyName || CONFIG.COMPANY_NAME || 'Haji Younas Contracting';
    const companyAddress = data?.companyAddress || 'Flat/Shop 21, Bldg A0365, Road 55, Block 210, Muharraq';
    const companyPhone = data?.companyPhone || '+973 37099957';
    const companyEmail = data?.companyEmail || 'hajiyounas.contracting@gmail.com';
    const companyCr = data?.companyCr || '141997-1';

    const primary = '#1a3c6e';
    const secondary = '#c9a84c';
    const light = '#e8edf3';
    const muted = '#6a6a8a';
    const border = '#d4d9e0';
    const text = '#1a1a2e';

    const statusLabels = {
      planning: '📋 Planning',
      active: '🔄 Active',
      on_hold: '⏸️ On Hold',
      completed: '✅ Completed',
      cancelled: '❌ Cancelled'
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Project Dashboard Report</title>
  <style>
    * {
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      box-sizing: border-box !important;
    }
    
    html, body {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      font-family: 'Times New Roman', Arial, serif !important;
      color: ${text} !important;
    }
    
    .report-container {
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
    
    .report-background {
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
      opacity: 0.06 !important;
    }
    
    .report-background img {
      width: 70% !important;
      max-width: 600px !important;
      height: auto !important;
      display: block !important;
    }
    
    .report-content-wrapper {
      position: relative !important;
      z-index: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 100vh !important;
      width: 100% !important;
    }
    
    .report-header-section {
      flex-shrink: 0 !important;
      width: 100% !important;
      background: #ffffff !important;
    }
    
    .report-header-img {
      width: 100% !important;
      max-width: 100% !important;
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .report-header-img img {
      width: 100% !important;
      height: auto !important;
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .report-content {
      flex: 1 !important;
      width: 100% !important;
      padding: 20px 40px 30px 40px !important;
      background: transparent !important;
    }
    
    .report-title {
      text-align: center !important;
      font-size: 20px !important;
      font-weight: 800 !important;
      color: ${primary} !important;
      letter-spacing: 2px !important;
      margin: 0 0 10px 0 !important;
      padding: 10px 0 !important;
      border-bottom: 3px solid ${secondary} !important;
      text-transform: uppercase !important;
    }
    
    .report-period {
      text-align: center !important;
      font-size: 14px !important;
      color: ${muted} !important;
      margin: 0 0 16px 0 !important;
      font-weight: 500 !important;
    }
    
    .report-section {
      margin: 16px 0 !important;
    }
    
    .report-section-title {
      font-size: 14px !important;
      font-weight: 700 !important;
      color: ${primary} !important;
      margin: 0 0 10px 0 !important;
      padding: 6px 12px !important;
      background: ${light} !important;
      border-left: 4px solid ${secondary} !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    
    .stats-grid {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 12px !important;
      margin: 0 0 16px 0 !important;
    }
    
    .stat-box {
      padding: 12px 16px !important;
      border: 1px solid ${border} !important;
      border-radius: 4px !important;
      background: #fafafa !important;
    }
    
    .stat-box .label {
      font-size: 10px !important;
      color: ${muted} !important;
      text-transform: uppercase !important;
      font-weight: 600 !important;
      letter-spacing: 0.3px !important;
    }
    
    .stat-box .value {
      font-size: 18px !important;
      font-weight: 700 !important;
      color: ${primary} !important;
      margin-top: 4px !important;
    }
    
    .stat-box .value.positive {
      color: #009846 !important;
    }
    
    .stat-box .value.negative {
      color: #dc2626 !important;
    }
    
    .report-table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 10px 0 !important;
      font-size: 11px !important;
    }
    
    .report-table thead {
      background: ${primary} !important;
    }
    
    .report-table th {
      color: #ffffff !important;
      padding: 6px 8px !important;
      text-align: center !important;
      font-size: 9px !important;
      text-transform: uppercase !important;
      font-weight: 700 !important;
      letter-spacing: 0.5px !important;
      white-space: nowrap !important;
    }
    
    .report-table td {
      padding: 5px 8px !important;
      border-bottom: 1px solid ${border} !important;
      text-align: center !important;
      font-size: 10px !important;
    }
    
    .report-table td:first-child {
      text-align: left !important;
      font-weight: 600 !important;
    }
    
    .report-table .positive {
      color: #009846 !important;
    }
    
    .report-table .negative {
      color: #dc2626 !important;
    }
    
    .report-summary {
      margin: 16px 0 !important;
      padding: 12px 20px !important;
      background: ${light} !important;
      border: 2px solid ${secondary} !important;
      display: grid !important;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 8px !important;
    }
    
    .report-summary .row {
      display: flex !important;
      justify-content: space-between !important;
      padding: 4px 0 !important;
      font-size: 13px !important;
    }
    
    .report-summary .row .lbl {
      color: ${muted} !important;
    }
    
    .report-summary .row .val {
      font-weight: 600 !important;
    }
    
    .report-summary .grand-total {
      border-top: 2px solid ${secondary} !important;
      padding-top: 8px !important;
      margin-top: 4px !important;
      grid-column: 1 / -1 !important;
    }
    
    .report-summary .grand-total .lbl {
      font-size: 16px !important;
      font-weight: 700 !important;
      color: ${primary} !important;
    }
    
    .report-summary .grand-total .val {
      font-size: 18px !important;
      font-weight: 800 !important;
      color: ${primary} !important;
    }
    
    .report-footer-section {
      flex-shrink: 0 !important;
      width: 100% !important;
      margin-top: auto !important;
      background: #ffffff !important;
    }
    
    .report-footer-img {
      width: 100% !important;
      max-width: 100% !important;
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .report-footer-img img {
      width: 100% !important;
      height: auto !important;
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .badge-status {
      display: inline-block !important;
      padding: 2px 10px !important;
      border-radius: 12px !important;
      font-size: 9px !important;
      font-weight: 600 !important;
    }
    
    .badge-planning { background: rgba(245, 158, 11, 0.15) !important; color: #d97706 !important; }
    .badge-active { background: rgba(34, 197, 94, 0.15) !important; color: #16a34a !important; }
    .badge-on_hold { background: rgba(139, 92, 246, 0.15) !important; color: #7c3aed !important; }
    .badge-completed { background: rgba(59, 130, 246, 0.15) !important; color: #2563eb !important; }
    .badge-cancelled { background: rgba(239, 68, 68, 0.15) !important; color: #dc2626 !important; }
    
    @media print {
      @page {
        margin: 0 !important;
        padding: 0 !important;
        size: A4 landscape !important;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .report-container {
        min-height: 100vh !important;
        width: 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .report-background {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        position: fixed !important;
      }
      
      .stat-box {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .report-table thead {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: ${primary} !important;
      }
      
      .report-table th {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: ${primary} !important;
      }
      
      .report-summary {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    
    @media screen {
      .report-container {
        max-width: 100% !important;
        margin: 0 auto !important;
        box-shadow: 0 4px 30px rgba(0,0,0,0.12) !important;
        border: 1px solid ${border} !important;
      }
    }
    
    @media screen and (max-width: 768px) {
      .report-content {
        padding: 12px 16px !important;
      }
      
      .stats-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      
      .report-summary {
        grid-template-columns: 1fr !important;
      }
      
      .report-table {
        font-size: 9px !important;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-background">
      <img src='${background}' alt="Background" />
    </div>

    <div class="report-content-wrapper">
      <div class="report-header-section">
        <div class="report-header-img">
          <img src="${letterheadHeader}" alt="Letterhead" />
        </div>
      </div>

      <div class="report-content">
        <div class="report-title">Project Dashboard Report</div>
        <div class="report-period">
          Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Projects: ${stats.total}
          ${statusFilter !== 'all' ? `&nbsp;|&nbsp; Filter: ${getStatusConfig(statusFilter).label}` : ''}
        </div>

        <div class="report-section">
          <div class="report-section-title">Project Summary</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="label">Total Projects</div>
              <div class="value">${stats.total}</div>
            </div>
            <div class="stat-box">
              <div class="label">Active</div>
              <div class="value">${stats.active}</div>
            </div>
            <div class="stat-box">
              <div class="label">Completed</div>
              <div class="value">${stats.completed}</div>
            </div>
            <div class="stat-box">
              <div class="label">Overdue</div>
              <div class="value ${stats.overdue > 0 ? 'negative' : ''}">${stats.overdue}</div>
            </div>
          </div>
        </div>

        <div class="report-section">
          <div class="report-section-title">Financial Summary</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="label">Total Budget</div>
              <div class="value">${Utils.formatCurrency(stats.totalBudget)}</div>
            </div>
            <div class="stat-box">
              <div class="label">Total Actual Cost</div>
              <div class="value">${Utils.formatCurrency(stats.totalActual)}</div>
            </div>
            <div class="stat-box">
              <div class="label">Total Revenue</div>
              <div class="value positive">${Utils.formatCurrency(stats.totalRevenue)}</div>
            </div>
            <div class="stat-box">
              <div class="label">Total Profit</div>
              <div class="value ${stats.isProfit ? 'positive' : 'negative'}">${Utils.formatCurrency(stats.totalProfit)}</div>
            </div>
          </div>
        </div>

        <div class="report-section">
          <div class="report-section-title">Project Status Distribution</div>
          <div class="report-summary">
            <div class="row">
              <span class="lbl">📋 Planning</span>
              <span class="val">${projects.filter(p => p.status === 'planning').length}</span>
            </div>
            <div class="row">
              <span class="lbl">🔄 Active</span>
              <span class="val">${projects.filter(p => p.status === 'active').length}</span>
            </div>
            <div class="row">
              <span class="lbl">⏸️ On Hold</span>
              <span class="val">${projects.filter(p => p.status === 'on_hold').length}</span>
            </div>
            <div class="row">
              <span class="lbl">✅ Completed</span>
              <span class="val">${projects.filter(p => p.status === 'completed').length}</span>
            </div>
            <div class="row">
              <span class="lbl">❌ Cancelled</span>
              <span class="val">${projects.filter(p => p.status === 'cancelled').length}</span>
            </div>
            <div class="row grand-total">
              <span class="lbl">Average Progress</span>
              <span class="val">${stats.avgProgress.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        ${filteredProjects.length > 0 ? `
          <div class="report-section">
            <div class="report-section-title">Project List</div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Budget</th>
                  <th>Profit</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                ${filteredProjects.slice(0, 20).map((project, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${project.code || `PRJ-${String(project.id).padStart(4, '0')}`}</td>
                    <td>${project.name}</td>
                    <td>${project.client || 'N/A'}</td>
                    <td><span class="badge-status badge-${project.status}">${statusLabels[project.status] || project.status}</span></td>
                    <td>${getPriorityConfig(project.priority).label}</td>
                    <td>${Utils.formatCurrencyShort(project.budget || 0)}</td>
                    <td class="${(project.revenue || 0) - (project.actualCost || 0) >= 0 ? 'positive' : 'negative'}">
                      ${Utils.formatCurrencyShort((project.revenue || 0) - (project.actualCost || 0))}
                    </td>
                    <td>${(project.progress || 0).toFixed(0)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${filteredProjects.length > 20 ? `<p style="text-align:center;font-size:11px;color:${muted};margin-top:8px;">Showing 20 of ${filteredProjects.length} projects</p>` : ''}
          </div>
        ` : ''}
      </div>

      <div class="report-footer-section">
        <div class="report-footer-img">
          <img src="${letterheadFooter}" alt="Footer" />
        </div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  <\/script>
</body>
</html>
    `;
  };

  // ============================================
  // PRINT REPORT FUNCTION
  // ============================================
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    const printHTML = generateReportHTML();
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
  };

  // Card details for tooltips
  const cardDetails = {
    total: {
      title: 'Total Projects',
      details: [
        { label: 'Total Projects', value: stats.total },
        { label: 'Active Projects', value: stats.active },
        { label: 'Completed', value: stats.completed },
        { label: 'On Hold', value: stats.onHold },
        { label: 'Cancelled', value: stats.cancelled }
      ]
    },
    active: {
      title: 'Active Projects',
      details: [
        { label: 'Active Projects', value: stats.active },
        { label: 'Planning', value: projects.filter(p => p.status === 'planning').length },
        { label: 'On Hold', value: stats.onHold },
        { label: 'Average Progress', value: `${stats.avgProgress.toFixed(1)}%` }
      ]
    },
    completed: {
      title: 'Completed Projects',
      details: [
        { label: 'Completed', value: stats.completed },
        { label: 'Total Revenue', value: Utils.formatCurrency(stats.totalRevenue) },
        { label: 'Total Profit', value: Utils.formatCurrency(stats.totalProfit) },
        { label: 'Completion Rate', value: stats.total > 0 ? `${((stats.completed / stats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    overdue: {
      title: 'Overdue Projects',
      details: [
        { label: 'Overdue Projects', value: stats.overdue },
        { label: 'Active Projects', value: stats.active },
        { label: 'On Hold', value: stats.onHold },
        { label: 'Critical', value: projects.filter(p => p.priority === 'critical' && p.status !== 'completed').length }
      ]
    },
    budget: {
      title: 'Total Budget',
      details: [
        { label: 'Total Budget', value: Utils.formatCurrency(stats.totalBudget) },
        { label: 'Total Actual Cost', value: Utils.formatCurrency(stats.totalActual) },
        { label: 'Variance', value: Utils.formatCurrency(stats.totalBudget - stats.totalActual) },
        { label: 'Budget Utilization', value: stats.totalBudget > 0 ? `${((stats.totalActual / stats.totalBudget) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    revenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Total Revenue', value: Utils.formatCurrency(stats.totalRevenue) },
        { label: 'Total Profit', value: Utils.formatCurrency(stats.totalProfit) },
        { label: 'Profit Margin', value: stats.totalRevenue > 0 ? `${((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)}%` : '0%' },
        { label: 'Completed Projects', value: stats.completed }
      ]
    }
  };

  // ============================================
  // MODAL OPEN FUNCTIONS WITH PROPER EVENT HANDLING
  // ============================================
  const openCreateModal = (e) => {
    if (e) e.stopPropagation();
    if (isOpening) return;
    setIsOpening(true);
    resetForm();
    setShowForm(true);
    setTimeout(() => setIsOpening(false), 300);
  };

  const openEditModal = (project, e) => {
    if (e) e.stopPropagation();
    if (isOpening) return;
    setIsOpening(true);
    handleEdit(project);
    setTimeout(() => setIsOpening(false), 300);
  };

  const closeModal = (e) => {
    if (e) e.stopPropagation();
    setShowForm(false);
    resetForm();
  };

  const closeDetailModal = (e) => {
    if (e) e.stopPropagation();
    setShowDetailModal(false);
    setSelectedProject(null);
  };

  // Render project card
  const renderProjectCard = (project) => {
    const isExpanded = expandedProjects[project.id];
    const progress = project.progress || 0;
    const profit = (project.revenue || 0) - (project.actualCost || 0);
    const isProfit = profit >= 0;
    const statusConfig = getStatusConfig(project.status);
    const priorityConfig = getPriorityConfig(project.priority);
    const healthConfig = getHealthConfig(project.healthStatus);
    const gradient = getCardGradient(project.status);
    const StatusIcon = statusConfig.icon;
    const HealthIcon = healthConfig.icon;

    return (
      <div 
        key={project.id} 
        className="project-card-modern"
        onMouseEnter={() => setHoveredCard(project.id)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div className="project-card-gradient" style={{ background: gradient }}></div>
        <div className="project-card-content">
          <div className="project-card-header">
            <div className="project-title-section">
              <span className="project-code">{project.code || `PRJ-${String(project.id).padStart(4, '0')}`}</span>
              <h3 className="project-name">{project.name}</h3>
              {project.client && (
                <div className="project-client">
                  <User size={14} />
                  <span>{project.client}</span>
                </div>
              )}
            </div>
            <div className="project-badges">
              <span className="badge status-badge" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                <StatusIcon size={14} className="badge-icon" />
                {statusConfig.label}
              </span>
              <span className="badge priority-badge" style={{ background: priorityConfig.bg, color: priorityConfig.color }}>
                {priorityConfig.label}
              </span>
            </div>
          </div>

          <div className="project-card-body">
            <div className="project-progress-section">
              <div className="progress-header">
                <span className="progress-label">Progress</span>
                <span className="progress-value">{progress.toFixed(0)}%</span>
              </div>
              <div className="progress-bar-modern">
                <div 
                  className="progress-fill-modern" 
                  style={{ 
                    width: `${Math.min(progress, 100)}%`,
                    background: progress >= 75 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 
                               progress >= 50 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 
                               'linear-gradient(90deg, #ef4444, #dc2626)'
                  }}
                />
              </div>
            </div>

            <div className="project-stats-grid">
              <div className="stat-item">
                <span className="stat-label">Budget</span>
                <span className="stat-value">{Utils.formatCurrencyShort(project.budget || 0)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Actual</span>
                <span className="stat-value">{Utils.formatCurrencyShort(project.actualCost || 0)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Revenue</span>
                <span className="stat-value">{Utils.formatCurrencyShort(project.revenue || 0)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Profit</span>
                <span className={`stat-value ${isProfit ? 'profit' : 'loss'}`}>
                  {Utils.formatCurrencyShort(profit)}
                </span>
              </div>
            </div>

            <div className="project-meta">
              <div className="meta-item">
                <Calendar size={14} />
                <span>
                  {project.startDate ? Utils.formatDate(project.startDate) : 'N/A'} 
                  {project.endDate && ` → ${Utils.formatDate(project.endDate)}`}
                </span>
              </div>
              {project.siteName && (
                <div className="meta-item">
                  <Building2 size={14} />
                  <span>{project.siteName}</span>
                </div>
              )}
              <div className="meta-item health-status" style={{ color: healthConfig.color }}>
                <HealthIcon size={14} /> {healthConfig.label}
              </div>
            </div>

            {project.description && (
              <div className="project-description">{project.description}</div>
            )}
          </div>

          <div className="project-card-footer">
            <div className="project-actions">
              <button className="btn-icon" onClick={(e) => {
                e.stopPropagation();
                setSelectedProject(project);
                setShowDetailModal(true);
              }} title="View Details">
                <Eye size={16} />
              </button>
              <button className="btn-icon" onClick={(e) => openEditModal(project, e)} title="Edit">
                <Edit size={16} />
              </button>
              <button className="btn-icon danger" onClick={(e) => {
                e.stopPropagation();
                handleDelete(project.id);
              }} title="Delete">
                <Trash2 size={16} />
              </button>
              <button className="btn-icon expand-btn" onClick={(e) => {
                e.stopPropagation();
                toggleExpand(project.id);
              }} title="Expand">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            <div className="project-team">
              {project.projectManager && (
                <span><User size={12} /> PM: {project.projectManager}</span>
              )}
              {project.teamLead && (
                <span><Users size={12} /> Lead: {project.teamLead}</span>
              )}
            </div>
          </div>

          {isExpanded && (
            <div className="project-expanded-details">
              <div className="detail-section">
                <h4>Client Details</h4>
                <div className="detail-grid">
                  {project.clientContact && (
                    <div className="detail-item">
                      <span className="label">Contact:</span>
                      <span>{project.clientContact}</span>
                    </div>
                  )}
                  {project.clientPhone && (
                    <div className="detail-item">
                      <span className="label">Phone:</span>
                      <span>{project.clientPhone}</span>
                    </div>
                  )}
                  {project.clientEmail && (
                    <div className="detail-item">
                      <span className="label">Email:</span>
                      <span>{project.clientEmail}</span>
                    </div>
                  )}
                </div>
              </div>
              {project.notes && (
                <div className="detail-section">
                  <h4>Notes</h4>
                  <p className="notes-text">{project.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="project-dashboard-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <FolderKanban size={28} />
            <span className="header-badge">Projects</span>
          </div>
          <div>
            <h2>Project Management</h2>
            <p className="header-subtitle">Track and manage all your construction projects</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-print-modern" onClick={handlePrintReport}>
            <Printer size={16} />
            Print Report
          </button>
          <button className="btn-export-modern" onClick={exportDashboardReport}>
            <Download size={16} />
            Export
          </button>
          <button className="btn-refresh-modern" onClick={loadProjects}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button 
            className="btn-primary-modern" 
            onClick={openCreateModal}
          >
            <Plus size={18} />
            New Project
          </button>
        </div>
      </div>

      {/* Stats Cards with Tooltips */}
      <div className="stats-grid-modern">
        <div 
          className="stat-card-modern total"
          onMouseEnter={(e) => handleCardHover('total', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Briefcase size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Projects</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div 
          className="stat-card-modern active"
          onMouseEnter={(e) => handleCardHover('active', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <Activity size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active</span>
            <span className="stat-value">{stats.active}</span>
          </div>
          <div className="stat-progress">
            <div className="progress-bar" style={{ width: stats.total > 0 ? `${(stats.active / stats.total) * 100}%` : '0%' }}></div>
          </div>
        </div>

        <div 
          className="stat-card-modern completed"
          onMouseEnter={(e) => handleCardHover('completed', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <CheckCircle size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Completed</span>
            <span className="stat-value">{stats.completed}</span>
          </div>
        </div>

        <div 
          className="stat-card-modern overdue"
          onMouseEnter={(e) => handleCardHover('overdue', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <AlertCircle size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Overdue</span>
            <span className="stat-value">{stats.overdue}</span>
          </div>
        </div>

        <div 
          className="stat-card-modern budget"
          onMouseEnter={(e) => handleCardHover('budget', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <DollarSign size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Budget</span>
            <span className="stat-value">{Utils.formatCurrencyShort(stats.totalBudget)}</span>
          </div>
        </div>

        <div 
          className="stat-card-modern revenue"
          onMouseEnter={(e) => handleCardHover('revenue', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(0, 152, 70, 0.12)', color: '#009846' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">{Utils.formatCurrencyShort(stats.totalRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div 
          className="card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="tooltip-row">
                <span className="tooltip-label">{detail.label}</span>
                <span className="tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section-modern">
        <div className="search-box-modern">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="filter-group-modern">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="error-message-modern"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="success-message-modern"><CheckCircle size={16} /> {success}</div>}

      {/* Project List */}
      {loading ? (
        <div className="loading-state-modern">
          <div className="loading-spinner-modern"></div>
          <span>Loading projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state-modern">
          <div className="empty-icon-wrapper">
            <FolderKanban size={64} />
          </div>
          <h3>No Projects Found</h3>
          <p>Create your first project to get started with project management.</p>
          <button 
            className="btn-primary-modern" 
            onClick={openCreateModal}
          >
            <Plus size={18} /> Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid-modern">
          {filteredProjects.map(renderProjectCard)}
        </div>
      )}

      {/* Create/Edit Form Modal - FIXED */}
      {showForm && (
        <div 
          className="modal-overlay-modern" 
          onClick={(e) => {
            // Only close if clicking the overlay itself, not its children
            if (e.target === e.currentTarget) {
              closeModal(e);
            }
          }}
        >
          <div 
            className="modal-content-modern project-form" 
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside from bubbling
          >
            <div className="modal-header-modern" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
              <div className="modal-header-left">
                <FolderKanban size={24} color="#fff" />
                <h3 style={{ color: '#fff' }}>{editingId ? 'Edit Project' : 'New Project'}</h3>
              </div>
              <button 
                className="modal-close-modern" 
                onClick={closeModal}
              >
                <X size={20} color="#fff" />
              </button>
            </div>
            <div className="modal-body-modern">
              <form onSubmit={handleSubmit}>
                <div className="form-row-modern">
                  <div className="form-group-modern">
                    <label>Project Name <span className="required">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Enter project name"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group-modern">
                    <label>Client</label>
                    <input
                      type="text"
                      value={formData.client}
                      onChange={e => setFormData({ ...formData, client: e.target.value })}
                      placeholder="Client name"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row-modern">
                  <div className="form-group-modern">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Project description"
                      rows="2"
                      className="form-textarea"
                    />
                  </div>
                </div>

                <div className="form-row-modern">
                  <div className="form-group-modern">
                    <label>Site</label>
                    <select
                      value={formData.siteId}
                      onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select Site</option>
                      {data?.sites?.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-modern">
                    <label>Budget (BD)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.budget}
                      onChange={e => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="0.000"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row-modern">
                  <div className="form-group-modern">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group-modern">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row-modern">
                  <div className="form-group-modern">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="form-select"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="form-group-modern">
                    <label>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      className="form-select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-modern">
                  <div className="form-group-modern">
                    <label>Project Manager</label>
                    <input
                      type="text"
                      value={formData.projectManager}
                      onChange={e => setFormData({ ...formData, projectManager: e.target.value })}
                      placeholder="Project manager name"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group-modern">
                    <label>Team Lead</label>
                    <input
                      type="text"
                      value={formData.teamLead}
                      onChange={e => setFormData({ ...formData, teamLead: e.target.value })}
                      placeholder="Team lead name"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row-modern">
                  <div className="form-group-modern">
                    <label>Risk Level</label>
                    <select
                      value={formData.riskLevel}
                      onChange={e => setFormData({ ...formData, riskLevel: e.target.value })}
                      className="form-select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group-modern">
                    <label>Notes</label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-actions-modern">
                  <button type="submit" className="btn-primary-modern" disabled={loading}>
                    <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update Project' : 'Create Project')}
                  </button>
                  <button type="button" className="btn-secondary-modern" onClick={closeModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal - FIXED */}
      {selectedProject && showDetailModal && (
        <div 
          className="modal-overlay-modern" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeDetailModal(e);
            }
          }}
        >
          <div 
            className="modal-content-modern project-detail" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-modern" style={{ 
              background: `linear-gradient(135deg, ${getCardGradient(selectedProject.status)})`,
              padding: '24px 28px'
            }}>
              <div className="modal-header-left">
                <div>
                  <h3 style={{ color: '#fff' }}>{selectedProject.name}</h3>
                  <div className="modal-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {selectedProject.code || `PRJ-${String(selectedProject.id).padStart(4, '0')}`}
                  </div>
                </div>
              </div>
              <button 
                className="modal-close-modern" 
                onClick={closeDetailModal}
              >
                <X size={24} color="#fff" />
              </button>
            </div>
            <div className="modal-body-modern">
              <div className="detail-summary-grid">
                <div className="summary-item">
                  <span className="label">Status</span>
                  <span className="badge status-badge" style={{ 
                    background: getStatusConfig(selectedProject.status).bg, 
                    color: getStatusConfig(selectedProject.status).color,
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}>
                    {React.createElement(getStatusConfig(selectedProject.status).icon, { size: 14 })} {getStatusConfig(selectedProject.status).label}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Priority</span>
                  <span className="badge priority-badge" style={{ 
                    background: getPriorityConfig(selectedProject.priority).bg, 
                    color: getPriorityConfig(selectedProject.priority).color,
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}>
                    {getPriorityConfig(selectedProject.priority).label}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Health</span>
                  <span style={{ color: getHealthConfig(selectedProject.healthStatus).color, fontWeight: '600' }}>
                    {React.createElement(getHealthConfig(selectedProject.healthStatus).icon, { size: 14 })} {getHealthConfig(selectedProject.healthStatus).label}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Progress</span>
                  <span style={{ fontWeight: '700', color: '#1a2332' }}>
                    {selectedProject.progress?.toFixed(0) || 0}%
                  </span>
                </div>
              </div>

              <div className="detail-financials">
                <h4>Financial Summary</h4>
                <div className="financial-grid">
                  <div className="fin-item" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <span className="label">Budget</span>
                    <span className="value">{Utils.formatCurrency(selectedProject.budget || 0)}</span>
                  </div>
                  <div className="fin-item" style={{ borderLeft: '4px solid #ef4444' }}>
                    <span className="label">Actual Cost</span>
                    <span className="value">{Utils.formatCurrency(selectedProject.actualCost || 0)}</span>
                  </div>
                  <div className="fin-item" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <span className="label">Revenue</span>
                    <span className="value">{Utils.formatCurrency(selectedProject.revenue || 0)}</span>
                  </div>
                  <div className="fin-item" style={{ borderLeft: `4px solid ${(selectedProject.revenue || 0) - (selectedProject.actualCost || 0) >= 0 ? '#22c55e' : '#ef4444'}` }}>
                    <span className="label">Profit</span>
                    <span className={`value ${(selectedProject.revenue || 0) - (selectedProject.actualCost || 0) >= 0 ? 'profit' : 'loss'}`}>
                      {Utils.formatCurrency((selectedProject.revenue || 0) - (selectedProject.actualCost || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {selectedProject.client && (
                <div className="detail-client">
                  <h4>Client Information</h4>
                  <div className="client-grid">
                    <div className="client-item"><User size={14} /> <strong>Name:</strong> {selectedProject.client}</div>
                    {selectedProject.clientContact && <div className="client-item"><User size={14} /> <strong>Contact:</strong> {selectedProject.clientContact}</div>}
                    {selectedProject.clientPhone && <div className="client-item"><Phone size={14} /> <strong>Phone:</strong> {selectedProject.clientPhone}</div>}
                    {selectedProject.clientEmail && <div className="client-item"><Mail size={14} /> <strong>Email:</strong> {selectedProject.clientEmail}</div>}
                  </div>
                </div>
              )}

              {selectedProject.description && (
                <div className="detail-description">
                  <h4>Description</h4>
                  <p>{selectedProject.description}</p>
                </div>
              )}

              {selectedProject.notes && (
                <div className="detail-notes">
                  <h4>Notes</h4>
                  <p>{selectedProject.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;