import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import "./styles/App.css";

/**
 * Main App Component
 * Configures routing for the application
 */
function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    {/* Public Route - Login */}
                    <Route path="/" element={<Login />} />

                    {/* Protected Route - Dashboard */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
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
