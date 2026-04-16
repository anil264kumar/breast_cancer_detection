/**
 * utils/analyticsHelper.js
 * ─────────────────────────────────────────────────────────
 * Increments the pre-aggregated Analytics document for today.
 * Called after every successful scan save.
 */

const { Analytics } = require('../models');

async function recordScanStats(clerkUserId, scan) {
  const date = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  const inc = {
    totalScans:     1,
    cancerCount:    scan.classification === 'cancer'     ? 1 : 0,
    nonCancerCount: scan.classification === 'non-cancer' ? 1 : 0,
    highRiskCount:  scan.riskLevel === 'High Risk'       ? 1 : 0,
    demoCount:      scan.demoMode                        ? 1 : 0,
  };

  // Upsert: create document if it doesn't exist, otherwise increment
  await Analytics.findOneAndUpdate(
    { clerkUserId, date },
    { $inc: inc },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/**
 * Returns the last `days` days of analytics for a user.
 * Fills in zeros for days with no scans.
 */
async function getDailyAnalytics(clerkUserId, days = 7) {
  const docs = await Analytics.find({ clerkUserId })
    .sort({ date: -1 })
    .limit(days)
    .lean();

  // Build a map: date → doc
  const map = Object.fromEntries(docs.map(d => [d.date, d]));

  // Fill every day in the requested range (today going back `days`)
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({
      date:           key,
      totalScans:     map[key]?.totalScans     || 0,
      cancerCount:    map[key]?.cancerCount    || 0,
      nonCancerCount: map[key]?.nonCancerCount || 0,
      highRiskCount:  map[key]?.highRiskCount  || 0,
    });
  }
  return result;
}

/**
 * Returns lifetime totals for a user.
 */
async function getLifetimeTotals(clerkUserId) {
  const [agg] = await Analytics.aggregate([
    { $match: { clerkUserId } },
    {
      $group: {
        _id:            '$clerkUserId',
        totalScans:     { $sum: '$totalScans'     },
        cancerCount:    { $sum: '$cancerCount'    },
        nonCancerCount: { $sum: '$nonCancerCount' },
        highRiskCount:  { $sum: '$highRiskCount'  },
        demoCount:      { $sum: '$demoCount'      },
      },
    },
  ]);
  return agg || {
    totalScans: 0, cancerCount: 0, nonCancerCount: 0, highRiskCount: 0, demoCount: 0,
  };
}

module.exports = { recordScanStats, getDailyAnalytics, getLifetimeTotals };
