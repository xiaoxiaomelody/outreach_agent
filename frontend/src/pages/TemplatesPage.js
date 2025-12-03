import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/layout/NavBar";
import { getCurrentUser } from "../config/authUtils";
import TemplateCard from "../components/templates/TemplateCard";
import TemplateEditor from "../components/templates/TemplateEditor";
import "../styles/TemplatesPage.css";

/**
 * Templates Page Component
 * Manage email templates
 */
const TemplatesPage = () => {
  const [user, setUser] = useState(null);
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: "Finance",
      content:
        "Hello [Name],\n\nThis is an email template that I can use to reach out to other people in my target industry. I am super interested in this particular industry because of XYZ.\n\nPlease hire me.\n\nYours desperately,\nSiddharth",
    },
    {
      id: 2,
      name: "Tech",
      content:
        "Hello [Name],\n\nI'm reaching out because I'm interested in opportunities in the tech industry...\n\nBest regards,\nSiddharth",
    },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    template: null,
  });
  const [pendingDelete, setPendingDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // Load templates from localStorage or API
      const savedTemplates = localStorage.getItem("emailTemplates");
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    const newTemplate = {
      id: Date.now(),
      name: "New Template",
      content:
        "Hello [Name],\n\n[Your message here]\n\nBest regards,\n[Your name]",
    };
    setTemplates([...templates, newTemplate]);
    setSelectedTemplate(newTemplate);
    setIsEditing(true);
  };

  const handleSaveTemplate = (updatedTemplate) => {
    const updated = templates.map((t) =>
      t.id === updatedTemplate.id ? updatedTemplate : t
    );
    setTemplates(updated);
    localStorage.setItem("emailTemplates", JSON.stringify(updated));
    setIsEditing(false);
  };

  const handleDeleteTemplate = (templateId) => {
    // Show confirmation modal before deleting
    const templateToDelete = templates.find((t) => t.id === templateId);
    if (templateToDelete) {
      setConfirmDialog({ open: true, template: templateToDelete });
    }
  };

  // Confirmed delete: perform optimistic removal and show undo toast
  const performConfirmedDelete = (template) => {
    // Remove from list visually but don't persist yet
    const updated = templates.filter((t) => t.id !== template.id);
    setTemplates(updated);
    if (selectedTemplate?.id === template.id) {
      setSelectedTemplate(null);
    }

    // Start undo timer (5s)
    const timeoutId = setTimeout(() => {
      // finalize deletion: persist changes
      localStorage.setItem("emailTemplates", JSON.stringify(updated));
      setPendingDelete(null);
    }, 5000);

    setPendingDelete({ template, timeoutId });
    setConfirmDialog({ open: false, template: null });
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeoutId);
    // restore template
    setTemplates((prev) =>
      [...prev, pendingDelete.template].sort((a, b) => a.id - b.id)
    );
    setPendingDelete(null);
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="templates-page">
      <NavBar />
      {/* Confirmation modal */}
      {confirmDialog.open && (
        <div className="modal-overlay">
          <div className="modal">
            <p>
              Are you sure you want to delete "{confirmDialog.template.name}"?
            </p>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() =>
                  setConfirmDialog({ open: false, template: null })
                }
              >
                Cancel
              </button>
              <button
                className="btn-delete"
                onClick={() => performConfirmedDelete(confirmDialog.template)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {pendingDelete && (
        <div className="undo-toast" role="status" aria-live="polite">
          <div className="toast-content">
            <span className="toast-message">
              Deleted "{pendingDelete.template.name}"
            </span>
            <button className="toast-undo" onClick={undoDelete}>
              Undo
            </button>
          </div>
          <div className="toast-progress" aria-hidden="true">
            <div className="toast-progress-fill" />
          </div>
        </div>
      )}
      <div className="templates-page-content">
        <div className="templates-layout">
          <div className="templates-sidebar">
            <div className="templates-list">
              <TemplateCard isNew onClick={handleCreateNew} />
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate?.id === template.id}
                  onClick={() => handleSelectTemplate(template)}
                  onDelete={() => handleDeleteTemplate(template.id)}
                />
              ))}
            </div>
          </div>
          <div className="templates-editor">
            {selectedTemplate ? (
              <TemplateEditor
                template={selectedTemplate}
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onSave={handleSaveTemplate}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <div className="no-template-selected">
                <p>Select a template to view or create a new one</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesPage;
