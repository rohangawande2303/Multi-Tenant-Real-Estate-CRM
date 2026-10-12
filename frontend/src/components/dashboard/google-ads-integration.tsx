"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Copy, Rocket, Loader2, Trash2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";

interface Integration {
    id: string;
    is_active: boolean;
    verified: boolean;
    verified_at?: string;
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

export function GoogleAdsIntegration() {
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

            // Fetch existing Google Ads integrations (we take the first one for this UI)
            const intgRes = await fetch("http://localhost:8000/api/v1/integrations/?source_type=google_ads", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const intgData = await intgRes.json();
            
            if (intgData.integrations && intgData.integrations.length > 0) {
                // Get full status for the first one
                const statusRes = await fetch(`http://localhost:8000/api/v1/integrations/google-ads/${intgData.integrations[0].id}/status`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const statusData = await statusRes.json();
                setIntegration({ ...statusData, id: intgData.integrations[0].id });
            }
        } catch (error) {
            console.error("Error fetching Google Ads data:", error);
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
            const res = await fetch(`http://localhost:8000/api/v1/integrations/google-ads/?project_id=${selectedProjectId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Failed to create integration");
            
            toast("Google Ads webhook generated!", "success");
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
        if (!confirm("Are you sure you want to disconnect Google Ads?")) return;
        
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
            <div className="glass-card-pro animate-pulse h-64 flex items-center justify-center p-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="glass-card-pro p-6 overflow-hidden relative space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 shadow-sm">
                        <svg className="w-5 h-5 fill-red-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.6v3.1h3.9c2.28-2.15 3.6-5.43 3.6-8.94l-.08-.02z"/><path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.1c-1.08.72-2.45 1.16-4.03 1.16-3.13 0-5.78-2.11-6.73-4.96H1.36v3.1C3.42 21.41 7.42 24 12.255 24z"/><path fill="#FBBC05" d="M5.525 14.19c-.25-.74-.39-1.54-.39-2.36s.14-1.62.39-2.36V6.37H1.36A11.97 11.97 0 0 0 0 11.83c0 1.96.47 3.83 1.36 5.51l4.165-3.15z"/><path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.42 0 3.42 2.59 1.36 6.37l4.165 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Google Ads Lead Forms</h3>
                        <p className="text-xs text-muted-foreground">Instant server-to-server lead delivery via Direct Webhook.</p>
                    </div>
                </div>

                <div>
                    {integration?.verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
                            <CheckCircle2 className="w-3 h-3 stroke-[2]" /> Verified
                        </span>
                    ) : integration ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                            Pending First Lead
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Error Banner */}
            {integration?.last_error && (
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3.5 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-semibold text-rose-600 dark:text-rose-400 text-xs">Delivery Error</h4>
                        <p className="text-xs text-rose-600/90 dark:text-rose-300 mt-0.5">{integration.last_error}</p>
                    </div>
                </div>
            )}

            {!integration ? (
                <div className="space-y-4 pt-1">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Select CRM Project for Webhook</h4>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-xs text-foreground">
                                <SelectValue placeholder="Choose CRM Project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button 
                        className="w-full purple-gradient text-white text-xs font-semibold h-9 rounded-full shadow-md shadow-primary/25"
                        onClick={handleCreateIntegration}
                        disabled={!selectedProjectId || isSaving}
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5 mr-1.5" />}
                        Generate Google Webhook Endpoint
                    </Button>
                </div>
            ) : (
                <div className="space-y-5 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Step 1 */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">1. Webhook URL</span>
                            <div className="flex gap-2">
                                <Input readOnly value={integration.webhook_url} className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-xs font-mono text-foreground" />
                                <Button size="icon" variant="secondary" className="h-9 w-9 shrink-0" onClick={() => copyToClipboard(integration.webhook_url, "URL")}>
                                    <Copy className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                        {/* Step 2 */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">2. Secret Key (Token)</span>
                            <div className="flex gap-2">
                                <Input readOnly value={integration.client_token} className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-xs font-mono text-foreground" />
                                <Button size="icon" variant="secondary" className="h-9 w-9 shrink-0" onClick={() => copyToClipboard(integration.client_token, "Key")}>
                                    <Copy className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/50 dark:bg-white/[0.03] rounded-xl p-4 border border-white/70 dark:border-white/10 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">3</span>
                            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Finalize in Google Ads Campaign</h4>
                        </div>
                        <p className="text-xs text-muted-foreground ml-7 leading-relaxed">
                            In your Google Ads campaign, navigate to <b>Asset → Lead Form → Lead Delivery</b>. 
                            Paste the <b>URL</b> and <b>Key</b> above, then click <b>"Send Test Data"</b>.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/60">
                        <div className="bg-white/50 dark:bg-white/[0.03] rounded-xl p-3 border border-white/70 dark:border-white/10 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Leads</p>
                            <p className="text-xl font-bold text-foreground tabular-nums mt-0.5">{integration.total_leads}</p>
                        </div>
                        <div className="bg-white/50 dark:bg-white/[0.03] rounded-xl p-3 border border-white/70 dark:border-white/10 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Last Ingested</p>
                            <p className="text-xs font-semibold text-foreground truncate mt-1">
                                {integration.last_lead_at ? new Date(integration.last_lead_at).toLocaleTimeString() : "No data"}
                            </p>
                        </div>
                        <div className="flex items-center justify-end">
                            <Button variant="ghost" size="sm" className="text-xs text-rose-500 hover:bg-rose-500/10" onClick={disconnect}>
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Disconnect
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
