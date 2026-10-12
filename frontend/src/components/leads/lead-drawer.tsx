"use client";

import React from "react";
import { X, Mail, Phone, MapPin, DollarSign, Calendar, User, Info, FileText, Edit3 } from "lucide-react";
import { Lead } from "@/types/lead";
import { StatusBadge, SourceBadge, PriorityBadge } from "./lead-badges";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface LeadDrawerProps {
    lead: Lead | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (lead: Lead) => void;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function getAvatarColor(name: string): string {
    const colors = [
        "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500",
        "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function formatCurrency(val?: string | null): string {
    if (!val) return "N/A";
    const num = Number(val);
    if (isNaN(num)) return val;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toLocaleString()}`;
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return "N/A";
    try {
        return format(new Date(dateStr), "MMM dd, yyyy");
    } catch {
        return dateStr;
    }
}

export function LeadDrawer({ lead, isOpen, onClose, onEdit }: LeadDrawerProps) {
    if (!lead) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div
                className={cn(
                    "fixed top-0 right-0 h-full w-full max-w-[420px] bg-background/90 dark:bg-background/85 backdrop-blur-2xl border-l border-white/60 dark:border-white/10 shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-foreground">Lead Details</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onEdit(lead)}
                            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit Lead"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Profile Section */}
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md", getAvatarColor(lead.name))}>
                            {getInitials(lead.name)}
                        </div>
                        <h3 className="text-xl font-bold text-foreground">{lead.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            <StatusBadge status={lead.status} />
                            <PriorityBadge priority={lead.lead_rating || (lead.custom_fields as any)?.priority} />
                        </div>
                    </div>

                    {/* Contact Info */}
                    <Section title="Contact Information" icon={<Mail className="w-4 h-4 text-primary" />}>
                        <InfoRow icon={<Mail className="w-4 h-4 text-muted-foreground" />} value={lead.email || "N/A"} />
                        <InfoRow icon={<Phone className="w-4 h-4 text-muted-foreground" />} value={lead.phone} />
                    </Section>

                    {/* Property Interest */}
                    <Section title="Property Interest" icon={<Info className="w-4 h-4 text-primary" />}>
                        <DetailRow label="Type:" value={(lead.custom_fields as any)?.property_type || "N/A"} />
                        <InfoRow icon={<MapPin className="w-4 h-4 text-muted-foreground" />} value={lead.city || "N/A"} />
                        <InfoRow
                            icon={<DollarSign className="w-4 h-4 text-muted-foreground" />}
                            value={lead.budget_min || lead.budget_max
                                ? `${formatCurrency(lead.budget_min)} - ${formatCurrency(lead.budget_max)}`
                                : "N/A"
                            }
                        />
                    </Section>

                    {/* Lead Information */}
                    <Section title="Lead Information" icon={<Info className="w-4 h-4 text-primary" />}>
                        <DetailRow label="Source:" value={<SourceBadge source={lead.source_group} />} />
                        <DetailRow label="Assigned to:" value={
                            <span className="font-semibold text-foreground">
                                {lead.first_sales_owner_email || "Unassigned"}
                            </span>
                        } />
                    </Section>

                    {/* Timeline */}
                    <Section title="Timeline" icon={<Calendar className="w-4 h-4 text-primary" />}>
                        <DetailRow label="Created:" value={formatDate(lead.created_at)} />
                        <DetailRow label="Updated:" value={formatDate(lead.updated_at)} />
                    </Section>

                    {/* Notes */}
                    <Section title="Notes" icon={<FileText className="w-4 h-4 text-primary" />}>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {(lead.custom_fields as any)?.notes || "No notes available."}
                        </p>
                    </Section>
                </div>
            </div>
        </>
    );
}

// ── Helper Sub-Components ────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="space-y-3 bg-white/40 dark:bg-white/[0.03] p-4 rounded-2xl border border-white/60 dark:border-white/10">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                {icon}
                <h4>{title}</h4>
            </div>
            <div className="space-y-2 pl-1">{children}</div>
        </div>
    );
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
    return (
        <div className="flex items-center gap-2.5 text-sm text-foreground/80">
            {icon}
            <span className="truncate">{value}</span>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground font-medium">{typeof value === 'string' ? value : value}</span>
        </div>
    );
}
