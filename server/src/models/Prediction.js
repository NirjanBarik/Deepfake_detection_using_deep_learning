import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    sequenceLength: { type: Number, required: true },
    label: { type: String, enum: ['REAL', 'FAKE'], required: true },
    confidence: { type: Number, required: true },
    demoMode: { type: Boolean, default: true },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

export const Prediction = mongoose.model('Prediction', predictionSchema);
