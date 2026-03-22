import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
  const { user, token } = useAuth();
  const [brands, setBrands] = useState([]);
  const [currentBrand, setCurrentBrand] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchBrands = useCallback(async () => {
    // Get token directly from localStorage as fallback
    const authToken = token || localStorage.getItem('labrand_token');
    if (!authToken) return [];
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/brands`, {
        headers: { Authorization: `Bearer ${authToken}` },
        withCredentials: true
      });
      const brandsList = response.data || [];
      setBrands(brandsList);
      // Auto-select first brand if none selected or current brand is not in list
      if (brandsList.length > 0) {
        const savedBrandId = localStorage.getItem('labrand_current_brand');
        const saved = savedBrandId ? brandsList.find(b => b.brand_id === savedBrandId) : null;
        const currentInList = currentBrand ? brandsList.find(b => b.brand_id === currentBrand.brand_id) : null;
        if (!currentInList) {
          setCurrentBrand(saved || brandsList[0]);
        }
      }
      return brandsList;
    } catch (error) {
      console.error('[BrandContext] fetchBrands error:', error?.response?.status);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token, currentBrand]);

  // Force refresh brands (used after accepting invites)
  const refreshBrands = useCallback(async () => {
    hasFetchedRef.current = false;
    return fetchBrands();
  }, [fetchBrands]);

  // AUTO-FETCH: Load brands whenever user is authenticated
  useEffect(() => {
    const authToken = token || localStorage.getItem('labrand_token');
    if (user && authToken && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchBrands();
    }
    // Reset when user logs out
    if (!user && !authToken) {
      hasFetchedRef.current = false;
      setBrands([]);
      setCurrentBrand(null);
    }
  }, [user, token, fetchBrands]);

  // Persist selected brand
  const handleSetCurrentBrand = useCallback((brand) => {
    setCurrentBrand(brand);
    if (brand?.brand_id) {
      localStorage.setItem('labrand_current_brand', brand.brand_id);
    }
  }, []);

  const getHeaders = useCallback(() => {
    const authToken = token || localStorage.getItem('labrand_token');
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }, [token]);

  const fetchBrand = useCallback(async (brandId) => {
    try {
      const response = await axios.get(`${API}/brands/${brandId}`, {
        headers: getHeaders(),
        withCredentials: true
      });
      setCurrentBrand(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching brand:', error);
      return null;
    }
  }, [getHeaders]);

  const createBrand = async (brandData) => {
    const response = await axios.post(`${API}/brands`, brandData, {
      headers: getHeaders(),
      withCredentials: true
    });
    setBrands(prev => [...prev, response.data]);
    return response.data;
  };

  const updateBrand = async (brandId, brandData) => {
    const response = await axios.put(`${API}/brands/${brandId}`, brandData, {
      headers: getHeaders(),
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
        headers: getHeaders(),
        withCredentials: true
      });
      setMetrics(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return null;
    }
  }, [getHeaders]);

  // Pillar operations
  const fetchPillar = async (brandId, pillarName) => {
    const response = await axios.get(`${API}/brands/${brandId}/pillars/${pillarName}`, {
      headers: getHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const updatePillar = async (brandId, pillarName, data) => {
    const response = await axios.put(`${API}/brands/${brandId}/pillars/${pillarName}`, data, {
      headers: getHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  // Task operations
  const fetchTasks = async (brandId) => {
    const response = await axios.get(`${API}/brands/${brandId}/tasks`, {
      headers: getHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const createTask = async (brandId, taskData) => {
    const response = await axios.post(`${API}/brands/${brandId}/tasks`, taskData, {
      headers: getHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const updateTask = async (brandId, taskId, taskData) => {
    const response = await axios.put(`${API}/brands/${brandId}/tasks/${taskId}`, taskData, {
      headers: getHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const deleteTask = async (brandId, taskId) => {
    await axios.delete(`${API}/brands/${brandId}/tasks/${taskId}`, {
      headers: getHeaders(),
      withCredentials: true
    });
  };

  // Decision operations
  const fetchDecisions = async (brandId) => {
    const response = await axios.get(`${API}/brands/${brandId}/decisions`, {
      headers: getHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const createDecision = async (brandId, decisionData) => {
    const response = await axios.post(`${API}/brands/${brandId}/decisions`, decisionData, {
      headers: getHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const updateDecision = async (brandId, decisionId, decisionData) => {
    const response = await axios.put(`${API}/brands/${brandId}/decisions/${decisionId}`, decisionData, {
      headers: getHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  // Narrative operations
  const fetchNarratives = async (brandId) => {
    const response = await axios.get(`${API}/brands/${brandId}/narratives`, {
      headers: getHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const createNarrative = async (brandId, narrativeData) => {
    const response = await axios.post(`${API}/brands/${brandId}/narratives`, narrativeData, {
      headers: getHeaders(),
      withCredentials: true
    });
    return response.data;
  };

  const updateNarrative = async (brandId, narrativeId, narrativeData) => {
    const response = await axios.put(`${API}/brands/${brandId}/narratives/${narrativeId}`, narrativeData, {
      headers: getHeaders(),
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
      headers: getHeaders(),
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
      refreshBrands,
      fetchBrand,
      createBrand,
      updateBrand,
      setCurrentBrand: handleSetCurrentBrand,
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
