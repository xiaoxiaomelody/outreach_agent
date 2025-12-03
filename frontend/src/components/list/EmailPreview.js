import React, { useState, useEffect } from "react";
import gmailApi from "../../api/gmail";
import "./EmailPreview.css";

/**
 * Email Preview Component
 * Preview and send emails
 */
const EmailPreview = ({ contact, onClose, onSend }) => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [sending, setSending] = useState(false);

  // helper to build a stable key for storing per-contact drafts
  const getDraftKey = (c) => {
    return (c && (c.value || c.email || c.id || c.name)) || "unknown";
  };

  useEffect(() => {
    // Load template and generate email
    const loadTemplate = async () => {
      // Get template based on industry
      const templateName = getTemplateName(contact);
      const templates = JSON.parse(
        localStorage.getItem("emailTemplates") || "[]"
      );
      const template =
        templates.find((t) => t.name === templateName) || templates[0];

      if (template) {
        // Generate personalized email using OpenAI if available
        const fullName =
          `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
          contact.name ||
          "Unknown";

        // Try to use OpenAI to personalize, fallback to simple replacement
        try {
          const result = await gmailApi.draftEmail({
            recipientName: fullName,
            recipientEmail: contact.value || contact.email,
            recipientPosition: contact.position,
            recipientCompany: contact.company || contact.organization,
            recipientSummary:
              contact.ai_summary ||
              `${fullName} works as ${contact.position} at ${
                contact.company || contact.organization
              }`,
            template: template.content,
            senderName: "Outreach Agent",
          });

          if (result.success && result.data) {
            setBody(result.data.body);
            setSubject(
              result.data.subject ||
                `Outreach: ${fullName} at ${
                  contact.company || contact.organization || "Company"
                }`
            );
          } else {
            // Fallback to simple replacement
            const personalizedBody = template.content
              .replace(/\[Name\]/g, fullName)
              .replace(/\[name\]/g, fullName);
            setBody(personalizedBody);
            setSubject(
              `Outreach: ${fullName} at ${
                contact.company || contact.organization || "Company"
              }`
            );
          }
        } catch (error) {
          // Fallback to simple replacement
          const personalizedBody = template.content
            .replace(/\[Name\]/g, fullName)
            .replace(/\[name\]/g, fullName);
          setBody(personalizedBody);
          setSubject(
            `Outreach: ${fullName} at ${
              contact.company || contact.organization || "Company"
            }`
          );
        }
      }

      // After generating from a template, if there's a saved draft for this contact, use it
      try {
        const drafts = JSON.parse(localStorage.getItem("emailDrafts") || "{}");
        const key = getDraftKey(contact);
        if (drafts && drafts[key]) {
          const d = drafts[key];
          if (d.subject) setSubject(d.subject);
          if (d.body) setBody(d.body);
        }
      } catch (err) {
        // ignore parse errors
      }
    };

    loadTemplate();
  }, [contact]);

  const getTemplateName = (contact) => {
    if (contact.industry) {
      const industry = contact.industry.toLowerCase();
      if (industry.includes("finance") || industry.includes("bank"))
        return "Finance";
      if (industry.includes("tech") || industry.includes("software"))
        return "Tech";
      if (industry.includes("medicine") || industry.includes("health"))
        return "Medicine";
      if (industry.includes("witchcraft") || industry.includes("wizard"))
        return "Wizardry";
    }
    return "Tech";
  };

  const handleSend = async () => {
    setSending(true);
    try {
      // Check if Gmail is connected
      const gmailStatus = await gmailApi.getGmailStatus();
      if (!gmailStatus.success || !gmailStatus.data.connected) {
        alert(
          "⚠️ Please connect your Gmail account first using the 'Connect Gmail' button in Search page."
        );
        setSending(false);
        return;
      }

      // Send email
      const result = await gmailApi.sendEmail({
        to: contact.value || contact.email,
        subject: subject,
        body: body,
        fromName: "Outreach Agent",
      });

      if (result.success) {
        // Move from shortlist to sent
        const contacts = JSON.parse(
          localStorage.getItem("myContacts") ||
            '{"shortlist":[],"sent":[],"trash":[]}'
        );
        const email = contact.value || contact.email;
        contacts.shortlist = contacts.shortlist.filter(
          (c) => (c.value || c.email) !== email
        );
        const existsInSent = contacts.sent.some(
          (c) => (c.value || c.email) === email
        );
        if (!existsInSent) {
          contacts.sent.push(contact);
        }
        localStorage.setItem("myContacts", JSON.stringify(contacts));

        alert("✅ Email sent successfully!");
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert("Failed to send email: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleSave = () => {
    // Save a per-contact draft (subject + body) to localStorage
    try {
      const key = getDraftKey(contact);
      const drafts = JSON.parse(localStorage.getItem("emailDrafts") || "{}");
      drafts[key] = {
        subject: subject,
        body: body,
        updatedAt: Date.now(),
      };
      localStorage.setItem("emailDrafts", JSON.stringify(drafts));
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save draft", err);
      alert("Failed to save draft");
    }
  };

  return (
    <div className="email-preview-overlay" onClick={onClose}>
      <div className="email-preview" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h2>Preview Email</h2>
          <button className="preview-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="preview-hint">
          {!isEditing && (
            <span onClick={() => setIsEditing(true)}>Click to make edits</span>
          )}
        </div>
        <div className="preview-content">
          <div className="preview-field">
            <label>Subject:</label>
            {isEditing ? (
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="preview-input"
              />
            ) : (
              <div className="preview-subject">
                {subject || "[Subject]: Please hire me!"}
              </div>
            )}
          </div>
          <div className="preview-field">
            <label>Body:</label>
            {isEditing ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="preview-textarea"
                rows={10}
              />
            ) : (
              <div className="preview-body">
                <pre>
                  {body ||
                    "Hello [Name],\n\nMy name is Sidd and I want to work at Bank of America\nPlease hire me.\nYours desperately,\nSiddharth"}
                </pre>
              </div>
            )}
          </div>
        </div>
        <div className="preview-actions">
          {isEditing && (
            <button className="btn-cancel" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          )}
          {isEditing && (
            <button className="btn-save" onClick={handleSave}>
              Save
            </button>
          )}
          <button className="btn-send" onClick={handleSend} disabled={sending}>
            {sending ? "Sending..." : "Send"} ✈️
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
