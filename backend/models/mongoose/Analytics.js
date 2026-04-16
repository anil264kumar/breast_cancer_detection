/**
 * models/mongoose/Analytics.js
 * ─────────────────────────────────────────────────────────
 * Pre-aggregated daily stats per Clerk user.
 * Updated with $inc on every scan save.
 * Powers the Dashboard charts without expensive aggregation queries.
 */

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const AnalyticsSchema = new Schema(
  {
    clerkUserId: { type: String, required: true, index: true },
    date:        { type: String, required: true },  // 'YYYY-MM-DD'

    totalScans:     { type: Number, default: 0 },
    cancerCount:    { type: Number, default: 0 },
    nonCancerCount: { type: Number, default: 0 },
    highRiskCount:  { type: Number, default: 0 },
    demoCount:      { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Unique per user per day
AnalyticsSchema.index({ clerkUserId: 1, date: 1 }, { unique: true });

module.exports = model('Analytics', AnalyticsSchema);
