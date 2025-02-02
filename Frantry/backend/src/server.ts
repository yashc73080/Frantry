import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import itemRoutes from "./routes/items";
import path from "path";
import fs from "fs";
import multer from "multer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();

// Middleware
app.use(cors({
  origin: "*", // Allow all origins (replace with your frontend URL in production)
  methods: ["GET", "POST", "PUT", "DELETE"], // Allow specific HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
}));
app.use(express.json({ limit: "10mb" })); // Increase payload size limit to 10MB
app.use(express.urlencoded({ limit: "10mb", extended: true })); // For URL-encoded payloads

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Save the file in the "uploads" directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Name the file based on the current timestamp
  },
});

const upload = multer({ storage: storage });

// Routes
app.use("/api/items", itemRoutes);

// Image upload endpoint
app.post("items/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
  }
  else {
    res.json({ message: "Image uploaded successfully", filePath: `/uploads/${req.file.filename}` });

  }

  // Respond with the file's path or URL (you can customize this)
})

// Serve the uploaded image
app.get("/image/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Image not found" });
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start the server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
