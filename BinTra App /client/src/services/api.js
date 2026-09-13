import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5050";

// All backend routes live under /api (see server/server.js), so every call
// made through this client should just be api.get("/bookings") etc, never
// api.get("/api/bookings") - the /api prefix belongs here, once, not scattered
// across every page.
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// If the backend ever says our token is no longer valid (expired, user
// deleted/blocked, tampered token), clear the stale local session instead of
// leaving the UI stuck showing a logged-in state that the server rejects.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

export default api;