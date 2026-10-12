/**
 * File: src/app/(dashboard)/leads/new/page.tsx
 * Purpose: Manual lead entry form page
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadForm } from "@/components/leads/lead-form";

export default function NewLeadPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);
        console.log("Creating Lead:", data);

        // Simulate API call
        await new Promise(r => setTimeout(r, 1500));

        setIsSubmitting(false);
        alert("Lead record synchronized successfully!");
        router.push("/leads");
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full bg-white/5 border border-white/10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl purple-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Sync New Lead</h1>
                        <p className="text-sm text-muted-foreground font-medium">Add a manual inquiry to the pipeline tracking system.</p>
                    </div>
                </div>
            </div>

            <LeadForm onSubmit={handleSubmit} isLoading={isSubmitting} />
        </div>
    );
}
