/**
 * routes/scans.js
 * ─────────────────────────────────────────────────────────
 * Full CRUD for scan records stored in MongoDB.
 *
 * GET    /api/scans              — paginated list with filters
 * GET    /api/scans/stats        — lifetime + daily stats
 * GET    /api/scans/:id          — single scan (includes heatmap)
 * PATCH  /api/scans/:id          — mark reviewed / update notes
 * DELETE /api/scans/:id          — soft delete
 * DELETE /api/scans              — soft delete ALL for this user
 */

const express = require('express');
const router  = express.Router();
const { Scan } = require('../models');
const { getDailyAnalytics, getLifetimeTotals } = require('../utils/analyticsHelper');
const { validate, scanUpdateSchema, querySchema } = require('../middleware/validate');

// ── GET /api/scans  (paginated + filtered list) ───────────────────────────
router.get('/', validate(querySchema, 'query'), async (req, res) => {
  const {
    page, limit, classification, riskLevel,
    demoMode, search, sortBy, sortOrder,
  } = req.query;

  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';

  // Build filter
  const filter = { analysedBy: clerkUserId, isDeleted: false };
  if (classification !== 'all') filter.classification = classification;
  if (riskLevel !== 'all')      filter.riskLevel      = riskLevel;
  if (demoMode   === 'true')    filter.demoMode        = true;
  if (demoMode   === 'false')   filter.demoMode        = false;

  // Patient name search via lookup (we join patient inline via populate)
  const skip  = (page - 1) * limit;
  const sort  = { [sortBy === 'createdAt' ? 'createdAt' : sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [scans, total] = await Promise.all([
    Scan.find(filter)
      .select('-heatmap')           // exclude large base64 from list view
      .populate('patientId', 'name mrn age gender')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Scan.countDocuments(filter),
  ]);

  // Apply search filter on populated patient name (post-query)
  const filtered = search
    ? scans.filter(s => {
        const q = search.toLowerCase();
        return (
          s.patientId?.name?.toLowerCase().includes(q) ||
          s.patientId?.mrn?.toLowerCase().includes(q)  ||
          s.filename?.toLowerCase().includes(q)        ||
          s.classification?.includes(q)
        );
      })
    : scans;

  // Normalise field names for frontend compatibility
  const normalised = filtered.map(normaliseScan);

  res.json({
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    records: normalised,
  });
});

// ── GET /api/scans/stats ─────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';
  const [totals, daily] = await Promise.all([
    getLifetimeTotals(clerkUserId),
    getDailyAnalytics(clerkUserId, 7),
  ]);
  res.json({ totals, daily });
});

// ── GET /api/scans/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';

  const scan = await Scan.findOne({ _id: req.params.id, isDeleted: false })
    .select('+heatmap')   // explicitly include heatmap for detail view
    .populate('patientId', 'name mrn age gender referralReason medicalHistory notes')
    .lean();

  if (!scan) return res.status(404).json({ error: 'Scan not found.' });
  if (scan.analysedBy !== clerkUserId) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  res.json(normaliseScan(scan));
});

// ── PATCH /api/scans/:id ─────────────────────────────────────────────────
router.patch('/:id', validate(scanUpdateSchema), async (req, res) => {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';

  const scan = await Scan.findOne({ _id: req.params.id, isDeleted: false });
  if (!scan) return res.status(404).json({ error: 'Scan not found.' });
  if (scan.analysedBy !== clerkUserId) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { reviewed, reviewNote, clinicalNotes } = req.body;
  if (reviewed      !== undefined) scan.reviewed      = reviewed;
  if (reviewNote    !== undefined) scan.reviewNote     = reviewNote;
  if (clinicalNotes !== undefined) scan.clinicalNotes  = clinicalNotes;

  await scan.save();
  res.json({ message: 'Scan updated.', id: scan._id });
});

// ── DELETE /api/scans/:id (soft delete) ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';

  const scan = await Scan.findOne({ _id: req.params.id, isDeleted: false });
  if (!scan) return res.status(404).json({ error: 'Scan not found.' });
  if (scan.analysedBy !== clerkUserId) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  scan.isDeleted = true;
  await scan.save();
  res.json({ message: 'Scan deleted.', id: scan._id });
});

// ── DELETE /api/scans (soft-delete all for this user) ────────────────────
router.delete('/', async (req, res) => {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';
  const result = await Scan.updateMany(
    { analysedBy: clerkUserId, isDeleted: false },
    { $set: { isDeleted: true } }
  );
  res.json({ message: 'All scans deleted.', count: result.modifiedCount });
});

// ── Helper: normalise Mongoose doc to frontend-friendly shape ─────────────
function normaliseScan(s) {
  return {
    id:             s._id?.toString(),
    _id:            s._id?.toString(),
    timestamp:      s.createdAt,
    image_url:      s.imageUrl,
    filename:       s.filename,
    file_size_kb:   s.fileSizeKb,
    prediction:     s.prediction,
    class:          s.classification,
    probability:    s.probability,
    confidence:     s.confidence,
    risk_level:     s.riskLevel,
    message:        s.message,
    heatmap:        s.heatmap || null,
    metrics:        s.metrics,
    model_info:     s.modelInfo,
    clinical_notes: s.clinicalNotes,
    demo_mode:      s.demoMode,
    reviewed:       s.reviewed,
    review_note:    s.reviewNote,
    analysed_by:    s.analysedByName,
    analysed_by_email: s.analysedByEmail,
    patient_name:   s.patientId?.name  || 'Anonymous',
    patient_id:     s.patientId?._id?.toString(),
    patient_mrn:    s.patientId?.mrn,
    patient_age:    s.patientId?.age,
    patient_gender: s.patientId?.gender,
  };
}

module.exports = router;
