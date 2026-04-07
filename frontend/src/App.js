import React from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BrandProvider } from "./contexts/BrandContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MainLayout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthCallback } from "./components/AuthCallback";
import NotFound from "./pages/NotFound";
import LoginPage from "./components/LoginPage";
import Dashboard from "./pages/Dashboard";
import NewBrand from "./pages/NewBrand";
import PillarStart from "./pages/PillarStart";
import PillarValues from "./pages/PillarValues";
import PillarPurpose from "./pages/PillarPurpose";
import PillarPromise from "./pages/PillarPromise";
import PillarPositioning from "./pages/PillarPositioning";
import PillarPersonality from "./pages/PillarPersonality";
import PillarUniversality from "./pages/PillarUniversality";
import Planning from "./pages/Planning";
import Scorecard from "./pages/Scorecard";
import Narratives from "./pages/Narratives";
import Intelligence from "./pages/Intelligence";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Valuation from "./pages/Valuation";
import Onboarding from "./pages/Onboarding";
import VerifyEmail from "./pages/VerifyEmail";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import Benchmark from "./pages/Benchmark";
import Simulator from "./pages/Simulator";
import Audience from "./pages/Audience";
import Campaigns from "./pages/Campaigns";
import BrandIdentity from "./pages/BrandIdentity";
import InvestmentMatch from "./pages/InvestmentMatch";
import ResetPassword from "./pages/ResetPassword";
import BrandWay from "./pages/BrandWay";
import BrandRisk from "./pages/BrandRisk";
import CompetitorAnalysis from "./pages/CompetitorAnalysis";
import ConsistencyAlerts from "./pages/ConsistencyAlerts";
import GoogleIntegration from "./pages/GoogleIntegration";
import MaturityDiagnosis from "./pages/MaturityDiagnosis";
import AICredits from "./pages/AICredits";
import AdminDashboard from "./pages/AdminDashboard";
import Touchpoints from "./pages/Touchpoints";
import CRMIntegration from "./pages/CRMIntegration";
import Naming from "./pages/Naming";
import AdsIntegration from "./pages/AdsIntegration";
import BrandTools from "./pages/BrandTools";
import AcceptInvite from "./pages/AcceptInvite";
import BrandTracking from "./pages/BrandTracking";
import DisasterCheck from "./pages/DisasterCheck";
import ValueWaves from "./pages/ValueWaves";
import BrandFunnel from "./pages/BrandFunnel";
import BrandHealth from "./pages/BrandHealth";
import Integrations from "./pages/Integrations";
import SocialListening from "./pages/SocialListening";
import ShareOfVoice from "./pages/ShareOfVoice";
import ConversionAttributes from "./pages/ConversionAttributes";
import BVS from "./pages/BVS";
import BrandMindmap from "./pages/BrandMindmap";
import Culture from "./pages/Culture";
import Academy from "./pages/Academy";
import Collaboration from "./pages/Collaboration";
import ClickUpCallback from "./pages/ClickUpCallback";
import BrandJourney from "./pages/BrandJourney";
import BrandValuation from "./pages/BrandValuation";
import BrandArchitecture from "./pages/BrandArchitecture";
import { PermissionProvider } from "./contexts/PermissionContext";
import { WhiteLabelProvider } from "./contexts/WhiteLabelContext";
import "./App.css";

// Wrapper that adds BrandProvider + PermissionProvider + WhiteLabelProvider + MainLayout
function AppPage({ children }) {
  return (
    <ProtectedRoute>
      <BrandProvider>
        <PermissionProvider>
          <WhiteLabelProvider>
            <MainLayout>{children}</MainLayout>
          </WhiteLabelProvider>
        </PermissionProvider>
      </BrandProvider>
    </ProtectedRoute>
  );
}

