import axios from 'axios';
import { useStore } from '@/store/useStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to dynamically inject token and active company ID
api.interceptors.request.use(
  (config) => {
    // Get state from Zustand store directly
    const state = useStore.getState();

    if (state.token) {
      config.headers['Authorization'] = `Bearer ${state.token}`;
    }

    if (state.activeCompany) {
      config.headers['x-company-id'] = state.activeCompany.id;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors (like token expirations)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle unauthorized access (expired token)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // In a full refresh flow, we'd trigger a token refresh endpoint here.
      // For simplicity in the MVP, we will log out on 401 if refresh fails or is ignored.
      // useStore.getState().logout();
    }

    return Promise.reject(error);
  }
);

export default api;
