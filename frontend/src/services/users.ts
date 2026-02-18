import api from "./api";
import type {
  ManagedUser,
  InviteUserPayload,
  InviteUserResponse,
  PaginatedResponse,
  UserRole,
} from "@/types";

export const usersApi = {
  list: () => api.get<PaginatedResponse<ManagedUser>>("/auth/users/"),
  update: (
    id: number,
    data: Partial<{
      first_name: string;
      last_name: string;
      phone: string;
      role: UserRole;
    }>
  ) => api.patch<ManagedUser>(`/auth/users/${id}/`, data),
  delete: (id: number) => api.delete(`/auth/users/${id}/`),
  invite: (data: InviteUserPayload) =>
    api.post<InviteUserResponse>("/auth/users/invite/", data),
};
