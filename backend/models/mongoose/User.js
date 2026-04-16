/**
 * models/mongoose/User.js
 * ─────────────────────────────────────────────────────────
 * Stores ALL clinician/user accounts:
 *   - authProvider: 'clerk'  → signed up via Clerk (OAuth / Clerk email)
 *   - authProvider: 'local'  → signed up via our custom email+password form
 *
 * For 'local' users, passwordHash is stored (bcrypt).
 * For 'clerk' users, clerkId is the primary key; passwordHash is null.
 */

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    // ── Auth provider ────────────────────────────────────────────────────
    authProvider: {
      type:    String,
      enum:    ['clerk', 'local'],
      default: 'local',
      index:   true,
    },

    // ── Clerk fields (only when authProvider === 'clerk') ────────────────
    clerkId: {
      type:    String,
      sparse:  true,   // Allow null for local users
      unique:  true,
      index:   true,
    },

    // ── Profile ──────────────────────────────────────────────────────────
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
      index:     true,
    },
    firstName: { type: String, trim: true, default: '' },
    lastName:  { type: String, trim: true, default: '' },
    fullName:  { type: String, trim: true, default: '' },
    imageUrl:  { type: String, default: '' },

    // ── Local auth (only when authProvider === 'local') ──────────────────
    passwordHash: {
      type:    String,
      default: null,
      select:  false,   // Never returned in queries unless explicitly requested
    },

    // ── Role ─────────────────────────────────────────────────────────────
    role: {
      type:    String,
      enum:    ['clinician', 'admin', 'viewer'],
      default: 'clinician',
    },

    // ── Status ────────────────────────────────────────────────────────────
    isActive:    { type: Boolean, default: true },
    lastLoginAt: { type: Date,    default: Date.now },
    deletedAt:   { type: Date,    default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = model('User', UserSchema);
