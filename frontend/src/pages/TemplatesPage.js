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
        { id: 1, name: "Finance", content: "Hello [Name],\n\nThis is an email template that I can use to reach out to other people in my target industry. I am super interested in this particular industry because of XYZ.\n\nPlease hire me.\n\nYours desperately,\nSiddharth" },
        { id: 2, name: "Tech", content: "Hello [Name],\n\nI'm reaching out because I'm interested in opportunities in the tech industry...\n\nBest regards,\nSiddharth" }
    ]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
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
            content: "Hello [Name],\n\n[Your message here]\n\nBest regards,\n[Your name]"
        };
        setTemplates([...templates, newTemplate]);
        setSelectedTemplate(newTemplate);
        setIsEditing(true);
    };

    const handleSaveTemplate = (updatedTemplate) => {
        const updated = templates.map(t => 
            t.id === updatedTemplate.id ? updatedTemplate : t
        );
        setTemplates(updated);
        localStorage.setItem("emailTemplates", JSON.stringify(updated));
        setIsEditing(false);
    };

    const handleDeleteTemplate = (templateId) => {
        const updated = templates.filter(t => t.id !== templateId);
        setTemplates(updated);
        localStorage.setItem("emailTemplates", JSON.stringify(updated));
        if (selectedTemplate?.id === templateId) {
            setSelectedTemplate(null);
        }
    };

    if (!user) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="templates-page">
            <NavBar />
            <div className="templates-page-content">
                <div className="templates-layout">
                    <div className="templates-sidebar">
                        <div className="templates-list">
                            <TemplateCard
                                isNew
                                onClick={handleCreateNew}
                            />
                            {templates.map(template => (
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

