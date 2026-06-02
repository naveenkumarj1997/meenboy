// ─── Availability API ─────────────────────────────────────────────────────────

import { request } from './api';

export interface AvailabilityPayload {
  date: string;
  isClosed: boolean;
  unavailableCategories: string[];
  notes?: string;
}

export const getAvailability = async (token: string) =>
  request<{ availabilities: AvailabilityPayload[] }>("/availability", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getAvailabilityByDate = async (date: string) =>
  request<{ availability: AvailabilityPayload }>(`/availability/${date}`);

export const updateAvailability = async (token: string, date: string, payload: Partial<AvailabilityPayload>) =>
  request<{ availability: AvailabilityPayload }>(`/availability/${date}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
