// Utility to load email templates from localStorage with sensible defaults
export const DEFAULT_TEMPLATES = [
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
];

export function loadEmailTemplates() {
  try {
    const raw = localStorage.getItem("emailTemplates");
    if (!raw) return DEFAULT_TEMPLATES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TEMPLATES;
    return parsed;
  } catch (err) {
    return DEFAULT_TEMPLATES;
  }
}

export default loadEmailTemplates;
