import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const { user, loading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);

  useEffect(() => {
    // If user data was passed from AuthCallback, skip auth check
    if (location.state?.user) {
      setIsAuthenticated(true);
      return;
    }

    if (!loading) {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      }
    }
  }, [user, loading, navigate, location.state]);

  if (loading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
};

export default ProtectedRoute;
