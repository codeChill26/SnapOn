<<<<<<< HEAD
import { Platform } from 'react-native';

const Config = {
  API_BASE_URL: Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api',
=======
const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_IP ?? '192.168.1.5';

const LOCAL_API_URL = `http://${LOCAL_IP}:3000/api`;
// 2. Link debug của Phúc (Phúc thay domain Render của Phúc vào đây nếu có)
const DEPLOYED_API_URL = 'https://snapon.onrender.com/api';

// 1. Link debug của bạn (Vừa deploy xong)
const MY_DEBUG_API_URL = 'https://snapon-debug.onrender.com/api';

const Config = {
  // =========================================================
  // ⚙️ CHỌN MÔI TRƯỜNG API ĐỂ CHẠY / BUILD APK
  // Lưu ý: Chỉ mở comment 1 dòng API_BASE_URL duy nhất bên dưới
  // =========================================================

  // [A] Mặc định: Chạy máy ảo local hoặc Build cho Production thật
  // API_BASE_URL: __DEV__ ? LOCAL_API_URL : DEPLOYED_API_URL,

  // [B] Môi trường của BẠN: Mở comment dòng này để build APK trỏ vào mây debug của bạn
  API_BASE_URL: MY_DEBUG_API_URL,

  // [C] Môi trường của PHÚC: Phúc mở comment dòng này và đóng dòng [B] lại để build APK của Phúc
  // API_BASE_URL: PHUC_DEBUG_API_URL,

  // =========================================================

  LOCAL_API_URL,
  DEPLOYED_API_URL,
  
  // EXPO_PROJECT_ID: 'ebcc55c8-278c-4ee0-aa61-7ade2a54e646',
  EXPO_PROJECT_ID: '242e7c6a-8b3c-4113-b78b-09d385d0a34f',
>>>>>>> backend/Deployment
  FIREBASE: {
    apiKey: 'AIzaSyDSZYTXmvclmiyQ3rCxPAh1e_EToXycFbQ',
    authDomain: 'hcm202-2d75e.firebaseapp.com',
    projectId: 'hcm202-2d75e',
    storageBucket: 'hcm202-2d75e.firebasestorage.app',
    messagingSenderId: '837187985882',
    appId: '1:837187985882:web:a2012ea4bbf3b3003660e3',
    // Đã thay thế mã bắt đầu bằng 8371...fhc4m8... (Web Client ID - Loại 3)
    webClientId: '837187985882-fhc4m8i1pjljd50le64p8q4nps03h942.apps.googleusercontent.com', 
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 50,
  },
  PLATFORM_FEE_RATE: 0.1,
  MATCHING_WEIGHTS: {
    PRICE: 0.30,
    RATING: 0.25,
    DISTANCE: 0.20,
    COMPLETION_RATE: 0.15,
    RESPONSE_TIME: 0.10,
  },
};

export default Config;