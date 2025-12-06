import React from "react";
import ContactCard from "../components/contacts/ContactCard";
import mockContacts from "../mocks/mockContacts";
import Icon from "../components/icons/Icon";
import "./MockResultsPage.css";

const MockResultsPage = () => {
  return (
    <div className="mock-results-page">
      <header className="mock-results-header">
        <h2>
          <Icon name="user" style={{ marginRight: 8 }} /> Mock Search Results
        </h2>
        <p className="muted">
          Preview of search results using local mock data.
        </p>
      </header>

      <div className="results-grid">
        {mockContacts.map((c) => (
          <ContactCard
            key={c.value || c.email || c.first_name + c.last_name}
            contact={c}
          />
        ))}
      </div>
    </div>
  );
};

export default MockResultsPage;
