"use client";

import { useState, useMemo } from "react";
import { Search, X, Phone, CheckSquare, Square, Loader2, ChevronDown } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";
import { STATUS_OPTIONS, TEAM } from "@/lib/ticketOptions";

interface Props {
  rows: ComplaintRow[];
  onSaved?: () => void; // kept for bulk update callback
}

const STATUS_BADGE: Record<string, string> = {
  "Complaint Register":            "bg-blue-100 text-blue-700",
  "Pickup Arranged":               "bg-purple-100 text-purple-700",
  "Received in Okhla":             "bg-indigo-100 text-indigo-700",
  "Pending For Repair":            "bg-yellow-100 text-yellow-700",
  "Dispatch But Not Delivered":    "bg-teal-100 text-teal-700",
  "Payment due from Customer":     "bg-red-100 text-red-700",
  "Repair Done But payment issue": "bg-orange-100 text-orange-700",
  "Pickup successful":             "bg-cyan-100 text-cyan-700",
  "Pickup Delay From Cust.":       "bg-pink-100 text-pink-700",
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

export default function OpenTicketsTable({ rows, onSaved }: Props) {
  const [search, setSearch]             = useState("");
  const [filterRequested, setRequested] = useState("All");
  const [filterProduct, setProduct]     = useState("All");
  const [filterStatus, setStatus]       = useState("All");
  const [filterIssue, setIssue]         = useState("All");
  const [filterBrand, setBrand]         = useState("All");
  const [filterPending, setPending]     = useState("All");
  const [sortDate, setSortDate]         = useState<"asc" | "desc">("asc");
  const [page, setPage]                 = useState(1);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk]         = useState(false);
  const [bulkStatus, setBulkStatus]     = useState("");
  const [bulkName, setBulkName]         = useState("");
  const [bulkSaving, setBulkSaving]     = useState(false);
  const [bulkError, setBulkError]       = useState("");
  // Inline status editing
  const [quickSaving, setQuickSaving]   = useState<string | null>(null); // row id being saved
  const [quickDone, setQuickDone]       = useState<Record<string, string>>({}); // optimistic: id → new status
  const [quickMsg, setQuickMsg]         = useState<{ kind: "ok" | "warn" | "err"; text: string } | null>(null);
  const [askName, setAskName]           = useState<{ id: string; value: string; mobile: string } | null>(null);
  // Read-only change-history popup
  const [historyFor, setHistoryFor]     = useState<ComplaintRow | null>(null);
  const [historyRows, setHistoryRows]   = useState<{ field: string; value: string; note: string | null; updated_by: string; created_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const PER_PAGE = 15;

  function openHistory(r: ComplaintRow) {
    setHistoryFor(r);
    setHistoryLoading(true);
    fetch(`/api/updates?complaintId=${encodeURIComponent(r.id)}`)
      .then((res) => res.json())
      .then((j) => setHistoryRows(j.history ?? []))
      .catch(() => setHistoryRows([]))
      .finally(() => setHistoryLoading(false));
  }

  /** "12 Jun, 4:32 pm" from an ISO timestamp. */
  function fmtWhen(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? ""
      : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
  }

  async function doQuickSave(id: string, value: string, mobile: string, name: string) {
    setQuickSaving(id);
    setQuickMsg(null);
    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: id,
          field: "status",
          value,
          updatedBy: name,
          customerMobile: mobile || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setQuickDone((prev) => ({ ...prev, [id]: value }));
      if (json.warning) {
        setQuickMsg({ kind: "warn", text: json.warning });
      } else {
        setQuickMsg({ kind: "ok", text: `Status updated to "${value}" — sheet updated too.` });
        setTimeout(() => setQuickMsg((m) => (m?.kind === "ok" ? null : m)), 4000);
      }
      onSaved?.();
    } catch (e) {
      setQuickMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setQuickSaving(null);
    }
  }

  function quickStatus(r: ComplaintRow, value: string) {
    if (!value || value === (quickDone[r.id] ?? r.actionTaken)) return;
    const name = localStorage.getItem("team_member") || localStorage.getItem("prachi_name") || "";
    if (!name) {
      setAskName({ id: r.id, value, mobile: r.customerMobile });
      return;
    }
    doQuickSave(r.id, value, r.customerMobile, name);
  }

  // Build dropdown options from the incoming rows
  const opts = useMemo(() => ({
    requested: uniq(rows.map((r) => r.requestBy)),
    products:  uniq(rows.map((r) => r.productName)),
    // All official statuses + any extra values present in the data
    statuses:  uniq([...STATUS_OPTIONS, ...rows.map((r) => r.actionTaken || "Registered")]),
    issues:    uniq(rows.map((r) => r.issueType)),
    brands:    uniq(rows.map((r) => r.brand)),
  }), [rows]);

  // Parse DD/MM/YYYY → sortable number
  function parseDateNum(s: string): number {
    if (!s) return 0;
    const p = s.split("/");
    if (p.length !== 3) return 0;
    return parseInt(p[2]) * 10000 + parseInt(p[1]) * 100 + parseInt(p[0]);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = rows.filter((r) => {
      if (filterRequested !== "All" && r.requestBy !== filterRequested) return false;
      if (filterProduct   !== "All" && r.productName !== filterProduct)  return false;
      if (filterStatus    !== "All") {
        const s = r.actionTaken || "Registered";
        if (s !== filterStatus) return false;
      }
      if (filterIssue  !== "All" && r.issueType !== filterIssue)         return false;
      if (filterBrand  !== "All" && r.brand     !== filterBrand)         return false;
      // Pending Since filter
      if (filterPending !== "All") {
        const d = r.daysPending ?? 0;
        if (filterPending === "1 Month"  && !(d <= 30))  return false;
        if (filterPending === "2 Months" && !(d >= 31 && d <= 60)) return false;
        if (filterPending === "3 Months" && !(d >= 61 && d <= 90)) return false;
        if (filterPending === "3+ Months" && !(d > 90))  return false;
      }
      if (q &&
        !r.sequenceNo.toLowerCase().includes(q) &&
        !r.productName.toLowerCase().includes(q) &&
        !r.requestBy.toLowerCase().includes(q) &&
        !r.issueType.toLowerCase().includes(q) &&
        !r.customerName.toLowerCase().includes(q) &&
        !r.actionTaken.toLowerCase().includes(q)
      ) return false;
      return true;
    });
    // Sort by date
    return [...base].sort((a, b) => {
      const diff = parseDateNum(a.complaintDate) - parseDateNum(b.complaintDate);
      return sortDate === "asc" ? diff : -diff;
    });
  }, [rows, search, filterRequested, filterProduct, filterStatus, filterIssue, filterBrand, filterPending, sortDate]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function reset() {
    setSearch(""); setRequested("All"); setProduct("All");
    setStatus("All"); setIssue("All"); setBrand("All"); setPending("All"); setPage(1);
  }

  const hasFilters =
    search || filterRequested !== "All" || filterProduct !== "All" ||
    filterStatus !== "All" || filterIssue !== "All" || filterBrand !== "All" || filterPending !== "All";

  // Bulk helpers
  const allPageIds = paged.map((r) => r.id);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id));

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePage() {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  async function saveBulk() {
    if (!bulkStatus) { setBulkError("Please choose a status."); return; }
    if (!bulkName)   { setBulkError("Please enter your name."); return; }
    setBulkSaving(true);
    setBulkError("");
    try {
      const ids = Array.from(selected);
      await Promise.all(
        ids.map((complaintId) =>
          fetch("/api/updates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              complaintId,
              field: "status",
              value: bulkStatus,
              updatedBy: bulkName,
              customerMobile: rows.find((r) => r.id === complaintId)?.customerMobile || undefined,
            }),
          })
        )
      );
      setSelected(new Set());
      setShowBulk(false);
      setBulkStatus("");
      onSaved?.();
    } catch {
      setBulkError("Something went wrong. Please try again.");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5">
          <span className="text-xs font-semibold text-indigo-700">{selected.size} selected</span>
          <button
            onClick={() => setShowBulk(true)}
            className="ml-auto text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Update {selected.size} ticket{selected.size > 1 ? "s" : ""}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Clear
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Open Tickets</h2>
          <p className="text-xs text-slate-400">
            {filtered.length} of {rows.length} open complaints
          </p>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52"
          />
        </div>
      </div>

      {/* Filter row — all on one line */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-2 mb-4 pb-3 border-b border-slate-100">
        <TinySelect label="By"             value={filterRequested} options={["All", ...opts.requested]} onChange={(v) => { setRequested(v); setPage(1); }} />
        <TinySelect label="Product"        value={filterProduct}   options={["All", ...opts.products]}  onChange={(v) => { setProduct(v);  setPage(1); }} />
        <TinySelect label="Status"         value={filterStatus}    options={["All", ...opts.statuses]}  onChange={(v) => { setStatus(v);   setPage(1); }} />
        <TinySelect label="Issue"          value={filterIssue}     options={["All", ...opts.issues]}    onChange={(v) => { setIssue(v);    setPage(1); }} />
        <TinySelect label="Brand"          value={filterBrand}     options={["All", ...opts.brands]}    onChange={(v) => { setBrand(v);    setPage(1); }} />
        <TinySelect label="Pending Since"  value={filterPending}   options={["All", "1 Month", "2 Months", "3 Months", "3+ Months"]} onChange={(v) => { setPending(v); setPage(1); }} />
        {hasFilters && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition ml-1"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Inline status save feedback */}
      {quickMsg && (
        <div className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 mb-3 border ${
          quickMsg.kind === "ok"   ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
          quickMsg.kind === "warn" ? "text-amber-700 bg-amber-50 border-amber-200" :
                                     "text-red-700 bg-red-50 border-red-200"
        }`}>
          <span>{quickMsg.kind === "warn" ? "⚠ " : ""}{quickMsg.text}</span>
          <button onClick={() => setQuickMsg(null)} className="ml-3 opacity-60 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-2 pr-2 w-8">
                <button onClick={togglePage} className="text-slate-300 hover:text-indigo-500 transition">
                  {allPageSelected ? <CheckSquare size={14} className="text-indigo-500" /> : <Square size={14} />}
                </button>
              </th>
              {["#", "Customer", "Mobile", "Product", "Brand", "Issue Type", "Status", "Days Pending", "Pending Since"].map((h) => (
                <th key={h} className="text-left font-medium text-slate-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
              ))}
              <th className="text-left pb-2 pr-3 whitespace-nowrap">
                <button onClick={() => setSortDate(s => s === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-600 transition group">
                  Complaint Date
                  <span className="text-[10px] group-hover:text-indigo-600">{sortDate === "asc" ? "↑" : "↓"}</span>
                </button>
              </th>
              <th className="text-left font-medium text-slate-400 pb-2 whitespace-nowrap">Last Update</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50 transition ${selected.has(r.id) ? "bg-indigo-50/40" : ""}`}>
                <td className="py-2 pr-2">
                  <button onClick={() => toggleRow(r.id)} className="text-slate-300 hover:text-indigo-500 transition">
                    {selected.has(r.id) ? <CheckSquare size={13} className="text-indigo-500" /> : <Square size={13} />}
                  </button>
                </td>
                <td className="py-2 pr-3 text-slate-400 font-mono">{r.sequenceNo}</td>
                <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{r.customerName || "—"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {r.customerMobile ? (
                    <a href={`tel:${r.customerMobile}`} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-mono">
                      <Phone size={10} /> {r.customerMobile}
                    </a>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{r.productName || "—"}</td>
                <td className="py-2 pr-3">
                  <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{r.brand}</span>
                </td>
                <td className="py-2 pr-3 text-slate-600">{r.issueType || "—"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {quickSaving === r.id ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                      <Loader2 size={11} className="animate-spin" /> Saving…
                    </span>
                  ) : (() => {
                    const current = quickDone[r.id] ?? r.actionTaken;
                    return (
                      <span className="relative inline-flex items-center">
                        <select
                          value={current || ""}
                          onChange={(e) => quickStatus(r, e.target.value)}
                          title="Change status — saves to dashboard + sheet instantly"
                          className={`appearance-none cursor-pointer pl-2 pr-6 py-0.5 rounded-full text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-indigo-400 ${
                            STATUS_BADGE[current] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {!(STATUS_OPTIONS as readonly string[]).includes(current) && (
                            <option value={current || ""} disabled>
                              {current || "Registered"}
                            </option>
                          )}
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown size={11} className="absolute right-1.5 pointer-events-none opacity-60" />
                      </span>
                    );
                  })()}
                </td>
                <td className="py-2 pr-3 text-right">
                  {r.daysPending != null ? (
                    <span className={`font-semibold ${
                      r.daysPending > 90 ? "text-red-600" :
                      r.daysPending > 30 ? "text-orange-500" : "text-slate-600"
                    }`}>
                      {r.daysPending}d
                    </span>
                  ) : "—"}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {r.daysPending != null ? (() => {
                    const d = r.daysPending;
                    const [label, cls] = d > 90
                      ? ["3+ Mo", "bg-red-100 text-red-700"]
                      : d > 60 ? ["3 Mo", "bg-orange-100 text-orange-700"]
                      : d > 30 ? ["2 Mo", "bg-yellow-100 text-yellow-700"]
                      : ["1 Mo", "bg-green-100 text-green-700"];
                    return <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${cls}`}>{label}</span>;
                  })() : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">{r.complaintDate}</td>
                <td className="py-2 whitespace-nowrap">
                  {r.overlayUpdatedBy ? (
                    <button
                      onClick={() => openHistory(r)}
                      title="View full change history"
                      className="text-left hover:bg-indigo-50 rounded-md px-1.5 py-0.5 -mx-1.5 transition"
                    >
                      <span className="text-slate-700 font-medium">{r.overlayUpdatedBy}</span>
                      <span className="text-slate-400 block text-[10px] leading-tight">
                        {r.overlayUpdatedAt ? fmtWhen(r.overlayUpdatedAt) : ""}
                      </span>
                    </button>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={13} className="py-8 text-center text-slate-400">No tickets match the filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >Prev</button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >Next</button>
          </div>
        </div>
      )}

      {/* Read-only change history popup */}
      {historyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setHistoryFor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  History — #{historyFor.sequenceNo} {historyFor.customerName || ""}
                </h3>
                <p className="text-xs text-slate-400">{historyFor.productName} · {historyFor.brand}</p>
              </div>
              <button onClick={() => setHistoryFor(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 max-h-80 overflow-y-auto">
              {historyLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={18} className="animate-spin text-indigo-400" />
                </div>
              ) : historyRows.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No dashboard updates recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {historyRows.map((h, i) => (
                    <div key={i} className="text-xs border-l-2 border-indigo-100 pl-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 capitalize">{h.field.replace("_", " ")}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-indigo-700 font-medium">{h.value || "—"}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        by <span className="font-medium text-slate-600">{h.updated_by}</span>
                        <span className="text-slate-400"> · {fmtWhen(h.created_at)}</span>
                      </p>
                      {h.note && <p className="text-slate-400 italic mt-0.5">{h.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* One-time name picker for inline status changes */}
      {askName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setAskName(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Who is making this update?</h3>
            <p className="text-xs text-slate-400 mb-4">
              Recorded with the change. We&apos;ll remember it on this device.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {TEAM.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    localStorage.setItem("team_member", t);
                    const p = askName;
                    setAskName(null);
                    doQuickSave(p.id, p.value, p.mobile, t);
                  }}
                  className="px-4 py-1.5 rounded-full text-xs font-medium border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition"
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setAskName(null)} className="text-xs px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              Bulk Update — {selected.size} ticket{selected.size > 1 ? "s" : ""}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              This will set the same status on all selected tickets.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">New Status</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">— choose status —</option>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Your Name</label>
                <select
                  value={bulkName}
                  onChange={(e) => setBulkName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">— select name —</option>
                  {TEAM.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {bulkError && (
                <p className="text-xs text-red-500">{bulkError}</p>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setShowBulk(false); setBulkError(""); }}
                className="flex-1 text-sm py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                disabled={bulkSaving}
              >
                Cancel
              </button>
              <button
                onClick={saveBulk}
                disabled={bulkSaving}
                className="flex-1 text-sm py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {bulkSaving && <Loader2 size={13} className="animate-spin" />}
                {bulkSaving ? "Saving…" : `Update ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function TinySelect({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-400">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
