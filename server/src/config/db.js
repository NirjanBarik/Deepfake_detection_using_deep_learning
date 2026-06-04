import mongoose from 'mongoose';

export const dbState = {
  connected: false,
  message: 'MongoDB not configured. Using in-memory history for this session.'
};

export async function connectDatabase(uri) {
  if (!uri) {
    return dbState;
  }

  try {
    await mongoose.connect(uri);
    dbState.connected = true;
    dbState.message = 'MongoDB connected';
  } catch (error) {
    dbState.connected = false;
    dbState.message = `MongoDB unavailable. Using in-memory history. ${error.message}`;
  }

  return dbState;
}
