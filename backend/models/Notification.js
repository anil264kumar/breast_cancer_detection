const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:  { type: String, required: true },
    body:   { type: String, required: true },
    unread: { type: Boolean, default: true },
    
    // Auto-delete notifications older than 30 days
    createdAt: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
