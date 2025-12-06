import React, { useState } from "react";
import "../styles/ProfilePage.css";

const AccountSettings = () => {
  return (
    <div className="profile-pane">
      <h2>Account Settings</h2>
      <p className="muted">
        Manage your account settings such as changing your password.
      </p>
      <ChangePasswordForm />
    </div>
  );
};

const ChangePasswordForm = () => {
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
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
          />
        </label>
        <label>
          Confirm new
          <input
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
          />
        </label>
      </div>
      <div className="settings-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving..." : "Change password"}
        </button>
        <button type="button" className="btn" onClick={reset}>
          Reset
        </button>
      </div>
    </form>
  );
};

export default AccountSettings;
