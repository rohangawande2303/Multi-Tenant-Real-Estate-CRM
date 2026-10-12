"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Building2, ArrowLeft, Save, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/axios";
import { useToast } from "@/contexts/toast-context";

export default function ClientManagePage() {
    const { id } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [client, setClient] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const response = await api.get("/tenants/");
                const found = response.data.find((t: any) => t.id === parseInt(id as string));
                setClient(found);
            } catch (err) {
                console.error("Failed to fetch client:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchClient();
    }, [id]);

    if (isLoading) return <div className="p-20 text-center">Loading settings...</div>;
    if (!client) return <div className="p-20 text-center">Client not found.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/agency/clients")} className="hover:bg-white/10">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title={`Manage ${client.name}`}
                    description={`Configuration and overrides for ${client.domain}`}
                    icon={Building2}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="glass-card border-white/10 bg-card/40">
                    <CardHeader>
                        <CardTitle className="text-lg">Tenant Architecture</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Isolation Architecture</Label>
                            <Input defaultValue="PostgreSQL Schema Isolation" className="glass border-white/10" readOnly />
                        </div>
                        <div className="space-y-2">
                            <Label>Dedicated Schema</Label>
                            <Input defaultValue={`client_${client.domain.replace(/\./g, '_')}`} className="glass border-white/10" readOnly />
                        </div>
                        <div className="space-y-2">
                            <Label>Data Boundary</Label>
                            <Input defaultValue="Independent Multi-Tenant Partition" className="glass border-white/10" readOnly />
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-white/10 bg-card/40">
                    <CardHeader>
                        <CardTitle className="text-lg">Security & Access</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Two-Factor Auth</Label>
                                <p className="text-sm text-muted-foreground font-medium">Force 2FA for all users in this tenant.</p>
                            </div>
                            <Switch checked={true} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Public Domain Access</Label>
                                <p className="text-sm text-muted-foreground font-medium">Allow access from {client.domain} only.</p>
                            </div>
                            <Switch checked={false} />
                        </div>
                        <div className="pt-4 border-t border-white/5">
                            <Button variant="destructive" className="w-full font-bold">
                                <ShieldAlert className="w-4 h-4 mr-2" />
                                Force Logout All Users
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button className="purple-gradient font-bold px-8 shadow-lg shadow-primary/20" onClick={() => toast("Settings saved (DEMO)", "success")}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                </Button>
            </div>
        </div>
    );
}
