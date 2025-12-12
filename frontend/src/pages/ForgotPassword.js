import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase"; 
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

/**
 * Convert Firebase error messages to user-friendly messages for password reset
 * @param {string} errorMessage - The Firebase error message
 * @returns {string} User-friendly error message
 */
const getUserFriendlyPasswordResetError = (errorMessage) => {
  if (!errorMessage) {
    return "Unable to send password reset email. Please try again.";
  }

  const errorLower = errorMessage.toLowerCase();

  // User not found
  if (errorLower.includes("user-not-found") || errorLower.includes("there is no user record")) {
    return "No account found with this email address. Please check your email or sign up.";
  }

  // Invalid email
  if (errorLower.includes("invalid-email") || errorLower.includes("malformed")) {
    return "Please enter a valid email address.";
  }

  // Network error
  if (errorLower.includes("network") || errorLower.includes("network-request-failed")) {
    return "Network error. Please check your internet connection and try again.";
  }

  // Too many requests
  if (errorLower.includes("too-many-requests") || errorLower.includes("too many")) {
    return "Too many password reset attempts. Please try again later.";
  }

  // Default fallback
  return "Unable to send password reset email. Please check your email address and try again.";
};

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("A password reset link has been sent to your email.");
    } catch (err) {
      const friendlyError = getUserFriendlyPasswordResetError(err.message);
      setError(friendlyError);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-hero">

          <h1 className="login-title">Reset your password</h1>

          <form onSubmit={handleReset} className="login-form">
            <div className="form-group">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-submit">
              Send Reset Link
            </button>
          </form>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <div
            className="forgot-password-link"
            style={{ marginTop: "20px" }}
            onClick={() => navigate("/")}
          >
            Back to Sign In
          </div>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
