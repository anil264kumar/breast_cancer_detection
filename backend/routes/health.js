/**
 * routes/health.js
 * GET /api/health  — server, MongoDB, and ML service status
 */

const express = require('express');
const router  = express.Router();
const { checkMLHealth }  = require('../utils/mlService');
const { getStatus }      = require('../db/connection');
const Scan          = require('../models/mongoose/Scan.js');

router.get('/', async (req, res) => {
  const [ml, totalScans] = await Promise.all([
    checkMLHealth(),
    Scan.countDocuments({ isDeleted: false }).catch(() => null),
  ]);

  const db = getStatus();

  res.json({
    status:     'ok',
    server:     'running',
    timestamp:  new Date().toISOString(),
    uptime_sec: Math.floor(process.uptime()),
    database: {
      state:    db.state,
      ready:    db.ready,
      host:     db.host,
      port:     db.port,
      name:     db.dbName,
      totalScans,
    },
    ml_service: {
      url:    process.env.ML_SERVICE_URL || 'http://localhost:8000',
      online: ml.online,
      mode:   ml.online ? 'live' : 'demo',
    },
    dataset: {
      name:    'Mammogram Mastery',
      doi:     '10.17632/fvjhtskg93.1',
      classes: ['cancer', 'non-cancer'],
    },
  });
});

module.exports = router;
