/**
 * File: src/app/(dashboard)/leads/[id]/page.tsx
 * Purpose: Detailed view for a single lead with activity tracking
 */

"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/contexts/toast-context";

import {
    ArrowLeft,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Star,
    Edit,
    UserCircle,
    Building,
    Activity,
    MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadTimeline } from "@/components/leads/lead-timeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Lead, LeadComment, LeadTimelineItem } from "@/types/lead";
import { LEAD_STATUSES } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { role: currentUserRole } = useAuth();
    const { toast } = useToast();
    const leadId = params.id as string;


    const [commentText, setCommentText] = React.useState("");
    const [selectedRole, setSelectedRole] = React.useState<string>(currentUserRole || "AGENT");

    // Fetch Lead Details
    const { data: lead, isLoading: leadLoading } = useQuery<Lead>({
        queryKey: ["lead", leadId],
        queryFn: async () => {
            const res = await api.get(`/leads/${leadId}`);
            return res.data;
        }
    });

    // Fetch Comments
    const { data: comments = [], isLoading: commentsLoading } = useQuery<LeadComment[]>({
        queryKey: ["lead-comments", leadId],
        queryFn: async () => {
            const res = await api.get(`/leads/${leadId}/comments`);
            return res.data;
        }
    });

    // Mutation: Add Comment
    const addCommentMutation = useMutation({
        mutationFn: async (newComment: { content: string; role: string }) => {
            return api.post(`/leads/${leadId}/comments`, newComment);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lead-comments", leadId] });
            setCommentText("");
            toast("Comment added successfully", "success");

        }
    });

    if (leadLoading) return <div className="p-10 text-center animate-pulse font-bold text-white">Loading Lead Details...</div>;
    if (!lead) return <div className="p-10 text-center text-red-500 font-bold text-white">Lead Not Found</div>;


    const statusConfig = LEAD_STATUSES.find(s => s.value === lead.status) || LEAD_STATUSES[0];

    // Combine comments into timeline format
    const timelineItems: LeadTimelineItem[] = [
        ...comments.map(c => ({
            id: `comm_${c.id}`,
            timestamp: c.created_at,
            content: "Comment Added",
            performed_by_name: `User #${c.user_id}`,
            role: c.role,
            data: {
                activity_type: "comment",
                description: c.content
            }
        })),
        {
            id: "creation",
            timestamp: lead.created_at,
            content: "Lead Created",
            performed_by_name: "System",
            data: {
                activity_type: "creation",
                description: lead.source_group ? `Received via ${lead.source_group}` : "Manually Created"
            }
        }
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
        <div className="space-y-6 pb-20">
            {/* Breadcrumbs & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full bg-white/5 border border-white/10 hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-3">
                            {lead.name}
                            <Badge variant="outline" className={cn("border-none capitalize font-bold", statusConfig.color.replace("bg-", "text-").replace("-500", "-400"))}>
                                <div className={cn("w-2 h-2 rounded-full mr-2", statusConfig.color)} />
                                {statusConfig.label}
                            </Badge>
                        </h1>
                        <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase mt-1">ID: {lead.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="glass border-white/10">
                        <Star className="w-4 h-4 mr-2" />
                        Rate Lead
                    </Button>
                    <Button className="purple-gradient shadow-lg shadow-primary/20">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Profile Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="glass-card border-white/5 bg-card/40 overflow-hidden">
                        <CardHeader className="border-b border-white/5 bg-white/5">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <UserCircle className="w-4 h-4 text-primary" />
                                Contact Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Phone</p>
                                    <p className="text-sm font-bold">{lead.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="text-sm font-bold truncate">{lead.email || "Not Provided"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Location</p>
                                    <p className="text-sm font-bold">{lead.city || "Unknown"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-white/5 bg-card/40 overflow-hidden">
                        <CardHeader className="border-b border-white/5 bg-white/5">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Building className="w-4 h-4 text-purple-500" />
                                Enterprise Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter font-bold">Project</p>
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                    {lead.project_name || `Project #${lead.project_id}`}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter font-bold">Mandate</p>
                                <p className="text-sm font-bold">{lead.mandate_name || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter font-bold">Developer ID</p>
                                <p className="text-sm font-bold text-muted-foreground">{lead.developer_id || "GLOBAL"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter font-bold">Registered On</p>
                                <p className="text-sm font-bold flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    {new Date(lead.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Tabs defaultValue="activity" className="w-full">
                        <TabsList className="bg-white/5 border border-white/5 p-1 rounded-xl mb-6">
                            <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 px-6">
                                <Activity className="w-4 h-4" />
                                Interaction History
                            </TabsTrigger>
                            <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 px-6">
                                <UserCircle className="w-4 h-4" />
                                Metadata Profile
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="activity" className="space-y-6">
                            {/* Add Comment Section */}
                            <Card className="glass-card border-white/5 bg-card/40 overflow-hidden">
                                <CardHeader className="py-3 px-6 bg-white/5 border-b border-white/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xs font-black tracking-widest uppercase">Add Internal Interaction</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Role:</span>
                                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                                <SelectTrigger className="w-[140px] h-7 text-[10px] bg-white/5 border-white/10 uppercase font-black">
                                                    <SelectValue placeholder="Select Role" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-neutral-900 border-white/10">
                                                    <SelectItem value="AGENT" className="text-[10px] uppercase font-bold">Agent</SelectItem>
                                                    <SelectItem value="TEAM_LEADER" className="text-[10px] uppercase font-bold">Team Leader</SelectItem>
                                                    <SelectItem value="MANAGER" className="text-[10px] uppercase font-bold">Manager</SelectItem>
                                                    <SelectItem value="ADMIN" className="text-[10px] uppercase font-bold">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <Textarea
                                        placeholder="Record the summary of your interaction or internal note..."
                                        className="bg-transparent border-none resize-none focus-visible:ring-0 min-h-[80px] text-sm"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            size="sm"
                                            className="purple-gradient text-xs font-bold"
                                            disabled={!commentText.trim() || addCommentMutation.isPending}
                                            onClick={() => addCommentMutation.mutate({ content: commentText, role: selectedRole })}
                                        >
                                            {addCommentMutation.isPending ? "Recording..." : "Post Interaction"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="glass-card p-6 rounded-2xl border-white/5 bg-card/40 min-h-[400px]">
                                <LeadTimeline items={timelineItems} />
                            </div>
                        </TabsContent>

                        <TabsContent value="profile">
                            <div className="glass-card p-8 rounded-2xl border-white/5 bg-card/40 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {lead.custom_fields && Object.entries(lead.custom_fields).map(([key, value]) => (
                                    <div key={key}>
                                        <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">{key.replace(/_/g, ' ')}</p>
                                        <p className="text-lg font-bold">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                                    </div>
                                ))}
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Source detail</p>
                                    <p className="text-sm font-bold text-primary">{lead.source_detail || "N/A"}</p>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
