/**
 * File: src/app/(dashboard)/agency/analytics/page.tsx
 * Purpose: Global KPIs for Agency Super-Admins
 */

"use client";

import React from "react";
import {
    BarChart3,
    TrendingUp,
    Users,
    Building,
    Globe,
    Zap
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { BarChart } from "@/components/dashboard/charts/bar-chart";
import { PieChart } from "@/components/dashboard/charts/pie-chart";

const ECOSYSTEM_STATS = [
    { title: "Global Clients", value: "32", icon: Building, trend: { value: 12, isUp: true } },
    { title: "Total Users", value: "482", icon: Users, trend: { value: 8, isUp: true } },
    { title: "Leads Processed", value: "42.5k", icon: BarChart3, trend: { value: 24, isUp: true } },
    { title: "API Throughput", value: "99.9%", icon: Zap, trend: { value: 0, isUp: true } },
];

const CLIENT_GROWTH_DATA = [
    { name: "Mon", value: 30 },
    { name: "Tue", value: 45 },
    { name: "Wed", value: 62 },
    { name: "Thu", value: 58 },
    { name: "Fri", value: 88 },
    { name: "Sat", value: 94 },
    { name: "Sun", value: 110 },
];

const INGRESS_CHANNELS = [
    { name: "Google Ads", value: 45 },
    { name: "Website Webhooks", value: 35 },
    { name: "Zapier & CSV", value: 20 },
];

export default function AgencyAnalyticsPage() {
    return (
        <div className="space-y-10">
            <PageHeader
                title="Global Ecosystem Analytics"
                description="Cross-tenant performance monitoring and growth metrics."
                icon={Globe}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {ECOSYSTEM_STATS.map((stat, idx) => (
                    <StatsCard key={idx} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card-pro p-6 sm:p-8 rounded-3xl border-white/70 dark:border-white/10 flex flex-col h-[400px] shadow-lg">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold tracking-tight text-foreground">Lead Ingress Velocity</h3>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">Aggregated leads across all tenants</p>
                        </div>
                        <TrendingUp className="text-primary w-6 h-6" />
                    </div>
                    <div className="flex-1 min-h-0">
                        <BarChart data={CLIENT_GROWTH_DATA} />
                    </div>
                </div>

                <div className="glass-card-pro p-6 sm:p-8 rounded-3xl border-white/70 dark:border-white/10 flex flex-col h-[400px] shadow-lg">
                    <div className="mb-8">
                        <h3 className="text-xl font-bold tracking-tight text-foreground">Ingress Channels</h3>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Lead acquisition distribution</p>
                    </div>
                    <div className="flex-1 min-h-0">
                        <PieChart data={INGRESS_CHANNELS} />
                    </div>
                </div>
            </div>
        </div>
    );
}
