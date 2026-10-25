import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import "./App.css";
import theme from "./theme/theme";

// Components
import AppLayout from "./components/layout/AppLayout";
import UserManagement from "./components/UserManagement";
import AttendancePage from "./components/AttendancePage";
import MapViewPage from "./components/mapViewPage/MapViewPage";
import FRTTracking from "./components/FRTTracking";
import HelpCenterPage from "./components/HelpCenterPage";
import AboutPage from "./components/AboutPage";
import { SUPPORT_PAGES_ENABLED } from "./config/featureFlags";
import LandingPage from "./components/LandingPage"; // Keep for backward compatibility
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import ExecutionDashboardPage from "./components/executionDashboard/ExecutionDashboardPage";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import ProfilePage from "./components/ProfilePage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import HotoPage from "./components/hotoPage/hotoPage";
import SurveysPage from "./components/SurveysPage";
import LocationDetailsPage from "./components/LocationDetailsPage";
import HotoDetailsPage from "./components/HotoDetailsPage";
import LocationSectionsPage from "./components/LocationSectionsPage";
import TrenchingPage from "./components/TrenchingPage";
import SummaryManager from "./components/summary/SummaryManager";
import BlockProfilesPage from "./components/blockProfile/BlockProfilesPage";
import MasterMapPage from "./components/masterMap/MasterMapPage";
import BlockProfileFormPage from "./components/blockProfile/BlockProfileFormPage";
import BlockProfileDetailPage from "./components/blockProfile/BlockProfileDetailPage";
// OFC execution
import SectionSubsectionsRoute from "./components/execution/pages/SectionSubsectionsRoute";
import InfraCapturePage from "./components/execution/pages/InfraCapturePage";
import InfraEquipmentPage from "./components/blockProfile/InfraEquipmentPage";
import SubsectionCreatePage from "./components/execution/pages/SubsectionCreatePage";
import SubsectionJobPage from "./components/execution/pages/SubsectionJobPage";
import ExecutionPointPage from "./components/execution/pages/ExecutionPointPage";
import RestorationPage from "./components/execution/pages/RestorationPage";
import RestorationItemPage from "./components/execution/pages/RestorationItemPage";
import MyWorkPage from "./components/execution/pages/MyWorkPage";
import ApprovalsPage from "./components/execution/pages/ApprovalsPage";
import { ToastHost } from "./components/execution/execUi";
import { GeoCameraHost } from "./components/execution/WebGeoCamera";

// Auth Provider
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppLayout>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              {SUPPORT_PAGES_ENABLED && <Route path="/help" element={<HelpCenterPage />} />}
              {SUPPORT_PAGES_ENABLED && <Route path="/about" element={<AboutPage />} />}

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/execution-dashboard"
                element={
                  <ProtectedRoute>
                    <ExecutionDashboardPage />
                  </ProtectedRoute>
                }
              />
              {/* Keep old dashboard accessible for backward compatibility */}
              <Route
                path="/old-dashboard"
                element={
                  <ProtectedRoute>
                    <LandingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/surveys"
                element={
                  <ProtectedRoute>
                    <SurveysPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute>
                    <AttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <MapViewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/summary"
                element={
                  <ProtectedRoute>
                    <SummaryManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/frt-tracking"
                element={
                  <ProtectedRoute>
                    <FRTTracking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hoto"
                element={
                  <ProtectedRoute>
                    <HotoPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/location/:locationId"
                element={
                  <ProtectedRoute>
                    <LocationDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hoto-details/:locationId"
                element={
                  <ProtectedRoute>
                    <HotoDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/location/:locationId/sections"
                element={
                  <ProtectedRoute>
                    <LocationSectionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/master-map"
                element={
                  <ProtectedRoute>
                    <MasterMapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/block-profiles"
                element={
                  <ProtectedRoute>
                    <BlockProfilesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/block-profiles/new"
                element={
                  <ProtectedRoute>
                    <BlockProfileFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/block-profiles/:blockProfileId/edit"
                element={
                  <ProtectedRoute>
                    <BlockProfileFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/block-profiles/:blockProfileId"
                element={
                  <ProtectedRoute>
                    <BlockProfileDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sections/:sectionId/subsections"
                element={
                  <ProtectedRoute>
                    <SectionSubsectionsRoute />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subsections/:subSectionId/trenching"
                element={
                  <ProtectedRoute>
                    <TrenchingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/block-profiles/:blockProfileId/infra"
                element={
                  <ProtectedRoute>
                    <InfraCapturePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/block-profiles/:blockProfileId/gps/:lgdCode/infra"
                element={
                  <ProtectedRoute>
                    <InfraCapturePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/block-profiles/:blockProfileId/equipment"
                element={
                  <ProtectedRoute>
                    <InfraEquipmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/block-profiles/:blockProfileId/equipment/:form"
                element={
                  <ProtectedRoute>
                    <InfraEquipmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/block-profiles/:blockProfileId/gps/:lgdCode/equipment/:form"
                element={
                  <ProtectedRoute>
                    <InfraEquipmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sections/:sectionId/subsections/new"
                element={
                  <ProtectedRoute>
                    <SubsectionCreatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subsections/:subSectionId"
                element={
                  <ProtectedRoute>
                    <SubsectionJobPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subsections/:subSectionId/start"
                element={
                  <ProtectedRoute>
                    <ExecutionPointPage which="start" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subsections/:subSectionId/end"
                element={
                  <ProtectedRoute>
                    <ExecutionPointPage which="end" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sections/:sectionId/restoration"
                element={
                  <ProtectedRoute>
                    <RestorationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sections/:sectionId/restoration/:subSectionId"
                element={
                  <ProtectedRoute>
                    <RestorationItemPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-work"
                element={
                  <ProtectedRoute>
                    <MyWorkPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute>
                    <ApprovalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals/subsections/:subSectionId"
                element={
                  <ProtectedRoute>
                    <SubsectionJobPage approvalView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals/restorations/:sectionId"
                element={
                  <ProtectedRoute>
                    <RestorationPage approvalView />
                  </ProtectedRoute>
                }
              />
              {/* Redirect any unknown routes to dashboard */}
              <Route
                path="*"
                element={<Navigate to="/dashboard" replace />}
              />
            </Routes>
          </AppLayout>
          <ToastHost />
          <GeoCameraHost />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
