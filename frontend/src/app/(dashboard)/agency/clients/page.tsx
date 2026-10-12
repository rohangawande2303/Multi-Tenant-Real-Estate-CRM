/**
 * File: src/app/(dashboard)/agency/clients/page.tsx
 * Purpose: Agency-level client (tenant) management
 */

"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    Building,
    Plus,
    ExternalLink,
    ShieldCheck,
    MoreVertical,
    BarChart3,
    RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/contexts/toast-context";
import { SuspendModal } from "@/components/agency/suspend-modal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { mockStore } from "@/lib/mock-store";
import { useEffect, useState } from "react";
import api from "@/lib/axios";

export default function AgencyClientsPage() {
    const { toast } = useToast();
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/tenants/");
            setClients(response.data);
        } catch (err) {
            console.error("Failed to fetch clients:", err);
            mockStore.init();
            setClients(mockStore.get().tenants);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleSuspend = async (reason: string) => {
        if (!selectedClient) return;
        try {
            await api.post(`/tenants/${selectedClient.id}/suspend?reason=${encodeURIComponent(reason)}`);
            toast(`Client ${selectedClient.name} suspended successfully`, "success");
            fetchClients();
        } catch (err: any) {
            toast(err.message || "Failed to suspend client", "error");
        }
    };

    const handleRestore = async (client: any) => {
        try {
            await api.post(`/tenants/${client.id}/restore`);
            toast(`Client ${client.name} access restored`, "success");
            fetchClients();
        } catch (err: any) {
            toast(err.message || "Failed to restore client", "error");
        }
    };

    const stats = [
        { label: "Active Tenants", value: clients.length, icon: Building, color: "purple" },
        { label: "System Health", value: "100%", icon: ShieldCheck, color: "emerald" },
        { label: "Total Leads Managed", value: "4.6k", icon: BarChart3, color: "blue" }
    ];
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Agency Clients</h1>
                    <p className="text-muted-foreground font-medium">Manage your CRM tenants and database deployments.</p>
                </div>
                <Link href="/agency/clients/new">
                    <Button className="purple-gradient shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Onboard Client
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((s, idx) => (
                    <div key={idx} className="glass-card-pro p-6 rounded-2xl border-white/70 dark:border-white/10 flex items-center gap-4 shadow-md">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner",
                            s.color === "purple" ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20" :
                                s.color === "emerald" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                                    "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        )}>
                            <s.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold tracking-tight text-foreground">{s.value}</p>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-white/70 dark:border-white/10 overflow-hidden glass-card-pro shadow-lg">
                <Table>
                    <TableHeader className="bg-black/[0.02] dark:bg-white/[0.03]">
                        <TableRow className="border-black/5 dark:border-white/5 hover:bg-transparent">
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client Name</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Architecture</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Usage</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        Loading clients...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : clients.length > 0 ? clients.map((client) => (
                            <TableRow key={client.id} className="border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                                <TableCell>
                                    <div>
                                        <p className="font-bold text-foreground flex items-center gap-2">
                                            {client.name}
                                            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{client.domain}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary font-semibold text-xs">
                                        {client.schema_name ? `Schema: ${client.schema_name}` : "Dedicated Schema"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs font-medium space-y-0.5 text-foreground">
                                        <p className="font-semibold">{client.users_count || 0} Users</p>
                                        <p className="text-muted-foreground">{client.projects_count || 0} Projects</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {client.is_suspended ? (
                                        <Badge variant="destructive" className="font-semibold text-xs">Suspended</Badge>
                                    ) : client.is_active ? (
                                        <Badge variant="success" className="font-semibold text-xs">Active</Badge>
                                    ) : (
                                        <Badge variant="warning" className="font-semibold text-xs">Pending</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground rounded-lg">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-xl border-border rounded-xl">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/agency/clients/${client.id}/manage`} className="cursor-pointer font-medium">Manage Settings</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/agency/clients/${client.id}/analytics`} className="cursor-pointer font-medium">View Analytics</Link>
                                            </DropdownMenuItem>
                                            {client.is_suspended ? (
                                                <DropdownMenuItem onClick={() => handleRestore(client)} className="text-emerald-500 font-semibold cursor-pointer">
                                                    <RotateCcw className="w-3 h-3 mr-2" />
                                                    Restore Access
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem onClick={() => { setSelectedClient(client); setIsSuspendModalOpen(true); }} className="text-red-500 font-semibold cursor-pointer">
                                                    Suspend Access
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No clients found. Click "Onboard Client" to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {selectedClient && (
                <SuspendModal
                    isOpen={isSuspendModalOpen}
                    onClose={() => setIsSuspendModalOpen(false)}
                    onConfirm={handleSuspend}
                    clientName={selectedClient.name}
                />
            )}
        </div>
    );
}
