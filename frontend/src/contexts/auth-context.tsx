/**
 * File: src/contexts/auth-context.tsx
 * Purpose: Global authentication state management
 */

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@/types/user";
import { useRouter, usePathname } from "next/navigation";
import { mockStore } from "@/lib/mock-store";
import { AGENCY_EMAILS } from "@/lib/constants";
import { logActivity } from "@/lib/activity-logger";
import api from "@/lib/axios";

interface AuthContextType {
    user: User | null;
    role: UserRole | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: { access_token: string, role: UserRole, tenant_id: number, email: string }) => Promise<boolean>;
    logout: () => void;
    isAgency: boolean;
    activeProjectId: number | null;
    selectProject: (id: number | null) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
    const router = useRouter();

    useEffect(() => {
        const initAuth = async () => {
            mockStore.init();
            const token = localStorage.getItem("access_token");
            if (token) {
                // Bootstrap from localStorage first for instant UI
                const storedRole = document.cookie.split('; ').find(c => c.startsWith('user_role='))?.split('=')[1];
                const storedEmail = document.cookie.split('; ').find(c => c.startsWith('user_email='))?.split('=')[1];
                const storedTenantId = localStorage.getItem("tenant_id");

                if (storedRole) setRole(storedRole as UserRole);

                // Then fetch real user from DB to get actual name, avatar etc.
                try {
                    const response = await api.get("/auth/me");
                    const realUser = response.data;
                    setUser(realUser);
                    setRole(realUser.role as UserRole);
                    mockStore.updateProfile(realUser);
                } catch (err) {
                    // Token might be expired — use fallback from cookie
                    if (storedEmail) {
                        const fallback: User = {
                            id: 0,
                            name: storedEmail.split('@')[0],
                            email: storedEmail,
                            role: (storedRole || "AGENCY") as UserRole,
                            tenant_id: storedTenantId ? parseInt(storedTenantId) : 1,
                            is_active: true,
                            created_at: new Date().toISOString()
                        };
                        setUser(fallback);
                    }
                }

                const storedProjectId = localStorage.getItem("active_project_id");
                if (storedProjectId) {
                    setActiveProjectId(parseInt(storedProjectId));
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const refreshUser = async () => {
        try {
            // Use the api client which auto-injects Authorization + X-Tenant-ID headers
            const response = await api.get("/auth/me");
            const updatedUser = response.data;
            setUser(updatedUser);
            setRole(updatedUser.role as UserRole);
            mockStore.updateProfile(updatedUser);
        } catch (error) {
            console.error("Failed to refresh user:", error);
        }
    };

    const login = async (data: { access_token: string, role: UserRole, tenant_id: number, email: string }) => {
        setIsLoading(true);
        try {
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("tenant_id", data.tenant_id.toString());

            // Set cookies for middleware FIRST (before any API calls)
            const cookieOptions = "path=/; max-age=86400; SameSite=Lax";
            document.cookie = `access_token=${data.access_token}; ${cookieOptions}`;
            document.cookie = `user_role=${data.role}; ${cookieOptions}`;
            document.cookie = `user_email=${data.email}; ${cookieOptions}`;
            document.cookie = `tenant_id=${data.tenant_id}; ${cookieOptions}`;

            // Set role immediately for UI
            setRole(data.role);

            // Fetch REAL user profile from DB (name, avatar, etc.)
            try {
                const meResponse = await api.get("/auth/me");
                const realUser = meResponse.data;
                setUser(realUser);
                setRole(realUser.role as UserRole);
                mockStore.updateProfile(realUser);
            } catch {
                // Fallback if /me fails — use login response data
                const profileData: User = {
                    id: 0,
                    name: data.email.split('@')[0],
                    email: data.email,
                    role: data.role,
                    tenant_id: data.tenant_id,
                    is_active: true,
                    created_at: new Date().toISOString()
                };
                setUser(profileData);
                mockStore.updateProfile(profileData);
            }

            logActivity({ category: "AUTH", action: "user_login", metadata: { role: data.role, tenant_id: data.tenant_id } });
            setIsLoading(false);
            return true;
        } catch (error) {
            console.error("Auth Context login update failed:", error);
            setIsLoading(false);
            return false;
        }
    };

    const logout = () => {
        logActivity({ category: "AUTH", action: "user_logout" });

        localStorage.removeItem("access_token");
        localStorage.removeItem("tenant_id");
        localStorage.removeItem("user_role");

        // Clear cookies
        const clearCookie = (name: string) => {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        };
        clearCookie("access_token");
        clearCookie("user_role");
        clearCookie("user_email");
        clearCookie("tenant_id");

        setUser(null);
        setRole(null);
        setActiveProjectId(null);
        localStorage.removeItem("active_project_id");
        router.push("/login");
    };

    const isAgency = user ? (user.role === "AGENCY" || user.role === "AGENCY_ADMIN") : false;

    return (
        <AuthContext.Provider
            value={{
                user,
                role,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                isAgency,
                activeProjectId,
                selectProject: (id: number | null) => {
                    setActiveProjectId(id);
                    if (id) {
                        localStorage.setItem("active_project_id", id.toString());
                    } else {
                        localStorage.removeItem("active_project_id");
                    }
                },
                refreshUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
