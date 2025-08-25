// src/api.ts
import axios, { AxiosInstance, AxiosError } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: "http://localhost:8000"
});

// Ajoute automatiquement le Bearer si présent
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh auto si 401 + refresh dispo
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original: any = error.config;
    if (error.response?.status === 401 && !original?.__isRetryRequest) {
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          const r = await axios.post("http://localhost:8000/api/token/refresh/", { refresh });
          const access = (r.data as any).access;
          if (access) {
            localStorage.setItem("access", access);
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${access}`;
            original.__isRetryRequest = true;
            return api.request(original);
          }
        } catch {
          // Refresh invalide → on laisse tomber
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
