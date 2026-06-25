
const LOCAL_API_URL = 'http://192.168.1.3:3000/api';
const DEPLOYED_API_URL = 'https://snapon-1.onrender.com/api';

const Config = {
  API_BASE_URL: __DEV__ ? LOCAL_API_URL : DEPLOYED_API_URL,
  LOCAL_API_URL,
  DEPLOYED_API_URL,
  EXPO_PROJECT_ID: 'ebcc55c8-278c-4ee0-aa61-7ade2a54e646',
  FIREBASE: {
    apiKey: 'AIzaSyDSZYTXmvclmiyQ3rCxPAh1e_EToXycFbQ',
    authDomain: 'hcm202-2d75e.firebaseapp.com',
    projectId: 'hcm202-2d75e',
    storageBucket: 'hcm202-2d75e.firebasestorage.app',
    messagingSenderId: '837187985882',
    appId: '1:837187985882:web:a2012ea4bbf3b3003660e3',
    webClientId: 'webClientId477307811776-7f6ptpobvega67l3cd6ghin732dntka2.apps.googleusercontent.com', // Thay thế bằng Web Client ID thật từ Google Console của bạn
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
