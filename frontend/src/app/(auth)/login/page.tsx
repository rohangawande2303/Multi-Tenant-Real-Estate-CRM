"use client";

import React, { Suspense, useState, useEffect } from "react";
import { LoginForm } from "./login-form";
import { APP_CONFIG } from "@/lib/constants";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function LoginPage() {
    const [year, setYear] = useState<number | null>(null);

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-background overflow-hidden">
            {/* Ambient page glow */}
            <div className="ambient-glow" />

            {/* Top-right theme toggle */}
            <div className="absolute top-4 right-4 z-20">
                <ThemeToggle />
            </div>

            <div className="z-10 w-full max-w-[420px] flex flex-col gap-6 my-auto">
                {/* Logo Section */}
                <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md shadow-primary/25">
                        S
                    </div>
                    <div className="space-y-0.5 mt-2">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">
                            Social Pulse <span className="text-primary">CRM</span>
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Real Estate Multi-Tenant Intelligence
                        </p>
                    </div>
                </div>

                {/* Login Form wrapped in Suspense for useSearchParams */}
                <Suspense fallback={
                    <div className="w-full h-[400px] flex items-center justify-center surface-card rounded-2xl">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                }>
                    <LoginForm />
                </Suspense>

                <footer className="text-center text-xs text-muted-foreground/75 mt-2 space-y-2">
                    <p>© {year || '...'} {APP_CONFIG.NAME}. All rights reserved.</p>
                    <div className="flex justify-center gap-3">
                        <a href="#" className="hover:text-primary transition-colors">Security</a>
                        <span>•</span>
                        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                        <span>•</span>
                        <a href="#" className="hover:text-primary transition-colors">Terms</a>
                    </div>
                </footer>
            </div>
        </main>
    );
}
