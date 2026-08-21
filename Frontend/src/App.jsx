import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import LandingPage from './features/public/LandingPage';

const RoleSelection = lazy(() => import('./features/public/RoleSelection'));
const SignupForm = lazy(() => import('./features/public/SignupForm'));
const LoginForm = lazy(() => import('./features/public/LoginForm'));

const BrandDashboard = lazy(() => import('./features/brand/BrandDashboard'));
const DiscoverySearch = lazy(() => import('./features/brand/DiscoverySearch'));
const CreatorDetailPage = lazy(() => import('./features/brand/CreatorDetailPage'));
const CampaignBuilder = lazy(() => import('./features/brand/CampaignBuilder'));
const BrandAIAssistant = lazy(() => import('./features/brand/BrandAIAssistant'));
const Shortlist = lazy(() => import('./features/brand/Shortlist'));

const InfluencerDashboard = lazy(() => import('./features/influencer/InfluencerDashboard'));
const AIContentAssistant = lazy(() => import('./features/influencer/AIContentAssistant'));
const CampaignFeed = lazy(() => import('./features/influencer/CampaignFeed'));
const PublicCampaigns = lazy(() => import('./features/influencer/PublicCampaigns'));
const InvitationDetail = lazy(() => import('./features/influencer/InvitationDetail'));

const VerificationQueue = lazy(() => import('./features/admin/VerificationQueue'));

// Lightweight loading fallback
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: 'var(--color-on-surface-variant)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: '3px solid var(--color-surface-container-high)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      Loading...
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ProtectedRoute = ({ allowedRole, children }) => {
  const { user, authReady } = useAuth();
  if (!authReady) return <PageLoader />;
  if (!user) return <Navigate to="/role-select" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" replace />;
  return children;
};

const App = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Landing page renders standalone with its own nav — no AppLayout */}
      <Route path="/" element={<LandingPage />} />

      <Route element={<AppLayout />}>
        {/* === PUBLIC === */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/role-select" element={<RoleSelection />} />
        <Route path="/signup/:role" element={<SignupForm />} />

        {/* === BRAND === */}
        <Route path="/brand/dashboard" element={<ProtectedRoute allowedRole="brand"><BrandDashboard /></ProtectedRoute>} />
        <Route path="/brand/search" element={<ProtectedRoute allowedRole="brand"><DiscoverySearch /></ProtectedRoute>} />
        <Route path="/brand/creator/:id" element={<ProtectedRoute allowedRole="brand"><CreatorDetailPage /></ProtectedRoute>} />
        <Route path="/brand/campaigns/new" element={<ProtectedRoute allowedRole="brand"><CampaignBuilder /></ProtectedRoute>} />
        <Route path="/brand/shortlist" element={<ProtectedRoute allowedRole="brand"><Shortlist /></ProtectedRoute>} />
        <Route path="/brand/ai-assistant" element={<ProtectedRoute allowedRole="brand"><BrandAIAssistant /></ProtectedRoute>} />

        {/* === INFLUENCER === */}
        <Route path="/influencer/dashboard" element={<ProtectedRoute allowedRole="influencer"><InfluencerDashboard /></ProtectedRoute>} />
        <Route path="/influencer/ai-assistant" element={<ProtectedRoute allowedRole="influencer"><AIContentAssistant /></ProtectedRoute>} />
        <Route path="/influencer/invitations" element={<ProtectedRoute allowedRole="influencer"><CampaignFeed /></ProtectedRoute>} />
        <Route path="/influencer/invitations/:id" element={<ProtectedRoute allowedRole="influencer"><InvitationDetail /></ProtectedRoute>} />
        <Route path="/influencer/campaigns" element={<ProtectedRoute allowedRole="influencer"><PublicCampaigns /></ProtectedRoute>} />
        <Route path="/influencer/analytics" element={<ProtectedRoute allowedRole="influencer"><InfluencerDashboard /></ProtectedRoute>} />

        {/* === ADMIN === */}
        <Route path="/admin/queue" element={<ProtectedRoute allowedRole="admin"><VerificationQueue /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </Suspense>
);


export default App;
