import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/layout/NavBar";
import { getCurrentUser } from "../config/authUtils";
import ListTable from "../components/list/ListTable";
import EmailPreview from "../components/list/EmailPreview";
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
  const [pendingRemoval, setPendingRemoval] = useState(null);
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
    setSelectedContact(contact);
    setShowPreview(true);
  };

  // Legacy immediate removal (keeps prior behavior)
  const handleRemoveContact = (contact) => {
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
  };

  // Request a removal with confirmation — opens a confirm dialog
  const handleRequestRemoveContact = (contact) => {
    setPendingRemoval(contact);
  };

  const handleCancelRemove = () => setPendingRemoval(null);

  const handleConfirmRemove = () => {
    if (!pendingRemoval) return;
    const contact = pendingRemoval;
    const tab = activeTab;

    // snapshot for undo
    const previous = JSON.parse(JSON.stringify(contacts));

    const updatedTab = (contacts[tab] || []).filter(
      (c) => (c.value || c.email) !== (contact.value || contact.email)
    );
    const updated = { ...contacts, [tab]: updatedTab };

    // if removing from shortlist, move to trash instead of permanent delete
    if (tab === "shortlist") {
      const existsInTrash = updated.trash.some(
        (c) => (c.value || c.email) === (contact.value || contact.email)
      );
      if (!existsInTrash) {
        updated.trash = [...(updated.trash || []), contact];
      }
    }

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

    setPendingRemoval(null);

    // show undo toast
    try {
      const undo = () => {
        try {
          setContacts(previous);
          localStorage.setItem("myContacts", JSON.stringify(previous));
        } catch (err) {
          /* swallow */
        }
      };

      window.dispatchEvent(
        new CustomEvent("app-toast", {
          detail: {
            message: `Removed ${
              contact.first_name || contact.name || contact.email
            } from ${tab}`,
            type: "info",
            actionLabel: "Undo",
            onAction: undo,
            duration: 5000,
          },
        })
      );
    } catch (e) {}
  };

  const handleCopyContact = (contact) => {
    const email = contact.value || contact.email || "";
    if (navigator.clipboard && email) {
      navigator.clipboard.writeText(email).catch(() => {});
    }
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
              onRequestRemoveContact={handleRequestRemoveContact}
              onCopyContact={handleCopyContact}
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
          {pendingRemoval && (
            <div className="confirm-overlay" onClick={handleCancelRemove}>
              <div
                className="confirm-dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Confirm removal</h3>
                <p>
                  Are you sure you want to remove{" "}
                  <strong>
                    {pendingRemoval.first_name ||
                      pendingRemoval.name ||
                      pendingRemoval.email}
                  </strong>{" "}
                  from <strong>{activeTab}</strong>?
                </p>
                <div className="confirm-actions">
                  <button className="btn-cancel" onClick={handleCancelRemove}>
                    Cancel
                  </button>
                  <button className="btn-danger" onClick={handleConfirmRemove}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyListPage;
