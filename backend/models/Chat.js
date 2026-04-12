import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true },
  messages: [{
    sender: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
});

export const Chat = mongoose.model('Chat', chatSchema);