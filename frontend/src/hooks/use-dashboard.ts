import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useAuth } from "@/contexts/auth-context";

export interface LeadFlowItem {
    source: string;
    received: number;
    site_visit_pct: number;
    booking_pct: number;
    failed_pct: number;
    junk_pct: number;
}

export interface DashboardOverview {
    lead_flow: LeadFlowItem[];
    fresh_count: number;
    wip_count: number;
    ignored_count: number;
    activity: {
        today: { site_visits: number; revisits: number; followups: number };
        week: { site_visits: number; revisits: number; followups: number };
        month: { site_visits: number; revisits: number; followups: number };
        total: { site_visits: number; revisits: number; followups: number };
    };
    total_leads: number;
}

export function useDashboard(projectId?: number) {
    const { activeProjectId } = useAuth();
    const effectiveProjectId = projectId ?? activeProjectId ?? undefined;

    const [data, setData] = useState<DashboardOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const params = effectiveProjectId ? { project_id: effectiveProjectId } : {};
            const response = await api.get("/dashboard/overview", { params });
            setData(response.data);
            setError(null);
            
            // Temporary log for auto-validation (as requested)
            console.log("Dashboard API Response:", response.data);
        } catch (err: any) {
            console.error("Failed to fetch dashboard overview:", err);
            setError("Failed to load dashboard statistics");
        } finally {
            setLoading(false);
        }
    }, [effectiveProjectId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { data, loading, error, refresh };
}
