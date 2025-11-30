import React, { useState, useEffect } from "react";
import "./TemplateEditor.css";

/**
 * Template Editor Component
 * View and edit email templates
 */
const TemplateEditor = ({ template, isEditing, onEdit, onSave, onCancel }) => {
    const [editedName, setEditedName] = useState(template.name);
    const [editedContent, setEditedContent] = useState(template.content);

    useEffect(() => {
        setEditedName(template.name);
        setEditedContent(template.content);
    }, [template]);

    const handleSave = () => {
        onSave({
            ...template,
            name: editedName,
            content: editedContent
        });
    };

    return (
        <div className="template-editor">
            <div className="template-editor-header">
                <h2>Preview Email</h2>
                {!isEditing && (
                    <button className="edit-hint" onClick={onEdit}>
                        Click to make edits
                    </button>
                )}
            </div>
            <div className="template-editor-content">
                {isEditing ? (
                    <>
                        <div className="editor-field">
                            <label>Template Name</label>
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="editor-input"
                            />
                        </div>
                        <div className="editor-field">
                            <label>Email Content</label>
                            <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="editor-textarea"
                                rows={15}
                            />
                        </div>
                        <div className="editor-actions">
                            <button className="btn-save" onClick={handleSave}>
                                Save
                            </button>
                            <button className="btn-cancel" onClick={onCancel}>
                                Cancel
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="template-preview">
                        <div className="preview-content">
                            <pre className="preview-text">{template.content}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TemplateEditor;

