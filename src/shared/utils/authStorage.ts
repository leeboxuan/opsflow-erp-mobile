import { createMMKV } from 'react-native-mmkv';

const TOKEN_KEY = 'opsflow_jwt_token';
const REFRESH_TOKEN_KEY = 'opsflow_refresh_token';
const EXPIRES_AT_KEY = 'opsflow_token_expires_at';
const USER_KEY = 'opsflow_user';
const DRIVER_MODE_KEY = 'opsflow_driver_mode';
const CURRENT_TENANT_ID_KEY = 'opsflow_current_tenant_id';

// Create MMKV storage instance
const storage = createMMKV({
  id: 'opsflow-auth-storage',
  encryptionKey: 'opsflow-auth-encryption-key',
});

export interface StoredUser {
  id: string;
  username: string;
  email?: string;
  role?: string;
  tenant?: string;
  tenantId?: string;
}

/**
 * Store JWT token using MMKV (synchronous)
 */
export function setToken(token: string): boolean {
  try {
    if (!token || typeof token !== 'string') {
      console.error('❌ setToken: Invalid token provided', { tokenType: typeof token });
      return false;
    }

    storage.set(TOKEN_KEY, token);
    console.log('✅ Token saved successfully to MMKV');
    return true;
  } catch (error) {
    console.error('❌ Failed to store token:', error);
    console.error('   Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

/**
 * Retrieve JWT token from MMKV (synchronous)
 */
export function getToken(): string | null {
  try {
    const token = storage.getString(TOKEN_KEY);
    if (token) {
      return token;
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to get token:', error);
    console.error('   Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Store refresh token (synchronous)
 */
export function setRefreshToken(refreshToken: string): boolean {
  try {
    if (!refreshToken || typeof refreshToken !== 'string') return false;
    storage.set(REFRESH_TOKEN_KEY, refreshToken);
    return true;
  } catch (error) {
    console.error('❌ Failed to store refresh token:', error);
    return false;
  }
}

/**
 * Get stored refresh token (synchronous)
 */
export function getRefreshToken(): string | null {
  try {
    return storage.getString(REFRESH_TOKEN_KEY) ?? null;
  } catch (error) {
    console.error('❌ Failed to get refresh token:', error);
    return null;
  }
}

/**
 * Store token expiry (synchronous).
 * Value: ISO date string or Unix seconds. Pass null to clear.
 */
export function setExpiresAt(expiresAt: number | string | null): void {
  try {
    if (expiresAt == null) {
      storage.remove(EXPIRES_AT_KEY);
      return;
    }
    storage.set(EXPIRES_AT_KEY, typeof expiresAt === 'number' ? String(expiresAt) : expiresAt);
  } catch (error) {
    console.error('❌ Failed to store expiresAt:', error);
  }
}

/**
 * Get stored token expiry as Unix seconds, or null.
 */
export function getExpiresAt(): number | null {
  try {
    const raw = storage.getString(EXPIRES_AT_KEY);
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    if (Number.isFinite(n)) return n <= 1e12 ? n : Math.floor(n / 1000); // assume ms if large
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
  } catch (error) {
    console.error('❌ Failed to get expiresAt:', error);
    return null;
  }
}

/**
 * Remove JWT and refresh tokens from MMKV (synchronous)
 */
export function clearToken(): void {
  try {
    storage.remove(TOKEN_KEY);
    storage.remove(REFRESH_TOKEN_KEY);
    storage.remove(EXPIRES_AT_KEY);
    console.log('✅ Tokens cleared from MMKV');
  } catch (error) {
    console.error('❌ Failed to clear token:', error);
    console.error('   Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Store user data in MMKV (synchronous)
 */
export function storeUser(user: StoredUser): boolean {
  try {
    if (!user || !user.id) {
      console.error('❌ storeUser: Invalid user data provided', { user });
      return false;
    }

    storage.set(USER_KEY, JSON.stringify(user));
    console.log('✅ User data saved successfully to MMKV', { userId: user.id });
    return true;
  } catch (error) {
    console.error('❌ Failed to store user:', error);
    console.error('   Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

/**
 * Get stored user data from MMKV (synchronous)
 */
export function getUser(): StoredUser | null {
  try {
    const userStr = storage.getString(USER_KEY);
    if (userStr) {
      const user = JSON.parse(userStr) as StoredUser;
      return user;
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to get user:', error);
    console.error('   Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Clear all stored auth data (synchronous)
 */
export function clearAuth(): void {
  try {
    clearToken();
    storage.remove(USER_KEY);
    clearCurrentTenantId();
    clearSelectedMode();
    console.log('✅ All auth data cleared from MMKV');
  } catch (error) {
    console.error('❌ Failed to clear auth data:', error);
    console.error('   Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

// Legacy async functions for backwards compatibility (now synchronous wrappers)
export async function storeToken(token: string): Promise<boolean> {
  return setToken(token);
}

export async function removeToken(): Promise<boolean> {
  clearToken();
  return true;
}

/**
 * Store selected mode preference (synchronous)
 * Mode: 'admin' | 'driver'
 */
export type SelectedMode = 'admin' | 'driver';

export function setSelectedMode(mode: SelectedMode): void {
  try {
    storage.set(DRIVER_MODE_KEY, mode);
    console.log(`✅ Selected mode set to: ${mode}`);
  } catch (error) {
    console.error('❌ Failed to set selected mode:', error);
  }
}

/**
 * Get selected mode preference (synchronous)
 * Returns 'admin' by default for admin users
 */
export function getSelectedMode(): SelectedMode {
  try {
    const mode = storage.getString(DRIVER_MODE_KEY);
    if (mode === 'admin' || mode === 'driver') {
      return mode;
    }
    return 'admin'; // Default to admin
  } catch (error) {
    console.error('❌ Failed to get selected mode:', error);
    return 'admin';
  }
}

/**
 * Clear selected mode preference (resets to admin)
 */
export function clearSelectedMode(): void {
  try {
    storage.remove(DRIVER_MODE_KEY);
  } catch (error) {
    console.error('❌ Failed to clear selected mode:', error);
  }
}

// Legacy functions for backwards compatibility
export function setDriverMode(enabled: boolean): void {
  setSelectedMode(enabled ? 'driver' : 'admin');
}

export function getDriverMode(): boolean {
  return getSelectedMode() === 'driver';
}

/**
 * Store current tenant ID (synchronous)
 */
export function setCurrentTenantId(tenantId: string): void {
  try {
    storage.set(CURRENT_TENANT_ID_KEY, tenantId);
    console.log(`✅ Current tenant ID saved: ${tenantId}`);
  } catch (error) {
    console.error('❌ Failed to set current tenant ID:', error);
  }
}

/**
 * Get current tenant ID (synchronous)
 */
export function getCurrentTenantId(): string | null {
  try {
    const tenantId = storage.getString(CURRENT_TENANT_ID_KEY);
    return tenantId || null;
  } catch (error) {
    console.error('❌ Failed to get current tenant ID:', error);
    return null;
  }
}

/**
 * Clear current tenant ID
 */
export function clearCurrentTenantId(): void {
  try {
    storage.remove(CURRENT_TENANT_ID_KEY);
  } catch (error) {
    console.error('❌ Failed to clear current tenant ID:', error);
  }
}

