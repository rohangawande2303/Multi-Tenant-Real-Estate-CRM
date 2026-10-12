/**
 * File: src/lib/activity-logger.ts
 * Purpose: Centralized utility for logging user actions across the platform
 */

type ActionCategory = "AUTH" | "LEAD" | "PROJECT" | "USER" | "INTEGRATION" | "TENANT";

interface ActivityLogOptions {
    category: ActionCategory;
    action: string; // e.g., "LOGIN_SUCCESS", "LEAD_STATUS_UPDATE"
    metadata?: Record<string, any>;
    lead_id?: string | number;
    project_id?: number;
}

export const activityLogger = {
    log: async (options: ActivityLogOptions) => {
        const timestamp = new Date().toISOString();

        // In production, this would call:
        // POST /api/v1/system/activity-logs

        const payload = {
            ...options,
            timestamp,
            environment: process.env.NODE_ENV,
            url: typeof window !== "undefined" ? window.location.href : "server-side"
        };

        console.log("📊 [Activity Log]:", payload);

        try {
            // Mock API call
            // await api.post("/system/activity-logs", payload);
        } catch (err) {
            console.error("Failed to sync activity log:", err);
        }
    },

    info: (message: string, meta?: any) => {
        console.info(`ℹ️ [System]: ${message}`, meta);
    },

    error: (message: string, error: any) => {
        console.error(`🚨 [Critical Error]: ${message}`, error);
    }
};

export const logActivity = activityLogger.log;
