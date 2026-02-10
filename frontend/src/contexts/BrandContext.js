import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BrandContext = createContext(null);

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand deve ser usado dentro de BrandProvider');
  }
  return context;
};

export const BrandProvider = ({ children }) => {
  const { getAuthHeaders } = useAuth();
  const [brands, setBrands] = useState([]);
  const [currentBrand, setCurrentBrand] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/brands`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setBrands(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching brands:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchBrand = useCallback(async (brandId) => {
    try {
      const response = await axios.get(`${API}/brands/${brandId}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setCurrentBrand(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching brand:', error);
      return null;
    }
  }, [getAuthHeaders]);

  const createBrand = async (brandData) => {
    const response = await axios.post(`${API}/brands`, brandData, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    setBrands(prev => [...prev, response.data]);
    return response.data;
  };

  const updateBrand = async (brandId, brandData) => {
    const response = await axios.put(`${API}/brands/${brandId}`, brandData, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    setBrands(prev => prev.map(b => b.brand_id === brandId ? response.data : b));
    if (currentBrand?.brand_id === brandId) {
      setCurrentBrand(response.data);
    }
    return response.data;
  };

  const fetchMetrics = useCallback(async (brandId) => {
    try {
      const response = await axios.get(`${API}/brands/${brandId}/metrics`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setMetrics(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return null;
    }
  }, [getAuthHeaders]);

  // Pillar operations
  const fetchPillar = async (brandId, pillarName) => {
    const response = await axios.get(`${API}/brands/${brandId}/pillars/${pillarName}`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const updatePillar = async (brandId, pillarName, data) => {
    const response = await axios.put(`${API}/brands/${brandId}/pillars/${pillarName}`, data, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  // Task operations
  const fetchTasks = async (brandId) => {
    const response = await axios.get(`${API}/brands/${brandId}/tasks`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const createTask = async (brandId, taskData) => {
    const response = await axios.post(`${API}/brands/${brandId}/tasks`, taskData, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const updateTask = async (brandId, taskId, taskData) => {
    const response = await axios.put(`${API}/brands/${brandId}/tasks/${taskId}`, taskData, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const deleteTask = async (brandId, taskId) => {
    await axios.delete(`${API}/brands/${brandId}/tasks/${taskId}`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
  };

  // Decision operations
  const fetchDecisions = async (brandId) => {
    const response = await axios.get(`${API}/brands/${brandId}/decisions`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const createDecision = async (brandId, decisionData) => {
    const response = await axios.post(`${API}/brands/${brandId}/decisions`, decisionData, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const updateDecision = async (brandId, decisionId, decisionData) => {
    const response = await axios.put(`${API}/brands/${brandId}/decisions/${decisionId}`, decisionData, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  // Narrative operations
  const fetchNarratives = async (brandId) => {
    const response = await axios.get(`${API}/brands/${brandId}/narratives`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const createNarrative = async (brandId, narrativeData) => {
    const response = await axios.post(`${API}/brands/${brandId}/narratives`, narrativeData, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const updateNarrative = async (brandId, narrativeId, narrativeData) => {
    const response = await axios.put(`${API}/brands/${brandId}/narratives/${narrativeId}`, narrativeData, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  // AI Insights
  const generateInsight = async (context, pillar, brandName) => {
    const response = await axios.post(`${API}/ai/insights`, {
      context,
      pillar,
      brand_name: brandName
    }, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  return (
    <BrandContext.Provider value={{
      brands,
      currentBrand,
      metrics,
      loading,
      fetchBrands,
      fetchBrand,
      createBrand,
      updateBrand,
      setCurrentBrand,
      fetchMetrics,
      fetchPillar,
      updatePillar,
      fetchTasks,
      createTask,
      updateTask,
      deleteTask,
      fetchDecisions,
      createDecision,
      updateDecision,
      fetchNarratives,
      createNarrative,
      updateNarrative,
      generateInsight
    }}>
      {children}
    </BrandContext.Provider>
  );
};

export default BrandContext;
