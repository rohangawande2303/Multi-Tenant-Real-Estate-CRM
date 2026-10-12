/**
 * File: src/lib/constants.ts
 * Purpose: Global constants and security whitelist
 */

export const AGENCY_EMAILS = [
    "admin@socialpulse.agency",
    "demo_admin@socialpulse.agency"
];

export const ROLES = {
    AGENCY: "AGENCY",
    AGENCY_ADMIN: "AGENCY_ADMIN",
    DEVELOPER: "DEVELOPER",
    CLIENT_ADMIN: "CLIENT_ADMIN",
    BD_MANAGER: "BD_MANAGER",
    EXECUTIVE: "EXECUTIVE",
    CALL_CENTER: "CALL_CENTER"
} as const;

export type UserRole = keyof typeof ROLES;

export const LEAD_STATUSES = [
    { label: "New", value: "NEW", color: "bg-blue-500" },
    { label: "Warm", value: "WARM", color: "bg-orange-500" },
    { label: "Hot", value: "HOT", color: "bg-red-500" },
    { label: "Follow Up", value: "FOLLOW_UP", color: "bg-purple-500" },
    { label: "Booking Done", value: "BOOKING_DONE", color: "bg-green-500" },
    { label: "Post Sale", value: "POST_SALE", color: "bg-emerald-500" },
    { label: "Lost", value: "LOST", color: "bg-gray-500" },
    { label: "Invalid", value: "INVALID", color: "bg-black" }
];

export const SOURCE_GROUPS = [
    "Meta Ads",
    "Google Ads",
    "Website Form",
    "Walk-in",
    "Reference",
    "Zapier",
    "Other"
];

export const APP_CONFIG = {
    NAME: "Social Pulse CRM",
    VERSION: "1.0.0",
    API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
};
