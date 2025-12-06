import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/SearchPage";
import TemplatesPage from "./pages/TemplatesPage";
import MyListPage from "./pages/MyListPage";
import GmailConnection from "./pages/GmailConnection";
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

          {/* Protected Routes */}
          <Route
            path="/gmail-connection"
            element={
              <ProtectedRoute>
                <GmailConnection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
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
          {/* Legacy Dashboard route - redirect to search */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SearchPage />
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
