import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('firebaseToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const appUserStr = localStorage.getItem('appUser');
  if (appUserStr) {
    try {
      const appUser = JSON.parse(appUserStr);
      if (appUser.id) {
        config.headers['x-user-id'] = appUser.id;
      }
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('firebaseToken');
      localStorage.removeItem('appUser');
    }
    return Promise.reject(error);
  }
);

export default api;
