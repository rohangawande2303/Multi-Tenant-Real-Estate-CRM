"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Copy, Code, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/contexts/toast-context";

interface Integration {
    id: string;
    is_active: boolean;
    total_leads: number;
    last_lead_at?: string;
    last_error?: string;
    last_error_at?: string;
    webhook_url: string;
    client_token: string;
}

interface Project {
    id: number;
    name: string;
}

export function WebsiteIntegration() {
    const { toast } = useToast();
    const [integration, setIntegration] = useState<Integration | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            // Fetch Projects
            const projRes = await fetch("http://localhost:8000/api/v1/projects/", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const projData = await projRes.json();
            if (Array.isArray(projData)) {
                setProjects(projData);
                // Auto-select if there is exactly 1 project
                if (projData.length === 1) {
                    setSelectedProjectId(projData[0].id.toString());
                }
            }

            // Fetch existing Website integrations
            const intgRes = await fetch("http://localhost:8000/api/v1/integrations/?source_type=website", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const intgData = await intgRes.json();
            
            if (intgData.integrations && intgData.integrations.length > 0) {
                // Get full status for the first one
                const statusRes = await fetch(`http://localhost:8000/api/v1/integrations/website/${intgData.integrations[0].id}/status`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const statusData = await statusRes.json();
                setIntegration({ ...statusData, id: intgData.integrations[0].id });
            }
        } catch (error) {
            console.error("Error fetching Website integration data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateIntegration = async () => {
        if (!selectedProjectId) {
            toast("Please select a project first", "error");
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`http://localhost:8000/api/v1/integrations/website/?project_id=${selectedProjectId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Failed to create integration");
            
            toast("Website Tracking Snippet generated!", "success");
            fetchData();
        } catch (error: any) {
            toast(error.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast(`${label} copied!`, "success");
    };

    const disconnect = async () => {
        if (!integration) return;
        if (!confirm("Are you sure you want to disconnect Website tracking? Leads will stop coming in.")) return;
        
        try {
            const token = localStorage.getItem("access_token");
            await fetch(`http://localhost:8000/api/v1/integrations/${integration.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            setIntegration(null);
            toast("Disconnected", "success");
        } catch (error) {
            toast("Failed to disconnect", "error");
        }
    };

    if (isLoading) {
        return (
            <Card className="glass-card border-white/5 animate-pulse h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </Card>
        );
    }

    return (
        <Card className="glass-card-pro overflow-hidden relative border-emerald-500/30 shadow-lg">
            <div className="absolute top-0 right-0 p-4 flex gap-2">
                {integration && integration.total_leads > 0 ? (
                    <Badge variant="success" className="gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Receiving Data
                    </Badge>
                ) : integration ? (
                    <Badge variant="outline" className="gap-1.5 px-3 py-1 text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs font-semibold rounded-full">
                        Waiting for first lead...
                    </Badge>
                ) : null}
            </div>

            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                        <Code className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-bold tracking-tight text-foreground">Website Forms (JS Snippet)</CardTitle>
                        <CardDescription className="text-muted-foreground text-xs mt-0.5">Capture leads from any website builder automatically.</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {integration?.last_error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-bold text-red-600 dark:text-red-400 text-sm">Ingestion Error</h4>
                            <p className="text-xs text-red-600/80 dark:text-red-300 mt-1">{integration.last_error}</p>
                        </div>
                    </div>
                )}

                {!integration ? (
                    <div className="space-y-6 py-2">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm text-foreground">Select a project to generate your tracking script:</h3>
                            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                <SelectTrigger className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground shadow-sm rounded-xl">
                                    <SelectValue placeholder="Choose CRM Project" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover/95 backdrop-blur-xl border-border">
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button 
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all"
                                onClick={handleCreateIntegration}
                                disabled={!selectedProjectId || isSaving}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Code className="w-4 h-4 mr-2" />}
                                Generate JS Snippet
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white/50 dark:bg-white/[0.03] rounded-2xl p-4 sm:p-5 border border-white/80 dark:border-white/10 space-y-4 shadow-sm">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Installation Instructions</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Copy the script below and paste it just before the closing <code className="bg-black/10 dark:bg-black/40 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">&lt;/body&gt;</code> tag on your website. 
                                    It works on WordPress, Wix, Squarespace, PHP, React, and simple HTML sites. 
                                    It will automatically capture any form submissions.
                                </p>
                            </div>
                            
                            <div className="relative group">
                                <pre className="bg-slate-900 dark:bg-black/70 p-4 rounded-xl text-emerald-400 text-xs overflow-x-auto border border-white/10 whitespace-pre-wrap font-mono shadow-inner">
                                    {`<script src="${integration.webhook_url}"></script>`}
                                </pre>
                                <Button 
                                    size="icon" 
                                    variant="secondary" 
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg shadow-sm"
                                    onClick={() => copyToClipboard(`<script src="${integration.webhook_url}"></script>`, "Snippet")}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/40 dark:border-white/10 items-center">
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Leads Caught</p>
                                <p className="text-xl font-bold text-foreground mt-0.5">{integration.total_leads}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Last Capture</p>
                                <p className="text-xs font-medium text-foreground mt-1">
                                    {integration.last_lead_at ? new Date(integration.last_lead_at).toLocaleTimeString() : "No data"}
                                </p>
                            </div>
                            <div className="flex items-center justify-end">
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl" onClick={disconnect}>
                                    <Trash2 className="w-4 h-4 mr-1.5" /> Remove
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
