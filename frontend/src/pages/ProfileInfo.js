import React, { useState, useEffect } from "react";
import "../styles/ProfilePage.css";

const defaultProfile = {
  name: "",
  email: "",
  school: "",
  industries: [],
  bio: "",
};

const industryOptions = [
  "Tech",
  "Finance",
  "Medicine",
  "Education",
  "Design",
  "Other",
];

const ProfileInfo = () => {
  const [profile, setProfile] = useState(defaultProfile);
  const [savedProfile, setSavedProfile] = useState(defaultProfile);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleChange = (key, value) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const toggleIndustry = (name) => {
    setProfile((p) => {
      const next = { ...p };
      next.industries = next.industries || [];
      if (next.industries.includes(name))
        next.industries = next.industries.filter((i) => i !== name);
      else next.industries = [...next.industries, name];
      return next;
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem("userProfile", JSON.stringify(profile));
      setSavedProfile(profile);
      setIsEditing(false);
      window.dispatchEvent(
        new CustomEvent("app-toast", {
          detail: { message: "Profile saved", type: "info", duration: 3000 },
        })
      );
    } catch (err) {}
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setProfile(savedProfile || defaultProfile);
    setIsEditing(false);
  };

  return (
    <div className="profile-pane">
      <h2>My Profile</h2>
      <div className="profile-grid">
        <label>
          Name
          <input
            type="text"
            value={profile.name}
            onChange={(e) => handleChange("name", e.target.value)}
            readOnly={!isEditing}
            placeholder="Your full name"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={profile.email}
            onChange={(e) => handleChange("email", e.target.value)}
            readOnly={!isEditing}
            placeholder="you@example.com"
          />
        </label>

        <label>
          School / Education
          <input
            type="text"
            value={profile.school}
            onChange={(e) => handleChange("school", e.target.value)}
            readOnly={!isEditing}
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
                  disabled={!isEditing}
                />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="full-width">
          Short Bio
          <textarea
            value={profile.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            placeholder="A short summary of your background and what you're looking for"
            readOnly={!isEditing}
          />
        </label>
      </div>

      <div className="profile-actions">
        {!isEditing ? (
          <button className="btn" onClick={handleEdit}>
            Edit Profile
          </button>
        ) : (
          <>
            <button className="btn" onClick={handleCancel}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileInfo;
