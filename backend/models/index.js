/**
 * models/mongoose/index.js
 * Export all Mongoose models from one place.
 */

const Patient      = require('./Patient');
const Scan         = require('./Scan');
const Analytics    = require('./Analytics');
const User         = require('./User');
const Notification = require('./Notification');

module.exports = { Patient, Scan, Analytics, User, Notification };
