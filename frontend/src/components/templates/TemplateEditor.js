import React, { useState, useEffect } from "react";
import "./TemplateEditor.css";

/**
 * Template Editor Component
 * View and edit email templates
 */
const TemplateEditor = ({ template, isEditing, onEdit, onSave, onCancel }) => {
  const [editedName, setEditedName] = useState(template.name || "");
  const [editedSubject, setEditedSubject] = useState(template.subject || "");
  const [editedContent, setEditedContent] = useState(template.content || "");
  const [error, setError] = useState("");

  useEffect(() => {
    setEditedName(template.name || "");
    setEditedSubject(template.subject || "");
    setEditedContent(template.content || "");
    setError("");
  }, [template]);

  const handleSave = () => {
    if (!editedName || editedName.trim() === "") {
      setError("Template name cannot be blank");
      return;
    }

    setError("");
    onSave({
      ...template,
      name: editedName.trim(),
      subject: editedSubject,
      content: editedContent,
    });
  };

  return (
    <div className="template-editor">
      <div className="template-editor-header">
        <h2>Preview Email</h2>
        {!isEditing && (
          <button
            className="edit-hint"
            onClick={onEdit}
            aria-label="Edit template"
          >
            Edit
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
                placeholder="New Template"
                aria-label="Template name"
              />
              {error && <div className="field-error">{error}</div>}
            </div>
            <div className="editor-field">
              <label>Subject</label>
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="editor-input"
                placeholder="Subject line (e.g. Intro — [Name])"
                aria-label="Template subject"
              />
            </div>
            <div className="editor-field">
              <label>Email Content</label>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="editor-textarea"
                rows={15}
                placeholder="Write your email template here..."
                aria-label="Email content"
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
              {template.subject && (
                <div className="template-subject">{template.subject}</div>
              )}
              <pre className="preview-text">{template.content}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateEditor;
