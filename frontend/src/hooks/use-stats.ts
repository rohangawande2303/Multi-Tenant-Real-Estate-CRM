import { useState, useEffect } from "react";
import api from "@/lib/axios";

import { useAuth } from "@/contexts/auth-context";

export function useStats(projectId?: number) {
    const { activeProjectId } = useAuth();
    const effectiveProjectId = projectId ?? activeProjectId ?? undefined;

    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        try {
            const url = effectiveProjectId ? `/leads/stats?project_id=${effectiveProjectId}` : "/leads/stats";
            const response = await api.get(url);
            setStats(response.data);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch stats:", err);
            setError("Failed to load dashboard metrics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, [projectId, effectiveProjectId]);

    return { stats, loading, error, refresh };
}
