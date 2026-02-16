import api from "./api";
import type { APIKey, PaginatedResponse } from "@/types";

export const apiKeysApi = {
  list: () => api.get<PaginatedResponse<APIKey>>("/auth/api-keys/"),
  create: (name: string) =>
    api.post<APIKey & { raw_key: string }>("/auth/api-keys/", { name }),
  update: (id: number, data: Partial<APIKey>) =>
    api.patch<APIKey>(`/auth/api-keys/${id}/`, data),
  delete: (id: number) => api.delete(`/auth/api-keys/${id}/`),
};
