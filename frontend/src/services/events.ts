import api from "./api";
import type { CreateEvent, Event, PaginatedResponse } from "@/types";

export const eventsApi = {
  list: () => api.get<PaginatedResponse<Event>>("/events/definitions/"),
  get: (id: number) => api.get<Event>(`/events/definitions/${id}/`),
  create: (data: CreateEvent) => api.post<Event>("/events/definitions/", data),
  update: (id: number, data: Partial<CreateEvent>) =>
    api.patch<Event>(`/events/definitions/${id}/`, data),
  delete: (id: number) => api.delete(`/events/definitions/${id}/`),
  testEvent: (id: number, data: { recipient: string; data: Record<string, string> }) =>
    api.post<{ detail: string; task_id: string }>(`/events/definitions/${id}/test/`, data),
  promote: (id: number) =>
    api.post<Event & { warnings?: string[] }>(`/events/definitions/${id}/promote/`),
};
