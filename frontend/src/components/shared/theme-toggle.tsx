/**
 * File: src/components/shared/theme-toggle.tsx
 * Purpose: Sleek frosted glass pill toggle button with Sun and Moon icons
 */

"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
    const { setTheme, resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const toggleTheme = () => {
        setTheme(isDark ? "light" : "dark");
    };

    return (
        <button
            onClick={toggleTheme}
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
            className={cn(
                "relative flex items-center h-8 px-1 rounded-full transition-all duration-300 cursor-pointer select-none",
                "bg-white/60 dark:bg-white/[0.06] backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-inner",
                "hover:border-primary/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            )}
        >
            {/* Sliding Pill Thumb */}
            <div
                className={cn(
                    "absolute top-1 bottom-1 w-6 rounded-full transition-all duration-300 ease-out shadow-sm",
                    isDark
                        ? "left-[calc(100%-1.75rem)] bg-primary text-white shadow-primary/30"
                        : "left-1 bg-white text-amber-500 shadow-slate-300/40"
                )}
            />

            {/* Sun Icon (Light Mode side) */}
            <div className={cn(
                "relative z-10 w-6 h-6 flex items-center justify-center transition-colors duration-200",
                !isDark ? "text-amber-500 font-bold" : "text-muted-foreground/60 hover:text-foreground"
            )}>
                <Sun className="w-3.5 h-3.5 stroke-[2]" />
            </div>

            {/* Moon Icon (Dark Mode side) */}
            <div className={cn(
                "relative z-10 w-6 h-6 flex items-center justify-center transition-colors duration-200",
                isDark ? "text-white font-bold" : "text-muted-foreground/60 hover:text-foreground"
            )}>
                <Moon className="w-3.5 h-3.5 stroke-[2]" />
            </div>
        </button>
    );
}
