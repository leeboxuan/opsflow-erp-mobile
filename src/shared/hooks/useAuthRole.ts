import { useAuth } from '../context/AuthContext';

export type AuthRole = 'Admin' | 'Ops' | 'Finance' | 'Driver';

const KNOWN_ROLES: AuthRole[] = ['Admin', 'Ops', 'Finance', 'Driver'];

function normalizeRole(raw: string | undefined | null): AuthRole | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  const found = KNOWN_ROLES.find((r) => r.toLowerCase() === lower);
  if (found) return found;
  return s as AuthRole;
}

/**
 * Returns the effective user role from session (tenant role or global role),
 * gating for route editing (Admin/Ops) and execution (Driver).
 * Role is persisted in auth storage and available after app restart.
 *
 * - canEditRoute: Admin/Ops only can reorder, move, unassign stops and use "Edit Route" / "Add Orders".
 * - isDriverExecution: Driver only sees "Mark Delivered" / Complete / Start stop; Admin/Ops never see those.
 */
export function useAuthRole(): {
  role: AuthRole | null;
  canEditRoute: boolean;
  isDriverExecution: boolean;
} {
  const { user } = useAuth();
  const raw = user?.tenantRole ?? user?.role;
  const role = normalizeRole(typeof raw === 'string' ? raw : raw ? String(raw) : undefined);
  const canEditRoute = role === 'Admin' || role === 'Ops';
  const isDriverExecution = role === 'Driver';
  return { role, canEditRoute, isDriverExecution };
}
