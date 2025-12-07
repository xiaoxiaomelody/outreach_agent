/**
 * Contact Controller
 * Handles contact search and management operations with AI summaries
 */

const hunterWithSummaries = require('../services/hunter-with-summaries.service');
const { validateLimit, isValidDomain } = require('../utils/validation');
const { createContact, validateContact } = require('../models/contact.model');
const { getFirestore } = require('../config/firebase');
const db = getFirestore();

/**
 * Find contacts at a company with AI summaries
 * POST /api/contacts/company
 */
const findCompanyContacts = async (req, res) => {
  try {
    const { company, limit = 10 } = req.body;
    
    if (!company) {
      return res.status(400).json({ 
        error: 'Company domain is required' 
      });
    }

    // Validate domain format
    if (!isValidDomain(company)) {
      return res.status(400).json({ 
        error: 'Invalid domain format. Use format like: stripe.com' 
      });
    }

    const validLimit = validateLimit(limit, 20);

    console.log(`🔍 Searching for contacts at ${company} (limit: ${validLimit})`);
    
    // Call Hunter.io with AI summaries
    const result = await hunterWithSummaries.domainSearchWithSummaries(company, {
      limit: validLimit
    });
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to find company contacts' 
      });
    }

    console.log(`✅ Found ${result.data.contacts.length} contacts with AI summaries`);

    res.json({
      success: true,
      company: result.data.organization,
      domain: result.data.domain,
      pattern: result.data.pattern,
      contacts: result.data.contacts,
      total: result.data.meta?.results || result.data.contacts.length,
      userId: req.user.uid
    });
  } catch (error) {
    console.error('Find company contacts error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

/**
 * Search contacts by department with AI summaries
 * POST /api/contacts/search-by-department
 */
const searchByDepartment = async (req, res) => {
  try {
    const { company, department, limit = 10 } = req.body;
    
    if (!company || !department) {
      return res.status(400).json({ 
        error: 'Company and department are required' 
      });
    }

    const validLimit = validateLimit(limit, 20);

    const result = await hunterWithSummaries.searchByDepartmentWithSummaries(
      company,
      department,
      validLimit
    );
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to search contacts' 
      });
    }

    res.json({
      success: true,
      company: result.data.organization,
      department,
      contacts: result.data.contacts,
      userId: req.user.uid
    });
  } catch (error) {
    console.error('Search by department error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

/**
 * Search contacts by seniority with AI summaries
 * POST /api/contacts/search-by-seniority
 */
const searchBySeniority = async (req, res) => {
  try {
    const { company, seniority, limit = 10 } = req.body;
    
    if (!company || !seniority) {
      return res.status(400).json({ 
        error: 'Company and seniority are required' 
      });
    }

    const validLimit = validateLimit(limit, 20);

    const result = await hunterWithSummaries.searchBySeniorityWithSummaries(
      company,
      seniority,
      validLimit
    );
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to search contacts' 
      });
    }

    res.json({
      success: true,
      company: result.data.organization,
      seniority,
      contacts: result.data.contacts,
      userId: req.user.uid
    });
  } catch (error) {
    console.error('Search by seniority error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

/**
 * Natural language search with AI summaries
 * POST /api/contacts/natural-search
 */
const naturalLanguageSearch = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Search query is required' 
      });
    }

    console.log(`🗣️ Natural language search: "${query}"`);

    const result = await hunterWithSummaries.naturalLanguageSearchWithSummaries(query);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to search contacts' 
      });
    }

    res.json({
      success: true,
      query,
      contacts: result.data.contacts,
      userId: req.user.uid
    });
  } catch (error) {
    console.error('Natural language search error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

module.exports = {
  findCompanyContacts,
  searchByDepartment,
  searchBySeniority,
  naturalLanguageSearch,
  getMockContact,
  acceptContact,
  rejectContact
};

/**
 * Accept a contact and persist it to Firestore
 * POST /api/contacts/accept
 * Body: { contact: { email, first_name?, last_name?, name?, company?, position?, department?, seniority?, linkedin?, twitter?, summary? } , sessionId? }
 */
async function acceptContact(req, res) {
  try {
    if (!db) {
      // DEV_MODE: simulate success without persistence
      const { contact, sessionId } = req.body || {};
      if (!contact || typeof contact !== 'object') {
        return res.status(400).json({ success: false, error: 'Contact object is required' });
      }
      const normalized = {
        email: contact.email || contact.value || '',
        firstName: contact.firstName || contact.first_name || '',
        lastName: contact.lastName || contact.last_name || '',
        name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        company: contact.company || contact.organization || '',
        position: contact.position || '',
        department: contact.department || '',
        seniority: contact.seniority || '',
        linkedin: contact.linkedin || null,
        twitter: contact.twitter || null,
        summary: contact.summary || contact.ai_summary || '',
        confidence: contact.confidence || 0,
        verified: contact.verified || (contact.verification?.status === 'valid') || false,
        source: contact.source || 'hunter.io',
        relevanceScore: contact.relevanceScore || 0
      };
      if (!normalized.email) {
        return res.status(400).json({ success: false, error: 'Contact email is required' });
      }
      const newContact = createContact(normalized, (req.user?.uid || 'dev-user'), sessionId || null);
      newContact.status = 'accepted';
      return res.json({ success: true, contact: { id: 'dev-contact', ...newContact } });
    }

    const { contact, sessionId } = req.body || {};
    if (!contact || typeof contact !== 'object') {
      return res.status(400).json({ success: false, error: 'Contact object is required' });
    }

    // Normalize fields from Hunter format to internal expected structure
    const normalized = {
      email: contact.email || contact.value || '',
      firstName: contact.firstName || contact.first_name || '',
      lastName: contact.lastName || contact.last_name || '',
      name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
      company: contact.company || '',
      position: contact.position || '',
      department: contact.department || '',
      seniority: contact.seniority || '',
      linkedin: contact.linkedin || null,
      twitter: contact.twitter || null,
      summary: contact.summary || '',
      confidence: contact.confidence || 0,
      verified: contact.verified || (contact.verification?.status === 'valid') || false,
      source: contact.source || 'hunter.io',
      relevanceScore: contact.relevanceScore || 0
    };

    if (!normalized.email) {
      return res.status(400).json({ success: false, error: 'Contact email is required' });
    }

    // Check if contact already exists for this user
    const existingSnap = await db.collection('contacts')
      .where('userId', '==', req.user.uid)
      .where('email', '==', normalized.email)
      .limit(1)
      .get();

    let savedContact;
    if (!existingSnap.empty) {
      // Update existing contact status to accepted
      const docRef = existingSnap.docs[0].ref;
      await docRef.update({
        status: 'accepted',
        updatedAt: new Date()
      });
      const data = existingSnap.docs[0].data();
      savedContact = { id: docRef.id, ...data, status: 'accepted' };
    } else {
      // Create new contact object and override status
      const newContact = createContact(normalized, req.user.uid, sessionId || null);
      newContact.status = 'accepted';
      const validation = validateContact(newContact);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, error: validation.errors.join(', ') });
      }
      const docRef = await db.collection('contacts').add(newContact);
      savedContact = { id: docRef.id, ...newContact };
    }

    // Return unified camelCase structure
    return res.json({ success: true, contact: savedContact });
  } catch (error) {
    console.error('Accept contact error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * Reject a contact and persist status (or create minimal record)
 * POST /api/contacts/reject
 * Body: { contact: { email, ...optionalFields }, sessionId? }
 */
async function rejectContact(req, res) {
  try {
    if (!db) {
      // DEV_MODE: simulate success without persistence
      const { contact, sessionId } = req.body || {};
      if (!contact || typeof contact !== 'object') {
        return res.status(400).json({ success: false, error: 'Contact object is required' });
      }
      const email = contact.email || contact.value || '';
      if (!email) {
        return res.status(400).json({ success: false, error: 'Contact email is required' });
      }
      const normalized = {
        email,
        firstName: contact.firstName || contact.first_name || '',
        lastName: contact.lastName || contact.last_name || '',
        name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        company: contact.company || contact.organization || '',
        position: contact.position || '',
        department: contact.department || '',
        seniority: contact.seniority || '',
        linkedin: contact.linkedin || null,
        twitter: contact.twitter || null,
        summary: contact.summary || contact.ai_summary || '',
        confidence: contact.confidence || 0,
        verified: contact.verified || (contact.verification?.status === 'valid') || false,
        source: contact.source || 'hunter.io',
        relevanceScore: contact.relevanceScore || 0
      };
      const newContact = createContact(normalized, (req.user?.uid || 'dev-user'), sessionId || null);
      newContact.status = 'rejected';
      return res.json({ success: true, contact: { id: 'dev-contact', ...newContact } });
    }

    const { contact, sessionId } = req.body || {};
    if (!contact || typeof contact !== 'object') {
      return res.status(400).json({ success: false, error: 'Contact object is required' });
    }

    const email = contact.email || contact.value || '';
    if (!email) {
      return res.status(400).json({ success: false, error: 'Contact email is required' });
    }

    // Try to find existing contact for this user/email
    const existingSnap = await db.collection('contacts')
      .where('userId', '==', req.user.uid)
      .where('email', '==', email)
      .limit(1)
      .get();

    let savedContact;
    if (!existingSnap.empty) {
      const docRef = existingSnap.docs[0].ref;
      await docRef.update({ status: 'rejected', updatedAt: new Date() });
      const data = existingSnap.docs[0].data();
      savedContact = { id: docRef.id, ...data, status: 'rejected' };
    } else {
      // Create minimal normalized contact object
      const normalized = {
        email,
        firstName: contact.firstName || contact.first_name || '',
        lastName: contact.lastName || contact.last_name || '',
        name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        company: contact.company || '',
        position: contact.position || '',
        department: contact.department || '',
        seniority: contact.seniority || '',
        linkedin: contact.linkedin || null,
        twitter: contact.twitter || null,
        summary: contact.summary || '',
        confidence: contact.confidence || 0,
        verified: contact.verified || (contact.verification?.status === 'valid') || false,
        source: contact.source || 'hunter.io',
        relevanceScore: contact.relevanceScore || 0
      };
      const newContact = createContact(normalized, req.user.uid, sessionId || null);
      newContact.status = 'rejected';
      const validation = validateContact(newContact);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, error: validation.errors.join(', ') });
      }
      const docRef = await db.collection('contacts').add(newContact);
      savedContact = { id: docRef.id, ...newContact };
    }

    return res.json({ success: true, contact: savedContact });
  } catch (error) {
    console.error('Reject contact error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

/**
 * Return a mock contact for frontend demo/testing
 * GET /api/contacts/mock
 */
async function getMockContact(req, res) {
  try {
    const demo = {
      email: 'alex.chen@stripe.com',
      first_name: 'Alex',
      last_name: 'Chen',
      name: 'Alex Chen',
      company: 'Stripe',
      organization: 'Stripe',
      position: 'Senior Product Manager',
      department: 'Product',
      seniority: 'senior',
      linkedin: 'https://www.linkedin.com/in/alex-chen-pm',
      twitter: null,
      ai_summary: 'Alex Chen leads product strategy for B2B payments at Stripe, focusing on enterprise onboarding and risk. Previously at Square. Harvard CS (2015).',
      summary: 'Senior PM driving payments platform initiatives at Stripe.',
      confidence: 92,
      verified: true,
      value: 'alex.chen@stripe.com',
      source: 'mock',
      relevanceScore: 0.87
    };

    return res.json({ success: true, contact: demo, userId: req.user?.uid || 'demo-user' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
