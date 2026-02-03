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

export interface User {
  id: string;
  email: string;
  username?: string;
  role: 'Admin' | 'Ops' | 'Finance' | 'Driver';
  tenant?: string;
  tenantId?: string;
  currentTenantId?: string;
  tenants?: TenantMembership[];
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

export interface CreateOrderRequest {
  customerName: string;
  stops: OrderStop[];
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
