import React, { useState, useEffect } from "react";
import { gmailApi } from "../../api/gmail";
import { getGmailConnectionState } from "../../services/firestore.service";
import { getCurrentUser } from "../../config/authUtils";
import "./GmailConnectButton.css";
import Icon from "../icons/Icon";

/**
 * Gmail Connect Button Component
 * Allows user to connect/disconnect their Gmail account
 */
const GmailConnectButton = ({ onStatusChange, autoConnect = false }) => {
  const [connected, setConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkGmailStatus();
  }, []);

  // Auto-connect if requested (e.g., after new signup)
  useEffect(() => {
    if (autoConnect && !connected && !checking && !loading) {
      console.log("📧 [AUTO-CONNECT] Auto-triggering Gmail connection...");
      const timer = setTimeout(() => {
        handleConnect();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, connected, checking, loading]);

  const checkGmailStatus = async () => {
    setChecking(true);
    try {
      console.log("📧 [STATUS CHECK] Checking Gmail status...");
      
      // First try to get from Firestore directly (faster, no API call)
      const user = getCurrentUser();
      if (user?.uid) {
        try {
          const firestoreState = await getGmailConnectionState(user.uid);
          if (firestoreState.connected) {
            console.log("📧 [STATUS CHECK] Found in Firestore:", firestoreState);
            setConnected(firestoreState.connected);
            setGmailEmail(firestoreState.email || "");
            if (onStatusChange) {
              onStatusChange(firestoreState.connected);
            }
            setChecking(false);
            return;
          }
        } catch (firestoreError) {
          console.warn("📧 [STATUS CHECK] Firestore check failed, falling back to API:", firestoreError);
        }
      }
      
      // Fallback to API call (for backend verification)
      const result = await gmailApi.getGmailStatus();
      console.log("📧 [STATUS CHECK] Status result:", result);

      if (result.success) {
        console.log("📧 [STATUS CHECK] Status:", {
          connected: result.data.connected,
          email: result.data.email,
        });

        setConnected(result.data.connected);
        setGmailEmail(result.data.email || "");

        if (onStatusChange) {
          console.log(
            "📧 [STATUS CHECK] Calling onStatusChange with:",
            result.data.connected
          );
          onStatusChange(result.data.connected);
        } else {
          console.warn(
            "📧 [STATUS CHECK] onStatusChange callback not provided!"
          );
        }
      } else {
        console.error("📧 [STATUS CHECK] Status check failed:", result.error);
      }
    } catch (error) {
      console.error("📧 [STATUS CHECK] Error checking status:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const result = await gmailApi.connectGmail();

      if (result.success && result.data.authUrl) {
        // Open OAuth URL in popup window
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          result.data.authUrl,
          "Gmail OAuth",
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Method 1: Listen for postMessage from popup window
        const messageHandler = (event) => {
          if (event.data && event.data.type === "GMAIL_CONNECTED") {
            console.log("✅ [CONNECT] Received postMessage:", event.data.email);
            handleConnectionSuccess();
          }
        };

        window.addEventListener("message", messageHandler);

        // Method 2: Poll localStorage for connection status (fallback for Cross-Origin-Opener-Policy)
        let localStoragePollCount = 0;
        const localStoragePoll = setInterval(() => {
          try {
            const statusStr = localStorage.getItem("gmail_connection_status");
            if (statusStr) {
              const status = JSON.parse(statusStr);
              // Check if this is a recent connection (within last 10 seconds)
              if (status.connected && Date.now() - status.timestamp < 10000) {
                console.log(
                  "✅ [CONNECT] Found connection status in localStorage:",
                  status.email
                );
                clearInterval(localStoragePoll);
                localStorage.removeItem("gmail_connection_status"); // Clean up
                handleConnectionSuccess();
              }
            }
            localStoragePollCount++;
            // Stop polling after 10 seconds
            if (localStoragePollCount > 20) {
              clearInterval(localStoragePoll);
            }
          } catch (e) {
            console.warn("localStorage poll error:", e);
          }
        }, 500);

        // Method 3: Poll for popup close (final fallback)
        const pollTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollTimer);
            clearInterval(localStoragePoll);
            window.removeEventListener("message", messageHandler);
            console.log("📧 [CONNECT] Popup closed, checking status...");
            // Check status after popup closes with retries
            handleConnectionSuccess();
          }
        }, 500);

        // Helper function to handle connection success
        function handleConnectionSuccess() {
          clearInterval(pollTimer);
          clearInterval(localStoragePoll);
          window.removeEventListener("message", messageHandler);

          // Check status immediately and retry multiple times
          console.log("📧 [CONNECT] Checking Gmail status...");
          checkGmailStatus();
          setTimeout(() => {
            console.log("📧 [CONNECT] Retry 1: Checking status...");
            checkGmailStatus();
          }, 1000);
          setTimeout(() => {
            console.log("📧 [CONNECT] Retry 2: Checking status...");
            checkGmailStatus();
          }, 2500);
          setTimeout(() => {
            console.log("📧 [CONNECT] Retry 3: Checking status...");
            checkGmailStatus();
          }, 5000);
        }
      }
    } catch (error) {
      console.error("Connect Gmail error:", error);
      alert("Failed to connect Gmail: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Gmail?")) {
      return;
    }

    setLoading(true);
    try {
      const result = await gmailApi.disconnectGmail();
      if (result.success) {
        setConnected(false);
        setGmailEmail("");
        if (onStatusChange) {
          onStatusChange(false);
        }
        alert("Gmail disconnected successfully");
      }
    } catch (error) {
      console.error("Disconnect Gmail error:", error);
      alert("Failed to disconnect Gmail: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="gmail-connect-container">
        <div className="gmail-status checking">
          <span>Checking Gmail status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gmail-connect-container">
      {connected ? (
        <div className="gmail-connected">
          <div className="gmail-status connected">
            <span className="status-icon">
              <Icon name="check" />
            </span>
            <div className="status-text">
              <strong>Gmail Connected</strong>
              <p>{gmailEmail}</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="btn-disconnect"
          >
            {loading ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      ) : (
        <div className="gmail-not-connected">
          <div className="gmail-status not-connected">
            <span className="status-icon">
              <Icon name="mail" />
            </span>
            <div className="status-text">
              <strong>Gmail Not Connected</strong>
              <p>Connect to send emails</p>
            </div>
          </div>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="btn-connect"
          >
            {loading ? (
              "Connecting..."
            ) : (
              <>
                <Icon name="mail" style={{ marginRight: 8 }} /> Connect Gmail
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default GmailConnectButton;
