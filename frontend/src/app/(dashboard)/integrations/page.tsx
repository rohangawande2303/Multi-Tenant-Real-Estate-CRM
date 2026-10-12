/**
 * File: src/app/(dashboard)/integrations/page.tsx
 * Purpose: Focused Integrations Hub with Meta, Google, Website, and WhatsApp
 */

"use client";

import React from "react";
import { 
    Globe, 
    MessageSquare, 
    Zap,
    Plus,
    LayoutGrid,
    Settings2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetaSheetsIntegration } from "@/components/dashboard/meta-sheets-integration";
import { GoogleAdsIntegration } from "@/components/dashboard/google-ads-integration";
import { WebsiteIntegration } from "@/components/dashboard/website-integration";

export default function IntegrationsPage() {
    return (
        <div className="space-y-8 md:space-y-10 pb-16">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs">
                            <Zap className="w-3 h-3 fill-primary stroke-[0]" />
                            Automated Ingestion Engine
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/80 border border-border">
                            v2.4 Live
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        Integrations Hub
                    </h1>
                    <p className="text-muted-foreground text-xs sm:text-sm font-normal max-w-2xl leading-relaxed">
                        Connect external lead generation channels directly into your multi-tenant CRM pipeline. 
                        Instant webhook ingestion, zero latency, and automated project attribution.
                    </p>
                </div>
                <div className="flex gap-2.5 shrink-0">
                    <Button variant="outline" className="glass-card-pro h-9 px-3.5 text-xs font-medium hover:border-primary/40 shadow-sm">
                        <Settings2 className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                        API Keys
                    </Button>
                </div>
            </div>

            {/* Main Integrations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* 1. Meta Ads Integration */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Facebook & Instagram (Meta)
                        </span>
                    </div>
                    <MetaSheetsIntegration />
                </div>

                {/* 2. Google Ads Integration */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Google Search & Display
                        </span>
                    </div>
                    <GoogleAdsIntegration />
                </div>

                {/* 3. Website Integration */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Website Embeds & Forms
                        </span>
                    </div>
                    <WebsiteIntegration />
                </div>

                {/* 4. WhatsApp Business (Roadmap) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Direct Conversational Ingestion
                        </span>
                    </div>
                    <div className="glass-card-pro p-6 opacity-75 hover:opacity-100 transition-opacity border-dashed">
                        <div className="flex items-center gap-3.5 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
                                <MessageSquare className="w-5 h-5 stroke-[1.75]" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-foreground">WhatsApp Business API</h3>
                                <p className="text-xs text-muted-foreground">Direct webhook lead ingestion from verified business phone numbers.</p>
                            </div>
                        </div>
                        <div className="h-28 flex flex-col items-center justify-center text-center rounded-xl bg-white/40 dark:bg-white/[0.03] border border-white/60 dark:border-white/10 p-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-1.5">
                                In Development
                            </span>
                            <p className="text-xs text-muted-foreground">Native WhatsApp Cloud API webhook receiver scheduled for next deployment cycle.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Help & Support Footer */}
            <div className="glass-card-pro p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 justify-between mt-8 relative overflow-hidden">
                {/* Subtle internal purple glow */}
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-sm">
                        <LayoutGrid className="w-6 h-6 stroke-[1.75]" />
                    </div>
                    <div>
                        <h4 className="text-base font-semibold text-foreground">Need a custom CRM connector?</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                            Our team can deploy proprietary webhooks for your ERP, landing page builder, or real estate portal within 24 hours.
                        </p>
                    </div>
                </div>
                <Button className="purple-gradient text-white text-xs font-semibold px-6 h-10 rounded-full shadow-md shadow-primary/25 relative z-10 shrink-0">
                    Request Integration
                </Button>
            </div>
        </div>
    );
}
