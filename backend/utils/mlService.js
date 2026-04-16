/**
 * utils/mlService.js
 * Calls the Python model server. Falls back to demo when offline.
 */
const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function callMLService(imagePath) {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));
    const { data } = await axios.post(`${ML_URL}/predict`, form, {
      headers: form.getHeaders(),
      timeout: 45_000,
    });
    return { success: true, demo: false, data };
  } catch (err) {
    console.warn(`[ML Service] Unavailable (${err.message}) — demo mode`);
    return { success: true, demo: true, data: buildDemoResult() };
  }
}

function buildDemoResult() {
  const isCancer = Math.random() < 0.38;
  const prob     = isCancer ? 0.55 + Math.random() * 0.40 : 0.04 + Math.random() * 0.32;
  const conf     = isCancer ? prob : (1 - prob);
  const risk     = prob >= 0.70 ? 'High Risk' : prob >= 0.40 ? 'Moderate Risk' : 'Low Risk';
  return {
    prediction:    isCancer ? 'Cancer Detected'    : 'No Cancer Detected',
    class:         isCancer ? 'cancer'              : 'non-cancer',
    probability:   parseFloat((prob  * 100).toFixed(2)),
    confidence:    parseFloat((conf  * 100).toFixed(2)),
    risk_level:    risk,
    message:       isCancer
      ? 'Potential cancerous tissue detected. Immediate specialist referral recommended.'
      : 'No cancerous tissue detected. Continue routine screening schedule.',
    heatmap:       null,
    metrics:    { accuracy:'91.2%', auc_roc:'0.943', recall:'88.7%', precision:'87.4%' },
    model_info: {
      architecture:'EfficientNetB0',
      training:    'Transfer Learning — ImageNet → Mammogram Mastery',
      dataset:     'Mammogram Mastery · DOI: 10.17632/fvjhtskg93.1',
      classes:     ['non-cancer','cancer'],
    },
    demo_mode: true,
  };
}

async function checkMLHealth() {
  try {
    const { data } = await axios.get(`${ML_URL}/health`, { timeout: 5_000 });
    return { online: true, data };
  } catch {
    return { online: false };
  }
}

module.exports = { callMLService, checkMLHealth };
