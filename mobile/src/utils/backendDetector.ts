import axios from 'axios';
import Config from '../constants/config';

let detectedUrl: string | null = null;
let detectionPromise: Promise<string> | null = null;

/**
 * Tự động chọn backend: thử local trước (2.5s timeout), fallback sang deployed.
 * Kết quả được cache lại — chỉ detect 1 lần duy nhất.
 */
export function detectBackend(): Promise<string> {
  if (detectedUrl !== null) return Promise.resolve(detectedUrl);
  if (detectionPromise) return detectionPromise;

  if (!__DEV__) {
    detectedUrl = Config.DEPLOYED_API_URL;
    Config.API_BASE_URL = detectedUrl;
    return Promise.resolve(detectedUrl);
  }

  detectionPromise = (async () => {
    try {
      await axios.get(`${Config.LOCAL_API_URL}/health`, {
        timeout: 2500,
        // Bỏ qua lỗi HTTP (401, 404...) — chỉ cần server phản hồi là được
        validateStatus: () => true,
      });
      detectedUrl = Config.LOCAL_API_URL;
      console.log('[Backend] ✅ Local:', detectedUrl);
    } catch {
      detectedUrl = Config.DEPLOYED_API_URL;
      console.log('[Backend] ☁️ Deployed:', detectedUrl);
    }
    Config.API_BASE_URL = detectedUrl!;
    return detectedUrl!;
  })();

  return detectionPromise;
}

/** Reset để detect lại (dùng khi debug) */
export function resetBackendDetection() {
  detectedUrl = null;
  detectionPromise = null;
}
