import React, { useState, useRef, useEffect } from "react";
import Icon from "../icons/Icon";
import "./SearchBar.css";

/**
 * SearchBar Component
 * Traditional search bar with search history dropdown
 */
const SearchBar = ({ 
  onSearch, 
  isLoading = false, 
  searchHistory = [],
  onDeleteHistory,
  onSelectHistory,
  placeholder = "Find contacts at any company... (e.g., 'Find 10 engineers at Google')"
}) => {
  const [query, setQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);
  const historyRef = useRef(null);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        historyRef.current && 
        !historyRef.current.contains(event.target) &&
        !event.target.closest('.search-menu-btn')
      ) {
        setShowHistory(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query.trim());
  };

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.query);
    setShowHistory(false);
    if (onSelectHistory) {
      onSelectHistory(historyItem);
    }
  };

  const handleDeleteHistoryItem = (e, historyId) => {
    e.stopPropagation();
    if (onDeleteHistory) {
      onDeleteHistory(historyId);
    }
  };

  const formatTimeAgo = (timestamp) => {
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

  return (
    <div className="search-bar-wrapper">
      <form onSubmit={handleSubmit} className="search-bar-form">
        <div className="search-bar">
          {/* History Menu Button */}
          <button
            type="button"
            className="search-menu-btn"
            onClick={() => setShowHistory(!showHistory)}
            title="Search history"
          >
            <Icon name="clock" size={18} />
          </button>

          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="search-input"
            disabled={isLoading}
          />

          {/* Search Button */}
          <button
            type="submit"
            className="search-submit-btn"
            disabled={!query.trim() || isLoading}
            title="Search"
          >
            {isLoading ? (
              <span className="search-spinner" />
            ) : (
              <Icon name="search" size={18} />
            )}
          </button>
        </div>
      </form>

      {/* History Dropdown */}
      {showHistory && (
        <div className="history-dropdown" ref={historyRef}>
          <div className="history-header">
            <h3>Recent Searches</h3>
            {searchHistory.length > 0 && (
              <span className="history-count">{searchHistory.length} items</span>
            )}
          </div>
          
          {searchHistory.length === 0 ? (
            <div className="history-empty">
              <Icon name="clock" size={24} />
              <p>No search history yet</p>
              <span>Your recent searches will appear here</span>
            </div>
          ) : (
            <div className="history-list">
              {searchHistory.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="history-item"
                  onClick={() => handleHistoryClick(item)}
                >
                  <div className="history-item-icon">
                    <Icon name="search" size={14} />
                  </div>
                  <div className="history-item-content">
                    <div className="history-query">{item.query}</div>
                    <div className="history-meta">
                      <span className="history-result-count">
                        {item.resultCount || 0} contacts
                      </span>
                      <span className="history-time">
                        {formatTimeAgo(item.timestamp || item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="history-delete-btn"
                    onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                    title="Remove from history"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Suggestions */}
      <div className="search-suggestions">
        <span className="suggestions-label">Try:</span>
        {["Find engineers at Google", "Marketing at Stripe", "Executives at Microsoft"].map((suggestion, i) => (
          <button
            key={i}
            type="button"
            className="suggestion-chip"
            onClick={() => {
              setQuery(suggestion);
              inputRef.current?.focus();
            }}
            disabled={isLoading}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;

