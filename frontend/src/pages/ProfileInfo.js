import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ProfilePage.css";
import { getCurrentUser } from "../config/authUtils";
import { createOrUpdateUserProfile } from "../services/firestore.service";

const defaultProfile = {
  name: "",
  email: "",
  school: "",
  industries: [],
  resumeName: "",
  resumeData: "",
};

const industryOptions = [
  "Tech",
  "Finance",
  "Medicine",
  "Education",
  "Design",
  "Consulting",
  "Other",
];

const ProfileInfo = () => {
  const [profile, setProfile] = useState(defaultProfile);
  const [savedProfile, setSavedProfile] = useState(defaultProfile);
  const saveTimer = React.useRef(null);
  const initialLoad = React.useRef(true);
  const lastSavingToast = React.useRef(0);

  const maybeShowSavingToast = () => {
    const now = Date.now();
    if (now - lastSavingToast.current < 700) return; // throttle
    lastSavingToast.current = now;
    try {
      window.dispatchEvent(
        new CustomEvent("app-toast", {
          detail: { message: "Saving...", type: "info", duration: 1000 },
        })
      );
    } catch (err) {}
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userProfile");
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfile(parsed);
        setSavedProfile(parsed);
      }
    } catch (err) {
      /* ignore */
    }
  }, []);

  // Autosave profile when it changes (debounced)
  React.useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem("userProfile", JSON.stringify(profile));
        setSavedProfile(profile);
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: { message: "Profile saved", type: "info", duration: 1200 },
          })
        );
      } catch (err) {
        /* ignore */
      }

      // sync to backend if authenticated
      try {
        const u = getCurrentUser();
        if (u && u.uid) {
          const userData = {
            email: profile.email || u.email || "",
            displayName: profile.name || u.displayName || "",
            profile: {
              name: profile.name || "",
              email: profile.email || "",
              school: profile.school || "",
              industries: profile.industries || [],
              resumeName: profile.resumeName || "",
            },
          };
          createOrUpdateUserProfile(u.uid, userData).catch((err) => {
            console.error("Failed to sync profile to backend:", err);
          });
        }
      } catch (err) {
        console.warn("Profile sync skipped - no authenticated user", err);
      }
    }, 800);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [profile]);

  const handleChange = (key, value) =>
    setProfile((p) => ({ ...p, [key]: value }));
  maybeShowSavingToast();

  const toggleIndustry = (name) => {
    setProfile((p) => {
      const next = { ...p };
      next.industries = next.industries || [];
      if (next.industries.includes(name))
        next.industries = next.industries.filter((i) => i !== name);
      else next.industries = [...next.industries, name];
      return next;
    });
    maybeShowSavingToast();
  };

  // Autosave replaces explicit save/edit flow; allow cancel to restore last saved state
  const handleCancel = () => {
    setProfile(savedProfile || defaultProfile);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target.result;
      setProfile((p) => ({ ...p, resumeName: file.name, resumeData: data }));
      maybeShowSavingToast();
    };
    reader.readAsDataURL(file);
  };

  const removeResume = (e) => {
    e.preventDefault();
    setProfile((p) => ({ ...p, resumeName: "", resumeData: "" }));
  };

  return (
    <div className="profile-pane">
      <h2>My Profile</h2>
      {/* Onboarding continue: show when profile is essentially empty */}
      {(() => {
        const isNew =
          !profile.name &&
          !profile.email &&
          !profile.school &&
          !(profile.resumeName || "") &&
          (!profile.industries || profile.industries.length === 0);
        return isNew ? (
          <div style={{ marginTop: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                try {
                  // navigate to account settings
                  // Clear onboarding flag and navigate to settings
                  try {
                    localStorage.removeItem("isNewAccount");
                  } catch (e) {}
                  (window.location.pathname.startsWith("/profile")
                    ? window.location.assign
                    : window.location.assign)("/profile/settings");
                } catch (err) {
                  // fallback
                  window.location.href = "/profile/settings";
                }
              }}
            >
              Continue
            </button>
          </div>
        ) : null;
      })()}
      <div className="profile-grid">
        <label>
          Name
          <input
            type="text"
            value={profile.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Your full name"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={profile.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label>
          School / Education
          <input
            type="text"
            value={profile.school}
            onChange={(e) => handleChange("school", e.target.value)}
            placeholder="Where you studied"
          />
        </label>

        <fieldset className="industries-field">
          <legend>Industries of interest</legend>
          <div className="industry-options">
            {industryOptions.map((opt) => (
              <label
                key={opt}
                className={profile.industries.includes(opt) ? "selected" : ""}
              >
                <input
                  type="checkbox"
                  checked={profile.industries.includes(opt)}
                  onChange={() => toggleIndustry(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="full-width">
          Resume
          <div className="resume-upload">
            <div className="resume-box">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                aria-label="Upload resume"
              />
              <div className="resume-box-content">
                <div className="upload-icon" aria-hidden="true">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_104_536)">
                      <path
                        d="M31.9999 32L23.9999 24M23.9999 24L15.9999 32M23.9999 24V42M40.7799 36.78C42.7306 35.7165 44.2716 34.0338 45.1597 31.9972C46.0477 29.9607 46.2323 27.6865 45.6843 25.5334C45.1363 23.3803 43.8869 21.471 42.1333 20.1069C40.3796 18.7428 38.2216 18.0015 35.9999 18H33.4799C32.8746 15.6585 31.7462 13.4847 30.1798 11.642C28.6134 9.7993 26.6496 8.3357 24.4361 7.36121C22.2226 6.38673 19.817 5.92672 17.4002 6.01576C14.9833 6.10481 12.6181 6.7406 10.4823 7.87533C8.34649 9.01006 6.49574 10.6142 5.06916 12.5672C3.64259 14.5201 2.6773 16.7711 2.24588 19.1508C1.81446 21.5305 1.92813 23.9771 2.57835 26.3065C3.22856 28.636 4.3984 30.7877 5.99992 32.6"
                        stroke="#1E1E1E"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_104_536">
                        <rect width="48" height="48" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>

                <div className="resume-box-text">
                  {profile.resumeName ? (
                    <div className="resume-name">{profile.resumeName}</div>
                  ) : (
                    <div className="muted">
                      Click to upload your resume (PDF/DOC)
                    </div>
                  )}
                </div>
              </div>

              {profile.resumeName && (
                <div className="resume-actions">
                  <button
                    className="btn small"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeResume(e);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </label>
      </div>
    </div>
  );
};

export default ProfileInfo;
