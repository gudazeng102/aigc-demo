import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

export function createPreset(data: {
  name: string;
  description?: string;
  mode: string;
  prompt?: string;
  params: Record<string, any>;
}) {
  return api.post('/presets', data);
}

export function getPresets() {
  return api.get('/presets');
}

export function updatePreset(id: number, data: { name: string; description?: string }) {
  return api.put(`/presets/${id}`, data);
}

export function deletePreset(id: number) {
  return api.delete(`/presets/${id}`);
}