import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import itemRoutes from "./routes/items";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : "*";

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" })); // Increase payload size limit to 10MB
app.use(express.urlencoded({ limit: "10mb", extended: true })); // For URL-encoded payloads

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use("/api/items", itemRoutes);

// Serve the uploaded image
app.get('/', (req, res) => {
  res.send('Hello, welcome to the Frantry API!');
});

// Start the server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
