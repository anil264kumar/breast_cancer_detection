/**
 * db/connection.js
 * ─────────────────────────────────────────────────────────
 * Manages the Mongoose connection to MongoDB.
 * Includes retry logic, connection events, and graceful shutdown.
 */

const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mammoai_clinical";

const OPTIONS = {
  serverSelectionTimeoutMS: 8000, // Give up initial connection after 8 s
  socketTimeoutMS: 45000, // Close sockets after 45 s of inactivity
  maxPoolSize: 10, // Maintain up to 10 socket connections
  family: 4, // Use IPv4, skip trying IPv6
};

let isConnected = false;

// ── Connection event listeners ──────────────────────────────────────────
mongoose.connection.on("connected", () => {
  isConnected = true;
  console.log(`[MongoDB]   Connected  →  ${sanitiseUri(MONGODB_URI)}`);
});

mongoose.connection.on("error", (err) => {
  isConnected = false;
  console.error("[MongoDB]   Error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("[MongoDB] ⚠   Disconnected");
});

// ── Connect ──────────────────────────────────────────────────────────────
async function connectDB() {
  if (isConnected) return;

  console.log("[MongoDB] Connecting to", sanitiseUri(MONGODB_URI), "...");
  await mongoose.connect(MONGODB_URI, OPTIONS);
}

// ── Disconnect (for graceful shutdown) ───────────────────────────────────
async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.connection.close();
  console.log("[MongoDB] Connection closed gracefully.");
}

// ── Status ────────────────────────────────────────────────────────────────
function getStatus() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return {
    state: states[mongoose.connection.readyState] || "unknown",
    ready: mongoose.connection.readyState === 1,
    host: mongoose.connection.host || null,
    port: mongoose.connection.port || null,
    dbName: mongoose.connection.name || null,
  };
}

// ── Hide password from logs ───────────────────────────────────────────────
function sanitiseUri(uri) {
  try {
    const u = new URL(uri);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return uri.replace(/:([^@/]+)@/, ":***@");
  }
}

// ── Graceful shutdown on process exit ─────────────────────────────────────
process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = { connectDB, disconnectDB, getStatus };
