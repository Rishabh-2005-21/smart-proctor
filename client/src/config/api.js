const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const defaultApiOrigin = "http://localhost:5000";
const apiOrigin = trimTrailingSlash(
  import.meta.env.VITE_API_URL || defaultApiOrigin
);

const socketOrigin = trimTrailingSlash(
  import.meta.env.VITE_SOCKET_URL || apiOrigin
);

export const API_ORIGIN = apiOrigin;
export const API_BASE = `${apiOrigin}/api`;
export const SOCKET_URL = socketOrigin;

export const apiUrl = (path = "") => {
  if (!path) return API_BASE;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};
