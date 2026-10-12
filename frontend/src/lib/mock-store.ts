/**
 * File: src/lib/mock-store.ts
 * Purpose: Persistent local storage for mock CRM data
 */

"use client";

const STORE_KEY = "sp_crm_store";

export interface MockStoreData {
    tenants: any[];
    users: any[];
    leads: any[];
    profile: any;
    settings: {
        theme: string;
        notifications: boolean;
    };
}

const DEFAULT_DATA: MockStoreData = {
    tenants: [
        { id: 1, name: "Social Pulse Agency", domain: "agency", plan: "ENTERPRISE", status: "ACTIVE", users_count: 5, projects_count: 12 },
        { id: 2, name: "Paramount Realty", domain: "paramount", plan: "PREMIUM", status: "ACTIVE", users_count: 12, projects_count: 8 }
    ],
    users: [
        { id: 1, name: "Admin User", email: "admin@sp.com", role: "AGENCY", tenant_id: 1, is_active: true },
        { id: 2, name: "Demo Agency Admin", email: "demo_admin@socialpulse.agency", role: "AGENCY", tenant_id: 1, is_active: true }
    ],
    leads: [], // Populated on first lead list load if empty
    profile: {
        name: "Admin User",
        email: "admin@sp.com",
    },
    settings: {
        theme: "dark",
        notifications: true
    }
};

export const mockStore = {
    init: () => {
        if (typeof window === "undefined") return;
        const existing = localStorage.getItem(STORE_KEY);
        if (!existing) {
            localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_DATA));
        }
    },

    get: (): MockStoreData => {
        if (typeof window === "undefined") return DEFAULT_DATA;
        const data = localStorage.getItem(STORE_KEY);
        return data ? JSON.parse(data) : DEFAULT_DATA;
    },

    save: (data: Partial<MockStoreData>) => {
        if (typeof window === "undefined") return;
        const current = mockStore.get();
        const updated = { ...current, ...data };
        localStorage.setItem(STORE_KEY, JSON.stringify(updated));
        return updated;
    },

    addTenant: (tenant: any) => {
        const data = mockStore.get();
        data.tenants.push({ ...tenant, id: Date.now(), status: "ACTIVE", users_count: 1, projects_count: 0 });
        mockStore.save(data);
    },

    updateProfile: (profile: any) => {
        const data = mockStore.get();
        data.profile = { ...data.profile, ...profile };
        mockStore.save(data);
    },

    reset: () => {
        if (typeof window === "undefined") return;
        localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_DATA));
    }
};
