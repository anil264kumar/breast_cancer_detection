/**
 * routes/patients.js
 * ─────────────────────────────────────────────────────────
 * GET    /api/patients          — list patients for this clinician
 * POST   /api/patients          — create patient
 * GET    /api/patients/:id      — get patient + their scan history
 * PATCH  /api/patients/:id      — update patient details
 * DELETE /api/patients/:id      — soft delete patient
 */

const express = require('express');
const router  = express.Router();
const { Patient, Scan } = require('../models/mongoose');
const { validate, patientSchema } = require('../middleware/validate');

// ── GET /api/patients ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';
  const { search = '', page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = { createdBy: clerkUserId, isActive: true };

  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Patient.countDocuments(filter),
  ]);

  // Post-query search on name / mrn
  const results = search
    ? patients.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.mrn?.toLowerCase().includes(search.toLowerCase())
      )
    : patients;

  res.json({ total, page: parseInt(page), patients: results });
});

// ── POST /api/patients ────────────────────────────────────────────────────
router.post('/', validate(patientSchema), async (req, res) => {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';
  const patient = await Patient.create({ ...req.body, createdBy: clerkUserId });
  res.status(201).json(patient);
});

// ── GET /api/patients/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';

  const patient = await Patient.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!patient) return res.status(404).json({ error: 'Patient not found.' });
  if (patient.createdBy !== clerkUserId) return res.status(403).json({ error: 'Access denied.' });

  // Fetch last 10 scans for this patient
  const scans = await Scan.find({ patientId: req.params.id, isDeleted: false })
    .select('-heatmap')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.json({ patient, recentScans: scans });
});

// ── PATCH /api/patients/:id ───────────────────────────────────────────────
router.patch('/:id', validate(patientSchema), async (req, res) => {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';

  const patient = await Patient.findOne({ _id: req.params.id, isActive: true });
  if (!patient) return res.status(404).json({ error: 'Patient not found.' });
  if (patient.createdBy !== clerkUserId) return res.status(403).json({ error: 'Access denied.' });

  Object.assign(patient, req.body);
  await patient.save();
  res.json(patient);
});

// ── DELETE /api/patients/:id (soft delete) ────────────────────────────────
router.delete('/:id', async (req, res) => {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';

  const patient = await Patient.findOne({ _id: req.params.id });
  if (!patient) return res.status(404).json({ error: 'Patient not found.' });
  if (patient.createdBy !== clerkUserId) return res.status(403).json({ error: 'Access denied.' });

  patient.isActive = false;
  await patient.save();
  res.json({ message: 'Patient removed.', id: patient._id });
});

module.exports = router;
