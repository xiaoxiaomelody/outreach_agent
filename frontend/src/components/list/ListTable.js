import React from "react";
import "./ListTable.css";

/**
 * List Table Component
 * Displays contacts in a table format
 */
const ListTable = ({ contacts, activeTab, onContactSelect, selectedContact }) => {
    const getTemplateName = (contact) => {
        // Determine template based on industry or use default
        if (contact.industry) {
            const industry = contact.industry.toLowerCase();
            if (industry.includes("finance") || industry.includes("bank")) return "Finance";
            if (industry.includes("tech") || industry.includes("software")) return "Tech";
            if (industry.includes("medicine") || industry.includes("health")) return "Medicine";
            if (industry.includes("witchcraft") || industry.includes("wizard")) return "Wizardry";
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
                    </tr>
                </thead>
                <tbody>
                    {contacts.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="empty-message">
                                No contacts in {activeTab}
                            </td>
                        </tr>
                    ) : (
                        contacts.map((contact, index) => {
                            const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.name || "Unknown";
                            const email = contact.value || contact.email || "";
                            const isSelected = selectedContact?.value === email || selectedContact?.email === email;

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
                                    <td>
                                        <button
                                            className="send-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onContactSelect(contact);
                                            }}
                                            title="Send email"
                                        >
                                            ✈️
                                        </button>
                                    </td>
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

