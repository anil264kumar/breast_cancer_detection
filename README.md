# MammoAI Clinical — Full-Stack Platform with MongoDB

> **Mini-Project I (7CS345) · Walchand College of Engineering, Sangli · AY 2025–26**
> Under the guidance of Ms. N.L. Mudegol · Department of Computer Science and Engineering

Clinical-grade AI breast cancer detection platform — React + Node.js + **MongoDB + Mongoose** + Clerk Auth.

---

## Tech Stack

| Layer        | Technology                                                   |
| ------------ | ------------------------------------------------------------ |
| Frontend     | React 18 · Vite · Tailwind CSS · Framer Motion · Recharts    |
| Auth         | Clerk (sign-in · sign-up · Google SSO · MFA)                 |
| Backend API  | Node.js · Express · Multer · Axios · Morgan · Joi            |
| **Database** | **MongoDB · Mongoose ODM · 3 schemas · indexes · analytics** |
| ML Service   | Python · TensorFlow/Keras · Flask (separate process)         |
| Dataset      | Mammogram Mastery · DOI: 10.17632/fvjhtskg93.1               |

---

## MongoDB Data Model

```
mammoai_clinical (database)
├── patients        — patient demographics, MRN, medical history
├── scans           — every mammogram analysis result (links to patient)
└── analytics       — pre-aggregated daily stats per clinician (powers charts)
```

### Collections at a glance

| Collection  | Key Fields                                                          |
| ----------- | ------------------------------------------------------------------- |
| `patients`  | name, mrn, age, gender, referralReason, medicalHistory, scanCount   |
| `scans`     | patientId, classification, probability, riskLevel, heatmap, metrics |
| `analytics` | clerkUserId, date (YYYY-MM-DD), totalScans, cancerCount, highRisk   |

---

## Prerequisites

| Tool    | Version     | Install from                           |
| ------- | ----------- | -------------------------------------- |
| Node.js | 18+ LTS     | https://nodejs.org                     |
| MongoDB | 7+ OR Atlas | https://mongodb.com (see Step 2 below) |

---

## SETUP — Complete Step-by-Step Guide

### Step 1 — Extract the ZIP

Unzip `mammoai_clinical.zip`. You will see:

```
mammoai_clinical/
├── frontend/        ← React app
├── backend/         ← Node.js + Express + MongoDB
├── ml_server.py     ← Python model bridge
└── README.md
```

---

### Step 2 — Set Up MongoDB (choose ONE option)

#### Option A — MongoDB Atlas (Cloud · Free · Recommended)

No installation needed. Works from anywhere.

1. Go to **https://cloud.mongodb.com** → Sign up free
2. Click **Build a Database** → choose **M0 Free** → pick any region → **Create**
3. **Username & Password**: create a database user (save these)
4. **Network Access**: click **Add IP Address** → choose **Allow Access from Anywhere** (for development)
5. Click **Connect** → **Drivers** → select **Node.js**
6. Copy the connection string — it looks like:
   ```
   mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Open `backend/.env` and set:
   ```
   MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/mammoai_clinical?retryWrites=true&w=majority
   ```

#### Option B — Local MongoDB (on your machine)

1. Download **MongoDB Community Server** from https://www.mongodb.com/try/download/community
2. Install it — on Windows, check the box to install as a Windows service
3. MongoDB starts automatically. Your connection string is already correct:
   ```
   MONGODB_URI=mongodb://localhost:27017/mammoai_clinical
   ```
   (This is the default in `backend/.env` — no change needed!)

Verify MongoDB is running:

```bash
# Windows — check Services for "MongoDB"
# Mac/Linux:
mongosh
# Should open MongoDB shell. Type 'exit' to close.
```

---

### Step 3 — Get Your Clerk Key (5 minutes · Free)

1. Go to **https://clerk.com** → Create free account
2. **Create application** → name it anything → enable Email + Google sign-in
3. Go to **API Keys** in the left sidebar
4. Copy your **Publishable Key** (starts with `pk__...`)
5. Open `frontend/.env` and paste:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk__YOUR_KEY_HERE
   ```

---

### Step 4 — Start the Backend

```bash
cd mammoai_clinical/backend

npm install          # ~30 seconds

npm run dbtest       # Verify MongoDB connection works ← RUN THIS FIRST

npm run dev          # Start backend on port 5000
```

Expected output:

```
[MongoDB]   Connected  →  mongodb://localhost:27017/mammoai_clinical

╔════════════════════════════════════════════════════╗
║    MammoAI Clinical — Backend API v3.0              ║
╚════════════════════════════════════════════════════╝

    Server     →  http://localhost:5000
    MongoDB    →  mongodb://localhost:27017
    ML Service →  http://localhost:8000
```

---

### Step 5 — Seed Demo Data (Optional but recommended)

Populates MongoDB with 8 realistic patients and 20 scan records across 14 days:

```bash
# In the backend folder (while server is running):
npm run seed
```

Output:

```
🌱  Seeding MammoAI Clinical database...

    Patients: inserted 8
    Scans: inserted 20
    Analytics: seeded 15 daily records

  Seed complete!
```

> **Note**: The seed uses a fixed demo user ID. After logging in with Clerk,
> your real analyses will appear alongside or instead of the seed data.

---

### Step 6 — Start the Frontend

Open a **second terminal**:

```bash
cd mammoai_clinical/frontend

npm install          # ~2 minutes

npm run dev          # Start frontend on port 3000
```

---

### Step 7 — Open the App

Go to **http://localhost:3000**

Sign up → Dashboard shows your MongoDB-backed data → Run analyses → See records persist!

---

## Connecting Your Python ML Model

