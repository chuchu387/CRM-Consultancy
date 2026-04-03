import axios from "axios";

const normalizeApiBaseUrl = (value = "") => {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "/api";
  }

  const withoutTrailingSlash = trimmedValue.replace(/\/+$/, "");

  if (withoutTrailingSlash === "/api" || withoutTrailingSlash.endsWith("/api")) {
    return withoutTrailingSlash;
  }

  return `${withoutTrailingSlash}/api`;
};

const api = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("crm_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("crm_token");

      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
