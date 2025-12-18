import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/layout/NavBar";
import { getCurrentUser } from "../config/authUtils";
import ChatSearch from "../components/search/ChatSearch";
import ContactCard from "../components/contacts/ContactCard";
import "../styles/AgentPage.css";

/**
 * Agent Page Component
 * AI-powered chat interface for finding business contacts
 */
const AgentPage = () => {
  const [user, setUser] = useState(null);
  const [foundContacts, setFoundContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    } else {
      navigate("/");
    }

    // Trigger backend training on page load (best-effort; non-blocking)
    (async () => {
      try {
        const { api } = await import("../api/backend");
        console.log("🔁 Triggering backend training (AgentPage mount)");
        await api.runTraining();
        console.log("🔁 Training request completed");
      } catch (err) {
        console.debug("Training request failed (non-fatal):", err.message || err);
      }
    })();
  }, [navigate]);

  // Handle when contacts are found from chat
  const handleContactsFound = (contacts) => {
    // Normalize contact shape for ContactCard
    const normalizedContacts = (contacts || []).map((c) => {
      const value = c.value || c.email || (c.emails && c.emails[0]) || null;
      const name = c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || null;
      let first_name = c.first_name || null;
      let last_name = c.last_name || null;
      if (!first_name && name) {
        const parts = name.split(" ");
        first_name = parts.slice(0, -1).join(" ") || parts[0] || null;
        last_name = parts.length > 1 ? parts.slice(-1).join(" ") : null;
      }
      return {
        ...c,
        value,
        email: value,
        name,
        first_name,
        last_name,
        company: c.company || c.organization || c.employer || null,
        position: c.position || c.title || null,
        linkedin: c.linkedin || c.linkedin_url || c.linkedinUrl || null,
        ai_summary: c.ai_summary || c.summary || null,
      };
    });

    setFoundContacts(normalizedContacts);
    setShowContacts(true);
  };

  // Close contacts panel
  const handleCloseContacts = () => {
    setShowContacts(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="agent-page">
      <NavBar />
      <div className="agent-page-content">
        {/* Greeting */}
        <div className="agent-greeting">
          <h1>
            {greeting()},{" "}
            {user.displayName || user.email?.split("@")[0] || "User"}!
          </h1>
          <p className="greeting-subtitle">
            Chat with AI to find business contacts
          </p>
        </div>

        {/* Main content area */}
        <div className={`agent-main-area ${showContacts ? "with-contacts" : ""}`}>
          {/* Chat Interface */}
          <div className="chat-wrapper">
            <ChatSearch onContactsFound={handleContactsFound} />
          </div>

          {/* Contacts Panel (slides in when contacts found) */}
          {showContacts && foundContacts.length > 0 && (
            <div className="contacts-panel">
              <div className="contacts-panel-header">
                <h2>Found Contacts ({foundContacts.length})</h2>
                <button
                  className="close-panel-btn"
                  onClick={handleCloseContacts}
                  aria-label="Close contacts panel"
                >
                  ✕
                </button>
              </div>
              <div className="contacts-panel-content">
                <div className="contacts-grid">
                  {foundContacts.map((contact, index) => (
                    <ContactCard
                      key={contact.value || contact.email || index}
                      contact={contact}
                      query=""
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentPage;

