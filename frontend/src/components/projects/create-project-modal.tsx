"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useProjects } from "@/hooks/use-projects";

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const formSchema = z.object({
    name: z.string().min(3, "Project name must be at least 3 characters"),
    description: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(["ACTIVE", "ARCHIVED", "DRAFT"]).default("ACTIVE"),
    tenant_id: z.number().optional(),
});

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
    const { toast } = useToast();
    const { isAgency } = useAuth();
    const { refresh } = useProjects();
    const [isLoading, setIsLoading] = useState(false);
    const [tenants, setTenants] = useState<{ id: number, name: string }[]>([]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: "",
            description: "",
            location: "",
            status: "ACTIVE",
            tenant_id: undefined
        },
    });

    React.useEffect(() => {
        if (isOpen && isAgency) {
            api.get("/tenants/").then(res => setTenants(res.data)).catch(console.error);
        }
    }, [isOpen, isAgency]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        try {
            await api.post("/projects/", values);
            toast("Project created successfully", "success");
            refresh();
            form.reset();
            onClose();
        } catch (err: any) {
            console.error("Project creation error:", err);
            console.error("Status:", err?.response?.status);
            console.error("Data:", err?.response?.data);
            const detail = err?.response?.data?.detail;
            toast(typeof detail === "string" ? detail : "Failed to create project", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                        Launch a new campaign or property project.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Summer Campaign 2025" {...field} className="bg-white/5 border-white/10" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {isAgency && (
                            <FormField
                                control={form.control}
                                name="tenant_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Client (Tenant)</FormLabel>
                                        <FormControl>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-md h-10 px-3 text-sm outline-none focus:ring-1 focus:ring-primary text-white"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                            >
                                                <option value="" className="bg-slate-900">Select Client...</option>
                                                {tenants.map(t => (
                                                    <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>
                                                ))}
                                            </select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Location (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Mumbai, Bandra" {...field} className="bg-white/5 border-white/10" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Project details..." {...field} className="bg-white/5 border-white/10 resize-none" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button type="submit" className="purple-gradient" disabled={isLoading}>
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create Project
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
