"use client";

import React, { useState } from "react";
import {
    User,
    Lock,
    Bell,
    Monitor,
    Palette,
    LogOut,
    Check,
    Eye,
    EyeOff,
    Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";
import { useUsers } from "@/hooks/use-users";

import { useToast } from "@/contexts/toast-context";

export default function SettingsPage() {
    const { user, logout, refreshUser } = useAuth();
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();
    const { updateProfile } = useUsers();
    const router = useRouter();

    const [name, setName] = useState<string>(user?.name || "");
    const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Sync local state when global user object changes
    React.useEffect(() => {
        if (user) {
            setName(user.name || "");
            setAvatarUrl(user.avatar_url || "");
        }
    }, [user]);

    // Password visibility states
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateProfile(user.id, { name, avatar_url: avatarUrl });
            await refreshUser(); // Sync globally 
            toast("Profile updated successfully!", "success");
        } catch (err: any) {
            toast(err.response?.data?.detail || "Failed to update profile", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (file.size > 5 * 1024 * 1024) {
            toast("File too large. Max 5MB.", "error");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem("access_token");
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${baseUrl}/api/v1/users/me/avatar`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error("Upload failed");

            const updatedUser = await response.json();
            setAvatarUrl(updatedUser.avatar_url);
            await refreshUser();
            toast("Avatar uploaded successfully!", "success");
        } catch (err) {
            toast("Failed to upload avatar", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdatePassword = () => {
        toast("Password update function is temporarily disabled.", "info");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Account Settings</h1>
                    <p className="text-muted-foreground font-medium">Manage your profile, preferences, and security settings.</p>
                </div>
                <Button
                    variant="outline"
                    className="glass border-white/10 gap-2 h-10 font-bold text-sm uppercase shadow-lg shadow-primary/10"
                    onClick={() => router.push("/activity")}
                >
                    <Activity className="w-5 h-5 text-primary" />
                    Activity Log
                </Button>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="bg-white/60 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 p-1 rounded-2xl shadow-sm">
                    <TabsTrigger value="profile" className="rounded-xl gap-2 px-5 font-semibold text-xs transition-all">
                        <User className="w-4 h-4" /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-xl gap-2 px-5 font-semibold text-xs transition-all">
                        <Lock className="w-4 h-4" /> Security
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="rounded-xl gap-2 px-5 font-semibold text-xs transition-all">
                        <Palette className="w-4 h-4" /> Appearance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                    <Card className="glass-card-pro border-white/70 dark:border-white/10 shadow-lg">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl font-bold tracking-tight text-foreground">Personal Information</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">Update your public profile details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center gap-6 mb-4">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-2xl font-black text-white border-4 border-background shadow-xl overflow-hidden">
                                    {avatarUrl ? (
                                        <img src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${avatarUrl}`} className="w-full h-full object-cover" alt="Avatar" />
                                    ) : (
                                        <span>{name.charAt(0) || user?.name?.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleAvatarUpload}
                                        className="hidden"
                                        accept="image/jpeg,image/png,image/webp"
                                    />
                                    <Button
                                        variant="outline"
                                        className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-xl"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? "Uploading..." : "Change Avatar"}
                                    </Button>
                                    <p className="text-xs text-muted-foreground">JPG, PNG or WEBP. Max 5MB.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground">Full Name</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground rounded-xl"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground">Avatar URL</Label>
                                    <Input
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground rounded-xl"
                                        placeholder="https://example.com/avatar.jpg"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground">Email Address</Label>
                                    <Input defaultValue={user?.email} disabled className="bg-white/40 dark:bg-white/[0.02] border-white/60 dark:border-white/10 opacity-70 rounded-xl" />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-md shadow-primary/25" onClick={handleSaveProfile} disabled={isSaving}>
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <Card className="glass-card-pro border-white/70 dark:border-white/10 shadow-lg">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl font-bold tracking-tight text-foreground">Password & Authentication</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">Manage your access credentials.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">Current Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showCurrent ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground rounded-xl pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            type={showNew ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground rounded-xl pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground">Confirm New Password</Label>
                                    <div className="relative">
                                        <Input
                                            type={showConfirm ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground rounded-xl pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/5">
                                <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl" onClick={logout}>
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign out of all devices
                                </Button>
                                <Button className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-md shadow-primary/25" onClick={handleUpdatePassword}>Update Password</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                    <Card className="glass-card-pro border-white/70 dark:border-white/10 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                            <div className="space-y-1">
                                <CardTitle>Theme Preferences</CardTitle>
                                <CardDescription>Customize your workspace interface.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid grid-cols-3 gap-6">
                                <div
                                    className="space-y-2 cursor-pointer group"
                                    onClick={() => setTheme("dark")}
                                >
                                    <div className={cn(
                                        "h-32 rounded-xl bg-slate-950 border-2 transition-all shadow-xl relative overflow-hidden",
                                        theme === "dark" ? "border-primary shadow-primary/20 scale-[1.02]" : "border-white/5 opacity-50 hover:opacity-80"
                                    )}>
                                        <div className="absolute top-0 left-0 w-full h-8 bg-slate-900 border-b border-white/5" />
                                        <div className="absolute top-10 left-4 w-16 h-16 bg-primary/20 rounded-lg" />
                                        {theme === "dark" && (
                                            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                    <p className={cn("text-center font-bold", theme === "dark" ? "text-primary" : "text-muted-foreground")}>Dark</p>
                                </div>

                                <div
                                    className="space-y-2 cursor-pointer group"
                                    onClick={() => setTheme("light")}
                                >
                                    <div className={cn(
                                        "h-32 rounded-xl bg-white border-2 transition-all shadow-md relative overflow-hidden",
                                        theme === "light" ? "border-primary scale-[1.02]" : "border-slate-200 opacity-50 hover:opacity-80"
                                    )}>
                                        <div className="absolute top-0 left-0 w-full h-8 bg-slate-100 border-b border-slate-200" />
                                        <div className="absolute top-10 left-4 w-16 h-16 bg-blue-500/20 rounded-lg" />
                                        {theme === "light" && (
                                            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                    <p className={cn("text-center font-bold", theme === "light" ? "text-primary" : "text-muted-foreground")}>Light</p>
                                </div>

                                <div
                                    className="space-y-2 cursor-pointer group"
                                    onClick={() => setTheme("system")}
                                >
                                    <div className={cn(
                                        "h-32 rounded-xl bg-slate-900 border-2 transition-all shadow-sm relative overflow-hidden flex items-center justify-center",
                                        theme === "system" ? "border-primary scale-[1.02]" : "border-white/5 opacity-50 hover:opacity-80"
                                    )}>
                                        <Monitor className="w-8 h-8 text-muted-foreground" />
                                        {theme === "system" && (
                                            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                    <p className={cn("text-center font-bold", theme === "system" ? "text-primary" : "text-muted-foreground")}>System</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
