/**
 * File: src/app/(dashboard)/users/page.tsx
 * Purpose: Team management and RBAC administration with Agency hierarchy
 */

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    UserPlus,
    MoreHorizontal,
    Shield,
    Mail,
    Search,
    Eye,
    EyeOff,
    Copy,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Briefcase,
    Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useUsers } from "@/hooks/use-users";
import { useAgencyTeam, AgencyTenantTeam } from "@/hooks/use-agency-team";
import { UserRole } from "@/types/user";
import api from "@/lib/axios";

const RoleBadge = ({ role }: { role: UserRole }) => {
    const styles: Record<string, string> = {
        AGENCY: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        AGENCY_ADMIN: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        DEVELOPER: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        CLIENT_ADMIN: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
        BD_MANAGER: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        EXECUTIVE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        CALL_CENTER: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };

    return (
        <Badge variant="outline" className={`${styles[role] || styles.CALL_CENTER} font-bold text-[10px] py-0.5 whitespace-nowrap`}>
            {role.replace('_', ' ')}
        </Badge>
    );
};

export default function UsersPage() {
    const { isAgency, role, user: currentUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    // Hooks for different roles
    const { users, loading: loadingUsers, refresh: refreshUsers } = useUsers();
    const { teams, loading: loadingTeams, refresh: refreshTeams } = useAgencyTeam();

    const loading = isAgency ? loadingTeams : loadingUsers;
    const refresh = isAgency ? refreshTeams : refreshUsers;

    const canManage = role === "AGENCY" || role === "AGENCY_ADMIN" || role === "DEVELOPER" || role === "CLIENT_ADMIN";

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteStep, setInviteStep] = useState(1);
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [expandedTenants, setExpandedTenants] = useState<number[]>([]);

    // Edit Role & Deactivate State
    const [editingUser, setEditingUser] = useState<any>(null);
    const [newRole, setNewRole] = useState<UserRole>("EXECUTIVE");
    const [userToDeactivate, setUserToDeactivate] = useState<any>(null);

    const [newMember, setNewMember] = useState({
        name: "",
        email: "",
        role: "EXECUTIVE" as UserRole,
        tenant_id: currentUser?.tenant_id || undefined
    });

    const toggleTenant = (id: number) => {
        setExpandedTenants(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleInvite = async () => {
        const pwd = Math.random().toString(36).slice(-8) + "!@";
        setGeneratedPassword(pwd);

        try {
            await api.post("/users/", {
                email: newMember.email,
                name: newMember.name,
                password: pwd,
                role: newMember.role,
                tenant_id: isAgency ? newMember.tenant_id : currentUser?.tenant_id
            });

            await refresh();
            setInviteStep(2);
            toast("Member invited successfully", "success");
        } catch (err: any) {
            console.error("Invite failed:", err);
            const detail = err.response?.data?.detail || "Failed to invite member";
            toast(detail, "error");
        }
    };

    const handleRoleUpdate = async () => {
        if (!editingUser) return;
        try {
            await api.patch(`/users/${editingUser.id}`, { role: newRole });
            toast("User role updated successfully", "success");
            setEditingUser(null);
            refresh();
        } catch (err: any) {
            toast(err.response?.data?.detail || "Failed to update role", "error");
        }
    };

    const handleStatusUpdate = async (userId: number, isActive: boolean) => {
        try {
            await api.patch(`/users/${userId}`, { is_active: isActive });
            toast(`User ${isActive ? 'activated' : 'deactivated'} successfully`, "success");
            refresh();
        } catch (err: any) {
            toast(err.response?.data?.detail || "Failed to update user status", "error");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader
                title="Users & Team"
                description={isAgency ? "Manage all clients and their users across the agency." : "Manage your team members and their permissions."}
            >
                {canManage && (
                    <Button
                        className="purple-gradient text-white font-semibold shadow-lg shadow-primary/20"
                        onClick={() => {
                            setInviteStep(1);
                            setIsInviteModalOpen(true);
                        }}
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Member
                    </Button>
                )}
            </PageHeader>

            {loading ? (
                <div className="flex justify-center py-20">
                    <LoadingSpinner />
                </div>
            ) : isAgency ? (
                <div className="space-y-4">
                    {teams.map(team => (
                        <div key={team.tenant_id} className="glass-card-pro rounded-2xl overflow-hidden shadow-lg border-white/70 dark:border-white/10">
                            <div
                                className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                                onClick={() => toggleTenant(team.tenant_id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shadow-inner">
                                        <Briefcase className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-foreground">{team.tenant_name}</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">Tenant ID: {team.tenant_id} • {team.users.length} members</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 font-semibold text-xs rounded-full">
                                        Active
                                    </Badge>
                                    {expandedTenants.includes(team.tenant_id) ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                                </div>
                            </div>

                            {expandedTenants.includes(team.tenant_id) && (
                                <div className="border-t border-black/5 dark:border-white/10 p-2">
                                    <Table>
                                        <TableHeader className="bg-black/[0.02] dark:bg-white/[0.03]">
                                            <TableRow className="hover:bg-transparent border-black/5 dark:border-white/5">
                                                <TableHead className="w-[300px] text-xs font-bold uppercase tracking-wider text-muted-foreground">User Info</TableHead>
                                                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</TableHead>
                                                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {team.users.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                        No users found for this client.
                                                    </TableCell>
                                                </TableRow>
                                            ) : team.users.map((u) => (
                                                <TableRow key={u.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] border-black/5 dark:border-white/5 group">
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{u.email}</span>
                                                            <p className="text-xs text-muted-foreground font-mono flex items-center gap-2 mt-0.5">
                                                                {u.email === currentUser?.email && (
                                                                    <Badge variant="success" className="h-4 text-[9px] px-1.5 animate-pulse rounded-full font-bold">
                                                                        <Activity className="w-2.5 h-2.5 mr-1" />
                                                                        Online (You)
                                                                    </Badge>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <RoleBadge role={u.role as UserRole} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={u.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-xs" : "bg-slate-500/10 text-slate-500 border-slate-500/20 font-semibold text-xs"}
                                                        >
                                                            {u.is_active ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground rounded-lg">
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-xl border-border rounded-xl">
                                                                <DropdownMenuItem
                                                                    className={cn("cursor-pointer font-medium", u.is_active ? "text-red-500 hover:bg-red-500/10" : "text-emerald-500 hover:bg-emerald-500/10")}
                                                                    onClick={() => setUserToDeactivate(u)}
                                                                >
                                                                    {u.is_active ? "Deactivate" : "Activate"}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card-pro rounded-2xl overflow-hidden shadow-lg border-white/70 dark:border-white/10">
                    <Table>
                        <TableHeader className="bg-black/[0.02] dark:bg-white/[0.03]">
                            <TableRow className="hover:bg-transparent border-black/5 dark:border-white/10">
                                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">User Profile</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Login</TableHead>
                                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                                        No team members found. Click "Invite Member" to add your first colleague.
                                    </TableCell>
                                </TableRow>
                            ) : users.map((u) => (
                                <TableRow key={u.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] border-black/5 dark:border-white/5 group transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner">
                                                {u.name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                                                        onClick={() => router.push(`/users/${u.id}`)}
                                                    >
                                                        {u.name || "System User"}
                                                    </span>
                                                    {u.email === currentUser?.email && (
                                                        <Badge variant="success" className="h-4 text-[9px] px-1.5 animate-pulse rounded-full font-bold">
                                                            <Activity className="w-2.5 h-2.5 mr-1" />
                                                            Online (You)
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground font-medium">{u.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <RoleBadge role={u.role} />
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={u.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-xs" : "bg-slate-500/10 text-slate-500 border-slate-500/20 font-semibold text-xs"}
                                        >
                                            {u.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {u.last_login || "Recently"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground rounded-lg">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-xl border-border rounded-xl">
                                                <DropdownMenuItem
                                                    className="text-foreground hover:bg-accent cursor-pointer font-medium"
                                                    onClick={() => { setEditingUser(u); setNewRole(u.role); }}
                                                >
                                                    Edit Role
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-foreground hover:bg-accent cursor-pointer font-medium">Reset Password</DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className={cn("cursor-pointer font-medium", u.is_active ? "text-red-500 hover:bg-red-500/10" : "text-emerald-500 hover:bg-emerald-500/10")}
                                                    onClick={() => setUserToDeactivate(u)}
                                                >
                                                    {u.is_active ? "Deactivate" : "Activate"}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Invite Modal */}
            <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogContent className="bg-background/95 backdrop-blur-2xl border-border rounded-2xl max-w-md shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">{inviteStep === 1 ? "Invite Team Member" : "Invitation Successful!"}</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs mt-1">
                            {inviteStep === 1
                                ? "Invited members will receive access to this tenant immediately."
                                : "The account has been created. Provide these credentials to the user."}
                        </DialogDescription>
                    </DialogHeader>

                    {inviteStep === 1 ? (
                        <div className="space-y-4 py-3">
                            <div className="space-y-1.5">
                                <Label className="text-foreground font-semibold text-xs">Full Name</Label>
                                <Input
                                    className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground rounded-xl"
                                    placeholder="e.g. John Doe"
                                    value={newMember.name}
                                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-foreground font-semibold text-xs">Email Address</Label>
                                <Input
                                    className="bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground rounded-xl"
                                    placeholder="john@example.com"
                                    value={newMember.email}
                                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-foreground font-semibold text-xs">System Role</Label>
                                <select
                                    className="w-full bg-white/60 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 rounded-xl h-10 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                                    value={newMember.role}
                                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value as UserRole })}
                                >
                                    {(role === "AGENCY" || role === "AGENCY_ADMIN" || role === "DEVELOPER") && (
                                        <>
                                            <option value="AGENCY_ADMIN" className="bg-popover text-popover-foreground">Agency Admin</option>
                                            <option value="DEVELOPER" className="bg-popover text-popover-foreground">Developer</option>
                                        </>
                                    )}
                                    <option value="CLIENT_ADMIN" className="bg-popover text-popover-foreground">Client Admin</option>
                                    <option value="BD_MANAGER" className="bg-popover text-popover-foreground">BD Manager</option>
                                    <option value="EXECUTIVE" className="bg-popover text-popover-foreground">Sales Executive</option>
                                    <option value="CALL_CENTER" className="bg-popover text-popover-foreground">Call Center Access</option>
                                </select>
                            </div>
                            {isAgency && (
                                <div className="space-y-1.5">
                                    <Label className="text-foreground font-semibold text-xs">Assign to Tenant</Label>
                                    <select
                                        className="w-full bg-white/60 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 rounded-xl h-10 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                                        value={newMember.tenant_id || ""}
                                        onChange={(e) => setNewMember({ ...newMember, tenant_id: e.target.value ? parseInt(e.target.value) : undefined })}
                                    >
                                        <option value="" className="bg-popover text-popover-foreground">Select Client...</option>
                                        {teams.map(t => (
                                            <option key={t.tenant_id} value={t.tenant_id} className="bg-popover text-popover-foreground">{t.tenant_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 py-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/20">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <Shield className="w-3 h-3" /> Temporary Password
                                </p>
                                <div className="relative">
                                    <Input
                                        readOnly
                                        type={showPassword ? "text" : "password"}
                                        value={generatedPassword}
                                        className="bg-black/40 border-white/10 font-mono text-white pr-20"
                                    />
                                    <div className="absolute right-1 top-1 flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="hover:bg-white/10">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            navigator.clipboard.writeText(generatedPassword);
                                            toast("Copied to clipboard!", "success");
                                        }} className="hover:bg-white/10">
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-amber-500/70 italic flex items-center gap-1">
                                    Important: This password is not stored. Copy it now.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {inviteStep === 1 ? (
                            <Button
                                className="bg-primary hover:bg-primary/90 w-full text-white font-semibold rounded-xl shadow-md shadow-primary/25"
                                onClick={handleInvite}
                                disabled={!newMember.name || !newMember.email || (isAgency && !newMember.tenant_id)}
                            >
                                Generate Credentials
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full bg-white/60 dark:bg-white/[0.04] border-white/80 dark:border-white/10 text-foreground rounded-xl"
                                onClick={() => setIsInviteModalOpen(false)}
                            >
                                Close & Finish
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Role Modal */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="bg-background/95 backdrop-blur-2xl border-border rounded-2xl max-w-sm shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Edit User Role</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1">Change the permission level for {editingUser?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">Select New Role</Label>
                            <select
                                className="w-full bg-white/60 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 rounded-xl h-10 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value as UserRole)}
                            >
                                {(role === "AGENCY" || role === "AGENCY_ADMIN" || role === "DEVELOPER") && (
                                    <>
                                        <option value="AGENCY_ADMIN" className="bg-popover text-popover-foreground">Agency Admin</option>
                                        <option value="DEVELOPER" className="bg-popover text-popover-foreground">Developer</option>
                                    </>
                                )}
                                <option value="CLIENT_ADMIN" className="bg-popover text-popover-foreground">Client Admin</option>
                                <option value="BD_MANAGER" className="bg-popover text-popover-foreground">BD Manager</option>
                                <option value="EXECUTIVE" className="bg-popover text-popover-foreground">Sales Executive</option>
                                <option value="CALL_CENTER" className="bg-popover text-popover-foreground">Call Center Access</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="rounded-xl border-border" onClick={() => setEditingUser(null)}>Cancel</Button>
                        <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-md shadow-primary/25" onClick={handleRoleUpdate}>Update Role</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deactivation Confirmation Modal */}
            <Dialog open={!!userToDeactivate} onOpenChange={(open) => !open && setUserToDeactivate(null)}>
                <DialogContent className="bg-background/95 backdrop-blur-2xl border-border rounded-2xl max-w-sm shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-500 flex items-center gap-2 text-xl font-bold">
                            <Shield className="w-5 h-5" /> Confirm Action
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1">
                            Are you sure you want to {userToDeactivate?.is_active ? "deactivate" : "activate"} <strong className="text-foreground">{userToDeactivate?.name}</strong>?
                            {userToDeactivate?.is_active && " They will lose access to the system immediately."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" className="rounded-xl" onClick={() => setUserToDeactivate(null)}>Cancel</Button>
                        <Button
                            variant={userToDeactivate?.is_active ? "destructive" : "default"}
                            className={!userToDeactivate?.is_active ? "bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold" : "rounded-xl font-semibold"}
                            onClick={() => {
                                if (userToDeactivate) {
                                    handleStatusUpdate(userToDeactivate.id, !userToDeactivate.is_active);
                                    setUserToDeactivate(null);
                                }
                            }}
                        >
                            {userToDeactivate?.is_active ? "Deactivate User" : "Activate User"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
