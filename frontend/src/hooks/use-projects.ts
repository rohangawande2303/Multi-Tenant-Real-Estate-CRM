import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { Project } from "@/types/project";
import { useAuth } from "@/contexts/auth-context";

export function useProjects() {
    const { role } = useAuth();
    const isAgency = role === "AGENCY" || role === "AGENCY_ADMIN" || role === "DEVELOPER";

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            // Agency/Developer gets global projects, others get tenant-scoped
            const url = isAgency ? "/agency/projects" : "/projects/";
            const response = await api.get(url);
            // Deep unique filter to prevent "duplicate key" console errors
            const uniqueProjects = Array.from(new Map(response.data.map((p: Project) => [p.id, p])).values());
            setProjects(uniqueProjects as Project[]);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch projects:", err);
            setError("Failed to load projects");
        } finally {
            setLoading(false);
        }
    }, [isAgency]);

    useEffect(() => {
        if (role) {
            refresh();
        }
    }, [role, refresh]);

    return { projects, loading, error, refresh };
}
