import axios from 'axios';
import { apiClient, getErrorMessage } from './client';
import { LoginRequest, LoginResponse } from './types';
import { setToken, setRefreshToken, setExpiresAt, getRefreshToken, storeUser, setCurrentTenantId } from '../shared/utils/authStorage';
import { ENV } from '../config/env';

/**
 * Login with email and password
 * Returns the JWT token and user data
 */
export async function login(
  credentials: LoginRequest
): Promise<{ user: any; token: string }> {
  try {
    console.log('🔐 Starting login process...');
    
    // Call login endpoint. Send both email and username so backends that expect
    // Passport's default "username" field (e.g. NestJS LocalStrategy) still work.
    const body = {
      email: credentials.email,
      username: credentials.email,
      password: credentials.password,
    };
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      body
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
    const refreshToken =
      (response.data as any).refresh_token ?? (response.data as any).refreshToken ?? null;

    if (!accessToken) {
      console.error('❌ No access token in response:', response.data);
      throw new Error('Login response missing access token');
    }

    console.log('💾 Storing token...');
    const tokenStored = setToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    const expiresAt = (response.data as { expires_at?: string | number; expiresAt?: string | number }).expires_at
      ?? (response.data as { expires_at?: string | number; expiresAt?: string | number }).expiresAt;
    if (expiresAt != null) setExpiresAt(expiresAt);

    if (!tokenStored) {
      console.error('❌ Failed to store token - setToken returned false');
      throw new Error('Failed to store authentication token');
    }

    console.log('✅ Token stored successfully');

    // Extract and store tenantId IMMEDIATELY from login response (before /auth/me)
    const loginUser = response.data.user;
    const data = response.data as any;
    // Extract from every possible shape the API might use
    const tenantId =
      loginUser?.tenantId ??
      loginUser?.tenant_id ??
      loginUser?.currentTenantId ??
      (Array.isArray(loginUser?.tenants) && loginUser.tenants[0]
        ? loginUser.tenants[0].tenantId ?? loginUser.tenants[0].tenant_id
        : null) ??
      data?.tenantId ??
      data?.tenant_id;

    if (tenantId) {
      console.log(`💾 Storing tenantId from login response: ${tenantId}`);
      setCurrentTenantId(tenantId);
      console.log('✅ TenantId stored successfully');
    } else {
      console.warn('⚠️ No tenantId in login response; /auth/me may require X-Tenant-Id');
    }

    // Store user data if provided (include normalized tenant and role for RBAC / restart)
    if (loginUser) {
      const userToStore = {
        ...loginUser,
        role: (loginUser as { role?: string }).role ?? (loginUser as { user_role?: string }).user_role,
        tenantId: tenantId ?? loginUser.tenantId ?? loginUser.tenant_id,
        currentTenantId: tenantId ?? loginUser.currentTenantId,
        tenants: loginUser.tenants ?? loginUser.tenant_list,
      };
      console.log('💾 Storing user data...');
      const userStored = storeUser(userToStore);
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

const cleanBaseUrl = ENV.API_BASE_URL.replace(/\/+$/, '').replace(/\/api$/, '');

/**
 * Refresh JWT token using stored refresh token.
 * Calls POST /auth/refresh with body { refreshToken } (no apiClient to avoid 401 interceptor).
 * Stores new access_token and optional refresh_token from response.
 */
export async function refreshToken(): Promise<string | null> {
  const stored = getRefreshToken();
  if (!stored) return null;

  try {
    const response = await axios.post<{
      access_token?: string;
      accessToken?: string;
      refresh_token?: string;
      refreshToken?: string;
      expires_at?: string | number;
      expiresAt?: string | number;
    }>(`${cleanBaseUrl}/api/auth/refresh`, { refreshToken: stored }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    const accessToken = response.data.access_token ?? response.data.accessToken ?? null;
    if (!accessToken) return null;

    setToken(accessToken);
    const newRefresh = response.data.refresh_token ?? response.data.refreshToken;
    if (newRefresh) setRefreshToken(newRefresh);
    const expiresAt = response.data.expires_at ?? response.data.expiresAt;
    if (expiresAt != null) setExpiresAt(expiresAt);
    return accessToken;
  } catch {
    return null;
  }
}
