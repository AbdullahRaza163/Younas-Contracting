// src/components/UnitsManager.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Ruler, Plus, Edit, Trash2, X, Save, Search,
  RefreshCw, CheckCircle, AlertCircle, Layers,
  Hash, Tag, Eye, EyeOff, Sparkles
} from 'lucide-react';
import './UnitsManager.css';
import useUnits from '../hooks/useUnits';

const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

const CATEGORY_OPTIONS = [
  'Area', 'Volume', 'Weight', 'Count', 'Time',
  'Length', 'Package', 'Currency', 'Percentage', 'General'
];

const UnitsManager = () => {
  const { units, loading, addUnit, updateUnit, deleteUnit, refresh } = useUnits();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    category: 'General',
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = 'success') =>
    setToast({ message, type, id: Date.now() });

  // ============================================
  // FILTERED UNITS
  // ============================================
  const filteredUnits = useMemo(() => {
    let list = units;
    if (!showInactive) list = list.filter(u => u.isActive);
    if (categoryFilter !== 'all') list = list.filter(u => u.category === categoryFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.symbol || '').toLowerCase().includes(q) ||
        (u.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [units, showInactive, categoryFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = units.length;
    const active = units.filter(u => u.isActive).length;
    const inactive = total - active;
    const cats = new Set(units.map(u => u.category || 'General'));
    return { total, active, inactive, categories: cats.size };
  }, [units]);

  const categories = useMemo(() => {
    const s = new Set(units.map(u => u.category || 'General'));
    return Array.from(s).sort();
  }, [units]);

  // ============================================
  // FORM HANDLERS
  // ============================================
  const openAdd = () => {
    setFormData({
      name: '',
      symbol: '',
      category: 'General',
      isActive: true,
      sortOrder: (Math.max(0, ...units.map(u => u.sortOrder || 0)) + 1),
    });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (unit) => {
    setFormData({
      name: unit.name,
      symbol: unit.symbol || '',
      category: unit.category || 'General',
      isActive: unit.isActive !== false,
      sortOrder: unit.sortOrder || 0,
    });
    setEditingId(unit.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Unit name is required', 'error');
      return;
    }
    try {
      if (editingId) {
        await updateUnit(editingId, formData);
        showToast('Unit updated');
      } else {
        await addUnit(formData);
        showToast('Unit created');
      }
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      showToast(err.message || 'Failed to save unit', 'error');
    }
  };

  const handleDelete = (unit) => {
    setDeleteConfirm(unit);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteUnit(deleteConfirm.id);
      showToast('Unit deleted');
    } catch (err) {
      showToast(err.message || 'Failed to delete unit', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const toggleActive = async (unit) => {
    try {
      await updateUnit(unit.id, { isActive: !unit.isActive });
      showToast(unit.isActive ? 'Marked inactive' : 'Marked active');
    } catch (err) {
      showToast(err.message || 'Failed to update', 'error');
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className={`un-root ${mounted ? 'is-mounted' : ''}`}>
      {toast && (
        <div className={`un-toast un-toast-${toast.type}`} key={toast.id}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="un-ambient">
        <div className="un-orb un-orb-1" />
        <div className="un-orb un-orb-2" />
        <div className="un-orb un-orb-3" />
      </div>

      {/* Header */}
      <div className="un-header">
        <div className="un-header-left">
          <div className="un-header-icon-wrapper">
            <Ruler size={22} />
            <span className="un-header-badge"><Sparkles size={10} /> UNITS</span>
          </div>
          <div>
            <h2>Units of Measurement</h2>
            <p className="un-header-subtitle">
              {stats.total} total · {stats.active} active · {stats.categories} categories
            </p>
          </div>
        </div>
        <div className="un-header-right">
          <button className="un-btn-ghost" onClick={() => refresh()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="un-btn-primary" onClick={openAdd}>
            <Plus size={14} /> New Unit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="un-stats-grid">
        <div className="un-stat-card">
          <div className="un-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
            <Ruler size={20} />
          </div>
          <div className="un-stat-content">
            <span className="un-stat-label">Total Units</span>
            <span className="un-stat-value">{stats.total}</span>
            <span className="un-stat-meta">{stats.categories} categories</span>
          </div>
        </div>
        <div className="un-stat-card">
          <div className="un-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
            <CheckCircle size={20} />
          </div>
          <div className="un-stat-content">
            <span className="un-stat-label">Active</span>
            <span className="un-stat-value">{stats.active}</span>
            <span className="un-stat-meta">visible in dropdowns</span>
          </div>
        </div>
        <div className="un-stat-card">
          <div className="un-stat-icon" style={{ background: 'rgba(148,163,184,0.15)', color: '#64748b' }}>
            <EyeOff size={20} />
          </div>
          <div className="un-stat-content">
            <span className="un-stat-label">Inactive</span>
            <span className="un-stat-value">{stats.inactive}</span>
            <span className="un-stat-meta">hidden from dropdowns</span>
          </div>
        </div>
        <div className="un-stat-card">
          <div className="un-stat-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
            <Layers size={20} />
          </div>
          <div className="un-stat-content">
            <span className="un-stat-label">Categories</span>
            <span className="un-stat-value">{stats.categories}</span>
            <span className="un-stat-meta">distinct groups</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="un-filters">
        <div className="un-search-box">
          <Search size={15} className="un-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search units by name, symbol, category..."
            className="un-search-input"
          />
          {searchTerm && (
            <button className="un-clear-search" onClick={() => setSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="un-filter-select">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          className={`un-toggle-inactive ${showInactive ? 'on' : 'off'}`}
          onClick={() => setShowInactive(v => !v)}
          title={showInactive ? 'Hide inactive' : 'Show inactive'}
        >
          {showInactive ? <Eye size={13} /> : <EyeOff size={13} />}
          {showInactive ? 'Showing all' : 'Active only'}
        </button>
        <span className="un-result-count">
          {filteredUnits.length} of {units.length}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="un-loading">
          <RefreshCw size={20} className="un-spin" /> Loading units...
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="un-empty">
          <div className="un-empty-icon"><Ruler size={40} /></div>
          <h3>No Units Found</h3>
          <p>{searchTerm || categoryFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first unit to get started.'}</p>
          <button className="un-btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add Unit
          </button>
        </div>
      ) : (
        <div className="un-grid">
          {filteredUnits.map((unit, i) => (
            <div
              key={unit.id}
              className={`un-card ${!unit.isActive ? 'is-inactive' : ''}`}
              style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
            >
              <div className="un-card-accent" />
              <div className="un-card-header">
                <div className="un-card-symbol">{unit.name}</div>
                <span className={`un-card-status ${unit.isActive ? 'active' : 'inactive'}`}>
                  {unit.isActive ? <><CheckCircle size={10} /> Active</> : <><EyeOff size={10} /> Inactive</>}
                </span>
              </div>
              <div className="un-card-body">
                {unit.symbol && (
                  <div className="un-card-row">
                    <Hash size={12} />
                    <span className="un-card-row-label">Symbol:</span>
                    <span className="un-card-row-value">{unit.symbol}</span>
                  </div>
                )}
                <div className="un-card-row">
                  <Tag size={12} />
                  <span className="un-card-row-label">Category:</span>
                  <span className="un-card-row-value">{unit.category || 'General'}</span>
                </div>
                <div className="un-card-row">
                  <Layers size={12} />
                  <span className="un-card-row-label">Sort Order:</span>
                  <span className="un-card-row-value">{unit.sortOrder || 0}</span>
                </div>
              </div>
              <div className="un-card-footer">
                <button
                  className={`un-btn-toggle ${unit.isActive ? 'is-on' : 'is-off'}`}
                  onClick={() => toggleActive(unit)}
                  title={unit.isActive ? 'Deactivate' : 'Activate'}
                >
                  {unit.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                  {unit.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <div className="un-card-actions">
                  <button className="un-icon-btn un-icon-edit" onClick={() => openEdit(unit)} title="Edit">
                    <Edit size={14} />
                  </button>
                  <button className="un-icon-btn un-icon-danger" onClick={() => handleDelete(unit)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ModalPortal>
          <div className="un-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditingId(null); } }}>
            <div className="un-modal" onClick={e => e.stopPropagation()}>
              <div className="un-modal-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                <div className="un-modal-header-left">
                  <div className="un-modal-icon">{editingId ? <Edit size={18} /> : <Plus size={18} />}</div>
                  <div>
                    <h3>{editingId ? 'Edit Unit' : 'New Unit'}</h3>
                    <p className="un-modal-sub">{editingId ? 'Update unit details' : 'Create a unit of measurement'}</p>
                  </div>
                </div>
                <button className="un-modal-close" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="un-modal-body">
                  <div className="un-form-row">
                    <div className="un-form-group">
                      <label>Unit Name <span className="un-required">*</span></label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                        placeholder="e.g. SQ.M, KG, PCS"
                        className="un-form-input"
                        autoFocus
                        required
                      />
                      <small className="un-hint">Uppercase — will be stored as-is</small>
                    </div>
                    <div className="un-form-group">
                      <label>Symbol</label>
                      <input
                        type="text"
                        value={formData.symbol}
                        onChange={e => setFormData({ ...formData, symbol: e.target.value })}
                        placeholder="e.g. m², kg, pc"
                        className="un-form-input"
                      />
                      <small className="un-hint">Optional display symbol</small>
                    </div>
                  </div>
                  <div className="un-form-row">
                    <div className="un-form-group">
                      <label>Category</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="un-form-select"
                      >
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="un-form-group">
                      <label>Sort Order</label>
                      <input
                        type="number"
                        value={formData.sortOrder}
                        onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                        className="un-form-input"
                      />
                      <small className="un-hint">Lower = earlier in dropdowns</small>
                    </div>
                  </div>
                  <div className="un-form-group">
                    <label>Status</label>
                    <button
                      type="button"
                      className={`un-active-toggle ${formData.isActive ? 'on' : 'off'}`}
                      onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    >
                      {formData.isActive ? <><CheckCircle size={13} /> Active</> : <><EyeOff size={13} /> Inactive</>}
                    </button>
                    <small className="un-hint">Only active units appear in dropdowns</small>
                  </div>
                  <div className="un-form-actions">
                    <button type="submit" className="un-btn-primary">
                      <Save size={14} /> {editingId ? 'Update Unit' : 'Create Unit'}
                    </button>
                    <button
                      type="button"
                      className="un-btn-secondary"
                      onClick={() => { setShowForm(false); setEditingId(null); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <ModalPortal>
          <div className="un-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
            <div className="un-modal un-delete-modal" onClick={e => e.stopPropagation()}>
              <div className="un-modal-header" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
                <div className="un-modal-header-left">
                  <div className="un-modal-icon"><Trash2 size={18} /></div>
                  <div>
                    <h3>Delete Unit</h3>
                    <p className="un-modal-sub">Cannot be undone</p>
                  </div>
                </div>
                <button className="un-modal-close" onClick={() => setDeleteConfirm(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="un-modal-body">
                <div className="un-delete-content">
                  <div className="un-delete-icon"><AlertCircle size={40} /></div>
                  <p className="un-delete-text">
                    Delete unit <strong>{deleteConfirm.name}</strong>?
                  </p>
                  <p className="un-delete-subtext">
                    Existing invoices already using this unit will not be affected.
                  </p>
                  <div className="un-delete-actions">
                    <button className="un-btn-danger" onClick={confirmDelete}>
                      <Trash2 size={14} /> Delete
                    </button>
                    <button className="un-btn-secondary" onClick={() => setDeleteConfirm(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default UnitsManager;