const getHostFallback = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:2000";
};

const DEFAULT_API_BASE = `${getHostFallback()}/api`;

// let cachedBaseUrl = null;
let cachedBaseUrl = "http://localhost:2000/api";

const normalizeBase = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  return trimmed.replace(/\/+$/, "");
};

const coerceAbsolute = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) {
    const protocol =
      (typeof window !== "undefined" && window.location?.protocol) || "http:";
    return `${protocol}${value}`;
  }
  if (value.startsWith("/")) {
    return `${getHostFallback()}${value}`;
  }
  return value;
};

const resolveBaseUrl = () => {
  if (cachedBaseUrl) return cachedBaseUrl;
  const windowBase =
    typeof window !== "undefined" && typeof window.API_BASE_URL === "string"
      ? window.API_BASE_URL
      : null;
  const envBase =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_API_BASE_URL
      : null;
  const candidate =
    normalizeBase(windowBase) || normalizeBase(envBase) || DEFAULT_API_BASE;
  cachedBaseUrl = coerceAbsolute(candidate);
  return cachedBaseUrl;
};

export const url = (path = "") => `${resolveBaseUrl()}${path}`;
