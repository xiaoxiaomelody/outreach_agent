import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ProfilePage.css";
import { getCurrentUser } from "../config/authUtils";
import { getUserProfile, updateUserProfile } from "../services/firestore.service";

const industryOptions = [
  "Tech",
  "Finance",
  "Medicine",
  "Education",
  "Design",
  "Consulting",
  "Other",
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [industries, setIndustries] = useState([]);

  const isValidEmail = (e) => {
    try {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    } catch (err) {
      return false;
    }
  };

  const isFormValid = () => {
    return (
      name &&
      name.trim().length > 0 &&
      email &&
      isValidEmail(email) &&
      school &&
      school.trim().length > 0 &&
      industries &&
      industries.length > 0
    );
  };

  useEffect(() => {
    const loadEmail = async () => {
      try {
        const u = getCurrentUser();
        if (u?.uid) {
          // Try to get email from Firestore profile first
          try {
            const profile = await getUserProfile(u.uid);
            if (profile?.email) {
              setEmail(profile.email);
              return;
            }
          } catch (e) {
            console.warn("Error loading profile from Firestore:", e);
          }
        }

        // Fallback: try to get from Firebase Auth user
        if (u && u.email) {
          setEmail(u.email);
          return;
        }

        // Fallback: check demo user
        try {
          const demo = sessionStorage.getItem("demoUser");
          if (demo) {
            const du = JSON.parse(demo);
            if (du.email) setEmail(du.email);
          }
        } catch (e) {}
      } catch (e) {
        console.error("Error loading email:", e);
      }
    };

    loadEmail();
  }, []);

  const toggleIndustry = (i) => {
    setIndustries((prev) =>
      prev.includes(i) ? prev.filter((p) => p !== i) : [...prev, i]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user?.uid) {
      alert("You must be logged in to save your profile");
      return;
    }

    const profile = {
      name: name || "",
      email: email || "",
      school: school || "",
      industries: industries || [],
      resumeName: "",
      resumeData: "",
    };

    try {
      // Save to Firestore
      await updateUserProfile(user.uid, profile);
      console.log("✅ Profile saved to Firestore during onboarding");
      
      // Remove onboarding flag
      try {
        localStorage.removeItem("isNewAccount");
      } catch (e) {}
      
      // Proceed to the slim account-settings onboarding step
      navigate("/profile/onboarding-settings");
    } catch (err) {
      console.error("Failed to save profile to Firestore:", err);
      alert("Failed to save profile. Please try again.");
    }
  };

  return (
    <div className="profile-pane">
      <h2>My Profile</h2>

      <form onSubmit={handleSubmit} className="profile-grid">
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label>
          School / Education
          <input
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="Where you studied"
          />
        </label>

        <fieldset className="industries-field full-width">
          <legend>Industries of interest</legend>
          <div className="industry-options">
            {industryOptions.map((opt) => (
              <label
                key={opt}
                className={industries.includes(opt) ? "selected" : ""}
              >
                <input
                  type="checkbox"
                  checked={industries.includes(opt)}
                  onChange={() => toggleIndustry(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>

        <div style={{ marginTop: 8 }} className="full-width profile-actions">
          <button
            type="submit"
            className="btn btn-primary btn-next"
            disabled={!isFormValid()}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default Onboarding;
