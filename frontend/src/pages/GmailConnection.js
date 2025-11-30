import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../config/authUtils";
import gmailApi from "../api/gmail";
import GmailConnectButton from "../components/email/GmailConnectButton";
import "../styles/GmailConnection.css";

/**
 * Gmail Connection Page
 * Automatically shown after signup to connect Gmail
 */
const GmailConnection = () => {
    const [user, setUser] = useState(null);
    const [gmailConnected, setGmailConnected] = useState(false);
    const [checking, setChecking] = useState(true);
    const [autoConnect, setAutoConnect] = useState(false);
    const connectButtonRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            checkGmailStatus();
            
            // Auto-trigger Gmail connection if this is a new signup
            const isNewSignup = sessionStorage.getItem("isNewSignup");
            if (isNewSignup === "true") {
                // Clear the flag
                sessionStorage.removeItem("isNewSignup");
                // Set flag to auto-connect after component renders
                setAutoConnect(true);
            }
        } else {
            navigate("/");
        }
    }, [navigate]);

    const checkGmailStatus = async () => {
        try {
            const result = await gmailApi.getGmailStatus();
            if (result.success && result.data.connected) {
                setGmailConnected(true);
                // If already connected, redirect to search after a short delay
                setTimeout(() => {
                    navigate("/search");
                }, 2000);
            }
        } catch (error) {
            console.error("Check Gmail status error:", error);
        } finally {
            setChecking(false);
        }
    };

    const handleGmailConnected = (connected) => {
        if (connected) {
            setGmailConnected(true);
            // Redirect to search after successful connection
            setTimeout(() => {
                navigate("/search");
            }, 1500);
        }
    };

    if (!user || checking) {
        return (
            <div className="gmail-connection-page">
                <div className="loading">Loading...</div>
            </div>
        );
    }

    if (gmailConnected) {
        return (
            <div className="gmail-connection-page">
                <div className="connection-success">
                    <div className="success-icon">✓</div>
                    <h2>Gmail Already Connected</h2>
                    <p>Your Gmail account is connected and ready to use.</p>
                    <p className="redirect-message">Redirecting you to the app...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="gmail-connection-page">
            <div className="connection-container">
                <div className="connection-header">
                    <h1>Connect Your Gmail</h1>
                    <p className="connection-subtitle">
                        To send emails, we need access to your Gmail account.
                        {autoConnect ? " Let's get you set up!" : " Please connect your account to continue."}
                    </p>
                </div>

                <div className="connection-content">
                    <div className="connection-benefits">
                        <h3>Why connect Gmail?</h3>
                        <ul>
                            <li>Send personalized outreach emails</li>
                            <li>Track your email campaigns</li>
                            <li>Manage your contacts efficiently</li>
                        </ul>
                    </div>

                    <div className="connection-action" ref={connectButtonRef}>
                        <GmailConnectButton 
                            onStatusChange={handleGmailConnected}
                            autoConnect={autoConnect}
                        />
                    </div>

                    <div className="connection-privacy">
                        <p>
                            <strong>Privacy & Security:</strong> We only request
                            permission to send emails on your behalf. We never
                            read your emails or access your personal data.
                        </p>
                    </div>
                </div>

                <div className="connection-skip">
                    <button
                        onClick={() => navigate("/search")}
                        className="skip-button">
                        Skip for now
                    </button>
                    <p className="skip-hint">
                        You can connect Gmail later from the settings
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GmailConnection;

