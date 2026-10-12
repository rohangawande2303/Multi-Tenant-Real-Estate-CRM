"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, User, Loader2 } from "lucide-react";
import { Lead } from "@/types/lead";
import { useLeadOptions } from "@/hooks/use-leads";
import { useToast } from "@/contexts/toast-context";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";

interface LeadEditModalProps {
    lead: Lead | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export function LeadEditModal({ lead, isOpen, onClose, onSaved }: LeadEditModalProps) {
    const { toast } = useToast();
    const options = useLeadOptions(lead?.project_id);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        source_group: "",
        status: "",
        lead_rating: "",
        budget_min: "",
        budget_max: "",
        city: "",
        first_sales_owner_email: "",
        notes: "",
        property_type: "",
    });

    useEffect(() => {
        if (lead && isOpen) {
            const nameParts = (lead.name || "").split(" ");
            setForm({
                name: lead.name || "",
                email: lead.email || "",
                phone: lead.phone || "",
                source_group: lead.source_group || "",
                status: lead.status || "NEW",
                lead_rating: lead.lead_rating || (lead.custom_fields as any)?.priority || "",
                budget_min: lead.budget_min || "",
                budget_max: lead.budget_max || "",
                city: lead.city || "",
                first_sales_owner_email: lead.first_sales_owner_email || "",
                notes: (lead.custom_fields as any)?.notes || "",
                property_type: (lead.custom_fields as any)?.property_type || "",
            });
        }
    }, [lead, isOpen]);

    const handleChange = useCallback((field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSave = async () => {
        if (!lead) return;

        // Validate required fields
        if (!form.name.trim()) { toast("Name is required", "error"); return; }
        if (!form.email.trim()) { toast("Email is required", "error"); return; }
        if (!form.source_group) { toast("Source is required", "error"); return; }

        setSaving(true);
        try {
            const nameParts = form.name.trim().split(/\s+/);
            await api.patch(`/leads/${lead.id}`, {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                source_group: form.source_group,
                status: form.status,
                lead_rating: form.lead_rating,
                budget_min: form.budget_min,
                budget_max: form.budget_max,
                city: form.city.trim(),
                first_sales_owner_email: form.first_sales_owner_email.trim(),
                custom_fields: {
                    notes: form.notes,
                    property_type: form.property_type,
                },
            });
            toast("Lead updated successfully!", "success");
            onSaved();
            onClose();
        } catch (err: any) {
            console.error("Failed to update lead:", err);
            toast(err?.response?.data?.detail || "Failed to update lead", "error");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !lead) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white dark:bg-[#141820] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3040] w-full max-w-[580px] max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2a3040]">
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Lead</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1e2433] text-slate-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* Row: First Name / Last Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Full Name *" value={form.name} onChange={v => handleChange("name", v)} placeholder="Full Name" />
                            <FormField label="Email *" value={form.email} onChange={v => handleChange("email", v)} placeholder="name@email.com" type="email" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Phone" value={form.phone} onChange={v => handleChange("phone", v)} placeholder="(555) 123-4567" />
                            <FormSelect
                                label="Source *"
                                value={form.source_group}
                                onChange={v => handleChange("source_group", v)}
                                options={[
                                    ...options.sources.map(s => ({ value: s, label: s.replace(/_/g, " ") })),
                                    { value: "META_ADS", label: "Meta Ads" },
                                    { value: "GOOGLE_ADS", label: "Google Ads" },
                                    { value: "WEBSITE_FORM", label: "Website Form" },
                                    { value: "WALK_IN", label: "Walk In" },
                                    { value: "REFERRAL", label: "Referral" },
                                    { value: "PHONE_CALL", label: "Phone Call" },
                                    { value: "OTHERS", label: "Others" },
                                ].filter((v, i, a) => a.findIndex(x => x.value === v.value) === i)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormSelect
                                label="Status"
                                value={form.status}
                                onChange={v => handleChange("status", v)}
                                options={[
                                    ...options.statuses.map(s => ({ value: s, label: s.replace(/_/g, " ") })),
                                    { value: "NEW", label: "New" },
                                    { value: "CONTACTED", label: "Contacted" },
                                    { value: "QUALIFIED", label: "Qualified" },
                                    { value: "PROPOSAL_SENT", label: "Proposal Sent" },
                                    { value: "FOLLOW_UP", label: "Follow Up" },
                                    { value: "CLOSED_WON", label: "Closed Won" },
                                    { value: "CLOSED_LOST", label: "Closed Lost" },
                                ].filter((v, i, a) => a.findIndex(x => x.value === v.value) === i)}
                            />
                            <FormSelect
                                label="Property Type"
                                value={form.property_type}
                                onChange={v => handleChange("property_type", v)}
                                options={[
                                    { value: "", label: "Select" },
                                    { value: "Residential", label: "Residential" },
                                    { value: "Commercial", label: "Commercial" },
                                    { value: "Industrial", label: "Industrial" },
                                    { value: "Land", label: "Land" },
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormSelect
                                label="Priority"
                                value={form.lead_rating}
                                onChange={v => handleChange("lead_rating", v)}
                                options={[
                                    { value: "", label: "Select" },
                                    { value: "HIGH", label: "High" },
                                    { value: "MEDIUM", label: "Medium" },
                                    { value: "LOW", label: "Low" },
                                ]}
                            />
                            <FormField label="Preferred Location" value={form.city} onChange={v => handleChange("city", v)} placeholder="Location" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Budget Min ($)" value={form.budget_min} onChange={v => handleChange("budget_min", v)} placeholder="500000" />
                            <FormField label="Budget Max ($)" value={form.budget_max} onChange={v => handleChange("budget_max", v)} placeholder="750000" />
                        </div>

                        <FormField label="Assigned Agent (Email)" value={form.first_sales_owner_email} onChange={v => handleChange("first_sales_owner_email", v)} placeholder="agent@company.com" />

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
                            <textarea
                                className="w-full rounded-lg border border-slate-300 dark:border-[#2a3040] bg-white dark:bg-[#0f1219] text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none transition-colors"
                                rows={3}
                                value={form.notes}
                                onChange={e => handleChange("notes", e.target.value)}
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-[#2a3040] flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e2433] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Reusable Form Field ────────────────────────────────────────────

function FormField({
    label, value, onChange, placeholder, type = "text"
}: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
            <input
                type={type}
                className="w-full rounded-lg border border-slate-300 dark:border-[#2a3040] bg-white dark:bg-[#0f1219] text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
}

function FormSelect({
    label, value, onChange, options
}: {
    label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
            <select
                className="w-full rounded-lg border border-slate-300 dark:border-[#2a3040] bg-white dark:bg-[#0f1219] text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors appearance-none cursor-pointer"
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}
