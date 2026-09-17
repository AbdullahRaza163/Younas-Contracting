// src/hooks/useClientInvoices.js
import { useState, useEffect, useCallback, useRef } from 'react';
import ApiService from '../services/ApiService';

/**
 * useClientInvoices
 *
 * ⭐ NEW: accepts optional `onLoaderStart(label)` and `onLoaderEnd()` callbacks.
 * These let the hook trigger the app-wide global loader (from useData) without
 * coupling to any specific context.
 *
 * Usage (from ClientInvoicesManager):
 *   useClientInvoices({ onLoaderStart: showLoader, onLoaderEnd: hideLoader })
 *
 * Usage standalone (no loader):
 *   useClientInvoices()
 */
const useClientInvoices = ({ onLoaderStart, onLoaderEnd } = {}) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasLoadedRef = useRef(false);
  const loaderCountRef = useRef(0);

  // ⭐ Wrap an async function with loader start/end.
  // Uses a local counter so overlapping operations don't hide early.
  const withLoader = useCallback(async (label, fn) => {
    loaderCountRef.current += 1;
    if (typeof onLoaderStart === 'function') {
      onLoaderStart(label);
    }
    try {
      return await fn();
    } finally {
      loaderCountRef.current = Math.max(0, loaderCountRef.current - 1);
      if (loaderCountRef.current === 0 && typeof onLoaderEnd === 'function') {
        onLoaderEnd();
      }
    }
  }, [onLoaderStart, onLoaderEnd]);

  // ---------- FETCH ----------
  const fetchInvoices = useCallback(async (filters = {}, { showLoader = true } = {}) => {
    setLoading(true);
    setError(null);

    const run = async () => {
      const data = await ApiService.getClientInvoices(filters);
      setInvoices(Array.isArray(data) ? data : []);
      hasLoadedRef.current = true;
    };

    try {
      if (showLoader) {
        await withLoader('Loading client invoices…', run);
      } else {
        await run();
      }
    } catch (err) {
      console.error('[useClientInvoices] fetch failed:', err);
      setError(err.message || 'Failed to load client invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [withLoader]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      fetchInvoices({}, { showLoader: true });
    }
  }, [fetchInvoices]);

  // ---------- CREATE ----------
  const addInvoice = useCallback(async (invoice) => {
    const created = await withLoader('Saving client invoice…', () =>
      ApiService.createClientInvoice(invoice)
    );
    setInvoices(prev => [created, ...prev]);
    return created;
  }, [withLoader]);

  // ---------- UPDATE ----------
  const updateInvoice = useCallback(async (id, patch) => {
    const updated = await withLoader('Updating client invoice…', () =>
      ApiService.updateClientInvoice(id, patch)
    );
    setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv));
    return updated;
  }, [withLoader]);

  // ---------- DELETE ----------
  const deleteInvoice = useCallback(async (id) => {
    await withLoader('Deleting client invoice…', () =>
      ApiService.deleteClientInvoice(id)
    );
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  }, [withLoader]);

  // ---------- NEXT NUMBER ----------
  const getNextNumber = useCallback(async () => {
    try {
      const res = await ApiService.getNextClientInvoiceNumber();
      return res?.invoiceNumber || null;
    } catch {
      return null;
    }
  }, []);

  // ---------- RETURN ----------
  return {
    invoices,
    data: { invoices },   // shim so component reads same shape
    loading,
    error,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    refresh: fetchInvoices,
    getNextNumber,
  };
};

export default useClientInvoices;