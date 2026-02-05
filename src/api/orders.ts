import { AxiosError } from 'axios';
import { apiClient, getErrorMessage } from './client';
import { Order, CreateOrderRequest } from './types';

const DUPLICATE_ORDER_REF_CODE = 'DUPLICATE_ORDER_REF';

/** Error with optional code for 409 duplicate orderRef */
export class CreateOrderError extends Error {
  code?: string;
  statusCode?: number;
  constructor(message: string, opts?: { code?: string; statusCode?: number }) {
    super(message);
    this.name = 'CreateOrderError';
    this.code = opts?.code;
    this.statusCode = opts?.statusCode;
  }
}

export function isDuplicateOrderRefError(error: unknown): boolean {
  if (error instanceof CreateOrderError) return error.code === DUPLICATE_ORDER_REF_CODE;
  return (error as { code?: string })?.code === DUPLICATE_ORDER_REF_CODE;
}

/**
 * Get all orders (authenticated)
 */
export async function getOrders(): Promise<Order[]> {
  try {
    const response = await apiClient.get<Order[]>('/transport/orders');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get a single order by ID
 */
export async function getOrderById(orderId: string): Promise<Order> {
  try {
    const response = await apiClient.get<Order>(`/transport/orders/${orderId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Create a new order. On 409 with DUPLICATE_ORDER_REF, throws CreateOrderError with code DUPLICATE_ORDER_REF.
 */
export async function createOrder(orderData: CreateOrderRequest): Promise<Order> {
  try {
    const response = await apiClient.post<Order>('/transport/orders', orderData);
    return response.data;
  } catch (err) {
    const axiosError = err as AxiosError<{ code?: string; error?: string; message?: string }>;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;
    const code = data?.code ?? data?.error;
    if (status === 409 && (code === DUPLICATE_ORDER_REF_CODE || String(code).toUpperCase() === DUPLICATE_ORDER_REF_CODE)) {
      throw new CreateOrderError(getErrorMessage(err), { code: DUPLICATE_ORDER_REF_CODE, statusCode: 409 });
    }
    throw new Error(getErrorMessage(err));
  }
}
