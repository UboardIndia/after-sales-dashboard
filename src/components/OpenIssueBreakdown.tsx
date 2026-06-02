"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ComplaintRow } from "@/lib/types";

const COLORS = [
  "#DC2626","#EA580C","#D97706","#CA8A04","#65A30D",
  "#0891B2","#2563EB","#4F46E5","#7C3AED","#DB2777",
];

interface Props {
  openRows: ComplaintRow[];
}

export default function OpenIssueBreakdown({ openRows }: Props) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    openRows.forEach((r) => {
      const k = r.issueType?.trim() || "Not specified";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [openRows]);

  const topReason = data[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-1">
        <h2 className="text-sm font-semibold text-slate-700">Why Are Complaints Still Open?</h2>
        <span className="text-xs text-slate-400">{openRows.length} open · issue-type breakdown</span>
      </div>
      {topReason && (
        <p className="text-xs text-slate-500 mb-4">
          Biggest blocker:{" "}
          <span className="font-semibold text-red-600">{topReason.name}</span>{" "}
          ({topReason.count} open)
        </p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 11, fill: "#64748B" }}
            tickLine={false}
            axisLine={false}
            width={140}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
            cursor={{ fill: "#F8FAFC" }}
          />
          <Bar dataKey="count" name="Open complaints" radius={[0, 3, 3, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
