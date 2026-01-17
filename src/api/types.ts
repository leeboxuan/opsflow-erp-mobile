// Authentication types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    email?: string;
  };
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

// Trip types (matching NestJS backend structure)
export interface Trip {
  id: string;
  tripNumber: string;
  origin: string;
  destination: string;
  status: 'Scheduled' | 'In Transit' | 'Completed' | 'Cancelled';
  driver?: string;
  driverId?: string;
  createdAt: string;
  updatedAt: string;
}

// Stop types
export interface Stop {
  id: string;
  tripId: string;
  sequence: number;
  type: 'Pickup' | 'Delivery';
  address: string;
  status: 'Scheduled' | 'In Transit' | 'Arrived' | 'Completed';
  scheduledTime: string;
  completedAt?: string;
  customerName?: string;
  phoneNumber?: string;
  notes?: string;
}
