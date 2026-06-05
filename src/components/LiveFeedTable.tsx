"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, FilePlus, RefreshCcw, Pencil } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";
import UpdateTicketModal from "./UpdateTicketModal";

type SortKey = keyof ComplaintRow | "lastUpdate";
type SortDir = "asc" | "desc";
type ViewMode = "new" | "status";

const COLUMNS: { key: SortKey; label: string; width?: string }[] = [
  { key: "fiscalYear",       label: "FY",            width: "w-16" },
  { key: "sequenceNo",       label: "Seq #",         width: "w-20" },
  { key: "complaintDate",    label: "Filed",         width: "w-24" },
  { key: "lastUpdate",       label: "Last Update",   width: "w-28" },
  { key: "requestBy",        label: "Request By",    width: "w-28" },
  { key: "customerName",     label: "Customer",      width: "w-36" },
  { key: "brand",            label: "Brand",         width: "w-20" },
  { key: "productName",      label: "Product",       width: "w-36" },
  { key: "issueType",        label: "Issue",         width: "w-32" },
  { key: "actionTaken",      label: "Action Taken",  width: "w-36" },
  { key: "daysPending",      label: "Days Pending",  width: "w-24" },
  { key: "isOpen",           label: "Status",        width: "w-20" },
  { key: "assignedTo",       label: "Assigned",      width: "w-24" },
];

const DATE_KEYS = new Set<SortKey>(["complaintDate", "closeDate", "returnPickupDate", "productReceivedDate", "dispatchTrackingDate"]);

function parseDMY(s: string): number {
  if (!s) return 0;
  const parts = s.split("/");
  if (parts.length !== 3) return 0;
  const [d, m, y] = parts.map(Number);
  return y * 10000 + m * 100 + d;
}

function todayNum(): number {
  const n = new Date();
  return n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate();
}

function lastUpdateNum(row: ComplaintRow): number {
  const today = todayNum();
  // Only consider dates that are not in the future (sheets occasionally contain typos like 2027/2028)
  const valid = [
    parseDMY(row.closeDate),
    parseDMY(row.dispatchTrackingDate),
    parseDMY(row.productReceivedDate),
    parseDMY(row.returnPickupDate),
    parseDMY(row.complaintDate),
  ].filter((n) => n > 0 && n <= today);
  return valid.length > 0 ? Math.max(...valid) : 0;
}

function daysBetween(dateNum: number): number {
  if (!dateNum) return -1;
  const y = Math.floor(dateNum / 10000);
  const m = Math.floor((dateNum % 10000) / 100);
  const d = dateNum % 100;
  const then = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.floor((today - then) / (1000 * 60 * 60 * 24));
}

function relativeTime(days: number): string {
  if (days < 0) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function sortValue(row: ComplaintRow, key: SortKey): string | number {
  if (key === "lastUpdate") return lastUpdateNum(row);
  const v = row[key as keyof ComplaintRow];
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v;
  if (DATE_KEYS.has(key)) return parseDMY(String(v));
  return String(v).toLowerCase();
}

export default function LiveFeedTable({ rows, onUpdated }: { rows: ComplaintRow[]; onUpdated?: () => void }) {
  const [editing, setEditing] = useState<ComplaintRow | null>(null);
  const [view, setView] = useState<ViewMode>("new");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("complaintDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  function switchView(v: ViewMode) {
    setView(v);
    setPage(1);
    if (v === "new") { setSortKey("complaintDate"); setSortDir("desc"); }
    if (v === "status") { setSortKey("lastUpdate"); setSortDir("desc"); }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  // Both views show all rows — they differ only in sort order
  const viewFiltered = rows;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return viewFiltered;
    return viewFiltered.filter((r) =>
      COLUMNS.some((col) => {
        if (col.key === "lastUpdate") return false;
        const v = r[col.key as keyof ComplaintRow];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [viewFiltered, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av === "" && bv !== "") return 1;
      if (bv === "" && av !== "") return -1;
      let cmp = av < bv ? -1 : av > bv ? 1 : 0;
      if (cmp === 0 && sortKey !== "sequenceNo") {
        const sa = Number(a.sequenceNo) || 0;
        const sb = Number(b.sequenceNo) || 0;
        cmp = sa < sb ? -1 : sa > sb ? 1 : 0;
      }
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
      {/* View Mode Buttons */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
        <ViewButton
          active={view === "new"}
          onClick={() => switchView("new")}
          icon={<FilePlus size={14} />}
          label="New Entries"
          count={rows.length}
          activeColor="indigo"
        />
        <ViewButton
          active={view === "status"}
          onClick={() => switchView("status")}
          icon={<RefreshCcw size={14} />}
          label="Status Updates"
          count={rows.length}
          activeColor="green"
        />
        <div className="relative ml-auto w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search…"
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
              <th className="w-10 px-2 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="text-center py-10 text-slate-400">
                  No rows match.
                </td>
              </tr>
            )}
            {pageRows.map((row) => {
              const lu = lastUpdateNum(row);
              const luDays = daysBetween(lu);
              return (
                <tr
                  key={row.id}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${row.isOpen ? "" : "opacity-70"}`}
                >
                  <td className="px-3 py-2 text-slate-500">{row.fiscalYear?.replace("FY ", "")}</td>
                  <td className="px-3 py-2 font-mono text-slate-600">{row.sequenceNo}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.complaintDate}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-[11px] font-medium ${
                      luDays === 0 ? "text-green-600" :
                      luDays === 1 ? "text-indigo-600" :
                      luDays > 30 ? "text-slate-400" : "text-slate-600"
                    }`}>
                      {relativeTime(luDays)}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.requestBy}</td>
                  <td className="px-3 py-2 whitespace-nowrap max-w-[144px] truncate" title={row.customerName}>{row.customerName}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{row.brand}</span>
                  </td>
                  <td className="px-3 py-2 max-w-[144px] truncate" title={row.productName}>{row.productName}</td>
                  <td className="px-3 py-2 max-w-[128px] truncate text-slate-500" title={row.issueType}>{row.issueType}</td>
                  <td className="px-3 py-2 max-w-[144px] truncate text-slate-500" title={row.actionTaken}>{row.actionTaken}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {row.daysPending != null ? (
                      <span className={row.daysPending > 90 ? "text-red-600 font-semibold" : row.daysPending > 30 ? "text-amber-600" : "text-slate-600"}>
                        {row.daysPending}d
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      row.isOpen ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                    }`}>
                      {row.isOpen ? "Open" : "Closed"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {row.assignedTo ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700" title={row.dashboardRemark || undefined}>
                        {row.assignedTo}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => setEditing(row)}
                      title="Update this ticket"
                      className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
        <span>
          Page {page} of {totalPages} · rows {sorted.length === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50">«</button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50">‹</button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50">›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50">»</button>
        </div>
      </div>

      {/* Update modal */}
      {editing && (
        <UpdateTicketModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => onUpdated?.()}
        />
      )}
    </div>
  );
}

function ViewButton({
  active, onClick, icon, label, count, activeColor,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number; activeColor: "indigo" | "green";
}) {
  const colorClasses = {
    indigo: "bg-indigo-600 text-white",
    green:  "bg-emerald-600 text-white",
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
        active ? colorClasses[activeColor] : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {icon}
      {label}
      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
        active ? "bg-white/20" : "bg-white text-slate-600"
      }`}>
        {count.toLocaleString()}
      </span>
    </button>
  );
}
