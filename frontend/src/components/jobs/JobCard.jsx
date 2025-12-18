import React, { useState } from 'react';
import { api } from '../../api/backend';
import ContactsPopup from './ContactsPopup';
import './JobCard.css';

/**
 * JobCard Component
 * Displays a single job listing as a card with insider connection feature
 */
const JobCard = ({ job }) => {
  const { company, role, location, application_link, date_posted } = job;
  
  // State for contacts popup
  const [showPopup, setShowPopup] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if application link is valid
  const hasValidLink = application_link && 
    (application_link.startsWith('http://') || application_link.startsWith('https://'));

  const handleApply = () => {
    if (hasValidLink) {
      window.open(application_link, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle Connect Insiders button click
  const handleConnectInsiders = async () => {
    setShowPopup(true);
    setLoading(true);
    setError(null);
    setContacts([]);

    try {
      const result = await api.getCompanyContacts(company, 4);
      
      if (result.success) {
        setContacts(result.contacts || []);
      } else {
        setError(result.message || 'Failed to find contacts');
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  return (
    <>
      <div className="job-card">
        <div className="job-card-header">
          <div className="job-company-info">
            <div className="job-company-avatar">
              {company ? company.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="job-company-details">
              <h3 className="job-company-name">{company || 'Unknown Company'}</h3>
              <p className="job-role">{role || 'Position not specified'}</p>
            </div>
          </div>
          {date_posted && (
            <span className="job-date">{date_posted}</span>
          )}
        </div>
        
        <div className="job-card-body">
          {location && (
            <div className="job-location">
              <svg 
                className="location-icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{location}</span>
            </div>
          )}
        </div>
        
        <div className="job-card-footer">
          {/* Connect Insiders Button */}
          <button 
            className="job-connect-btn"
            onClick={handleConnectInsiders}
            title="Find employees at this company"
          >
            <svg 
              className="connect-icon" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Connect Insiders
          </button>

          {/* Apply Button */}
          {hasValidLink ? (
            <button 
              className="job-apply-btn"
              onClick={handleApply}
            >
              <svg 
                className="apply-icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Apply Now
            </button>
          ) : (
            <span className="job-no-link">
              <svg 
                className="no-link-icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Link Unavailable
            </span>
          )}
        </div>
      </div>

      {/* Contacts Popup */}
      <ContactsPopup
        isOpen={showPopup}
        onClose={handleClosePopup}
        company={company}
        contacts={contacts}
        loading={loading}
        error={error}
      />
    </>
  );
};

export default JobCard;
