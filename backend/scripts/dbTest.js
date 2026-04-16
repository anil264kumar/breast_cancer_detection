/**
 * scripts/dbTest.js
 * ─────────────────────────────────────────────────────────
 * Tests the MongoDB connection and prints collection stats.
 * Run with:  npm run dbtest
 */

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const { connectDB, disconnectDB, getStatus } = require("../db/connection");
const { Patient, Scan, Analytics } = require("../models/mongoose");

async function test() {
  console.log("\n🔍  MammoAI Clinical — Database Connection Test\n");

  try {
    await connectDB();
    const status = getStatus();
    console.log("  Connection status:", status);

    const [patients, scans, analytics] = await Promise.all([
      Patient.countDocuments(),
      Scan.countDocuments(),
      Analytics.countDocuments(),
    ]);

    console.log("\n  📊  Collection counts:");
    console.log(`     patients:  ${patients}`);
    console.log(`     scans:     ${scans}`);
    console.log(`     analytics: ${analytics}`);

    if (scans > 0) {
      const latest = await Scan.findOne().sort({ createdAt: -1 }).lean();
      console.log("\n  🕐  Latest scan:");
      console.log(`     patient:    ${latest.analysedByName}`);
      console.log(`     result:     ${latest.prediction}`);
      console.log(`     risk:       ${latest.riskLevel}`);
      console.log(`     timestamp:  ${latest.createdAt}`);
    }

    const indexes = await Scan.collection.indexes();
    console.log(`\n  🗂   Scan indexes: ${indexes.length} defined`);

    console.log("\n    All tests passed. MongoDB is working correctly.\n");
  } catch (err) {
    console.error("\n  ❌  Connection failed:", err.message);
    console.error("\n  Troubleshooting:");
    console.error('    - Local MongoDB: run "mongod" or check MongoDB service');
    console.error("    - Atlas: verify MONGODB_URI in backend/.env");
    console.error(
      "    - Atlas: whitelist your IP in Network Access settings\n",
    );
  } finally {
    await disconnectDB();
  }
}

test();
