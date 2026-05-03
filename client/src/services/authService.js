const USER_KEY = "user";
const TOKEN_KEY = "token";
const ROLE_KEY = "role";

const parseJson = (value, fallback = null) => {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const getStoredUser = () =>
  parseJson(window.localStorage.getItem(USER_KEY), null);

export const getAuthToken = () => window.localStorage.getItem(TOKEN_KEY);

export const getStoredRole = () => window.localStorage.getItem(ROLE_KEY);

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const json = window.atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isTokenValid = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  if (typeof payload.exp !== "number") {
    return true;
  }

  return payload.exp * 1000 > Date.now();
};

export const persistAuthSession = ({ token, role, user }) => {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }

  if (role) {
    window.localStorage.setItem(ROLE_KEY, role);
  }

  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  window.dispatchEvent(new Event("auth:updated"));
};

export const clearAuthSession = () => {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("auth:updated"));
};

export const getAuthSnapshot = () => {
  const user = getStoredUser();
  const token = getAuthToken();
  const role = user?.role || getStoredRole();
  const hasValidToken = isTokenValid(token);

  if (token && !hasValidToken) {
    clearAuthSession();
    return {
      token: null,
      role: null,
      user: null,
      isAuthenticated: false
    };
  }

  return {
    token,
    role,
    user,
    isAuthenticated: Boolean(token && role && user && hasValidToken)
  };
};
