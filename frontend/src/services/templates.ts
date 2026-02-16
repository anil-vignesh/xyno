import api from "./api";
import type { EmailTemplate, PaginatedResponse, Placeholder } from "@/types";

export const templatesApi = {
  list: () => api.get<PaginatedResponse<EmailTemplate>>("/templates/"),
  get: (id: number | string) => api.get<EmailTemplate>(`/templates/${id}/`),
  create: (data: Partial<EmailTemplate>) =>
    api.post<EmailTemplate>("/templates/", data),
  update: (id: number | string, data: Partial<EmailTemplate>) =>
    api.patch<EmailTemplate>(`/templates/${id}/`, data),
  delete: (id: number) => api.delete(`/templates/${id}/`),
  preview: (id: number, context: Record<string, string>) =>
    api.post<{ subject: string; html: string }>(`/templates/${id}/preview/`, {
      context,
    }),
  uploadHtml: (data: { name: string; subject: string; html_content: string }) =>
    api.post<EmailTemplate>("/templates/upload-html/", data),
  updatePlaceholders: (id: number | string, placeholders: Placeholder[]) =>
    api.post<EmailTemplate>(`/templates/${id}/update-placeholders/`, {
      placeholders,
    }),
};
