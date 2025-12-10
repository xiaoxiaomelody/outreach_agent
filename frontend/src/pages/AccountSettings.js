import React, { useState, useEffect } from "react";
import "../styles/ProfilePage.css";
import GmailConnectButton from "../components/email/GmailConnectButton";
import { getCurrentUser } from "../config/authUtils";

const AccountSettings = () => {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [isGoogleOnly, setIsGoogleOnly] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (u && u.providerData && Array.isArray(u.providerData)) {
      const providerIds = u.providerData.map((p) => p.providerId);
      // If the user has no 'password' provider, but has 'google.com', treat as Google-only
      const hasPassword = providerIds.includes("password");
      const hasGoogle = providerIds.includes("google.com");
      setIsGoogleOnly(hasGoogle && !hasPassword);
    }
  }, []);

  return (
    <div className="profile-pane">
      <h2>Account Settings</h2>
      <p className="muted">
        Manage your account settings such as changing your password.
      </p>

      <section style={{ marginTop: 12 }}>
        <h3>Email</h3>
        <p className="muted">
          Connect or disconnect your Gmail account used to send emails.
        </p>
        <GmailConnectButton onStatusChange={setGmailConnected} />
      </section>

      <hr style={{ margin: "20px 0" }} />

      <ChangePasswordForm isDisabled={isGoogleOnly} />
    </div>
  );
};

const ChangePasswordForm = ({ isDisabled = false }) => {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
  };
  const showToast = (message, type = "info") => {
    try {
      window.dispatchEvent(
        new CustomEvent("app-toast", {
          detail: { message, type, duration: 4000 },
        })
      );
    } catch (err) {}
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (isDisabled) {
      showToast(
        "Password changes are disabled for Google sign-in users",
        "warning"
      );
      return;
    }
    if (!currentPwd || !newPwd || !confirmPwd) {
      showToast("Please fill all password fields", "warning");
      return;
    }
    if (newPwd !== confirmPwd) {
      showToast("New password and confirmation do not match", "warning");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      reset();
      showToast("Password changed (mock)", "info");
    }, 800);
  };

  return (
    <form className="change-password" onSubmit={handleChangePassword}>
      <div className="password-row">
        <label>
          Current password
          <input
            type="password"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            disabled={isDisabled}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            disabled={isDisabled}
          />
        </label>
        <label>
          Confirm new
          <input
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            disabled={isDisabled}
          />
        </label>
      </div>
      {isDisabled && (
        <div className="muted" style={{ marginBottom: 12 }}>
          You signed in with Google-only authentication. Password management is
          disabled.
        </div>
      )}
      <div className="settings-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || isDisabled}
        >
          {submitting ? "Saving..." : "Change password"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={reset}
          disabled={isDisabled}
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export default AccountSettings;
