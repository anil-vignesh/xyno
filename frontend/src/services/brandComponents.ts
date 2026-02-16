import api from "./api";
import type { BrandComponent, CreateBrandComponent, PaginatedResponse } from "@/types";

export const brandComponentsApi = {
  list: (category?: string) => {
    const params = category ? `?category=${category}` : "";
    return api.get<PaginatedResponse<BrandComponent>>(`/brand-components/${params}`);
  },
  get: (id: number) => api.get<BrandComponent>(`/brand-components/${id}/`),
  create: (data: CreateBrandComponent) =>
    api.post<BrandComponent>("/brand-components/", data),
  update: (id: number, data: Partial<CreateBrandComponent>) =>
    api.patch<BrandComponent>(`/brand-components/${id}/`, data),
  delete: (id: number) => api.delete(`/brand-components/${id}/`),
};
