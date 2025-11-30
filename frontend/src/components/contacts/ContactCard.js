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
    const email = contact?.value || contact?.email || "No email";
    const company = contact?.company || contact?.organization || "N/A";
    const position = contact?.position || "N/A";
    const industry = contact?.department || "N/A";
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
                <p className="contact-employer">{company}</p>
                <p className="contact-industry">{industry}</p>
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

