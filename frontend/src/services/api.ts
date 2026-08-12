import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { detectBackend } from '../utils/backendDetector';

const api: AxiosInstance = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let cachedBaseURL: string | null = null;

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (!cachedBaseURL) {
    cachedBaseURL = await detectBackend();
  }
  config.baseURL = cachedBaseURL;
  const token = localStorage.getItem('firebaseToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('firebaseToken');
    }
    return Promise.reject(error);
  }
);

export default api;
