"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";

interface Props {
  rows: ComplaintRow[];
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

export default function OpenTicketsTable({ rows }: Props) {
  const [search, setSearch]             = useState("");
  const [filterRequested, setRequested] = useState("All");
  const [filterProduct, setProduct]     = useState("All");
  const [filterStatus, setStatus]       = useState("All");
  const [filterIssue, setIssue]         = useState("All");
  const [filterBrand, setBrand]         = useState("All");
  const [page, setPage]                 = useState(1);
  const PER_PAGE = 15;

  // Build dropdown options from the incoming rows
  const opts = useMemo(() => ({
    requested: uniq(rows.map((r) => r.requestBy)),
    products:  uniq(rows.map((r) => r.productName)),
    statuses:  uniq(rows.map((r) => r.actionTaken || "Registered")),
    issues:    uniq(rows.map((r) => r.issueType)),
    brands:    uniq(rows.map((r) => r.brand)),
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (filterRequested !== "All" && r.requestBy !== filterRequested) return false;
      if (filterProduct   !== "All" && r.productName !== filterProduct)  return false;
      if (filterStatus    !== "All") {
        const s = r.actionTaken || "Registered";
        if (s !== filterStatus) return false;
      }
      if (filterIssue  !== "All" && r.issueType !== filterIssue)         return false;
      if (filterBrand  !== "All" && r.brand     !== filterBrand)         return false;
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
  }, [rows, search, filterRequested, filterProduct, filterStatus, filterIssue, filterBrand]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function reset() {
    setSearch(""); setRequested("All"); setProduct("All");
    setStatus("All"); setIssue("All"); setBrand("All"); setPage(1);
  }

  const hasFilters =
    search || filterRequested !== "All" || filterProduct !== "All" ||
    filterStatus !== "All" || filterIssue !== "All" || filterBrand !== "All";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
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

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-slate-100">
        <TinySelect label="By"      value={filterRequested} options={["All", ...opts.requested]} onChange={(v) => { setRequested(v); setPage(1); }} />
        <TinySelect label="Product" value={filterProduct}   options={["All", ...opts.products]}  onChange={(v) => { setProduct(v);  setPage(1); }} />
        <TinySelect label="Status"  value={filterStatus}    options={["All", ...opts.statuses]}  onChange={(v) => { setStatus(v);   setPage(1); }} />
        <TinySelect label="Issue"   value={filterIssue}     options={["All", ...opts.issues]}    onChange={(v) => { setIssue(v);    setPage(1); }} />
        <TinySelect label="Brand"   value={filterBrand}     options={["All", ...opts.brands]}    onChange={(v) => { setBrand(v);    setPage(1); }} />
        {hasFilters && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition ml-1"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              {["#", "Date", "Requested By", "Product", "Brand", "Issue Type", "Status", "Days Pending", "Ageing"].map((h) => (
                <th key={h} className="text-left font-medium text-slate-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.sequenceNo} className="border-b border-slate-50 hover:bg-slate-50 transition">
                <td className="py-2 pr-3 text-slate-400 font-mono">{r.sequenceNo}</td>
                <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">{r.complaintDate}</td>
                <td className="py-2 pr-3 font-medium text-slate-800 whitespace-nowrap">{r.requestBy || "—"}</td>
                <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{r.productName || "—"}</td>
                <td className="py-2 pr-3">
                  <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{r.brand}</span>
                </td>
                <td className="py-2 pr-3 text-slate-600">{r.issueType || "—"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_BADGE[r.actionTaken] ?? "bg-slate-100 text-slate-600"
                  }`}>
                    {r.actionTaken || "Registered"}
                  </span>
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
                <td className="py-2 pr-3">
                  {r.ageingDays ? (
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      r.ageingDays === "90+"   ? "bg-red-100 text-red-700" :
                      r.ageingDays === "61-90" ? "bg-orange-100 text-orange-700" :
                      r.ageingDays === "31-60" ? "bg-yellow-100 text-yellow-700" :
                      "bg-green-100 text-green-700"
                    }`}>{r.ageingDays}</span>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">No tickets match the filters</td>
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
