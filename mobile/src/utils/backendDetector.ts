import axios from 'axios';
import Constants from 'expo-constants';
import Config from '../constants/config';

const DEPLOYED_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://graceful-playfulness-production.up.railway.app/api';

// Extract Metro bundler host IP dynamically (e.g., "192.168.100.206:8081" -> "192.168.100.206")
const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
const LOCAL_IP = metroHost || process.env.EXPO_PUBLIC_LOCAL_IP || 'localhost';
const LOCAL_API_URL = `http://${LOCAL_IP}:3000/api`;

let detectedUrl: string | null = null;
let detectionPromise: Promise<string> | null = null;

/**
 * Tự động chọn backend:
 * Trong môi trường __DEV__, thử kết nối tới Local Backend (port 3000) trước.
 * Nếu Local Backend đang chạy -> tự động sử dụng Local Backend (IP: 192.168.x.x).
 * Nếu Local không phản hồi -> tự động sử dụng Deployed Backend trên Render.
 */
export function detectBackend(): Promise<string> {
  if (detectedUrl !== null) return Promise.resolve(detectedUrl as string);
  if (detectionPromise) return detectionPromise;

  if (!__DEV__) {
    detectedUrl = Config.API_BASE_URL || DEPLOYED_API_URL;
    Config.API_BASE_URL = detectedUrl;
    return Promise.resolve(detectedUrl as string);
  }

  detectionPromise = (async () => {
    // 1. Thử ping local backend
    try {
      await axios.get(`${LOCAL_API_URL}/health`, {
        timeout: 2000,
        validateStatus: () => true,
      });
      detectedUrl = LOCAL_API_URL;
      console.log('[Backend] ✅ Local Backend connected:', detectedUrl);
    } catch {
      // 2. Nếu local không khả dụng, sử dụng Deployed API
      detectedUrl = Config.API_BASE_URL || DEPLOYED_API_URL;
      console.log('[Backend] ☁️ Local unavailable, using Deployed Backend:', detectedUrl);
    }
    Config.API_BASE_URL = detectedUrl!;
    return detectedUrl!;
  })();

  return detectionPromise;
}

/**
 * Gửi ping đến backend ngay khi ứng dụng mở để kích hoạt Render.com cold start.
 */
export function warmUpBackend(): void {
  detectBackend()
    .then((baseUrl) => axios.get(`${baseUrl}/health`, {
      timeout: 60000,
      validateStatus: () => true,
    }))
    .then(() => console.log('[Backend] ☀️ Warm-up request completed'))
    .catch(() => {});
}

export function resetBackendDetection() {
  detectedUrl = null;
  detectionPromise = null;
}

