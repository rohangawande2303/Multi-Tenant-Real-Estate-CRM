"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, RefreshCw, Plus, Trash2, Loader2, Play } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";

// Interfaces
interface TabMapping {
    tab_name: string;
    project_id: number;
    last_row_synced?: number;
}

interface Integration {
    id: string;
    source_name: string;
    is_active: boolean;
    total_leads_created: number;
    tabs: TabMapping[];
    last_synced_at?: string;
    last_error?: string;
    last_error_at?: string;
}

interface Project {
    id: number;
    name: string;
}

export function MetaSheetsIntegration() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [integration, setIntegration] = useState<Integration | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    
    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form States
    const [sheetUrl, setSheetUrl] = useState("");
    const [tabs, setTabs] = useState<TabMapping[]>([{ tab_name: "Sheet1", project_id: 0 }]);
    const [testError, setTestError] = useState("");
    const [testSuccess, setTestSuccess] = useState("");

    // Fetch integration and projects on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            // Fetch Meta Sheets Integrations
            const intgRes = await fetch("http://localhost:8000/api/v1/integrations/meta-sheets/", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const intgData = await intgRes.json();
            
            if (intgData.integrations && intgData.integrations.length > 0) {
                setIntegration(intgData.integrations[0]);
            }

            // Fetch Projects
            const projRes = await fetch("http://localhost:8000/api/v1/projects/", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const projData = await projRes.json();
            if (Array.isArray(projData)) {
                setProjects(projData);
                // Auto-select if there is exactly 1 project and the first tab doesn't have one selected
                if (projData.length === 1) {
                    setTabs(prev => {
                        const newTabs = [...prev];
                        if (newTabs[0] && !newTabs[0].project_id) {
                            newTabs[0].project_id = projData[0].id;
                        }
                        return newTabs;
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast("Failed to load integrations", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestConnection = async () => {
        if (!sheetUrl) {
            setTestError("Please enter a Google Sheet URL");
            return;
        }

        setIsTesting(true);
        setTestError("");
        setTestSuccess("");

        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch("http://localhost:8000/api/v1/integrations/meta-sheets/test", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sheet_url: sheetUrl,
                    tab: tabs[0].tab_name
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                setTestError(data.error || data.detail || "Connection failed. Please ensure the sheet is set to 'Anyone with link can view'.");
            } else {
                setTestSuccess(`Connected! Found headers: ${data.headers.join(", ")}`);
            }
        } catch (error) {
            setTestError("Network error while testing connection.");
        } finally {
            setIsTesting(false);
        }
    };

    const handleSaveIntegration = async () => {
        if (!sheetUrl) {
            toast("Please enter a Sheet URL", "error");
            return;
        }

        if (tabs.some(t => !t.project_id)) {
            toast("Please select a project for all tabs", "error");
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem("access_token");
            const payload = {
                source_name: "Meta Ads (Google Sheets)",
                sheet_url: sheetUrl,
                tabs: tabs
            };

            const url = integration 
                ? `http://localhost:8000/api/v1/integrations/meta-sheets/${integration.id}` 
                : "http://localhost:8000/api/v1/integrations/meta-sheets/";
                
            const method = integration ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Failed to save");

            toast("Integration saved successfully!", "success");
            fetchData(); // Reload state
        } catch (error: any) {
            toast(error.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSimulate = async () => {
        if (!integration) return;
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`http://localhost:8000/api/v1/integrations/meta-sheets/${integration.id}/simulate`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                toast(`Simulated ${data.leads_created} leads successfully!`, "success");
                fetchData();
            } else {
                toast("Failed to simulate leads", "error");
            }
        } catch (error) {
            toast("Network error during simulation", "error");
        }
    };

    const updateTab = (index: number, field: keyof TabMapping, value: any) => {
        const newTabs = [...tabs];
        newTabs[index] = { ...newTabs[index], [field]: value };
        setTabs(newTabs);
    };

    const addTab = () => {
        setTabs([...tabs, { tab_name: "", project_id: 0 }]);
    };

    const removeTab = (index: number) => {
        if (tabs.length === 1) return;
        setTabs(tabs.filter((_, i) => i !== index));
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
                    <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center shrink-0 shadow-sm">
                        <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Meta Ads → Google Sheets</h3>
                        <p className="text-xs text-muted-foreground">Automated zero-latency lead sync. No third-party tools required.</p>
                    </div>
                </div>

                <div>
                    {integration?.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
                            <CheckCircle2 className="w-3 h-3 stroke-[2]" /> Active Sync
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border">
                            Setup Pending
                        </span>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {integration?.last_error && (
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3.5 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-semibold text-rose-600 dark:text-rose-400 text-xs">Sync Interrupted</h4>
                        <p className="text-xs text-rose-600/90 dark:text-rose-300 mt-0.5">{integration.last_error}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Last checked: {new Date(integration.last_error_at || "").toLocaleString()}
                        </p>
                    </div>
                </div>
            )}

            {/* The 3-Step Setup UI */}
            {!integration ? (
                <div className="space-y-6 pt-1">
                    {/* Step 1 */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">1</span>
                            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Prepare your Google Sheet</h4>
                        </div>
                        <div className="ml-7 text-xs text-muted-foreground space-y-1 leading-relaxed">
                            <p>1. Route Meta lead forms to a target Google Sheet via Meta Lead Center.</p>
                            <p>2. Open the Sheet and click <b>Share</b>.</p>
                            <p>3. Set General Access to <b>"Anyone with the link can view"</b>.</p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">2</span>
                            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Paste Sheet URL</h4>
                        </div>
                        <div className="ml-7 flex gap-2.5">
                            <Input 
                                placeholder="https://docs.google.com/spreadsheets/d/..." 
                                value={sheetUrl}
                                onChange={(e) => setSheetUrl(e.target.value)}
                                className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-xs text-foreground"
                            />
                            <Button 
                                onClick={handleTestConnection} 
                                disabled={!sheetUrl || isTesting}
                                variant="secondary"
                                size="sm"
                                className="text-xs shrink-0 h-9"
                            >
                                {isTesting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : "Test Link"}
                            </Button>
                        </div>
                        
                        {testError && <p className="ml-7 text-xs text-rose-500 font-medium">{testError}</p>}
                        {testSuccess && <p className="ml-7 text-xs text-emerald-600 dark:text-emerald-400 font-medium">{testSuccess}</p>}
                    </div>

                    {/* Step 3 */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">3</span>
                            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Map Tabs to Projects</h4>
                        </div>
                        <div className="ml-7 space-y-2.5">
                            {tabs.map((tab, idx) => (
                                <div key={idx} className="flex gap-2.5 items-center">
                                    <Input 
                                        placeholder="Tab Name (e.g. Leads_2026)" 
                                        value={tab.tab_name}
                                        onChange={(e) => updateTab(idx, "tab_name", e.target.value)}
                                        className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-xs text-foreground w-1/3"
                                    />
                                    <Select 
                                        value={tab.project_id ? tab.project_id.toString() : ""} 
                                        onValueChange={(val) => updateTab(idx, "project_id", parseInt(val))}
                                    >
                                        <SelectTrigger className="w-1/2 bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-xs text-foreground">
                                            <SelectValue placeholder="Select Project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map(p => (
                                                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500" onClick={() => removeTab(idx)} disabled={tabs.length === 1}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={addTab} className="text-primary text-xs h-7 px-2">
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Tab Mapping
                            </Button>
                        </div>
                    </div>

                    <div className="ml-7 pt-2">
                        <Button 
                            className="purple-gradient text-white text-xs font-semibold px-5 h-9 rounded-full shadow-md shadow-primary/25"
                            onClick={handleSaveIntegration}
                            disabled={isSaving || !sheetUrl || !testSuccess}
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                            Activate Live Sync
                        </Button>
                    </div>
                </div>
            ) : (
                /* Connected State */
                <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/50 dark:bg-white/[0.03] rounded-xl p-3 border border-white/70 dark:border-white/10 shadow-xs">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total Ingested</p>
                            <p className="text-xl font-bold text-foreground tabular-nums mt-0.5">{integration.total_leads_created}</p>
                        </div>
                        <div className="bg-white/50 dark:bg-white/[0.03] rounded-xl p-3 border border-white/70 dark:border-white/10 shadow-xs">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Last Sync</p>
                            <p className="text-xs font-semibold text-foreground truncate mt-1">
                                {integration.last_synced_at ? new Date(integration.last_synced_at).toLocaleTimeString() : "Pending"}
                            </p>
                        </div>
                        <div className="bg-white/50 dark:bg-white/[0.03] rounded-xl p-3 border border-white/70 dark:border-white/10 shadow-xs">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Mapped Tabs</p>
                            <p className="text-xs font-semibold text-foreground mt-1">{integration.tabs?.length || 0} active</p>
                        </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-9 glass-card-pro" onClick={handleSimulate}>
                            <Play className="w-3.5 h-3.5 mr-1.5 text-primary" /> Test Intake Pipeline
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs h-9 text-rose-500 hover:bg-rose-500/10" onClick={() => {
                            fetch(`http://localhost:8000/api/v1/integrations/${integration.id}`, {
                                method: "DELETE",
                                headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` }
                            }).then(() => setIntegration(null));
                        }}>
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Disconnect
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
