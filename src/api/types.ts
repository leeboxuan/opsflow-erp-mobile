// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token?: string;
  accessToken?: string; // Support both formats
  user: {
    id: string;
    username: string;
    email?: string;
    tenantId?: string; // Tenant ID from login response
  };
}

/** Profile from profiles table (e.g. global_role for superadmin). */
export interface UserProfile {
  global_role?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  role: 'Admin' | 'Ops' | 'Finance' | 'Driver';
  tenant?: string;
  tenantId?: string;
  currentTenantId?: string;
  /** Role in the selected tenant (from tenantMemberships[].role); used for stack/mode. */
  tenantRole?: string;
  tenants?: TenantMembership[];
  /** From profiles table; used to compute isSuperAdmin (global_role === 'SUPERADMIN'). */
  profile?: UserProfile;
}

export interface TenantMembership {
  tenantId: string;
  tenantName?: string;
  tenant?: string;
  isActive?: boolean;
  role?: string;
}

// Common API response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

// Pod (Proof of Delivery) - matches backend
export interface Pod {
  id: string;
  status: string;
  signedBy?: string;
  signedAt?: string; // ISO date string
  photoUrl?: string;
}

// Stop types - matches backend StopDto
export interface Stop {
  id: string;
  sequence: number;
  type: 'PICKUP' | 'DELIVERY' | 'Pickup' | 'Delivery';
  addressLine1: string;
  city?: string;
  postalCode?: string;
  plannedAt: string; // ISO date string
  transportOrderId?: string;
  pod?: Pod;
  status?: string;
  address?: string; // legacy / convenience
}

// Trip types - matches backend TripDto
export interface Trip {
  id: string;
  status: string; // e.g. Scheduled | In Transit | Completed | Cancelled
  plannedStartAt?: string; // ISO date string
  plannedEndAt?: string; // ISO date string
  driverId?: string;
  vehicleId?: string;
  stops: Stop[];
  /** Incremented when route/stops are changed (reorder, move, unassign); used for update detection */
  routeVersion?: number;
  // Legacy/convenience for UI that expects tripNumber, origin, destination
  tripNumber?: string;
  origin?: string;
  destination?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Order types (matching NestJS backend structure)
export type StopType = 'PICKUP' | 'DELIVERY';

export interface OrderStop {
  type: StopType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  plannedAt: string; // ISO date string
}

/** Line item for create order (inventory item + quantity) */
export interface CreateOrderItem {
  inventoryItemId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  /** Client-generated order ref (e.g. OF-SG-YYYYMMDD-XXXX) for DO signing */
  orderRef: string;
  customerName: string;
  stops: OrderStop[];
  /** Optional line items (inventory) */
  items?: CreateOrderItem[];
}

export interface Order {
  id: string;
  orderNumber?: string;
  customerName: string;
  stops: (OrderStop & { id?: string; sequence?: number })[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Places (Google Places Autocomplete / backend proxy)
export interface PlacePrediction {
  placeId: string;
  description: string;
}

export interface PlaceDetails {
  formattedAddress: string;
  postalCode?: string;
}

// Inventory (for order line items)
export interface InventoryItem {
  id: string;
  sku?: string;
  name?: string;
  reference?: string;
}
