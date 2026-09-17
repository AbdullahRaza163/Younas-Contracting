// src/hooks/useUnits.js
import { useState, useEffect, useCallback, useRef } from 'react';
import ApiService from '../services/ApiService';

const useUnits = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasLoadedRef = useRef(false);

  const fetchUnits = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getUnits({ includeInactive: true, ...filters });
      setUnits(Array.isArray(data) ? data : []);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('[useUnits] fetch failed:', err);
      setError(err.message || 'Failed to load units');
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) fetchUnits();
  }, [fetchUnits]);

  const addUnit = useCallback(async (payload) => {
    const created = await ApiService.createUnit(payload);
    setUnits(prev => [...prev, created].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    return created;
  }, []);

  const updateUnit = useCallback(async (id, patch) => {
    const updated = await ApiService.updateUnit(id, patch);
    setUnits(prev => prev.map(u => u.id === id ? updated : u));
    return updated;
  }, []);

  const deleteUnit = useCallback(async (id) => {
    await ApiService.deleteUnit(id);
    setUnits(prev => prev.filter(u => u.id !== id));
  }, []);

  return {
    units,
    loading,
    error,
    addUnit,
    updateUnit,
    deleteUnit,
    refresh: fetchUnits,
  };
};

export default useUnits;