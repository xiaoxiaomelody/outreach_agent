import React, { useState, useEffect, useCallback } from "react";
import gmailApi from "../../api/gmail";
import "./EmailPreview.css";
import Icon from "../icons/Icon";
import { getCurrentUser } from "../../config/authUtils";
import { 
  getUserTemplates, 
  moveContactToSent,
  getUserEmailDrafts,
  saveEmailDraft,
  getUserProfile
} from "../../services/firestore.service";
import { useEmailStream } from "../../hooks/useEmailStream";

/**
 * Email Preview Component
 * Preview and send emails
 */
const EmailPreview = ({ contact, onClose, onSend }) => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [sending, setSending] = useState(false);
  
  // AI Draft Generation
  const [hasResume, setHasResume] = useState(false);
  const [checkingResume, setCheckingResume] = useState(true);
  const [selectedTone, setSelectedTone] = useState("Formal");
  const [showToneSelector, setShowToneSelector] = useState(false);
  
  // Use the email stream hook
  const {
    draftContent,
    isStreaming,
    error: streamError,
    status: streamStatus,
    generateDraft,
    cancelStream,
    setContent
  } = useEmailStream();

  // helper to build a stable key for storing per-contact drafts
  const getDraftKey = (c) => {
    return (c && (c.value || c.email || c.id || c.name)) || "unknown";
  };

  // Get stable contact identifier (email)
  const contactEmail = contact?.value || contact?.email || "";
  const [hasUserEdits, setHasUserEdits] = useState(false);
  const [lastContactEmail, setLastContactEmail] = useState("");
  
  // Check if user has uploaded a resume
  useEffect(() => {
    const checkResumeStatus = async () => {
      const user = getCurrentUser();
      if (!user?.uid) {
        setHasResume(false);
        setCheckingResume(false);
        return;
      }
      
      try {
        const profile = await getUserProfile(user.uid);
        // Check if user has a validated resume (either resumeName or resume object)
        const hasValidResume = !!(profile?.resumeName || profile?.resume?.fullName);
        setHasResume(hasValidResume);
      } catch (error) {
        console.error("Error checking resume status:", error);
        setHasResume(false);
      } finally {
        setCheckingResume(false);
      }
    };
    
    checkResumeStatus();
  }, []);

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
          if (templates && templates.length > 0) {
            console.log('✅ Loaded templates from Firestore');
          } else {
            console.log('📋 No templates found in Firestore for user');
            templates = [];
          }
        } catch (error) {
          console.error("Error loading templates from Firestore:", error);
          templates = [];
        }
      } else {
        console.warn("No user found, cannot load templates from Firestore");
        templates = [];
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
          .replace(/\[name\]/g, fullName)
          .replace(
            /\[Company\]/g,
            contact.company || contact.organization || "Company"
          );

        // Prefer template.subject if provided, otherwise fall back to a generated subject.
        let initialSubject = `Outreach: ${fullName} at ${
          contact.company || contact.organization || "Company"
        }`;
        if (template.subject && template.subject.trim() !== "") {
          initialSubject = template.subject
            .replace(/\[Name\]/g, fullName)
            .replace(/\[name\]/g, fullName)
            .replace(
              /\[Company\]/g,
              contact.company || contact.organization || "Company"
            );
        }

        setBody(initialBody);
        setSubject(initialSubject);

        // NOTE: Removed automatic AI personalization
        // User can manually trigger AI drafting via the "✨ Auto-Draft with AI" button
        // This preserves the template structure hints like [mention: working experience -> ...]
      }

      // After generating from a template, if there's a saved draft for this contact, use it
      if (user?.uid) {
        try {
          const drafts = await getUserEmailDrafts(user.uid);
          const key = getDraftKey(contact);
          if (drafts && drafts[key]) {
            const d = drafts[key];
            if (d.subject) setSubject(d.subject);
            if (d.body) setBody(d.body);
            console.log("✅ Restored draft from Firestore for", key);
          }
        } catch (err) {
          console.error("Error loading draft from Firestore:", err);
        }
      }
    };

    loadTemplate();
  }, [contact, contactEmail, lastContactEmail, hasUserEdits]);

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

  // Handle AI draft generation
  const handleAIDraft = useCallback(async () => {
    // Check if there's existing content
    if (body.trim()) {
      const overwrite = window.confirm(
        "You have existing content. Do you want to overwrite it with an AI-generated draft?\n\nClick 'OK' to overwrite, or 'Cancel' to append instead."
      );
      
      if (!overwrite) {
        // User wants to append - not supported in this version, just return
        // Could implement append mode here if needed
        return;
      }
    }
    
    setIsEditing(true); // Enable editing mode to show the textarea
    setContent(''); // Clear the hook's content
    
    try {
      const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.name || "";
      
      const generatedContent = await generateDraft({
        recipientInfo: {
          companyName: contact.company || contact.organization || "Unknown Company",
          jobTitle: contact.position || "Professional",
          recipientName: fullName,
          recipientRole: contact.position
        },
        tone: selectedTone,
        jobDescription: contact.job_description // If available in contact
      });
      
      // Update body with generated content
      if (generatedContent) {
        setBody(generatedContent);
        setHasUserEdits(true);
      }
    } catch (error) {
      // Show error toast
      try {
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: {
              message: error.message || "Failed to generate email draft",
              type: "error",
              duration: 4000,
            },
          })
        );
      } catch (e) {
        alert("Failed to generate email: " + error.message);
      }
    }
  }, [body, contact, selectedTone, generateDraft, setContent]);

  // Update body when streaming content changes
  useEffect(() => {
    if (isStreaming && draftContent) {
      setBody(draftContent);
    }
  }, [isStreaming, draftContent]);

  // Show stream errors as toasts
  useEffect(() => {
    if (streamError) {
      try {
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: {
              message: streamError,
              type: "error",
              duration: 4000,
            },
          })
        );
      } catch (e) {
        // Ignore toast dispatch errors
      }
    }
  }, [streamError]);

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
        fromName: "Recruitly",
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

  const handleSave = async () => {
    // Save a per-contact draft (subject + body) to Firestore
    const user = getCurrentUser();
    if (!user?.uid) {
      alert("You must be logged in to save drafts");
      return;
    }

    try {
      const key = getDraftKey(contact);
      await saveEmailDraft(user.uid, key, {
        subject: subject,
        body: body
      });
      setIsEditing(false);
      console.log("✅ Draft saved to Firestore");
    } catch (err) {
      console.error("Failed to save draft to Firestore:", err);
      alert("Failed to save draft: " + err.message);
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
          {!isEditing && !isStreaming && (
            <span onClick={() => setIsEditing(true)}>Click to make edits</span>
          )}
          {isStreaming && streamStatus && (
            <span className="ai-status">
              <span className="ai-status-dot"></span>
              {streamStatus.message}
            </span>
          )}
        </div>
        
        {/* AI Draft Generation Section */}
        <div className="ai-draft-section">
          {checkingResume ? (
            <div className="ai-draft-loading">Checking profile...</div>
          ) : hasResume ? (
            <div className="ai-draft-controls">
              <div className="tone-selector">
                <button 
                  className="tone-toggle"
                  onClick={() => setShowToneSelector(!showToneSelector)}
                  disabled={isStreaming}
                >
                  Tone: {selectedTone} ▾
                </button>
                {showToneSelector && (
                  <div className="tone-dropdown">
                    {['Formal', 'Casual', 'Confident', 'Curious'].map(tone => (
                      <button
                        key={tone}
                        className={`tone-option ${selectedTone === tone ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedTone(tone);
                          setShowToneSelector(false);
                        }}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {isStreaming ? (
                <button 
                  className="btn-ai-stop"
                  onClick={cancelStream}
                >
                  ⏹ Stop
                </button>
              ) : (
                <button 
                  className="btn-ai-draft"
                  onClick={handleAIDraft}
                  disabled={sending}
                >
                  ✨ Auto-Draft with AI
                </button>
              )}
            </div>
          ) : (
            <div className="ai-draft-disabled">
              <span className="ai-disabled-text">
                <a href="/profile" className="upload-resume-link">
                  Upload Resume
                </a>
                {" "}to enable AI Drafting
              </span>
            </div>
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
                {subject || "Intro — [Name] at [Company]"}
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
                    "Hello [Name],\n\n[mention: working experience -> tech stack -> ask whether the company has position]"}
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
          <button 
            className="btn-send" 
            onClick={handleSend} 
            disabled={sending || isStreaming}
            title={isStreaming ? "Wait for AI generation to complete" : ""}
          >
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
