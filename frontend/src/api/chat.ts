import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API 请求错误:', error);
    return Promise.reject(error);
  }
);

export function createSession(mode: string = 'chat') {
  return api.post('/chat/sessions', { mode });
}

export function getSessions() {
  return api.get('/chat/sessions');
}

export function deleteSession(id: number) {
  return api.delete(`/chat/sessions/${id}`);
}

export function getMessages(sessionId: number) {
  return api.get(`/chat/sessions/${sessionId}/messages`);
}

export function sendMessage(data: {
  sessionId: number;
  message: string;
  mode: string;
  params?: Record<string, any>;
}) {
  return api.post('/chat/message', data);
}