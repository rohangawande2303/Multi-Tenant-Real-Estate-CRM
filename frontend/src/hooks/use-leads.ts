import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { Lead } from "@/types/lead";
import { useAuth } from "@/contexts/auth-context";

export function useLeads(
    skip = 0,
    limit = 100,
    projectId?: number,
    status?: string | null,
    source?: string | null,
    search?: string | null
) {
    const { activeProjectId } = useAuth();
    const effectiveProjectId = projectId ?? activeProjectId ?? undefined;

    const [leads, setLeads] = useState<Lead[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            queryParams.append("skip", skip.toString());
            queryParams.append("limit", limit.toString());
            if (effectiveProjectId) queryParams.append("project_id", effectiveProjectId.toString());
            if (status) queryParams.append("status", status);
            if (source) queryParams.append("source", source);
            if (search) queryParams.append("search", search);

            const response = await api.get(`/leads/?${queryParams.toString()}`);
            setLeads(response.data.items);
            setTotal(response.data.total);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch leads:", err);
            setError("Failed to load leads");
        } finally {
            setLoading(false);
        }
    }, [skip, limit, effectiveProjectId, status, source, search]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { leads, total, loading, error, refresh };
}

export function useLeadOptions(projectId?: number) {
    const { activeProjectId } = useAuth();
    const effectiveProjectId = projectId ?? activeProjectId ?? undefined;

    const [options, setOptions] = useState<{
        statuses: string[];
        sources: string[];
        agents: { id: number; name: string; email: string }[];
    }>({ statuses: [], sources: [], agents: [] });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const params = new URLSearchParams();
                if (effectiveProjectId) params.append("project_id", effectiveProjectId.toString());
                const res = await api.get(`/leads/options?${params.toString()}`);
                setOptions(res.data);
            } catch (err) {
                console.error("Failed to fetch lead options:", err);
            }
        };
        fetchOptions();
    }, [effectiveProjectId]);

    return options;
}
