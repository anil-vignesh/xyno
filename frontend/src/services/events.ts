import api from "./api";
import type { CreateEvent, Event, PaginatedResponse } from "@/types";

export const eventsApi = {
  list: () => api.get<PaginatedResponse<Event>>("/events/"),
  get: (id: number) => api.get<Event>(`/events/${id}/`),
  create: (data: CreateEvent) => api.post<Event>("/events/", data),
  update: (id: number, data: Partial<CreateEvent>) =>
    api.patch<Event>(`/events/${id}/`, data),
  delete: (id: number) => api.delete(`/events/${id}/`),
  testEvent: (id: number, data: { recipient: string; data: Record<string, string> }) =>
    api.post<{ detail: string; task_id: string }>(`/events/${id}/test/`, data),
  promote: (id: number) =>
    api.post<Event & { warnings?: string[] }>(`/events/${id}/promote/`),
};
