/**
 * File: src/app/(dashboard)/leads/page.tsx
 * Purpose: Lead management page with card layout, drawer, edit modal, and dynamic filters
 */

"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
    Plus, Search, Download, Upload, RefreshCw, Loader2,
    AlertCircle, Eye, Edit3, Filter, MapPin, DollarSign,
    Mail, Phone, Calendar, ChevronDown, X
} from "lucide-react";
import { useToast } from "@/contexts/toast-context";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExcelModal } from "@/components/leads/excel-modal";
import { CreateLeadModal } from "@/components/leads/create-lead-modal";
import { LeadDrawer } from "@/components/leads/lead-drawer";
import { LeadEditModal } from "@/components/leads/lead-edit-modal";
import { StatusBadge, SourceBadge } from "@/components/leads/lead-badges";
import { useLeads, useLeadOptions } from "@/hooks/use-leads";
import { useProjects } from "@/hooks/use-projects";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Lead } from "@/types/lead";
import { format } from "date-fns";

export default function LeadsPage() {
    const { activeProjectId, role } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [sourceFilter, setSourceFilter] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const LEADS_PER_PAGE = 25;

    // Drawer + Modal state
    const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
    const [editLead, setEditLead] = useState<Lead | null>(null);

    const { projects } = useProjects();
    const activeProject = projects.find(p => p.id === activeProjectId);
    const options = useLeadOptions(activeProjectId || undefined);

    // Debounced search (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { leads, total, loading, refresh } = useLeads(
        (currentPage - 1) * LEADS_PER_PAGE,
        LEADS_PER_PAGE,
        activeProjectId || undefined,
        statusFilter,
        sourceFilter,
        debouncedSearch || null
    );

    const canInteract = !!activeProjectId;
    const totalPages = Math.ceil(total / LEADS_PER_PAGE);
    const { toast } = useToast();

    // Check if user has edit permissions
    const canEdit = useMemo(() => {
        const editRoles = ["AGENCY", "AGENCY_ADMIN", "DEVELOPER", "CLIENT_ADMIN"];
        return editRoles.includes(role || "");
    }, [role]);

    const handleExport = useCallback(async () => {
        if (!canInteract) return;
        try {
            toast("Exporting leads...", "info");
            const response = await api.get(`/data/${activeProjectId}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `leads_${activeProject?.name || 'export'}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast("Export completed successfully", "success");
        } catch (error) {
            console.error("Export failed:", error);
            toast("Failed to export leads", "error");
        }
    }, [canInteract, activeProjectId, activeProject, toast]);

    const handleOpenDrawer = useCallback((lead: Lead) => {
        setDrawerLead(lead);
    }, []);

    const handleOpenEdit = useCallback((lead: Lead) => {
        setEditLead(lead);
    }, []);

    const clearFilters = useCallback(() => {
        setStatusFilter(null);
        setSourceFilter(null);
        setSearchTerm("");
        setDebouncedSearch("");
        setCurrentPage(1);
    }, []);

    const hasActiveFilters = statusFilter || sourceFilter || debouncedSearch;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
            <ExcelModal isOpen={isExcelModalOpen} onClose={() => setIsExcelModalOpen(false)} />
            <CreateLeadModal isOpen={isCreateLeadOpen} onClose={() => { setIsCreateLeadOpen(false); refresh(); }} />
            <LeadDrawer
                lead={drawerLead}
                isOpen={!!drawerLead}
                onClose={() => setDrawerLead(null)}
                onEdit={handleOpenEdit}
            />
            <LeadEditModal
                lead={editLead}
                isOpen={!!editLead}
                onClose={() => setEditLead(null)}
                onSaved={refresh}
            />

            {/* ── Header ────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        Lead Management
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {activeProject
                            ? `Track and manage leads for ${activeProject.name}`
                            : "Select a project to manage leads"}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-xl"
                        onClick={handleExport}
                        disabled={!canInteract || leads.length === 0}
                    >
                        <Download className="w-4 h-4 mr-1.5" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-xl"
                        onClick={() => setIsExcelModalOpen(true)}
                        disabled={!canInteract}
                    >
                        <Upload className="w-4 h-4 mr-1.5" />
                        Upload Sheet
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-md shadow-primary/25"
                        onClick={() => setIsCreateLeadOpen(true)}
                        disabled={!canInteract}
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Lead
                    </Button>
                </div>
            </div>

            {/* ── No Project Warning ─────────────────────── */}
            {!canInteract && (
                <div className="p-8 rounded-2xl glass-card-pro border-amber-500/30 flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground text-lg">No Project Selected</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Select an active project in the project selector to start managing leads.
                        </p>
                    </div>
                </div>
            )}

            {canInteract && (
                <>
                    {/* ── Filter Bar ──────────────────────────── */}
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center glass-card-pro rounded-2xl p-3 shadow-md">
                        {/* Search */}
                        <div className="relative flex-1 min-w-0">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search leads by name, email, or phone..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/60"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Source Filter */}
                        <FilterDropdown
                            label="All Sources"
                            value={sourceFilter}
                            options={options.sources.map(s => ({ value: s, label: s.replace(/_/g, " ") }))}
                            onChange={v => { setSourceFilter(v); setCurrentPage(1); }}
                        />

                        {/* Status Filter */}
                        <FilterDropdown
                            label="All Status"
                            value={statusFilter}
                            options={options.statuses.map(s => ({ value: s, label: s.replace(/_/g, " ") }))}
                            onChange={v => { setStatusFilter(v); setCurrentPage(1); }}
                        />

                        {/* Refresh */}
                        <button
                            onClick={() => refresh()}
                            className="p-2.5 rounded-xl border border-white/80 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                    </div>

                    {/* Active Filters + Count */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Filter className="w-4 h-4 text-primary" />
                            <span>Showing <strong className="text-foreground">{leads.length}</strong> of <strong className="text-foreground">{total}</strong> leads</span>

                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="ml-2 text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                                >
                                    <X className="w-3 h-3" /> Clear filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Lead Cards List ─────────────────────── */}
                    <div className="space-y-3">
                        {loading ? (
                            <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                <p className="text-sm font-medium">Loading leads...</p>
                            </div>
                        ) : leads.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground glass-card-pro rounded-2xl p-8 text-center">
                                <AlertCircle className="w-10 h-10 text-muted-foreground/60" />
                                <p className="text-sm font-medium text-foreground">No leads found</p>
                                <p className="text-xs text-muted-foreground">Try adjusting your filters or add a new lead.</p>
                            </div>
                        ) : (
                            leads.map(lead => (
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onView={handleOpenDrawer}
                                    onEdit={canEdit ? handleOpenEdit : undefined}
                                />
                            ))
                        )}
                    </div>

                    {/* ── Pagination ──────────────────────────── */}
                    {!loading && total > LEADS_PER_PAGE && (
                        <div className="flex items-center justify-between pt-2 pb-8">
                            <p className="text-xs text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </p>
                            <div className="flex gap-1.5">
                                <button
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-xl text-xs font-medium border border-white/80 dark:border-white/10 text-foreground hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    Previous
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const page = i + 1;
                                    return (
                                        <button
                                            key={page}
                                            className={cn(
                                                "w-8 h-8 rounded-xl text-xs font-medium transition-colors",
                                                currentPage === page
                                                    ? "bg-primary text-white shadow-sm"
                                                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                                            )}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                                <button
                                    disabled={currentPage >= totalPages}
                                    className="px-3 py-1.5 rounded-xl text-xs font-medium border border-white/80 dark:border-white/10 text-foreground hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
                                    onClick={() => setCurrentPage(p => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ── LEAD CARD COMPONENT ──────────────────────────────────────────

function LeadCard({
    lead,
    onView,
    onEdit
}: {
    lead: Lead;
    onView: (lead: Lead) => void;
    onEdit?: (lead: Lead) => void;
}) {
    const avatarColors = [
        "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500",
        "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500"
    ];
    let hash = 0;
    for (let i = 0; i < lead.name.length; i++) hash = lead.name.charCodeAt(i) + ((hash << 5) - hash);
    const avatarColor = avatarColors[Math.abs(hash) % avatarColors.length];
    const initials = lead.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    const formatBudget = (min?: string | null, max?: string | null) => {
        const fmt = (v: string) => {
            const n = Number(v);
            if (isNaN(n)) return v;
            if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
            if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
            return `$${n}`;
        };
        if (min && max) return `${fmt(min)} - ${fmt(max)}`;
        if (min) return `${fmt(min)}+`;
        if (max) return `Up to ${fmt(max)}`;
        return null;
    };

    const budgetStr = formatBudget(lead.budget_min, lead.budget_max);
    const createdStr = (() => {
        try { return format(new Date(lead.created_at), "MMM dd, yyyy"); } catch { return ""; }
    })();

    // Determine priority indicator color
    const priorityColor = (() => {
        const p = (lead.lead_rating || (lead.custom_fields as any)?.priority || "").toUpperCase();
        if (p === "HIGH") return "bg-red-500";
        if (p === "MEDIUM") return "bg-amber-500";
        if (p === "LOW") return "bg-green-500";
        return "bg-slate-400";
    })();

    return (
        <div className="glass-card-pro glass-card-hover rounded-2xl p-4 md:p-5 transition-all duration-300 group">
            <div className="flex items-center gap-4">
                {/* Avatar + Priority dot */}
                <div className="relative shrink-0">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white text-xs font-bold select-none shadow-sm", avatarColor)}>
                        {initials}
                    </div>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background", priorityColor)} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-bold text-foreground text-base tracking-tight truncate">{lead.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                {lead.email && (
                                    <span className="flex items-center gap-1 truncate">
                                        <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" /> {lead.email}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" /> {lead.phone}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                                onClick={() => onView(lead)}
                                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                title="View Details"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(lead)}
                                    className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Edit Lead"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Badges + Meta Row */}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <StatusBadge status={lead.status} />
                        <SourceBadge source={lead.source_group} />

                        {lead.city && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" /> {lead.city}
                            </span>
                        )}

                        {budgetStr && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <DollarSign className="w-3.5 h-3.5 text-muted-foreground/70" /> {budgetStr}
                            </span>
                        )}
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between mt-2.5 text-xs text-muted-foreground border-t border-black/5 dark:border-white/5 pt-2">
                        {createdStr && (
                            <span className="flex items-center gap-1 text-[11px]">
                                <Calendar className="w-3 h-3 text-muted-foreground/70" /> Created {createdStr}
                            </span>
                        )}
                        {lead.first_sales_owner_email && (
                            <span className="truncate ml-4 text-[11px]">
                                Assigned to: <strong className="text-foreground">{lead.first_sales_owner_email}</strong>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── FILTER DROPDOWN ──────────────────────────────────────────────

function FilterDropdown({
    label,
    value,
    options,
    onChange
}: {
    label: string;
    value: string | null;
    options: { value: string; label: string }[];
    onChange: (v: string | null) => void;
}) {
    return (
        <div className="relative shrink-0">
            <select
                className="appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-white/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-colors min-w-[130px] font-medium"
                value={value || ""}
                onChange={e => onChange(e.target.value || null)}
            >
                <option value="" className="bg-popover text-popover-foreground">{label}</option>
                {options.map(o => (
                    <option key={o.value} value={o.value} className="bg-popover text-popover-foreground">
                        {o.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
    );
}
