import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { storage } from '../utils/storage';
import { detectBackend } from '../utils/backendDetector';

const api: AxiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.baseURL = await detectBackend();
    const token = await storage.getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

let onUnauthorizedCallback: (() => void) | null = null;
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setOnUnauthorized = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Guard: If it's not a 401 error or if the request was already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const isRefreshOrAuthRequest =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/sync-user') ||
      originalRequest.url?.includes('/auth/token-login') ||
      originalRequest.url?.includes('/auth/dev/login') ||
      originalRequest.url?.includes('/auth/verify-otp');

    if (isRefreshOrAuthRequest) {
      await storage.clearAll();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject: (err: any) => {
            reject(err);
          },
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call refresh token endpoint directly using basic axios to bypass interceptors
      const baseUrl = await detectBackend();
      const response = await axios.post<any>(
        `${baseUrl}/auth/refresh`,
        { refreshToken }
      );

      const { accessToken, refreshToken: newRefreshToken } = response.data;

      await storage.setToken(accessToken);
      await storage.setRefreshToken(newRefreshToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      processQueue(null, accessToken);
      isRefreshing = false;

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      isRefreshing = false;

      await storage.clearAll();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
