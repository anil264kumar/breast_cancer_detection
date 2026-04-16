/**
 * models/mongoose/Patient.js
 * ─────────────────────────────────────────────────────────
 * Stores de-identified patient demographic data.
 * Each Patient can have many Scan records (1-to-many).
 */

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const PatientSchema = new Schema(
  {
    // Clerk user ID of the clinician who registered this patient
    createdBy: {
      type: String,
      required: true,
      index: true,
    },

    // Basic demographics
    name: {
      type:      String,
      default:   'Anonymous',
      trim:      true,
      maxlength: 120,
    },
    mrn: {
      type:  String,        // Medical Record Number
      trim:  true,
      default: '',
    },
    age: {
      type: Number,
      min:  1,
      max:  120,
    },
    gender: {
      type: String,
      enum: ['female', 'male', 'other', 'not_specified'],
      default: 'not_specified',
    },

    // Clinical metadata
    referralReason: { type: String, trim: true, maxlength: 500 },
    medicalHistory: { type: String, trim: true, maxlength: 1000 },
    notes:          { type: String, trim: true, maxlength: 2000 },

    // Whether the patient is active or soft-deleted
    isActive: { type: Boolean, default: true, index: true },

    // How many scans this patient has (denormalised counter)
    scanCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,   // createdAt, updatedAt
    versionKey: false,
  }
);

// ── Compound index: list patients for a specific clinician ──────────────
PatientSchema.index({ createdBy: 1, createdAt: -1 });

// ── Text search on name and MRN ─────────────────────────────────────────
PatientSchema.index({ name: 'text', mrn: 'text' });

// ── Virtual: age band ────────────────────────────────────────────────────
PatientSchema.virtual('ageBand').get(function () {
  if (!this.age) return 'Unknown';
  if (this.age < 40) return '<40';
  if (this.age < 50) return '40–49';
  if (this.age < 60) return '50–59';
  if (this.age < 70) return '60–69';
  return '70+';
});

module.exports = model('Patient', PatientSchema);
