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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";
import { useToast } from "@/contexts/toast-context";
import { useLeads } from "@/hooks/use-leads";
import { useAuth } from "@/contexts/auth-context";

interface CreateLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const formSchema = z.object({
    name: z.string().min(2, "Name is required"),
    phone: z.string().min(10, "Valid phone number is required"),
    email: z.string().email().optional().or(z.literal("")),
    status: z.enum(["NEW", "WARM", "HOT", "CLOSED", "LOST", "FOLLOW_UP"]).default("NEW"),
    source_group: z.string().default("DIRECT"),
    notes: z.string().optional(),
});

export function CreateLeadModal({ isOpen, onClose }: CreateLeadModalProps) {
    const { toast } = useToast();
    const { refresh } = useLeads(); // This hooks refreshes active project leads
    const { activeProjectId } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: "",
            phone: "",
            email: "",
            status: "NEW",
            source_group: "DIRECT",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!activeProjectId) {
            toast("No active project selected", "error");
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                ...values,
                project_id: activeProjectId,
                // Map notes to custom_fields for now as we don't have a notes table linked in this simple view
                custom_fields: values.notes ? { initial_notes: values.notes } : {}
            };

            await api.post("/leads/", payload);
            toast("Lead added successfully", "success");
            refresh();
            form.reset();
            onClose();
        } catch (err: any) {
            console.error(err);
            const detail = err.response?.data?.detail;
            let errorMsg = "Failed to add lead";
            if (typeof detail === "string") {
                errorMsg = detail;
            } else if (Array.isArray(detail)) {
                errorMsg = detail.map((d: any) => typeof d === "string" ? d : d?.msg || JSON.stringify(d)).join(", ");
            } else if (detail && typeof detail === "object") {
                errorMsg = detail.msg || JSON.stringify(detail);
            }
            toast(errorMsg, "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Manual Lead</DialogTitle>
                    <DialogDescription>
                        Enter lead details manually. Requires active project context.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lead Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} className="bg-white/5 border-white/10" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+91 98765 43210" {...field} className="bg-white/5 border-white/10" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="john@example.com" {...field} className="bg-white/5 border-white/10" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-white/5 border-white/10">
                                                    <SelectValue placeholder="Select Status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="NEW">New</SelectItem>
                                                <SelectItem value="WARM">Warm</SelectItem>
                                                <SelectItem value="HOT">Hot</SelectItem>
                                                <SelectItem value="CLOSED">Closed</SelectItem>
                                                <SelectItem value="LOST">Lost</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="source_group"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Source</FormLabel>
                                        <FormControl>
                                            <Input placeholder="WALK_IN" {...field} className="bg-white/5 border-white/10" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Initial Notes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Walked in looking for 2BHK..." {...field} className="bg-white/5 border-white/10 resize-none" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button type="submit" className="purple-gradient" disabled={isLoading}>
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Lead
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
