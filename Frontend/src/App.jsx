import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';

// Public pages
import LandingPage from './features/public/LandingPage';
import RoleSelection from './features/public/RoleSelection';
import SignupForm from './features/public/SignupForm';
import LoginForm from './features/public/LoginForm';

// Brand pages
import BrandDashboard from './features/brand/BrandDashboard';
import DiscoverySearch from './features/brand/DiscoverySearch';
import CreatorDetailPage from './features/brand/CreatorDetailPage';
import CampaignBuilder from './features/brand/CampaignBuilder';
import BrandCampaigns from './features/brand/BrandCampaigns';
import BrandAIAssistant from './features/brand/BrandAIAssistant';
import Shortlist from './features/brand/Shortlist';

// Influencer pages
import InfluencerDashboard from './features/influencer/InfluencerDashboard';
import AIContentAssistant from './features/influencer/AIContentAssistant';
import CampaignFeed from './features/influencer/CampaignFeed';
import PublicCampaigns from './features/influencer/PublicCampaigns';
import InvitationDetail from './features/influencer/InvitationDetail';

// Admin pages
import VerificationQueue from './features/admin/VerificationQueue';

/**
 * Protected route — redirects if no user or wrong role
 */
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/role-select" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" replace />;
  return children;
};

const App = () => (
  <Routes>
    {/* === PUBLIC === */}
    <Route element={<AppLayout />}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/role-select" element={<RoleSelection />} />
      <Route path="/signup/:role" element={<SignupForm />} />

      {/* === BRAND === */}
      <Route path="/brand/dashboard" element={
        <ProtectedRoute allowedRole="brand"><BrandDashboard /></ProtectedRoute>
      } />
      <Route path="/brand/search" element={
        <ProtectedRoute allowedRole="brand"><DiscoverySearch /></ProtectedRoute>
      } />
      <Route path="/brand/creator/:id" element={
        <ProtectedRoute allowedRole="brand"><CreatorDetailPage /></ProtectedRoute>
      } />
      <Route path="/brand/campaigns/new" element={
        <ProtectedRoute allowedRole="brand"><CampaignBuilder /></ProtectedRoute>
      } />
      <Route path="/brand/campaigns" element={
        <ProtectedRoute allowedRole="brand"><BrandCampaigns /></ProtectedRoute>
      } />
      <Route path="/brand/shortlist" element={
        <ProtectedRoute allowedRole="brand"><Shortlist /></ProtectedRoute>
      } />
      <Route path="/brand/ai-assistant" element={
        <ProtectedRoute allowedRole="brand"><BrandAIAssistant /></ProtectedRoute>
      } />

      {/* === INFLUENCER === */}
      <Route path="/influencer/dashboard" element={
        <ProtectedRoute allowedRole="influencer"><InfluencerDashboard /></ProtectedRoute>
      } />
      <Route path="/influencer/ai-assistant" element={
        <ProtectedRoute allowedRole="influencer"><AIContentAssistant /></ProtectedRoute>
      } />
      <Route path="/influencer/invitations" element={
        <ProtectedRoute allowedRole="influencer"><CampaignFeed /></ProtectedRoute>
      } />
      <Route path="/influencer/invitations/:id" element={
        <ProtectedRoute allowedRole="influencer"><InvitationDetail /></ProtectedRoute>
      } />
      <Route path="/influencer/campaigns" element={
        <ProtectedRoute allowedRole="influencer"><PublicCampaigns /></ProtectedRoute>
      } />
      <Route path="/influencer/analytics" element={
        <ProtectedRoute allowedRole="influencer"><InfluencerDashboard /></ProtectedRoute>
      } />

      {/* === ADMIN === */}
      <Route path="/admin/queue" element={
        <ProtectedRoute allowedRole="admin"><VerificationQueue /></ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

export default App;
