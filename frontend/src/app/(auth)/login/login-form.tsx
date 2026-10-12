/**
 * File: src/app/(auth)/login/login-form.tsx
 * Purpose: Clean, modern login form component with validation and role redirection
 */

"use client";

import React, { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/axios";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionExpired = searchParams.get("error") === "session_expired";

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setError(null);
        setIsSubmitting(true);

        try {
            const formData = new URLSearchParams();
            formData.append("username", data.email);
            formData.append("password", data.password);

            const response = await api.post("/auth/login", formData, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            const { access_token, role, tenant_id, email } = response.data;
            await login({ access_token, role, tenant_id, email });

            const isAgencyRole = role === "AGENCY" || role === "AGENCY_ADMIN";
            if (isAgencyRole && tenant_id === 1) {
                router.push("/dashboard");
            } else {
                router.push("/dashboard");
            }
        } catch (err: any) {
            console.error("Login Error:", err);
            const detail = err.response?.data?.detail;
            setError(typeof detail === "string" ? detail : "Incorrect email or password. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="surface-card p-6 md:p-8 rounded-2xl shadow-soft space-y-5">
            <div className="space-y-1 text-center">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Welcome back</h2>
                <p className="text-xs text-muted-foreground">
                    Sign in to your account to manage leads and properties
                </p>
            </div>

            {sessionExpired && (
                <div className="p-3 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 stroke-[1.75]" />
                    <span>Your session has expired. Please sign in again.</span>
                </div>
            )}

            {error && (
                <div className="p-3 text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 stroke-[1.75]" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-foreground">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        {...register("email")}
                    />
                    {errors.email && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium ml-0.5">
                            {errors.email.message}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-xs font-medium text-foreground">Password</Label>
                        <button 
                            type="button" 
                            className="text-[11px] text-primary hover:underline font-medium"
                            onClick={() => alert("Contact your system administrator to reset credentials.")}
                        >
                            Forgot password?
                        </button>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pr-10"
                            {...register("password")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4 stroke-[1.75]" /> : <Eye className="w-4 h-4 stroke-[1.75]" />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium ml-0.5">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <div className="flex items-center space-x-2 pt-0.5">
                    <input
                        type="checkbox"
                        id="rememberMe"
                        {...register("rememberMe")}
                        className="rounded-[4px] border-border text-primary focus:ring-primary/40 h-3.5 w-3.5"
                    />
                    <label
                        htmlFor="rememberMe"
                        className="text-xs text-muted-foreground cursor-pointer select-none"
                    >
                        Remember this device
                    </label>
                </div>

                <Button
                    type="submit"
                    className="w-full h-10 mt-2 font-medium text-xs shadow-sm"
                    loading={isSubmitting}
                >
                    Sign In
                </Button>
            </form>

            {/* Demo Credentials Card (Controlled by NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS) */}
            {process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true" && (
                <div className="pt-2">
                    <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                                <KeyRound className="w-3.5 h-3.5 stroke-[1.75] text-primary" /> Demo Access
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">Click to prefill</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setValue("email", "demo_admin@socialpulse.agency");
                                    setValue("password", "DemoPass2026!");
                                }}
                                className="text-left p-1.5 rounded-lg border border-border/60 bg-card hover:border-primary/40 transition-colors text-[11px]"
                            >
                                <p className="font-medium text-foreground truncate">Agency Admin</p>
                                <p className="text-[10px] text-muted-foreground truncate">demo_admin@...</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setValue("email", "client_admin@demorealty.com");
                                    setValue("password", "DemoPass2026!");
                                }}
                                className="text-left p-1.5 rounded-lg border border-border/60 bg-card hover:border-primary/40 transition-colors text-[11px]"
                            >
                                <p className="font-medium text-foreground truncate">Client Admin</p>
                                <p className="text-[10px] text-muted-foreground truncate">client_admin@...</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setValue("email", "sales_exec@demorealty.com");
                                    setValue("password", "DemoPass2026!");
                                }}
                                className="text-left p-1.5 rounded-lg border border-border/60 bg-card hover:border-primary/40 transition-colors text-[11px]"
                            >
                                <p className="font-medium text-foreground truncate">Sales Exec</p>
                                <p className="text-[10px] text-muted-foreground truncate">sales_exec@...</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setValue("email", "callcenter@demorealty.com");
                                    setValue("password", "DemoPass2026!");
                                }}
                                className="text-left p-1.5 rounded-lg border border-border/60 bg-card hover:border-primary/40 transition-colors text-[11px]"
                            >
                                <p className="font-medium text-foreground truncate">Call Center</p>
                                <p className="text-[10px] text-muted-foreground truncate">callcenter@...</p>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
