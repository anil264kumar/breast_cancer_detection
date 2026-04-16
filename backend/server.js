/**
 * server.js — MammoAI Clinical Backend v3.0
 * Node.js + Express + MongoDB (Mongoose)
 */

require("dotenv").config();
require("express-async-errors"); // Makes async route errors flow to error handler

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const { connectDB } = require("./db/connection");

// ── Routes ────────────────────────────────────────────────────────────────
const healthRouter = require("./routes/health");
const predictRouter = require("./routes/predict");
const scansRouter = require("./routes/scans");
const patientsRouter = require("./routes/patients");

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// ── Uploads directory ─────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Security ──────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// ── CORS ──────────────────────────────────────────────────────────────────
const allowed = new Set([
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
]);
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowed.has(origin)
        ? cb(null, true)
        : cb(new Error(`CORS blocked: ${origin}`)),
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-clerk-user-id",
      "x-clerk-user-email",
      "x-clerk-user-name",
    ],
    credentials: true,
  }),
);

// ── Body parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ── Logger ────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Static uploads ────────────────────────────────────────────────────────
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Rate limiting ─────────────────────────────────────────────────────────
app.use(
  "/api/predict",
  rateLimit({
    windowMs: 60_000,
    max: 30,
    message: { error: "Too many prediction requests. Please wait a moment." },
  }),
);

// ── Routes ────────────────────────────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/predict", predictRouter);
app.use("/api/scans", scansRouter);
app.use("/api/patients", patientsRouter);

// ── Root info ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) =>
  res.json({
    name: "MammoAI Clinical API",
    version: "3.0.0",
    stack: "Node.js + Express + MongoDB (Mongoose)",
    endpoints: {
      health: "GET    /api/health",
      predict: "POST   /api/predict         (multipart: file)",
      scansList:
        "GET    /api/scans            (?page&limit&classification&riskLevel)",
      scanStats: "GET    /api/scans/stats",
      scanDetail: "GET    /api/scans/:id",
      scanUpdate: "PATCH  /api/scans/:id",
      scanDelete: "DELETE /api/scans/:id",
      scansDeleteAll: "DELETE /api/scans",
      patientList: "GET    /api/patients",
      patientCreate: "POST   /api/patients",
      patientDetail: "GET    /api/patients/:id",
      patientUpdate: "PATCH  /api/patients/:id",
      patientDelete: "DELETE /api/patients/:id",
    },
  }),
);

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found." }));

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Error]", err.message);
  const status = err.status || (err.name === "ValidationError" ? 400 : 500);
  res.status(status).json({
    error: err.message || "Internal server error.",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────
(async () => {
  try {
    await connectDB(); // Connect to MongoDB first
    app.listen(PORT, () => {
      console.log("\n╔════════════════════════════════════════════════════╗");
      console.log("║    MammoAI Clinical — Backend API v3.0              ║");
      console.log("╚════════════════════════════════════════════════════╝");
      console.log(`\n    Server     →  http://localhost:${PORT}`);
      console.log(
        `    MongoDB    →  ${process.env.MONGODB_URI?.replace(/:([^@/]+)@/, ":***@") || "localhost:27017"}`,
      );
      console.log(
        `    ML Service →  ${process.env.ML_SERVICE_URL || "http://localhost:8000"}`,
      );
      console.log(`    Uploads    →  ${UPLOADS_DIR}`);
      console.log(
        `    Env        →  ${process.env.NODE_ENV || "development"}\n`,
      );
    });
  } catch (err) {
    console.error("[Startup] Failed to connect to MongoDB:", err.message);
    console.error("\n  ➜  Check your MONGODB_URI in backend/.env");
    console.error("  ➜  For local: make sure MongoDB is running (mongod)");
    console.error(
      "  ➜  For Atlas: check your connection string and whitelist your IP\n",
    );
    process.exit(1);
  }
})();

module.exports = app;
