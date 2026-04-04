import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useBrand } from './BrandContext';
import { useAuth } from './AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WhiteLabelContext = createContext(null);

// Convert hex color to HSL string for CSS variables
function hexToHSL(hex) {
  if (!hex) return null;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function WhiteLabelProvider({ children }) {
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!currentBrand?.brand_id || !token) {
      setConfig(null);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/white-label`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfig(res.data);
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [currentBrand?.brand_id, token]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  // Apply CSS variables when config changes
  useEffect(() => {
    const root = document.documentElement;
    if (config?.enabled) {
      if (config.primary_color) {
        const hsl = hexToHSL(config.primary_color);
        if (hsl) root.style.setProperty('--wl-primary', hsl);
      }
      if (config.accent_color) {
        const hsl = hexToHSL(config.accent_color);
        if (hsl) root.style.setProperty('--wl-accent', hsl);
      }
      if (config.sidebar_color) root.style.setProperty('--wl-sidebar-bg', config.sidebar_color);
      if (config.sidebar_text_color) root.style.setProperty('--wl-sidebar-text', config.sidebar_text_color);
      if (config.button_radius) root.style.setProperty('--wl-radius', config.button_radius);
    } else {
      // Remove custom properties to revert to defaults
      root.style.removeProperty('--wl-primary');
      root.style.removeProperty('--wl-accent');
      root.style.removeProperty('--wl-sidebar-bg');
      root.style.removeProperty('--wl-sidebar-text');
      root.style.removeProperty('--wl-radius');
    }
    return () => {
      root.style.removeProperty('--wl-primary');
      root.style.removeProperty('--wl-accent');
      root.style.removeProperty('--wl-sidebar-bg');
      root.style.removeProperty('--wl-sidebar-text');
      root.style.removeProperty('--wl-radius');
    };
  }, [config]);

  return (
    <WhiteLabelContext.Provider value={{ config, loading, refreshConfig: fetchConfig }}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel() {
  const ctx = useContext(WhiteLabelContext);
  if (!ctx) return { config: null, loading: false, refreshConfig: () => {} };
  return ctx;
}

export default WhiteLabelContext;
