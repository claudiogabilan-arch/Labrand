import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BrandProvider } from "./contexts/BrandContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MainLayout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthCallback } from "./components/AuthCallback";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PermissionProvider } from "./contexts/PermissionContext";
import { WhiteLabelProvider } from "./contexts/WhiteLabelContext";

// ── EAGER imports — auth/onboarding pages stay in the main bundle so the
// first interaction (login) is instant. Everything else is code-split.
import LoginPage from "./components/LoginPage";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import AcceptInvite from "./pages/AcceptInvite";
import "./App.css";

// ── LAZY imports — every authenticated page becomes its own chunk.
// React will fetch the JS file the first time the user hits the route.
const Dashboard               = lazy(() => import("./pages/Dashboard"));
const NewBrand                = lazy(() => import("./pages/NewBrand"));
const PillarStart             = lazy(() => import("./pages/PillarStart"));
const PillarValues            = lazy(() => import("./pages/PillarValues"));
const PillarPurpose           = lazy(() => import("./pages/PillarPurpose"));
const PillarPromise           = lazy(() => import("./pages/PillarPromise"));
const PillarPositioning       = lazy(() => import("./pages/PillarPositioning"));
const PillarPersonality       = lazy(() => import("./pages/PillarPersonality"));
const PillarUniversality      = lazy(() => import("./pages/PillarUniversality"));
const Planning                = lazy(() => import("./pages/Planning"));
const Scorecard               = lazy(() => import("./pages/Scorecard"));
const Narratives              = lazy(() => import("./pages/Narratives"));
const Intelligence            = lazy(() => import("./pages/Intelligence"));
const Settings                = lazy(() => import("./pages/Settings"));
const Reports                 = lazy(() => import("./pages/Reports"));
const Onboarding              = lazy(() => import("./pages/Onboarding"));
const ExecutiveDashboard      = lazy(() => import("./pages/ExecutiveDashboard"));
const Benchmark               = lazy(() => import("./pages/Benchmark"));
const Simulator               = lazy(() => import("./pages/Simulator"));
const Audience                = lazy(() => import("./pages/Audience"));
const Campaigns               = lazy(() => import("./pages/Campaigns"));
const BrandIdentity           = lazy(() => import("./pages/BrandIdentity"));
const InvestmentMatch         = lazy(() => import("./pages/InvestmentMatch"));
const BrandWay                = lazy(() => import("./pages/BrandWay"));
const BrandRisk               = lazy(() => import("./pages/BrandRisk"));
const CompetitorAnalysis      = lazy(() => import("./pages/CompetitorAnalysis"));
const ConsistencyAlerts       = lazy(() => import("./pages/ConsistencyAlerts"));
const GoogleIntegration       = lazy(() => import("./pages/GoogleIntegration"));
const MaturityDiagnosis       = lazy(() => import("./pages/MaturityDiagnosis"));
const AICredits               = lazy(() => import("./pages/AICredits"));
const AdminDashboard          = lazy(() => import("./pages/AdminDashboard"));
const Touchpoints             = lazy(() => import("./pages/Touchpoints"));
const CRMIntegration          = lazy(() => import("./pages/CRMIntegration"));
const Naming                  = lazy(() => import("./pages/Naming"));
const AdsIntegration          = lazy(() => import("./pages/AdsIntegration"));
const BrandTools              = lazy(() => import("./pages/BrandTools"));
const BrandTracking           = lazy(() => import("./pages/BrandTracking"));
const DisasterCheck           = lazy(() => import("./pages/DisasterCheck"));
const ValueWaves              = lazy(() => import("./pages/ValueWaves"));
const BrandFunnel             = lazy(() => import("./pages/BrandFunnel"));
const BrandHealth             = lazy(() => import("./pages/BrandHealth"));
const Integrations            = lazy(() => import("./pages/Integrations"));
const SocialListening         = lazy(() => import("./pages/SocialListening"));
const ShareOfVoice            = lazy(() => import("./pages/ShareOfVoice"));
const ConversionAttributes    = lazy(() => import("./pages/ConversionAttributes"));
const BVS                     = lazy(() => import("./pages/BVS"));
const BrandMindmap            = lazy(() => import("./pages/BrandMindmap"));
const Culture                 = lazy(() => import("./pages/Culture"));
const Academy                 = lazy(() => import("./pages/Academy"));
const Collaboration           = lazy(() => import("./pages/Collaboration"));
const ClickUpCallback         = lazy(() => import("./pages/ClickUpCallback"));
const BrandJourney            = lazy(() => import("./pages/BrandJourney"));
const BrandValuation          = lazy(() => import("./pages/BrandValuation"));
const BrandArchitecture       = lazy(() => import("./pages/BrandArchitecture"));
const BrandHistory            = lazy(() => import("./pages/BrandHistory"));
const BrandCompare            = lazy(() => import("./pages/BrandCompare"));
const Endomarketing           = lazy(() => import("./pages/Endomarketing"));

const RouteFallback = () => (
  <div className="p-8" data-testid="route-suspense-fallback">
    <div className="animate-pulse text-muted-foreground text-sm">Carregando…</div>
  </div>
);

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
  }, [location, setUser, setToken]);

  // Check URL fragment for session_id (OAuth callback)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
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
          <Route path="/history" element={<AppPage><BrandHistory /></AppPage>} />
          <Route path="/compare" element={<AppPage><BrandCompare /></AppPage>} />
          <Route path="/endomarketing" element={<AppPage><Endomarketing /></AppPage>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
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
