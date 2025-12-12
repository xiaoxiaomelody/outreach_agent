const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * Save a single training interaction to local file `backend/models/training-interactions.json`.
 * Expects body: { contact, action, query?, metadata? }
 */
const saveInteraction = async (req, res) => {
  try {
    const { contact, action, query, metadata } = req.body || {};

    if (!contact || !action) {
      return res.status(400).json({ error: 'Missing required fields: contact and action' });
    }

    const modelDir = path.join(__dirname, '..', '..', 'models');
    if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });

    const filePath = path.join(modelDir, 'training-interactions.json');
    let interactions = [];
    if (fs.existsSync(filePath)) {
      try {
        interactions = JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
        if (!Array.isArray(interactions)) interactions = [];
      } catch (e) {
        interactions = [];
      }
    }

    const id = `local-${Date.now()}`;
    const entry = {
      id,
      userId: req.user?.uid || null,
      contact,
      action,
      query: query || '',
      metadata: metadata || { rawContact: contact },
      createdAt: new Date().toISOString()
    };

    interactions.push(entry);
    fs.writeFileSync(filePath, JSON.stringify(interactions, null, 2));

    return res.json({ success: true, id });
  } catch (error) {
    console.error('Error saving training interaction:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  saveInteraction,
};

/**
 * Run the training script (`node scripts/train-ranking-model.js`) and return the trained weights.
 * POST /api/training/run
 */
async function runTraining(req, res) {
  try {
    const cwd = path.join(__dirname, '..', '..');
    const triggeredBy = req.user?.uid || 'anonymous';
    console.log(`🔁 Training triggered by ${triggeredBy} at ${new Date().toISOString()}`);
    // Execute the training script
    exec('node scripts/train-ranking-model.js', { cwd, timeout: 2 * 60 * 1000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Training script failed:', error, stderr);
        return res.status(500).json({ success: false, error: error.message, stderr });
      }

      // Read the trained weights file and return it
      const modelPath = path.join(cwd, 'models', 'trained-weights.json');
      if (!fs.existsSync(modelPath)) {
        console.error('Trained weights file not found after training');
        return res.status(500).json({ success: false, error: 'Trained weights file not found after training' });
      }

      try {
        const raw = fs.readFileSync(modelPath, 'utf8');
        const json = JSON.parse(raw);
        console.log(`✅ Training finished at ${new Date().toISOString()}; weights loaded from ${modelPath}`);
        return res.json({ success: true, stdout, stderr, trained: json });
      } catch (err) {
        console.error('Failed to read trained weights:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    });
  } catch (error) {
    console.error('runTraining error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports.runTraining = runTraining;
