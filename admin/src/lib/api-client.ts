import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '', // Browser-relative requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to parse standard API format
apiClient.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && typeof data === 'object' && 'success' in data) {
      if (data.success) {
        return response; // Return full response container
      } else {
        return Promise.reject(new Error(data.message || 'API request failed'));
      }
    }
    return response;
  },
  (error) => {
    const apiError = error.response?.data;
    if (apiError && typeof apiError === 'object' && 'message' in apiError) {
      return Promise.reject(new Error(apiError.message));
    }
    return Promise.reject(error);
  }
);
