import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ProfilePage.css";
import GmailConnectButton from "../components/email/GmailConnectButton";

const AccountSettingsOnboarding = () => {
  const navigate = useNavigate();
  const [gmailConnected, setGmailConnected] = useState(false);

  return (
    <div className="profile-pane">
      <h2>Account Settings</h2>
      <p className="muted">
        A couple quick steps to connect your account (optional).
      </p>

      <section style={{ marginTop: 12 }}>
        <h3>Email</h3>
        <p className="muted">
          Connect your Gmail account to enable sending emails.
        </p>
        <GmailConnectButton onStatusChange={setGmailConnected} />
      </section>

      <div className="profile-actions" style={{ marginTop: 18 }}>
        <button
          className="btn btn-secondary"
          onClick={() => {
            try {
              localStorage.removeItem("isNewAccount");
            } catch (e) {}
            navigate("/profile");
          }}
        >
          Back to Profile
        </button>

        <button
          className="btn btn-primary btn-next"
          onClick={() => {
            try {
              localStorage.removeItem("isNewAccount");
            } catch (e) {}
            navigate("/search");
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AccountSettingsOnboarding;
