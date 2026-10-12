/**
 * File: src/hooks/use-logs.ts
 * Purpose: Fetch activity logs with filtering and pagination
 */

import { useState, useEffect } from "react";
import api from "@/lib/axios";

export interface ActivityLog {
    id: string; // UUID
    user_id: number;
    tenant_id?: number | null;
    role?: string;
    action_type: string;
    entity_type?: string;
    entity_id?: string;
    description?: string;
    ip_address?: string;
    user_agent?: string;
    page_url?: string;
    http_method?: string;
    response_status?: number;
    created_at: string;
    user_name?: string;
    timestamp?: string;
    meta_data?: any;
    is_archived: boolean;
}

import { useAuth } from "@/contexts/auth-context";

export function useLogs(params: {
    user_id?: number;
    tenant_id?: number;
    project_id?: number;
    action_type?: string;
    entity_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number
} = {}) {
    const { activeProjectId } = useAuth();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);

    const refresh = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (params.user_id) queryParams.append("user_id", params.user_id.toString());
            if (params.tenant_id) queryParams.append("tenant_id", params.tenant_id.toString());

            // Prioritize explicit param, fallback to global state
            const effectiveProjectId = params.project_id ?? activeProjectId;
            if (effectiveProjectId) queryParams.append("project_id", effectiveProjectId.toString());

            if (params.action_type) queryParams.append("action_type", params.action_type);
            if (params.entity_type) queryParams.append("entity_type", params.entity_type);
            if (params.start_date) queryParams.append("start_date", params.start_date);
            if (params.end_date) queryParams.append("end_date", params.end_date);
            if (params.limit) queryParams.append("limit", params.limit.toString());
            if (params.offset) queryParams.append("offset", params.offset.toString());

            const response = await api.get(`/logs/?${queryParams.toString()}`);
            // Backend returns a list of logs
            setLogs(response.data);
            setTotal(response.data.length);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch logs:", err);
            setError("Failed to load activity logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, [
        params.user_id,
        params.tenant_id,
        params.project_id,
        activeProjectId, // Trigger refresh on project change
        params.action_type,
        params.entity_type,
        params.start_date,
        params.end_date,
        params.limit,
        params.offset
    ]);

    return { logs, loading, error, refresh, total };
}
