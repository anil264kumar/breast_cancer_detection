/**
 * scripts/seed.js
 * ─────────────────────────────────────────────────────────
 * Populates MongoDB with realistic demo patients + scan records.
 * Run once after setting up your database:
 *
 *   cd backend
 *   npm run seed
 *
 * SAFE TO RE-RUN — checks for existing data before inserting.
 */

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../db/connection");
const { Patient, Scan, Analytics } = require("../models");

// ── Demo Clerk user ID (replace with your real Clerk user ID after login) ─
const DEMO_USER_ID = "demo_clinician_001";
const DEMO_USER_NAME = "Dr. Priya Sharma";
const DEMO_USER_EMAIL = "priya.sharma@wce-sangli.ac.in";

// ── Realistic patient data ────────────────────────────────────────────────
const PATIENTS = [
  {
    name: "Sunita Deshpande",
    mrn: "MRN-2025-001",
    age: 52,
    gender: "female",
    notes: "Family history of breast cancer. Annual screening.",
  },
  {
    name: "Kavita Pawar",
    mrn: "MRN-2025-002",
    age: 47,
    gender: "female",
    notes: "Referred by GP after self-detection of lump.",
  },
  {
    name: "Meera Kulkarni",
    mrn: "MRN-2025-003",
    age: 61,
    gender: "female",
    notes: "Post-menopause. Routine mammogram screening.",
  },
  {
    name: "Rekha Joshi",
    mrn: "MRN-2025-004",
    age: 38,
    gender: "female",
    notes: "Young onset concern. BRCA1 carrier.",
  },
  {
    name: "Anita Patil",
    mrn: "MRN-2025-005",
    age: 55,
    gender: "female",
    notes: "Follow-up after previous benign finding.",
  },
  {
    name: "Lata Shinde",
    mrn: "MRN-2025-006",
    age: 64,
    gender: "female",
    notes: "Presented with nipple discharge.",
  },
  {
    name: "Usha Desai",
    mrn: "MRN-2025-007",
    age: 43,
    gender: "female",
    notes: "Dense breast tissue. High-risk protocol.",
  },
  {
    name: "Varsha Bhosale",
    mrn: "MRN-2025-008",
    age: 58,
    gender: "female",
    notes: "Hormone replacement therapy. Annual check.",
  },
];

// ── Generate a realistic scan record for a patient ────────────────────────
function makeScan(patientDoc, daysAgo, forceClass) {
  const isCancer =
    forceClass === "cancer" || (!forceClass && Math.random() < 0.35);
  const prob = isCancer
    ? 58 + Math.random() * 38 // 58–96%
    : 4 + Math.random() * 28; // 4–32%
  const conf = isCancer ? prob : 100 - prob;
  const risk =
    prob >= 70 ? "High Risk" : prob >= 40 ? "Moderate Risk" : "Low Risk";

  const ts = new Date();
  ts.setDate(ts.getDate() - daysAgo);
  ts.setHours(
    8 + Math.floor(Math.random() * 9),
    Math.floor(Math.random() * 60),
  );

  return {
    patientId: patientDoc._id,
    analysedBy: DEMO_USER_ID,
    analysedByEmail: DEMO_USER_EMAIL,
    analysedByName: DEMO_USER_NAME,

    filename: `mammogram_${patientDoc.mrn}_${ts.toISOString().slice(0, 10)}.jpg`,
    imageUrl: `/uploads/seed_placeholder.jpg`,
    fileSizeKb: 180 + Math.floor(Math.random() * 300),
    mimeType: "image/jpeg",

    prediction: isCancer ? "Cancer Detected" : "No Cancer Detected",
    classification: isCancer ? "cancer" : "non-cancer",
    probability: parseFloat(prob.toFixed(2)),
    confidence: parseFloat(conf.toFixed(2)),
    riskLevel: risk,
    message: isCancer
      ? "Potential cancerous tissue detected. Immediate specialist referral recommended."
      : "No cancerous tissue detected. Continue routine screening schedule.",
    heatmap: null,
    metrics: {
      accuracy: "91.2%",
      auc_roc: "0.943",
      recall: "88.7%",
      precision: "87.4%",
    },
    modelInfo: {
      architecture: "EfficientNetB0",
      training: "Transfer Learning — ImageNet → Mammogram Mastery",
      dataset: "Mammogram Mastery · DOI: 10.17632/fvjhtskg93.1",
      classes: ["non-cancer", "cancer"],
    },
    clinicalNotes: patientDoc.notes || "",
    demoMode: true,
    reviewed: Math.random() > 0.5,
    createdAt: ts,
    updatedAt: ts,
  };
}

