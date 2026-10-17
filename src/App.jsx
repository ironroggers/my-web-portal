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
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import ProfilePage from "./components/ProfilePage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import HotoPage from "./components/hotoPage/hotoPage";
import SurveysPage from "./components/SurveysPage";
import LocationDetailsPage from "./components/LocationDetailsPage";
import HotoDetailsPage from "./components/HotoDetailsPage";
import LocationSectionsPage from "./components/LocationSectionsPage";
import SubsectionsPage from "./components/SubsectionsPage";
import TrenchingPage from "./components/TrenchingPage";
import SummaryManager from "./components/summary/SummaryManager";
import BlockProfilesPage from "./components/blockProfile/BlockProfilesPage";
import BlockProfileFormPage from "./components/blockProfile/BlockProfileFormPage";
import BlockProfileDetailPage from "./components/blockProfile/BlockProfileDetailPage";

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
                    <SubsectionsPage />
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
              {/* Redirect any unknown routes to dashboard */}
              <Route
                path="*"
                element={<Navigate to="/dashboard" replace />}
              />
            </Routes>
          </AppLayout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
