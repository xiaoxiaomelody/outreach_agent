import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/layout/NavBar";
import { getCurrentUser } from "../config/authUtils";
import SearchBar from "../components/search/SearchBar";
import ContactCard from "../components/contacts/ContactCard";
import nlpSearchApi from "../api/nlpSearch";
import { 
  getSearchHistory, 
  saveSearchHistory, 
  deleteSearchHistoryEntry 
} from "../services/firestore.service";
import "../styles/SearchPage.css";

/**
 * Search Page Component
 * Traditional search interface with search bar and history
 */
const SearchPage = () => {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [lastQuery, setLastQuery] = useState("");
  const navigate = useNavigate();

  // Load user and search history
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // Load search history
      loadSearchHistory(currentUser.uid);
    } else {
      navigate("/");
    }

    // Trigger backend training on page load
    (async () => {
      try {
        const { api } = await import("../api/backend");
        console.log("🔁 Triggering backend training (SearchPage mount)");
        await api.runTraining();
      } catch (err) {
        console.debug("Training request failed (non-fatal):", err.message || err);
      }
    })();
  }, [navigate]);

  // Load search history from Firestore
  const loadSearchHistory = async (userId) => {
    try {
      const history = await getSearchHistory(userId);
      setSearchHistory(history || []);
    } catch (err) {
      console.error("Failed to load search history:", err);
    }
  };

  // Handle search
  const handleSearch = async (query) => {
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setError(null);
    setLastQuery(query);

    try {
      const result = await nlpSearchApi.nlpSearch(query);

      if (result.success && result.data) {
        const contactData = result.data.contacts || [];
        
        // Normalize contacts
        const normalizedContacts = contactData.map((c) => {
          const value = c.value || c.email || null;
          const name = c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || null;
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
            company: c.company || c.organization || null,
            position: c.position || c.title || null,
            linkedin: c.linkedin || c.linkedin_url || null,
            ai_summary: c.ai_summary || c.summary || null,
          };
        });

        setContacts(normalizedContacts);

        // Save to search history
        if (user?.uid && normalizedContacts.length > 0) {
          await saveSearchHistory(user.uid, query, normalizedContacts);
          await loadSearchHistory(user.uid);
        }

        if (normalizedContacts.length === 0) {
          setError("No contacts found. Try a different search query.");
        }
      } else {
        setError(result.error || "Search failed. Please try again.");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Error connecting to server. Please check your connection.");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle history item selection
  const handleSelectHistory = useCallback((historyItem) => {
    if (historyItem.contacts && historyItem.contacts.length > 0) {
      // If we have cached contacts, show them immediately
      setContacts(historyItem.contacts);
      setLastQuery(historyItem.query);
    } else {
      // Otherwise, perform the search
      handleSearch(historyItem.query);
    }
  }, []);

  // Handle delete history entry
  const handleDeleteHistory = async (historyId) => {
    if (!user?.uid) return;
    
    try {
      await deleteSearchHistoryEntry(user.uid, historyId);
      await loadSearchHistory(user.uid);
    } catch (err) {
      console.error("Failed to delete history entry:", err);
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
        {/* Greeting */}
        <div className="search-greeting">
          <h1>
            {greeting()},{" "}
            {user.displayName || user.email?.split("@")[0] || "User"}!
          </h1>
          <p className="greeting-subtitle">
            Search for business contacts using natural language
          </p>
        </div>

        {/* Search Bar */}
        <div className="search-bar-container">
          <SearchBar
            onSearch={handleSearch}
            isLoading={isSearching}
            searchHistory={searchHistory}
            onDeleteHistory={handleDeleteHistory}
            onSelectHistory={handleSelectHistory}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="search-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Search Results */}
        {contacts.length > 0 && (
          <div className="search-results">
            <div className="results-header">
              <h2>
                Found {contacts.length} contacts
                {lastQuery && <span className="results-query"> for "{lastQuery}"</span>}
              </h2>
            </div>
            <div className="contacts-grid">
              {contacts.map((contact, index) => (
                <ContactCard
                  key={contact.value || contact.email || index}
                  contact={contact}
                  query={lastQuery}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isSearching && contacts.length === 0 && !error && (
          <div className="search-empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Find Business Contacts</h3>
            <p>
              Enter a natural language query above to search for contacts.
              <br />
              Example: "Find 10 engineers at Google"
            </p>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <p>Searching for contacts...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
