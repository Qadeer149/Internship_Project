import multer from "multer";
import Papa from "papaparse";
import { Dataset } from "../models/Dataset.js";
import { Chat } from "../models/Chat.js";

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("file");

// We still keep the in-memory array for quick access so we don't break existing functionality,
// but we will also persist it to MongoDB so we can fetch it after a server restart!
let storedData = []; 
let currentDatasetId = null;

// ✨ Getter for our AI array
export const getStoredData = async () => {
   // If the server restarted and memory is empty, let's pull the last dataset from MongoDB!
   if (storedData.length === 0) {
      const lastDataset = await Dataset.findOne().sort({ uploadedAt: -1 });
      if (lastDataset) storedData = lastDataset.data;
   }
   return storedData;
};

export const uploadCSV = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    const csvData = req.file.buffer.toString();

    const parsed = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    storedData = parsed.data;

    try {
      // 💾 Persistent Storage into MongoDB!
      const newDataset = await Dataset.create({
        filename: req.file.originalname,
        data: storedData
      });
      
      currentDatasetId = newDataset._id;
      
      // Clear out the old chat history when a fresh CSV uploads
      await Chat.create({
        datasetId: newDataset._id,
        messages: [{ sender: 'ai', text: 'Data uploaded successfully! Ask me anything about it in plain English.' }]
      });

      res.json({ data: storedData, datasetId: newDataset._id });
    } catch (dbErr) {
      console.error("DB Error:", dbErr);
      res.status(500).json({ error: "Saved to memory, but failed to persist to MongoDB." });
    }
  });
};

// NEW API → Process Data
export const analyzeData = (req, res) => {
  const { type, groupField, valueField, limit } = req.body;

  let result = [];

  if (type === "group") {
    result = groupBySum(storedData, groupField, valueField);
  }

  if (type === "top") {
    result = getTopN(storedData, valueField, limit);
  }

  res.json({ result });
};