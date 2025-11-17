import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logOut, getCurrentUser } from "../config/authUtils";
import "../styles/Dashboard.css";

/**
 * Dashboard Component
 * Protected page that displays user information after successful login
 */
const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Check for demo mode first
        const isDemoMode = sessionStorage.getItem("isDemoMode");
        if (isDemoMode) {
            const demoUser = JSON.parse(sessionStorage.getItem("demoUser"));
            setUser({ ...demoUser, isDemoMode: true });
            setLoading(false);
            return;
        }

        // Get current user from Firebase
        const currentUser = getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        } else {
            // If no user is logged in, redirect to login
            navigate("/");
        }
        setLoading(false);
    }, [navigate]);

    /**
     * Handle user logout
     */
    const handleLogout = async () => {
        // Clear demo mode
        sessionStorage.removeItem("isDemoMode");
        sessionStorage.removeItem("demoUser");

        // If using Firebase, sign out
        const result = await logOut();
        if (result.success || result.error) {
            console.log("Logged out successfully");
            navigate("/");
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect to login
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>WeKruit Dashboard</h1>
                    <button onClick={handleLogout} className="btn btn-logout">
                        Logout
                    </button>
                </div>
            </div>

            <div className="dashboard-content">
                {user.isDemoMode && (
                    <div className="demo-mode-banner">
                        <h3>🔧 Local Demo Mode</h3>
                        <p>
                            You're running the <strong>frontend only</strong>{" "}
                            without a backend. This is perfect for learning and
                            testing the UI!
                        </p>
                        <div className="mode-comparison">
                            <div className="mode-box current">
                                <h4>✅ Current Mode: Local Demo</h4>
                                <ul>
                                    <li>Frontend works perfectly</li>
                                    <li>Mock data for testing</li>
                                    <li>No backend needed</li>
                                    <li>Great for learning UI!</li>
                                </ul>
                            </div>
                            <div className="mode-box future">
                                <h4>🚀 Future: Cloud Function Mode</h4>
                                <ul>
                                    <li>Real backend API</li>
                                    <li>Actual data processing</li>
                                    <li>Database integration</li>
                                    <li>Production-ready!</li>
                                </ul>
                            </div>
                        </div>
                        <p className="next-steps-text">
                            <strong>Ready for backend?</strong> See{" "}
                            <code>CLOUD_FUNCTIONS_INTEGRATION.md</code> to
                            connect to Cloud Functions!
                        </p>
                    </div>
                )}

                <div className="welcome-card">
                    <h2>Welcome back! 👋</h2>
                    <p className="user-email">{user.email}</p>
                    {user.isDemoMode && (
                        <span className="demo-badge">🔧 Local Demo Mode</span>
                    )}
                    {!user.isDemoMode && (
                        <span className="cloud-badge">
                            ☁️ Cloud Function Mode
                        </span>
                    )}
                </div>

                <div className="info-grid">
                    <div className="info-card">
                        <h3>User Information</h3>
                        <div className="info-item">
                            <label>User ID:</label>
                            <span className="user-id">{user.uid}</span>
                        </div>
                        <div className="info-item">
                            <label>Email:</label>
                            <span>{user.email}</span>
                        </div>
                        <div className="info-item">
                            <label>Email Verified:</label>
                            <span
                                className={
                                    user.emailVerified
                                        ? "verified"
                                        : "not-verified"
                                }>
                                {user.emailVerified
                                    ? "✓ Verified"
                                    : "✗ Not Verified"}
                            </span>
                        </div>
                        <div className="info-item">
                            <label>Account Created:</label>
                            <span>
                                {new Date(
                                    user.metadata.creationTime
                                ).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="info-item">
                            <label>Last Sign In:</label>
                            <span>
                                {new Date(
                                    user.metadata.lastSignInTime
                                ).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="info-card">
                        <h3>Quick Actions</h3>
                        <div className="actions-list">
                            <button className="action-button">
                                📊 View Analytics
                            </button>
                            <button className="action-button">
                                ⚙️ Settings
                            </button>
                            <button className="action-button">
                                👤 Edit Profile
                            </button>
                            <button className="action-button">
                                📝 Create New Project
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
