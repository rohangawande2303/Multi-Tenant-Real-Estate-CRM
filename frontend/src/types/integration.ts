/**
 * File: src/types/integration.ts
 * Purpose: TypeScript definitions for Webhooks and 3rd Party Connectors
 */

export type IntegrationType = "WEBHOOK" | "META_ADS" | "GOOGLE_ADS" | "ZAPIER" | "WEBSITE_FORM";

export interface Integration {
    id: number;
    name: string;
    type: IntegrationType;
    status: "ACTIVE" | "INACTIVE" | "ERROR";
    webhook_url?: string;
    api_key?: string;
    tenant_id: number;
    created_at: string;
    last_synced_at?: string;
    config?: Record<string, any>;
}

export interface WebhookLog {
    id: string;
    integration_id: number;
    timestamp: string;
    method: string;
    endpoint: string;
    payload: any;
    response_status: number;
    processing_time_ms: number;
    error_message?: string;
}
