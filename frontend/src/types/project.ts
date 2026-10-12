/**
 * File: src/types/project.ts
 * Purpose: TypeScript definitions for Project entities
 */

export interface Project {
    id: number;
    name: string;
    description?: string;
    status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
    tenant_id: number;
    tenant_name?: string;
    created_at: string;
    settings?: {
        lead_distribution_mode?: "ROUND_ROBIN" | "MANUAL";
        email_notifications_enabled?: boolean;
    };
    _count?: {
        leads: number;
    };
}

/**
 * File: src/types/user.ts
 * Purpose: TypeScript definitions for User entities and Roles
 */
export type UserRole = "AGENCY" | "DEVELOPER" | "BD_MANAGER" | "SALES_EXECUTIVE" | "CALL_CENTER";

export interface User {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    is_active: boolean;
    tenant_id: number;
    created_at: string;
    last_login?: string;
    project_access?: number[]; // IDs of projects this user can access
}
