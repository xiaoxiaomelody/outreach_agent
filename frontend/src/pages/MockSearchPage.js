import React, { useState } from "react";
import ContactCard from "../components/contacts/ContactCard";
import mockContacts from "../mocks/mockContacts";
import "./MockSearchPage.css";

const MockSearchPage = () => {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(5);
  const [results, setResults] = useState([]);

  const runMockSearch = () => {
    // Simple filter: match company or department or name
    const q = query.trim().toLowerCase();
    let filtered = mockContacts.filter((c) => {
      if (!q) return true;
      return (
        (c.company || "").toLowerCase().includes(q) ||
        (c.department || "").toLowerCase().includes(q) ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
      );
    });
    setResults(filtered.slice(0, Math.max(1, Number(count) || 5)));
  };

  return (
    <div className="mock-search-page">
      <header className="mock-search-header">
        <h2>Mock Search Page</h2>
        <p className="muted">
          Use this page to preview search UI with local mock data.
        </p>
      </header>

      <div className="mock-search-controls">
        <input
          type="text"
          placeholder="Search mock data (company, department, name)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mock-search-input"
        />
        <label className="mock-count-label">
          Count
          <input
            type="number"
            min="1"
            max="20"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="mock-count-input"
          />
        </label>
        <button className="btn" onClick={runMockSearch}>
          Run Mock Search
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setQuery("");
            setCount(5);
            setResults([]);
          }}
        >
          Reset
        </button>
      </div>

      <div className="mock-results">
        {results.length === 0 ? (
          <div className="empty">
            No mock results — click "Run Mock Search".
          </div>
        ) : (
          results.map((c) => (
            <ContactCard
              key={c.value || c.email || c.first_name + c.last_name}
              contact={c}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MockSearchPage;
