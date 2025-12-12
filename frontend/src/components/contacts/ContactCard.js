import React, { useState } from "react";
import "./ContactCard.css";
import Icon from "../icons/Icon";
import { getCurrentUser } from "../../config/authUtils";
import { api } from "../../api/backend";
import {
  addContactToShortlist,
  removeContactFromShortlist,
  moveContactToTrash,
  getUserContacts,
} from "../../services/firestore.service";

/**
 * Contact Card Component
 * Displays a contact with like/dislike/add actions
 */
const ContactCard = ({ contact, query = '', onAccept, onReject }) => {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const fullName =
    `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim() ||
    contact?.name ||
    "Unknown";
  const email = contact?.value || contact?.email || null;
  const company = contact?.company || contact?.organization || "N/A";
  const position = contact?.position || "N/A";
  const industry = contact?.department || "N/A";
  const linkedin = contact?.linkedin || null;
  const summary =
    contact?.ai_summary ||
    contact?.summary ||
    `${fullName} works as ${position} at ${company}`;

  // Helper: add contact to shortlist. Options: { silent }
  const addToShortlist = async ({ silent = false } = {}) => {
    try {
      const user = getCurrentUser();
      if (!user?.uid) {
        // Fallback to localStorage if not authenticated
        const shortlist = JSON.parse(
          localStorage.getItem("myContacts") ||
            '{"shortlist":[],"sent":[],"trash":[]}'
        );
        const emailKey = contact?.value || contact?.email;
        const exists = shortlist.shortlist.some(
          (c) => (c.value || c.email) === emailKey
        );
        if (exists) {
          if (!silent) {
            try {
              window.dispatchEvent(
                new CustomEvent("app-toast", {
                  detail: {
                    message: `${fullName} is already in your shortlist`,
                    type: "info",
                    duration: 2500,
                  },
                })
              );
            } catch (e) {}
          }
          return false;
        }
        shortlist.shortlist.push(contact);
        localStorage.setItem("myContacts", JSON.stringify(shortlist));
        setLiked(true);
        setDisliked(false);
        // Attempt to save interaction to backend training file (will fail silently if not authenticated)
        try {
          await api.saveTrainingInteraction({ contact, action: 'accept', query: query || '' });
        } catch (e) {
          // non-fatal — keep UX smooth
          console.debug('Training save failed (local add):', e.message || e);
        }
        return true;
      }

      // Use Firestore
      const emailKey = contact?.value || contact?.email;
      const contacts = await getUserContacts(user.uid);
      const exists = contacts.shortlist.some(
        (c) => (c.value || c.email) === emailKey
      );
      if (exists) {
        if (!silent) {
          try {
            window.dispatchEvent(
              new CustomEvent("app-toast", {
                detail: {
                  message: `${fullName} is already in your shortlist`,
                  type: "info",
                  duration: 2500,
                },
              })
            );
          } catch (e) {}
        }
        return false;
      }

      console.log('📋 Attempting to add contact to shortlist via Firestore...');
      const success = await addContactToShortlist(user.uid, contact);
      console.log('📋 Add contact result:', success);
      
      if (success) {
        setLiked(true);
        setDisliked(false);

        if (!silent) {
          // show toast with Undo
          try {
            const undo = async () => {
              try {
                if (user?.uid) {
                  await removeContactFromShortlist(user.uid, emailKey);
                } else {
                  const s = JSON.parse(
                    localStorage.getItem("myContacts") ||
                      '{"shortlist":[],"sent":[],"trash":[]}'
                  );
                  s.shortlist = s.shortlist.filter(
                    (c) => (c.value || c.email) !== emailKey
                  );
                  localStorage.setItem("myContacts", JSON.stringify(s));
                }
                try {
                  setLiked(false);
                } catch (er) {}
                try {
                  window.dispatchEvent(
                    new CustomEvent("app-toast", {
                      detail: {
                        message: `Removed ${fullName} from shortlist`,
                        type: "info",
                      },
                    })
                  );
                } catch (ee) {}
              } catch (err) {
                /* swallow */
              }
            };

            window.dispatchEvent(
              new CustomEvent("app-toast", {
                detail: {
                  message: `Added ${fullName} to shortlist`,
                  type: "success",
                  actionLabel: "Undo",
                  onAction: undo,
                  duration: 5000,
                },
              })
            );
          } catch (e) {}
        }
        // Save interaction to backend training set
        try {
          await api.saveTrainingInteraction({ contact, action: 'accept', query: query || '' });
        } catch (e) {
          console.debug('Training save failed (firestore add):', e.message || e);
        }
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const handleLike = () => {
    if (!liked) {
      // Only mark liked in UI. Do NOT add to shortlist here.
      setLiked(true);
      setDisliked(false);
      try {
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: {
              message: `Liked ${fullName}`,
              type: "success",
              duration: 2000,
            },
          })
        );
      } catch (e) {}
    } else {
      // Unlike: just update UI state, don't touch shortlist
      setLiked(false);
      try {
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: {
              message: `Unliked ${fullName}`,
              type: "info",
              duration: 2000,
            },
          })
        );
      } catch (e) {}
    }
    setDisliked(false);
  };

  const handleDislike = async () => {
    try {
      const user = getCurrentUser();
      const emailKey = contact?.value || contact?.email;

      if (!disliked) {
        if (user?.uid) {
          // Use Firestore
          await moveContactToTrash(user.uid, contact);
        } else {
          // Fallback to localStorage
          const shortlist = JSON.parse(
            localStorage.getItem("myContacts") ||
              '{"shortlist":[],"sent":[],"trash":[]}'
          );
          shortlist.shortlist = shortlist.shortlist.filter(
            (c) => (c.value || c.email) !== emailKey
          );
          const existsInTrash = shortlist.trash.some(
            (c) => (c.value || c.email) === emailKey
          );
          if (!existsInTrash) {
            shortlist.trash.push(contact);
          }
          localStorage.setItem("myContacts", JSON.stringify(shortlist));
        }
        setDisliked(true);
        setLiked(false);
        try {
          window.dispatchEvent(
            new CustomEvent("app-toast", {
              detail: {
                message: `Disliked ${fullName}`,
                type: "info",
                duration: 2500,
              },
            })
          );
        } catch (e) {}
        // Save reject interaction to backend training set (best-effort)
        try {
          await api.saveTrainingInteraction({ contact, action: 'reject', query: query || '' });
        } catch (e) {
          console.debug('Training save failed (reject):', e.message || e);
        }
      } else {
        // Undo dislike: remove from trash
        if (user?.uid) {
          // Use Firestore - need to get contacts and update
          const contacts = await getUserContacts(user.uid);
          contacts.trash = contacts.trash.filter(
            (c) => (c.value || c.email) !== emailKey
          );
          const { updateUserContacts } = await import("../../services/firestore.service");
          await updateUserContacts(user.uid, contacts);
        } else {
          // Fallback to localStorage
          const shortlist = JSON.parse(
            localStorage.getItem("myContacts") ||
              '{"shortlist":[],"sent":[],"trash":[]}'
          );
          shortlist.trash = shortlist.trash.filter(
            (c) => (c.value || c.email) !== emailKey
          );
          localStorage.setItem("myContacts", JSON.stringify(shortlist));
        }
        setDisliked(false);
        try {
          window.dispatchEvent(
            new CustomEvent("app-toast", {
              detail: {
                message: `Removed dislike for ${fullName}`,
                type: "info",
                duration: 2000,
              },
            })
          );
        } catch (e) {}
      }
    } catch (e) {
      // swallow errors
    }
  };

  const handleAdd = () => {
    addToShortlist({ silent: false });
  };

  return (
    <div className="contact-card">
      <div className="contact-image-placeholder">
        {fullName.charAt(0).toUpperCase()}
      </div>
      <div className="contact-info">
        <h3 className="contact-name">{fullName}</h3>
        {position && position !== "N/A" && (
          <p className="contact-position">{position}</p>
        )}
        <p className="contact-employer">{company}</p>
        {industry && industry !== "N/A" && (
          <p className="contact-industry">{industry}</p>
        )}
        {email && (
          <p className="contact-email">
            <span className="contact-label">Email:</span>
            <a href={`mailto:${email}`} className="contact-link">
              {email}
            </a>
          </p>
        )}
        {linkedin && (
          <p className="contact-linkedin">
            <span className="contact-label">LinkedIn:</span>
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              View Profile
            </a>
          </p>
        )}
        <p className="contact-summary">{summary}</p>
      </div>
      <div className="contact-actions">
        <button
          className={`contact-action-btn like-btn ${liked ? "liked" : ""}`}
          onClick={handleLike}
          title="Like"
          aria-label={liked ? "Liked" : "Like"}
          aria-pressed={liked}
        >
          <Icon name="thumbs-up" size={16} />
        </button>
        <button
          className={`contact-action-btn dislike-btn ${
            disliked ? "disliked" : ""
          }`}
          onClick={handleDislike}
          title="Dislike"
          aria-label={disliked ? "Disliked" : "Dislike"}
          aria-pressed={disliked}
        >
          <Icon name="thumbs-down" size={16} />
        </button>
        <button
          className="contact-action-btn add-btn"
          onClick={handleAdd}
          title="Add to list"
          aria-label="Add to list"
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
};

export default ContactCard;
