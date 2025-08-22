import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

// Ajoute le token
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("access");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// (Option) log rapide pour debug
api.interceptors.request.use((cfg) => {
  // console.log("Auth:", cfg.headers.Authorization); // décommente si besoin
  return cfg;
});

// Refresh auto si 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original.__isRetryRequest) {
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          const r = await axios.post("http://localhost:8000/api/token/refresh/", { refresh });
          localStorage.setItem("access", r.data.access);
          original.headers.Authorization = `Bearer ${r.data.access}`;
          original.__isRetryRequest = true;
          return api.request(original);
        } catch {}
      }
    }
    return Promise.reject(error);
  }
);

export default api;
