/**
 * routes/auth.js
 * ─────────────────────────────────────────────────────────
 * Clerk sign-up/sign-in sync:
 *   POST /api/auth/sync-user   — called after Clerk auth; upserts user in DB
 *   GET  /api/auth/me          — returns the current Clerk user's DB profile
 *
 * Custom email+password auth (local):
 *   POST /api/auth/register    — create account with email + password
 *   POST /api/auth/login       — sign in with email + password → JWT
 *   GET  /api/auth/profile     — get local user profile (JWT protected)
 */

const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { User }  = require('../models/mongoose');

const JWT_SECRET  = process.env.JWT_SECRET  || 'fallback_secret_change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// ── Helper: sign a JWT for local users ───────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ── Helper: verify JWT middleware ─────────────────────────────────────────
function requireLocalAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  try {
    req.localUser = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  CLERK ROUTES
// ══════════════════════════════════════════════════════════════════════════

// ── POST /api/auth/sync-user ──────────────────────────────────────────────
// Called by the frontend (ClerkUserSync) after every Clerk sign-in/sign-up.
// Upserts the user record in MongoDB under authProvider = 'clerk'.
router.post('/sync-user', async (req, res) => {
  const clerkId  = req.headers['x-clerk-user-id'];
  const email    = req.headers['x-clerk-user-email'];
  const fullName = req.headers['x-clerk-user-name'] || '';

  if (!clerkId) return res.status(401).json({ error: 'No Clerk user ID provided.' });
  if (!email)   return res.status(400).json({ error: 'No email in request headers.' });

  const parts     = fullName.trim().split(' ');
  const firstName = parts[0] || '';
  const lastName  = parts.slice(1).join(' ') || '';
  const { imageUrl = '' } = req.body || {};

  // Check if this email is already registered as a local user
  const existingLocal = await User.findOne({ email: email.toLowerCase(), authProvider: 'local' });
  if (existingLocal) {
    // Allow Clerk to "adopt" the local account by linking clerkId
    existingLocal.clerkId      = clerkId;
    existingLocal.authProvider = 'clerk';
    existingLocal.firstName    = firstName || existingLocal.firstName;
    existingLocal.lastName     = lastName  || existingLocal.lastName;
    existingLocal.fullName     = fullName  || existingLocal.fullName;
    existingLocal.imageUrl     = imageUrl  || existingLocal.imageUrl;
    existingLocal.lastLoginAt  = new Date();
    await existingLocal.save();
    return res.status(200).json({
      message: 'Local account linked to Clerk.',
      user: safeUser(existingLocal),
    });
  }

  const user = await User.findOneAndUpdate(
    { clerkId },
    {
      $set: {
        email:       email.toLowerCase(),
        firstName,
        lastName,
        fullName:    fullName || `${firstName} ${lastName}`.trim(),
        imageUrl,
        lastLoginAt: new Date(),
        isActive:    true,
        authProvider: 'clerk',
      },
      $setOnInsert: { clerkId, role: 'clinician' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const isNew = Math.abs(user.createdAt - user.updatedAt) < 1000;
  console.log(`[Auth/Clerk] User ${isNew ? 'CREATED' : 'updated'}: ${email}`);

  res.status(isNew ? 201 : 200).json({
    message: isNew ? 'User registered via Clerk.' : 'Clerk user updated.',
    user: safeUser(user),
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const clerkId = req.headers['x-clerk-user-id'];
  if (!clerkId) return res.status(401).json({ error: 'Not authenticated.' });

  const user = await User.findOne({ clerkId, isActive: true }).lean();
  if (!user) return res.status(404).json({ error: 'User not found. Please sign out and back in.' });

  res.json({ user });
});

// ══════════════════════════════════════════════════════════════════════════
//  LOCAL EMAIL + PASSWORD ROUTES
// ══════════════════════════════════════════════════════════════════════════

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { firstName = '', lastName = '', email, password } = req.body;

  // ── Validation ─────────────────────────────────────────────────────────
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  // ── Check duplicate ────────────────────────────────────────────────────
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (existing.authProvider === 'clerk') {
      return res.status(409).json({
        error: 'This email is already registered via Clerk (Google/social login). Please sign in with Clerk.',
      });
    }
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // ── Hash password & create user ────────────────────────────────────────
  const passwordHash = await bcrypt.hash(password, 12);
  const fullName     = `${firstName} ${lastName}`.trim() || email.split('@')[0];

  const user = await User.create({
    authProvider: 'local',
    email:        email.toLowerCase(),
    firstName,
    lastName,
    fullName,
    passwordHash,
    role:         'clinician',
    lastLoginAt:  new Date(),
  });

  console.log(`[Auth/Local] New user registered: ${email}`);

  const token = signToken(user);

  res.status(201).json({
    message: 'Account created successfully.',
    token,
    user: safeUser(user),
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Always fetch passwordHash explicitly (select: false by default)
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+passwordHash');

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.authProvider === 'clerk') {
    return res.status(400).json({
      error: 'This account uses Clerk authentication. Please sign in with Clerk.',
    });
  }

  if (!user.passwordHash) {
    return res.status(400).json({ error: 'No password set for this account.' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Update last login time
  user.lastLoginAt = new Date();
  await user.save();

  console.log(`[Auth/Local] Login success: ${email}`);

  const token = signToken(user);

  res.json({
    message: 'Logged in successfully.',
    token,
    user: safeUser(user),
  });
});

// ── GET /api/auth/profile ─────────────────────────────────────────────────
// Protected: requires Bearer JWT from local login
router.get('/profile', requireLocalAuth, async (req, res) => {
  const user = await User.findById(req.localUser.userId).lean();
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: safeUser(user) });
});

// ── DELETE /api/auth/account ──────────────────────────────────────────────
// Soft deletes the user account (inactive + deletedAt).
router.delete('/account', requireLocalAuth, async (req, res) => {
  const user = await User.findById(req.localUser.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Mark as inactive and record when they deleted it
  user.isActive = false;
  user.deletedAt = new Date();
  
  // Note: A scheduled cron job/Lambda would typically clean up 
  // inactive accounts older than 30 days.
  await user.save();

  console.log(`[Auth/Local] Account scheduled for deletion: ${user.email}`);
  
  res.json({ message: 'Your account has been deactivated and will be permanently deleted after 30 days.' });
});

// ══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════════
function safeUser(u) {
  return {
    id:           u._id,
    clerkId:      u.clerkId   || null,
    authProvider: u.authProvider,
    email:        u.email,
    firstName:    u.firstName,
    lastName:     u.lastName,
    fullName:     u.fullName,
    imageUrl:     u.imageUrl  || '',
    role:         u.role,
    createdAt:    u.createdAt,
    lastLoginAt:  u.lastLoginAt,
  };
}

module.exports = router;
