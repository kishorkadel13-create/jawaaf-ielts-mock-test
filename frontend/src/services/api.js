import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

const apiURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: apiURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Injects active JWT session tokens
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Standardizes error actions (auto-logout on token expiration)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const responseData = error.response?.data;
    const serverMessage = responseData && typeof responseData === 'object' ? responseData.message : null;
    const serverError = responseData && typeof responseData === 'object' ? responseData.error : null;
    
    if (status === 401) {
      console.warn('Session expired or unauthorized. Clearing session...');
      // Quietly log out in case of token expiration
      const { logout } = useAuthStore.getState();
      logout();
    }
    
    // Normalize server error responses
    const errorData = {
      status,
      message: serverMessage || error.message || 'An unexpected networking error occurred.',
      error: serverError || (status ? `HTTP_${status}` : 'NetworkError'),
      details: responseData && typeof responseData === 'object' ? responseData.details || null : responseData || null
    };

    return Promise.reject(errorData);
  }
);

export default api;
