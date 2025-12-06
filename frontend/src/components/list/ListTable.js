import React, { useState, useRef, useEffect } from "react";
import "./ListTable.css";
import Icon from "../icons/Icon";

/**
 * List Table Component
 * Displays contacts in a table format
 */
const ListTable = ({
  contacts,
  activeTab,
  onContactSelect,
  selectedContact,
  onRemoveContact,
  onRequestRemoveContact,
  onCopyContact,
}) => {
  const getTemplateName = (contact) => {
    // Determine template based on industry or use default
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
    return "Tech"; // Default
  };

  return (
    <div className="list-table">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Industry</th>
            <th>Company</th>
            <th>Title</th>
            <th>Template</th>
            <th>Send?</th>
            <th className="actions-header">
              {/* header menu to the right of Send? */}
              <HeaderMenu />
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.length === 0 ? (
            <tr>
              <td colSpan="7" className="empty-message">
                No contacts in {activeTab}
              </td>
            </tr>
          ) : (
            contacts.map((contact, index) => {
              const fullName =
                `${contact.first_name || ""} ${
                  contact.last_name || ""
                }`.trim() ||
                contact.name ||
                "Unknown";
              const email = contact.value || contact.email || "";
              const isSelected =
                selectedContact?.value === email ||
                selectedContact?.email === email;

              return (
                <tr
                  key={email || index}
                  className={isSelected ? "selected" : ""}
                  onClick={() => onContactSelect(contact)}
                >
                  <td>{fullName}</td>
                  <td>{contact.industry || contact.department || "N/A"}</td>
                  <td>{contact.company || contact.organization || "N/A"}</td>
                  <td>{contact.position || "N/A"}</td>
                  <td>
                    <span className="template-badge">
                      {getTemplateName(contact)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="send-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContactSelect(contact);
                      }}
                      title="Send email"
                    >
                      <Icon name="paper-plane" size={18} />
                    </button>
                    {activeTab === "shortlist" && onRequestRemoveContact && (
                      <button
                        className="remove-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestRemoveContact(contact);
                        }}
                        title="Remove from shortlist"
                      >
                        Remove
                      </button>
                    )}
                    {/* per-row actions removed */}
                  </td>
                  {/* spacer cell to match header actions column so hover fills full width */}
                  <td className="actions-header-cell" aria-hidden="true"></td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ListTable;

// Header menu component placed in the table header to the right of Send
const HeaderMenu = () => {
  const [open, setOpen] = React.useState(false);
  const [selectionView, setSelectionView] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="header-menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        className={`table-menu-btn ${selectionView ? "active" : ""}`}
        onClick={() => setOpen((s) => !s)}
        aria-label="Table options"
      >
        ⋮
      </button>
      {open && (
        <div className="table-menu">
          <button
            className={`table-menu-item toggle-selection ${
              selectionView ? "active" : ""
            }`}
            onClick={() => setSelectionView((s) => !s)}
          >
            Toggle Selection View
          </button>
        </div>
      )}
    </div>
  );
};
