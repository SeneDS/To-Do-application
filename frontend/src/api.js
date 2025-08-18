// src/api.js
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Ajoute le token à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh auto si 401 + refresh token dispo
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    if (error.response?.status === 401 && !original.__isRetryRequest) {
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          // Utilise axios "nu" pour éviter une boucle d'interceptors
          const r = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh });
          localStorage.setItem("access", r.data.access);

          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${r.data.access}`;
          original.__isRetryRequest = true;

          return api.request(original);
        } catch (e) {
          // Échec du refresh → on nettoie
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
