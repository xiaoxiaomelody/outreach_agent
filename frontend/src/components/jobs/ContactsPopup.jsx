import React from 'react';
import ContactCard from '../contacts/ContactCard';
import './ContactsPopup.css';

/**
 * ContactsPopup Component
 * Modal popup displaying company contacts with like/dislike/add actions
 */
const ContactsPopup = ({ 
  isOpen, 
  onClose, 
  company, 
  contacts = [], 
  loading = false,
  error = null 
}) => {
  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <div className="contacts-popup-overlay" onClick={handleBackdropClick}>
      <div className="contacts-popup-container">
        {/* Header */}
        <div className="contacts-popup-header">
          <div className="contacts-popup-title">
            <svg className="contacts-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div>
              <h2>Insiders at {company}</h2>
              <p className="contacts-popup-subtitle">
                Connect with employees to get referrals
              </p>
            </div>
          </div>
          <button 
            className="contacts-popup-close" 
            onClick={onClose}
            aria-label="Close popup"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="contacts-popup-content">
          {loading && (
            <div className="contacts-popup-loading">
              <div className="loading-spinner"></div>
              <p>Finding contacts at {company}...</p>
            </div>
          )}

          {error && !loading && (
            <div className="contacts-popup-error">
              <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && contacts.length === 0 && (
            <div className="contacts-popup-empty">
              <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <p>No contacts found for {company}</p>
              <span className="empty-hint">Try a different company</span>
            </div>
          )}

          {!loading && !error && contacts.length > 0 && (
            <div className="contacts-popup-grid">
              {contacts.map((contact, index) => (
                <ContactCard 
                  key={contact.email || contact.value || index}
                  contact={contact}
                  query={company}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && contacts.length > 0 && (
          <div className="contacts-popup-footer">
            <span className="contacts-count">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found
            </span>
            <span className="contacts-hint">
              💡 Add to your list to track and reach out later
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsPopup;

