/**
 * File: src/hooks/use-integrations.ts
 */

import { useState, useEffect } from "react";
import { Integration } from "@/types/integration";

export function useIntegrations() {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            await new Promise(r => setTimeout(r, 800));
            setIntegrations([
                { id: 1, name: "Facebook Ads", type: "META_ADS", status: "ACTIVE", tenant_id: 1, created_at: "2024-01-01" },
            ]);
            setLoading(false);
        };
        fetch();
    }, []);

    return { integrations, loading };
}
