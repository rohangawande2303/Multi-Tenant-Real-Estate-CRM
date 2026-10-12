"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { BarChart3, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import api from "@/lib/axios";

const data = [
    { name: 'Mon', leads: 400, conv: 24 },
    { name: 'Tue', leads: 300, conv: 13 },
    { name: 'Wed', leads: 200, conv: 98 },
    { name: 'Thu', leads: 278, conv: 39 },
    { name: 'Fri', leads: 189, conv: 48 },
    { name: 'Sat', leads: 239, conv: 38 },
    { name: 'Sun', leads: 349, conv: 43 },
];

export default function ClientAnalyticsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [client, setClient] = useState<any>(null);

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const response = await api.get("/tenants/");
                const found = response.data.find((t: any) => t.id === parseInt(id as string));
                setClient(found);
            } catch (err) {
                console.error("Failed to fetch client:", err);
            }
        };
        fetchClient();
    }, [id]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/agency/clients")} className="hover:bg-white/10">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title={`${client?.name || 'Client'} Analytics`}
                    description="Performance metrics and growth tracking"
                    icon={BarChart3}
                >
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                </PageHeader>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="glass-card border-white/10 bg-card/40 p-6 h-[400px]">
                    <h3 className="text-lg font-bold mb-4">Lead Generation Trend</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="name" stroke="#666" fontSize={12} />
                            <YAxis stroke="#666" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="glass-card border-white/10 bg-card/40 p-6 h-[400px]">
                    <h3 className="text-lg font-bold mb-4">Conversion Rate (%)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="name" stroke="#666" fontSize={12} />
                            <YAxis stroke="#666" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="conv" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
}
