"use client";

import api from "@/lib/axios";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

/**
 * Utility for tracking frontend actions and page visits.
 * Automatically logs page navigations and provides a method for custom events.
 */
export function useActivityTracker() {
    const pathname = usePathname();
    const { user } = useAuth();

    const logAction = async (actionType: string, entityType?: string, entityId?: string, description?: string, metadata?: any) => {
        if (!user) return;
        try {
            await api.post("/logs/log", {
                action_type: actionType,
                entity_type: entityType,
                entity_id: entityId,
                description: description,
                page_url: typeof window !== "undefined" ? window.location.href : pathname,
                meta_data: metadata
            });
        } catch (err) {
            console.warn("Activity log failed silently");
        }
    };

    // Track page visits
    useEffect(() => {
        if (user && pathname) {
            logAction("PAGE_VISIT", "page", pathname, `Visited ${pathname}`);
        }
    }, [pathname, user]);

    // Global Click Tracking (Enterprise Requirement)
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!user) return;
            const target = e.target as HTMLElement;
            const clickable = target.closest("button, a, [role='button']");

            if (clickable) {
                const text = clickable.textContent?.trim().slice(0, 50);
                const id = clickable.id || "no-id";
                logAction("CLICK", "ui_element", id, `Clicked ${clickable.tagName}: ${text}`);
            }
        };

        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, [user]);

    return { logAction };
}

// Global component to be included in layout
export function ActivityTracker() {
    useActivityTracker();
    return null;
}
