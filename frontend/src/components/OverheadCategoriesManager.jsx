// src/components/OverheadCategoriesManager.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, Save, X, Edit, Trash2, RefreshCw, AlertCircle, 
  Check, Circle, Clock, Calendar, Tag, Building2, DollarSign 
} from 'lucide-react';
import ApiService from '../services/ApiService';
import './OverheadCategoriesManager.css';

const OverheadCategoriesManager = ({
  categories: propCategories = [],
  onCategoryChange,
  refreshData
}) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [localCategories, setLocalCategories] = useState([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const isMounted = useRef(true);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'company',
    isRecurring: true,
    defaultFrequency: 'monthly',
    glAccount: ''
  });

  // Load categories function - memoized to prevent unnecessary re-renders
  const loadCategories = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setErrorMessage('');
    try {
      const response = await ApiService.getOverheadCategories();
      if (isMounted.current) {
        setLocalCategories(response || []);
        if (onCategoryChange) {
          onCategoryChange(response || []);
        }
        setInitialLoadDone(true);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      if (isMounted.current) {
        setErrorMessage('Failed to load categories. Please try again.');
      }
    } finally {
      if (isMounted.current && !silent) {
        setLoading(false);
      }
    }
  }, [onCategoryChange]);

  // Only load categories on mount or when prop categories change
  useEffect(() => {
    // If categories are provided via props, use them
    if (propCategories && propCategories.length > 0) {
      setLocalCategories(propCategories);
      setInitialLoadDone(true);
    } else if (!initialLoadDone) {
      // Only load if we haven't loaded yet
      loadCategories();
    }
  }, [propCategories, initialLoadDone, loadCategories]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!formData.name.trim()) {
        setErrorMessage('Category name is required');
        setLoading(false);
        return;
      }

      const categoryData = {
        name: formData.name.trim(),
        type: formData.type,
        isRecurring: formData.isRecurring,
        defaultFrequency: formData.defaultFrequency,
        glAccount: formData.glAccount || ''
      };

      let response;
      if (editingId) {
        response = await ApiService.updateOverheadCategory(editingId, categoryData);
        setSuccessMessage('Category updated successfully!');
      } else {
        response = await ApiService.createOverheadCategory(categoryData);
        setSuccessMessage('Category created successfully!');
      }

      // Refresh categories - silent mode
      await loadCategories(true);
      resetForm();
      setShowForm(false);
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving category:', error);
      setErrorMessage(error.message || 'Failed to save category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'company',
      isRecurring: true,
      defaultFrequency: 'monthly',
      glAccount: ''
    });
    setEditingId(null);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Handle edit
  const handleEdit = (category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name || '',
      type: category.type || 'company',
      isRecurring: category.isRecurring !== undefined ? category.isRecurring : true,
      defaultFrequency: category.defaultFrequency || 'monthly',
      glAccount: category.glAccount || ''
    });
    setShowForm(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Handle delete
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"? This will also delete all associated overhead entries.`)) {
      return;
    }
    
    setLoading(true);
    setErrorMessage('');
    try {
      await ApiService.deleteOverheadCategory(id);
      setSuccessMessage(`Category "${name}" deleted successfully!`);
      await loadCategories(true);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting category:', error);
      setErrorMessage('Failed to delete category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (category) => {
    try {
      const updatedData = {
        ...category,
        isActive: !category.isActive
      };
      await ApiService.updateOverheadCategory(category.id, updatedData);
      await loadCategories(true);
      setSuccessMessage(`Category "${category.name}" ${updatedData.isActive ? 'activated' : 'deactivated'}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error toggling category:', error);
      setErrorMessage('Failed to update category status.');
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      'company': '🏢 Company',
      'site': '📍 Site',
      'project': '📋 Project',
      'department': '🏛️ Department'
    };
    return types[type] || type;
  };

  const getFrequencyLabel = (frequency) => {
    const frequencies = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'yearly': 'Yearly'
    };
    return frequencies[frequency] || frequency;
  };

  const getStatusBadge = (isActive) => {
    if (isActive) {
      return (
        <span className="status-badge active">
          <Circle size={8} className="status-dot" fill="#22c55e" /> Active
        </span>
      );
    } else {
      return (
        <span className="status-badge inactive">
          <Circle size={8} className="status-dot" fill="#ef4444" /> Inactive
        </span>
      );
    }
  };

  return (
    <div className="overhead-categories-manager">
      <div className="categories-header">
        <div className="title-section">
          <h2>
            <Tag size={24} /> Overhead Categories
          </h2>
          <p className="subtitle">
            Manage categories for monthly overhead expenses
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} /> New Category
          </button>
          <button
            onClick={() => loadCategories(false)}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <Check size={20} />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="error-message">
          <AlertCircle size={20} />
          {errorMessage}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="categories-form">
          <div className="form-header">
            <h3>
              {editingId ? '✏️ Edit Category' : '📝 New Category'}
            </h3>
            <button 
              onClick={() => { setShowForm(false); resetForm(); }} 
              className="close-btn"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <span className="label-icon">
                    <Tag size={16} /> Category Name *
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Rent, Utilities, Salaries"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <span className="label-icon">
                    <Building2 size={16} /> Type
                  </span>
                </label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="company">🏢 Company</option>
                  <option value="site">📍 Site</option>
                  <option value="project">📋 Project</option>
                  <option value="department">🏛️ Department</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-icon">
                    <Clock size={16} /> Frequency
                  </span>
                </label>
                <select
                  value={formData.defaultFrequency}
                  onChange={e => setFormData({ ...formData, defaultFrequency: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <span className="label-icon">
                    <DollarSign size={16} /> GL Account
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.glAccount}
                  onChange={e => setFormData({ ...formData, glAccount: e.target.value })}
                  placeholder="e.g., 5000, 6000"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                />
                <span>Recurring Expense</span>
                <span className="hint">(This category repeats regularly)</span>
              </label>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                disabled={loading} 
                className="btn-primary"
              >
                <Save size={18} /> {loading ? 'Saving...' : (editingId ? 'Update Category' : 'Create Category')}
              </button>
              <button 
                type="button" 
                onClick={() => { setShowForm(false); resetForm(); }} 
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Table */}
      <div className="table-container">
        {loading && !showForm && (
          <div className="loading-state">
            <RefreshCw size={32} className="spinner" />
            <p>Loading categories...</p>
          </div>
        )}

        {!loading && localCategories.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No Categories Found</h3>
            <p>Create your first overhead category to get started.</p>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="btn-primary"
              style={{ display: 'inline-flex', marginTop: '12px' }}
            >
              <Plus size={18} /> Add Category
            </button>
          </div>
        )}

        {!loading && localCategories.length > 0 && (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Frequency</th>
                  <th>GL Account</th>
                  <th className="center">Status</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {localCategories.map((category, index) => (
                  <tr 
                    key={category.id} 
                    className={!category.isActive ? 'inactive' : ''}
                  >
                    <td className="category-name">
                      {category.name}
                    </td>
                    <td className="category-type">
                      {getTypeLabel(category.type)}
                    </td>
                    <td>
                      <span className="frequency-badge">
                        <Calendar size={12} />
                        {getFrequencyLabel(category.defaultFrequency)}
                      </span>
                    </td>
                    <td className="gl-account">
                      {category.glAccount || '-'}
                    </td>
                    <td className="center">
                      {getStatusBadge(category.isActive)}
                    </td>
                    <td className="center">
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleToggleActive(category)} 
                          className={`btn-toggle ${category.isActive ? 'deactivate' : 'activate'}`}
                        >
                          {category.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleEdit(category)} 
                          className="btn-action"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(category.id, category.name)} 
                          className="btn-action delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverheadCategoriesManager;