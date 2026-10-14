import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("agriconnect_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 && !err.config?.url?.includes("/auth")) {
      localStorage.removeItem("agriconnect_token");
      localStorage.removeItem("agriconnect_user");
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(err);
  }
);

export function getErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? "Something went wrong";
}

export const isUploadable = (file: File, maxMb = 5): boolean => {
  return file.type.startsWith("image/") && file.size <= maxMb * 1024 * 1024;
};