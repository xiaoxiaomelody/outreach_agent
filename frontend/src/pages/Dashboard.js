import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logOut, getCurrentUser } from "../config/authUtils";
import hunterApi from "../api/hunter";
import gmailApi from "../api/gmail";
import nlpSearchApi from "../api/nlpSearch";
import GmailConnectButton from "../components/email/GmailConnectButton";
import TemplateInput from "../components/email/TemplateInput";
import Icon from "../components/icons/Icon";
import EmailDraftCard from "../components/email/EmailDraftCard";
import ChatSearch from "../components/search/ChatSearch";
import "../styles/Dashboard.css";

/**
 * Dashboard Component
 * Recruitly - Contact sourcing, email drafting, and sending
 */
const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [acceptedContacts, setAcceptedContacts] = useState([]);
  const [error, setError] = useState(null);

  // Gmail & Email state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState("");
  const [draftedEmails, setDraftedEmails] = useState({});
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftingError, setDraftingError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Check for demo mode first
    const isDemoMode = sessionStorage.getItem("isDemoMode");
    if (isDemoMode) {
      const demoUser = JSON.parse(sessionStorage.getItem("demoUser"));
      setUser({ ...demoUser, isDemoMode: true });
      setLoading(false);
      return;
    }

    // Get current user from Firebase
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    } else {
      navigate("/");
    }
    setLoading(false);
  }, [navigate]);

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    sessionStorage.removeItem("isDemoMode");
    sessionStorage.removeItem("demoUser");
    const result = await logOut();
    if (result.success || result.error) {
      navigate("/");
    }
  };

  /**
   * Handle NLP search query
   */
  const handleNLPSearch = async (query) => {
    setSearchLoading(true);
    setError(null);
    setContacts([]);

    try {
      const result = await nlpSearchApi.nlpSearch(query);

      if (result.success && result.data) {
        const contactData = result.data.contacts || [];
        console.log("📊 Received contact data:", contactData);
        console.log("📊 Sample contact structure:", contactData[0]);

        // Validate contacts data before setting
        const validContacts = contactData.filter((contact) => {
          if (!contact) {
            console.warn("Skipping null/undefined contact");
            return false;
          }
          if (!contact.first_name && !contact.last_name && !contact.name) {
            console.warn("Skipping contact with no name:", contact);
            return false;
          }
          return true;
        });

        console.log(
          `Setting ${validContacts.length} valid contacts out of ${contactData.length} total`
        );
        setContacts(validContacts);

        if (validContacts.length === 0) {
          setError(
            `No valid contacts found for your query. Try a different search.`
          );
        }

        return result; // Return result for chat component
      } else {
        setError(
          result.error ||
            "Failed to search contacts. Make sure backend is running."
        );
        return result;
      }
    } catch (err) {
      console.error("NLP Search error:", err);
      setError(
        "Error connecting to backend. Is your server running on port 8080?"
      );
      return {
        success: false,
        error: "Connection error. Please check your backend server.",
      };
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Accept a contact - move to accepted list
   */
  const handleAccept = (contact) => {
    // Use 'value' field (email) as identifier from Hunter API
    const email = contact.value || contact.email;
    setContacts(contacts.filter((c) => (c.value || c.email) !== email));
    setAcceptedContacts([
      ...acceptedContacts,
      { ...contact, email, status: "accepted" },
    ]);
  };

  /**
   * Reject a contact - remove from list
   */
  const handleReject = (contact) => {
    const email = contact.value || contact.email;
    setContacts(contacts.filter((c) => (c.value || c.email) !== email));
  };

  /**
   * Remove from accepted list
   */
  const handleRemoveAccepted = (email) => {
    setAcceptedContacts(
      acceptedContacts.filter((c) => c.email !== email && c.value !== email)
    );
    // Also remove from drafted emails
    const newDrafted = { ...draftedEmails };
    delete newDrafted[email];
    setDraftedEmails(newDrafted);
  };

  /**
   * Handle Gmail status change
   */
  const handleGmailStatusChange = (connected) => {
    setGmailConnected(connected);
  };

  /**
   * Draft emails for all accepted contacts
   */
  const handleDraftEmails = async () => {
    if (!emailTemplate.trim()) {
      setDraftingError("Please enter an email template first");
      return;
    }

    if (acceptedContacts.length === 0) {
      setDraftingError("Please accept some contacts first");
      return;
    }

    setIsDrafting(true);
    setDraftingError(null);

    const newDrafted = {};

    try {
      for (const contact of acceptedContacts) {
        const email = contact.value || contact.email;
        const fullName = `${contact.first_name} ${contact.last_name}`;

        const result = await gmailApi.draftEmail({
          recipientName: fullName,
          recipientEmail: email,
          recipientPosition: contact.position,
          recipientCompany: contact.company,
          recipientSummary:
            contact.summary ||
            `${fullName} works as ${contact.position} at ${contact.company}`,
          template: emailTemplate,
          senderName: user?.displayName || user?.email || "Recruitly",
        });

        if (result.success) {
          newDrafted[email] = result.data;
        } else {
          console.error(`Failed to draft email for ${email}:`, result.error);
        }

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setDraftedEmails(newDrafted);
      console.log(`✅ Drafted ${Object.keys(newDrafted).length} emails`);
    } catch (err) {
      console.error("Drafting error:", err);
      setDraftingError("Failed to draft emails: " + err.message);
    } finally {
      setIsDrafting(false);
    }
  };

  /**
   * Send a single email
   */
  const handleSendEmail = async (contact, draftedEmail) => {
    console.log("📧 [FRONTEND] Send email button clicked");
    console.log("📧 [FRONTEND] Gmail connected status:", gmailConnected);
    console.log("📧 [FRONTEND] Email data:", {
      to: draftedEmail.to,
      subject: draftedEmail.subject?.substring(0, 50),
      hasBody: !!draftedEmail.body,
    });

    if (!gmailConnected) {
      console.warn("⚠️ [FRONTEND] Gmail not connected, aborting send");
      alert(
        "⚠️ Please connect your Gmail account first using the 'Connect Gmail' button."
      );
      return;
    }

    try {
      console.log("📧 [FRONTEND] Calling gmailApi.sendEmail...");
      const result = await gmailApi.sendEmail({
        to: draftedEmail.to,
        subject: draftedEmail.subject,
        body: draftedEmail.body,
        fromName: user?.displayName || user?.email || "Recruitly",
      });

      console.log("📧 [FRONTEND] Send email result:", result);

      if (result.success) {
        console.log("✅ [FRONTEND] Email sent successfully!");
        alert(`Email sent successfully to ${draftedEmail.to}!`);
        return result;
      } else {
        const errorMsg = result.error || "Failed to send email";
        console.error("❌ [FRONTEND] Send email error:", errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error("❌ [FRONTEND] Send email exception:", err);
      const errorMsg =
        err.message ||
        "Failed to send email. Please check your Gmail connection.";
      throw new Error(errorMsg);
    }
  };

  /**
   * Send all drafted emails (batch)
   */
  const handleSendAllEmails = async () => {
    if (!gmailConnected) {
      alert("Please connect your Gmail account first");
      return;
    }

    if (Object.keys(draftedEmails).length === 0) {
      alert("No drafted emails to send");
      return;
    }

    if (
      !confirm(
        `Send ${
          Object.keys(draftedEmails).length
        } emails? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const emails = Object.values(draftedEmails).map((draft) => ({
        to: draft.to,
        subject: draft.subject,
        body: draft.body,
        fromName: user?.displayName || user?.email || "Recruitly",
      }));

      const result = await gmailApi.batchSendEmails(emails);

      if (result.success) {
        alert(
          `✅ Batch send complete! ${result.data.successful}/${result.data.total} emails sent`
        );
      } else {
        alert(`Batch send failed: ${result.error}`);
      }
    } catch (err) {
      alert(`Error sending emails: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const draftedEmailsCount = Object.keys(draftedEmails).length;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>
            <Icon name="robot" style={{ marginRight: 8 }} /> Recruitly
          </h1>
          <div className="header-right">
            <span className="user-email">{user.email}</span>
            <button onClick={handleLogout} className="btn btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* NLP Chat Search Section */}
        <div className="search-section">
          <h2 className="section-title">
            <Icon name="search" style={{ marginRight: 8 }} /> Ask me to find
            contacts
          </h2>
          <ChatSearch onSearch={handleNLPSearch} isSearching={searchLoading} />

          {error && (
            <div className="error-message" style={{ marginTop: "1rem" }}>
              <Icon name="warning" style={{ marginRight: 8 }} /> {error}
            </div>
          )}
        </div>

        {/* Two-Column Layout */}
        <div className="two-column-layout">
          {/* Left: Contact Sourcing */}
          <div className="sourcing-section">
            <h2>
              <Icon name="mail" style={{ marginRight: 8 }} /> Found Contacts (
              {contacts.length})
            </h2>
            {searchLoading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Finding contacts for you...</p>
              </div>
            )}

            {!searchLoading && contacts.length === 0 && !error && (
              <div className="empty-state">
                <p>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ verticalAlign: "middle", marginRight: "0.5rem" }}
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Enter a company domain above to find contacts
                </p>
                <p className="hint">
                  Results will appear here with AI-generated summaries!
                </p>
              </div>
            )}

            <div className="contacts-grid">
              {contacts.map((contact, index) => (
                <ContactCard
                  key={contact.value || contact.email || index}
                  contact={contact}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
            </div>
          </div>

          {/* Right: Email Management */}
          <div className="email-management-section">
            <h2>
              <Icon name="check" style={{ marginRight: 8 }} /> Accepted Contacts
              & Email ({acceptedContacts.length})
            </h2>

            {/* Gmail Connection
            <GmailConnectButton onStatusChange={handleGmailStatusChange} /> */}

            {/* Email Template */}
            <TemplateInput
              value={emailTemplate}
              onTemplateChange={setEmailTemplate}
            />

            {/* Draft Button */}
            {acceptedContacts.length > 0 && emailTemplate.trim() && (
              <button
                onClick={handleDraftEmails}
                disabled={isDrafting}
                className="btn btn-draft-all"
              >
                {isDrafting
                  ? "Drafting Emails..."
                  : `Draft ${acceptedContacts.length} Email${
                      acceptedContacts.length > 1 ? "s" : ""
                    }`}
              </button>
            )}

            {draftingError && (
              <div className="error-message">{draftingError}</div>
            )}

            {/* Accepted Contacts List */}
            {acceptedContacts.length === 0 && (
              <div className="empty-state">
                <p>
                  <Icon name="mail" style={{ marginRight: 8 }} /> No contacts
                  accepted yet
                </p>
                <p className="hint">
                  Click "Accept" on contacts to add them here
                </p>
              </div>
            )}

            {/* Drafted Emails */}
            {draftedEmailsCount > 0 && (
              <>
                <div className="drafted-emails-header">
                  <h3>
                    <Icon name="note" style={{ marginRight: 8 }} /> Drafted
                    Emails ({draftedEmailsCount})
                  </h3>
                  {gmailConnected && (
                    <button
                      onClick={handleSendAllEmails}
                      className="btn btn-send-all"
                    >
                      <Icon name="mail" style={{ marginRight: 8 }} /> Send All (
                      {draftedEmailsCount})
                    </button>
                  )}
                </div>

                <div className="drafted-emails-list">
                  {acceptedContacts.map((contact, index) => {
                    const email = contact.value || contact.email;
                    const draft = draftedEmails[email];

                    if (!draft) return null;

                    return (
                      <EmailDraftCard
                        key={email || index}
                        contact={contact}
                        draftedEmail={draft}
                        onSend={handleSendEmail}
                        onRemove={handleRemoveAccepted}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* Show accepted contacts without drafts */}
            {acceptedContacts.length > 0 && draftedEmailsCount === 0 && (
              <div className="accepted-list">
                {acceptedContacts.map((contact, index) => (
                  <AcceptedContactCard
                    key={contact.value || contact.email || index}
                    contact={contact}
                    onRemove={handleRemoveAccepted}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Contact Card Component
 * Displays individual contact with AI summary and actions
 */
const ContactCard = ({ contact, onAccept, onReject }) => {
  // Defensive checks to prevent crashes
  if (!contact) {
    console.error("ContactCard received null/undefined contact");
    return null;
  }

  const fullName =
    `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
    "Unknown";
  const email = contact.value || contact.email || "No email";
  const isVerified = contact.verification?.status === "valid";

  return (
    <div className="contact-card">
      <div className="contact-header">
        <h3>{fullName}</h3>
        {isVerified && <span className="verified-badge">✓ Verified</span>}
      </div>

      <div className="contact-body">
        <div className="contact-info">
          <div className="info-row">
            <span className="label">
              <Icon name="mail" style={{ marginRight: 6 }} /> Email:
            </span>
            <span className="value email">{email}</span>
          </div>
          <div className="info-row">
            <span className="label">
              <Icon name="briefcase" style={{ marginRight: 6 }} /> Position:
            </span>
            <span className="value">{contact.position || "N/A"}</span>
          </div>
          <div className="info-row">
            <span className="label">
              <Icon name="building" style={{ marginRight: 6 }} /> Company:
            </span>
            <span className="value">{contact.company || "N/A"}</span>
          </div>
          {contact.department && (
            <div className="info-row">
              <span className="label">
                <Icon name="tag" style={{ marginRight: 6 }} /> Department:
              </span>
              <span className="value">{contact.department}</span>
            </div>
          )}
          {contact.seniority && (
            <div className="info-row">
              <span className="label">
                <Icon name="star" style={{ marginRight: 6 }} /> Seniority:
              </span>
              <span className="value">{contact.seniority}</span>
            </div>
          )}
          {contact.linkedin && (
            <div className="info-row">
              <span className="label">
                <Icon name="link" style={{ marginRight: 6 }} /> LinkedIn:
              </span>
              <a
                href={contact.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="value linkedin"
              >
                View Profile
              </a>
            </div>
          )}
        </div>

        {/* AI Summary */}
        {contact.summary && (
          <div className="ai-summary">
            <strong>🤖 AI Summary:</strong>
            <p>{contact.summary}</p>
          </div>
        )}

        {/* Confidence Score */}
        {contact.confidence && (
          <div className="confidence-bar-container">
            <div
              className="confidence-bar"
              style={{ width: `${contact.confidence}%` }}
            ></div>
            <span className="confidence-text">
              Confidence: {contact.confidence}%
            </span>
          </div>
        )}
      </div>

      <div className="contact-actions">
        <button onClick={() => onAccept(contact)} className="btn btn-accept">
          <Icon name="check" style={{ marginRight: 8 }} /> Accept
        </button>
        <button onClick={() => onReject(contact)} className="btn btn-reject">
          <Icon name="error" style={{ marginRight: 8 }} /> Reject
        </button>
      </div>
    </div>
  );
};

/**
 * Accepted Contact Card Component (Simple version for non-drafted contacts)
 */
const AcceptedContactCard = ({ contact, onRemove }) => {
  // Defensive checks
  if (!contact) {
    console.error("AcceptedContactCard received null/undefined contact");
    return null;
  }

  const fullName =
    `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
    "Unknown";
  const email = contact.value || contact.email || "No email";

  return (
    <div className="accepted-contact-card">
      <div className="accepted-contact-info">
        <h4>{fullName}</h4>
        <p className="contact-email">{email}</p>
        <p className="contact-company">
          {contact.position || "Position N/A"} at{" "}
          {contact.company || "Company N/A"}
        </p>
      </div>
      <button onClick={() => onRemove(email)} className="btn btn-remove-small">
        Remove
      </button>
    </div>
  );
};

export default Dashboard;
