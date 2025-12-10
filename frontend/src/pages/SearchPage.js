import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/layout/NavBar";
import { getCurrentUser } from "../config/authUtils";
import nlpSearchApi from "../api/nlpSearch";
import gmailApi from "../api/gmail";
import ContactCard from "../components/contacts/ContactCard";
import GmailConnectButton from "../components/email/GmailConnectButton";
import Icon from "../components/icons/Icon";
import {
  saveSearchHistory,
  getSearchHistory,
  deleteSearchHistoryEntry,
} from "../services/firestore.service";
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
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const historyMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // Check Gmail connection status
      checkGmailStatus();
      // Load search history
      loadSearchHistory(currentUser.uid);
    } else {
      navigate("/");
    }
  }, [navigate]);

  // Close history menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        historyMenuRef.current &&
        !historyMenuRef.current.contains(event.target)
      ) {
        setShowHistoryMenu(false);
      }
    };

    if (showHistoryMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showHistoryMenu]);

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

  const loadSearchHistory = async (userId) => {
    try {
      console.log("📋 Loading search history for user:", userId);
      const history = await getSearchHistory(userId);
      console.log("📋 Loaded search history:", history);
      console.log("📋 History length:", history?.length || 0);
      if (history && history.length > 0) {
        console.log("📋 First history entry:", history[0]);
      }
      setSearchHistory(history || []);
      console.log("✅ Search history state updated");
    } catch (error) {
      console.error("❌ Error loading search history:", error);
      setSearchHistory([]);
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
        const validContacts = contactData.filter(
          (contact) =>
            contact &&
            (contact.first_name || contact.last_name || contact.name) &&
            (contact.value ||
              contact.email ||
              (contact.emails && contact.emails[0]))
        );

        // Normalize contact shape so ContactCard behaves like mock pages
        const normalize = (c) => {
          const value = c.value || c.email || (c.emails && c.emails[0]) || null;
          const name =
            c.name ||
            `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
            null;
          let first_name = c.first_name || null;
          let last_name = c.last_name || null;
          if (!first_name && name) {
            const parts = name.split(" ");
            first_name = parts.slice(0, -1).join(" ") || parts[0] || null;
            last_name = parts.length > 1 ? parts.slice(-1).join(" ") : null;
          }
          return {
            ...c,
            value,
            email: value,
            name,
            first_name,
            last_name,
            company: c.company || c.organization || c.employer || null,
            position: c.position || c.title || null,
            linkedin: c.linkedin || c.linkedin_url || c.linkedinUrl || null,
            ai_summary: c.ai_summary || c.summary || null,
          };
        };

        const normalizedContacts = validContacts.map(normalize);
        setContacts(normalizedContacts);

        // Save search history to Firestore (even if no results)
        if (user?.uid) {
          try {
            await saveSearchHistory(user.uid, searchQuery, normalizedContacts);
            // Reload history to update the menu
            await loadSearchHistory(user.uid);
          } catch (error) {
            console.error("Error saving search history:", error);
          }
        }

        if (validContacts.length === 0) {
          setError(
            `No contacts found for "${searchQuery}". Try a different search.`
          );
        }
      } else {
        setError(
          result.error ||
            "Failed to search contacts. Make sure backend is running."
        );
        setContacts([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(
        "Error connecting to backend. Is your server running on port 8080?"
      );
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

  const handleHistoryClick = (historyEntry) => {
    setSearchQuery(historyEntry.query);
    setContacts(historyEntry.contacts || []);
    setHasSearched(true);
    setShowHistoryMenu(false);
    setError(null);
  };

  const handleDeleteHistory = async (e, historyId) => {
    e.stopPropagation();
    if (!user?.uid) return;

    try {
      await deleteSearchHistoryEntry(user.uid, historyId);
      await loadSearchHistory(user.uid);
    } catch (error) {
      console.error("Error deleting history entry:", error);
    }
  };

  const formatHistoryDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
                {greeting()},{" "}
                {user.displayName || user.email?.split("@")[0] || "User"}! What
                do you want to look for today?
              </h1>
            </div>

            <form className="search-bar-container" onSubmit={handleSearch}>
              <div className="search-bar">
                <div className="search-menu-wrapper" ref={historyMenuRef}>
                  <button
                    type="button"
                    className="search-menu-icon"
                    onClick={() => {
                      console.log("📋 History menu clicked (initial view), current state:", {
                        showHistoryMenu,
                        searchHistoryLength: searchHistory.length,
                        searchHistory: searchHistory
                      });
                      setShowHistoryMenu(!showHistoryMenu);
                      // Reload history when opening menu
                      if (!showHistoryMenu && user?.uid) {
                        loadSearchHistory(user.uid);
                      }
                    }}
                    aria-label="Search history"
                  >
                    <Icon name="menu" size={20} />
                  </button>
                  {showHistoryMenu && (
                    <div className="history-menu">
                      <div className="history-menu-header">
                        <h3>Search History</h3>
                        {searchHistory.length === 0 && (
                          <p className="history-empty">No search history yet</p>
                        )}
                      </div>
                      {searchHistory.length > 0 && (
                        <div className="history-list">
                          {searchHistory.map((entry) => (
                            <div
                              key={entry.id}
                              className="history-item"
                              onClick={() => handleHistoryClick(entry)}
                            >
                              <div className="history-item-content">
                                <div className="history-query">
                                  {entry.query}
                                </div>
                                <div className="history-meta">
                                  <span className="history-count">
                                    {entry.resultCount || entry.contacts?.length || 0} contacts
                                  </span>
                                  <span className="history-time">
                                    {formatHistoryDate(entry.timestamp)}
                                  </span>
                                </div>
                              </div>
                              <button
                                className="history-delete"
                                onClick={(e) => handleDeleteHistory(e, entry.id)}
                                aria-label="Delete history entry"
                              >
                                <Icon name="close" size={14} />
                </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Search for companies, industries, or job titles"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button
                  type="submit"
                  className="search-icon"
                  aria-label="Search"
                >
                  <Icon name="search" />
                </button>
              </div>
            </form>

            {!gmailConnected && (
              <div className="gmail-connect-prompt">
                <GmailConnectButton onStatusChange={setGmailConnected} />
              </div>
            )}

            <div className="recommended-section">
              <h3>Recommended for you</h3>
              <p className="recommended-subtitle">
                Based on your previous searches
              </p>
              <div className="recommended-placeholder">
                <p>Start searching to see recommendations</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <form className="search-bar-container" onSubmit={handleSearch}>
              <div className="search-bar">
                <div className="search-menu-wrapper" ref={historyMenuRef}>
                  <button
                    type="button"
                    className="search-menu-icon"
                    onClick={() => {
                      console.log("📋 History menu clicked (results view), current state:", {
                        showHistoryMenu,
                        searchHistoryLength: searchHistory.length,
                        searchHistory: searchHistory
                      });
                      setShowHistoryMenu(!showHistoryMenu);
                      // Reload history when opening menu
                      if (!showHistoryMenu && user?.uid) {
                        loadSearchHistory(user.uid);
                      }
                    }}
                    aria-label="Search history"
                  >
                    <Icon name="menu" size={20} />
                  </button>
                  {showHistoryMenu && (
                    <div className="history-menu">
                      <div className="history-menu-header">
                        <h3>Search History</h3>
                        {searchHistory.length === 0 && (
                          <p className="history-empty">No search history yet</p>
                        )}
                      </div>
                      {searchHistory.length > 0 && (
                        <div className="history-list">
                          {searchHistory.map((entry) => (
                            <div
                              key={entry.id}
                              className="history-item"
                              onClick={() => handleHistoryClick(entry)}
                            >
                              <div className="history-item-content">
                                <div className="history-query">
                                  {entry.query}
                                </div>
                                <div className="history-meta">
                                  <span className="history-count">
                                    {entry.resultCount || entry.contacts?.length || 0} contacts
                                  </span>
                                  <span className="history-time">
                                    {formatHistoryDate(entry.timestamp)}
                                  </span>
                                </div>
                              </div>
                              <button
                                className="history-delete"
                                onClick={(e) => handleDeleteHistory(e, entry.id)}
                                aria-label="Delete history entry"
                              >
                                <Icon name="close" size={14} />
                </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Search for companies, industries, or job titles"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-icon">
                  <Icon name="search" />
                </button>
              </div>
            </form>

            <div className="search-results-header">
              <h2>Here's what we found for '{searchQuery}'</h2>
            </div>

            {loading && <div className="loading">Searching...</div>}

            {error && (
              <div className="error-message">
                <Icon name="warning" style={{ marginRight: 8 }} />
                {error}
              </div>
            )}

            {contacts.length > 0 && (
              <div className="contacts-grid">
                {contacts.map((contact, index) => (
                  <ContactCard
                    key={contact.value || contact.email || index}
                    contact={contact}
                    query={searchQuery}
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
