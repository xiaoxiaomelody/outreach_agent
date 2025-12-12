import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ProfilePage.css";
import GmailConnectButton from "../components/email/GmailConnectButton";
import { getCurrentUser } from "../config/authUtils";
import { getUserProfile } from "../services/firestore.service";

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

  // detect minimal profile stored in Firestore (onboarding)
  const [isNewAccount, setIsNewAccount] = useState(false);
  useEffect(() => {
    const checkProfile = async () => {
      const user = getCurrentUser();
      if (!user?.uid) {
        setIsNewAccount(true);
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        const isNew =
          !profile.name &&
          !profile.email &&
          !profile.school &&
          !(profile.resumeName || "") &&
          (!profile.industries || profile.industries.length === 0);
        setIsNewAccount(isNew);
      } catch (err) {
        console.error("Error checking profile:", err);
        setIsNewAccount(false);
      }
    };

    checkProfile();
  }, []);
  const navigate = useNavigate();

  return (
    <div className="profile-pane">
      <h2>Account Settings</h2>
      <p className="muted">Manage your account settings.</p>

      <section style={{ marginTop: 12 }}>
        <h3>Email</h3>
        <p className="muted">
          Connect or disconnect your Gmail account used to send emails.
        </p>
        <GmailConnectButton onStatusChange={setGmailConnected} />
      </section>

      {isNewAccount && (
        <div style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              try {
                localStorage.removeItem("isNewAccount");
              } catch (e) {}
              navigate("/search");
            }}
          >
            Continue to Search
          </button>
        </div>
      )}
    </div>
  );
};

// ChangePasswordForm removed per request

export default AccountSettings;
