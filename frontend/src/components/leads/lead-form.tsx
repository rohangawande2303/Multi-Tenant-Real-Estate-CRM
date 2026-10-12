/**
 * File: src/components/leads/lead-form.tsx
 * Purpose: Unified form for creating and updating leads
 */

"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lead } from "@/types/lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Validation Schema
const leadSchema = z.object({
    name: z.string().min(2, "Name is required"),
    phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit phone number"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    city: z.string().min(2, "City is required"),
    project_id: z.string().min(1, "Please select a project"),
    status: z.string(),
    custom_fields: z.record(z.string(), z.any()).optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface LeadFormProps {
    initialData?: Partial<Lead>;
    onSubmit: (data: LeadFormValues) => void;
    isLoading?: boolean;
}

export function LeadForm({ initialData, onSubmit, isLoading }: LeadFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch
    } = useForm<LeadFormValues>({
        resolver: zodResolver(leadSchema),
        defaultValues: {
            name: initialData?.name || "",
            phone: initialData?.phone || "",
            email: initialData?.email || "",
            city: initialData?.city || "",
            project_id: initialData?.project_id?.toString() || "",
            status: initialData?.status || "NEW",
            custom_fields: initialData?.custom_fields || {},
        },
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Core Information Section */}
                <Card className="glass-card border-white/5 bg-card/40">
                    <CardHeader>
                        <CardTitle className="text-lg font-black tracking-tight">Core Information</CardTitle>
                        <CardDescription className="font-medium">Primary contact details for the inquiry</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold uppercase">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                className="bg-white/5 border-white/10"
                                {...register("name")}
                            />
                            {errors.name && <p className="text-xs text-red-400 font-bold">{errors.name.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-xs font-bold uppercase">Phone Number</Label>
                                <Input
                                    id="phone"
                                    placeholder="9876543210"
                                    className="bg-white/5 border-white/10"
                                    {...register("phone")}
                                />
                                {errors.phone && <p className="text-xs text-red-400 font-bold">{errors.phone.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold uppercase">Email (Optional)</Label>
                                <Input
                                    id="email"
                                    placeholder="john@example.com"
                                    className="bg-white/5 border-white/10"
                                    {...register("email")}
                                />
                                {errors.email && <p className="text-xs text-red-400 font-bold">{errors.email.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city" className="text-xs font-bold uppercase">City</Label>
                                <Input
                                    id="city"
                                    placeholder="Mumbai"
                                    className="bg-white/5 border-white/10"
                                    {...register("city")}
                                />
                                {errors.city && <p className="text-xs text-red-400 font-bold">{errors.city.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="project_id" className="text-xs font-bold uppercase">Target Project</Label>
                                <Select onValueChange={(val) => setValue("project_id", val)} defaultValue={initialData?.project_id?.toString()}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="Select a project" />
                                    </SelectTrigger>
                                    <SelectContent className="glass-card">
                                        <SelectItem value="101">Project Alpha (Premium)</SelectItem>
                                        <SelectItem value="102">Project Beta (Luxury)</SelectItem>
                                        <SelectItem value="103">Project Gamma (Economy)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.project_id && <p className="text-xs text-red-400 font-bold">{errors.project_id.message}</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Requirements & Custom Fields */}
                <Card className="glass-card border-white/5 bg-card/40">
                    <CardHeader>
                        <CardTitle className="text-lg font-black tracking-tight">Property Requirements</CardTitle>
                        <CardDescription className="font-medium">Specific preferences and lead scoring factors</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="property_type" className="text-xs font-bold uppercase">Property Type</Label>
                                <Select onValueChange={(val) => setValue("custom_fields.property_type", val)}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent className="glass-card">
                                        <SelectItem value="1BHK">1 BHK</SelectItem>
                                        <SelectItem value="2BHK">2 BHK</SelectItem>
                                        <SelectItem value="3BHK">3 BHK</SelectItem>
                                        <SelectItem value="Villa">Villa / Penthouse</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="budget" className="text-xs font-bold uppercase">Max Budget</Label>
                                <Input
                                    id="budget"
                                    placeholder="e.g. 1.5 Cr"
                                    className="bg-white/5 border-white/10"
                                    onChange={(e) => setValue("custom_fields.budget_max", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-xs font-bold uppercase">Pipeline Status</Label>
                            <Select onValueChange={(val) => setValue("status", val)} defaultValue={watch("status")}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="Change status" />
                                </SelectTrigger>
                                <SelectContent className="glass-card">
                                    <SelectItem value="NEW">New Inquiry</SelectItem>
                                    <SelectItem value="WARM">Warm Lead</SelectItem>
                                    <SelectItem value="HOT">Hot Lead / Priority</SelectItem>
                                    <SelectItem value="CLOSED">Closed/Won</SelectItem>
                                    <SelectItem value="LOST">Dropped/Lost</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-xs font-bold uppercase">Discovery Notes</Label>
                            <textarea
                                id="notes"
                                rows={4}
                                className="w-full rounded-md bg-white/5 border border-white/10 p-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="Summarize key intent..."
                                onChange={(e) => setValue("custom_fields.internal_notes", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
                <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground hover:bg-white/5 hover:text-white px-8"
                    onClick={() => window.history.back()}
                >
                    Discard Changes
                </Button>
                <Button
                    type="submit"
                    className="purple-gradient px-12 font-bold shadow-lg shadow-primary/20 h-11"
                    disabled={isLoading}
                >
                    {isLoading ? "Saving Record..." : initialData?.id ? "Update Lead Record" : "Sync New Lead"}
                </Button>
            </div>
        </form>
    );
}
