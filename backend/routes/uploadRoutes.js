import express from "express";
import { uploadCSV, analyzeData } from "../controllers/uploadController.js";
import { askAI } from "../controllers/aiController.js";

const router = express.Router();

router.post("/upload", uploadCSV);
router.post("/analyze", analyzeData);

// ✨ New Gemini 3.0 Pro Route
router.post("/ask-ai", askAI);

export default router;