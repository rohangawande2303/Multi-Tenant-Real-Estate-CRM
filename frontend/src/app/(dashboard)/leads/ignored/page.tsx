"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
    ChevronLeft, 
    AlertCircle, 
    Calendar, 
    User, 
    Mail, 
    Phone, 
    Clock, 
    Loader2,
    ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/axios";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface IgnoredLead {
    id: string;
    name: string;
    phone: string;
    agent_name: string;
    agent_email: string;
    assigned_date: string;
    follow_up_date: string;
    days_overdue: number;
}

function IgnoredLeadsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectId = searchParams.get("project_id");
    
    const [leads, setLeads] = useState<IgnoredLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchIgnored = async () => {
            setLoading(true);
            try {
                const params = projectId ? { project_id: projectId } : {};
                const response = await api.get("/leads/ignored", { params });
                setLeads(response.data);
                setError(null);
            } catch (err: any) {
                console.error("Failed to fetch ignored leads:", err);
                setError("Failed to load overdue leads");
            } finally {
                setLoading(false);
            }
        };

        fetchIgnored();
    }, [projectId]);

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Loading overdue leads...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.back()}
                        className="rounded-full h-10 w-10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            Ignored Leads
                            <Badge variant="destructive" className="rounded-full px-3 py-1 text-sm font-black">
                                {leads.length}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground font-medium">
                            Leads with past-due follow-ups requiring immediate attention.
                        </p>
                    </div>
                </div>
            </div>

            {error ? (
                <Card className="glass-card-pro border-destructive/20 bg-destructive/5 rounded-2xl">
                    <CardContent className="flex items-center gap-4 py-8 text-destructive">
                        <AlertCircle className="w-8 h-8" />
                        <p className="font-bold">{error}</p>
                    </CardContent>
                </Card>
            ) : leads.length === 0 ? (
                <Card className="glass-card-pro py-20 rounded-3xl">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
                            <Clock className="w-10 h-10" />
                        </div>
                        <div className="max-w-xs space-y-1.5">
                            <h3 className="font-bold text-xl text-foreground">Inbox Cleared!</h3>
                            <p className="text-muted-foreground text-sm font-medium">
                                No leads have overdue follow-ups for this project. Keep it up!
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <div className="glass-card-pro overflow-hidden rounded-2xl shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-black/[0.02] dark:bg-white/[0.03] border-b border-black/5 dark:border-white/10">
                                        <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider text-muted-foreground whitespace-nowrap">Lead Details</th>
                                        <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider text-muted-foreground whitespace-nowrap">Assigned Agent</th>
                                        <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider text-muted-foreground whitespace-nowrap">Assignment Date</th>
                                        <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider text-muted-foreground whitespace-nowrap">Follow-up Due</th>
                                        <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider text-muted-foreground whitespace-nowrap text-right">Overdue By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {leads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors group cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">{lead.name}</span>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                        <Phone className="w-3 h-3 text-emerald-500" />
                                                        {lead.phone}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3.5 h-3.5 text-primary" />
                                                        <span className="font-semibold text-foreground">{lead.agent_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                        <Mail className="w-3 h-3" />
                                                        {lead.agent_email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {format(new Date(lead.assigned_date), "MMM dd, yyyy")}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-destructive font-bold">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {format(new Date(lead.follow_up_date), "MMM dd, yyyy")}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right">
                                                <Badge variant="destructive" className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                                    {lead.days_overdue} {lead.days_overdue === 1 ? 'Day' : 'Days'} Overdue
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function IgnoredLeadsPage() {
    return (
        <React.Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>}>
            <IgnoredLeadsContent />
        </React.Suspense>
    );
}
