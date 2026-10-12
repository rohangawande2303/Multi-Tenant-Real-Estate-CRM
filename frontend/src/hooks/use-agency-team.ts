/**
 * File: src/hooks/use-agency-team.ts
 * Purpose: Fetch hierarchical team data (Tenants -> Users) for Agency view
 */

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { UserRole } from "@/types/user";

export interface AgencyUser {
    id: number;
    email: string;
    role: UserRole;
    is_active: boolean;
}

export interface AgencyTenantTeam {
    tenant_id: number;
    tenant_name: string;
    users: AgencyUser[];
}

export function useAgencyTeam() {
    const [teams, setTeams] = useState<AgencyTenantTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        try {
            const response = await api.get("/agency/team");
            setTeams(response.data);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch agency teams:", err);
            setError("Failed to load hierarchical team data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    return { teams, loading, error, refresh };
}
