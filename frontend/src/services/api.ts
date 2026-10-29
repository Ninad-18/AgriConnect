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
  // The JSON default is correct for ordinary API calls, but it prevents the
  // browser from adding a multipart boundary when the body is FormData.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
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

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export const isUploadable = (file: File, maxMb = 5): boolean =>
  SUPPORTED_IMAGE_TYPES.has(file.type) && file.size <= maxMb * 1024 * 1024;

export function getUploadValidationMessage(file: File, maxMb = 5): string {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) return "Use a JPEG, PNG, WebP, HEIC, or HEIF image.";
  if (file.size > maxMb * 1024 * 1024) return `Images must be ${maxMb}MB or smaller.`;
  return "";
}
