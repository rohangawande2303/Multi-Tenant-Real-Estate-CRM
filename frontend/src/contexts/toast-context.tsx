/**
 * File: src/contexts/toast-context.tsx
 * Purpose: Lightweight notification system for feedback
 */

"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback((message: string, type: ToastType = "success") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            {/* Toaster UI */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl pointer-events-auto animate-in slide-in-from-right-10 duration-300",
                            t.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                t.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                    "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        )}
                    >
                        {t.type === "success" && <CheckCircle2 className="w-5 h-5" />}
                        {t.type === "error" && <AlertCircle className="w-5 h-5" />}
                        {t.type === "info" && <Info className="w-5 h-5" />}
                        <p className="text-sm font-bold">{t.message}</p>
                        <button
                            onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
                            className="ml-2 hover:opacity-70 transition-opacity"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};
