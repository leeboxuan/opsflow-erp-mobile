import { apiClient, getErrorMessage } from './client';
import { LoginRequest, LoginResponse } from './types';
import { setToken, storeUser, setCurrentTenantId } from '../shared/utils/authStorage';

/**
 * Login with email and password
 * Returns the JWT token and user data
 */
export async function login(
  credentials: LoginRequest
): Promise<{ user: any; token: string }> {
  try {
    console.log('🔐 Starting login process...');
    
    // Call login endpoint
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      credentials
    );

    console.log('📦 Login response received:', {
      hasAccessToken: !!response.data.access_token,
      hasUser: !!response.data.user,
    });

    // Handle both accessToken (camelCase) and access_token (snake_case)
    const accessToken =
      response.data.access_token ||
      (response.data as any).accessToken ||
      null;

    if (!accessToken) {
      console.error('❌ No access token in response:', response.data);
      throw new Error('Login response missing access token');
    }

    console.log('💾 Storing token...');
    // Store token (synchronous with MMKV)
    const tokenStored = setToken(accessToken);
    
    if (!tokenStored) {
      console.error('❌ Failed to store token - setToken returned false');
      throw new Error('Failed to store authentication token');
    }

    console.log('✅ Token stored successfully');

    // Extract and store tenantId IMMEDIATELY from login response (before /auth/me)
    const loginUser = response.data.user;
    // Support both camelCase and snake_case
    const tenantId = loginUser?.tenantId || (loginUser as any)?.tenant_id;
    
    if (tenantId) {
      console.log(`💾 Storing tenantId from login response: ${tenantId}`);
      setCurrentTenantId(tenantId);
      console.log('✅ TenantId stored successfully');
    } else {
      console.warn('⚠️ No tenantId in login response, will try /auth/me');
    }

    // Store user data if provided
    if (loginUser) {
      console.log('💾 Storing user data...');
      const userStored = storeUser(loginUser);
      if (!userStored) {
        console.warn('⚠️ Failed to store user data, but continuing...');
      } else {
        console.log('✅ User data stored successfully');
      }
    }

    // Call /auth/me to verify token and get full user profile
    // NOTE: tenantId is already set above, so interceptor will include x-tenant-id header
    console.log('🔍 Fetching user profile from /auth/me...');
    try {
      const userResponse = await apiClient.get('/auth/me');
      const fullUser = userResponse.data;

      console.log('✅ User profile fetched successfully:', {
        userId: fullUser?.id || fullUser?.user?.id,
      });

      return {
        user: fullUser.user || fullUser,
        token: accessToken,
      };
    } catch (meError) {
      console.warn('⚠️ /auth/me failed, but login succeeded:', getErrorMessage(meError));
      // Return with user from login response if /auth/me fails
      return {
        user: response.data.user,
        token: accessToken,
      };
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    const errorMessage = getErrorMessage(error);
    throw new Error(errorMessage);
  }
}

/**
 * Logout - clears stored auth data
 */
export async function logout(): Promise<void> {
  console.log('🚪 Logging out...');
  const { clearAuth } = await import('../shared/utils/authStorage');
  clearAuth();
  console.log('✅ Logout complete');
}

/**
 * Get current user profile (requires authentication)
 */
export async function getCurrentUser() {
  try {
    const response = await apiClient.get('/auth/me');
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
    const accessToken =
      response.data.access_token || (response.data as any).accessToken;
    if (accessToken) {
      setToken(accessToken);
      return accessToken;
    }
    return null;
  } catch {
    // If refresh fails, return null to trigger re-login
    return null;
  }
}
