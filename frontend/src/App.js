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
import "./App.css";

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
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/brands/new"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <NewBrand />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pillars/start"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <PillarStart />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pillars/values"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <PillarValues />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pillars/purpose"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <PillarPurpose />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pillars/promise"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <PillarPromise />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pillars/positioning"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <PillarPositioning />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pillars/personality"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <PillarPersonality />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pillars/universality"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <PillarUniversality />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/intelligence"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Intelligence />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audience"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Audience />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/planning"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Planning />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/campaigns"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Campaigns />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/scorecard"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Scorecard />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/narratives"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Narratives />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Reports />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Settings />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/valuation"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Valuation />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/executive"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <ExecutiveDashboard />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/benchmark"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Benchmark />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/simulator"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Simulator />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/identity"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <BrandIdentity />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/investment"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <InvestmentMatch />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand-way"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <BrandWay />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand-risk"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <BrandRisk />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/competitors"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <CompetitorAnalysis />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consistency"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <ConsistencyAlerts />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/google-integration"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <GoogleIntegration />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/maturity"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <MaturityDiagnosis />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-credits"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <AICredits />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <AdminDashboard />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/touchpoints"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Touchpoints />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <CRMIntegration />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/naming"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Naming />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ads"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <AdsIntegration />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand-tools"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <BrandTools />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand-tracking"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <BrandTracking />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/disaster-check"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <DisasterCheck />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/value-waves"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <ValueWaves />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand-funnel"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <BrandFunnel />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand-health"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <BrandHealth />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/integrations"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Integrations />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/social-listening"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <SocialListening />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/share-of-voice"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <ShareOfVoice />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/conversion-attributes"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <ConversionAttributes />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bvs"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <BVS />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mindmap"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <BrandMindmap />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/culture"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Culture />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/academy"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Academy />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/collaboration"
        element={
          <ProtectedRoute>
            <BrandProvider>
              <MainLayout>
                <Collaboration />
              </MainLayout>
            </BrandProvider>
          </ProtectedRoute>
        }
      />
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
