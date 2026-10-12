/**
 * File: src/types/user.ts
 * Purpose: TypeScript definitions for User entities and Roles
 */

export type UserRole = "AGENCY" | "AGENCY_ADMIN" | "DEVELOPER" | "CLIENT_ADMIN" | "SALES_MANAGER" | "EXECUTIVE" | "CALL_CENTER";

export interface User {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    is_active: boolean;
    tenant_id: number;
    avatar_url?: string;
    created_at: string;
    last_login?: string;
    project_access?: number[]; // IDs of projects this user can access
}
