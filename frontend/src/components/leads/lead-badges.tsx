"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ── STATUS BADGE ──────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    NEW: { 
        bg: "bg-blue-500/10", 
        text: "text-blue-700 dark:text-blue-300", 
        border: "border-blue-500/20" 
    },
    CONTACTED: { 
        bg: "bg-amber-500/10", 
        text: "text-amber-700 dark:text-amber-300", 
        border: "border-amber-500/20" 
    },
    WARM: { 
        bg: "bg-orange-500/10", 
        text: "text-orange-700 dark:text-orange-300", 
        border: "border-orange-500/20" 
    },
    HOT: { 
        bg: "bg-rose-500/10", 
        text: "text-rose-700 dark:text-rose-300", 
        border: "border-rose-500/20" 
    },
    QUALIFIED: { 
        bg: "bg-emerald-500/10", 
        text: "text-emerald-700 dark:text-emerald-300", 
        border: "border-emerald-500/20" 
    },
    UNQUALIFIED: { 
        bg: "bg-secondary", 
        text: "text-muted-foreground", 
        border: "border-border" 
    },
    PROPOSAL_SENT: { 
        bg: "bg-primary/10", 
        text: "text-primary", 
        border: "border-primary/20" 
    },
    CLOSED_WON: { 
        bg: "bg-emerald-500/10", 
        text: "text-emerald-700 dark:text-emerald-300", 
        border: "border-emerald-500/20" 
    },
    CLOSED_LOST: { 
        bg: "bg-secondary", 
        text: "text-muted-foreground", 
        border: "border-border" 
    },
    FOLLOW_UP: { 
        bg: "bg-cyan-500/10", 
        text: "text-cyan-700 dark:text-cyan-300", 
        border: "border-cyan-500/20" 
    },
    LOST: { 
        bg: "bg-rose-500/10", 
        text: "text-rose-700 dark:text-rose-300", 
        border: "border-rose-500/20" 
    },
    CLOSED: { 
        bg: "bg-emerald-500/10", 
        text: "text-emerald-700 dark:text-emerald-300", 
        border: "border-emerald-500/20" 
    },
};

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
    const s = (status || "NEW").toUpperCase().replace(/\s+/g, "_");
    const style = STATUS_STYLES[s] || STATUS_STYLES.NEW;
    const label = (status || "New").replace(/_/g, " ").toLowerCase();
    const formatted = label.charAt(0).toUpperCase() + label.slice(1);

    return (
        <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border capitalize",
            style.bg,
            style.text,
            style.border,
            className
        )}>
            {formatted}
        </span>
    );
}

// ── SOURCE BADGE ──────────────────────────────────────────────────
const SOURCE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    META_ADS: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20" },
    GOOGLE_ADS: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20" },
    WEBSITE_FORM: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
    WALK_IN: { bg: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-500/20" },
    REFERRAL: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/20" },
    REFERRALS: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/20" },
    PHONE_CALL: { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-500/20" },
    FILE_UPLOAD: { bg: "bg-secondary", text: "text-muted-foreground", border: "border-border" },
    OTHERS: { bg: "bg-secondary", text: "text-muted-foreground", border: "border-border" },
};

export function SourceBadge({ source, className }: { source?: string | null; className?: string }) {
    if (!source) return null;
    const key = source.toUpperCase().replace(/[\s-]+/g, "_");
    const style = SOURCE_STYLES[key] || SOURCE_STYLES.OTHERS;
    const label = source.replace(/_/g, " ").toLowerCase();
    const formatted = label.charAt(0).toUpperCase() + label.slice(1);

    return (
        <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
            style.bg,
            style.text,
            style.border,
            className
        )}>
            {formatted}
        </span>
    );
}

// ── PRIORITY BADGE ────────────────────────────────────────────────
const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    HIGH: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20" },
    MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20" },
    LOW: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20" },
};

export function PriorityBadge({ priority, className }: { priority?: string | null; className?: string }) {
    if (!priority) return null;
    const key = priority.toUpperCase();
    const style = PRIORITY_STYLES[key] || PRIORITY_STYLES.MEDIUM;
    const formatted = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();

    return (
        <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
            style.bg,
            style.text,
            style.border,
            className
        )}>
            {formatted}
        </span>
    );
}
