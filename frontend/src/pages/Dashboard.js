import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logOut, getCurrentUser } from "../config/authUtils";
import hunterApi from "../api/hunter";
import "../styles/Dashboard.css";

/**
 * Dashboard Component
 * Outreach Agent - Contact sourcing and email management
 */
const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [acceptedContacts, setAcceptedContacts] = useState([]);
    const [companyDomain, setCompanyDomain] = useState("");
    const [searchLimit, setSearchLimit] = useState(10);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check for demo mode first
        const isDemoMode = sessionStorage.getItem("isDemoMode");
        if (isDemoMode) {
            const demoUser = JSON.parse(sessionStorage.getItem("demoUser"));
            setUser({ ...demoUser, isDemoMode: true });
            setLoading(false);
            return;
        }

        // Get current user from Firebase
        const currentUser = getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        } else {
            navigate("/");
        }
        setLoading(false);
    }, [navigate]);

    /**
     * Handle user logout
     */
    const handleLogout = async () => {
        sessionStorage.removeItem("isDemoMode");
        sessionStorage.removeItem("demoUser");
        const result = await logOut();
        if (result.success || result.error) {
            navigate("/");
        }
    };

    /**
     * Search for contacts at a company
     */
    const handleSearch = async (e) => {
        e.preventDefault();
        
        if (!companyDomain.trim()) {
            setError("Please enter a company domain");
            return;
        }

        setSearchLoading(true);
        setError(null);
        setContacts([]);

        try {
            // Note: This would call your backend which uses hunter-with-summaries service
            // You'll need to create the backend endpoint that returns contacts with AI summaries
            const result = await hunterApi.findCompanyContacts(companyDomain, searchLimit);

            if (result.success && result.data) {
                // Extract contacts from the response
                const contactData = result.data.contacts || result.data.data?.contacts || [];
                setContacts(contactData);
                
                if (contactData.length === 0) {
                    setError(`No contacts found for ${companyDomain}. Try another company.`);
                }
            } else {
                setError(result.error || "Failed to search contacts. Make sure backend is running.");
            }
        } catch (err) {
            console.error("Search error:", err);
            setError("Error connecting to backend. Is your server running on port 8080?");
        } finally {
            setSearchLoading(false);
        }
    };

    /**
     * Accept a contact - move to accepted list
     */
    const handleAccept = (contact) => {
        setContacts(contacts.filter(c => c.email !== contact.email));
        setAcceptedContacts([...acceptedContacts, { ...contact, status: 'accepted' }]);
    };

    /**
     * Reject a contact - remove from list
     */
    const handleReject = (contact) => {
        setContacts(contacts.filter(c => c.email !== contact.email));
    };

    /**
     * Remove from accepted list
     */
    const handleRemoveAccepted = (contact) => {
        setAcceptedContacts(acceptedContacts.filter(c => c.email !== contact.email));
    };

    /**
     * Try example search
     */
    const tryExample = (domain) => {
        setCompanyDomain(domain);
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>🎯 Outreach Agent</h1>
                    <div className="header-right">
                        <span className="user-email">{user.email}</span>
                        <button onClick={handleLogout} className="btn btn-logout">
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                {/* Search Section */}
                <div className="search-section">
                    <form onSubmit={handleSearch} className="search-form">
                        <div className="form-group">
                            <label>🏢 Company Domain</label>
                            <input
                                type="text"
                                value={companyDomain}
                                onChange={(e) => setCompanyDomain(e.target.value)}
                                placeholder="e.g., stripe.com, google.com"
                                className="search-input"
                                disabled={searchLoading}
                            />
                        </div>
                        <div className="form-group-small">
                            <label>📊 Limit</label>
                            <select 
                                value={searchLimit} 
                                onChange={(e) => setSearchLimit(Number(e.target.value))}
                                disabled={searchLoading}
                                className="search-select"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                                <option value={20}>20</option>
                            </select>
                        </div>
                        <button 
                            type="submit" 
                            className="btn btn-search"
                            disabled={searchLoading}
                        >
                            {searchLoading ? "🔍 Searching..." : "🔍 Find Contacts"}
                        </button>
                    </form>

                    <div className="examples">
                        <span>Try: </span>
                        <button onClick={() => tryExample("stripe.com")} className="example-btn">
                            Stripe
                        </button>
                        <button onClick={() => tryExample("google.com")} className="example-btn">
                            Google
                        </button>
                        <button onClick={() => tryExample("microsoft.com")} className="example-btn">
                            Microsoft
                        </button>
                    </div>

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* Two-Column Layout */}
                <div className="two-column-layout">
                    {/* Left: Contact Sourcing */}
                    <div className="sourcing-section">
                        <h2>📧 Found Contacts ({contacts.length})</h2>
                        {searchLoading && (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Finding contacts for you...</p>
                            </div>
                        )}
                        
                        {!searchLoading && contacts.length === 0 && !error && (
                            <div className="empty-state">
                                <p>🔍 Enter a company domain above to find contacts</p>
                                <p className="hint">Results will appear here with AI-generated summaries!</p>
                            </div>
                        )}

                        <div className="contacts-grid">
                            {contacts.map((contact, index) => (
                                <ContactCard
                                    key={contact.email || index}
                                    contact={contact}
                                    onAccept={handleAccept}
                                    onReject={handleReject}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right: Accepted Contacts */}
                    <div className="accepted-section">
                        <h2>✅ Accepted Contacts ({acceptedContacts.length})</h2>
                        
                        {acceptedContacts.length === 0 && (
                            <div className="empty-state">
                                <p>📬 No contacts accepted yet</p>
                                <p className="hint">Click "Accept" on contacts to add them here</p>
                            </div>
                        )}

                        <div className="accepted-list">
                            {acceptedContacts.map((contact, index) => (
                                <AcceptedContactCard
                                    key={contact.email || index}
                                    contact={contact}
                                    onRemove={handleRemoveAccepted}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Contact Card Component
 * Displays individual contact with AI summary and actions
 */
const ContactCard = ({ contact, onAccept, onReject }) => {
    return (
        <div className="contact-card">
            <div className="contact-header">
                <h3>{contact.name || "Unknown"}</h3>
                {contact.verified && <span className="verified-badge">✓ Verified</span>}
            </div>

            <div className="contact-body">
                <div className="contact-info">
                    <div className="info-row">
                        <span className="label">📧 Email:</span>
                        <span className="value email">{contact.email}</span>
                    </div>
                    <div className="info-row">
                        <span className="label">💼 Position:</span>
                        <span className="value">{contact.position || "N/A"}</span>
                    </div>
                    <div className="info-row">
                        <span className="label">🏢 Company:</span>
                        <span className="value">{contact.company || "N/A"}</span>
                    </div>
                    {contact.department && (
                        <div className="info-row">
                            <span className="label">🏷️ Department:</span>
                            <span className="value">{contact.department}</span>
                        </div>
                    )}
                    {contact.seniority && (
                        <div className="info-row">
                            <span className="label">⭐ Level:</span>
                            <span className="value capitalize">{contact.seniority}</span>
                        </div>
                    )}
                    {contact.linkedin && (
                        <div className="info-row">
                            <span className="label">🔗 LinkedIn:</span>
                            <a 
                                href={contact.linkedin} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="value link"
                            >
                                View Profile
                            </a>
                        </div>
                    )}
                </div>

                {/* AI-Generated Summary */}
                {contact.summary && (
                    <div className="contact-summary">
                        <div className="summary-header">
                            <span className="summary-label">✨ AI Summary</span>
                            {contact.summaryGenerated && (
                                <span className="ai-badge">AI Generated</span>
                            )}
                        </div>
                        <p className="summary-text">{contact.summary}</p>
                    </div>
                )}

                {contact.confidence && (
                    <div className="confidence-bar">
                        <span className="confidence-label">Confidence: {contact.confidence}%</span>
                        <div className="confidence-progress">
                            <div 
                                className="confidence-fill" 
                                style={{ width: `${contact.confidence}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="contact-actions">
                <button 
                    className="btn btn-accept"
                    onClick={() => onAccept(contact)}
                >
                    ✓ Accept
                </button>
                <button 
                    className="btn btn-reject"
                    onClick={() => onReject(contact)}
                >
                    ✕ Reject
                </button>
            </div>
        </div>
    );
};

/**
 * Accepted Contact Card Component
 * Displays accepted contacts in the right panel
 */
const AcceptedContactCard = ({ contact, onRemove }) => {
    return (
        <div className="accepted-contact-card">
            <div className="accepted-header">
                <div>
                    <h4>{contact.name}</h4>
                    <p className="accepted-position">{contact.position}</p>
                </div>
                <button 
                    className="btn btn-remove"
                    onClick={() => onRemove(contact)}
                    title="Remove from list"
                >
                    ✕
                </button>
            </div>
            <div className="accepted-email">{contact.email}</div>
            {contact.summary && (
                <p className="accepted-summary">{contact.summary}</p>
            )}
        </div>
    );
};

export default Dashboard;
