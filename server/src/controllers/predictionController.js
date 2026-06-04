import { dbState } from '../config/db.js';
import { Prediction } from '../models/Prediction.js';
import { parseSequenceLength, runPrediction } from '../services/predictionService.js';

const memoryPredictions = [];

export async function createPrediction(request, response, next) {
  try {
    if (!request.file) {
      throw new Error('Please upload a video file.');
    }

    const sequenceLength = parseSequenceLength(request.body.sequenceLength);
    const prediction = await runPrediction({
      filePath: request.file.path,
      originalName: request.file.originalname,
      sequenceLength,
      predictorCommand: process.env.PYTHON_PREDICTOR
    });

    const record = {
      originalName: request.file.originalname,
      storedName: request.file.filename,
      fileUrl: `/uploads/${request.file.filename}`,
      mimeType: request.file.mimetype,
      size: request.file.size,
      sequenceLength,
      label: prediction.label,
      confidence: prediction.confidence,
      demoMode: prediction.demoMode,
      notes: prediction.notes,
      status: 'completed'
    };

    const saved = await saveRecord(record);
    response.status(201).json({ prediction: saved, database: dbState });
  } catch (error) {
    next(error);
  }
}

export async function listPredictions(_request, response, next) {
  try {
    if (dbState.connected) {
      const predictions = await Prediction.find().sort({ createdAt: -1 }).limit(25).lean();
      response.json({ predictions, database: dbState });
      return;
    }

    response.json({ predictions: [...memoryPredictions].reverse().slice(0, 25), database: dbState });
  } catch (error) {
    next(error);
  }
}

async function saveRecord(record) {
  if (dbState.connected) {
    return Prediction.create(record);
  }

  const saved = {
    ...record,
    _id: cryptoRandomId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  memoryPredictions.push(saved);
  return saved;
}

function cryptoRandomId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
