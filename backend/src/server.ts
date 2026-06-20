import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import itemRoutes from "./routes/items";
import path from "path";
import fs from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";

dotenv.config();

// TODO: [FIREBASE SETUP] Configure Firebase Admin SDK with one of these two approaches:
//
// OPTION A — Local development (service account JSON file):
//   1. Firebase Console → Project Settings → Service accounts → Generate new private key
//   2. Place the downloaded JSON at: backend/serviceAccountKey.json
//   3. Ensure "serviceAccountKey.json" is in backend/.gitignore (never commit credentials)
//
// OPTION B — Production / Railway (individual environment variables):
//   Set these in your Railway dashboard under Variables:
//     FIREBASE_PROJECT_ID   = your-project-id
//     FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
//     FIREBASE_PRIVATE_KEY  = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//
// Without either option, all API requests will return 401 Unauthorized.

if (getApps().length === 0) {
  const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");

  if (fs.existsSync(serviceAccountPath)) {
    initializeApp({ credential: cert(require(serviceAccountPath)) });
    console.log("🔑 Firebase Admin initialized from serviceAccountKey.json");
  } else if (process.env.FIREBASE_PROJECT_ID) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
        // Railway/Vercel store \n as literal \\n in env vars — this fixes it
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") as string,
      }),
    });
    console.log("🔑 Firebase Admin initialized from environment variables");
  } else {
    console.warn("⚠️  Firebase Admin not configured — all authenticated routes will return 401");
    console.warn("   See backend/src/server.ts for setup instructions");
    initializeApp();
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : "*";

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/api/items", itemRoutes);

app.get("/", (_req, res) => {
  res.send("Hello, welcome to the Frantry API!");
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
