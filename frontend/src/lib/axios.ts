/**
 * File: src/lib/axios.ts
 * Purpose: Unified API client with authentication and error handling
 */

import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
    withCredentials: true,
    headers: {},
});

// Debug log in development
if (typeof window !== "undefined") {
    console.log("API Base URL:", api.defaults.baseURL);
}

/**
 * Request Interceptor: Injects JWT token and tenant ID into headers.
 */
api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("access_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            const tenantId = localStorage.getItem("tenant_id");
            if (tenantId) {
                config.headers["X-Tenant-ID"] = tenantId;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Handles 401 and network failures gracefully.
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Network error — backend unreachable
        if (!error.response) {
            console.error("Backend unreachable. Check API server.");
        }

        if (error.response?.status === 401) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("access_token");
                localStorage.removeItem("user_role");
                localStorage.removeItem("tenant_id");

                if (!window.location.pathname.startsWith("/login")) {
                    window.location.href = "/login?error=session_expired";
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
