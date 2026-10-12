/**
 * File: src/components/shared/error-boundary.tsx
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center glass-card border-red-500/20 rounded-3xl bg-red-500/5 mt-8">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black mb-2">Something went wrong</h3>
                    <p className="text-muted-foreground max-w-sm mb-8 font-medium">
                        The system encountered an unexpected error. This has been logged and we're looking into it.
                    </p>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="border-white/10 font-bold"
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Reload Interface
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
