import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { getToken, removeToken } from '../shared/utils/authStorage';

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: `${ENV.API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add JWT token to requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      // Clear stored token and redirect to login
      await removeToken();
      // Navigation will be handled by the app's auth context/navigation
    }

    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        isNetworkError: true,
      });
    }

    // Handle API errors with message
    const apiError = error.response.data as { message?: string; error?: string };
    return Promise.reject({
      message: apiError?.message || apiError?.error || 'An error occurred',
      statusCode: error.response.status,
      data: error.response.data,
    });
  }
);

// Helper function to handle API errors in components
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as { message: string }).message;
  }
  return 'An unexpected error occurred';
}
