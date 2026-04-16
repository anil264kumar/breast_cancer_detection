/**
 * models/mongoose/Scan.js
 * ─────────────────────────────────────────────────────────
 * Every mammogram upload + AI prediction result is stored here.
 * Links to a Patient document and records Clerk user context.
 */

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// ── Sub-schema: model metrics snapshot ───────────────────────────────────
const MetricsSchema = new Schema(
  {
    accuracy:  { type: String },
    auc_roc:   { type: String },
    recall:    { type: String },
    precision: { type: String },
  },
  { _id: false }
);

// ── Sub-schema: model info snapshot ──────────────────────────────────────
const ModelInfoSchema = new Schema(
  {
    architecture:  { type: String },
    training:      { type: String },
    dataset:       { type: String },
    classes:       [{ type: String }],
    phase1_epochs: { type: Number },
    phase2_epochs: { type: Number },
  },
  { _id: false }
);

// ── Main scan schema ──────────────────────────────────────────────────────
const ScanSchema = new Schema(
  {
    // ── Relations ──────────────────────────────────────────────────────
    patientId: {
      type:  Schema.Types.ObjectId,
      ref:   'Patient',
      index: true,
    },
    // Clerk user who ran this analysis
    analysedBy:      { type: String, required: true, index: true },
    analysedByEmail: { type: String },
    analysedByName:  { type: String },

    // ── Image file ─────────────────────────────────────────────────────
    filename:    { type: String, required: true },
    imageUrl:    { type: String, required: true },  // /uploads/<file>
    fileSizeKb:  { type: Number },
    mimeType:    { type: String },

    // ── AI prediction result ────────────────────────────────────────────
    prediction:  {
      type: String,
      enum: ['Cancer Detected', 'No Cancer Detected'],
      required: true,
    },
    classification: {
      type: String,
      enum: ['cancer', 'non-cancer'],
      required: true,
      index: true,
    },
    probability:  { type: Number, min: 0, max: 100, required: true },
    confidence:   { type: Number, min: 0, max: 100 },
    riskLevel: {
      type:  String,
      enum:  ['High Risk', 'Moderate Risk', 'Low Risk'],
      index: true,
    },
    message:     { type: String },

    // ── Grad-CAM heatmap (base64 string — may be null in demo mode) ─────
    heatmap:     { type: String, default: null, select: false }, // exclude by default (large)

    // ── Model metadata snapshot ─────────────────────────────────────────
    metrics:    { type: MetricsSchema  },
    modelInfo:  { type: ModelInfoSchema },

    // ── Clinical notes ──────────────────────────────────────────────────
    clinicalNotes: { type: String, trim: true, maxlength: 2000 },

    // ── Flags ──────────────────────────────────────────────────────────
    demoMode:   { type: Boolean, default: false, index: true },
    reviewed:   { type: Boolean, default: false },  // marked reviewed by clinician
    reviewNote: { type: String, trim: true, maxlength: 500 },
    isDeleted:  { type: Boolean, default: false, index: true }, // soft delete
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Compound indexes ──────────────────────────────────────────────────────
ScanSchema.index({ analysedBy: 1, createdAt: -1 });      // clinician history
ScanSchema.index({ patientId: 1,  createdAt: -1 });      // patient timeline
ScanSchema.index({ classification: 1, riskLevel: 1 });   // filter queries
ScanSchema.index({ createdAt: -1 });                     // global date sort

// ── Virtual: short ID for display ────────────────────────────────────────
ScanSchema.virtual('shortId').get(function () {
  return this._id.toString().slice(-8).toUpperCase();
});

// ── Ensure virtual fields are included in toJSON ─────────────────────────
ScanSchema.set('toJSON', { virtuals: true });
ScanSchema.set('toObject', { virtuals: true });

module.exports = model('Scan', ScanSchema);
