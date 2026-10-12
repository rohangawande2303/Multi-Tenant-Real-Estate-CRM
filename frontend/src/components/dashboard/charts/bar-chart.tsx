/**
 * File: src/components/dashboard/charts/bar-chart.tsx
 * Purpose: Recharts wrapper for lead conversion trends
 */

"use client";

import React from "react";
import {
    BarChart as ReBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";

interface BarChartProps {
    data: { name: string; value: number }[];
}

export function BarChart({ data }: BarChartProps) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <Tooltip
                        cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                        contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                            color: "#fff"
                        }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="hsl(var(--primary))" fillOpacity={0.8 + (index / (data?.length || 1)) * 0.2} />
                        ))}
                    </Bar>
                </ReBarChart>
            </ResponsiveContainer>
        </div>
    );
}
