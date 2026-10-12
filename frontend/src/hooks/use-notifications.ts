/**
 * File: src/hooks/use-notifications.ts
 * Purpose: Poll and manage in-app notifications
 */

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";

export interface Notification {
    id: number;
    title: string;
    message: string;
    type?: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const [listRes, countRes] = await Promise.all([
                api.get("/notifications/"),
                api.get("/notifications/unread-count")
            ]);
            setNotifications(listRes.data);
            setUnreadCount(countRes.data.unread_count);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = async (id: number) => {
        try {
            await api.post(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch("/notifications/read-all");
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [refresh]);

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh };
}
