// src/hooks/useMaterials.js
import { useState, useEffect, useCallback, useRef } from 'react';
import ApiService from '../services/ApiService';

/**
 * Isolated hook for materials from the inventory backend.
 * Renames backend fields to match what BOM.jsx expects.
 */
const useMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadedRef = useRef(false);

  // Backend → frontend field name mapping
  const normalize = useCallback((m) => ({
    ...m,
    category: m.category || m.categoryName || 'Construction',
    supplier: m.supplier || m.supplierName || '',
  }), []);

  const fetchMaterials = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getMaterials(filters);
      const list = Array.isArray(data) ? data : [];
      setMaterials(list.map(normalize));
      loadedRef.current = true;
    } catch (err) {
      console.error('[useMaterials] fetch failed:', err);
      setError(err.message || 'Failed to load materials');
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [normalize]);

  useEffect(() => {
    if (!loadedRef.current) fetchMaterials();
  }, [fetchMaterials]);

  const addMaterial = useCallback(async (payload) => {
    const created = await ApiService.createMaterial(payload);
    const normalized = normalize(created);
    setMaterials(prev => [normalized, ...prev]);
    return normalized;
  }, [normalize]);

  const updateMaterial = useCallback(async (id, patch) => {
    const updated = await ApiService.updateMaterial(id, patch);
    const normalized = normalize(updated);
    setMaterials(prev => prev.map(m => m.id === id ? normalized : m));
    return normalized;
  }, [normalize]);

  const deleteMaterial = useCallback(async (id) => {
    await ApiService.deleteMaterial(id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  }, []);

  return {
    materials,
    loading,
    error,
    refresh: fetchMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
  };
};

export default useMaterials;