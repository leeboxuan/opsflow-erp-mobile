import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, TenantMembership } from '../../api/types';
import { getCurrentUser } from '../../api/auth';
import { getUser, storeUser } from '../utils/authStorage';
import { getToken, getCurrentTenantId, setCurrentTenantId, clearCurrentTenantId } from '../utils/authStorage';

// ---------------------------------------------------------------------------
// Auth + tenant: profile (profiles table), memberships (tenant_memberships + tenants)
// ---------------------------------------------------------------------------
// - On sign-in / app start we fetch profile + memberships (via /auth/me).
// - isSuperAdmin = profile.global_role === 'SUPERADMIN'. SuperAdmin can proceed without
//   selectedTenantId (global mode). refreshUser does not throw when isSuperAdmin and
//   selectedTenantId is null.
// - Non-superadmin: 1 membership → auto-select; >1 → show TenantSelect; 0 → show NoAccess.
// - selectedTenantId is string | null only (never 0). Persisted in existing storage.
// ---------------------------------------------------------------------------

/** isSuperAdmin from profile.global_role (profiles table) or fallback to role. */
export function isSuperAdminFromUser(
  u: { role?: string } | null
): boolean {
  if (!u?.role) return false;
  return String(u.role).trim().toUpperCase() === "SUPERADMIN";
}


/** Memberships = user.tenants or user.tenantMemberships (from API). */
function getMemberships(u: any): TenantMembership[] {
  // API returns tenantMemberships array
  if (Array.isArray(u?.tenantMemberships)) {
    return u.tenantMemberships.map((m: any) => ({
      tenantId: m.tenantId,
      tenantName: m.tenant?.name ?? m.tenantName,
      tenant: m.tenant?.name ?? m.tenant,
      role: m.role,
      isActive: m.status === 'Active' || m.isActive !== false,
    }));
  }
  // Fallback to tenants (if already normalized)
  return Array.isArray(u?.tenants) ? u.tenants : [];
}

function getFirstTenantId(u: any): string | null {
  if (!u) return null;
  if (u.tenantId) return u.tenantId;
  if (u.currentTenantId) return u.currentTenantId;
  // Check tenantMemberships first (API format)
  if (Array.isArray(u.tenantMemberships) && u.tenantMemberships[0]) {
    return u.tenantMemberships[0].tenantId ?? null;
  }
  // Fallback to tenants
  if (Array.isArray(u.tenants) && u.tenants[0]) {
    return u.tenants[0].tenantId ?? null;
  }
  return null;
}

