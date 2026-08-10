import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // sync-user carries a fresh token in its body; a stale stored token
  // in the Authorization header would override it and cause 401s.
  const isSyncUser = config.url?.includes('/auth/sync-user');
  const token = localStorage.getItem('firebaseToken');
  if (token && !isSyncUser) {
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
