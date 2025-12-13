import React, { useState, useRef, useEffect } from "react";
import "./ListTable.css";
import Icon from "../icons/Icon";
import { loadEmailTemplates } from "../../config/templates";

/**
 * List Table Component
 * Displays contacts in a table format
 */
const ListTable = ({
  contacts,
  activeTab,
  onContactSelect,
  selectedContact = null,
  onRemoveContact,
  onCopyContact,
  onRestoreContact,
  onChangeTemplate,
  // selection props
  selectionView = false,
  toggleSelectionView = () => {},
  selectedEmails = [],
  onToggleSelect = () => {},
}) => {
  const [templates, setTemplates] = useState([]);

  // Load templates from Firestore on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const loadedTemplates = await loadEmailTemplates();
        setTemplates(loadedTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplates([]);
      }
    };
    loadTemplates();
  }, []);

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

  const showSendCol = activeTab !== "sent";
  const colCount = 6 + (selectionView ? 1 : 0) + (showSendCol ? 1 : 0); // name, industry, company, title, template, actions-header

  return (
    <div className="list-table">
      <table>
        <thead>
          <tr>
            {selectionView && <th className="select-col"> </th>}
            <th>Name</th>
            <th>Industry</th>
            <th>Company</th>
            <th>Title</th>
            <th>Template</th>
            {showSendCol && (
              <th>{activeTab === "trash" ? "Restore?" : "Send?"}</th>
            )}
            <th className="actions-header">
              {/* header menu to the right of Send? */}
              <HeaderMenu
                selectionView={selectionView}
                toggleSelectionView={toggleSelectionView}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="empty-message">
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
                  onClick={() =>
                    selectionView
                      ? onToggleSelect(contact)
                      : onContactSelect(contact)
                  }
                >
                  {selectionView && (
                    <td
                      className="select-col"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(email)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleSelect(contact);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        aria-label={`Select ${fullName}`}
                      />
                    </td>
                  )}
                  <td>{fullName}</td>
                  <td>{contact.industry || contact.department || "N/A"}</td>
                  <td>{contact.company || contact.organization || "N/A"}</td>
                  <td>{contact.position || "N/A"}</td>
                  <td>
                    {activeTab === "shortlist" &&
                    typeof onChangeTemplate === "function" ? (
                      <select
                        className="template-select"
                        value={contact.template || getTemplateName(contact)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onChangeTemplate &&
                            onChangeTemplate(contact, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Template for ${
                          contact.first_name ||
                          contact.name ||
                          contact.email
                        }`}
                      >
                        {templates.map((t) => (
                          <option key={t.id ?? t.name} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="template-badge">
                        {getTemplateName(contact)}
                      </span>
                    )}
                  </td>
                  {showSendCol && (
                    <td className="actions-cell">
                      {activeTab === "trash" ? (
                        <button
                          className="send-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreContact && onRestoreContact(contact);
                          }}
                          title="Restore"
                        >
                          <Icon name="undo" size={18} />
                        </button>
                      ) : (
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
                      )}
                      {/* per-row actions removed */}
                    </td>
                  )}
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
const HeaderMenu = ({
  selectionView = false,
  toggleSelectionView = () => {},
}) => {
  const [open, setOpen] = React.useState(false);
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
            onClick={() => toggleSelectionView(!selectionView)}
          >
            Toggle Selection View
          </button>
        </div>
      )}
    </div>
  );
};
