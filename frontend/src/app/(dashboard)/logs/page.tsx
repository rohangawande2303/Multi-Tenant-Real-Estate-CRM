/**
 * File: src/app/(dashboard)/logs/page.tsx
 * Purpose: System-wide activity logging dashboard with enterprise filtering
 */

"use client";

import React, { useState } from "react";
import {
    Activity,
    Search,
    Filter,
    Download,
    Calendar,
    User,
    Shield,
    Globe,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLogs } from "@/hooks/use-logs";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ActivityLogPage() {
    const { user, role } = useAuth();
    const isAgencyAdmin = role === "AGENCY_ADMIN" || role === "AGENCY" || role === "DEVELOPER";


    // Filtering State
    const [actionType, setActionType] = useState<string>("ALL");
    const [entityType, setEntityType] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(0);
    const limit = 20;

    const { logs, loading, refresh, total } = useLogs({
        action_type: actionType === "ALL" ? undefined : actionType,
        entity_type: entityType === "ALL" ? undefined : entityType,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        limit,
        offset: page * limit
    });

    const getActionColor = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes("create") || a.includes("upload")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        if (a.includes("delete") || a.includes("remove")) return "bg-red-500/10 text-red-500 border-red-500/20";
        if (a.includes("update") || a.includes("PATCH") || a.includes("PUT")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
        if (a.includes("login") || a.includes("auth")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
        return "bg-white/5 text-muted-foreground border-white/10";
    };

    const getStatusColor = (status: number) => {
        if (status >= 200 && status < 300) return "text-emerald-500";
        if (status >= 400 && status < 500) return "text-amber-500";
        if (status >= 500) return "text-red-500";
        return "text-muted-foreground";
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-white">
                        <Activity className="w-8 h-8 text-primary animate-pulse" />
                        Audit Trail
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        Monitoring system-wide interactions and data mutations for enterprise compliance.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="glass border-white/10 text-white" onClick={() => refresh()}>
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button className="purple-gradient shadow-lg shadow-primary/20 text-white font-bold">
                        <Download className="w-4 h-4 mr-2" />
                        Export Audit
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="glass-card border-white/5 bg-card/40 shadow-2xl">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Action Type</label>
                            <Select value={actionType} onValueChange={setActionType}>
                                <SelectTrigger className="glass-input h-10 border-white/10 text-white uppercase font-bold text-xs">
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-white/10 text-white">
                                    <SelectItem value="ALL">All Actions</SelectItem>
                                    <SelectItem value="CREATE">Create</SelectItem>
                                    <SelectItem value="UPDATE">Update</SelectItem>
                                    <SelectItem value="DELETE">Delete</SelectItem>
                                    <SelectItem value="LOGIN">Authentication</SelectItem>
                                    <SelectItem value="EXPORT">Export</SelectItem>
                                    <SelectItem value="CLICK">Frontend Event</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Entity</label>
                            <Select value={entityType} onValueChange={setEntityType}>
                                <SelectTrigger className="glass-input h-10 border-white/10 text-white uppercase font-bold text-xs">
                                    <SelectValue placeholder="All Entities" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-white/10 text-white">
                                    <SelectItem value="ALL">All Entities</SelectItem>
                                    <SelectItem value="LEAD">Leads</SelectItem>
                                    <SelectItem value="USER">Users</SelectItem>
                                    <SelectItem value="TENANT">Tenants</SelectItem>
                                    <SelectItem value="PROJECT">Projects</SelectItem>
                                    <SelectItem value="COMMENT">Comments</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="glass-input h-10 pl-10 border-white/10 text-white text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="glass-input h-10 pl-10 border-white/10 text-white text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card className="glass-card border-white/5 bg-card/40 shadow-2xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-white font-black text-[10px] uppercase tracking-widest w-[180px]">Timestamp</TableHead>
                            <TableHead className="text-white font-black text-[10px] uppercase tracking-widest w-[150px]">Actor</TableHead>
                            <TableHead className="text-white font-black text-[10px] uppercase tracking-widest w-[120px]">Action</TableHead>
                            <TableHead className="text-white font-black text-[10px] uppercase tracking-widest w-[120px]">Entity</TableHead>
                            <TableHead className="text-white font-black text-[10px] uppercase tracking-widest">Description</TableHead>
                            <TableHead className="text-white font-black text-[10px] uppercase tracking-widest w-[100px]">Network</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i} className="border-white/5">
                                    <TableCell colSpan={6} className="h-16">
                                        <div className="w-full h-4 bg-white/5 animate-pulse rounded-lg" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : logs.length === 0 ? (
                            <TableRow className="border-white/5">
                                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground font-bold italic">
                                    No activity logs found for the selected filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id} className="border-white/5 group hover:bg-white/[0.02] transition-colors">
                                    <TableCell className="text-[11px] font-medium text-muted-foreground/80 group-hover:text-white transition-colors">
                                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="w-3 h-3 text-primary" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-white leading-none">User #{log.user_id}</span>
                                                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mt-1 opacity-60">{log.role || "UNKNOWN"}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest border-none px-2 py-0.5", getActionColor(log.action_type))}>
                                            {log.action_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <Shield className="w-3 h-3 text-muted-foreground/40" />
                                            <span className="text-xs font-bold text-muted-foreground uppercase">{log.entity_type || "N/A"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[400px]">
                                            <p className="text-xs text-white/90 font-medium line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                                                {log.description}
                                            </p>
                                            {log.page_url && (
                                                <div className="flex items-center gap-1 mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <Globe className="w-2.5 h-2.5" />
                                                    <span className="text-[9px] text-muted-foreground truncate">{log.page_url}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 items-end">
                                            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                                                <span className={cn("font-bold", getStatusColor(log.response_status || 0))}>{log.response_status || "—"}</span>
                                                <span className="opacity-40">{log.http_method}</span>
                                            </div>
                                            <span className="text-[9px] text-muted-foreground/40 font-mono truncate max-w-[80px]">{log.ip_address || "0.0.0.0"}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="bg-white/5 p-4 flex items-center justify-between border-t border-white/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Showing {logs.length} of {total} records
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}
                            className="h-8 text-white hover:bg-white/10"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>
                        <div className="flex items-center gap-1 px-4">
                            <span className="text-xs font-black text-white">{page + 1}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={(page + 1) * limit >= total}
                            onClick={() => setPage(page + 1)}
                            className="h-8 text-white hover:bg-white/10"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Enterprise Warning Overlay (Mocking context) */}
            {(role as any) !== "AGENCY_ADMIN" && (role as any) !== "DEVELOPER" && (

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4">
                    <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-500">Restricted View</p>
                        <p className="text-xs text-amber-500/70">As an Agent, you only see audit logs related to your personal interactions and assigned leads. For a system-wide view, please contact your Organization Administrator.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
