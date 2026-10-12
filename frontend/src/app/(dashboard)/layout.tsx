/**
 * File: src/app/(dashboard)/layout.tsx
 * Purpose: State-of-the-art Glassmorphism Layout with Atmospheric Aurora Glow & Pinned 3-Zone Sidebar
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Layers,
    Settings,
    LogOut,
    Menu,
    X,
    PieChart,
    Link as LinkIcon,
    Building2,
    Search,
    Activity,
    ChevronDown,
    Building2 as SidebarBuilding,
    Command,
    Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserRole } from "@/lib/constants";
import { ActivityTracker } from "@/lib/activity-tracker";
import { useToast } from "@/contexts/toast-context";
import { motion } from "framer-motion";

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    roles: UserRole[];
    group: "workspace" | "manage";
}

const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["AGENCY", "AGENCY_ADMIN", "DEVELOPER", "CLIENT_ADMIN", "BD_MANAGER", "EXECUTIVE", "CALL_CENTER"], group: "workspace" },
    { label: "Leads", href: "/leads", icon: Layers, roles: ["AGENCY", "AGENCY_ADMIN", "DEVELOPER", "CLIENT_ADMIN", "BD_MANAGER", "EXECUTIVE", "CALL_CENTER"], group: "workspace" },
    { label: "Projects", href: "/projects", icon: Building2, roles: ["AGENCY", "AGENCY_ADMIN", "DEVELOPER", "CLIENT_ADMIN", "BD_MANAGER"], group: "workspace" },
    { label: "Team Management", href: "/users", icon: Users, roles: ["AGENCY", "AGENCY_ADMIN", "DEVELOPER", "CLIENT_ADMIN"], group: "manage" },
    { label: "Integrations", href: "/integrations", icon: LinkIcon, roles: ["AGENCY", "AGENCY_ADMIN", "DEVELOPER", "CLIENT_ADMIN"], group: "manage" },
    { label: "Activity Log", href: "/activity", icon: Activity, roles: ["AGENCY", "AGENCY_ADMIN", "DEVELOPER", "CLIENT_ADMIN"], group: "manage" },
    { label: "Agency Panel", href: "/agency/clients", icon: PieChart, roles: ["AGENCY", "AGENCY_ADMIN"], group: "manage" },
    { label: "Settings", href: "/settings", icon: Settings, roles: ["AGENCY", "AGENCY_ADMIN", "DEVELOPER", "CLIENT_ADMIN", "BD_MANAGER", "EXECUTIVE", "CALL_CENTER"], group: "manage" },
];

function formatRoleName(role?: string | null): string {
    if (!role) return "";
    return role
        .split("_")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

// Project Switcher for the sidebar
function ProjectSwitcher({ isSidebarOpen }: { isSidebarOpen: boolean }) {
    const { activeProjectId, selectProject } = useAuth();
    const { projects } = useProjects();
    const [isOpen, setIsOpen] = React.useState(false);
    const activeProject = projects.find(p => p.id === activeProjectId);

    if (!projects.length) return null;

    return (
        <div className="px-3 pt-2 pb-1">
            {isSidebarOpen ? (
                <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-2 py-0.5">Workspace</p>
                    <div className="relative">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                                "bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm",
                                isOpen ? "ring-2 ring-primary/30 border-primary/50" : "hover:bg-white/60 dark:hover:bg-white/[0.08]"
                            )}
                        >
                            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0">
                                {activeProject?.name?.charAt(0) || "P"}
                            </div>
                            <span className="truncate flex-1 text-left font-medium text-foreground">{activeProject?.name || "All Projects"}</span>
                            <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                        </button>

                        {/* Dropdown */}
                        {isOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                                <div className="absolute top-full left-0 w-full mt-1.5 max-h-52 overflow-y-auto slim-scrollbar rounded-2xl border border-white/70 dark:border-white/15 bg-white/85 dark:bg-[#12121c]/90 backdrop-blur-2xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                                    <button
                                        onClick={() => { selectProject(null); setIsOpen(false); }}
                                        className={cn(
                                            "w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2 font-medium",
                                            !activeProjectId ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                        )}
                                    >
                                        <Layers className="w-3.5 h-3.5 stroke-[1.75]" />
                                        <span className="truncate">All Projects</span>
                                    </button>
                                    <div className="h-px bg-border/60 my-1 mx-1" />
                                    {projects.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => { selectProject(p.id); setIsOpen(false); }}
                                            className={cn(
                                                "w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2 font-medium",
                                                activeProjectId === p.id ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded text-[9px] flex items-center justify-center font-bold",
                                                activeProjectId === p.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                                            )}>
                                                {p.name.charAt(0)}
                                            </div>
                                            <span className="truncate">{p.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex justify-center group relative">
                    <button
                        className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all border",
                            "bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border-white/60 dark:border-white/10 shadow-sm",
                            activeProject
                                ? "border-primary/40 text-primary"
                                : "text-muted-foreground hover:text-primary hover:border-primary/40"
                        )}
                        onClick={() => setIsOpen(true)}
                        title={activeProject?.name || "Select Project"}
                    >
                        {activeProject ? (
                            <span className="text-xs font-bold">{activeProject.name.charAt(0)}</span>
                        ) : (
                            <SidebarBuilding className="w-4 h-4 stroke-[1.75]" />
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const pathname = usePathname();
    const { user, role, logout } = useAuth();
    const { toast } = useToast();

    const filteredNavItems = navItems.filter(item =>
        role && item.roles.includes(role as UserRole)
    );

    const workspaceItems = filteredNavItems.filter(item => item.group === "workspace");
    const manageItems = filteredNavItems.filter(item => item.group === "manage");

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row relative overflow-hidden">
            <ActivityTracker />

            {/* =========================================================================
                ATMOSPHERIC AURORA & AI TECH AMBIENCE (BACKGROUND ANIMATION ENGINE)
                Vivid, organic floating gradients & tech grid that shine through frosted glass
                ========================================================================= */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
                {/* Modern AI Tech Matrix Grid */}
                <div className="absolute inset-0 bg-tech-grid opacity-70 dark:opacity-45" />

                {/* Orb 1: Brand Royal Purple (Top Right) */}
                <div className="aurora-orb-1 absolute -top-32 right-[5%] w-[680px] h-[680px] rounded-full bg-gradient-to-br from-purple-600/28 via-primary/22 to-transparent blur-[130px] dark:from-purple-600/38 dark:via-primary/28" />
                
                {/* Orb 2: Cyber Cyan / Teal (Bottom Left) */}
                <div className="aurora-orb-2 absolute -bottom-40 left-[2%] w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-cyan-400/22 via-sky-500/18 to-transparent blur-[140px] dark:from-cyan-500/26 dark:via-sky-600/20" />
                
                {/* Orb 3: Orchid / Fuchsia Neon (Mid Center behind KPI cards) */}
                <div className="aurora-orb-3 absolute top-[28%] left-[22%] w-[520px] h-[520px] rounded-full bg-gradient-to-r from-fuchsia-500/18 via-purple-500/14 to-transparent blur-[120px] dark:from-fuchsia-600/22 dark:via-purple-600/18" />

                {/* Orb 4: Electric Blue / Indigo (Top Left behind Brand header) */}
                <div className="aurora-orb-4 absolute -top-20 -left-20 w-[580px] h-[580px] rounded-full bg-gradient-to-br from-indigo-500/22 via-blue-600/16 to-transparent blur-[130px] dark:from-indigo-600/28 dark:via-blue-700/20" />

                {/* Orb 5: Warm Rose / Coral Glow (Bottom Right) */}
                <div className="aurora-orb-5 absolute -bottom-24 right-[15%] w-[480px] h-[480px] rounded-full bg-gradient-to-tl from-rose-500/16 via-purple-500/12 to-transparent blur-[120px] dark:from-rose-600/20 dark:via-purple-600/14" />

                {/* Floating Luminous Stardust / AI Light Motes (Clean & Classy) */}
                <div className="particle-mote-1 absolute top-[22%] left-[34%] w-1.5 h-1.5 rounded-full bg-primary/70 blur-[0.5px] shadow-[0_0_10px_rgba(128,25,239,0.9)]" />
                <div className="particle-mote-2 absolute top-[68%] left-[18%] w-2 h-2 rounded-full bg-cyan-400/70 blur-[0.5px] shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
                <div className="particle-mote-3 absolute top-[38%] right-[22%] w-1.5 h-1.5 rounded-full bg-purple-300/80 blur-[0.5px] shadow-[0_0_8px_rgba(192,132,252,0.9)]" />
                <div className="particle-mote-4 absolute bottom-[26%] right-[32%] w-2 h-2 rounded-full bg-pink-400/60 blur-[0.5px] shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                <div className="particle-mote-5 absolute top-[78%] left-[58%] w-1 h-1 rounded-full bg-indigo-300/70 blur-[0.5px] shadow-[0_0_8px_rgba(165,180,252,0.8)]" />
            </div>

            {/* Mobile Drawer Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-md z-30 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Pure Frosted Glass with Specular Edge and Pinned Zones) */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-40 transition-all duration-200 ease-out flex flex-col",
                "bg-white/60 dark:bg-[#0c0c14]/65 backdrop-blur-2xl border-r border-white/70 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.04)]",
                isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-[72px] md:translate-x-0"
            )}>
                {/* Zone 1: Brand Header */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-white/50 dark:border-white/10 shrink-0">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/30 border border-white/30">
                                S
                            </div>
                            <span className="font-semibold text-sm tracking-tight text-foreground">Social Pulse</span>
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center font-bold text-sm mx-auto shadow-md shadow-primary/30 border border-white/30">
                            S
                        </div>
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground" 
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X className="w-4 h-4 stroke-[1.75]" />
                    </Button>
                </div>

                {/* Zone 2: Project Switcher & Scrollable Nav with Sleek Scrollbar */}
                <div className="flex-1 overflow-y-auto slim-scrollbar flex flex-col py-2 px-3 space-y-4 min-h-0">
                    <ProjectSwitcher isSidebarOpen={isSidebarOpen} />

                    {/* Navigation Group 1: Workspace */}
                    <div className="space-y-1">
                        {isSidebarOpen && (
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75 px-3 py-1">Workspace</p>
                        )}
                        {workspaceItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "h-10 flex items-center gap-3 px-3 rounded-xl text-xs font-medium transition-all group relative",
                                        isActive
                                            ? "bg-white/80 dark:bg-white/[0.08] backdrop-blur-md text-primary font-semibold border border-white/80 dark:border-white/15 shadow-sm"
                                            : "text-muted-foreground hover:bg-white/40 dark:hover:bg-white/[0.04] hover:text-foreground"
                                    )}
                                    title={!isSidebarOpen ? item.label : undefined}
                                >
                                    {/* Glowing slim vertical indicator bar */}
                                    {isActive && (
                                        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary shadow-[0_0_8px_rgba(128,25,239,0.8)]" />
                                    )}
                                    <item.icon className={cn(
                                        "w-[18px] h-[18px] stroke-[1.75] shrink-0 transition-colors", 
                                        isActive ? "text-primary" : "group-hover:text-foreground"
                                    )} />
                                    {isSidebarOpen && <span className="truncate">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Navigation Group 2: Management */}
                    <div className="space-y-1 pt-1">
                        {isSidebarOpen && (
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75 px-3 py-1">Management</p>
                        )}
                        {manageItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "h-10 flex items-center gap-3 px-3 rounded-xl text-xs font-medium transition-all group relative",
                                        isActive
                                            ? "bg-white/80 dark:bg-white/[0.08] backdrop-blur-md text-primary font-semibold border border-white/80 dark:border-white/15 shadow-sm"
                                            : "text-muted-foreground hover:bg-white/40 dark:hover:bg-white/[0.04] hover:text-foreground"
                                    )}
                                    title={!isSidebarOpen ? item.label : undefined}
                                >
                                    {/* Glowing slim vertical indicator bar */}
                                    {isActive && (
                                        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary shadow-[0_0_8px_rgba(128,25,239,0.8)]" />
                                    )}
                                    <item.icon className={cn(
                                        "w-[18px] h-[18px] stroke-[1.75] shrink-0 transition-colors", 
                                        isActive ? "text-primary" : "group-hover:text-foreground"
                                    )} />
                                    {isSidebarOpen && <span className="truncate">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Zone 3: Bottom User Profile & Sign Out (Never clipped, always visible) */}
                <div className="p-3 border-t border-white/50 dark:border-white/10 bg-white/30 dark:bg-black/20 backdrop-blur-md shrink-0 space-y-2">
                    {isSidebarOpen && user && (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/60 dark:bg-white/[0.05] backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-white/30">
                                {user?.name?.charAt(0) || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">
                                    {user?.name || "User"}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate font-normal">
                                    {formatRoleName(role)}
                                </p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={logout}
                        className={cn(
                            "w-full h-9 flex items-center gap-2.5 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors",
                            !isSidebarOpen && "justify-center px-0"
                        )}
                        title="Sign Out"
                    >
                        <LogOut className="w-4 h-4 stroke-[1.75] shrink-0" />
                        {isSidebarOpen && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 transition-all duration-200 relative z-10",
                isSidebarOpen ? "md:ml-64" : "md:ml-[72px]"
            )}>
                {/* Top Bar (Pure Frosted Glass with Specular Edge) */}
                <header className="h-16 sticky top-0 z-30 bg-white/60 dark:bg-[#0c0c14]/65 backdrop-blur-2xl border-b border-white/70 dark:border-white/10 px-4 md:px-8 flex items-center justify-between shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
                    {/* Left: Collapse toggle + search input */}
                    <div className="flex items-center gap-3 flex-1 max-w-md">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/10 rounded-xl shrink-0"
                            aria-label="Toggle sidebar"
                        >
                            <Menu className="w-4 h-4 stroke-[1.75]" />
                        </Button>

                        <div className="relative w-full max-w-xs hidden sm:block">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground stroke-[1.75]" />
                            <input
                                type="text"
                                placeholder="Search leads, projects..."
                                className="w-full h-9 pl-9 pr-14 rounded-full border border-white/70 dark:border-white/10 bg-white/50 dark:bg-white/[0.04] backdrop-blur-md text-xs text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-white/80 dark:focus:bg-black/40 transition-all shadow-inner"
                                onChange={(e) => {
                                    if (e.target.value.length > 2) {
                                        console.log("Global Search:", e.target.value);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        toast("Searching for: " + (e.target as HTMLInputElement).value, "info");
                                    }
                                }}
                            />
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.08] text-[10px] text-muted-foreground font-medium pointer-events-none shadow-none">
                                <Command className="w-2.5 h-2.5" />
                                <span>K</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Theme toggle, notification bell, divider, user pill */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <ThemeToggle />
                        <NotificationBell />

                        <div className="h-5 w-px bg-white/60 dark:bg-white/10 mx-1 hidden sm:block" />

                        {user && (
                            <div className="flex items-center gap-2.5 pl-1">
                                <div className="hidden lg:flex flex-col items-end text-right">
                                    <span className="text-xs font-semibold text-foreground leading-tight">
                                        {user?.name || "User"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-normal leading-tight">
                                        {formatRoleName(role)}
                                    </span>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-primary/25 border border-white/30">
                                    {user?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Page Canvas Container with Subtle On-Visit Entrance Animation */}
                <main className="flex-1 p-5 md:p-8 relative">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="max-w-7xl mx-auto"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
