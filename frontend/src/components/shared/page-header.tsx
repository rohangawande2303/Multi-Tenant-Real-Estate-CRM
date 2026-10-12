/**
 * File: src/components/shared/page-header.tsx
 * Purpose: Standardized header across all pages (28px/600 title, muted subtitle, right-aligned actions)
 */

import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    icon?: React.ElementType;
    badge?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    children,
    icon: Icon,
    badge,
    className
}: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8", className)}>
            <div className="flex items-center gap-3.5">
                {Icon && (
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
                        <Icon className="w-5 h-5 stroke-[1.75]" />
                    </div>
                )}
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground">{title}</h1>
                        {badge}
                    </div>
                    {description && (
                        <p className="text-xs sm:text-sm text-muted-foreground font-normal">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {children && (
                <div className="flex items-center gap-2.5 flex-wrap">
                    {children}
                </div>
            )}
        </div>
    );
}
