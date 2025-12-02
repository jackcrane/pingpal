const FALLBACK_BASE_URL = "http://localhost:2000";

let cachedBaseUrl = null;

const normalizeBase = (value) => {
  if (!value || typeof value !== "string") return null;
  return value.replace(/\/+$/, "");
};

const resolveBaseUrl = () => {
  if (cachedBaseUrl) return cachedBaseUrl;
  const envBase =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_API_BASE_URL
      : null;
  const windowBase =
    typeof window !== "undefined" && typeof window.API_BASE_URL === "string"
      ? window.API_BASE_URL
      : null;
  cachedBaseUrl =
    normalizeBase(windowBase) ||
    normalizeBase(envBase) ||
    FALLBACK_BASE_URL;
  return cachedBaseUrl;
};

export const url = (path = "") => `${resolveBaseUrl()}${path}`;
