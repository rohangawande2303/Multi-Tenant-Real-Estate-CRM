/**
 * File: src/components/shared/loading-spinner.tsx
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    className?: string;
    fullPage?: boolean;
}

export function LoadingSpinner({ className, fullPage }: LoadingSpinnerProps) {
    const spinner = (
        <div className={cn("flex items-center justify-center space-x-2", className)}>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
                Syncing...
            </span>
        </div>
    );

    if (fullPage) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="glass-card p-8 rounded-3xl border-white/10 flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="font-black text-xs uppercase tracking-tighter opacity-50">
                        Social Pulse CRM
                    </p>
                </div>
            </div>
        );
    }

    return spinner;
}
