// src/components/ClientManagement.jsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  Star,
  StarHalf,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Shield,
  UserCheck,
  UserX,
  LayoutDashboard,
  FolderKanban,
  Wallet,
  CalendarDays,
  MessageSquare,
  Video,
  Link2,
  Unlink,
  PhoneCall,
  Mail as MailIcon,
  Filter,
  Printer,
  Gauge,
  Sparkles,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import Utils from '../utils/Utils';
import './ClientManagement.css';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

const ClientManagement = ({ data, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [expandedClients, setExpandedClients] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Use data from props
  const clients = data.clients || [];

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    country: '',
    crNumber: '',
    vatNumber: '',
    website: '',
    industry: '',
    clientType: 'company',
    status: 'active',
    priority: 'medium',
    rating: 3,
    notes: ''
  });

  // ============================================
  // FILTER CLIENTS
  // ============================================
  const filteredClients = useMemo(() => {
    let filtered = clients;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(search) ||
        (c.companyName && c.companyName.toLowerCase().includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(c => c.priority === priorityFilter);
    }
    
    return filtered;
  }, [clients, searchTerm, statusFilter, priorityFilter]);

  // ============================================
  // STATISTICS
  // ============================================
  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === 'active').length;
    const highPriority = clients.filter(c => c.priority === 'high' || c.priority === 'critical').length;
    const totalPayments = clients.reduce((sum, c) => sum + (c.totalPayments || 0), 0);
    const avgRating = clients.reduce((sum, c) => sum + (c.rating || 0), 0) / (clients.length || 1);
    
    return { total, active, highPriority, totalPayments, avgRating };
  }, [clients]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    total: {
      title: 'Total Clients',
      details: [
        { label: 'Total Clients', value: stats.total },
        { label: 'Active Clients', value: stats.active },
        { label: 'High Priority', value: stats.highPriority },
        { label: 'Average Rating', value: `${stats.avgRating.toFixed(1)} ★` }
      ]
    },
    active: {
      title: 'Active Clients',
      details: [
        { label: 'Active Clients', value: stats.active },
        { label: 'Inactive', value: clients.filter(c => c.status === 'inactive').length },
        { label: 'Potential', value: clients.filter(c => c.status === 'potential').length },
        { label: 'Active Rate', value: stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    highPriority: {
      title: 'High Priority Clients',
      details: [
        { label: 'High Priority', value: stats.highPriority },
        { label: 'Critical', value: clients.filter(c => c.priority === 'critical').length },
        { label: 'High', value: clients.filter(c => c.priority === 'high').length },
        { label: 'Needs Attention', value: clients.filter(c => c.priority === 'critical' || c.priority === 'high').length }
      ]
    },
    payments: {
      title: 'Total Payments',
      details: [
        { label: 'Total Payments', value: Utils.formatCurrency(stats.totalPayments) },
        { label: 'Average per Client', value: stats.total > 0 ? Utils.formatCurrency(stats.totalPayments / stats.total) : '0.000' },
        { label: 'Total Clients', value: stats.total },
        { label: 'Payment Rate', value: stats.total > 0 ? `${((clients.filter(c => c.totalPayments > 0).length / stats.total) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    rating: {
      title: 'Average Rating',
      details: [
        { label: 'Average Rating', value: `${stats.avgRating.toFixed(1)} ★` },
        { label: '5 Star', value: clients.filter(c => c.rating === 5).length },
        { label: '4+ Star', value: clients.filter(c => c.rating >= 4).length },
        { label: 'Needs Review', value: clients.filter(c => c.rating < 3).length }
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
  // RENDER STARS
  // ============================================
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <span className="stars">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} size={14} fill="#f59e0b" color="#f59e0b" />
        ))}
        {halfStar && <StarHalf size={14} fill="#f59e0b" color="#f59e0b" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} size={14} color="#4a5a72" />
        ))}
      </span>
    );
  };

  // ============================================
  // GET STATUS BADGE
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      active: { color: '#22c55e', label: 'Active', icon: CheckCircle },
      inactive: { color: '#ef4444', label: 'Inactive', icon: UserX },
      potential: { color: '#f59e0b', label: 'Potential', icon: Clock }
    };
    const c = config[status] || config.active;
    const Icon = c.icon;
    return (
      <span className={`status-badge-modern ${status}`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  // ============================================
  // GET PRIORITY BADGE
  // ============================================
  const getPriorityBadge = (priority) => {
    const config = {
      low: { color: '#3b82f6', label: 'Low' },
      medium: { color: '#f59e0b', label: 'Medium' },
      high: { color: '#f97316', label: 'High' },
      critical: { color: '#ef4444', label: 'Critical' }
    };
    const c = config[priority] || config.medium;
    return (
      <span className={`priority-badge-modern ${priority}`}>
        {c.label}
      </span>
    );
  };

  // ============================================
  // HANDLE CLIENT CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId 
        ? `${API_BASE_URL}/clients/${editingId}`
        : `${API_BASE_URL}/clients`;
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
        throw new Error(errorData.error || 'Failed to save client');
      }

      const result = await response.json();
      setSuccess(editingId ? 'Client updated successfully!' : 'Client created successfully!');
      await refreshData();
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
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to delete client');
      
      setSuccess('Client deleted successfully!');
      await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      city: '',
      country: '',
      crNumber: '',
      vatNumber: '',
      website: '',
      industry: '',
      clientType: 'company',
      status: 'active',
      priority: 'medium',
      rating: 3,
      notes: ''
    });
    setEditingId(null);
  };

  const handleEdit = (client) => {
    setEditingId(client.id);
    setFormData({
      name: client.name || '',
      companyName: client.companyName || '',
      contactPerson: client.contactPerson || '',
      email: client.email || '',
      phone: client.phone || '',
      mobile: client.mobile || '',
      address: client.address || '',
      city: client.city || '',
      country: client.country || '',
      crNumber: client.crNumber || '',
      vatNumber: client.vatNumber || '',
      website: client.website || '',
      industry: client.industry || '',
      clientType: client.clientType || 'company',
      status: client.status || 'active',
      priority: client.priority || 'medium',
      rating: client.rating || 3,
      notes: client.notes || ''
    });
    setShowForm(true);
  };

  const toggleExpand = (id) => {
    setExpandedClients(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // ============================================
  // RENDER CLIENT CARD
  // ============================================
  const renderClientCard = (client) => {
    const isExpanded = expandedClients[client.id];
    const StatusIcon = client.status === 'active' ? CheckCircle : client.status === 'inactive' ? UserX : Clock;

    return (
      <div 
        key={client.id} 
        className="client-card-modern"
        onMouseEnter={() => setHoveredCard(client.id)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div className="client-card-header">
          <div className="client-info">
            <div className="client-avatar">
              <span className="avatar-initials">
                {client.name.charAt(0).toUpperCase()}
              </span>
              <span className={`status-dot ${client.status}`}></span>
            </div>
            <div>
              <div className="client-name">{client.name}</div>
              {client.companyName && (
                <div className="client-company">
                  <Building2 size={14} />
                  <span>{client.companyName}</span>
                </div>
              )}
            </div>
          </div>
          <div className="client-badges">
            {getStatusBadge(client.status)}
            {getPriorityBadge(client.priority)}
          </div>
        </div>

        <div className="client-card-body">
          <div className="client-details-grid">
            {client.contactPerson && (
              <div className="detail-item">
                <UserCheck size={14} />
                <span>{client.contactPerson}</span>
              </div>
            )}
            {client.email && (
              <div className="detail-item">
                <Mail size={14} />
                <span>{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="detail-item">
                <Phone size={14} />
                <span>{client.phone}</span>
              </div>
            )}
            {client.mobile && (
              <div className="detail-item">
                <PhoneCall size={14} />
                <span>{client.mobile}</span>
              </div>
            )}
          </div>

          <div className="client-rating">
            {renderStars(client.rating || 3)}
            <span className="rating-label">({client.rating || 3})</span>
          </div>

          <div className="client-stats-grid">
            <div className="stat-item">
              <span className="stat-label">Projects</span>
              <span className="stat-value">{client.projectCount || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Payments</span>
              <span className="stat-value">{Utils.formatCurrencyShort(client.totalPayments || 0)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Communications</span>
              <span className="stat-value">{client.communicationCount || 0}</span>
            </div>
          </div>

          {client.notes && (
            <div className="client-notes">
              <FileText size={14} />
              <span>{client.notes}</span>
            </div>
          )}
        </div>

        <div className="client-card-footer">
          <div className="client-actions">
            <button 
              className="btn-icon" 
              onClick={() => {
                setSelectedClient(client);
                setShowDetailModal(true);
              }}
              title="View Details"
            >
              <Eye size={16} />
            </button>
            <button 
              className="btn-icon" 
              onClick={() => handleEdit(client)}
              title="Edit"
            >
              <Edit size={16} />
            </button>
            <button 
              className="btn-icon danger" 
              onClick={() => handleDelete(client.id)}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
            <button 
              className="btn-icon expand-btn" 
              onClick={() => toggleExpand(client.id)}
              title="Expand"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="client-expanded">
            <div className="expanded-section">
              <h4>Contact Details</h4>
              <div className="contact-grid">
                {client.address && (
                  <div className="contact-item">
                    <MapPin size={14} />
                    <span><strong>Address:</strong> {client.address}</span>
                  </div>
                )}
                {client.city && (
                  <div className="contact-item">
                    <Building2 size={14} />
                    <span><strong>City:</strong> {client.city}</span>
                  </div>
                )}
                {client.country && (
                  <div className="contact-item">
                    <MapPin size={14} />
                    <span><strong>Country:</strong> {client.country}</span>
                  </div>
                )}
                {client.crNumber && (
                  <div className="contact-item">
                    <Shield size={14} />
                    <span><strong>CR Number:</strong> {client.crNumber}</span>
                  </div>
                )}
                {client.vatNumber && (
                  <div className="contact-item">
                    <Award size={14} />
                    <span><strong>VAT Number:</strong> {client.vatNumber}</span>
                  </div>
                )}
                {client.website && (
                  <div className="contact-item">
                    <Link2 size={14} />
                    <span><strong>Website:</strong> <a href={client.website} target="_blank" rel="noopener noreferrer">{client.website}</a></span>
                  </div>
                )}
                {client.industry && (
                  <div className="contact-item">
                    <Briefcase size={14} />
                    <span><strong>Industry:</strong> {client.industry}</span>
                  </div>
                )}
                {client.clientType && (
                  <div className="contact-item">
                    <Users size={14} />
                    <span><strong>Type:</strong> {client.clientType}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedClient) return null;
    const c = selectedClient;

    return (
      <div className="modal-overlay-modern" onClick={() => setShowDetailModal(false)}>
        <div className="modal-content-modern client-detail-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header-modern" style={{ background: 'linear-gradient(135deg, #1a2332, #2a3a4a)' }}>
            <div className="modal-header-left">
              <div className="client-avatar-large">
                <span>{c.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h3 style={{ color: '#ffffff' }}>{c.name}</h3>
                {c.companyName && <div className="modal-subtitle" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.companyName}</div>}
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn-edit" onClick={() => { setShowDetailModal(false); handleEdit(c); }}>
                <Edit size={16} /> Edit
              </button>
              <button className="modal-close-modern" onClick={() => setShowDetailModal(false)}>
                <X size={24} color="#ffffff" />
              </button>
            </div>
          </div>

          <div className="modal-body-modern">
            {/* Tabs */}
            <div className="detail-tabs-modern">
              <button 
                className={`tab-btn-modern ${activeTab === 'overview' ? 'active' : ''}`} 
                onClick={() => setActiveTab('overview')}
              >
                <LayoutDashboard size={14} /> Overview
              </button>
              <button 
                className={`tab-btn-modern ${activeTab === 'contacts' ? 'active' : ''}`} 
                onClick={() => setActiveTab('contacts')}
              >
                <Users size={14} /> Contacts
              </button>
              <button 
                className={`tab-btn-modern ${activeTab === 'communications' ? 'active' : ''}`} 
                onClick={() => setActiveTab('communications')}
              >
                <MessageSquare size={14} /> Communications
              </button>
              <button 
                className={`tab-btn-modern ${activeTab === 'projects' ? 'active' : ''}`} 
                onClick={() => setActiveTab('projects')}
              >
                <FolderKanban size={14} /> Projects
              </button>
              <button 
                className={`tab-btn-modern ${activeTab === 'payments' ? 'active' : ''}`} 
                onClick={() => setActiveTab('payments')}
              >
                <Wallet size={14} /> Payments
              </button>
              <button 
                className={`tab-btn-modern ${activeTab === 'meetings' ? 'active' : ''}`} 
                onClick={() => setActiveTab('meetings')}
              >
                <CalendarDays size={14} /> Meetings
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="overview-tab-modern">
                <div className="info-grid-modern">
                  <div className="info-item-modern">
                    <span className="label">Contact Person</span>
                    <span className="value">{c.contactPerson || 'N/A'}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">Email</span>
                    <span className="value">{c.email || 'N/A'}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">Phone</span>
                    <span className="value">{c.phone || 'N/A'}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">Mobile</span>
                    <span className="value">{c.mobile || 'N/A'}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">Address</span>
                    <span className="value">{c.address || 'N/A'}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">City/Country</span>
                    <span className="value">{c.city || 'N/A'}, {c.country || 'N/A'}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">CR Number</span>
                    <span className="value">{c.crNumber || 'N/A'}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">VAT Number</span>
                    <span className="value">{c.vatNumber || 'N/A'}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">Industry</span>
                    <span className="value">{c.industry || 'N/A'}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">Type</span>
                    <span className="value">{c.clientType || 'N/A'}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">Rating</span>
                    <span className="value">{renderStars(c.rating || 3)}</span>
                  </div>
                  <div className="info-item-modern">
                    <span className="label">Status</span>
                    <span className="value">{getStatusBadge(c.status)}</span>
                  </div>
                </div>
                {c.notes && (
                  <div className="notes-section-modern">
                    <h4><FileText size={14} /> Notes</h4>
                    <p>{c.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Other Tabs - Empty States */}
            {['contacts', 'communications', 'projects', 'payments', 'meetings'].includes(activeTab) && (
              <div className="empty-tab-modern">
                <div className="empty-icon-wrapper">
                  {activeTab === 'contacts' && <Users size={48} />}
                  {activeTab === 'communications' && <MessageSquare size={48} />}
                  {activeTab === 'projects' && <FolderKanban size={48} />}
                  {activeTab === 'payments' && <Wallet size={48} />}
                  {activeTab === 'meetings' && <CalendarDays size={48} />}
                </div>
                <h3>No {activeTab} found</h3>
                <p>Add your first {activeTab.slice(0, -1)} for this client</p>
                <button className="btn-primary-modern" style={{ marginTop: '12px' }}>
                  <Plus size={16} /> Add {activeTab.slice(0, -1)}
                </button>
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
      <div className="modal-overlay-modern" onClick={() => { setShowForm(false); resetForm(); }}>
        <div className="modal-content-modern client-form-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header-modern" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="modal-header-left">
              <UserPlus size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Client' : 'New Client'}</h3>
            </div>
            <button className="modal-close-modern" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="modal-body-modern">
            <form onSubmit={handleSubmit}>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Client Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter client name"
                    className="form-input"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Company name"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Contact person name"
                    className="form-input"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email address"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                    className="form-input"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Mobile</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="Mobile number"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                    className="form-input"
                  />
                </div>
                <div className="form-group-modern">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                    className="form-input"
                  />
                </div>
                <div className="form-group-modern">
                  <label>CR Number</label>
                  <input
                    type="text"
                    value={formData.crNumber}
                    onChange={e => setFormData({ ...formData, crNumber: e.target.value })}
                    placeholder="Commercial Registration number"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>VAT Number</label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={e => setFormData({ ...formData, vatNumber: e.target.value })}
                    placeholder="VAT number"
                    className="form-input"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    placeholder="Website URL"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="Industry"
                    className="form-input"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Client Type</label>
                  <select
                    value={formData.clientType}
                    onChange={e => setFormData({ ...formData, clientType: e.target.value })}
                    className="form-select"
                  >
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                    <option value="government">Government</option>
                  </select>
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
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="potential">Potential</option>
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
                  <label>Rating</label>
                  <div className="rating-input-modern">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${star <= formData.rating ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, rating: star })}
                      >
                        <Star size={24} fill={star <= formData.rating ? '#f59e0b' : 'transparent'} color={star <= formData.rating ? '#f59e0b' : '#4a5a72'} />
                      </button>
                    ))}
                  </div>
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
                  <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update Client' : 'Create Client')}
                </button>
                <button type="button" className="btn-secondary-modern" onClick={() => { setShowForm(false); resetForm(); }}>
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
  return (
    <div className="client-management-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <Users size={28} />
            <span className="header-badge">Clients</span>
          </div>
          <div>
            <h2>Client Management</h2>
            <p className="header-subtitle">Manage client relationships and history</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-refresh-modern" onClick={refreshData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn-primary-modern" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} />
            New Client
          </button>
        </div>
      </div>

      {/* Stats Cards with Tooltips */}
      <div className="stats-grid-modern">
        <div 
          className="cstat-card-modern"
          onMouseEnter={(e) => handleCardHover('total', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Users size={22} />
          </div>
          <div className="cstat-content">
            <span className="stat-label">Total Clients</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div 
          className="cstat-card-modern"
          onMouseEnter={(e) => handleCardHover('active', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <UserCheck size={22} />
          </div>
          <div className="cstat-content">
            <span className="stat-label">Active</span>
            <span className="stat-value">{stats.active}</span>
          </div>
          <div className="stat-progress">
            <div className="progress-bar" style={{ width: stats.total > 0 ? `${(stats.active / stats.total) * 100}%` : '0%' }}></div>
          </div>
        </div>

        <div 
          className="cstat-card-modern"
          onMouseEnter={(e) => handleCardHover('highPriority', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <AlertCircle size={22} />
          </div>
          <div className="cstat-content">
            <span className="stat-label">High Priority</span>
            <span className="stat-value">{stats.highPriority}</span>
          </div>
          <div className="stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div 
          className="cstat-card-modern"
          onMouseEnter={(e) => handleCardHover('payments', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <DollarSign size={22} />
          </div>
          <div className="cstat-content">
            <span className="stat-label">Total Payments</span>
            <span className="stat-value">{Utils.formatCurrencyShort(stats.totalPayments)}</span>
          </div>
          <div className="stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div 
          className="cstat-card-modern"
          onMouseEnter={(e) => handleCardHover('rating', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Star size={22} />
          </div>
          <div className="cstat-content">
            <span className="stat-label">Avg Rating</span>
            <span className="stat-value">{stats.avgRating.toFixed(1)} ★</span>
          </div>
          <div className="stat-trend">
            <Star size={16} />
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
            placeholder="Search clients..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="potential">Potential</option>
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

      {/* Error/Success */}
      {error && <div className="error-message-modern"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="success-message-modern"><CheckCircle size={16} /> {success}</div>}

      {/* Client List */}
      {loading ? (
        <div className="loading-state-modern">
          <div className="loading-spinner-modern"></div>
          <span>Loading clients...</span>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="empty-state-modern">
          <div className="empty-icon-wrapper">
            <Users size={64} />
          </div>
          <h3>No Clients Found</h3>
          <p>Create your first client to get started with client management.</p>
          <button className="btn-primary-modern" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> Create Client
          </button>
        </div>
      ) : (
        <div className="clients-grid-modern">
          {filteredClients.map(renderClientCard)}
        </div>
      )}

      {/* Modals */}
      {showForm && renderFormModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default ClientManagement;