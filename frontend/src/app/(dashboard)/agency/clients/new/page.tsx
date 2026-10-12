/**
 * File: src/app/(dashboard)/agency/clients/new/page.tsx
 * Purpose: Professional multi-step wizard for onboarding new CRM tenants
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Building2,
    Globe,
    ShieldCheck,
    Mail,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Zap,
    Eye,
    EyeOff,
    Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mockStore } from "@/lib/mock-store";
import { useToast } from "@/contexts/toast-context";
import api from "@/lib/axios";

const STEPS = [
    { id: 1, title: "Organization", icon: Building2 },
    { id: 2, title: "Configuration", icon: Globe },
    { id: 3, title: "Review & Security", icon: ShieldCheck }
];

export default function NewClientPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        domain: "",
        email: ""
    });

    const nextStep = () => {
        if (step === 2) {
            // Generate password before review & launch
            const pwd = Math.random().toString(36).slice(-8) + "@" + Math.floor(100 + Math.random() * 900);
            setGeneratedPassword(pwd);
        }
        setStep(prev => Math.min(prev + 1, 3));
    };
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await api.post("/tenants/onboard", {
                name: formData.name,
                schema_name: formData.domain.toLowerCase().replace(/[^a-z0-9]/g, "_"),
                domain: formData.domain,
                admin_email: formData.email,
                admin_password: generatedPassword
            });

            // Keep mockStore in sync for immediate list update without refresh if needed
            mockStore.addTenant({
                name: formData.name,
                domain: formData.domain,
                plan: "DEDICATED",
                admin_email: formData.email
            });

            toast("Client onboarded successfully!", "success");
            setStep(4); // Success state
        } catch (err: any) {
            console.error("Onboarding failed:", err);
            const detail = err.response?.data?.detail || "Failed to onboard client. Please check details and try again.";
            toast(detail, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col items-center text-center space-y-2">
                <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    Onboard New Client
                </h1>
                <p className="text-muted-foreground max-w-lg">
                    Follow the wizard to set up a new tenant environment with dedicated database schema and agency controls.
                </p>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-3 gap-4 px-4">
                {STEPS.map((s) => (
                    <div key={s.id} className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg",
                            step >= s.id
                                ? "bg-primary text-white shadow-primary/20 scale-110"
                                : "bg-white/5 text-muted-foreground border border-white/5 opacity-50"
                        )}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest hidden md:block",
                            step >= s.id ? "text-primary" : "text-muted-foreground"
                        )}>
                            {s.title}
                        </span>
                    </div>
                ))}
            </div>

            <Card className="glass-card border-white/5 bg-card/40 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 purple-gradient opacity-50" />

                <CardHeader>
                    <CardTitle className="text-2xl font-bold">
                        {step === 1 && "Basic Organization Details"}
                        {step === 2 && "Tenant Domain & Admin Access"}
                        {step === 3 && "Review & Launch"}
                    </CardTitle>
                    <CardDescription>
                        {step === 1 && "Let's start with the client's business name."}
                        {step === 2 && "Configure the custom URL and primary point of contact."}
                        {step === 3 && "Verify all details before initializing the environment."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 min-h-[300px] flex flex-col justify-center">
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="name">Agency / Developer Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Paramount Real Estate"
                                    className="bg-white/5 border-white/10 h-12 text-lg"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="domain">Target Domain</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="domain"
                                        placeholder="paramount"
                                        className="bg-white/5 border-white/10 h-12"
                                        value={formData.domain}
                                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                    />
                                    <span className="text-muted-foreground font-bold">.socialpulse.com</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Admin Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        placeholder="admin@paramount.com"
                                        className="bg-white/5 border-white/10 h-12 pl-10"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-2">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold">Review & Security</h3>
                                <p className="text-sm text-muted-foreground">Provisioning environment for {formData.name}</p>
                            </div>

                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                                <div className="flex items-center gap-2 text-amber-500">
                                    <Zap className="w-4 h-4 fill-current" />
                                    <span className="text-xs font-black uppercase tracking-wider">Security Notice</span>
                                </div>
                                <p className="text-xs font-medium text-amber-200/80 leading-relaxed">
                                    A temporary administrator password has been generated. This password will <span className="text-amber-500 font-bold underline">only be shown once</span>. Please copy it safely.
                                </p>
                                <div className="relative mt-2">
                                    <Input
                                        readOnly
                                        type={showPassword ? "text" : "password"}
                                        value={generatedPassword}
                                        className="bg-black/40 border-amber-500/30 font-mono text-amber-400 h-10 pr-24"
                                    />
                                    <div className="absolute right-1 top-1 flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                            onClick={() => {
                                                navigator.clipboard.writeText(generatedPassword);
                                                toast("Password copied to clipboard!", "success");
                                            }}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="text-center space-y-6 animate-in zoom-in-95 duration-500 py-10">
                            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-6 shadow-2xl shadow-emerald-500/20 border-4 border-emerald-500/20">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black tracking-tight text-white">Environment Provisioned!</h1>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Tenant <span className="text-white font-bold">{formData.name}</span> is now active.
                                    The agency can log in at <span className="text-primary font-bold underline cursor-pointer">{formData.domain}.socialpulse.com</span>.
                                </p>
                            </div>
                            <div className="pt-8">
                                <Button
                                    className="purple-gradient h-12 px-10 font-bold rounded-xl shadow-lg shadow-primary/20"
                                    onClick={() => router.push("/agency/clients")}
                                >
                                    Return to Client List
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    {step <= 3 && (
                        <div className="flex items-center justify-between pt-8 border-t border-white/5">
                            <Button
                                variant="ghost"
                                disabled={step === 1 || isSubmitting}
                                onClick={prevStep}
                                className="gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Button>

                            {step < 3 ? (
                                <Button
                                    className="purple-gradient px-8 shadow-xl shadow-primary/20"
                                    onClick={nextStep}
                                    disabled={step === 1 && !formData.name}
                                >
                                    Continue
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    className={cn(
                                        "px-10 shadow-xl font-bold h-12 rounded-xl transition-all",
                                        isSubmitting ? "bg-slate-700 pointer-events-none" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                                    )}
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Initializing...
                                        </span>
                                    ) : (
                                        "Launch Instance"
                                    )}
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
