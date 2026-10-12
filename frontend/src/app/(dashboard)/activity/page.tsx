"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
    Activity,
    Search,
    Filter,
    Calendar as CalendarIcon,
    User as UserIcon,
    Building2,
    Clock,
    Globe,
    Terminal,
    Shield,
    FileText,
    Download,
    Monitor,
    Smartphone,
    Laptop
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useLogs } from "@/hooks/use-logs";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function GlobalActivityPage() {
    const { activeProjectId } = useAuth();
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState<string | null>(null);
    const [entityFilter, setEntityFilter] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    const { logs, loading, total } = useLogs({
        limit: 50,
        offset: (page - 1) * 50,
        action_type: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        project_id: activeProjectId || undefined
    });

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const token = localStorage.getItem("access_token");
            const params = new URLSearchParams();
            if (actionFilter) params.append("action_type", actionFilter);
            if (entityFilter) params.append("entity_type", entityFilter);
            if (activeProjectId) params.append("project_id", activeProjectId.toString());

            const res = await fetch(
                `http://localhost:8000/api/v1/logs/export?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error("Export failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `activity_log_${new Date().toISOString().slice(0,10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("Export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes("CREATE")) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
        if (action.includes("DELETE") || action.includes("SUSPEND")) return "bg-red-500/10 border-red-500/20 text-red-500";
        if (action.includes("UPDATE") || action.includes("PATCH")) return "bg-amber-500/10 border-amber-500/20 text-amber-500";
        if (action.includes("LOGIN")) return "bg-blue-500/10 border-blue-500/20 text-blue-500";
        if (action.includes("LOGOUT")) return "bg-slate-500/10 border-slate-500/20 text-slate-400";
        return "bg-primary/10 border-primary/20 text-primary";
    };

    const getDeviceIcon = (ua: string) => {
        const lower = (ua || "").toLowerCase();
        if (lower.includes("android") || lower.includes("iphone") || lower.includes("ipad")) {
            return <Smartphone className="w-3 h-3" />;
        }
        return <Monitor className="w-3 h-3" />;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="System Audit Log"
                description="Secure, immutable record of all platform activities."
                icon={Shield}
            >
                <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground hover:bg-primary/10 hover:text-primary rounded-xl"
                    onClick={handleExport}
                    disabled={isExporting}
                >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? "Exporting..." : "Export Full Audit"}
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Search and Filters */}
                <div className="md:col-span-1 space-y-4">
                    <Card className="glass-card-pro border-white/70 dark:border-white/10 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                <Filter className="w-4 h-4 text-primary" />
                                Filters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Search Activity</Label>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="User, Action, Entity..."
                                        className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground pl-9 rounded-xl text-sm"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Action Type</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground text-sm h-9 rounded-xl">
                                            {actionFilter || "All Actions"}
                                            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 bg-popover/95 backdrop-blur-xl border-border rounded-xl">
                                        <DropdownMenuItem onClick={() => setActionFilter(null)}>All Actions</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setActionFilter("LOGIN")}>Login / Logout</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setActionFilter("CREATE")}>Creation</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setActionFilter("UPDATE")}>Updates</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setActionFilter("DELETE")}>Deletions</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Entity Type</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground text-sm h-9 rounded-xl">
                                            {entityFilter || "All Entities"}
                                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 bg-popover/95 backdrop-blur-xl border-border rounded-xl">
                                        <DropdownMenuItem onClick={() => setEntityFilter(null)}>All Entities</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setEntityFilter("lead")}>Leads</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setEntityFilter("project")}>Projects</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setEntityFilter("user")}>Users</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setEntityFilter("auth")}>Auth / System</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card-pro border-white/70 dark:border-white/10 p-4 shadow-sm">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-bold uppercase tracking-wider">
                            <span>System Status</span>
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </span>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground/90 italic leading-relaxed">
                            All events are cryptographically hashed and stored in an immutable audit ledger.
                        </p>
                    </Card>
                </div>

                {/* Timeline */}
                <div className="md:col-span-3 space-y-4">
                    <Card className="glass-card-pro border-white/70 dark:border-white/10 overflow-hidden shadow-lg">
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-20 flex justify-center"><LoadingSpinner /></div>
                            ) : logs.length === 0 ? (
                                <div className="p-20 text-center text-muted-foreground italic">No activities found matching filters.</div>
                            ) : (
                                <div className="divide-y divide-black/5 dark:divide-white/5">
                                    {logs.map((log) => (
                                        <div key={log.id} className="p-4 sm:p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors group">
                                            <div className="flex gap-4">
                                                <div className="mt-1 shrink-0">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner",
                                                        getActionColor(log.action_type)
                                                    )}>
                                                        <Activity className="w-5 h-5" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">{log.action_type.replace(/_/g, " ")}</h4>
                                                            {log.role && (
                                                                <Badge variant="outline" className="text-[10px] py-0 h-4 border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-muted-foreground font-semibold">
                                                                    {log.role.replace(/_/g, " ")}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3 text-muted-foreground/70" />
                                                            {format(new Date(log.created_at), "d MMM yyyy, hh:mm a")}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-foreground/90 font-medium leading-relaxed">{log.description}</p>
                                                    <div className="flex flex-wrap items-center gap-4 pt-1.5">
                                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                                                            <UserIcon className="w-3.5 h-3.5 text-muted-foreground/80" />
                                                            {log.meta_data?.email || `User #${log.user_id}`}
                                                        </div>
                                                        {log.tenant_id && (
                                                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                                                                <Building2 className="w-3.5 h-3.5 text-muted-foreground/80" /> Tenant: {log.tenant_id}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                                                            <Globe className="w-3.5 h-3.5 text-muted-foreground/80" /> {log.ip_address || "Internal"}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                                            {getDeviceIcon(log.user_agent || "")}
                                                            {log.meta_data?.device || log.user_agent?.split(" ")[0] || "System"}
                                                        </div>
                                                    </div>

                                                    {log.meta_data && Object.keys(log.meta_data).length > 0 && (
                                                        <div className="mt-3 p-3 rounded-xl bg-slate-900 dark:bg-black/60 border border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto shadow-inner">
                                                            <div className="flex items-center gap-2 mb-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10 pb-1">
                                                                <FileText className="w-3 h-3" /> Data Snapshot
                                                            </div>
                                                            <pre className="text-xs leading-relaxed">{JSON.stringify(log.meta_data, null, 2)}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between px-2 pt-2">
                        <p className="text-xs text-muted-foreground font-medium">
                            Showing {logs.length} of {total} total entries
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground rounded-xl"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={logs.length < 50}
                                onClick={() => setPage(p => p + 1)}
                                className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground rounded-xl"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
