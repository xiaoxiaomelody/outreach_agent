import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase"; 
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

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
      setError(err.message);
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
