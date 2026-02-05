import { Trip, Order, Stop } from '../../../api/types';

export function getTripLabel(trip: Trip, index: number): string {
  return trip.tripNumber ?? `Trip ${index + 1}`;
}

export function getOrderAddress(order: Order): string {
  const first = order.stops?.[0];
  if (!first) return order.customerName ?? order.id?.slice(0, 8) ?? '—';
  const parts = [first.addressLine1, first.postalCode].filter(Boolean);
  return parts.length ? parts.join(', ') : first.addressLine1 ?? '—';
}

/** addressLine1 + postalCode (or city) for a stop */
export function getStopAddress(stop: { addressLine1: string; postalCode?: string; city?: string }): string {
  const parts = [stop.addressLine1, stop.postalCode ?? stop.city].filter(Boolean);
  return parts.length ? parts.join(', ') : stop.addressLine1 ?? '—';
}
