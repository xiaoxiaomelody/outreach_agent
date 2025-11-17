import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { onAuthChange } from "../config/authUtils";

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for demo mode first
        const isDemoMode = sessionStorage.getItem("isDemoMode");
        if (isDemoMode === "true") {
            const demoUser = sessionStorage.getItem("demoUser");
            if (demoUser) {
                setUser(JSON.parse(demoUser));
                setLoading(false);
                return;
            }
        }

        // Subscribe to Firebase authentication state changes
        const unsubscribe = onAuthChange((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    fontSize: "1.5rem",
                }}>
                Loading...
            </div>
        );
    }

    return user ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
