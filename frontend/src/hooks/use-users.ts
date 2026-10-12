import { useState, useEffect } from "react";
import { User } from "@/types/user";
import api from "@/lib/axios";

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        try {
            const response = await api.get("/users/");
            setUsers(response.data);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch users:", err);
            setError("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (userId: number, data: Partial<User>) => {
        try {
            const response = await api.patch(`/users/${userId}`, data);
            setUsers(prev => prev.map(u => u.id === userId ? response.data : u));
            return response.data;
        } catch (err: any) {
            console.error("Failed to update profile:", err);
            throw err;
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    return { users, loading, error, refresh, updateProfile };
}
