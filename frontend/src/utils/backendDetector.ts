import axios from 'axios';

const DEPLOYED_API_URL =
  import.meta.env.VITE_DEPLOYED_API_URL ||
  'https://graceful-playfulness-production.up.railway.app/api';

const PRIMARY_API_URL = import.meta.env.VITE_API_BASE_URL || DEPLOYED_API_URL;

// Chỉ những URL trỏ về máy local mới cần dò. URL tương đối (/api qua nginx)
// hoặc domain deploy thì dùng thẳng, không ping.
const isLocalUrl = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i.test(url);

let detectedUrl: string | null = null;
let detectionPromise: Promise<string> | null = null;

/** /api/health của SnapOn trả về { success: true, message: 'SnapOn API is running', ... } */
const isSnapOnBackend = (status: number, data: any): boolean =>
  status >= 200 && status < 300 && !!data && data.success === true;

/**
 * Tự động chọn backend:
 * Nếu cấu hình đang trỏ về Local Backend (port 3000) thì thử ping trước.
 * Nếu Local Backend đang chạy -> dùng Local Backend.
 * Nếu Local không phản hồi -> tự động chuyển sang Deployed Backend trên Railway.
 */
export function detectBackend(): Promise<string> {
  if (detectedUrl !== null) return Promise.resolve(detectedUrl);
  if (detectionPromise) return detectionPromise;

  if (!isLocalUrl(PRIMARY_API_URL)) {
    detectedUrl = PRIMARY_API_URL;
    return Promise.resolve(detectedUrl);
  }

  detectionPromise = (async () => {
    // 1. Thử ping local backend
    try {
      const res = await axios.get(`${PRIMARY_API_URL}/health`, {
        timeout: 2000,
        validateStatus: () => true,
      });
      // Port 3000 có thể đang bị service khác chiếm (container Docker cũ, Next.js dev...).
      // Chỉ chấp nhận khi đúng là SnapOn API, không chỉ dựa vào "có phản hồi HTTP".
      if (!isSnapOnBackend(res.status, res.data)) {
        throw new Error(`Not a SnapOn backend (status ${res.status})`);
      }
      detectedUrl = PRIMARY_API_URL;
      console.log('[Backend] ✅ Local Backend connected:', detectedUrl);
    } catch (err: any) {
      // 2. Nếu local không khả dụng, sử dụng Deployed API
      detectedUrl = DEPLOYED_API_URL;
      console.log(
        `[Backend] ☁️ Local unavailable (${err?.message ?? 'unreachable'}), using Deployed Backend:`,
        detectedUrl
      );
    }
    return detectedUrl;
  })();

  return detectionPromise;
}

export function resetBackendDetection(): void {
  detectedUrl = null;
  detectionPromise = null;
}
