import axios from "axios";
import { API_BASE, API_ORIGIN } from "../config/api";
import { clearAuthSession, getAuthToken } from "./authService";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  const token = getAuthToken();

  if (token) {
    nextConfig.headers = {
      ...nextConfig.headers,
      Authorization: `Bearer ${token}`
    };
  }

  return nextConfig;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:expired"));
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again."
) => {
  if (!error?.response) {
    return `Cannot reach server. Make sure the backend is running on ${API_ORIGIN}.`;
  }

  return (
    error.response?.data?.msg ||
    error.response?.data?.message ||
    fallback
  );
};
