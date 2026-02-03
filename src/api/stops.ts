import { apiClient, getErrorMessage } from './client';

export interface PODData {
  /** Local image URI (e.g. file://...) — passed as photoUrl for now */
  photoUrl?: string;
  signedBy?: string;
  signedAt?: string; // ISO date string
}

/**
 * Update stop status
 */
export async function updateStopStatus(
  stopId: string,
  status: 'Scheduled' | 'In Transit' | 'Arrived' | 'Completed' | 'Failed'
): Promise<void> {
  try {
    await apiClient.patch(`/transport/stops/${stopId}/status`, { status });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Upload POD (Proof of Delivery) for a stop.
 * POST /transport/stops/:stopId/pod with JSON body { photoUrl, signedBy, signedAt }.
 * For now, photoUrl is the local image URI (e.g. file://...).
 */
export async function uploadPOD(stopId: string, podData: PODData): Promise<void> {
  try {
    const payload: { photoUrl?: string; signedBy?: string; signedAt?: string } = {};
    if (podData.photoUrl) payload.photoUrl = podData.photoUrl;
    if (podData.signedBy) payload.signedBy = podData.signedBy;
    if (podData.signedAt) payload.signedAt = podData.signedAt;

    await apiClient.post(`/transport/stops/${stopId}/pod`, payload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
