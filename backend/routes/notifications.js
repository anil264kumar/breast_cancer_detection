const express = require('express');
const router  = express.Router();
const { Notification, User } = require('../models');

// Helper to get dbUser from auth headers 
async function getDbUser(req) {
  const clerkUserId = req.headers['x-clerk-user-id'] || 'anonymous';
  if (clerkUserId === 'anonymous') return null;
  return await User.findOne({ $or: [{ clerkId: clerkUserId }, { _id: clerkUserId.length === 24 ? clerkUserId : null }] });
}

// GET /api/notifications
router.get('/', async (req, res) => {
  const dbUser = await getDbUser(req);
  if (!dbUser) return res.status(401).json({ error: 'Unauthorized' });

  const notifications = await Notification.find({ userId: dbUser._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  // Normalize id for frontend
  const formatted = notifications.map(n => ({
    id: n._id.toString(),
    title: n.title,
    body: n.body,
    unread: n.unread,
    time: n.createdAt
  }));

  res.json({ notifications: formatted });
});

// PATCH /api/notifications/mark-read
router.patch('/mark-read', async (req, res) => {
  const dbUser = await getDbUser(req);
  if (!dbUser) return res.status(401).json({ error: 'Unauthorized' });

  const { ids } = req.body; // array of ids to mark read, or empty array to mark all

  const filter = { userId: dbUser._id, unread: true };
  if (ids && ids.length > 0) {
    filter['_id'] = { $in: ids };
  }

  const result = await Notification.updateMany(filter, { $set: { unread: false } });
  
  res.json({ message: 'Marked read', count: result.modifiedCount });
});

module.exports = router;
