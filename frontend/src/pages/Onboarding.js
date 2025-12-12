import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ProfilePage.css";
import { getCurrentUser } from "../config/authUtils";

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userProfile");
      if (raw) {
        const p = JSON.parse(raw);
        // Only prefill the email from any existing local profile — do not
        // prefill other profile fields so onboarding forces fresh input.
        if (p.email) setEmail(p.email);
        // continue checking demo/auth if available
      }
    } catch (e) {}

    try {
      const demo = sessionStorage.getItem("demoUser");
      if (demo) {
        const du = JSON.parse(demo);
        if (du.email) setEmail(du.email);
        return;
      }
    } catch (e) {}

    try {
      const u = getCurrentUser();
      if (u && u.email) setEmail(u.email);
    } catch (e) {}
  }, []);

  const toggleIndustry = (i) => {
    setIndustries((prev) =>
      prev.includes(i) ? prev.filter((p) => p !== i) : [...prev, i]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const profile = {
      name: name || "",
      email: email || "",
      school: school || "",
      industries: industries || [],
      resumeName: "",
      resumeData: "",
    };
    try {
      localStorage.setItem("userProfile", JSON.stringify(profile));
      localStorage.removeItem("isNewAccount");
    } catch (err) {
      console.warn("Failed to write profile to localStorage", err);
    }
    // Proceed to the slim account-settings onboarding step
    navigate("/profile/onboarding-settings");
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
          <button type="submit" className="btn btn-primary">
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default Onboarding;
