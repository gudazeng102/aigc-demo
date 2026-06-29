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

export interface CreateTaskPayload {
  content: string;
  type: 'image' | 'video';
  platform?: string;
  model?: string;
  resolution?: string;
  ratio?: string;
  duration?: number;
  imageUrl?: string;
  endImageUrl?: string;
  generateAudio?: boolean;
  draft?: boolean;
}

export const createTask = (payload: CreateTaskPayload) => {
  return api.post('/tasks', {
    platform: 'jimeng',
    ...payload
  }, {
    timeout: 120000, // 请求体可能很大（base64图片），超时放宽到120秒
    headers: { 'Content-Type': 'application/json' }
  });
};

export const getTasks = () => {
  return api.get('/tasks');
};

export const getTaskById = (id: number) => {
  return api.get(`/tasks/${id}`);
};

export const deleteTask = (id: number) => {
  return api.delete(`/tasks/${id}`);
};
