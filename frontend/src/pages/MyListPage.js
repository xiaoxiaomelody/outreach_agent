import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/layout/NavBar";
import { getCurrentUser } from "../config/authUtils";
import ListTable from "../components/list/ListTable";
import EmailPreview from "../components/list/EmailPreview";
import Icon from "../components/icons/Icon";
import {
  getUserContacts,
  updateUserContacts,
  removeContactFromShortlist,
  moveContactToTrash,
  moveContactToSent,
  restoreContactFromTrash,
} from "../services/firestore.service";
import "../styles/MyListPage.css";

/**
 * My List Page Component
 * Manage shortlist, sent emails, trash, and preview
 */
const MyListPage = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("shortlist");
  const [selectedContact, setSelectedContact] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectionView, setSelectionView] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);

  const [contacts, setContacts] = useState({
    shortlist: [],
    sent: [],
    trash: [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // Load contacts from Firestore
      loadContactsFromFirestore(currentUser.uid);

      // Set up a listener for storage events (when ContactCard updates Firestore)
      const handleStorageChange = () => {
        console.log("📋 Storage event detected, reloading contacts...");
        loadContactsFromFirestore(currentUser.uid);
      };

      // Listen for custom events from ContactCard
      window.addEventListener("contacts-updated", handleStorageChange);

      // Also poll periodically to catch Firestore updates (fallback)
      const pollInterval = setInterval(() => {
        loadContactsFromFirestore(currentUser.uid);
      }, 3000); // Poll every 3 seconds

      return () => {
        window.removeEventListener("contacts-updated", handleStorageChange);
        clearInterval(pollInterval);
      };
    } else {
      navigate("/");
    }
  }, [navigate]);

  const loadContactsFromFirestore = async (userId) => {
    try {
      console.log("📋 Loading contacts from Firestore for user:", userId);
      const firestoreContacts = await getUserContacts(userId);
      console.log("📋 Loaded contacts from Firestore:", firestoreContacts);
      
      // Always use Firestore data for authenticated users (even if empty)
      // This ensures each user gets their own data, not shared localStorage
      setContacts(firestoreContacts);
      console.log("✅ Using Firestore contacts (user-specific data)");
    } catch (error) {
      console.error("❌ Error loading contacts from Firestore:", error);
      // On error, still use empty arrays rather than localStorage
      // to prevent showing wrong user's data
      setContacts({ shortlist: [], sent: [], trash: [] });
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedContact(null);
    setShowPreview(false);
    // clear any selection when changing tabs
    setSelectedEmails([]);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleContactSelect = (contact) => {
    // In selection view, toggle selection instead of opening preview
    const email = contact?.value || contact?.email;
    if (selectionView) {
      setSelectedEmails((s) =>
        s.includes(email) ? s.filter((e) => e !== email) : [...s, email]
      );
      return;
    }
    // Open preview when paper airplane is clicked
    setSelectedContact(contact);
    setShowPreview(true);
  };

  const handleRemoveContact = (contact) => {
    const fullName =
      `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
      contact.name ||
      contact.value ||
      contact.email ||
      "this contact";

    const isTrash = activeTab === "trash";
    const message = isTrash
      ? `Delete ${fullName} permanently?`
      : `Delete ${fullName} from ${activeTab}?`;

    // Dispatch a confirmation toast — user must click the action to confirm
    try {
      window.dispatchEvent(
        new CustomEvent("app-toast", {
          detail: {
            message,
            type: "warning",
            actionLabel: "Delete",
            duration: 6000,
            onAction: () => performRemoveContact(contact),
          },
        })
      );
    } catch (err) {
      // fallback: perform immediately
      performRemoveContact(contact);
    }
  };

  const performRemoveContact = async (contact) => {
    if (!user?.uid) return;

    const tab = activeTab;
    const updatedTab = (contacts[tab] || []).filter(
      (c) => (c.value || c.email) !== (contact.value || contact.email)
    );
    const updated = { ...contacts, [tab]: updatedTab };
    setContacts(updated);

    // Update Firestore
    try {
      await updateUserContacts(user.uid, updated);
    } catch (error) {
      console.error("Error updating contacts in Firestore:", error);
      // // Fallback to localStorage
      // localStorage.setItem("myContacts", JSON.stringify(updated));
    }
    // clear selection if the removed contact was selected (selectionView handles checkboxes)

    // If we permanently deleted from Trash, offer undo to restore into Trash
    if (tab === "trash") {
      try {
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: {
              message: `${
                contact.first_name ||
                contact.name ||
                contact.value ||
                contact.email
              } deleted permanently`,
              type: "warning",
              actionLabel: "Undo",
              duration: 6000,
              onAction: () => {
                setContacts((prev) => {
                  const next = { ...prev };
                  next.trash = next.trash || [];
                  // avoid duplicates
                  if (
                    !next.trash.some(
                      (c) =>
                        (c.value || c.email) ===
                        (contact.value || contact.email)
                    )
                  ) {
                    next.trash = [...next.trash, contact];
                  }
                  // Update Firestore
                  if (user?.uid) {
                    updateUserContacts(user.uid, next).catch((error) => {
                      console.error(
                        "Error updating contacts in Firestore:",
                        error
                      );
                      localStorage.setItem("myContacts", JSON.stringify(next));
                    });
                  } else {
                    localStorage.setItem("myContacts", JSON.stringify(next));
                  }
                  return next;
                });
              },
            },
          })
        );
      } catch (err) {
        // ignore
      }
    }
  };

  const toggleSelectionView = (enabled) => {
    setSelectionView((prev) => {
      const next = typeof enabled === "boolean" ? enabled : !prev;
      if (!next) {
        // clearing selection when exiting selection view
        setSelectedEmails([]);
      }
      return next;
    });
  };

  const handleToggleSelect = (contact) => {
    const email = contact?.value || contact?.email;
    setSelectedEmails((s) =>
      s.includes(email) ? s.filter((e) => e !== email) : [...s, email]
    );
  };

  const handleBulkSend = async () => {
    if (selectedEmails.length === 0 || !user?.uid) return;

    const updated = { ...contacts };
    const moved = [];
    // remove from each tab and collect moved contacts
    ["shortlist", "sent", "trash"].forEach((tab) => {
      const keep = [];
      (updated[tab] || []).forEach((c) => {
        const e = c.value || c.email;
        if (selectedEmails.includes(e)) {
          if (tab !== "sent") moved.push(c);
        } else {
          keep.push(c);
        }
      });
      updated[tab] = keep;
    });
    updated.sent = [...(updated.sent || []), ...moved];
    setContacts(updated);

    // Update Firestore
    try {
      await updateUserContacts(user.uid, updated);
    } catch (error) {
      console.error("Error updating contacts in Firestore:", error);
      localStorage.setItem("myContacts", JSON.stringify(updated));
    }

    setSelectedEmails([]);
    setSelectionView(false);
  };

  const handleBulkRestore = async () => {
    if (selectedEmails.length === 0 || !user?.uid) return;

    const updated = { ...contacts };
    const moved = [];

    // Only move from trash back to shortlist
    (updated.trash || []).forEach((c) => {
      const e = c.value || c.email;
      if (selectedEmails.includes(e)) moved.push(c);
    });

    if (moved.length === 0) return;

    // remove moved from trash
    updated.trash = (updated.trash || []).filter(
      (c) => !selectedEmails.includes(c.value || c.email)
    );

    // avoid duplicates when restoring
    const existingShortlist = updated.shortlist || [];
    const toAdd = moved.filter(
      (m) =>
        !existingShortlist.some(
          (s) => (s.value || s.email) === (m.value || m.email)
        )
    );
    updated.shortlist = [...existingShortlist, ...toAdd];

    setContacts(updated);

    // Update Firestore
    try {
      await updateUserContacts(user.uid, updated);
    } catch (error) {
      console.error("Error updating contacts in Firestore:", error);
      localStorage.setItem("myContacts", JSON.stringify(updated));
    }

    setSelectedEmails([]);
    setSelectionView(false);
  };

  const handleBulkTrash = () => {
    if (selectedEmails.length === 0) return;

    const emailsToMove = [...selectedEmails];

    try {
      window.dispatchEvent(
        new CustomEvent("app-toast", {
          detail: {
            message: `Move ${emailsToMove.length} selected contact(s) to Trash?`,
            type: "warning",
            actionLabel: "Move",
            duration: 6000,
            onAction: () => performBulkTrash(emailsToMove),
          },
        })
      );
    } catch (err) {
      performBulkTrash(emailsToMove);
    }
  };

  const performBulkTrash = async (emailsToMove) => {
    if (!user?.uid) return;

    const updated = { ...contacts };
    // collect moved items with source tab so we can undo
    const movedEntries = [];
    ["shortlist", "sent", "trash"].forEach((tab) => {
      const keep = [];
      (updated[tab] || []).forEach((c) => {
        const e = c.value || c.email;
        if (emailsToMove.includes(e)) {
          // avoid duplicates in trash
          if (!updated.trash.some((t) => (t.value || t.email) === e)) {
            movedEntries.push({ contact: c, from: tab });
          }
        } else {
          keep.push(c);
        }
      });
      updated[tab] = keep;
    });
    updated.trash = [
      ...(updated.trash || []),
      ...movedEntries.map((m) => m.contact),
    ];
    setContacts(updated);

    // Update Firestore
    try {
      await updateUserContacts(user.uid, updated);
    } catch (error) {
      console.error("Error updating contacts in Firestore:", error);
      localStorage.setItem("myContacts", JSON.stringify(updated));
    }

    setSelectedEmails((s) => s.filter((e) => !emailsToMove.includes(e)));
    setSelectionView(false);

    // show undo toast
    if (movedEntries.length > 0) {
      try {
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: {
              message: `Moved ${movedEntries.length} contact(s) to Trash`,
              type: "info",
              actionLabel: "Undo",
              duration: 6000,
              onAction: () => {
                // restore moved entries back to their original tabs
                setContacts((prev) => {
                  const next = { ...prev };
                  // remove moved entries from trash
                  next.trash = (next.trash || []).filter(
                    (c) => !emailsToMove.includes(c.value || c.email)
                  );
                  movedEntries.forEach(({ contact, from }) => {
                    next[from] = next[from] || [];
                    // avoid duplicates
                    if (
                      !next[from].some(
                        (s) =>
                          (s.value || s.email) ===
                          (contact.value || contact.email)
                      )
                    ) {
                      next[from] = [...next[from], contact];
                    }
                  });
                  localStorage.setItem("myContacts", JSON.stringify(next));
                  return next;
                });
              },
            },
          })
        );
      } catch (err) {
        // ignore
      }
    }
  };

  // Permanently delete selected items from Trash
  const handleBulkDeletePermanent = () => {
    if (selectedEmails.length === 0) return;

    const emailsToDelete = [...selectedEmails];

    try {
      window.dispatchEvent(
        new CustomEvent("app-toast", {
          detail: {
            message: `Delete ${emailsToDelete.length} selected contact(s) permanently?`,
            type: "warning",
            actionLabel: "Delete",
            duration: 6000,
            onAction: () => performBulkDelete(emailsToDelete),
          },
        })
      );
    } catch (err) {
      performBulkDelete(emailsToDelete);
    }
  };

  const performBulkDelete = async (emailsToDelete) => {
    if (!user?.uid) return;

    const updated = { ...contacts };
    // capture full objects being deleted so Undo can restore them
    const deletedObjects = (updated.trash || []).filter((c) =>
      emailsToDelete.includes(c.value || c.email)
    );

    // Only remove from trash
    updated.trash = (updated.trash || []).filter(
      (c) => !emailsToDelete.includes(c.value || c.email)
    );
    setContacts(updated);

    // Update Firestore
    try {
      await updateUserContacts(user.uid, updated);
    } catch (error) {
      console.error("Error updating contacts in Firestore:", error);
      localStorage.setItem("myContacts", JSON.stringify(updated));
    }

    setSelectedEmails((s) => s.filter((e) => !emailsToDelete.includes(e)));
    setSelectionView(false);

    // Offer undo to restore permanently deleted items back into trash with full objects
    try {
      window.dispatchEvent(
        new CustomEvent("app-toast", {
          detail: {
            message: `Deleted ${deletedObjects.length} contact(s) permanently`,
            type: "warning",
            actionLabel: "Undo",
            duration: 6000,
            onAction: () => {
              setContacts((prev) => {
                const next = { ...prev };
                next.trash = next.trash || [];
                deletedObjects.forEach((obj) => {
                  if (
                    !next.trash.some(
                      (c) => (c.value || c.email) === (obj.value || obj.email)
                    )
                  ) {
                    next.trash = [...next.trash, obj];
                  }
                });
                localStorage.setItem("myContacts", JSON.stringify(next));
                return next;
              });
            },
          },
        })
      );
    } catch (err) {
      // ignore
    }
  };

  const handleCopyContact = (contact) => {
    const email = contact.value || contact.email || "";
    if (navigator.clipboard && email) {
      navigator.clipboard.writeText(email).catch(() => {});
    }
  };

  const handleRestoreContact = async (contact) => {
    // Move a single contact from trash back to shortlist immediately
    if (!contact || !user?.uid) return;

    try {
      await restoreContactFromTrash(user.uid, contact);
      // Reload contacts from Firestore
      await loadContactsFromFirestore(user.uid);
    } catch (error) {
      console.error("Error restoring contact:", error);
      // Fallback to local update
      const e = contact.value || contact.email;
      const updated = { ...contacts };
      updated.trash = (updated.trash || []).filter(
        (c) => (c.value || c.email) !== e
      );
      updated.shortlist = updated.shortlist || [];
      if (!updated.shortlist.some((s) => (s.value || s.email) === e)) {
        updated.shortlist = [...updated.shortlist, contact];
      }
      setContacts(updated);
      localStorage.setItem("myContacts", JSON.stringify(updated));
    }
  };

  const handleSendEmail = async (contact, emailData) => {
    // Reload contacts from Firestore to reflect the sent status
    if (user?.uid) {
      try {
        await loadContactsFromFirestore(user.uid);
        // Also dispatch event to trigger refresh
        window.dispatchEvent(new CustomEvent("contacts-updated"));
      } catch (error) {
        console.error("Error reloading contacts after send:", error);
      }
    }
  };

  const getCurrentContacts = () => {
    return contacts[activeTab] || [];
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="my-list-page">
      <NavBar />
      <div className="my-list-page-content">
        <div className="list-greeting">
          <div className="greeting-inner">
            <h1>
              {greeting()},{" "}
              {user?.displayName || user?.email?.split("@")[0] || "User"}! Let's
              get networking!
            </h1>
          </div>
          <div className="banner-cta-wrapper">
            <button
              className="banner-cta"
              onClick={() => navigate("/search")}
              aria-label="Or, start a search"
            >
              Or, start a search
            </button>
          </div>
        </div>
        <div className="list-tabs">
          <button
            className={`list-tab ${activeTab === "shortlist" ? "active" : ""}`}
            onClick={() => handleTabChange("shortlist")}
          >
            My Shortlist
          </button>
          <button
            className={`list-tab ${activeTab === "sent" ? "active" : ""}`}
            onClick={() => handleTabChange("sent")}
          >
            Sent
          </button>
          <button
            className={`list-tab ${activeTab === "trash" ? "active" : ""}`}
            onClick={() => handleTabChange("trash")}
          >
            Trash
          </button>
          {/* Preview tab removed */}
        </div>
        <div className="list-content">
          <div
            className={`list-table-container ${
              showPreview ? "with-preview" : ""
            }`}
          >
            <ListTable
              contacts={getCurrentContacts()}
              activeTab={activeTab}
              onContactSelect={handleContactSelect}
              selectedContact={selectedContact}
              onRemoveContact={handleRemoveContact}
              onRestoreContact={(contact) => handleRestoreContact(contact)}
              onChangeTemplate={async (contact, template) => {
                // update template for a contact in shortlist
                if (!user?.uid) return;

                const e = contact.value || contact.email;
                const next = { ...contacts };
                next.shortlist = (next.shortlist || []).map((c) =>
                  (c.value || c.email) === e ? { ...c, template } : c
                );
                setContacts(next);

                // Update Firestore
                try {
                  await updateUserContacts(user.uid, next);
                } catch (error) {
                  console.error("Error updating contacts in Firestore:", error);
                  localStorage.setItem("myContacts", JSON.stringify(next));
                }
              }}
              onCopyContact={handleCopyContact}
              selectionView={selectionView}
              toggleSelectionView={toggleSelectionView}
              selectedEmails={selectedEmails}
              onToggleSelect={handleToggleSelect}
            />
          </div>
          {showPreview && selectedContact && (
            <EmailPreview
              contact={selectedContact}
              onClose={() => {
                setShowPreview(false);
                setSelectedContact(null);
              }}
              onSend={handleSendEmail}
            />
          )}
          {/* Bulk action footer shown when there are selected items */}
          {selectionView && selectedEmails.length > 0 && (
            <div className="bulk-action-footer">
              <div className="bulk-action-count">
                {selectedEmails.length} selected
              </div>
              <div className="bulk-action-buttons">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setSelectedEmails([]);
                    setSelectionView(false);
                  }}
                  title="Cancel selection"
                >
                  <Icon name="close" size={14} />
                  <span className="btn-label">Cancel</span>
                </button>

                {/* Primary action: Restore (when in trash) or Send (when not in sent and not in trash) */}
                {activeTab === "trash" ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleBulkRestore}
                    title="Restore selected"
                  >
                    <Icon name="undo" size={14} />
                    <span className="btn-label">Restore</span>
                  </button>
                ) : activeTab !== "sent" ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleBulkSend}
                    title="Send to selected"
                  >
                    <Icon name="paper-plane" size={14} />
                    <span className="btn-label">Send</span>
                  </button>
                ) : null}

                {/* Secondary destructive action: Move to Trash or Delete Permanently */}
                {activeTab === "trash" ? (
                  <button
                    className="btn btn-danger"
                    onClick={handleBulkDeletePermanent}
                    title="Delete permanently"
                  >
                    <Icon name="trash" size={14} />
                    <span className="btn-label">Delete</span>
                  </button>
                ) : (
                  <button
                    className="btn btn-danger"
                    onClick={handleBulkTrash}
                    title="Move selected to trash"
                  >
                    <Icon name="trash" size={14} />
                    <span className="btn-label">Trash</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyListPage;
