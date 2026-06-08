"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { ComplaintRow, ApiResponse } from "@/lib/types";
import LiveFeedTable from "@/components/LiveFeedTable";
import NotificationBell from "@/components/NotificationBell";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_ORDER: string[] = [];
for (let y = 2025; y <= 2028; y++) for (const m of MONTH_NAMES) MONTH_ORDER.push(`${m}-${y}`);

export default function LivePage() {
  const [data, setData] = useState<ComplaintRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myName, setMyName] = useState("");

  useEffect(() => { setMyName(localStorage.getItem("team_member") ?? ""); }, []);

  // Filters
  const [filterYear, setFilterYear] = useState("All");
  const [filterBrand, setFilterBrand] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");

  async function fetchData() {
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error("Failed to load");
      const json: ApiResponse = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.rows);
      setLastUpdated(json.lastUpdated);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const years = useMemo(() => {
    const s = new Set(data.map((r) => r.fiscalYear).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [data]);

  const brands = useMemo(() => {
    const s = new Set(data.map((r) => r.brand).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [data]);

  const months = useMemo(() => {
    const s = new Set(data.map((r) => r.monthYear).filter(Boolean));
    const sorted = Array.from(s).sort(
      (a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)
    );
    return ["All", ...sorted];
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (filterYear !== "All" && r.fiscalYear !== filterYear) return false;
      if (filterBrand !== "All" && r.brand !== filterBrand) return false;
      if (filterStatus === "Open" && !r.isOpen) return false;
      if (filterStatus === "Closed" && r.isOpen) return false;
      if (filterMonth !== "All" && r.monthYear !== filterMonth) return false;
      return true;
    });
  }, [data, filterYear, filterBrand, filterStatus, filterMonth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            >
              <ArrowLeft size={13} />
              Dashboard
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Live Data Feed</h1>
              <p className="text-xs text-slate-400">
                {data.length.toLocaleString()} total rows · FY 2025–26 &amp; FY 2026–27
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-400 hidden sm:block">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <NotificationBell me={myName} />
            <button
              onClick={() => { setRefreshing(true); fetchData(); }}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
          <span className="text-xs font-medium text-slate-500 self-center">Filters:</span>
          <FilterSelect label="Year"   value={filterYear}   options={years}                                        onChange={setFilterYear} />
          <FilterSelect label="Brand"  value={filterBrand}  options={brands}                                       onChange={setFilterBrand} />
          <FilterSelect label="Status" value={filterStatus} options={["All", "Open", "Closed"]}                    onChange={setFilterStatus} />
          <FilterSelect label="Month"  value={filterMonth}  options={months}                                       onChange={setFilterMonth} />
          {(filterYear !== "All" || filterBrand !== "All" || filterStatus !== "All" || filterMonth !== "All") && (
            <button
              onClick={() => { setFilterYear("All"); setFilterBrand("All"); setFilterStatus("All"); setFilterMonth("All"); }}
              className="text-xs text-indigo-600 hover:underline self-center ml-1"
            >
              Clear all
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400 self-center">
            {filtered.length.toLocaleString()} of {data.length.toLocaleString()} rows
          </span>
        </div>

        <LiveFeedTable rows={filtered} onUpdated={fetchData} />
      </main>
    </div>
  );
}

function FilterSelect({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
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
