import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, TenantMembership } from '../../api/types';
import { getCurrentUser } from '../../api/auth';
import { getUser, storeUser } from '../utils/authStorage';
import { getToken } from '../utils/authStorage';
import { getCurrentTenantId, setCurrentTenantId } from '../utils/authStorage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  currentTenantId: string | null;
  setUser: (user: User | null) => void;
  setCurrentTenantId: (tenantId: string | null) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentTenantId, setCurrentTenantIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = getToken();
      if (!token) {
        setUser(null);
        setCurrentTenantIdState(null);
        setLoading(false);
        return;
      }

      // Ensure tenantId is set in storage before calling /auth/me
      // If not in storage, try to get from current user state
      let storedTenantId = getCurrentTenantId();
      if (!storedTenantId && user?.tenantId) {
        setCurrentTenantId(user.tenantId);
        storedTenantId = user.tenantId;
      }

      // Try to get user from API (headers are already set via interceptor)
      const apiUser = await getCurrentUser();
      const userData = apiUser.user || apiUser;

      // Extract tenant ID from response
      let extractedTenantId: string | null = null;

      // If user has tenants array (multiple tenants)
      if (userData.tenants && Array.isArray(userData.tenants) && userData.tenants.length > 0) {
        // Find first active membership, or use first one
        const activeTenant =
          userData.tenants.find((t: TenantMembership) => t.isActive !== false) ||
          userData.tenants[0];
        extractedTenantId = activeTenant.tenantId;
      } else if (userData.tenantId) {
        // Single tenant ID
        extractedTenantId = userData.tenantId;
      } else if (userData.currentTenantId) {
        // Current tenant ID field
        extractedTenantId = userData.currentTenantId;
      }

      // Use stored tenant ID if not in response
      if (!extractedTenantId) {
        extractedTenantId = getCurrentTenantId();
      }

      // Store tenant ID if found
      if (extractedTenantId) {
        setCurrentTenantId(extractedTenantId);
        setCurrentTenantIdState(extractedTenantId);
        console.log(`✅ Current tenant ID: ${extractedTenantId}`);
      } else {
        console.warn('⚠️ No tenant ID found in user data');
        // Don't clear existing tenant ID if response doesn't have it
        const existingTenantId = getCurrentTenantId();
        if (existingTenantId) {
          setCurrentTenantIdState(existingTenantId);
        }
      }

      // Store user data
      if (userData) {
        const storedUser = {
          id: userData.id,
          username: userData.username || userData.email,
          email: userData.email,
          role: userData.role,
          tenant: userData.tenant,
          tenantId: extractedTenantId || userData.tenantId,
          currentTenantId: extractedTenantId,
          tenants: userData.tenants,
        };
        storeUser(storedUser);
        setUser({
          ...userData,
          currentTenantId: extractedTenantId || null,
          tenants: userData.tenants,
        } as User);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // Fallback to stored user
      const storedUser = getUser();
      const storedTenantId = getCurrentTenantId();
      if (storedUser) {
        setUser(storedUser as User);
        setCurrentTenantIdState(storedTenantId);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentTenantId = (tenantId: string | null) => {
    if (tenantId) {
      setCurrentTenantId(tenantId);
      setCurrentTenantIdState(tenantId);
      // Update user context with new tenant ID
      if (user) {
        setUser({ ...user, currentTenantId: tenantId });
      }
    } else {
      // Clear tenant ID
      const { clearCurrentTenantId } = require('../utils/authStorage');
      clearCurrentTenantId();
      setCurrentTenantIdState(null);
      if (user) {
        setUser({ ...user, currentTenantId: undefined });
      }
    }
  };

  useEffect(() => {
    // Initialize user on mount
    const initUser = async () => {
      const token = getToken();
      if (token) {
        // Load stored tenant ID first
        const storedTenantId = getCurrentTenantId();
        if (storedTenantId) {
          setCurrentTenantIdState(storedTenantId);
        }
        await refreshUser();
      } else {
        setLoading(false);
      }
    };
    initUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        currentTenantId,
        setUser,
        setCurrentTenantId: handleSetCurrentTenantId,
        refreshUser,
        isAuthenticated: !!user,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
