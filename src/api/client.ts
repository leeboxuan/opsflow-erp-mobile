import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { getToken, clearToken } from '../shared/utils/authStorage';
import { getCurrentTenantId } from '../shared/utils/authStorage';

// Request log storage for diagnostics (in-memory, last 10 requests)
interface RequestLog {
  method: string;
  fullUrl: string;
  status?: number;
  error?: string;
  timestamp: number;
}

const requestLogs: RequestLog[] = [];
const MAX_LOGS = 10;

function addRequestLog(log: RequestLog) {
  requestLogs.unshift(log);
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.pop();
  }
}

export function getRequestLogs(): RequestLog[] {
  return [...requestLogs];
}

// Ensure ENV.API_BASE_URL doesn't have trailing slash or /api
const cleanBaseUrl = ENV.API_BASE_URL.replace(/\/+$/, '').replace(/\/api$/, '');

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: `${cleanBaseUrl}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log API configuration
console.log('🔧 API Configuration:');
console.log('  ENV.API_BASE_URL:', ENV.API_BASE_URL);
console.log('  Axios baseURL:', `${cleanBaseUrl}/api`);

// Request interceptor: Add JWT token and x-tenant-id header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // MMKV getToken is synchronous
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add x-tenant-id header if currentTenantId exists
    const tenantId = getCurrentTenantId();
    if (tenantId && config.headers) {
      config.headers['x-tenant-id'] = tenantId; // Exact header name: lowercase
    }

    // Construct full URL for logging
    const fullUrl = config.baseURL
      ? `${config.baseURL}${config.url || ''}`
      : config.url || '';

    // Log request to console with auth and tenant info
    const hasToken = !!token;
    const hasTenantId = !!tenantId;
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${fullUrl}`);
    console.log(`   Auth token present: ${hasToken}`);
    console.log(`   Tenant ID present: ${hasTenantId}${tenantId ? ` (${tenantId})` : ''}`);

    // Store log for diagnostics
    addRequestLog({
      method: config.method?.toUpperCase() || 'UNKNOWN',
      fullUrl,
      timestamp: Date.now(),
    });

    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors globally and log
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response
    const fullUrl = response.config.baseURL
      ? `${response.config.baseURL}${response.config.url || ''}`
      : response.config.url || '';
    console.log(
      `📥 API Response: ${response.config.method?.toUpperCase()} ${fullUrl} - Status: ${response.status}`
    );

    // Update log with status
    if (requestLogs.length > 0) {
      requestLogs[0].status = response.status;
    }

    return response;
  },
  async (error: AxiosError) => {
    const fullUrl = error.config?.baseURL
      ? `${error.config.baseURL}${error.config.url || ''}`
      : error.config?.url || '';
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

    // Log error to console
    if (error.response) {
      console.error(
        `❌ API Error: ${method} ${fullUrl} - Status: ${status} -`,
        error.response.data
      );
    } else {
      console.error(`❌ Network Error: ${method} ${fullUrl} -`, error.message);
    }

    // Update log with error
    if (requestLogs.length > 0) {
      requestLogs[0].status = status;
      requestLogs[0].error = error.message || 'Unknown error';
    }

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      // Clear stored token (synchronous)
      clearToken();
      // Navigation will be handled by the app's auth context/navigation
    }

    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        message:
          'Cannot reach API. Check Render URL / connectivity.',
        isNetworkError: true,
        originalError: error.message,
      });
    }

    // Handle 404 Not Found
    if (error.response.status === 404) {
      return Promise.reject({
        message:
          'Endpoint not found. Check API_BASE_URL and route prefix.',
        statusCode: 404,
        endpoint: fullUrl,
        isNotFound: true,
      });
    }

    // Handle 400 Bad Request - specifically for missing x-tenant-id header
    if (error.response.status === 400) {
      const apiError = error.response.data as { message?: string; error?: string };
      const errorMessage = apiError?.message || apiError?.error || '';
      
      // Check if error is about missing tenant ID
      if (errorMessage.toLowerCase().includes('x-tenant-id') || 
          errorMessage.toLowerCase().includes('tenant')) {
        return Promise.reject({
          message: 'No tenant selected. Please login again.',
          statusCode: 400,
          isTenantError: true,
          data: error.response.data,
        });
      }
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
