/**
 * File: src/types/lead.ts
 * Purpose: Standardized Lead interface with support for 200+ dynamic fields
 */

export type LeadStatus = "NEW" | "WARM" | "HOT" | "CLOSED" | "LOST" | "FOLLOW_UP" | "CONTACTED" | "QUALIFIED" | "UNQUALIFIED" | "PROPOSAL_SENT" | "CLOSED_WON" | "CLOSED_LOST" | string;

export interface Lead {
    // Core CRM Fields
    id: string;
    tenant_id: number;
    project_id: number;

    // Enterprise Metadata (Persisted)
    mandate_id?: number;
    mandate_name?: string;
    developer_id?: string;
    project_name?: string;
    first_sales_owner_email?: string;
    current_status_at_sales?: string;

    // Primary Contact
    name: string;
    email?: string;
    phone: string;
    alternate_phone?: string;

    // Location
    address?: string;
    city: string;
    state?: string;
    zip_code?: string;
    country?: string;

    // Sales Metadata
    status: LeadStatus;
    lead_score: number;
    lead_rating?: string;
    source_group?: string;
    source_channel?: string;
    source_sub_channel?: string;
    source_detail?: string;
    is_verified?: boolean;
    assigned_to?: number;

    // Budget
    budget_min?: string;
    budget_max?: string;

    // Custom Attributes (JSONB mapping for 200+ fields)
    custom_fields: Record<string, any>;

    // System Fields
    created_at: string;
    updated_at: string;
    last_contacted_at?: string;
    created_by?: number;
}


export interface LeadComment {
    id: number;
    lead_id: string;
    user_id: number;
    role: string;
    content: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}

export interface LeadActivity {
    id: number;
    lead_id: string;
    performer_id: number;
    activity_type: "CALL" | "EMAIL" | "SMS" | "NOTE" | "STATUS_CHANGE" | "SYSTEM" | "CREATE" | "UPDATE" | "DELETE";
    field_name?: string;
    old_value?: string;
    new_value?: string;
    content?: string;
    created_at: string;
    meta_data?: Record<string, any>;
}

export interface LeadTimelineItem {
    id: string | number;
    timestamp: string;
    content: string;
    performed_by_name: string;
    role?: string;
    data?: {
        activity_type?: string;
        description?: string;
        meta_data?: Record<string, any>;
    };
}
