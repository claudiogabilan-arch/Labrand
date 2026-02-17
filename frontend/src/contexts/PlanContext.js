import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlanContext = createContext();

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within PlanProvider');
  }
  return context;
};

export const PlanProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [planData, setPlanData] = useState({
    plan: 'free',
    plan_name: 'Grátis',
    in_trial: false,
    trial_ends_at: null,
    accessible_features: [],
    pro_features: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadPlanData();
    }
  }, [token]);

  const loadPlanData = async () => {
    try {
      const response = await axios.get(`${API}/user/feature-access`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlanData(response.data);
    } catch (error) {
      console.error('Error loading plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (featureId) => {
    if (planData.plan === 'enterprise') return true;
    if (planData.accessible_features.includes('all')) return true;
    return planData.accessible_features.includes(featureId);
  };

  const getMinPlan = (featureId) => {
    return planData.pro_features[featureId]?.min_plan || 'essencial';
  };

  const isPro = (featureId) => {
    return featureId in planData.pro_features;
  };

  return (
    <PlanContext.Provider value={{
      ...planData,
      loading,
      hasAccess,
      getMinPlan,
      isPro,
      refreshPlan: loadPlanData
    }}>
      {children}
    </PlanContext.Provider>
  );
};