// ── Seed daily analytics from scans ──────────────────────────────────────
async function seedAnalytics(scans) {
  const map = {};
  for (const s of scans) {
    const date = new Date(s.createdAt).toISOString().slice(0, 10);
    if (!map[date])
      map[date] = {
        totalScans: 0,
        cancerCount: 0,
        nonCancerCount: 0,
        highRiskCount: 0,
        demoCount: 0,
      };
    map[date].totalScans++;
    if (s.classification === "cancer") map[date].cancerCount++;
    if (s.classification === "non-cancer") map[date].nonCancerCount++;
    if (s.riskLevel === "High Risk") map[date].highRiskCount++;
    if (s.demoMode) map[date].demoCount++;
  }
  for (const [date, inc] of Object.entries(map)) {
    await Analytics.findOneAndUpdate(
      { clerkUserId: DEMO_USER_ID, date },
      { $inc: inc },
      { upsert: true },
    );
  }
  console.log(`    Analytics: seeded ${Object.keys(map).length} daily records`);
}

// ── Main ──────────────────────────────────────────────────────────────────
async function seed() {
  await connectDB();

  // Check for existing seed data
  const existing = await Patient.countDocuments({ createdBy: DEMO_USER_ID });
  if (existing > 0) {
    console.log(`\n⚠   Seed data already exists (${existing} patients found).`);
    console.log("    To re-seed, run:  npm run seed -- --force\n");
    if (!process.argv.includes("--force")) {
      await disconnectDB();
      return;
    }
    // Force re-seed: remove existing demo data
    await Patient.deleteMany({ createdBy: DEMO_USER_ID });
    await Scan.deleteMany({ analysedBy: DEMO_USER_ID });
    await Analytics.deleteMany({ clerkUserId: DEMO_USER_ID });
    console.log("  🗑   Cleared existing seed data.\n");
  }

  console.log("\n🌱  Seeding MammoAI Clinical database...\n");

  // ── Insert patients ──────────────────────────────────────────────────
  const patientDocs = await Patient.insertMany(
    PATIENTS.map((p) => ({ ...p, createdBy: DEMO_USER_ID })),
  );
  console.log(`    Patients: inserted ${patientDocs.length}`);

  // ── Generate scans across last 14 days ───────────────────────────────
  const scanDocs = [];
  const scanData = [];

  // Specific forced classifications for realistic distribution
  const schedule = [
    // [patientIndex, daysAgo, forceClass]
    [0, 0, "cancer"], // Sunita — today — cancer
    [1, 0, "non-cancer"], // Kavita — today
    [2, 1, "cancer"], // Meera — yesterday — cancer
    [3, 1, "non-cancer"],
    [4, 2, "cancer"],
    [5, 2, "non-cancer"],
    [6, 3, "non-cancer"],
    [7, 3, "cancer"],
    [0, 4, "non-cancer"], // Sunita — follow-up
    [1, 5, "cancer"],
    [2, 6, "non-cancer"],
    [3, 7, "non-cancer"],
    [4, 8, "cancer"],
    [5, 9, "non-cancer"],
    [6, 10, "non-cancer"],
    [7, 11, "cancer"],
    [0, 12, "non-cancer"],
    [2, 13, "cancer"],
    [4, 13, "non-cancer"],
    [6, 14, "cancer"],
  ];

  for (const [pi, daysAgo, cls] of schedule) {
    const s = makeScan(patientDocs[pi], daysAgo, cls);
    scanData.push(s);
  }

  // Use insertMany with timestamps override
  const inserted = await Scan.collection.insertMany(
    scanData.map((s) => ({ ...s, _id: new mongoose.Types.ObjectId() })),
  );
  console.log(
    `    Scans: inserted ${Object.keys(inserted.insertedIds).length}`,
  );

  // Update patient scan counts
  for (const doc of patientDocs) {
    const count = scanData.filter((s) => s.patientId.equals(doc._id)).length;
    await Patient.findByIdAndUpdate(doc._id, { scanCount: count });
  }

  // ── Seed analytics ────────────────────────────────────────────────────
  await seedAnalytics(scanData);

  console.log("\n  Seed complete!\n");
  console.log("  Dashboard will now show populated charts and tables.");
  console.log(`  Demo user ID: ${DEMO_USER_ID}`);
  console.log("  Note: to see seed data in the UI, temporarily set your Clerk");
  console.log('  user ID to "demo_clinician_001" in frontend .env, or update');
  console.log(
    "  DEMO_USER_ID in this script to match your actual Clerk user ID.\n",
  );

  await disconnectDB();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
