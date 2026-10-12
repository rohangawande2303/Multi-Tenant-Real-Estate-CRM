"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

interface SuspendModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
    clientName: string;
}

export function SuspendModal({ isOpen, onClose, onConfirm, clientName }: SuspendModalProps) {
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!reason.trim()) return;
        setIsSubmitting(true);
        try {
            await onConfirm(reason);
            onClose();
            setReason("");
        } catch (error) {
            console.error("Failed to suspend client:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="glass-card border-white/10 sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                        <AlertCircle className="w-5 h-5" />
                        Suspend Client Access
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 font-medium">
                        This will immediately block all users associated with <span className="text-white font-bold">{clientName}</span> from logging into the platform.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason" className="text-white font-bold">Suspension Reason</Label>
                        <Textarea
                            id="reason"
                            placeholder="e.g., Administrative hold, Policy violation..."
                            className="glass border-white/10 text-white min-h-[100px]"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 italic">This reason will be shown to the client upon failed login.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/5">
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isSubmitting || !reason.trim()}
                        className="font-bold shadow-lg shadow-red-500/20"
                    >
                        {isSubmitting ? "Suspending..." : "Confirm Suspension"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
