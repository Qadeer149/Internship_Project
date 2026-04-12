import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();

const app = express();

// ✨ Updated CORS Configuration
app.use(cors({
  origin: [
    "https://ai-dataanalysis.onrender.com", // Your Live Render Frontend
    "http://localhost:5173",                // Local Vite Frontend
    "http://localhost:3000"                 // Local React fallback
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log("📦 Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api", uploadRoutes);

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});