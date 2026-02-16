import api from "./api";
import type { DashboardStats, EmailLog, PaginatedResponse } from "@/types";

export const logsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<EmailLog>>("/logs/", { params }),
  get: (id: number) => api.get<EmailLog>(`/logs/${id}/`),
  dashboardStats: () => api.get<DashboardStats>("/logs/dashboard-stats/"),
};
