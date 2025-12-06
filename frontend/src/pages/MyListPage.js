import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/layout/NavBar";
import { getCurrentUser } from "../config/authUtils";
import ListTable from "../components/list/ListTable";
import EmailPreview from "../components/list/EmailPreview";
import Icon from "../components/icons/Icon";
import "../styles/MyListPage.css";

/**
 * My List Page Component
 * Manage shortlist, sent emails, trash, and preview
 */
const MyListPage = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("shortlist");
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectionView, setSelectionView] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
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
      // Load contacts from localStorage or API
      const savedContacts = localStorage.getItem("myContacts");
      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedContact(null);
    setShowPreview(false);
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

  const performRemoveContact = (contact) => {
    const tab = activeTab;
    const updatedTab = (contacts[tab] || []).filter(
      (c) => (c.value || c.email) !== (contact.value || contact.email)
    );
    const updated = { ...contacts, [tab]: updatedTab };
    setContacts(updated);
    localStorage.setItem("myContacts", JSON.stringify(updated));
    if (
      selectedContact &&
      (selectedContact.value || selectedContact.email) ===
        (contact.value || contact.email)
    ) {
      setSelectedContact(null);
      setShowPreview(false);
    }

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

  const handleBulkSend = () => {
    if (selectedEmails.length === 0) return;
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
    localStorage.setItem("myContacts", JSON.stringify(updated));
    setSelectedEmails([]);
    setSelectionView(false);
  };

  const handleBulkRestore = () => {
    if (selectedEmails.length === 0) return;

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
    localStorage.setItem("myContacts", JSON.stringify(updated));
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

  const performBulkTrash = (emailsToMove) => {
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
    localStorage.setItem("myContacts", JSON.stringify(updated));
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

  const performBulkDelete = (emailsToDelete) => {
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
    localStorage.setItem("myContacts", JSON.stringify(updated));
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

  const handleRestoreContact = (contact) => {
    // Move a single contact from trash back to shortlist immediately
    if (!contact) return;
    const e = contact.value || contact.email;
    const updated = { ...contacts };
    // remove from trash
    updated.trash = (updated.trash || []).filter(
      (c) => (c.value || c.email) !== e
    );
    // add to shortlist if not already present
    updated.shortlist = updated.shortlist || [];
    if (!updated.shortlist.some((s) => (s.value || s.email) === e)) {
      updated.shortlist = [...updated.shortlist, contact];
    }
    setContacts(updated);
    localStorage.setItem("myContacts", JSON.stringify(updated));
  };

  const handleSendEmail = async (contact, emailData) => {
    // This is handled in EmailPreview component
    // Just update the contacts state
    const savedContacts = localStorage.getItem("myContacts");
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
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
          <button
            className={`list-tab ${activeTab === "preview" ? "active" : ""}`}
            onClick={() => handleTabChange("preview")}
          >
            Preview
          </button>
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
              onChangeTemplate={(contact, template) => {
                // update template for a contact in shortlist
                const e = contact.value || contact.email;
                setContacts((prev) => {
                  const next = { ...prev };
                  next.shortlist = (next.shortlist || []).map((c) =>
                    (c.value || c.email) === e ? { ...c, template } : c
                  );
                  localStorage.setItem("myContacts", JSON.stringify(next));
                  return next;
                });
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
                <button
                  className="btn btn-primary"
                  onClick={
                    activeTab === "trash" ? handleBulkRestore : handleBulkSend
                  }
                  title={
                    activeTab === "trash"
                      ? "Restore selected"
                      : "Send to selected"
                  }
                >
                  {activeTab !== "sent" && (
                    <button
                      className="btn btn-primary"
                      onClick={
                        activeTab === "trash"
                          ? handleBulkRestore
                          : handleBulkSend
                      }
                      title={
                        activeTab === "trash"
                          ? "Restore selected"
                          : "Send to selected"
                      }
                    >
                      <Icon
                        name={activeTab === "trash" ? "undo" : "paper-plane"}
                        size={14}
                      />
                      <span className="btn-label">
                        {activeTab === "trash" ? "Restore" : "Send"}
                      </span>
                    </button>
                  )}
                  } title=
                  {activeTab === "trash"
                    ? "Delete permanently"
                    : "Move selected to trash"}
                  >
                  <Icon name="trash" size={14} />
                  <span className="btn-label">
                    {activeTab === "trash" ? "Delete" : "Trash"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyListPage;
