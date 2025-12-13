import React, { useState } from "react";
import "./TemplateInput.css";
import Icon from "../icons/Icon";

/**
 * Email Template Input Component
 * Allows user to create email templates with variables
 */
const TemplateInput = ({ onTemplateChange, value }) => {
  const [template, setTemplate] = useState(value || "");
  const [showVariables, setShowVariables] = useState(false);

  const variables = [
    { key: "{name}", desc: "Full name" },
    { key: "{firstName}", desc: "First name" },
    { key: "{lastName}", desc: "Last name" },
    { key: "{company}", desc: "Company name" },
    { key: "{position}", desc: "Job position" },
    { key: "{summary}", desc: "AI-generated summary" },
  ];

  const handleChange = (e) => {
    const newValue = e.target.value;
    setTemplate(newValue);
    if (onTemplateChange) {
      onTemplateChange(newValue);
    }
  };

  const insertVariable = (variable) => {
    const newTemplate = template + variable;
    setTemplate(newTemplate);
    if (onTemplateChange) {
      onTemplateChange(newTemplate);
    }
  };

  const exampleTemplate = `Hello {name},

[mention: working experience -> tech stack -> ask whether the company has position]`;

  const useExample = () => {
    setTemplate(exampleTemplate);
    if (onTemplateChange) {
      onTemplateChange(exampleTemplate);
    }
  };

  return (
    <div className="template-input-container">
      <div className="template-header">
        <label>Email Template</label>
        <button
          type="button"
          onClick={() => setShowVariables(!showVariables)}
          className="btn-toggle-variables"
        >
          {showVariables ? "Hide" : "Show Variables"}
        </button>
      </div>

      {showVariables && (
        <div className="variables-panel">
          <h4>Available Variables:</h4>
          <div className="variables-grid">
            {variables.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                className="variable-chip"
                title={`Insert ${v.desc}`}
              >
                {v.key}
              </button>
            ))}
          </div>
          <button type="button" onClick={useExample} className="btn-example">
            <Icon name="idea" style={{ marginRight: 8 }} /> Use Example Template
          </button>
        </div>
      )}

      <textarea
        value={template}
        onChange={handleChange}
        placeholder="Enter your email template here. Use variables like {name}, {company}, etc."
        className="template-textarea"
        rows={12}
      />

      <div className="template-hint">
        <Icon name="idea" style={{ marginRight: 8 }} /> Use variables like{" "}
        {"{name}"}, {"{company}"} to personalize emails automatically
      </div>
    </div>
  );
};

export default TemplateInput;
