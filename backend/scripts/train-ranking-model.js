/**
 * ML Training Pipeline for Contact Ranking Model
 * 
 * Trains a simple ranking model from local training data and exports learned
 * weights to use in production ranking.
 * 
 * Usage:
 *   node scripts/train-ranking-model.js
 *   
 * Output: backend/models/trained-weights.json
 */

const fs = require('fs');
const path = require('path');

/**
 * Fetch local ranking interactions file
 */
async function fetchTrainingData() {
  try {
    const localPath = path.join(__dirname, '..', 'models', 'training-interactions.json');
    if (fs.existsSync(localPath)) {
      console.log(`📁 Loading training data from local file: ${localPath}`);
      const raw = fs.readFileSync(localPath, 'utf8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        throw new Error('Local training file must contain a JSON array of interaction objects');
      }
      console.log(`✓ Loaded ${data.length} interaction records from local file`);
      return data;
    }

    throw new Error(`Local training file not found at ${localPath}. Please create ${localPath} with an array of interaction objects.`);
  } catch (error) {
    console.error('❌ Error fetching training data:', error);
    throw error;
  }
}

/**
 * Extract features from interaction data
 */
function extractFeatures(interactions) {
  console.log('🔧 Extracting features from interactions...');
  const features = [];

  for (const interaction of interactions) {
    const contact = interaction.contact || {};

    if (!contact.email || interaction.action === undefined) {
      continue;
    }

    // Prefer the user's search query; if missing, fallback to contact summary/position/name
    const query = ((interaction.query || interaction?.contact?.summary || interaction?.contact?.position || interaction?.contact?.name) || '').toLowerCase();
    const title = (contact.position || '').toLowerCase();
    // Build a small similarity helper that returns 0-1 based on token overlap
    const normalize = (s) => (s || '').toString().toLowerCase();
    const tokenize = (s) => normalize(s).split(/\W+/).filter(t => t.length > 1);
    const jaccardLike = (a, b) => {
      const A = new Set(tokenize(a));
      const B = new Set(tokenize(b));
      if (A.size === 0 || B.size === 0) {
        const na = normalize(a);
        const nb = normalize(b);
        if (!na || !nb) return 0;
        if (na.includes(nb) || nb.includes(na)) return 0.5;
        return 0;
      }
      const inter = [...A].filter(x => B.has(x)).length;
      const uni = new Set([...A, ...B]).size;
      return uni === 0 ? 0 : inter / uni;
    };

    // Continuous similarity scores rather than binary
    const titleMatch = jaccardLike(query, title);

    const semanticSource = (contact.summary || contact.position || contact.name || '').toLowerCase();
    const semanticMatch = jaccardLike(query, semanticSource);

    // Broaden dept/seniority match: check both the query and the contact fields (summary/position)
    const dept = (contact.department || '').toLowerCase();
    const deptMatch = dept && (
      (interaction.query || '').toLowerCase().includes(dept) ||
      (contact.summary || '').toLowerCase().includes(dept) ||
      (contact.position || '').toLowerCase().includes(dept)
    ) ? 1 : 0;

    const senior = (contact.seniority || '').toLowerCase();
    const seniorMatch = senior && (
      (interaction.query || '').toLowerCase().includes(senior) ||
      (contact.summary || '').toLowerCase().includes(senior) ||
      (contact.position || '').toLowerCase().includes(senior)
    ) ? 1 : 0;

    let label;
    if (interaction.action === 'accept') label = 1;
    else if (interaction.action === 'reject') label = 0;
    else label = 0.5;

    features.push({
      titleMatch,
      semanticScore: semanticMatch,
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
 * Train a simple model using correlation-based weights
 */
function trainSimpleModel(features) {
  console.log('🤖 Training ranking model...');
  if (features.length < 10) {
    console.warn(`⚠️  Only ${features.length} samples - using default weights`);
    return getDefaultWeights();
  }

  const featureNames = ['titleMatch', 'semanticScore', 'deptMatch', 'seniorMatch'];
  const X = features.map(f => featureNames.map(name => f[name]));
  const y = features.map(f => f.label);

  const means = featureNames.map((name, i) => features.reduce((acc, f) => acc + f[name], 0) / features.length);
  const Xnorm = X.map(row => row.map((val, i) => val - means[i]));
  const ymean = y.reduce((a, b) => a + b, 0) / y.length;
  const ynorm = y.map(val => val - ymean);

  const weights = featureNames.map((name, i) => {
    let numerator = 0, denom_x = 0, denom_y = 0;
    for (let j = 0; j < Xnorm.length; j++) {
      numerator += Xnorm[j][i] * ynorm[j];
      denom_x += Xnorm[j][i] ** 2;
      denom_y += ynorm[j] ** 2;
    }
    if (denom_x > 0 && denom_y > 0) return Math.max(0, numerator / Math.sqrt(denom_x * denom_y));
    return 0;
  });

  const weightSum = weights.reduce((a, b) => a + b, 0);
  // If correlations give a signal, normalize them. Otherwise (e.g. all labels identical)
  // fall back to accepted-only weighting: use mean feature values among the samples.
  let normalizedWeights;
  if (weightSum > 0) {
    normalizedWeights = weights.map(w => w / weightSum);
  } else {
    console.warn('⚠️  No correlation signal found (labels may be constant). Falling back to accepted-only weighting.');
    const featureMeans = featureNames.map((name) => {
      const sum = features.reduce((acc, f) => acc + (f[name] || 0), 0);
      return features.length ? sum / features.length : 0;
    });
    const fmSum = featureMeans.reduce((a, b) => a + b, 0);
    if (fmSum > 0) {
      normalizedWeights = featureMeans.map(v => v / fmSum);
    } else {
      normalizedWeights = Object.values(getDefaultWeights());
    }
  }

  let correct = 0;
  for (let i = 0; i < features.length; i++) {
    const prediction = normalizedWeights.reduce((sum, w, j) => sum + w * X[i][j], 0);
    const predicted = prediction > 0.5 ? 1 : 0;
    const actual = y[i] > 0.5 ? 1 : 0;
    if (predicted === actual) correct++;
  }

  const accuracy = (correct / features.length * 100).toFixed(2);
  console.log(`✓ Training accuracy: ${accuracy}%`);
  console.log('✓ Learned weights:', Object.fromEntries(featureNames.map((name, i) => [name, normalizedWeights[i].toFixed(3)])));

  return Object.fromEntries(featureNames.map((name, i) => [name, normalizedWeights[i]]));
}

function getDefaultWeights() {
  return { titleMatch: 0.4, semanticScore: 0.4, deptMatch: 0.1, seniorMatch: 0.1 };
}

function saveWeights(weights) {
  const modelDir = path.join(__dirname, '..', 'models');
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });
  const outputPath = path.join(modelDir, 'trained-weights.json');
  const output = { timestamp: new Date().toISOString(), weights, version: '1.0' };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`✓ Model saved to: ${outputPath}`);
  return outputPath;
}

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

