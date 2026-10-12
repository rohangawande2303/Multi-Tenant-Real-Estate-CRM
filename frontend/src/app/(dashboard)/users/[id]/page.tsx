/**
 * File: src/app/(dashboard)/users/[id]/page.tsx
 * Purpose: Detailed user profile view with Security Audit Timeline
 */

"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Shield,
    MapPin,
    Globe,
    Calendar,
    Activity,
    User as UserIcon,
    Terminal,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useLogs } from "@/hooks/use-logs";
import { useUsers } from "@/hooks/use-users";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function UserDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const userId = parseInt(id as string);

    const { users, loading: loadingUser } = useUsers();
    const user = users.find(u => u.id === userId);

    const { logs, loading: loadingLogs } = useLogs({ user_id: userId, limit: 50 });

    if (loadingUser) return <div className="p-20 flex justify-center"><LoadingSpinner /></div>;
    if (!user) return (
        <div className="p-20 text-center space-y-4">
            <h1 className="text-2xl font-bold">User Not Found</h1>
            <Button onClick={() => router.push("/users")}>Back to Users</Button>
        </div>
    );

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/users")} className="hover:bg-white/10 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">{user.name || "User Profile"}</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <UserIcon className="w-4 h-4" /> {user.email}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="glass-card-pro overflow-hidden shadow-lg border-white/70 dark:border-white/10">
                        <div className="h-24 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20" />
                        <CardContent className="-mt-12 space-y-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-24 h-24 rounded-2xl border-4 border-background bg-primary/10 flex items-center justify-center text-3xl font-black text-primary shadow-xl">
                                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 font-semibold text-xs rounded-full">
                                        {user.role}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
                                <div className="flex items-center gap-3 text-sm">
                                    <Shield className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Status:</span>
                                    <Badge variant={user.is_active ? "success" : "secondary"} className="ml-auto font-semibold">
                                        {user.is_active ? "Active" : "Disabled"}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Joined:</span>
                                    <span className="ml-auto text-foreground font-medium">{format(new Date(user.created_at), "MMM d, yyyy")}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card-pro border-white/70 dark:border-white/10 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                <Activity className="w-4 h-4 text-primary" /> Metrics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 shadow-sm">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Actions</p>
                                <p className="text-xl font-bold text-foreground mt-0.5">{logs.length}</p>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 shadow-sm">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Reliability</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">99.9%</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* main content: Timeline */}
                <div className="lg:col-span-2">
                    <Card className="glass-card-pro border-white/70 dark:border-white/10 h-full overflow-hidden shadow-lg">
                        <CardHeader className="border-b border-black/5 dark:border-white/5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                                        <Terminal className="w-5 h-5 text-primary" />
                                        Security Audit Trail
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5 text-muted-foreground">Comprehensive history of all user operations.</CardDescription>
                                </div>
                                <Badge variant="secondary" className="bg-black/5 dark:bg-white/10 text-muted-foreground font-semibold text-xs">
                                    Immutable Store
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingLogs ? (
                                <div className="p-20 flex justify-center"><LoadingSpinner /></div>
                            ) : logs.length === 0 ? (
                                <div className="p-20 text-center text-muted-foreground italic">No activity recorded for this user yet.</div>
                            ) : (
                                <div className="divide-y divide-black/5 dark:divide-white/5">
                                    {logs.map((log) => (
                                        <div key={log.id} className="p-4 sm:p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors group">
                                            <div className="flex gap-4">
                                                <div className="mt-1 shrink-0">
                                                    <div className={cn(
                                                        "w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner",
                                                        log.action_type.includes("CREATE") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                                            log.action_type.includes("DELETE") ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                                                log.action_type.includes("LOGIN") ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                                                                    "bg-primary/10 border-primary/20 text-primary"
                                                    )}>
                                                        <Activity className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">{log.action_type.replace(/_/g, " ")}</h4>
                                                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3 text-muted-foreground/70" />
                                                            {format(new Date(log.timestamp || log.created_at), "HH:mm:ss • MMM d")}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-foreground/85 font-medium leading-relaxed">{log.description}</p>
                                                    <div className="flex items-center gap-4 pt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                                            <Globe className="w-3 h-3" /> {log.ip_address || "Internal System"}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium truncate max-w-[200px]">
                                                            <Terminal className="w-3 h-3" /> {log.user_agent?.split(" ")[0] || "Browser"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
