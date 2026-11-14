
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// ==========================================
// REQUEST INTERCEPTOR
// ==========================================

axiosInstance.interceptors.request.use(
  (config) => {
    const url = config.url || "";

    const isClientRequest =
      url.startsWith("/client-portal") ||
      url.startsWith("/client-auth") ||
      url.startsWith("/client-packages") ||
      url.startsWith("/notifications/client") ||
      url.startsWith("/payments/public");

    const isPublicRequest =
      url.startsWith("/scheduling/public") ||
      url === "/therapists" ||
      url === "/therapists/" ||
      (url.startsWith("/therapists/") &&
        url !== "/therapists/profile");

    let token = null;

    if (isClientRequest) {
      token = localStorage.getItem("clientToken");
      config.authType = "client";
    } else if (isPublicRequest) {
      config.authType = "public";
    } else {
      token = localStorage.getItem("token");
      config.authType = "therapist";
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers) {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// RESPONSE INTERCEPTOR
// ==========================================

axiosInstance.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const config = error.config;

    if (status === 401 && config) {
      const authType = config.authType;
      const url = config.url || "";

      const isClientAuthEntry =
        url.includes("/client-auth/login") ||
        url.includes("/client-auth/register");

      const isTherapistAuthEntry =
        url.includes("/auth/login") ||
        url.includes("/auth/register");

      if (authType === "client" && !isClientAuthEntry) {
        localStorage.removeItem("clientToken");
        localStorage.removeItem("client");

        if (window.location.pathname.startsWith("/client/")) {
          window.location.replace("/client/login");
        }
      }

      if (authType === "therapist" && !isTherapistAuthEntry) {
        localStorage.removeItem("token");
        localStorage.removeItem("therapist");

        if (window.location.pathname.startsWith("/therapist/")) {
          window.location.replace("/login");
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
