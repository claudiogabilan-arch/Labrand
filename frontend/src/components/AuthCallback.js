import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const AuthCallback = () => {
  const { processOAuthSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (sessionIdMatch) {
          const sessionId = sessionIdMatch[1];
          const user = await processOAuthSession(sessionId);
          
          // Check if user has a pending invite to accept
          const pendingInvite = localStorage.getItem('pending_invite');
          if (pendingInvite) {
            navigate(`/invite/${pendingInvite}`, { replace: true });
          } else {
            navigate('/dashboard', { 
              replace: true, 
              state: { user } 
            });
          }
        } else {
          // No session_id found, redirect to login
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/login', { replace: true });
      }
    };

    processSession();
  }, [location.hash, processOAuthSession, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Processando autenticação...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
