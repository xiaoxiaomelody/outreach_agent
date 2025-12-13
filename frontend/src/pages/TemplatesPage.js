import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/layout/NavBar";
import { getCurrentUser } from "../config/authUtils";
import TemplateCard from "../components/templates/TemplateCard";
import TemplateEditor from "../components/templates/TemplateEditor";
import {
  getUserTemplates,
  updateUserTemplates,
} from "../services/firestore.service";
import { DEFAULT_TEMPLATES } from "../config/templates";
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
      subject: "Intro — [Name] at [Company]",
      content:
        "Hello [Name],\n\n[mention: education -> project experience -> seeking for communication opportunity]",
    },
    {
      id: 2,
      name: "Tech",
      subject: "Intro — [Name]",
      content:
        "Hello [Name],\n\n[mention: working experience -> tech stack -> ask whether the company has position]",
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
      // Load templates from Firestore
      loadTemplatesFromFirestore(currentUser.uid);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const loadTemplatesFromFirestore = async (userId) => {
    try {
      const firestoreTemplates = await getUserTemplates(userId);
      if (firestoreTemplates && firestoreTemplates.length > 0) {
        setTemplates(firestoreTemplates);
        console.log("✅ Using Firestore templates (user-specific data)");
      } 
    }catch (error) {
      console.error("Error loading templates from Firestore:", error);
        setTemplates([]);
      }
  };

  // Reset templates to defaults and save to Firestore
  const handleResetToDefaults = async () => {
    if (!user?.uid) return;
    
    if (window.confirm("This will reset all templates to defaults. Continue?")) {
      try {
        await updateUserTemplates(user.uid, DEFAULT_TEMPLATES);
        setTemplates(DEFAULT_TEMPLATES);
        setSelectedTemplate(null);
        console.log("✅ Templates reset to defaults");
        alert("Templates have been reset to defaults!");
      } catch (error) {
        console.error("Error resetting templates:", error);
        alert("Failed to reset templates. Please try again.");
      }
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    const newTemplate = {
      id: Date.now(),
      name: "",
      subject: "",
      content: "",
    };
    setTemplates([...templates, newTemplate]);
    setSelectedTemplate(newTemplate);
    setIsEditing(true);
  };

  const handleSaveTemplate = async (updatedTemplate) => {
    if (!user?.uid) return;

    const updated = templates.map((t) =>
      t.id === updatedTemplate.id ? updatedTemplate : t
    );
    setTemplates(updated);

    // Update Firestore
    try {
      await updateUserTemplates(user.uid, updated);
    } catch (error) {
      console.error("Error updating templates in Firestore:", error);
      // // Fallback to localStorage
      // localStorage.setItem("emailTemplates", JSON.stringify(updated));
    }

    // Ensure the selected template reference is updated so the UI shows saved changes
    setSelectedTemplate(updatedTemplate);
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
    const timeoutId = setTimeout(async () => {
      // finalize deletion: persist changes
      if (user?.uid) {
        try {
          await updateUserTemplates(user.uid, updated);
        } catch (error) {
          console.error("Error updating templates in Firestore:", error);
          // localStorage.setItem("emailTemplates", JSON.stringify(updated));
        }
      } 
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
            <button 
              className="btn-reset-defaults"
              onClick={handleResetToDefaults}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                width: '100%'
              }}
            >
              Reset to Defaults
            </button>
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