By default, the app runs in **Demo Mode** (predictions simulated, clearly labelled).
Once you train your EfficientNetB0 model:

```bash
# Place ml_server.py next to your models/ folder
pip install flask flask-cors tensorflow opencv-python numpy
python ml_server.py
```

The backend auto-detects it and switches to live mode. Grad-CAM heatmaps are stored in MongoDB with each scan.

---

## API Reference

All endpoints require Clerk user headers (automatically sent by the frontend):

```
x-clerk-user-id:    user_xxxxx
x-clerk-user-email: doctor@hospital.com
x-clerk-user-name:  Dr. Priya Sharma
```

### Health

```
GET /api/health
→ { server, database: { state, ready, host, totalScans }, ml_service }
```

### Predict (POST)

```
POST /api/predict          multipart/form-data
Fields: file (image), patient_name, patient_mrn, patient_age, patient_gender, clinical_notes
→ Full scan result + saved to MongoDB automatically
```

### Scans (MongoDB CRUD)

```
GET    /api/scans                     ?page&limit&classification&riskLevel&search&sortBy&sortOrder
GET    /api/scans/stats               → { totals, daily[7] }
GET    /api/scans/:id                 → full scan with heatmap + patient info
PATCH  /api/scans/:id                 { reviewed, reviewNote, clinicalNotes }
DELETE /api/scans/:id                 soft delete
DELETE /api/scans                     soft delete all for this user
```

### Patients (MongoDB CRUD)

```
GET    /api/patients                  ?search&page&limit
POST   /api/patients                  { name, mrn, age, gender, ... }
GET    /api/patients/:id              → patient + recent 10 scans
PATCH  /api/patients/:id              update fields
DELETE /api/patients/:id              soft delete
```

---

## Database Scripts

```bash
npm run seed          # Insert demo patients + scans
npm run seed -- --force  # Clear and re-seed
npm run dbtest        # Test connection + print collection stats
```

---

## Project File Structure

```
mammoai_clinical/
├── backend/
│   ├── db/
│   │   └── connection.js         ← Mongoose connection + retry + graceful shutdown
│   ├── models/mongoose/
│   │   ├── Patient.js            ← Patient schema + indexes + virtuals
│   │   ├── Scan.js               ← Scan schema + heatmap field + normalisation
│   │   ├── Analytics.js          ← Daily pre-aggregated stats per user
│   │   └── index.js              ← Clean export point
│   ├── routes/
│   │   ├── predict.js            ← POST /api/predict → save to MongoDB
│   │   ├── scans.js              ← Full CRUD with pagination + filtering
│   │   ├── patients.js           ← Patient management
│   │   └── health.js             ← DB + ML server status
│   ├── middleware/
│   │   ├── upload.js             ← Multer: disk storage, type filter, size limit
│   │   └── validate.js           ← Joi validation schemas
│   ├── utils/
│   │   ├── mlService.js          ← Python model caller + demo fallback
│   │   └── analyticsHelper.js    ← Upserts daily stats, returns chart data
│   ├── scripts/
│   │   ├── seed.js               ← 8 patients + 20 scans + analytics
│   │   └── dbTest.js             ← Connection verification
│   ├── server.js                 ← Express app + MongoDB startup
│   └── .env                      ← MONGODB_URI, PORT, ML_SERVICE_URL
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   ← Public marketing page
│   │   │   ├── AuthPage.jsx      ← Clerk sign-in / sign-up
│   │   │   ├── DashboardPage.jsx ← Stats from MongoDB analytics collection
│   │   │   ├── AnalysisPage.jsx  ← Upload → predict → auto-save to MongoDB
│   │   │   ├── RecordsPage.jsx   ← Paginated, filtered MongoDB query
│   │   │   ├── ReportPage.jsx    ← Full report with inline note editing
│   │   │   └── SettingsPage.jsx  ← Theme · DB status · Clerk profile
│   │   ├── components/layout/
│   │   │   └── AppLayout.jsx     ← Sidebar + topbar + mobile drawer
│   │   ├── context/
│   │   │   └── ThemeContext.jsx  ← Dark / light theme persisted
│   │   ├── utils/
│   │   │   └── api.js            ← All API calls + Clerk header injection
│   │   └── main.jsx              ← Clerk + ClerkUserSync + ThemeProvider
│   └── .env                      ← VITE_CLERK_PUBLISHABLE_KEY
│
├── ml_server.py                  ← Flask bridge for trained .h5 model
└── README.md
```

---

## Troubleshooting

| Problem                        | Solution                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| `MongooseServerSelectionError` | MongoDB not running. Start `mongod` (local) or check Atlas URI         |
| `Atlas: IP not whitelisted`    | Atlas → Network Access → Add IP → Allow from anywhere                  |
| `npm install` fails            | `node --version` must be 18+                                           |
| Clerk sign-in blank            | Check `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env`                  |
| Records not persisting         | Check backend terminal — MongoDB must be connected                     |
| Demo mode always on            | Expected until `python ml_server.py` is running                        |
| Port conflicts                 | Change `PORT` in `backend/.env` or `--port` in frontend `package.json` |

---

## Team

| Name            | Roll No. |
| --------------- | -------- |
| Ayush Mane      | 23510008 |
| Anil Kumar      | 23510091 |
| Niharika Pasnur | 23510119 |

**Guide:** Ms. N.L. Mudegol · WCE Sangli · B.E. CSE

---

## Dataset Citation

> Aqdar, K.B. et al. (2024). _Mammogram Mastery: A Robust Dataset for Breast Cancer Detection._
> Mendeley Data, V1. https://doi.org/10.17632/fvjhtskg93.1

---

⚠ **For research and educational use only — not approved for clinical patient care.**
