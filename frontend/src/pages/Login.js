import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    signInWithEmail,
    signUpWithEmail,
    demoLogin,
} from "../config/authUtils";
import "../styles/Login.css";

/**
 * Login Component
 * Handles user authentication with email/password and Google sign-in
 */
const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    /**
     * Handle form submission for email/password authentication
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Validation
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        if (isSignUp && password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            let result;
            if (isSignUp) {
                result = await signUpWithEmail(email, password);
            } else {
                result = await signInWithEmail(email, password);
            }

            // If Firebase not configured, use demo mode
            if (
                !result.success &&
                result.error?.includes("Firebase not configured")
            ) {
                console.log("🔧 Firebase not configured - using DEMO mode");
                result = await demoLogin(email, password);
            }

            if (result.success) {
                console.log("Authentication successful:", result.user);
                // Store demo mode flag
                if (result.isDemoMode) {
                    sessionStorage.setItem("isDemoMode", "true");
                    sessionStorage.setItem(
                        "demoUser",
                        JSON.stringify(result.user)
                    );
                }
                navigate("/dashboard");
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError("An unexpected error occurred");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Toggle between sign-in and sign-up modes
     */
    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setError("");
        setPassword("");
        setConfirmPassword("");
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>WeKruit</h1>
                    <h2>{isSignUp ? "Create Account" : "Welcome Back"}</h2>
                    <p>
                        {isSignUp
                            ? "Sign up to get started"
                            : "Sign in to continue"}
                    </p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            disabled={loading}
                            required
                        />
                    </div>

                    {isSignUp && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                placeholder="Confirm your password"
                                disabled={loading}
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}>
                        {loading
                            ? "Processing..."
                            : isSignUp
                            ? "Sign Up"
                            : "Sign In"}
                    </button>
                </form>

                <div className="toggle-mode">
                    <p>
                        {isSignUp
                            ? "Already have an account?"
                            : "Don't have an account?"}{" "}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="link-button"
                            disabled={loading}>
                            {isSignUp ? "Sign In" : "Sign Up"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
