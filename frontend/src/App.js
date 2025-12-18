import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import SearchPage from "./pages/SearchPage";
import TemplatesPage from "./pages/TemplatesPage";
import MyListPage from "./pages/MyListPage";
import ProfileLayout from "./pages/ProfileLayout";
import ProfileInfo from "./pages/ProfileInfo";
import AccountSettings from "./pages/AccountSettings";
import Onboarding from "./pages/Onboarding";
import AccountSettingsOnboarding from "./pages/AccountSettingsOnboarding";
import JobAgentPage from "./pages/JobAgentPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ToastContainer from "./components/ui/ToastContainer";
import "./styles/App.css";

/**
 * Main App Component
 * Configures routing for the application
 */
function App() {
  return (
    <Router>
      <div className="App">
        <ToastContainer />
        <Routes>
          {/* Public Route - Login */}
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Protected Routes */}
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-agent"
            element={
              <ProtectedRoute>
                <JobAgentPage />
              </ProtectedRoute>
            }
          />
          {/* Mock pages removed - use real Search/Results pages */}
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <TemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-list"
            element={
              <ProtectedRoute>
                <MyListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/*"
            element={
              <ProtectedRoute>
                <ProfileLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ProfileInfo />} />
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="settings" element={<AccountSettings />} />
            <Route
              path="onboarding-settings"
              element={<AccountSettingsOnboarding />}
            />
          </Route>

          {/* Legacy Dashboard route - redirect to search */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />

          {/* Legacy Agent route - redirect to job-agent */}
          <Route
            path="/agent"
            element={
              <ProtectedRoute>
                <JobAgentPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback Route - Redirect to Login */}
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
