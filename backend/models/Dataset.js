import mongoose from 'mongoose';

const datasetSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  data: { type: Array, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

export const Dataset = mongoose.model('Dataset', datasetSchema);