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
    const [contacts, setContacts] = useState({
        shortlist: [],
        sent: [],
        trash: []
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
                    <div className={`list-table-container ${showPreview ? "with-preview" : ""}`}>
                        <ListTable
                            contacts={getCurrentContacts()}
                            activeTab={activeTab}
                            onContactSelect={handleContactSelect}
                            selectedContact={selectedContact}
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
                </div>
            </div>
        </div>
    );
};

export default MyListPage;

