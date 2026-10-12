"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, DownloadCloud, FileWarning, Copy, RefreshCw } from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import api from "@/lib/axios";
import { useToast } from "@/contexts/toast-context";
import { Label } from "@/components/ui/label";
// Replaced missing ScrollArea with native div
// Replaced missing RadioGroup with native inputsOW

interface ExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ImportStage = "idle" | "uploading" | "preview" | "executing" | "success" | "error";

interface PreviewStats {
    total_rows: number;
    valid_count: number;
    duplicate_count: number;
    error_count: number;
    duplicates_sample: any[];
    errors_sample: any[];
}

export function ExcelModal({ isOpen, onClose }: ExcelModalProps) {
    const { toast } = useToast();
    const { projects, loading: loadingProjects } = useProjects();
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [stage, setStage] = useState<ImportStage>("idle");
    const [stats, setStats] = useState<PreviewStats | null>(null);
    const [duplicateStrategy, setDuplicateStrategy] = useState<"SKIP" | "UPDATE" | "CREATE_NEW">("SKIP");
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string>("");

    const resetState = () => {
        setFile(null);
        setStage("idle");
        setStats(null);
        setErrorMessage("");
        setProgress(0);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && (selectedFile.name.endsWith(".csv"))) {
            setFile(selectedFile);
            setStage("idle");
            setErrorMessage("");
        } else {
            toast("Please upload a valid CSV file (.csv)", "error");
        }
    };

    const downloadTemplate = async () => {
        try {
            const response = await api.get("/data/template", {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'lead_import_template_216_columns.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast("Template downloaded successfully", "success");
        } catch (error) {
            console.error(error);
            toast("Failed to download template", "error");
        }
    };

    const formatError = (err: any): string => {
        if (!err) return "An unknown error occurred.";

        // Handle Axios/API error structure
        const status = err.response?.status;
        const detail = err.response?.data?.detail;

        // Handle generic Network Error (no response)
        if (err.message === "Network Error") {
            return "Network Error: Could not reach the server. Please check your internet connection or the server status.";
        }

        if (status === 422) {
            if (Array.isArray(detail)) {
                // Check for missing file specifically
                const isMissingFile = detail.some((d: any) => d.loc?.includes("file") || d.msg?.toLowerCase().includes("file"));
                if (isMissingFile) return "The CSV file was not received correctly. Please try refreshing and re-uploading.";

                return "The server couldn't process the file. Please ensure all columns match the requirement (216 columns).";
            }
            return "Validation Error: Please check if your CSV format is correct.";
        }

        if (typeof detail === "string") return detail;

        if (Array.isArray(detail)) {
            // Pydantic validation errors: [{loc: [], msg: "", type: ""}]
            return detail.map((d: any) => `${d.msg}${d.loc ? ` (at ${d.loc.join(".")})` : ""}`).join(", ");
        }

        if (typeof detail === "object" && detail !== null) {
            return JSON.stringify(detail);
        }

        return err.message || "Operation failed.";
    };

    const handlePreview = async () => {
        if (!file || !selectedProject) return;

        setStage("uploading");
        setProgress(30);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await api.post(`/data/import/preview?project_id=${selectedProject}`, formData);
            setStats(response.data);
            setStage("preview");
            setProgress(100);
        } catch (err: any) {
            console.error("Preview failed:", err);
            setStage("error");
            setErrorMessage(formatError(err));
        }
    };

    const handleExecute = async () => {
        if (!file || !selectedProject) return;

        setStage("executing");

        const formData = new FormData();
        formData.append("file", file);

        try {
            await api.post(`/data/import/execute?project_id=${selectedProject}&duplicate_strategy=${duplicateStrategy}`, formData);
            setStage("success");
            toast("Leads imported successfully!", "success");
        } catch (err: any) {
            console.error("Execution failed:", err);
            setStage("error");
            setErrorMessage(formatError(err));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => {
            if (!open) {
                onClose();
                setTimeout(resetState, 300);
            }
        }}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Import Leads (216 Columns)</DialogTitle>
                    <DialogDescription>
                        Strict 216-column format. Duplicates are detected by Phone + Project ID.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Project Selection */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Target Project</Label>
                        {loadingProjects ? (
                            <div className="h-10 border border-white/10 rounded-md flex items-center px-3 gap-2 bg-white/5 italic text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading...
                            </div>
                        ) : (
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-md h-10 px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                disabled={stage !== "idle" && stage !== "error"}
                            >
                                <option value="">Select a project...</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Template Download */}
                    {stage === "idle" && (
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <DownloadCloud className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="text-xs font-bold">Download Official Template</p>
                                    <p className="text-[10px] text-muted-foreground">Strict 216-column CSV format</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={downloadTemplate}>
                                Download CSV
                            </Button>
                        </div>
                    )}

                    {/* Stage: IDLE / UPLOADING / ERROR */}
                    {(stage === "idle" || stage === "uploading" || stage === "error") && (
                        <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 transition-colors relative group
                            ${stage === "error" ? "border-red-500/50 bg-red-500/5" : "border-white/10 bg-white/5 hover:bg-white/[0.08]"}`}
                        >
                            {stage === "uploading" ? (
                                <div className="text-center space-y-4 w-full max-w-[200px]">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                                    <p className="text-sm font-bold">Analyzing CSV...</p>
                                </div>
                            ) : stage === "error" ? (
                                <div className="text-center space-y-3">
                                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                                    <p className="font-bold text-red-400">Import Failed</p>
                                    <p className="text-xs text-red-300 px-4">{errorMessage}</p>
                                    <Button variant="outline" size="sm" onClick={resetState} className="mt-2 text-red-400 border-red-500/20 hover:bg-red-500/10">
                                        Try Again
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        disabled={!selectedProject}
                                    />
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                                        <FileSpreadsheet className="w-6 h-6" />
                                    </div>
                                    <p className="font-bold text-sm w-full text-center truncate px-4">
                                        {file ? file.name : "Click or Drag CSV File"}
                                    </p>
                                    {!selectedProject && <p className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-tighter">Select Project First</p>}
                                </>
                            )}
                        </div>
                    )}

                    {/* Stage: PREVIEW */}
                    {stage === "preview" && stats && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-white/5 p-3 rounded-lg text-center border border-white/10">
                                    <div className="text-xl font-bold">{stats.total_rows}</div>
                                    <div className="text-[10px] uppercase text-muted-foreground font-bold">Total</div>
                                </div>
                                <div className="bg-emerald-500/10 p-3 rounded-lg text-center border border-emerald-500/20">
                                    <div className="text-xl font-bold text-emerald-400">{stats.valid_count}</div>
                                    <div className="text-[10px] uppercase text-emerald-400/70 font-bold">Valid</div>
                                </div>
                                <div className="bg-amber-500/10 p-3 rounded-lg text-center border border-amber-500/20">
                                    <div className="text-xl font-bold text-amber-400">{stats.duplicate_count}</div>
                                    <div className="text-[10px] uppercase text-amber-400/70 font-bold">Duplicates</div>
                                </div>
                                <div className="bg-red-500/10 p-3 rounded-lg text-center border border-red-500/20">
                                    <div className="text-xl font-bold text-red-400">{stats.error_count}</div>
                                    <div className="text-[10px] uppercase text-red-400/70 font-bold">Errors</div>
                                </div>
                            </div>

                            {/* Blocking Errors */}
                            {stats.error_count > 0 && (
                                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2 text-red-400 font-bold text-xs">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>Critical Errors Found (First 5)</span>
                                    </div>
                                    <div className="h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2">
                                        <ul className="space-y-1">
                                            {stats.errors_sample.map((err: any, i) => (
                                                <li key={i} className="text-[10px] text-red-300">
                                                    Row {err.row}: {err.error}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <p className="text-[10px] text-red-400 mt-2 font-bold text-center">Please fix errors in CSV and re-upload.</p>
                                    <Button size="sm" variant="outline" className="w-full mt-2 border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={resetState}>
                                        Upload Corrected File
                                    </Button>
                                </div>
                            )}

                            {/* Valid / Warnings */}
                            {stats.error_count === 0 && (
                                <>
                                    {stats.duplicate_count > 0 && (
                                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                                                <FileWarning className="w-4 h-4" />
                                                <span>Duplicates Detected - Choose Action</span>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="r1"
                                                        name="duplicateStrategy"
                                                        value="SKIP"
                                                        checked={duplicateStrategy === "SKIP"}
                                                        onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                                                        className="accent-amber-500 w-4 h-4 cursor-pointer"
                                                    />
                                                    <Label htmlFor="r1" className="text-xs text-amber-100 cursor-pointer">Skip Duplicates (Recommended)</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="r2"
                                                        name="duplicateStrategy"
                                                        value="UPDATE"
                                                        checked={duplicateStrategy === "UPDATE"}
                                                        onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                                                        className="accent-amber-500 w-4 h-4 cursor-pointer"
                                                    />
                                                    <Label htmlFor="r2" className="text-xs text-amber-100 cursor-pointer">Update Existing Leads</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="r3"
                                                        name="duplicateStrategy"
                                                        value="CREATE_NEW"
                                                        checked={duplicateStrategy === "CREATE_NEW"}
                                                        onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                                                        className="accent-amber-500 w-4 h-4 cursor-pointer"
                                                    />
                                                    <Label htmlFor="r3" className="text-xs text-amber-100 cursor-pointer">Create New (Allow Duplicates)</Label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                                        <p className="text-center text-xs text-blue-200">
                                            <span className="font-bold text-blue-400">{stats.valid_count} leads</span> ready to import.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Stage: SUCCESS */}
                    {stage === "success" && (
                        <div className="text-center space-y-4 py-6 animate-in zoom-in">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Import Complete!</h3>
                                <p className="text-sm text-muted-foreground">Your leads have been successfully added to the system.</p>
                            </div>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onClose}>
                                Done
                            </Button>
                        </div>
                    )}
                </div>

                {stage === "idle" && (
                    <DialogFooter>
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            className="bg-primary hover:bg-primary/90"
                            disabled={!file || !selectedProject}
                            onClick={handlePreview}
                        >
                            Analyze File
                        </Button>
                    </DialogFooter>
                )}

                {stage === "preview" && stats && stats.error_count === 0 && (
                    <DialogFooter>
                        <Button variant="ghost" onClick={resetState}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            onClick={handleExecute}
                        >
                            Confirm Import
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
