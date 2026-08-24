import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

const apiURL = import.meta.env.VITE_API_URL || '/api';
let refreshPromise = null;

const isExamRoute = () => (
  typeof window !== 'undefined' && /^\/attempts\/[^/]+\/exam/.test(window.location.pathname)
);

const refreshSessionOnce = async () => {
  if (!refreshPromise) {
    refreshPromise = useAuthStore.getState().ensureFreshSession(300)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const api = axios.create({
  baseURL: apiURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Injects active JWT session tokens
api.interceptors.request.use(
  async (config) => {
    const authState = useAuthStore.getState();
    let token = authState.token;

    if (token) {
      const session = await authState.ensureFreshSession(120);
      token = session?.access_token || useAuthStore.getState().token;
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: refreshes expired JWTs before falling back to logout.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response ? error.response.status : null;
    const responseData = error.response?.data;
    const serverMessage = responseData && typeof responseData === 'object' ? responseData.message : null;
    const serverError = responseData && typeof responseData === 'object' ? responseData.error : null;
    const originalRequest = error.config;
    
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshedSession = await refreshSessionOnce();

      if (refreshedSession?.access_token) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${refreshedSession.access_token}`;
        return api(originalRequest);
      }

      if (!isExamRoute()) {
        console.warn('Session expired or unauthorized. Clearing session...');
        const { logout } = useAuthStore.getState();
        await logout();
      }
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
