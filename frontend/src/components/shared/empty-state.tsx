/**
 * File: src/components/shared/empty-state.tsx
 * Purpose: Clean, modern empty state presentation with tinted icon chip
 */

import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-border bg-card/40",
            className
        )}>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-sm">
                <Icon className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="text-base font-semibold text-foreground tracking-tight mb-1.5">{title}</h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction} size="sm" variant="default" className="shadow-sm">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
