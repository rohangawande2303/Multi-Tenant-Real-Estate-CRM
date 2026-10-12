/**
 * File: src/components/dashboard/charts/pie-chart.tsx
 * Purpose: Recharts wrapper for lead source distribution
 */

"use client";

import React from "react";
import {
    PieChart as RePieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from "recharts";

interface PieChartProps {
    data: { name: string; value: number }[];
    colors?: string[];
}

const DEFAULT_COLORS = [
    "hsl(var(--primary))",
    "#10b981",
    "#f59e0b",
    "#3b82f6",
    "#ef4444",
    "#8b5cf6"
];

export function PieChart({ data, colors = DEFAULT_COLORS }: PieChartProps) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="rgba(255,255,255,0.1)" />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                            color: "#fff"
                        }}
                        itemStyle={{ color: "#fff" }}
                    />
                    <Legend iconType="circle" />
                </RePieChart>
            </ResponsiveContainer>
        </div>
    );
}
