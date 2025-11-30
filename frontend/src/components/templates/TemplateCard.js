import React from "react";
import "./TemplateCard.css";

/**
 * Template Card Component
 * Displays a template card in the sidebar
 */
const TemplateCard = ({ template, isNew, isSelected, onClick, onDelete }) => {
    if (isNew) {
        return (
            <div className="template-card new-template" onClick={onClick}>
                <div className="template-icon">+</div>
                <p className="template-name">New Template</p>
            </div>
        );
    }

    return (
        <div 
            className={`template-card ${isSelected ? "selected" : ""}`}
            onClick={onClick}
        >
            <div className="template-icon-placeholder">
                {template.name.charAt(0).toUpperCase()}
            </div>
            <p className="template-name">{template.name}</p>
            {onDelete && (
                <button 
                    className="template-delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
};

export default TemplateCard;

