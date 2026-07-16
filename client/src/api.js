import axios from 'axios';

// In local dev (VITE_API_URL is empty), use a relative base URL '/api'
// so Vite's dev proxy forwards requests to http://127.0.0.1:5000.
// In production (VITE_API_URL is set), use the full remote URL.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
});

export async function fetchHealth() {
  const { data } = await api.get('/health');
  return data;
}

export async function fetchPredictions() {
  const { data } = await api.get('/predictions');
  return data;
}

export async function uploadPrediction({ file, sequenceLength }) {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('sequenceLength', sequenceLength);

  const { data } = await api.post('/predictions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
