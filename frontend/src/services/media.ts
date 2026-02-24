import api from "./api";

export const mediaApi = {
  upload: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<{ url: string }>("/media/upload/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.url;
  },
};
