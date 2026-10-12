/**
 * File: src/components/dashboard/add-integration-modal.tsx
 * Purpose: Modal for adding new lead integrations with detailed guides
 */

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
import { Label } from "@/components/ui/label";
import {
    Globe,
    Mail,
    MessageSquare,
    Facebook,
    Instagram,
    Zap,
    Code,
    Smartphone,
    Rocket,
    CheckCircle2,
    Copy,
    ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/toast-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface IntegrationSource {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    color: string;
    category: "ADS" | "WEB" | "COMM" | "OTHER";
    guideSteps: string[];
}

const SOURCES: IntegrationSource[] = [
    {
        id: "google_ads",
        name: "Google Ads",
        description: "Capture leads from Lead Form Extensions via Webhook",
        icon: Rocket,
        color: "text-blue-500",
        category: "ADS",
        guideSteps: [
            "Copy the Webhook URL below.",
            "Go to Google Ads > Campaigns > Settings.",
            "Find 'Lead form extension' and click 'Webhook'.",
            "Paste the URL and enter 'socialpulse' as the Key.",
            "Click 'Send test data' to verify connection."
        ]
    },
    {
        id: "meta_capi",
        name: "Meta Lead Ads",
        description: "Connect Facebook/Instagram Instant Forms",
        icon: Facebook,
        color: "text-primary",
        category: "ADS",
        guideSteps: [
            "We recommend using Zapier or Make for the easiest setup.",
            "Alternatively, paste the Webhook URL below into your Meta App > Webhooks setup.",
            "Subscribe to the 'leadgen' field.",
            "Verify the token 'socialpulse_verify' in the Meta dashboard."
        ]
    },
    {
        id: "website",
        name: "Website Form",
        description: "Embed a tracking script on your landing page",
        icon: Code,
        color: "text-emerald-500",
        category: "WEB",
        guideSteps: [
            "Copy the script snippet below.",
            "Paste it into the <head> of your website.",
            "The script will automatically capture form submissions with class 'sp-lead-form'.",
            "Test by submitting a form on your site."
        ]
    },
    {
        id: "whatsapp",
        name: "WhatsApp",
        description: "Sync chats as leads via API",
        icon: MessageSquare,
        color: "text-green-500",
        category: "COMM",
        guideSteps: [
            "Copy the Webhook URL.",
            "Configure your WhatsApp Business API provider (e.g. Twilio, WATI) to send incoming message webhooks to this URL.",
            "Ensure the payload matches our JSON schema."
        ]
    },
    {
        id: "email",
        name: "Email Parser",
        description: "Parse incoming leads from emails",
        icon: Mail,
        color: "text-amber-500",
        category: "COMM",
        guideSteps: [
            "Forward your lead notification emails to the unique address generated below.",
            "Our system will parse common formats (Zillow, Realtor.com, etc.).",
            "Contact support to request custom parsing rules."
        ]
    },
    {
        id: "zapier",
        name: "Zapier",
        description: "Universal connector for 5000+ apps",
        icon: Zap,
        color: "text-orange-500",
        category: "OTHER",
        guideSteps: [
            "Create a new Zap -> Trigger: 'Catch Hook'.",
            "Paste the Webhook URL below into the 'Custom Webhook URL' field.",
            "Map your source data to the JSON payload.",
            "Test the Zap to ensure data flows correctly."
        ]
    },
];

export function AddIntegrationModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const [step, setStep] = useState(1);
    const { toast } = useToast();

    const selectedSource = SOURCES.find(s => s.id === selectedSourceId);
    const webhookUrl = selectedSource ? `https://api.socialpulse.com/v1/webhooks/incoming/${selectedSource.id}/tenant_1` : "";

    const handleConnect = () => {
        if (!selectedSourceId) return;
        setStep(2);
    };

    const handleFinish = () => {
        onOpenChange(false);
        setTimeout(() => {
            setStep(1);
            setSelectedSourceId(null);
        }, 300);
        toast("Integration setup complete!", "success");
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast("Copied to clipboard!", "success");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-white/10 max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        {step === 1 ? (
                            <>
                                <Zap className="w-6 h-6 text-yellow-500" />
                                Connect New Lead Source
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                {selectedSource?.name} Integration
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {step === 1
                            ? "Choose a platform to start feeding leads into your CRM pipeline."
                            : "Follow the steps below to complete the connection."}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-6 max-h-[60vh] overflow-y-auto">
                        {SOURCES.map((source) => (
                            <div
                                key={source.id}
                                onClick={() => setSelectedSourceId(source.id)}
                                className={cn(
                                    "p-4 rounded-xl border transition-all cursor-pointer group flex flex-col gap-3 relative overflow-hidden",
                                    selectedSourceId === source.id
                                        ? "bg-primary/10 border-primary border-2 shadow-lg shadow-primary/10"
                                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                                )}
                            >
                                <div className={cn("w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center transition-transform group-hover:scale-110", source.color)}>
                                    <source.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white group-hover:text-primary transition-colors">{source.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{source.description}</p>
                                </div>
                                {selectedSourceId === source.id && (
                                    <div className="absolute top-2 right-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 space-y-6">
                        {/* Setup Guide */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">1</span>
                                Configuration Steps
                            </h3>
                            <ul className="space-y-4">
                                {selectedSource?.guideSteps.map((stepText, index) => (
                                    <li key={index} className="flex gap-3 text-sm text-slate-300">
                                        <div className="min-w-[6px] h-[6px] rounded-full bg-primary/50 mt-1.5" />
                                        <span>{stepText}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Endpoint / Script */}
                        <div className="space-y-2">
                            <Label className="text-slate-300 font-semibold flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">2</span>
                                {selectedSourceId === "website" ? "Tracking Snippet" : "Webhook Endpoint"}
                            </Label>

                            {selectedSourceId === "website" ? (
                                <div className="relative group">
                                    <pre className="bg-black/60 border border-white/10 p-4 rounded-xl font-mono text-xs text-blue-400 overflow-x-auto">
                                        {`<script>
  window.SP_LEAD_CONFIG = {
    tenant: "tenant_1",
    source: "website"
  };
</script>
<script src="https://cdn.socialpulse.com/tracker.js" async></script>`}
                                    </pre>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2 text-slate-400 hover:text-white bg-black/50 hover:bg-black/80"
                                        onClick={() => copyToClipboard(`<script>\n  window.SP_LEAD_CONFIG = {\n    tenant: "tenant_1",\n    source: "website"\n  };\n</script>\n<script src="https://cdn.socialpulse.com/tracker.js" async></script>`)}
                                    >
                                        <Copy className="w-4 h-4 mr-1" /> Copy
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/10">
                                    <code className="text-sm text-primary font-mono flex-1 break-all">
                                        {webhookUrl}
                                    </code>
                                    <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-white/10 shrink-0" onClick={() => copyToClipboard(webhookUrl)}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Test Connection Helper */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <Rocket className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Need help testing?</h4>
                                <p className="text-xs text-slate-400">
                                    Send a sample lead payload to confirm the integration works.
                                    <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer ml-1 font-medium underline">View Documentation</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 1 ? (
                        <div className="flex w-full gap-3">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 hover:bg-white/5">Cancel</Button>
                            <Button
                                className="purple-gradient flex-1 text-white font-bold shadow-lg shadow-primary/20"
                                disabled={!selectedSourceId}
                                onClick={handleConnect}
                            >
                                Continue to Setup
                            </Button>
                        </div>
                    ) : (
                        <div className="flex w-full gap-3">
                            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 hover:bg-white/5">Back</Button>
                            <Button className="purple-gradient flex-1 text-white font-bold" onClick={handleFinish}>
                                Done
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
