import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
} from "@mui/material";
import "./App.css";

// Components
import Navigation from "./components/Navigation";
import UserManagement from "./components/UserManagement";
import AttendancePage from "./components/AttendancePage";
import MapViewPage from "./components/mapViewPage/MapViewPage";
import FRTTracking from "./components/FRTTracking";
import HelpCenterPage from "./components/HelpCenterPage";
import AboutPage from "./components/AboutPage";
import LandingPage from "./components/LandingPage";
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

// Auth Provider
import { AuthProvider } from "./context/AuthContext";

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f5f7fa",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <div className="app-container">
            <Navigation />
            <Container className="content-container">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/help" element={<HelpCenterPage />} />
                <Route path="/about" element={<AboutPage />} />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <LandingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
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
            </Container>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
