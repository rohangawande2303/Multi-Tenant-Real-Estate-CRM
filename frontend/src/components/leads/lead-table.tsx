/**
 * File: src/components/leads/lead-table.tsx
 * Purpose: Professional lead grid with TanStack Table
 */

"use client";

import React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
} from "@tanstack/react-table";
import { MoreHorizontal, ExternalLink, Edit2, Trash2, CheckCircle2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useToast } from "@/contexts/toast-context";

import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lead } from "@/types/lead";
import { LEAD_STATUSES } from "@/lib/constants";

interface LeadTableProps {
    data: Lead[];
    onRefresh?: () => void;
}

export function LeadTable({ data, onRefresh }: LeadTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const router = useRouter();
    const { toast } = React.useMemo(() => ({ toast: (m: string, v: string) => { console.log(m, v); } }), []); // Fallback if context not available in this scope
    // Use actual toast if possible
    const { toast: actualToast } = useToast();

    const handleDelete = async (lead: Lead) => {
        if (!window.confirm(`Are you sure you want to delete lead: ${lead.name}?`)) return;
        try {
            await api.delete(`/leads/${lead.id}`);
            actualToast("Lead deleted successfully", "success");
            onRefresh?.();
        } catch (err: any) {
            actualToast("Failed to delete lead", "error");
        }
    };

    const handleStatusUpdate = async (lead: Lead, newStatus: string) => {
        try {
            await api.patch(`/leads/${lead.id}`, { status: newStatus });
            actualToast(`Status updated to ${newStatus}`, "success");
            onRefresh?.();
        } catch (err: any) {
            actualToast("Failed to update status", "error");
        }
    };

    function ReceivedCell({ row }: { row: any }) {
        const [mounted, setMounted] = React.useState(false);
        React.useEffect(() => { setMounted(true); }, []);

        if (!mounted) return <div className="h-10 w-24 bg-white/5 animate-pulse rounded" />;

        const raw = row.getValue("created_at");
        const date = raw ? new Date(raw) : new Date();
        return (
            <div className="text-xs font-medium">
                <p>{date.toLocaleDateString()}</p>
                <p className="text-muted-foreground">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        );
    }

    const columns: ColumnDef<Lead>[] = [
        {
            accessorKey: "name",
            header: "Lead Name",
            cell: ({ row }) => (
                <div className="font-bold flex flex-col">
                    <span>{row.getValue("name")}</span>
                    <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-widest">{String(row.original.id).slice(0, 8)}</span>
                </div>
            ),
        },
        {
            accessorKey: "phone",
            header: "Contact",
            cell: ({ row }) => (
                <div className="flex flex-col text-sm">
                    <span className="font-medium">{row.getValue("phone")}</span>
                    <span className="text-muted-foreground text-xs">{row.original.email || "No email"}</span>
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                const config = LEAD_STATUSES.find(s => s.value === status) || LEAD_STATUSES[0];

                return (
                    <Badge
                        variant={"outline"}
                        className={cn("border-none capitalize font-bold", config.color.replace("bg-", "text-").replace("-500", "-400"))}
                    >
                        <div className={cn("w-2 h-2 rounded-full mr-2 animate-pulse", config.color)} />
                        {config.label}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "mandate_name",
            header: "Mandate",
            cell: ({ row }) => (
                <div className="text-xs font-medium">
                    <p>{row.original.mandate_name || "N/A"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{row.original.developer_id || "No Dev ID"}</p>
                </div>
            ),
        },
        {
            accessorKey: "project_name",
            header: "Project",
            cell: ({ row }) => (
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 max-w-[120px] truncate">
                    {row.original.project_name || `ID: ${row.original.project_id}`}
                </Badge>
            ),
        },
        {
            accessorKey: "created_at",
            header: "Received",
            cell: ({ row }) => <ReceivedCell row={row} />,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 glass-card border-white/10 p-2">
                            <DropdownMenuLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground px-2 py-1.5">Lead Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem className="cursor-pointer gap-2 py-2.5" onClick={() => router.push(`/leads/${row.original.id}`)}>
                                <ExternalLink className="w-4 h-4 text-primary" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 py-2.5" onClick={() => router.push(`/leads/${row.original.id}/edit`)}>
                                <Edit2 className="w-4 h-4 text-amber-400" /> Edit Lead
                            </DropdownMenuItem>

                            {/* Status Sub-menu mock since original menu might be limited */}
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground px-2 py-1">Change Status</DropdownMenuLabel>
                            <div className="grid grid-cols-1 gap-1 p-1">
                                {LEAD_STATUSES.map(s => (
                                    <DropdownMenuItem
                                        key={s.value}
                                        className={cn(
                                            "cursor-pointer text-[10px] font-bold uppercase py-1.5 px-2 rounded-md",
                                            row.original.status === s.value ? "bg-primary/20 text-primary" : "hover:bg-white/5"
                                        )}
                                        onClick={() => handleStatusUpdate(row.original, s.value)}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full mr-2", s.color)} />
                                        {s.label}
                                    </DropdownMenuItem>
                                ))}
                            </div>

                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem
                                className="cursor-pointer gap-2 py-2.5 text-red-400 focus:text-red-300 focus:bg-red-500/10"
                                onClick={() => handleDelete(row.original)}
                            >
                                <Trash2 className="w-4 h-4" /> Delete Lead
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    });

    return (
        <div className="glass-card-pro overflow-hidden shadow-lg">
            <Table>
                <TableHeader className="bg-black/[0.02] dark:bg-white/[0.03]">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="hover:bg-transparent border-black/5 dark:border-white/5">
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className="text-muted-foreground font-bold h-12 text-xs uppercase tracking-wider">
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors border-black/5 dark:border-white/5"
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className="py-4">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
