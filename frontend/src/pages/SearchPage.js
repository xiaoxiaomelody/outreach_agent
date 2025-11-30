import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/layout/NavBar";
import { getCurrentUser } from "../config/authUtils";
import nlpSearchApi from "../api/nlpSearch";
import gmailApi from "../api/gmail";
import ContactCard from "../components/contacts/ContactCard";
import GmailConnectButton from "../components/email/GmailConnectButton";
import "../styles/SearchPage.css";

/**
 * Search Page Component
 * Main search interface with search bar and results
 */
const SearchPage = () => {
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [gmailConnected, setGmailConnected] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            // Check Gmail connection status
            checkGmailStatus();
        } else {
            navigate("/");
        }
    }, [navigate]);

    const checkGmailStatus = async () => {
        try {
            const result = await gmailApi.getGmailStatus();
            if (result.success) {
                setGmailConnected(result.data.connected);
            }
        } catch (error) {
            console.error("Check Gmail status error:", error);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const result = await nlpSearchApi.nlpSearch(searchQuery);

            if (result.success && result.data) {
                const contactData = result.data.contacts || [];
                const validContacts = contactData.filter(contact => 
                    contact && (contact.first_name || contact.last_name || contact.name) && (contact.value || contact.email)
                );
                setContacts(validContacts);
                
                if (validContacts.length === 0) {
                    setError(`No contacts found for "${searchQuery}". Try a different search.`);
                }
            } else {
                setError(result.error || "Failed to search contacts. Make sure backend is running.");
                setContacts([]);
            }
        } catch (err) {
            console.error("Search error:", err);
            setError("Error connecting to backend. Is your server running on port 8080?");
            setContacts([]);
        } finally {
            setLoading(false);
        }
    };

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    if (!user) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="search-page">
            <NavBar />
            <div className="search-page-content">
                {!hasSearched ? (
                    <>
                        <div className="search-greeting">
                            <h1>
                                {greeting()}, {user.displayName || user.email?.split("@")[0] || "User"}! 
                                What do you want to look for today?
                            </h1>
                        </div>
                        <form className="search-bar-container" onSubmit={handleSearch}>
                            <div className="search-bar">
                                <button type="button" className="search-menu-icon">☰</button>
                                <input
                                    type="text"
                                    placeholder="Search for companies, industries, or job titles"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                                <button type="submit" className="search-icon">🔍</button>
                            </div>
                        </form>
                        {!gmailConnected && (
                            <div className="gmail-connect-prompt">
                                <GmailConnectButton onStatusChange={setGmailConnected} />
                            </div>
                        )}
                        <div className="recommended-section">
                            <h3>Recommended for you</h3>
                            <p className="recommended-subtitle">Based on your previous searches</p>
                            <div className="recommended-placeholder">
                                <p>Start searching to see recommendations</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <form className="search-bar-container" onSubmit={handleSearch}>
                            <div className="search-bar">
                                <button type="button" className="search-menu-icon">☰</button>
                                <input
                                    type="text"
                                    placeholder="Search for companies, industries, or job titles"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                                <button type="submit" className="search-icon">🔍</button>
                            </div>
                        </form>
                        <div className="search-results-header">
                            <h2>Here's what we found for '{searchQuery}'</h2>
                        </div>
                        {loading && <div className="loading">Searching...</div>}
                        {error && <div className="error-message">⚠️ {error}</div>}
                        {contacts.length > 0 && (
                            <div className="contacts-grid">
                                {contacts.map((contact, index) => (
                                    <ContactCard
                                        key={contact.value || contact.email || index}
                                        contact={contact}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SearchPage;