// Router wrapper to handle auth callback
function AppRouter() {
  const location = useLocation();
  const { setUser, setToken } = useAuth();
  
  // Check URL for token from Google OAuth callback
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('labrand_token', token);
      setToken(token);
      // Remove token from URL
      window.history.replaceState({}, '', location.pathname);
    }

    // Intercept ClickUp OAuth callback (?code=...&state=...)
    const clickupCode = params.get('code');
    const clickupState = params.get('state');
    if (clickupCode && clickupState && !location.pathname.includes('/integracoes/clickup/callback')) {
      window.location.href = `/integracoes/clickup/callback?code=${clickupCode}&state=${clickupState}`;
    }
  }, [location]);
  
  // Check URL fragment for session_id (OAuth callback)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/invite/:token" element={<AcceptInvite />} />
      <Route path="/integracoes/clickup/callback" element={<ProtectedRoute><ClickUpCallback /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/dashboard" element={<AppPage><Dashboard /></AppPage>} />
      <Route path="/brands/new" element={<AppPage><NewBrand /></AppPage>} />
      <Route path="/pillars/start" element={<AppPage><PillarStart /></AppPage>} />
      <Route path="/pillars/values" element={<AppPage><PillarValues /></AppPage>} />
      <Route path="/pillars/purpose" element={<AppPage><PillarPurpose /></AppPage>} />
      <Route path="/pillars/promise" element={<AppPage><PillarPromise /></AppPage>} />
      <Route path="/pillars/positioning" element={<AppPage><PillarPositioning /></AppPage>} />
      <Route path="/pillars/personality" element={<AppPage><PillarPersonality /></AppPage>} />
      <Route path="/pillars/universality" element={<AppPage><PillarUniversality /></AppPage>} />
      <Route path="/intelligence" element={<AppPage><Intelligence /></AppPage>} />
      <Route path="/audience" element={<AppPage><Audience /></AppPage>} />
      <Route path="/planning" element={<AppPage><Planning /></AppPage>} />
      <Route path="/campaigns" element={<AppPage><Campaigns /></AppPage>} />
      <Route path="/scorecard" element={<AppPage><Scorecard /></AppPage>} />
      <Route path="/narratives" element={<AppPage><Narratives /></AppPage>} />
      <Route path="/reports" element={<AppPage><Reports /></AppPage>} />
      <Route path="/settings" element={<AppPage><Settings /></AppPage>} />
      <Route path="/valuation" element={<AppPage><BrandValuation /></AppPage>} />
      <Route path="/executive" element={<AppPage><ExecutiveDashboard /></AppPage>} />
      <Route path="/benchmark" element={<AppPage><Benchmark /></AppPage>} />
      <Route path="/simulator" element={<AppPage><Simulator /></AppPage>} />
      <Route path="/identity" element={<AppPage><BrandIdentity /></AppPage>} />
      <Route path="/investment" element={<AppPage><InvestmentMatch /></AppPage>} />
      <Route path="/brand-way" element={<AppPage><BrandWay /></AppPage>} />
      <Route path="/brand-risk" element={<AppPage><BrandRisk /></AppPage>} />
      <Route path="/competitors" element={<AppPage><CompetitorAnalysis /></AppPage>} />
      <Route path="/consistency" element={<AppPage><ConsistencyAlerts /></AppPage>} />
      <Route path="/google-integration" element={<AppPage><GoogleIntegration /></AppPage>} />
      <Route path="/maturity" element={<AppPage><MaturityDiagnosis /></AppPage>} />
      <Route path="/ai-credits" element={<AppPage><AICredits /></AppPage>} />
      <Route path="/admin" element={<AppPage><AdminDashboard /></AppPage>} />
      <Route path="/touchpoints" element={<AppPage><Touchpoints /></AppPage>} />
      <Route path="/crm" element={<AppPage><CRMIntegration /></AppPage>} />
      <Route path="/naming" element={<AppPage><Naming /></AppPage>} />
      <Route path="/ads" element={<AppPage><AdsIntegration /></AppPage>} />
      <Route path="/brand-tools" element={<AppPage><BrandTools /></AppPage>} />
      <Route path="/brand-tracking" element={<AppPage><BrandTracking /></AppPage>} />
      <Route path="/disaster-check" element={<AppPage><DisasterCheck /></AppPage>} />
      <Route path="/value-waves" element={<AppPage><ValueWaves /></AppPage>} />
      <Route path="/brand-funnel" element={<AppPage><BrandFunnel /></AppPage>} />
      <Route path="/brand-health" element={<AppPage><BrandHealth /></AppPage>} />
      <Route path="/integrations" element={<AppPage><Integrations /></AppPage>} />
      <Route path="/social-listening" element={<AppPage><SocialListening /></AppPage>} />
      <Route path="/share-of-voice" element={<AppPage><ShareOfVoice /></AppPage>} />
      <Route path="/conversion-attributes" element={<AppPage><ConversionAttributes /></AppPage>} />
      <Route path="/bvs" element={<AppPage><BVS /></AppPage>} />
      <Route path="/mindmap" element={<AppPage><BrandMindmap /></AppPage>} />
      <Route path="/journey" element={<AppPage><BrandJourney /></AppPage>} />
      <Route path="/brand-architecture" element={<AppPage><BrandArchitecture /></AppPage>} />
      <Route path="/culture" element={<AppPage><Culture /></AppPage>} />
      <Route path="/academy" element={<AppPage><Academy /></AppPage>} />
      <Route path="/collaboration" element={<AppPage><Collaboration /></AppPage>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
              <AppRouter />
          </AuthProvider>
        </BrowserRouter>
        <Toaster 
          position="bottom-right" 
          richColors 
          closeButton
          toastOptions={{
            className: 'font-sans'
          }}
        />
      </ThemeProvider>
    </div>
  );
}

export default App;
