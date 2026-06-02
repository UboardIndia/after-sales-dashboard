"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from "recharts";
import { X, ArrowUpRight } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
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
};

interface Props {
  data: { name: string; open: number; closed: number; total: number }[];
  allRows: ComplaintRow[]; // full filtered rows for drill-down
}

export default function ProductChart({ data, allRows }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const openRowsForProduct = selected
    ? allRows.filter((r) => r.productName === selected && r.isOpen)
    : [];

  // Group open rows by status for the mini-breakdown
  const statusBreakdown = openRowsForProduct.reduce<Record<string, number>>((acc, r) => {
    const k = r.actionTaken?.trim() || "Not specified";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-0">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">Complaints by Product</h2>
      <p className="text-xs text-slate-400 mb-3">Click a bar to drill into open complaints</p>

      <ResponsiveContainer width="100%" height={Math.max(320, data.length * 28)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
          onClick={(e) => {
            if (e?.activePayload?.[0]) {
              const name = e.activePayload[0].payload.name;
              setSelected((prev) => (prev === name ? null : name));
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            tick={({ x, y, payload }) => (
              <text
                x={x}
                y={y}
                dy={4}
                textAnchor="end"
                fontSize={11}
                fill={selected === payload.value ? "#4F46E5" : "#64748B"}
                fontWeight={selected === payload.value ? 700 : 400}
                style={{ cursor: "pointer" }}
              >
                {payload.value}
              </text>
            )}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
            cursor={{ fill: "#F8FAFC" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="closed" name="Closed" stackId="a" radius={[0, 0, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={selected === entry.name ? "#3730A3" : "#4F46E5"}
                opacity={selected && selected !== entry.name ? 0.4 : 1}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Bar>
          <Bar dataKey="open" name="Open" stackId="a" radius={[0, 3, 3, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={selected === entry.name ? "#B45309" : "#F59E0B"}
                opacity={selected && selected !== entry.name ? 0.4 : 1}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Drill-down panel */}
      {selected && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {/* Drill-down header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">{selected} — Open Complaints</h3>
              <p className="text-xs text-slate-400">{openRowsForProduct.length} open units</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
            >
              <X size={15} />
            </button>
          </div>

          {/* Status pills summary */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(statusBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: `${STATUS_COLOR[status] ?? "#6366F1"}18`,
                    color: STATUS_COLOR[status] ?? "#6366F1",
                    border: `1px solid ${STATUS_COLOR[status] ?? "#6366F1"}40`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: STATUS_COLOR[status] ?? "#6366F1" }} />
                  {status} · <b>{count}</b>
                </span>
              ))}
          </div>

          {/* Complaint rows table */}
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Seq #", "Customer", "Issue Type", "Status", "Days Pending", "Assigned"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openRowsForProduct
                  .sort((a, b) => (b.daysPending ?? 0) - (a.daysPending ?? 0))
                  .map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-500">{r.sequenceNo}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-[120px] truncate" title={r.customerName}>
                        {r.customerName || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate" title={r.issueType}>
                        {r.issueType || "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            background: `${STATUS_COLOR[r.actionTaken ?? ""] ?? "#6366F1"}15`,
                            color: STATUS_COLOR[r.actionTaken ?? ""] ?? "#6366F1",
                          }}
                        >
                          {r.actionTaken || "Complaint Register"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">
                        <span className={
                          (r.daysPending ?? 0) > 90 ? "text-red-600" :
                          (r.daysPending ?? 0) > 30 ? "text-amber-600" : "text-slate-600"
                        }>
                          {r.daysPending != null ? `${r.daysPending}d` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {r.assignedTo ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                            {r.assignedTo}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                {openRowsForProduct.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      No open complaints for {selected}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
