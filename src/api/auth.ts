import { apiClient, getErrorMessage } from './client';
import { LoginRequest, LoginResponse } from './types';
import { storeToken, storeUser } from '../shared/utils/authStorage';

/**
 * Login with username and password
 * Returns the JWT token and user data
 */
export async function login(
  credentials: LoginRequest
): Promise<LoginResponse> {
  try {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      credentials
    );

    const { access_token, user } = response.data;

    // Store token securely
    await storeToken(access_token);

    // Store user data
    await storeUser(user);

    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Logout - clears stored auth data
 * Note: Backend logout endpoint may not be needed if token-based
 */
export async function logout(): Promise<void> {
  const { clearAuth } = await import('../shared/utils/authStorage');
  await clearAuth();
}

/**
 * Get current user profile (requires authentication)
 */
export async function getCurrentUser() {
  try {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Refresh JWT token (if refresh token is implemented)
 */
export async function refreshToken(): Promise<string | null> {
  try {
    const response = await apiClient.post<{ access_token: string }>(
      '/auth/refresh'
    );
    await storeToken(response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    // If refresh fails, return null to trigger re-login
    return null;
  }
}
