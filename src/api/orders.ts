import { apiClient, getErrorMessage } from './client';
import { Order, CreateOrderRequest } from './types';

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
 * Create a new order
 */
export async function createOrder(orderData: CreateOrderRequest): Promise<Order> {
  try {
    const response = await apiClient.post<Order>('/transport/orders', orderData);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
