"use client";

import React, { useState } from "react";
import {
    Users,
    Activity,
    Target,
    Zap,
    Clock,
    Download,
    Loader2,
    FileText,
    ArrowRight,
    BarChart3,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/hooks/use-dashboard";
import { useLogs } from "@/hooks/use-logs";
import { useToast } from "@/contexts/toast-context";
import api from "@/lib/axios";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

function formatRoleName(role?: string | null): string {
    if (!role) return "Member";
    return role
        .split("_")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

export default function DashboardHome() {
    const { user, activeProjectId } = useAuth();
    const { toast } = useToast();
    const { data, loading: dashboardLoading, refresh: refreshDashboard } = useDashboard();
    
    // Fetch recent activity logs (limit 6)
    const { logs, loading: logsLoading } = useLogs({
        limit: 6,
        project_id: activeProjectId || undefined
    });

    const [activityPeriod, setActivityPeriod] = useState<"today" | "week" | "month" | "total">("today");

    const handleExportAudit = async () => {
        try {
            toast("Preparing audit report...", "info");
            const response = await api.get("/dashboard/audit/export", {
                params: { project_id: activeProjectId },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `crm_audit_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast("Audit report downloaded successfully", "success");
        } catch (error) {
            console.error("Export failed", error);
            toast("Failed to export audit report", "error");
        }
    };

    if (dashboardLoading) {
        return (
            <div className="h-[65vh] flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl glass-card-pro flex items-center justify-center text-primary shadow-md">
                    <Loader2 className="w-6 h-6 animate-spin stroke-[1.75]" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-foreground font-semibold text-base tracking-tight">Syncing Intelligence...</p>
                    <p className="text-muted-foreground text-xs">Refracting real-time analytics across all multi-tenant pipelines</p>
                </div>
            </div>
        );
    }

    const currentActivity = data?.activity[activityPeriod] || { site_visits: 0, revisits: 0, followups: 0 };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.06
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } }
    };

    return (
        <motion.div 
            className="space-y-6 md:space-y-8 pb-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground">
                            Performance Engine
                        </h1>
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                            <Sparkles className="w-3 h-3 stroke-[2]" /> Live Stream
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-normal">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] shrink-0" />
                        <span>{user?.name || "Member"}</span>
                        <span>•</span>
                        <span>{formatRoleName(user?.role)}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3.5 rounded-xl text-xs font-medium bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border border-white/70 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/[0.08]"
                        onClick={() => refreshDashboard()}
                    >
                        <Zap className="w-3.5 h-3.5 mr-1.5 text-primary stroke-[1.75]" />
                        Force Sync
                    </Button>
                    <Button
                        variant="hero"
                        size="sm"
                        className="h-9 px-4 rounded-full text-xs font-semibold purple-gradient shadow-md shadow-primary/25"
                        onClick={handleExportAudit}
                    >
                        <Download className="w-3.5 h-3.5 mr-1.5 stroke-[1.75]" />
                        Export Audit
                    </Button>
                </div>
            </motion.div>

            {/* Main KPI Row - 4 Equal-size cards with 1 Signature Iridescent Hero Card */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {/* 1. Fresh Leads (Signature Holographic Iridescent Purple Hero Glass Card) */}
                <div className="glass-hero-pro p-5 md:p-6 flex flex-col justify-between group cursor-default relative overflow-hidden">
                    {/* Glass Specular Reflection Highlight */}
                    <div className="absolute -top-16 -right-16 w-36 h-36 bg-white/25 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
                    
                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-white/85">New Listings</span>
                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-sm">
                                    <Zap className="w-2.5 h-2.5 fill-white stroke-[0]" /> Live Intake
                                </span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white shrink-0 border border-white/40 shadow-sm group-hover:scale-110 transition-transform">
                            <Zap className="w-4 h-4 stroke-[2]" />
                        </div>
                    </div>
                    <div className="mt-5 relative z-10">
                        <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums drop-shadow-md">
                            {data?.fresh_count || 0}
                        </div>
                        <p className="text-xs text-white/80 mt-1 font-medium">Unassigned Leads Pending Action</p>
                    </div>
                </div>

                {/* 2. In Pipeline (Frosted Glass Surface with Ambient Cyan/Purple Aura) */}
                <div className="glass-card-pro glass-card-hover p-5 md:p-6 flex flex-col justify-between group cursor-default relative overflow-hidden">
                    {/* Ambient Aura Backlight */}
                    <div className="absolute -top-14 -right-14 w-32 h-32 bg-cyan-500/10 dark:bg-cyan-400/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />

                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">In Pipeline</span>
                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-sm">
                                    ↑ 12.4% WoW
                                </span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0 shadow-sm group-hover:scale-110 group-hover:border-primary/50 transition-all">
                            <Activity className="w-4 h-4 stroke-[2]" />
                        </div>
                    </div>
                    <div className="mt-5 relative z-10">
                        <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                            {data?.wip_count || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-normal">Active Pipeline Conversations</p>
                    </div>
                </div>

                {/* 3. Overdue Stats / Ignored Leads (Clickable Frosted Glass with Semantic Warning Aura) */}
                <Link 
                    href={`/leads/ignored${activeProjectId ? `?project_id=${activeProjectId}` : ""}`}
                    className="glass-card-pro glass-card-hover p-5 md:p-6 flex flex-col justify-between group cursor-pointer block relative overflow-hidden"
                >
                    {/* Ambient Alert Aura */}
                    <div className="absolute -top-14 -right-14 w-32 h-32 bg-rose-500/10 dark:bg-rose-500/18 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />

                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">Overdue Stats</span>
                            <div className="flex items-center gap-1.5">
                                {(data?.ignored_count ?? 0) > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm animate-pulse">
                                        Needs Attention
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        All Clear
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-sm group-hover:scale-110 group-hover:border-rose-500/50 transition-all">
                            <Clock className="w-4 h-4 stroke-[2]" />
                        </div>
                    </div>
                    <div className="mt-5 relative z-10">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                                {data?.ignored_count || 0}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors font-normal">
                            Review Ignored Leads <ArrowRight className="w-3.5 h-3.5 stroke-[2] group-hover:translate-x-1 transition-transform" />
                        </p>
                    </div>
                </Link>

                {/* 4. Total Impact (Frosted Glass Surface with Ambient Indigo Aura) */}
                <div className="glass-card-pro glass-card-hover p-5 md:p-6 flex flex-col justify-between group cursor-default relative overflow-hidden">
                    {/* Ambient Impact Aura */}
                    <div className="absolute -top-14 -right-14 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-400/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />

                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">Total Impact</span>
                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shadow-sm">
                                    All-Time High
                                </span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm group-hover:scale-110 group-hover:border-indigo-500/50 transition-all">
                            <Target className="w-4 h-4 stroke-[2]" />
                        </div>
                    </div>
                    <div className="mt-5 relative z-10">
                        <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                            {data?.total_leads || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-normal">Lifetime Intake Across Tenants</p>
                    </div>
                </div>
            </motion.div>

            {/* Analytics Section: Lead Flow & Activity in Frosted Glass Surfaces */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                {/* Lead Flow Overview Table Card */}
                <div className="lg:col-span-2 glass-card-pro p-5 md:p-6 flex flex-col relative overflow-hidden">
                    {/* Ambient subtle light glow in corner */}
                    <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-5 relative z-10">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold tracking-tight text-foreground">Lead Flow Analytics</h3>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/60 dark:bg-white/10 text-muted-foreground border border-white/70 dark:border-white/10 backdrop-blur-md shadow-xs">
                                    Multi-Tenant Inflow
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-normal">Source entity performance and conversion funnel metrics</p>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-white/[0.05] border border-white/80 dark:border-white/10 flex items-center justify-center text-muted-foreground shadow-sm">
                            <BarChart3 className="w-4 h-4 stroke-[1.75]" />
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-5 px-5 slim-scrollbar flex-1 relative z-10">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/70 text-xs text-muted-foreground font-medium">
                                    <th className="text-left pb-3 font-semibold">Source Entity</th>
                                    <th className="text-right pb-3 font-semibold">Received</th>
                                    <th className="text-center pb-3 font-semibold w-[130px]">Conv / SV</th>
                                    <th className="text-center pb-3 font-semibold w-[130px]">Conv / Booking</th>
                                    <th className="text-right pb-3 font-semibold w-[130px]">Deltas (Failed)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {data?.lead_flow?.map((item, idx) => (
                                    <tr key={idx} className="h-12 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors rounded-xl">
                                        <td className="py-2.5 pr-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-1.5 h-6 rounded-full bg-primary shadow-[0_0_8px_rgba(128,25,239,0.7)]" />
                                                <span className="font-semibold text-xs text-foreground">{item.source}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 text-right pr-4">
                                            <span className="font-semibold text-sm tabular-nums text-foreground">{item.received}</span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-primary font-semibold">{item.site_visit_pct}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-secondary/80 dark:bg-white/[0.06] rounded-full overflow-hidden shadow-inner">
                                                    <div className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(128,25,239,0.7)]" style={{ width: `${item.site_visit_pct}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{item.booking_pct}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-secondary/80 dark:bg-white/[0.06] rounded-full overflow-hidden shadow-inner">
                                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" style={{ width: `${item.booking_pct}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 pl-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5 text-xs tabular-nums font-normal text-muted-foreground">
                                                <span className="text-rose-600 dark:text-rose-400 font-medium">{item.failed_pct}% lost</span>
                                                <span>•</span>
                                                <span>{item.junk_pct}% junk</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.lead_flow || data.lead_flow.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="py-14 text-center text-muted-foreground text-xs font-normal">
                                            <div className="flex flex-col items-center justify-center gap-2.5">
                                                <div className="w-12 h-12 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 backdrop-blur-xl flex items-center justify-center text-primary shadow-sm">
                                                    <BarChart3 className="w-6 h-6 stroke-[1.75]" />
                                                </div>
                                                <p className="font-semibold text-foreground text-sm mt-1">No lead flow recorded yet</p>
                                                <p className="text-xs text-muted-foreground max-w-sm">Inbound lead streams will populate automatically once real estate campaign webhooks trigger.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Activity Leaderboard Card */}
                <div className="glass-card-pro p-5 md:p-6 flex flex-col justify-between relative overflow-hidden">
                    {/* Ambient subtle light glow */}
                    <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-5">
                            <div className="space-y-0.5">
                                <h3 className="text-base font-semibold tracking-tight text-foreground">Lead Activity</h3>
                                <p className="text-xs text-muted-foreground font-normal">Direct engagement velocity</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 px-3 rounded-full text-[11px] font-semibold bg-white/60 dark:bg-white/[0.06] border border-white/80 dark:border-white/15 backdrop-blur-md capitalize shadow-sm hover:border-primary/40 transition-colors">
                                        {activityPeriod}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="glass-card-pro border-border p-1 shadow-lg z-50">
                                    <DropdownMenuItem onClick={() => setActivityPeriod("today")}>Today</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setActivityPeriod("week")}>Last 7 Days</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setActivityPeriod("month")}>Last 30 Days</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setActivityPeriod("total")}>Total History</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-3.5 divide-y divide-border/60">
                            {/* Site Visits */}
                            <div className="flex items-center gap-3.5 pt-1 first:pt-0 group">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-purple-600/10 border border-primary/25 flex items-center justify-center text-primary shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    <Users className="w-5 h-5 stroke-[1.75]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Site Visits Done</p>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                        <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                                            {currentActivity.site_visits}
                                        </span>
                                        {currentActivity.site_visits > 5 ? (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                                +12%
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-normal text-muted-foreground">
                                                On track
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Revisits */}
                            <div className="flex items-center gap-3.5 pt-3.5 group">
                                <div className="w-11 h-11 rounded-2xl bg-white/50 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 flex items-center justify-center text-muted-foreground shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    <Zap className="w-5 h-5 stroke-[1.75]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Re-Visits</p>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                        <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                                            {currentActivity.revisits}
                                        </span>
                                        {currentActivity.revisits > 3 ? (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                                +4%
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-normal text-muted-foreground">
                                                Pending follow
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Follow-ups */}
                            <div className="flex items-center gap-3.5 pt-3.5 group">
                                <div className="w-11 h-11 rounded-2xl bg-white/50 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 flex items-center justify-center text-muted-foreground shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    <Clock className="w-5 h-5 stroke-[1.75]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Follow-ups</p>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                        <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                                            {currentActivity.followups}
                                        </span>
                                        {currentActivity.followups > 10 ? (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                                +20%
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-normal text-muted-foreground">
                                                Active queue
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between relative z-10">
                        <span className="text-xs text-muted-foreground">Automation Engine</span>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[11px] font-medium shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                            <span>System Optimal</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Audit Trail Row */}
            <motion.div variants={itemVariants} className="glass-card-pro p-5 md:p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="space-y-0.5">
                        <h3 className="text-base font-semibold tracking-tight text-foreground">Audit Intelligence</h3>
                        <p className="text-xs text-muted-foreground font-normal">Real-time log of system events and agent responses</p>
                    </div>
                    <Link href="/activity">
                        <Button variant="ghost" size="sm" className="h-8 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/[0.05]">
                            Full History <ArrowRight className="w-3.5 h-3.5 ml-1.5 stroke-[1.75]" />
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {logs && logs.length > 0 ? (
                        logs.map((log) => (
                            <div key={log.id} className="p-4 rounded-2xl border border-white/70 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl hover:border-primary/40 hover:-translate-y-0.5 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] group">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs">
                                        {log.action_type}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-xs text-foreground line-clamp-2 font-normal leading-relaxed">
                                    {log.description}
                                </p>
                                <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                                            {(log.user_name || "S").charAt(0)}
                                        </div>
                                        <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[120px]">{log.user_name || "System"}</span>
                                    </div>
                                    <FileText className="w-3.5 h-3.5 text-muted-foreground stroke-[1.75] group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-8 flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
                            <Activity className="w-8 h-8 opacity-30 stroke-[1.75]" />
                            <p>No recent activity detected for this project.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
