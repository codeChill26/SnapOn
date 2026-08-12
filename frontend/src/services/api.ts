import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { auth } from '../imports/firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://snapon-debug.onrender.com/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = localStorage.getItem('firebaseToken');

  // Attempt to get the latest valid token from Firebase SDK directly
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
      // Update local storage so other sync flows have the freshest token
      localStorage.setItem('firebaseToken', token);
    } catch (err) {
      console.warn('Could not refresh Firebase token in interceptor:', err);
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      if (!isAuthEndpoint) {
        console.warn('Unauthorized 401 from backend. Token might be expired.');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
