"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  "Complaint Register":            "#6366F1",
  "Pickup Arranged":               "#8B5CF6",
  "Pickup Delay From Cust.":       "#A78BFA",
  "Pickup successful":             "#7C3AED",
  "Received in Okhla":             "#2563EB",
  "Pending For Repair":            "#0891B2",
  "Repair Done But payment issue": "#D97706",
  "Dispatch Schduled":             "#65A30D",
  "Dispatch But Not Delivered":    "#16A34A",
  "Payment due from Customer":     "#EA580C",
  "Re-Open Ticket":                "#DC2626",
  "Delay Due to Customer":         "#F59E0B",
  "Required for Pickup":           "#7C3AED",
  "":                              "#94A3B8",
  "Not specified":                 "#94A3B8",
};

export function statusColor(s: string) { return STATUS_COLORS[s] ?? "#6366F1"; }

interface Props {
  openRows: ComplaintRow[];
  dateRangeLabel?: string;
  onSelect: (label: string, rows: ComplaintRow[], color: string) => void;
  selectedLabel: string | null;
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

export default function OpenIssueBreakdown({ openRows, dateRangeLabel, onSelect, selectedLabel }: Props) {
  const [chartOpen, setChartOpen] = useState(false);

  const data = useMemo(() => {
    const map = new Map<string, number>();
    openRows.forEach((r) => {
      const k = r.actionTaken?.trim() || "Not specified";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    const total = openRows.length || 1;
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
  }, [openRows]);

  function handleSelect(name: string) {
    const rows = openRows
      .filter((r) => (r.actionTaken?.trim() || "Not specified") === name)
      .sort((a, b) => (b.daysPending ?? 0) - (a.daysPending ?? 0));
    onSelect(selectedLabel === name ? "" : name, rows, statusColor(name));
  }

  const chartHeight = Math.max(300, data.length * 44);

  return (
    <div>
      {/* Pills row */}
      <div className="flex flex-wrap gap-1.5">
        {data.map((d) => {
          const isSelected = selectedLabel === d.name;
          return (
            <button
              key={d.name}
              onClick={() => handleSelect(d.name)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all"
              style={{
                background: `${statusColor(d.name)}${isSelected ? "30" : "15"}`,
                borderColor: isSelected ? statusColor(d.name) : `${statusColor(d.name)}40`,
                color: statusColor(d.name),
                outline: isSelected ? `2px solid ${statusColor(d.name)}` : "none",
                outlineOffset: "1px",
              }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: statusColor(d.name) }} />
              {d.name || "Not specified"}
              <span className="font-bold">{d.count}</span>
              {isSelected ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          );
        })}
      </div>

      {/* Collapsible chart */}
      <div className="mt-3">
        <button
          onClick={() => setChartOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition"
        >
          {chartOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {chartOpen ? "Hide chart" : "Show chart"}
          {dateRangeLabel && <span className="ml-1 text-slate-300">· {dateRangeLabel}</span>}
        </button>

        {chartOpen && (
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} axisLine={false} width={175} tickFormatter={(v) => v || "Not specified"} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }} onClick={(d) => handleSelect(d.name)}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }} formatter={(v: number) => `${v}`} />
                  {data.map((entry, i) => (
                    <Cell key={i} fill={statusColor(entry.name)} opacity={!selectedLabel || selectedLabel === entry.name ? 1 : 0.35} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
