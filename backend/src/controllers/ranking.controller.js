const { getFirestore } = require('../config/firebase');

/**
 * Record a ranking interaction event
 * POST /api/ranking/interaction
 * Body: { action: 'accept'|'reject'|'click', contact: {...}, query: string, score?: number }
 */
const recordInteraction = async (req, res) => {
  try {
    const userId = req.user?.uid || null;
    const { action, contact, query, score } = req.body;

    if (!action || !contact) {
      return res.status(400).json({ success: false, error: 'action and contact are required' });
    }

    const allowed = new Set(['accept', 'reject', 'click', 'view']);
    if (!allowed.has(action)) {
      return res.status(400).json({ success: false, error: 'invalid action' });
    }

    const db = getFirestore();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not initialized' });
    }

    const doc = {
      userId,
      action,
      query: query || null,
      contact: {
        email: contact.email || contact.value || null,
        name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        position: contact.position || contact.role || null,
        department: contact.department || null,
        seniority: contact.seniority || null,
        confidence: contact.confidence || null
      },
      score: score || contact._relevanceScore || null,
      metadata: {
        rawContact: contact
      },
      timestamp: new Date()
    };

    await db.collection('rankingInteractions').add(doc);

    return res.json({ success: true });
  } catch (error) {
    console.error('Record interaction error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  recordInteraction
};
