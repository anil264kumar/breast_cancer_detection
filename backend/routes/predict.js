/**
 * routes/predict.js
 * ─────────────────────────────────────────────────────────
 * POST /api/predict
 * Accepts a mammogram image, runs AI inference, saves result to MongoDB.
 */

const express  = require('express');
const router   = express.Router();
const fs       = require('fs');
const { upload }           = require('../middleware/upload');
const { callMLService }    = require('../utils/mlService');
const { recordScanStats }  = require('../utils/analyticsHelper');
const { Scan, Patient, Notification, User } = require('../models/mongoose');
const cloudinary           = require('../utils/cloudinary');

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file received. Field name must be "file".' });
  }

  const imagePath = req.file.path;
  let imageUrl = null;

  // Pull Clerk user context from request headers (set by frontend)
  const clerkUserId    = req.headers['x-clerk-user-id']    || 'anonymous';
  const clerkUserEmail = req.headers['x-clerk-user-email'] || '';
  const clerkUserName  = req.headers['x-clerk-user-name']  || 'Unknown Clinician';

  // Optional patient info from multipart fields
  const {
    patient_name,
    patient_mrn,
    patient_age,
    patient_gender,
    patient_id: existingPatientId,   // ObjectId — attach to existing patient
    clinical_notes,
  } = req.body;

  try {
    // ── 1. Upload to Cloudinary & Call Python ML service ─────────────
    const [mlResult, uploadResult] = await Promise.all([
      callMLService(imagePath),
      cloudinary.uploader.upload(imagePath, { folder: 'mammoai_scans' })
    ]);
    
    const { demo, data } = mlResult;
    imageUrl = uploadResult.secure_url;

    // ── 2. Resolve / create Patient document ─────────────────────────
    let patientId = null;

    if (existingPatientId) {
      // Caller passed an existing patient's _id
      patientId = existingPatientId;
    } else if (patient_name || patient_mrn) {
      // Create a new Patient record
      const patient = await Patient.create({
        createdBy:      clerkUserId,
        name:           patient_name   || 'Anonymous',
        mrn:            patient_mrn    || '',
        age:            patient_age    ? parseInt(patient_age, 10) : undefined,
        gender:         patient_gender || 'not_specified',
        notes:          clinical_notes || '',
        scanCount:      1,
      });
      patientId = patient._id;
    } else {
      // Anonymous — still bump an existing anonymous patient or create one
      let anon = await Patient.findOne({ createdBy: clerkUserId, name: 'Anonymous' });
      if (!anon) {
        anon = await Patient.create({ createdBy: clerkUserId, name: 'Anonymous', scanCount: 0 });
      }
      await Patient.findByIdAndUpdate(anon._id, { $inc: { scanCount: 1 } });
      patientId = anon._id;
    }

    // ── 3. Save Scan to MongoDB ──────────────────────────────────────
    const scan = await Scan.create({
      patientId,
      analysedBy:      clerkUserId,
      analysedByEmail: clerkUserEmail,
      analysedByName:  clerkUserName,

      filename:    req.file.originalname,
      imageUrl,
      fileSizeKb:  Math.round(req.file.size / 1024),
      mimeType:    req.file.mimetype,

      prediction:     data.prediction,
      classification: data.class,
      probability:    data.probability,
      confidence:     data.confidence,
      riskLevel:      data.risk_level,
      message:        data.message,
      heatmap:        data.heatmap || null,

      metrics:    data.metrics,
      modelInfo:  data.model_info,

      clinicalNotes: clinical_notes || '',
      demoMode:      demo || data.demo_mode || false,
    });

    // ── 4. Increment daily analytics ────────────────────────────────
    await recordScanStats(clerkUserId, scan);

    // ── 4b. Create Notification for the Clinician ───────────────────
    if (clerkUserId !== 'anonymous') {
      // Find the user's ObjectId in our DB (since clerkUserId might be a local ObjectId or a Clerk String ID)
      const dbUser = await User.findOne({ $or: [{ clerkId: clerkUserId }, { _id: clerkUserId.length === 24 ? clerkUserId : null }] });
      if (dbUser) {
        await Notification.create({
          userId: dbUser._id,
          title: 'Analysis Complete',
          body: `Mammogram analysis for ${patient_name || 'Anonymous'} finished. Risk level: ${data.risk_level}.`,
          unread: true
        });
      }
    }

    // ── 5. Increment patient scan count (if new patient created above) ─
    if (patient_name || patient_mrn) {
      // Already set scanCount:1 at creation; bump for subsequent scans
    } else {
      await Patient.findByIdAndUpdate(patientId, { $inc: { scanCount: 1 } });
    }

    // ── 6. Build response (exclude raw heatmap from default response) ─
    const response = scan.toJSON();
    // Re-attach heatmap for the immediate response only
    response.heatmap    = data.heatmap || null;
    response.id         = scan._id.toString();   // alias for frontend compatibility
    response.image_url  = scan.imageUrl;
    response.demo_mode  = scan.demoMode;
    response.risk_level = scan.riskLevel;
    response.class      = scan.classification;
    response.file_size_kb = scan.fileSizeKb;

    return res.status(201).json(response);

  } catch (err) {
    console.error('[Predict] Error:', err.message);
    return res.status(500).json({ error: 'Prediction pipeline failed.', detail: err.message });
  } finally {
    // Always delete the local temporary image to preserve Render ephemeral disk
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  }
});

module.exports = router;
