/**
 * File: src/components/leads/lead-timeline.tsx
 * Purpose: Visual timeline of all actions performed on a lead
 */

import React from "react";
import {
    Phone,
    Mail,
    MessageSquare,
    UserPlus,
    AlertCircle,
    CheckCircle2,
    FileEdit,
    History
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LeadTimelineItem } from "@/types/lead";
import { cn } from "@/lib/utils";

interface LeadTimelineProps {
    items: LeadTimelineItem[];
}

const getIcon = (type: string) => {
    switch (type) {
        case "call": return Phone;
        case "email": return Mail;
        case "note":
        case "comment": return MessageSquare;
        case "creation": return UserPlus;
        case "UPDATE": return FileEdit;
        case "status_change": return History;
        case "error": return AlertCircle;
        case "success": return CheckCircle2;
        default: return MessageSquare;
    }
};

const getIconColor = (type: string) => {
    switch (type) {
        case "call": return "bg-blue-500/10 text-blue-500";
        case "note":
        case "comment": return "bg-amber-500/10 text-amber-500";
        case "creation": return "bg-emerald-500/10 text-emerald-500";
        case "status_change":
        case "UPDATE": return "bg-purple-500/10 text-purple-500";
        case "error": return "bg-red-500/10 text-red-500";
        default: return "bg-white/5 text-muted-foreground";
    }
};

export function LeadTimeline({ items }: LeadTimelineProps) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center space-y-2 opacity-50">
                <History className="w-10 h-10 mb-2" />
                <p className="font-bold text-sm">No activity recorded yet</p>
                <p className="text-xs">Incoming webhooks or manual actions will appear here.</p>
            </div>
        );
    }

    return (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/5 before:to-transparent max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {items.map((item, idx) => {
                const type = item.data?.activity_type || "note";
                const Icon = getIcon(type);
                const colorClass = getIconColor(type);
                const date = new Date(item.timestamp);

                return (
                    <div key={item.id} className="relative flex items-start gap-6 group">
                        {/* Timeline Dot/Icon */}
                        <div className={cn(
                            "absolute left-0 w-10 h-10 rounded-full flex items-center justify-center z-10 border border-white/5 transition-transform group-hover:scale-110 shadow-lg",
                            colorClass
                        )}>
                            <Icon className="w-5 h-5" />
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 ml-12 pt-1">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-2">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm text-foreground/90">{item.content}</p>
                                    {item.role && (
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-white/10 text-muted-foreground uppercase tracking-widest leading-none">
                                            {item.role}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <time className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </time>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-xs text-muted-foreground/80 leading-relaxed shadow-sm group-hover:bg-white/[0.07] transition-colors">
                                {item.data?.description || "Action performed by " + item.performed_by_name}
                                {item.data?.meta_data && (
                                    <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[10px]">
                                        {Object.entries(item.data.meta_data).map(([key, val]) => (
                                            <div key={key}>
                                                <span className="text-muted-foreground/40 uppercase">{key.replace('_', ' ')}:</span>
                                                <span className="ml-1 text-muted-foreground/70">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
