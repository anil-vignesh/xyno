import api from "./api";
import type { CreateSESIntegration, PaginatedResponse, SESIntegration } from "@/types";

export const integrationsApi = {
  list: () => api.get<PaginatedResponse<SESIntegration>>("/integrations/"),
  get: (id: number) => api.get<SESIntegration>(`/integrations/${id}/`),
  create: (data: CreateSESIntegration) =>
    api.post<SESIntegration>("/integrations/", data),
  update: (id: number, data: Partial<CreateSESIntegration>) =>
    api.patch<SESIntegration>(`/integrations/${id}/`, data),
  delete: (id: number) => api.delete(`/integrations/${id}/`),
  verifySender: (id: number) =>
    api.post<{ detail: string }>(`/integrations/${id}/verify_sender/`),
  checkVerification: (id: number) =>
    api.get<{ is_verified: boolean }>(`/integrations/${id}/check_verification/`),
  testConnection: (id: number) =>
    api.post<{ success: boolean; detail?: string }>(
      `/integrations/${id}/test_connection/`
    ),
};
