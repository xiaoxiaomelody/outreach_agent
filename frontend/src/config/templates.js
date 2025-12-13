// Utility to load email templates from Firestore with sensible defaults
import { getUserTemplates } from '../services/firestore.service';
import { getCurrentUser } from './authUtils';

export const DEFAULT_TEMPLATES = [
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
];

/**
 * Load email templates from Firestore
 * Falls back to default templates if Firestore is unavailable or user is not logged in
 * @returns {Promise<Array>} Array of template objects
 */
export async function loadEmailTemplates() {
  try {
    const user = getCurrentUser();
    if (user?.uid) {
      const templates = await getUserTemplates(user.uid);
      if (templates && templates.length > 0) {
        console.log('✅ Loaded templates from Firestore');
        return templates;
      }
    }
    
    // Return default templates if no user or no templates in Firestore
    console.log('📋 Using default templates (no user templates found)');
    return DEFAULT_TEMPLATES;
  } catch (err) {
    console.error('Error loading templates from Firestore:', err);
    // Fallback to default templates on error
    return DEFAULT_TEMPLATES;
  }
}

export default loadEmailTemplates;
