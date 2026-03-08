import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const LabelContext = createContext(null);

export function LabelProvider({ children }) {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchLabels = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await api.get('/labels');
      setLabels(response.data.labels);
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const createLabel = async (name, color) => {
    const response = await api.post('/labels', { name, color });
    const newLabel = response.data.label;
    setLabels((prev) => [newLabel, ...prev]);
    return newLabel;
  };

  const updateLabel = async (id, data) => {
    const response = await api.put(`/labels/${id}`, data);
    const updatedLabel = response.data.label;
    setLabels((prev) => prev.map((l) => (l.id === id ? updatedLabel : l)));
    return updatedLabel;
  };

  const deleteLabel = async (id) => {
    await api.delete(`/labels/${id}`);
    setLabels((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <LabelContext.Provider
      value={{
        labels,
        loading,
        createLabel,
        updateLabel,
        deleteLabel,
        fetchLabels,
      }}
    >
      {children}
    </LabelContext.Provider>
  );
}

export function useLabels() {
  const context = useContext(LabelContext);
  if (!context) {
    throw new Error('useLabels must be used within a LabelProvider');
  }
  return context;
}