/** Role for the selected tenant: from membership for currentTenantId, else first membership. */
function getTenantRoleFromMemberships(
  memberships: TenantMembership[],
  tenantId: string | null
): string | undefined {
  if (!memberships.length) return undefined;
  if (tenantId) {
    const m = memberships.find((x) => x.tenantId === tenantId);
    if (m?.role) return m.role;
  }
  return memberships[0]?.role;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Selected tenant ID. string | null only (never 0). Null allowed for SuperAdmin. */
  currentTenantId: string | null;
  setUser: (user: User | null) => void;
  setCurrentTenantId: (tenantId: string | null) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  hasTenantContext: boolean;
  /** Non-superadmin with >1 memberships and none selected → show TenantSelect. */
  needsTenantSelection: boolean;
  /** Non-superadmin with 0 memberships → show NoAccess. */
  noAccess: boolean;
  /** Display name for mode badge: "SuperAdmin" or selected tenant name. */
  selectedTenantName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentTenantId, setCurrentTenantIdState] = useState<string | null>(null);
  const [needsTenantSelection, setNeedsTenantSelection] = useState(false);
  const [noAccess, setNoAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = getToken();
      if (!token) {
        setUser(null);
        setCurrentTenantIdState(null);
        setNeedsTenantSelection(false);
        setNoAccess(false);
        setLoading(false);
        return;
      }

      const storedUser = getUser() as (User & { profile?: { global_role?: string }; tenants?: TenantMembership[] }) | null;
      let storedTenantId = getCurrentTenantId();

      // Fetch profile + memberships. When no tenant is stored, request goes without X-Tenant-Id
      // (backend may return profile + tenants for tenant-selection flow or SuperAdmin).
      let userData: any = null;
      try {
        const raw = await getCurrentUser();
        userData = raw.user ?? raw;
      } catch (e) {
        console.warn('Auth refresh: getCurrentUser failed', e);
        userData = storedUser;
      }

      if (!userData) {
        setUser(null);
        setCurrentTenantIdState(null);
        setNeedsTenantSelection(false);
        setNoAccess(false);
        setLoading(false);
        return;
      }

      const memberships = getMemberships(userData);
      const superadmin = isSuperAdminFromUser(userData);

      console.log('🔍 Auth refresh:', {
        hasTenantMemberships: Array.isArray(userData?.tenantMemberships),
        tenantMembershipsCount: userData?.tenantMemberships?.length ?? 0,
        membershipsCount: memberships.length,
        role: userData?.role,
        isSuperAdmin: superadmin,
      });

      // Normalize API response: map tenantMemberships to tenants format
      const normalized = {
        ...userData,
        tenants: memberships.length > 0 ? memberships : (userData.tenants ?? []),
      };

      // ----- SuperAdmin: allow selectedTenantId = null (global mode) -----
      if (superadmin) {
        setNoAccess(false);
        const superTenantId = storedTenantId || getFirstTenantId(normalized);
        if (!storedTenantId) {
          clearCurrentTenantId();
          setCurrentTenantIdState(null);
        } else {
          setCurrentTenantIdState(storedTenantId);
        }
        setNeedsTenantSelection(false);
        // Derive tenantRole for superadmin (from selected tenant or first membership)
        const tenantRole = getTenantRoleFromMemberships(memberships, superTenantId);
        storeUser({
          id: normalized.id,
          username: normalized.username || normalized.email,
          email: normalized.email,
          role: normalized.role,
          tenant: normalized.tenant,
          tenantId: getFirstTenantId(normalized) || undefined,
          currentTenantId: superTenantId || undefined,
          tenants: normalized.tenants,
          tenantRole,
        } as any);
        setUser({ ...normalized, tenants: normalized.tenants, currentTenantId: superTenantId || undefined, tenantRole } as User);
        setLoading(false);
        return;
      }

      // ----- Non-superadmin: tenant selection logic -----
      if (memberships.length === 0) {
        setNoAccess(true);
        setNeedsTenantSelection(false);
        setCurrentTenantIdState(null);
        clearCurrentTenantId();
        setLoading(false);
        return;
      }

      setNoAccess(false);

      let effectiveTenantId: string | null = null;
      if (memberships.length === 1) {
        const single = memberships[0].tenantId;
        setCurrentTenantId(single);
        setCurrentTenantIdState(single);
        setNeedsTenantSelection(false);
        effectiveTenantId = single;
      } else {
        if (storedTenantId && memberships.some((m) => m.tenantId === storedTenantId)) {
          setCurrentTenantIdState(storedTenantId);
          setNeedsTenantSelection(false);
          effectiveTenantId = storedTenantId;
        } else {
          setCurrentTenantIdState(null);
          clearCurrentTenantId();
          setNeedsTenantSelection(true);
          effectiveTenantId = null;
        }
      }

      // Derive tenantRole from selected tenant (currentTenantId if valid, else first membership)
      const tenantRole = getTenantRoleFromMemberships(memberships, effectiveTenantId);
      const finalTenantId = effectiveTenantId || getFirstTenantId(normalized);

      // Persist tenantRole and effective tenantId
      storeUser({
        id: normalized.id,
        username: normalized.username || normalized.email,
        email: normalized.email,
        role: normalized.role,
        tenant: normalized.tenant,
        tenantId: finalTenantId || undefined,
        currentTenantId: finalTenantId || undefined,
        tenants: normalized.tenants,
        tenantRole,
      } as any);
      setUser({ ...normalized, tenants: normalized.tenants, currentTenantId: finalTenantId || undefined, tenantRole } as User);
      console.log("✅ AuthContext setUser payload:", {
        email: normalized.email,
        globalRole: normalized.role,
        finalTenantId,
        tenantRole,
        memberships: memberships.map(m => ({ tenantId: m.tenantId, role: m.role, isActive: m.isActive })),
      });
      setLoading(false);
    } catch (error) {
      console.error('Refresh user error:', error);
      const fallback = getUser();
      if (fallback) {
        setUser(fallback as User);
        setCurrentTenantIdState(getCurrentTenantId());
      }
      setNeedsTenantSelection(false);
      setNoAccess(false);
      setLoading(false);
    }
  };

  const handleSetCurrentTenantId = (tenantId: string | null) => {
    if (tenantId != null && tenantId !== '') {
      setCurrentTenantId(tenantId);
      setCurrentTenantIdState(tenantId);
      setNeedsTenantSelection(false);
      if (user) {
        const tenantRole = getTenantRoleFromMemberships(getMemberships(user), tenantId);
        const next = { ...user, currentTenantId: tenantId, tenantRole };
        setUser(next);
        storeUser({ ...user, currentTenantId: tenantId, tenantRole } as any);
      }
    } else {
      clearCurrentTenantId();
      setCurrentTenantIdState(null);
      if (user) setUser({ ...user, currentTenantId: undefined });
      const superadmin = isSuperAdminFromUser(user);
      if (!superadmin && getMemberships(user ?? {}).length > 1) setNeedsTenantSelection(true);
    }
  };

  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (token) {
        const stored = getCurrentTenantId();
        if (stored) setCurrentTenantIdState(stored);
        const storedUser = getUser();
        if (storedUser) setUser(storedUser as User);
        await refreshUser();
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const isSuperAdmin = isSuperAdminFromUser(user);
  const hasTenantContext = currentTenantId != null && currentTenantId !== '';
  const selectedTenantName =
    hasTenantContext && user?.tenants
      ? (user.tenants.find((t) => t.tenantId === currentTenantId)?.tenantName ?? user.tenants.find((t) => t.tenantId === currentTenantId)?.tenant ?? currentTenantId)
      : null;

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
        isSuperAdmin,
        hasTenantContext,
        needsTenantSelection,
        noAccess,
        selectedTenantName: isSuperAdmin && !hasTenantContext ? 'SuperAdmin' : selectedTenantName,
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
