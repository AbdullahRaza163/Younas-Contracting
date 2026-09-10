import { useState, useCallback } from 'react';
import ApiService from '../services/ApiService';

const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (message, context) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService.chat(message, context);
      return response.reply;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendMessage, loading, error };
};

export default useAI;