import { apiClient, getErrorMessage } from './client';

/**
 * Health check endpoint to test API connectivity
 */
export async function checkHealth(): Promise<{
  success: boolean;
  status?: number;
  message: string;
  data?: unknown;
}> {
  try {
    const response = await apiClient.get('/health');
    return {
      success: true,
      status: response.status,
      message: 'Health check successful',
      data: response.data,
    };
  } catch (error: unknown) {
    const errorObj = error as { statusCode?: number; message?: string };
    return {
      success: false,
      status: errorObj.statusCode,
      message: getErrorMessage(error),
    };
  }
}
