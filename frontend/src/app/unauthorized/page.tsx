/**
 * File: src/app/unauthorized/page.tsx
 * Purpose: Feedback for restricted access attempts
 */

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="z-10 w-full max-w-lg text-center space-y-8">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-2xl shadow-red-500/10">
                        <ShieldAlert className="w-12 h-12 text-red-500 animate-pulse" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-white tracking-tight">Access Restricted</h1>
                        <p className="text-lg text-muted-foreground max-w-md mx-auto">
                            You do not have the necessary permissions to view this resource.
                            This attempt has been logged for security review.
                        </p>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-2xl border-white/5 bg-white/5 backdrop-blur-xl">
                    <p className="text-sm text-yellow-500/80 font-medium mb-4">
                        Security Check: Your role or email does not match the required authorization for this zone.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button asChild variant="default" className="purple-gradient h-11 px-8 font-bold shadow-lg shadow-primary/20">
                            <Link href="/dashboard">Return to Workspace</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-8 border-white/10 hover:bg-white/5">
                            <Link href="/login">Switch Account</Link>
                        </Button>
                    </div>
                </div>

                <footer className="text-sm text-muted-foreground/40">
                    <p>Security Reference: ERR_AUTH_RESTRICTED_ZONE</p>
                </footer>
            </div>
        </main>
    );
}
