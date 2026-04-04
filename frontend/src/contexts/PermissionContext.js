import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useBrand } from './BrandContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [myRole, setMyRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);

  const loadMyRole = useCallback(async () => {
    if (!currentBrand?.brand_id || !token) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/permissions/my-role/${currentBrand.brand_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyRole(res.data);
      setPermissions(res.data.permissions || {});
    } catch {
      setMyRole(null);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [currentBrand?.brand_id, token]);

  useEffect(() => { loadMyRole(); }, [loadMyRole]);

  const can = useCallback((module, minLevel = 'read') => {
    if (!myRole) return false;
    if (myRole.role === 'owner' || myRole.is_platform_admin) return true;
    const levelOrder = { read: 1, comment: 2, approve: 3, edit: 4, full: 5 };
    const userPerm = permissions[module];
    return (levelOrder[userPerm] || 0) >= (levelOrder[minLevel] || 1);
  }, [myRole, permissions]);

  const canEdit = useCallback((module) => can(module, 'edit'), [can]);
  const canFull = useCallback((module) => can(module, 'full'), [can]);
  const isOwner = myRole?.role === 'owner';
  const isAdmin = myRole?.is_platform_admin;
  const isAgency = myRole && ['owner', 'lider_projeto', 'editor', 'colaborador', 'visualizador'].includes(myRole.role);
  const isClient = myRole && ['cliente_admin', 'aprovador', 'convidado'].includes(myRole.role);

  return (
    <PermissionContext.Provider value={{
      myRole, permissions, loading, can, canEdit, canFull,
      isOwner, isAdmin, isAgency, isClient, refreshRole: loadMyRole,
      roleLabel: myRole?.label || '',
    }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}

export default PermissionContext;
