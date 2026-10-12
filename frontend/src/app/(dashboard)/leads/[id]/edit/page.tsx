/**
 * File: src/app/(dashboard)/leads/[id]/edit/page.tsx
 * Purpose: Edit existing lead information
 */

"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadForm } from "@/components/leads/lead-form";

// Mock Data for editing
const MOCK_LEAD = {
    id: "lead_123456",
    name: "John Doe",
    phone: "9876543210",
    email: "john@example.com",
    status: "HOT",
    project_id: 101,
    city: "Mumbai",
    custom_fields: {
        property_type: "2BHK",
        budget_max: "1.5 Cr",
        internal_notes: "Very interested in ready to move properties."
    }
};

export default function EditLeadPage() {
    const router = useRouter();
    const params = useParams();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);
        console.log("Updating Lead:", params.id, data);

        // Simulate API call
        await new Promise(r => setTimeout(r, 1500));

        setIsSubmitting(false);
        alert("Lead profile updated successfully.");
        router.push(`/leads/${params.id}`);
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
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                        <Edit3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Edit Lead Profile</h1>
                        <p className="text-sm text-muted-foreground font-medium">Modify existing record details and requirements.</p>
                    </div>
                </div>
            </div>

            <LeadForm initialData={MOCK_LEAD} onSubmit={handleSubmit} isLoading={isSubmitting} />
        </div>
    );
}
