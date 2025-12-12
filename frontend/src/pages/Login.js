import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmail,
  signUpWithEmail,
  demoLogin,
} from "../config/authUtils";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import "../styles/Login.css";

/**
 * Convert Firebase error messages to user-friendly messages
 * @param {string} errorMessage - The Firebase error message
 * @param {string} errorCode - The Firebase error code (e.g., "auth/invalid-credential")
 * @param {boolean} isSignUp - Whether this is a sign-up attempt
 * @returns {string} User-friendly error message
 */
const getUserFriendlyError = (
  errorMessage,
  errorCode = null,
  isSignUp = false
) => {
  if (!errorMessage && !errorCode) {
    return "An error occurred. Please try again.";
  }

  // Use error code if available (more reliable than parsing message)
  if (errorCode) {
    const codeLower = errorCode.toLowerCase();

    // Email already in use (sign up only)
    if (codeLower === "auth/email-already-in-use") {
      return "This email is already registered. Please sign in instead.";
    }

    // User not found (sign in only)
    if (!isSignUp && codeLower === "auth/user-not-found") {
      return "You have not signed up yet. Please sign up first.";
    }

    // Invalid credential - handle differently for signup vs signin
    if (codeLower === "auth/invalid-credential") {
      if (isSignUp) {
        // During signup, invalid-credential usually means invalid email format or other credential issue
        return "Unable to create account. Please check that your email address is valid and try again.";
      } else {
        // During signin, invalid-credential means wrong password or user doesn't exist
        // Check if user exists first - if not, suggest signup
        return "Incorrect email or password. If you haven't signed up yet, please click 'Sign up' to create an account.";
      }
    }

    // Wrong password (sign in only) - separate from invalid-credential
    if (!isSignUp && codeLower === "auth/wrong-password") {
      return "Incorrect password. Please try again.";
    }

    // Invalid email
    if (codeLower === "auth/invalid-email") {
      return "Please enter a valid email address.";
    }

    // Weak password
    if (codeLower === "auth/weak-password") {
      return "Password is too weak. Please use a stronger password.";
    }

    // Too many requests
    if (codeLower === "auth/too-many-requests") {
      return "Too many failed attempts. Please try again later.";
    }

    // Network error
    if (codeLower === "auth/network-request-failed") {
      return "Network error. Please check your internet connection and try again.";
    }

    // User disabled
    if (codeLower === "auth/user-disabled") {
      return "This account has been disabled. Please contact support.";
    }

    // Operation not allowed
    if (codeLower === "auth/operation-not-allowed") {
      return "This sign-in method is not enabled. Please try a different method.";
    }
  }

  // Fallback to parsing message if code not available
  const errorLower = errorMessage ? errorMessage.toLowerCase() : "";

  // Email already in use (sign up only) - check this first
  if (
    errorLower.includes("email-already-in-use") ||
    errorLower.includes("already exists")
  ) {
    return "This email is already registered. Please sign in instead.";
  }

  // During signup, handle credential errors first (before password errors)
  if (isSignUp) {
    if (
      errorLower.includes("invalid-credential") ||
      errorLower.includes("invalid email") ||
      errorLower.includes("malformed")
    ) {
      return "Please enter a valid email address and try again.";
    }
    // During signup, don't show password errors unless it's specifically a weak password
    if (
      errorLower.includes("weak-password") ||
      errorLower.includes("password should be at least")
    ) {
      return "Password is too weak. Please use a stronger password.";
    }
    // For any other signup error, show a generic signup message
    return "Unable to create account. Please check your email and password and try again.";
  }

  // Sign-in specific errors (only reached if !isSignUp)
  if (
    errorLower.includes("user-not-found") ||
    errorLower.includes("there is no user record")
  ) {
    return "You have not signed up yet. Please sign up first.";
  }

  // Wrong password (sign in only)
  if (
    errorLower.includes("wrong-password") ||
    errorLower.includes("invalid-credential") ||
    errorLower.includes("password is invalid")
  ) {
    return "Incorrect password. Please try again.";
  }

  // Invalid email
  if (
    errorLower.includes("invalid-email") ||
    errorLower.includes("malformed")
  ) {
    return "Please enter a valid email address.";
  }

  // Weak password
  if (
    errorLower.includes("weak-password") ||
    errorLower.includes("password should be at least")
  ) {
    return "Password is too weak. Please use a stronger password.";
  }

  // Too many requests
  if (
    errorLower.includes("too-many-requests") ||
    errorLower.includes("too many")
  ) {
    return "Too many failed attempts. Please try again later.";
  }

  // Network error
  if (
    errorLower.includes("network") ||
    errorLower.includes("network-request-failed")
  ) {
    return "Network error. Please check your internet connection and try again.";
  }

  // User disabled
  if (errorLower.includes("user-disabled")) {
    return "This account has been disabled. Please contact support.";
  }

  // Operation not allowed
  if (errorLower.includes("operation-not-allowed")) {
    return "This sign-in method is not enabled. Please try a different method.";
  }

  // Default fallback - return a context-aware generic message
  if (isSignUp) {
    return "Unable to create account. Please check your email and password and try again.";
  }
  return "Unable to sign in. Please check your email and password and try again.";
};

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
          sessionStorage.setItem("demoUser", JSON.stringify(result.user));
        }

        // If this was a sign-up, mark onboarding in localStorage so profile/account
        // pages can show the Continue flow even if no local profile exists yet.
        try {
          if (isSignUp) localStorage.setItem("isNewAccount", "true");
        } catch (e) {
          /* ignore */
        }

        // Redirect new sign-ups to onboarding (nested under /profile)
        if (isSignUp) navigate("/profile/onboarding");
        else navigate("/profile");
      } else {
        // Convert Firebase error to user-friendly message
        // Log for debugging - capture current isSignUp state
        const currentIsSignUp = isSignUp;
        console.log("Auth error:", {
          error: result.error,
          errorCode: result.errorCode,
          isSignUp: currentIsSignUp,
          stateIsSignUp: isSignUp,
        });
        const friendlyError = getUserFriendlyError(
          result.error,
          result.errorCode,
          currentIsSignUp
        );
        setError(friendlyError);
      }
    } catch (err) {
      // Convert any unexpected errors to user-friendly messages
      const friendlyError = getUserFriendlyError(
        err.message,
        err.code,
        isSignUp
      );
      setError(
        friendlyError || "An unexpected error occurred. Please try again."
      );
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
    <div className="login-page">
      <div className="login-container">
        <div className="login-hero">
          <h1 className="login-title">Say hello to better networking.</h1>

          <div className="login-actions">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError("");
              }}
              className={`action-btn ${isSignUp ? "primary" : "secondary"}`}
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError("");
              }}
              className={`action-btn ${!isSignUp ? "primary" : "secondary"}`}
            >
              Sign in
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={loading}
                required
              />
            </div>

            {!isSignUp && (
              <div className="forgot-password-container">
                <span
                  className="forgot-password-link"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </span>
              </div>
            )}

            {isSignUp && (
              <div className="form-group">
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  disabled={loading}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-submit"
              disabled={loading}
              style={{
                opacity: 1,
                visibility: "visible",
                position: "relative",
                zIndex: 20000,
              }}
            >
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
};

export default Login;
