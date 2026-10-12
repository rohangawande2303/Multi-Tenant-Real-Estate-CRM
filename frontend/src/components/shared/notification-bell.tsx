/**
 * File: src/components/shared/notification-bell.tsx
 * Purpose: Functional notification center with quiet glass styling and clean unread dot
 */

"use client";

import React from "react";
import { Bell, Check, Clock, ExternalLink } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-secondary/60 rounded-full transition-colors w-9 h-9">
                    <Bell className="w-4 h-4 text-muted-foreground stroke-[1.75]" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 surface-card border-border p-0 overflow-hidden shadow-lg z-50">
                <div className="p-3.5 border-b border-border/80 bg-secondary/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-xs text-foreground tracking-tight">Notifications</h3>
                        {unreadCount > 0 && (
                            <Badge variant="default" className="h-4 px-1.5 text-[10px]">{unreadCount}</Badge>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
                            className="text-[11px] font-medium text-primary hover:text-primary-hover transition-colors"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto slim-scrollbar divide-y divide-border/60">
                    {loading && notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground italic">Checking for alerts...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <div className="w-10 h-10 rounded-full bg-secondary/60 flex items-center justify-center mx-auto text-muted-foreground">
                                <Bell className="w-5 h-5 stroke-[1.75]" />
                            </div>
                            <p className="text-xs text-muted-foreground">All caught up! No new notifications.</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={cn(
                                    "p-3.5 hover:bg-secondary/40 transition-colors group relative",
                                    !n.is_read && "bg-primary/[0.04]"
                                )}
                            >
                                <div className="flex gap-2.5">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                        !n.is_read ? "bg-primary" : "bg-transparent"
                                    )} />
                                    <div className="flex-1 space-y-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                                            {!n.is_read && (
                                                <button
                                                    onClick={() => markAsRead(n.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-primary/10 rounded transition-all text-primary"
                                                    title="Mark read"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                            {n.message}
                                        </p>
                                        <div className="flex items-center justify-between pt-0.5">
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </span>
                                            {n.link && (
                                                <Link
                                                    href={n.link}
                                                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                                                >
                                                    View <ExternalLink className="w-2.5 h-2.5" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
