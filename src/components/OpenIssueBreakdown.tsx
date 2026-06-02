"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import type { ComplaintRow } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  "Complaint Register":           "#6366F1",
  "Pickup Arranged":              "#8B5CF6",
  "Pickup Delay From Cust.":      "#A78BFA",
  "Pickup successful":            "#7C3AED",
  "Received in Okhla":            "#2563EB",
  "Pending For Repair":           "#0891B2",
  "Repair Done But payment issue":"#D97706",
  "Dispatch Schduled":            "#65A30D",
  "Dispatch But Not Delivered":   "#16A34A",
  "Payment due from Customer":    "#EA580C",
  "Re-Open Ticket":               "#DC2626",
  "":                             "#94A3B8",
  "Not specified":                "#94A3B8",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#6366F1";
}

interface Props {
  openRows: ComplaintRow[];
  dateRangeLabel?: string; // e.g. "Jun-2025 → Jun-2026"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, count, pct } = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-xs">
      <p className="font-semibold text-slate-700 mb-1">{name || "Not specified"}</p>
      <p className="text-slate-500">{count} open complaint{count !== 1 ? "s" : ""}</p>
      <p className="text-slate-400">{pct}% of open queue</p>
    </div>
  );
};

export default function OpenIssueBreakdown({ openRows, dateRangeLabel }: Props) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    openRows.forEach((r) => {
      const k = (r.actionTaken?.trim()) || "Not specified";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    const total = openRows.length || 1;
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
      }));
  }, [openRows]);

  const topStatus = data[0];
  const chartHeight = Math.max(300, data.length * 44);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-1 gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Open Complaints — Status Breakdown</h2>
          {topStatus && (
            <p className="text-xs text-slate-500 mt-0.5">
              Largest group:{" "}
              <span className="font-semibold" style={{ color: statusColor(topStatus.name) }}>
                {topStatus.name || "Not specified"}
              </span>
              {" "}·{" "}
              <span className="font-semibold text-slate-700">{topStatus.count} units</span>
              {" "}({topStatus.pct}%)
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-slate-700">{openRows.length} open</p>
          {dateRangeLabel && (
            <p className="text-[11px] text-slate-400 mt-0.5">{dateRangeLabel}</p>
          )}
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
        {data.map((d) => (
          <span
            key={d.name}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border"
            style={{
              background: `${statusColor(d.name)}15`,
              borderColor: `${statusColor(d.name)}40`,
              color: statusColor(d.name),
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: statusColor(d.name) }}
            />
            {d.name || "Not specified"}
            <span className="font-bold">{d.count}</span>
          </span>
        ))}
      </div>

      {/* Bar chart — full width, one bar per status */}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 11, fill: "#475569" }}
            tickLine={false}
            axisLine={false}
            width={175}
            tickFormatter={(v) => v || "Not specified"}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
          <Bar dataKey="count" name="Open complaints" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="count"
              position="right"
              style={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }}
              formatter={(v: number) => `${v}`}
            />
            {data.map((entry, i) => (
              <Cell key={i} fill={statusColor(entry.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
