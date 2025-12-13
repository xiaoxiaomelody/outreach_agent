import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ProfilePage.css";
import { getCurrentUser } from "../config/authUtils";
import { getUserProfile, updateUserProfile } from "../services/firestore.service";

// Lazy load ResumeUpload to handle potential import errors gracefully
const ResumeUpload = lazy(() => 
  import("../components/profile/ResumeUpload").catch(() => ({
    default: () => (
      <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
        <p style={{ margin: 0, color: '#92400e' }}>⚠️ Resume upload temporarily unavailable. Please try refreshing the page.</p>
      </div>
    )
  }))
);

// Fallback component while loading
const ResumeUploadFallback = () => (
  <div style={{ padding: '1rem', background: '#f0f4ff', borderRadius: '8px', border: '1px dashed #6366f1' }}>
    <p style={{ margin: 0, color: '#4f46e5' }}>📄 Loading resume upload...</p>
  </div>
);

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
  const [parsedResumeData, setParsedResumeData] = useState(null);
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

  // Load profile from Firestore on mount
  useEffect(() => {
    const loadProfile = async () => {
      const user = getCurrentUser();
      if (!user?.uid) {
        console.warn("No user found, cannot load profile from Firestore");
        return;
      }

      try {
        const firestoreProfile = await getUserProfile(user.uid);
        if (firestoreProfile) {
          // Map Firestore profile structure to component state
          const loadedProfile = {
            name: firestoreProfile.name || "",
            email: firestoreProfile.email || user.email || "",
            school: firestoreProfile.school || "",
            industries: firestoreProfile.industries || [],
            resumeName: firestoreProfile.resumeName || "",
            resumeData: firestoreProfile.resumeData || "",
          };
          setProfile(loadedProfile);
          setSavedProfile(loadedProfile);
          console.log("✅ Loaded profile from Firestore");
        }
      } catch (error) {
        console.error("Error loading profile from Firestore:", error);
        // Fallback: try localStorage for migration
        try {
          const raw = localStorage.getItem("userProfile");
          if (raw) {
            const parsed = JSON.parse(raw);
            setProfile(parsed);
            setSavedProfile(parsed);
            // Migrate to Firestore
            if (user?.uid) {
              updateUserProfile(user.uid, {
                name: parsed.name || "",
                email: parsed.email || "",
                school: parsed.school || "",
                industries: parsed.industries || [],
                resumeName: parsed.resumeName || "",
                resumeData: parsed.resumeData || "",
              }).catch((err) => {
                console.error("Failed to migrate profile to Firestore:", err);
              });
            }
          }
        } catch (err) {
          /* ignore */
        }
      }
    };

    loadProfile();
  }, []);

  // Autosave profile to Firestore when it changes (debounced)
  React.useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }

    const user = getCurrentUser();
    if (!user?.uid) {
      console.warn("No user found, cannot save profile to Firestore");
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        // Save directly to Firestore
        await updateUserProfile(user.uid, {
          name: profile.name || "",
          email: profile.email || user.email || "",
          school: profile.school || "",
          industries: profile.industries || [],
          resumeName: profile.resumeName || "",
          resumeData: profile.resumeData || "",
        });
        
        setSavedProfile(profile);
        console.log("✅ Profile saved to Firestore");
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: { message: "Profile saved", type: "info", duration: 1200 },
          })
        );
      } catch (err) {
        console.error("Failed to save profile to Firestore:", err);
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: { 
              message: "Failed to save profile", 
              type: "error", 
              duration: 2000 
            },
          })
        );
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

  // Handle successful resume upload from ResumeUpload component
  const handleResumeUploadSuccess = (result) => {
    console.log("✅ Resume upload success:", result);
    setParsedResumeData(result.data);
    // Update profile with resume info (the backend has already saved the parsed data)
    setProfile((p) => ({ 
      ...p, 
      resumeName: result.metadata?.originalFilename || "Resume uploaded",
      resumeData: "validated" // Mark as validated (actual data is stored in backend)
    }));
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

        <div className="full-width">
          <label style={{ marginBottom: '0.5rem', display: 'block' }}>Resume</label>
          <Suspense fallback={<ResumeUploadFallback />}>
            <ResumeUpload 
              onUploadSuccess={handleResumeUploadSuccess}
              initialData={parsedResumeData}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;
