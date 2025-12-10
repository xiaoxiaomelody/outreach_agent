import React, { useState, useEffect } from "react";
import gmailApi from "../../api/gmail";
import "./EmailPreview.css";
import Icon from "../icons/Icon";
import { getCurrentUser } from "../../config/authUtils";
import { getUserTemplates } from "../../services/firestore.service";
import { moveContactToSent } from "../../services/firestore.service";

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

  // Get stable contact identifier (email)
  const contactEmail = contact?.value || contact?.email || "";
  const [hasUserEdits, setHasUserEdits] = useState(false);
  const [lastContactEmail, setLastContactEmail] = useState("");

  useEffect(() => {
    // Only regenerate email if:
    // 1. This is a different contact (email changed), OR
    // 2. User hasn't made any edits yet
    const isDifferentContact = contactEmail !== lastContactEmail;
    const shouldRegenerate = isDifferentContact || !hasUserEdits;

    if (!shouldRegenerate) {
      return; // Don't overwrite user edits for the same contact
    }

    // Update last contact email if it changed
    if (isDifferentContact) {
      setLastContactEmail(contactEmail);
      setHasUserEdits(false); // Reset edit flag for new contact
    }

    // Load template and generate email
    const loadTemplate = async () => {
      // Try to load templates from Firestore first
      let templates = [];
      const user = getCurrentUser();
      if (user?.uid) {
        try {
          templates = await getUserTemplates(user.uid);
        } catch (error) {
          console.error("Error loading templates from Firestore:", error);
        }
      }
      
      // Fallback to localStorage if Firestore is empty
      if (!templates || templates.length === 0) {
        try {
          const localTemplates = JSON.parse(
            localStorage.getItem("emailTemplates") || "[]"
          );
          templates = localTemplates;
        } catch (err) {
          console.error("Error loading templates from localStorage:", err);
        }
      }

      // Determine desired template name or id from contact (support either string name or id)
      const requestedTemplateKey =
        contact?.template ||
        contact?.templateId ||
        contact?.template_name ||
        null;

      const defaultTemplateName = getTemplateName(contact);

      let template = null;
      if (templates && templates.length > 0) {
        if (requestedTemplateKey) {
          template =
            templates.find(
              (t) =>
                t.name === requestedTemplateKey || t.id === requestedTemplateKey
            ) || null;
        }
        // if no requested template found, fall back to template by industry/name
        if (!template) {
          template =
            templates.find((t) => t.name === defaultTemplateName) ||
            templates[0];
        }
      }

      if (template) {
        const fullName =
          `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
          contact.name ||
          "Unknown";

        // Immediately set a synchronized fallback subject/body based on the selected template
        // to avoid showing a different template briefly while async personalization runs.
        const initialBody = template.content
          .replace(/\[Name\]/g, fullName)
          .replace(/\[name\]/g, fullName);
        const initialSubject = `Outreach: ${fullName} at ${
          contact.company || contact.organization || "Company"
        }`;
        setBody(initialBody);
        setSubject(initialSubject);

        // Try to use OpenAI to personalize, override the initial values if successful
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
            if (result.data.body) setBody(result.data.body);
            if (result.data.subject) setSubject(result.data.subject);
          }
        } catch (error) {
          // ignore and keep initialBody/initialSubject
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
          "Please connect your Gmail account first using the 'Connect Gmail' button in Search page."
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
        // Move contact from shortlist to sent in Firestore
        const user = getCurrentUser();
        if (user?.uid) {
          try {
            await moveContactToSent(user.uid, contact);
            console.log("✅ Contact moved to sent in Firestore");
          } catch (error) {
            console.error("Error moving contact to sent in Firestore:", error);
            // Fallback to localStorage
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
          }
        } else {
          // Fallback to localStorage if not authenticated
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
        }

        // Call onSend callback if provided (to update parent state)
        if (onSend) {
          await onSend(contact, { subject, body });
        }

        alert("Email sent successfully!");
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
                onChange={(e) => {
                  setSubject(e.target.value);
                  setHasUserEdits(true); // Mark that user has made edits
                }}
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
                onChange={(e) => {
                  setBody(e.target.value);
                  setHasUserEdits(true); // Mark that user has made edits
                }}
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
            {sending ? "Sending..." : "Send"}
            <Icon
              name="paper-plane"
              size={18}
              style={{ marginLeft: "0.5rem" }}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
