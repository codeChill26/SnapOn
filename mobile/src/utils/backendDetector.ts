import axios from 'axios';
import Config from '../constants/config';

const DEPLOYED_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://snapon-debug.onrender.com/api';
const LOCAL_API_URL = `http://${process.env.EXPO_PUBLIC_LOCAL_IP || 'localhost'}:3000/api`;

let detectedUrl: string | null = null;
let detectionPromise: Promise<string> | null = null;

/**
 * Tự động chọn backend: thử local trước (2.5s timeout), fallback sang deployed.
 * Kết quả được cache lại — chỉ detect 1 lần duy nhất.
 */
export function detectBackend(): Promise<string> {
  if (detectedUrl !== null) return Promise.resolve(detectedUrl as string);
  if (detectionPromise) return detectionPromise;

  const configuredUrl = Config.API_BASE_URL || DEPLOYED_API_URL;

  if (!__DEV__) {
    detectedUrl = configuredUrl;
    Config.API_BASE_URL = detectedUrl;
    return Promise.resolve(detectedUrl as string);
  }

  if (configuredUrl !== LOCAL_API_URL) {
    detectedUrl = configuredUrl;
    Config.API_BASE_URL = detectedUrl;
    console.log('[Backend] Configured:', detectedUrl);
    return Promise.resolve(detectedUrl as string);
  }

  detectionPromise = (async () => {
    try {
      await axios.get(`${LOCAL_API_URL}/health`, {
        timeout: 2500,
        // Bỏ qua lỗi HTTP (401, 404...) — chỉ cần server phản hồi là được
        validateStatus: () => true,
      });
      detectedUrl = LOCAL_API_URL;
      console.log('[Backend] ✅ Local:', detectedUrl);
    } catch {
      detectedUrl = DEPLOYED_API_URL;
      console.log('[Backend] ☁️ Deployed:', detectedUrl);
    }
    Config.API_BASE_URL = detectedUrl!;
    return detectedUrl!;
  })();

  return detectionPromise;
}

/**
 * Gửi ping đến deployed backend ngay khi app khởi động để wake up Render.com cold start.
 * Fire-and-forget — không block gì cả.
 * Gọi hàm này càng sớm càng tốt (App.tsx useEffect).
 */
export function warmUpBackend(): void {
  detectBackend()
    .then((baseUrl) => axios.get(`${baseUrl}/health`, {
      timeout: 60000,
      validateStatus: () => true,
    }))
    .then(() => console.log('[Backend] ☀️ Warm-up done'))
    .catch(() => {});
}

/** Reset để detect lại (dùng khi debug) */
export function resetBackendDetection() {
  detectedUrl = null;
  detectionPromise = null;
}
