import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const CONFIGURED_API_URL = import.meta.env.VITE_API_BASE_URL;
const DEPLOYED_API_URL =
  import.meta.env.VITE_DEPLOYED_API_URL ||
  'https://graceful-playfulness-production.up.railway.app/api';

let resolvedBaseUrl: string | null = null;
let detectionPromise: Promise<string> | null = null;

/**
 * Chọn backend tự động (giống mobile/src/utils/backendDetector.ts):
 * - Dev: ping backend local trước; không phản hồi thì rơi về backend đã deploy
 *   để app vẫn dùng được khi quên bật `npm run dev` ở backend.
 * - Production: dùng thẳng VITE_API_BASE_URL — không có backend local để dò,
 *   probe chỉ tổ thêm độ trễ.
 */
export function detectBackend(): Promise<string> {
  if (resolvedBaseUrl) return Promise.resolve(resolvedBaseUrl);
  if (detectionPromise) return detectionPromise;

  if (!import.meta.env.DEV) {
    resolvedBaseUrl = CONFIGURED_API_URL || DEPLOYED_API_URL;
    return Promise.resolve(resolvedBaseUrl);
  }

  const localUrl = CONFIGURED_API_URL || 'http://localhost:3000/api';
  const pending = (async () => {
    try {
      // Dùng axios trần: instance `api` bên dưới có interceptor sẽ gọi lại chính hàm này.
      // validateStatus: mọi phản hồi HTTP đều tính là "backend còn sống".
      await axios.get(`${localUrl}/health`, { timeout: 2000, validateStatus: () => true });
      resolvedBaseUrl = localUrl;
      console.log('[Backend] ✅ Dùng backend local:', resolvedBaseUrl);
    } catch {
      resolvedBaseUrl = DEPLOYED_API_URL;
      console.warn('[Backend] ☁️ Backend local không phản hồi — chuyển sang backend deploy:', resolvedBaseUrl);
    }
    detectionPromise = null;
    return resolvedBaseUrl as string;
  })();

  detectionPromise = pending;
  return pending;
}

/** Quên kết quả dò, lần gọi kế tiếp sẽ dò lại từ đầu. */
export function resetBackendDetection(): void {
  resolvedBaseUrl = null;
  detectionPromise = null;
}

const api: AxiosInstance = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  config.baseURL = await detectBackend();

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
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('firebaseToken');
    }

    // Không có response nào = backend đang chọn đã biến mất giữa chừng
    // (ví dụ tắt server local sau khi đã dò xong). Dò lại rồi thử lại đúng 1 lần
    // để request rơi được sang backend deploy thay vì ném "Network Error".
    const config = error.config as (InternalAxiosRequestConfig & { _rerouted?: boolean }) | undefined;
    if (import.meta.env.DEV && !error.response && config && !config._rerouted) {
      config._rerouted = true;
      resetBackendDetection();
      return api.request(config);
    }

    return Promise.reject(error);
  }
);

export default api;
