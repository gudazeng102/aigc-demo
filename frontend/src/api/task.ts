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

export const createTask = (
  content: string,
  type: string = 'image',
  platform: string = 'volcano'
) => {
  return api.post('/tasks', { content, type, platform });
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
