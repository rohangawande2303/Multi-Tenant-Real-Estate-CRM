/**
 * File: src/app/(dashboard)/projects/page.tsx
 * Purpose: Project management grid view with real data and active project binding
 */

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    Building2,
    Plus,
    MoreVertical,
    Target,
    Clock,
    Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useAuth } from "@/contexts/auth-context";
import { useProjects } from "@/hooks/use-projects";
import { CreateProjectModal } from "@/components/projects/create-project-modal";

export default function ProjectsPage() {
    const { role, isAgency, activeProjectId, selectProject } = useAuth();
    const { projects, loading, refresh } = useProjects();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const canCreate = role === "AGENCY" || role === "AGENCY_ADMIN" || role === "DEVELOPER" || role === "CLIENT_ADMIN";

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            <PageHeader
                title="Active Projects"
                description={isAgency ? "Manage all client projects cross-referenced with your agency portfolio." : "Manage your projects and lead campaign settings."}
            >
                {canCreate && (
                    <Button
                        className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                )}
            </PageHeader>

            {loading ? (
                <div className="flex justify-center py-20">
                    <LoadingSpinner />
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 sm:py-32 space-y-4 glass-card-pro rounded-3xl p-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                        <Building2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                        <h3 className="text-xl font-bold text-foreground">No Projects Found</h3>
                        <p className="text-sm text-muted-foreground">Create your first project to start capturing and organizing real estate leads.</p>
                    </div>
                    {canCreate && (
                        <Button
                            variant="outline"
                            className="mt-4 border-white/60 dark:border-white/10 hover:bg-primary/10 hover:text-primary rounded-xl"
                            onClick={() => setIsCreateOpen(true)}
                        >
                            Create Project
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project, index) => {
                        const isActive = activeProjectId === project.id;
                        return (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: index * 0.04 }}
                                className={`group relative glass-card-pro glass-card-hover rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 overflow-hidden ${isActive
                                    ? 'border-primary shadow-xl shadow-primary/20 ring-1 ring-primary/40'
                                    : 'border-white/70 dark:border-white/10'
                                    }`}
                            >
                                {/* Active Indicator Bar */}
                                {isActive && (
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-400 to-primary" />
                                )}

                                <div>
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-primary/10 text-primary border border-primary/20'
                                            }`}>
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10 rounded-lg">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-xl border-border rounded-xl">
                                                <DropdownMenuItem className="text-foreground hover:bg-accent cursor-pointer">Edit Details</DropdownMenuItem>
                                                <DropdownMenuItem className="text-foreground hover:bg-accent cursor-pointer">Configure Campaigns</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-500 hover:bg-red-500/10 cursor-pointer font-semibold">Archive Project</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className={`font-bold text-lg tracking-tight leading-snug ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                                {project.name}
                                            </h3>
                                            <Badge variant={project.status === "ACTIVE" ? "success" : "secondary"} className="text-[10px] shrink-0 font-semibold">
                                                {project.status}
                                            </Badge>
                                        </div>

                                        {isAgency && project.tenant_name && (
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg w-fit border border-primary/20">
                                                <Briefcase className="w-3 h-3" />
                                                Client: {project.tenant_name}
                                            </div>
                                        )}

                                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[36px] leading-relaxed">
                                            {project.description || "No description provided for this project."}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-3 py-3 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-black/20 -mx-6 px-6 rounded-b-lg">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                <Target className="w-3.5 h-3.5 text-emerald-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Leads</span>
                                                <span className="text-sm font-bold text-foreground">{project._count?.leads || 0}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Created</span>
                                                <span className="text-xs font-semibold text-foreground">
                                                    {project.created_at && !isNaN(new Date(project.created_at).getTime())
                                                        ? new Date(project.created_at).toLocaleDateString()
                                                        : "Recent"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Selection Button */}
                                    <Button
                                        className={`w-full mt-4 font-semibold text-xs tracking-wider uppercase rounded-xl transition-all ${isActive
                                            ? 'bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20'
                                            : 'bg-white/60 dark:bg-white/[0.04] border border-white/80 dark:border-white/10 text-foreground hover:bg-primary hover:text-white hover:border-primary'
                                            }`}
                                        onClick={() => selectProject(isActive ? null : project.id)}
                                    >
                                        {isActive ? "Active for Context" : "Set Active for Leads"}
                                    </Button>
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Add New Project Placeholder */}
                    {canCreate && (
                        <button
                            className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 dark:border-white/10 rounded-2xl p-6 hover:bg-primary/5 hover:border-primary/50 transition-all group min-h-[280px]"
                            onClick={() => setIsCreateOpen(true)}
                        >
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 mb-3.5 transition-all duration-300">
                                <Plus className="w-7 h-7" />
                            </div>
                            <p className="font-bold text-foreground text-sm tracking-tight">Add New Project</p>
                            <p className="text-xs text-muted-foreground mt-1">Scale your reach today</p>
                        </button>
                    )}
                </div>
            )}
            <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
        </div>
    );
}
