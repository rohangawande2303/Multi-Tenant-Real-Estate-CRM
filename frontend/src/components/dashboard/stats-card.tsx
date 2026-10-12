/**
 * File: src/components/dashboard/stats-card.tsx
 * Purpose: Reusable KPI card with hero accent option, tabular numbers, and soft hover lift
 */

import React from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isUp: boolean;
    };
    description?: string;
    className?: string;
    isHero?: boolean;
    action?: React.ReactNode;
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    className,
    isHero = false,
    action
}: StatsCardProps) {
    if (isHero) {
        return (
            <div className={cn("glass-hero-pro p-5 md:p-6 flex flex-col justify-between relative overflow-hidden group", className)}>
                {/* Subtle internal glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 blur-xl pointer-events-none" />

                <div className="flex items-start justify-between gap-3 relative z-10">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/85">{title}</span>
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white shrink-0 shadow-sm border border-white/30 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4 stroke-[2]" />
                    </div>
                </div>

                <div className="mt-4 relative z-10">
                    <div className="text-3xl font-bold tracking-tight text-white tabular-nums drop-shadow-sm">
                        {value}
                    </div>
                    {description && (
                        <p className="text-xs text-white/80 mt-1 font-normal">{description}</p>
                    )}
                    {action && (
                        <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center">
                            {action}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "glass-card-pro glass-card-hover p-5 md:p-6 flex flex-col justify-between group relative overflow-hidden",
            className
        )}>
            <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4 stroke-[1.75]" />
                </div>
            </div>

            <div className="mt-4">
                <div className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                    {value}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    {trend ? (
                        <div className={cn(
                            "inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full border",
                            trend.isUp 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        )}>
                            {trend.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trend.value}%
                        </div>
                    ) : null}
                    {description && (
                        <p className="text-xs text-muted-foreground truncate font-normal">{description}</p>
                    )}
                </div>
                {action && (
                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center">
                        {action}
                    </div>
                )}
            </div>
        </div>
    );
}
