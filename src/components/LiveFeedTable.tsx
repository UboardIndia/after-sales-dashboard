"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";

type SortKey = keyof ComplaintRow;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; width?: string }[] = [
  { key: "fiscalYear",           label: "FY",            width: "w-20" },
  { key: "sequenceNo",           label: "Seq #",         width: "w-20" },
  { key: "complaintDate",        label: "Date",          width: "w-24" },
  { key: "requestBy",            label: "Request By",    width: "w-28" },
  { key: "customerName",         label: "Customer",      width: "w-36" },
  { key: "brand",                label: "Brand",         width: "w-24" },
  { key: "productName",          label: "Product",       width: "w-40" },
  { key: "platform",             label: "Platform",      width: "w-24" },
  { key: "complaintType",        label: "Type",          width: "w-32" },
  { key: "issueType",            label: "Issue",         width: "w-36" },
  { key: "warrantyStatus",       label: "Warranty",      width: "w-20" },
  { key: "actionTaken",          label: "Action Taken",  width: "w-40" },
  { key: "serviceCenter",        label: "Service Ctr",   width: "w-28" },
  { key: "daysPending",          label: "Days Pending",  width: "w-24" },
  { key: "isOpen",               label: "Status",        width: "w-20" },
  { key: "closeDate",            label: "Close Date",    width: "w-24" },
];

const DATE_KEYS: Set<SortKey> = new Set(["complaintDate", "closeDate", "returnPickupDate", "productReceivedDate", "dispatchTrackingDate"]);

function parseDMY(s: string): number {
  // Handles DD/MM/YYYY
  const parts = s.split("/");
  if (parts.length !== 3) return 0;
  const [d, m, y] = parts.map(Number);
  return y * 10000 + m * 100 + d;
}

function sortValue(row: ComplaintRow, key: SortKey): string | number {
  const v = row[key];
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v;
  if (DATE_KEYS.has(key)) return parseDMY(String(v));
  return String(v).toLowerCase();
}

export default function LiveFeedTable({ rows }: { rows: ComplaintRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("complaintDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc"); // newest first by default
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      COLUMNS.some((col) => {
        const v = r[col.key];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av === "" && bv !== "") return 1;
      if (bv === "" && av !== "") return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="text-slate-300" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-indigo-500" />
      : <ChevronDown size={12} className="text-indigo-500" />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700 shrink-0">Live Data Feed</h2>
        <span className="text-xs text-slate-400 shrink-0">{filtered.length.toLocaleString()} rows</span>
        <div className="relative ml-auto w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search anything…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`${col.width ?? ""} px-3 py-2 text-left font-medium text-slate-500 cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-10 text-slate-400">
                  No rows match your search.
                </td>
              </tr>
            )}
            {pageRows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  row.isOpen ? "" : "opacity-60"
                }`}
              >
                <td className="px-3 py-2 text-slate-500">{row.fiscalYear}</td>
                <td className="px-3 py-2 font-mono text-slate-600">{row.sequenceNo}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.complaintDate}</td>
                <td className="px-3 py-2 whitespace-nowrap">{row.requestBy}</td>
                <td className="px-3 py-2 whitespace-nowrap max-w-[144px] truncate" title={row.customerName}>{row.customerName}</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{row.brand}</span>
                </td>
                <td className="px-3 py-2 max-w-[160px] truncate" title={row.productName}>{row.productName}</td>
                <td className="px-3 py-2 text-slate-500">{row.platform}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{row.complaintType}</td>
                <td className="px-3 py-2 max-w-[144px] truncate" title={row.issueType}>{row.issueType}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    row.warrantyStatus === "Yes"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>{row.warrantyStatus || "—"}</span>
                </td>
                <td className="px-3 py-2 max-w-[160px] truncate text-slate-500" title={row.actionTaken}>{row.actionTaken}</td>
                <td className="px-3 py-2 text-slate-500">{row.serviceCenter}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {row.daysPending != null ? (
                    <span className={row.daysPending > 90 ? "text-red-600 font-semibold" : row.daysPending > 30 ? "text-amber-600" : "text-slate-600"}>
                      {row.daysPending}d
                    </span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    row.isOpen
                      ? "bg-orange-100 text-orange-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {row.isOpen ? "Open" : "Closed"}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-400">{row.closeDate || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
        <span>
          Page {page} of {totalPages} &nbsp;·&nbsp; rows {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
          >«</button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
          >‹</button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
          >›</button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
          >»</button>
        </div>
      </div>
    </div>
  );
}
