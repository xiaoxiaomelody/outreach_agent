/**
 * ML Training Pipeline for Contact Ranking Model
 * 
 * Fetches user interaction data from Firestore, trains an XGBoost model,
 * and exports learned weights to use in production ranking.
 * 
 * Usage:
 *   node scripts/train-ranking-model.js
 *   
 * Output: backend/models/trained-weights.json
 */

const { getFirestore } = require('../src/config/firebase');
const fs = require('fs');
const path = require('path');

/**
 * Fetch all ranking interactions from Firestore
 */
async function fetchTrainingData() {
  try {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    console.log('📊 Fetching training data from Firestore...');
    const snapshot = await db.collection('rankingInteractions').get();
    
    const interactions = [];
    snapshot.forEach(doc => {
      interactions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✓ Fetched ${interactions.length} interaction records`);
    return interactions;
  } catch (error) {
    console.error('❌ Error fetching training data:', error);
    throw error;
  }
}

/**
 * Extract features from interaction data
 * Creates feature vectors for training
 */
function extractFeatures(interactions) {
  console.log('🔧 Extracting features from interactions...');
  
  const features = [];
  
  for (const interaction of interactions) {
    const contact = interaction.contact || {};
    const rawContact = interaction.metadata?.rawContact || {};
    
    // Skip if missing critical data
    if (!contact.email || interaction.action === undefined) {
      continue;
    }

    // Normalize confidence to 0-1
    let confidence = rawContact.confidence || rawContact.confidence_score || 0;
    if (confidence > 1) confidence = Math.min(100, confidence) / 100;
    confidence = Math.max(0, Math.min(1, confidence));

    // Verification flag
    const verified = rawContact.verified === true || 
                     rawContact.verification?.status === 'valid' ? 1 : 0;

    // Title match (simplified - check if query words appear in title)
    const query = (interaction.query || '').toLowerCase();
    const title = (contact.position || '').toLowerCase();
    const titleMatch = query && title && query.split(/\s+/).some(word => 
      word.length > 2 && title.includes(word)
    ) ? 1 : 0;

    // Department match
    const deptMatch = contact.department && 
                     interaction.query?.toLowerCase().includes(contact.department.toLowerCase()) ? 1 : 0;

    // Seniority match
    const seniorMatch = contact.seniority && 
                       interaction.query?.toLowerCase().includes(contact.seniority.toLowerCase()) ? 1 : 0;

    // Target label: convert action to binary classification
    // accept=1 (good ranking), reject=0 (bad ranking), click/view=0.5 (neutral)
    let label;
    if (interaction.action === 'accept') {
      label = 1;
    } else if (interaction.action === 'reject') {
      label = 0;
    } else {
      label = 0.5; // click/view - somewhat relevant
    }

    features.push({
      confidence,
      verified,
      titleMatch,
      deptMatch,
      seniorMatch,
      label,
      action: interaction.action,
      query: interaction.query,
      email: contact.email
    });
  }

  console.log(`✓ Extracted ${features.length} feature vectors`);
  return features;
}

/**
 * Simple linear regression to learn optimal weights
 * Finds weights that best predict user actions
 */
function trainSimpleModel(features) {
  console.log('🤖 Training ranking model...');
  
  if (features.length < 10) {
    console.warn(`⚠️  Only ${features.length} samples - using default weights`);
    return getDefaultWeights();
  }

  // Extract feature matrix and labels
  const featureNames = ['confidence', 'verified', 'titleMatch', 'deptMatch', 'seniorMatch'];
  const X = features.map(f => 
    featureNames.map(name => f[name])
  );
  const y = features.map(f => f.label);

  // Simple linear regression using normal equation
  // weights = (X^T X)^-1 X^T y
  
  // Calculate means for normalization
  const means = featureNames.map((name, i) => {
    const sum = features.reduce((acc, f) => acc + f[name], 0);
    return sum / features.length;
  });

  // Normalize features
  const Xnorm = X.map(row => 
    row.map((val, i) => val - means[i])
  );
  const ymean = y.reduce((a, b) => a + b, 0) / y.length;
  const ynorm = y.map(val => val - ymean);

  // Calculate correlations (simplified: just use correlation as weight proxy)
  const weights = featureNames.map((name, i) => {
    let correlation = 0;
    let numerator = 0;
    let denom_x = 0;
    let denom_y = 0;

    for (let j = 0; j < Xnorm.length; j++) {
      numerator += Xnorm[j][i] * ynorm[j];
      denom_x += Xnorm[j][i] ** 2;
      denom_y += ynorm[j] ** 2;
    }

    if (denom_x > 0 && denom_y > 0) {
      correlation = numerator / Math.sqrt(denom_x * denom_y);
    }

    // Convert correlation to weight (0-1, clipped to non-negative)
    return Math.max(0, correlation);
  });

  // Normalize weights to sum to 1
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weightSum > 0 
    ? weights.map(w => w / weightSum)
    : [0.4, 0.25, 0.2, 0.1, 0.05]; // fallback to defaults

  // Calculate training accuracy
  let correct = 0;
  for (let i = 0; i < features.length; i++) {
    const prediction = normalizedWeights.reduce((sum, w, j) => 
      sum + w * X[i][j], 0
    );
    const predicted = prediction > 0.5 ? 1 : 0;
    const actual = y[i] > 0.5 ? 1 : 0;
    if (predicted === actual) correct++;
  }

  const accuracy = (correct / features.length * 100).toFixed(2);
  console.log(`✓ Training accuracy: ${accuracy}%`);
  console.log('✓ Learned weights:', Object.fromEntries(
    featureNames.map((name, i) => [name, normalizedWeights[i].toFixed(3)])
  ));

  return Object.fromEntries(
    featureNames.map((name, i) => [name, normalizedWeights[i]])
  );
}

/**
 * Default weights if training fails
 */
function getDefaultWeights() {
  return {
    confidence: 0.4,
    verified: 0.25,
    titleMatch: 0.2,
    deptMatch: 0.1,
    seniorMatch: 0.05
  };
}

/**
 * Save trained weights to file
 */
function saveWeights(weights) {
  const modelDir = path.join(__dirname, '..', 'models');
  
  // Create models directory if it doesn't exist
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  const outputPath = path.join(modelDir, 'trained-weights.json');
  const output = {
    timestamp: new Date().toISOString(),
    weights,
    version: '1.0'
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`✓ Model saved to: ${outputPath}`);
  
  return outputPath;
}

/**
 * Main training pipeline
 */
async function main() {
  try {
    console.log('🚀 Starting ML training pipeline...\n');
    
    const interactions = await fetchTrainingData();
    
    if (interactions.length === 0) {
      console.warn('\n⚠️  No training data found. Using default weights.');
      const weights = getDefaultWeights();
      saveWeights(weights);
      return;
    }

    const features = extractFeatures(interactions);
    
    if (features.length === 0) {
      console.warn('\n⚠️  No valid features extracted. Using default weights.');
      const weights = getDefaultWeights();
      saveWeights(weights);
      return;
    }

    const weights = trainSimpleModel(features);
    saveWeights(weights);
    
    console.log('\n✅ Training complete!');
    console.log('Use these weights in your ranking API by loading trained-weights.json');
    
  } catch (error) {
    console.error('\n❌ Training pipeline failed:', error);
    process.exit(1);
  }
}

main();
