import React, { useState } from "react";
import "./ContactCard.css";

/**
 * Contact Card Component
 * Displays a contact with like/dislike/add actions
 */
const ContactCard = ({ contact }) => {
    const [liked, setLiked] = useState(false);
    const [disliked, setDisliked] = useState(false);

    const fullName = `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || contact?.name || "Unknown";
    const email = contact?.value || contact?.email || null;
    const company = contact?.company || contact?.organization || "N/A";
    const position = contact?.position || "N/A";
    const industry = contact?.department || "N/A";
    const linkedin = contact?.linkedin || null;
    const summary = contact?.ai_summary || contact?.summary || `${fullName} works as ${position} at ${company}`;

    const handleLike = () => {
        if (!liked) {
            handleAdd(); // Add to shortlist
        } else {
            // Remove from shortlist
            const shortlist = JSON.parse(localStorage.getItem("myContacts") || '{"shortlist":[],"sent":[],"trash":[]}');
            const email = contact?.value || contact?.email;
            shortlist.shortlist = shortlist.shortlist.filter(c => (c.value || c.email) !== email);
            localStorage.setItem("myContacts", JSON.stringify(shortlist));
            setLiked(false);
        }
        setDisliked(false);
    };

    const handleDislike = () => {
        // Remove from shortlist and add to trash
        const shortlist = JSON.parse(localStorage.getItem("myContacts") || '{"shortlist":[],"sent":[],"trash":[]}');
        const email = contact?.value || contact?.email;
        shortlist.shortlist = shortlist.shortlist.filter(c => (c.value || c.email) !== email);
        const existsInTrash = shortlist.trash.some(c => (c.value || c.email) === email);
        if (!existsInTrash) {
            shortlist.trash.push(contact);
        }
        localStorage.setItem("myContacts", JSON.stringify(shortlist));
        setDisliked(true);
        setLiked(false);
    };

    const handleAdd = () => {
        // Add to shortlist in localStorage
        const shortlist = JSON.parse(localStorage.getItem("myContacts") || '{"shortlist":[],"sent":[],"trash":[]}');
        const email = contact?.value || contact?.email;
        
        // Check if already in shortlist
        const exists = shortlist.shortlist.some(c => (c.value || c.email) === email);
        if (!exists) {
            shortlist.shortlist.push(contact);
            localStorage.setItem("myContacts", JSON.stringify(shortlist));
            setLiked(true);
            setDisliked(false);
        }
    };

    return (
        <div className="contact-card">
            <div className="contact-image-placeholder">
                {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="contact-info">
                <h3 className="contact-name">{fullName}</h3>
                {position && position !== "N/A" && (
                    <p className="contact-position">{position}</p>
                )}
                <p className="contact-employer">{company}</p>
                {industry && industry !== "N/A" && (
                    <p className="contact-industry">{industry}</p>
                )}
                {email && (
                    <p className="contact-email">
                        <span className="contact-label">Email:</span> 
                        <a href={`mailto:${email}`} className="contact-link">{email}</a>
                    </p>
                )}
                {linkedin && (
                    <p className="contact-linkedin">
                        <span className="contact-label">LinkedIn:</span> 
                        <a href={linkedin} target="_blank" rel="noopener noreferrer" className="contact-link">
                            View Profile
                        </a>
                    </p>
                )}
                <p className="contact-summary">{summary}</p>
            </div>
            <div className="contact-actions">
                <button
                    className={`action-btn ${liked ? "liked" : ""}`}
                    onClick={handleLike}
                    title="Like"
                >
                    👍
                </button>
                <button
                    className={`action-btn ${disliked ? "disliked" : ""}`}
                    onClick={handleDislike}
                    title="Dislike"
                >
                    👎
                </button>
                <button
                    className="action-btn add-btn"
                    onClick={handleAdd}
                    title="Add to list"
                >
                    ➕
                </button>
            </div>
        </div>
    );
};

export default ContactCard;

