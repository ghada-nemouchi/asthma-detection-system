import axios from 'axios';
import { getToken, removeToken } from '../utils/storage';

const API_URL = 'http://192.168.100.5:5000/api'; // Change to your computer's IP for phone testing

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken();
      // Navigate to login – handled in screen
    }
    return Promise.reject(error);
  }
);

export default api;