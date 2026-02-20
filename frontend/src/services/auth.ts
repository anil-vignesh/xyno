import api from "./api";
import type { User } from "@/types";

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ access: string; refresh: string }>("/auth/login/", {
      username,
      password,
    }),

  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    company_name?: string;
  }) => api.post("/auth/register/", data),

  getRegistrationStatus: () =>
    api.get<{ registration_open: boolean }>("/auth/registration-status/"),

  getProfile: () => api.get<User>("/auth/profile/"),

  updateProfile: (data: Partial<User>) => api.patch<User>("/auth/profile/", data),
};
