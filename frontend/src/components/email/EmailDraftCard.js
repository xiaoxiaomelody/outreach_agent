import React, { useState } from "react";
import "./EmailDraftCard.css";
import Icon from "../icons/Icon";

/**
 * Email Draft Card Component
 * Displays a drafted email with send/edit options
 */
const EmailDraftCard = ({ contact, draftedEmail, onSend, onRemove }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSend = async () => {
    if (sent) return;

    setSending(true);
    try {
      await onSend(contact, draftedEmail);
      setSent(true);
    } catch (error) {
      alert("Failed to send email: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const fullName = `${contact.first_name} ${contact.last_name}`;

  return (
    <div className={`email-draft-card ${sent ? "sent" : ""}`}>
      <div className="draft-header">
        <div className="recipient-info">
          <h4>{fullName}</h4>
          <p className="recipient-email">{contact.value}</p>
          {contact.company && (
            <p className="recipient-company">
              {contact.position} at {contact.company}
            </p>
          )}
        </div>

        {sent ? (
          <div className="sent-badge">
            <span className="badge-icon">
              <Icon name="check" />
            </span>
            <span>Sent</span>
          </div>
        ) : (
          <button onClick={handleSend} disabled={sending} className="btn-send">
            {sending ? (
              "Sending..."
            ) : (
              <>
                <Icon name="mail" style={{ marginRight: 8 }} /> Send
              </>
            )}
          </button>
        )}
      </div>

      {draftedEmail && (
        <>
          <div className="email-preview">
            <div className="preview-subject">
              <strong>Subject:</strong> {draftedEmail.subject}
            </div>

            <div
              className={`preview-body ${expanded ? "expanded" : "collapsed"}`}
            >
              <div
                className="body-content"
                dangerouslySetInnerHTML={{ __html: draftedEmail.body }}
              />
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="btn-expand"
            >
              {expanded ? "▲ Show Less" : "▼ Show More"}
            </button>
          </div>
        </>
      )}

      {!sent && (
        <div className="draft-actions">
          <button
            onClick={() => onRemove(contact.value)}
            className="btn-remove"
            disabled={sending}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default EmailDraftCard;
