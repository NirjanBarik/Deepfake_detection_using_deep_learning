import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`
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
