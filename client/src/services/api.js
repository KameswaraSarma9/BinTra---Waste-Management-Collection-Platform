import axios from "axios";

// in local dev, Vite proxies /api to localhost:5000 (see vite.config.js).
// in production (Vercel), there's no proxy, so VITE_API_URL must point straight
// at the deployed backend, e.g. https://smartwaste-server.onrender.com/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
