"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertCircle, LogOut } from "lucide-react";
import type { ComplaintRow, ApiResponse } from "@/lib/types";
import HeroStats from "./HeroStats";
import KPICard from "./KPICard";
import OpenIssueBreakdown from "./OpenIssueBreakdown";
import AccountabilityBoard from "./AccountabilityBoard";
import MonthlyTrendChart from "./MonthlyTrendChart";
import IssueTypeChart from "./IssueTypeChart";
import ProductChart from "./ProductChart";
import ComplaintTypePie from "./ComplaintTypePie";
import RequestByTable from "./RequestByTable";
import OpenTicketsTable from "./OpenTicketsTable";
import IssueByProductTable from "./IssueByProductTable";

const MONTH_ORDER = [
  "Apr-2025","May-2025","Jun-2025","Jul-2025","Aug-2025","Sep-2025",
  "Oct-2025","Nov-2025","Dec-2025","Jan-2026","Feb-2026","Mar-2026","Apr-2026",
];

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<ComplaintRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Filters
  const [filterBrand, setFilterBrand] = useState("All");
  const [filterComplaintType, setFilterComplaintType] = useState("All");
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

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  // Unique filter options
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

  // Filtered data
  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (filterBrand !== "All" && r.brand !== filterBrand) return false;
      if (filterComplaintType !== "All" && r.complaintType !== filterComplaintType) return false;
      if (filterMonth !== "All" && r.monthYear !== filterMonth) return false;
      return true;
    });
  }, [data, filterBrand, filterComplaintType, filterMonth]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter((r) => r.isOpen).length;
    const closed = total - open;
    const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    const openWithDays = filtered.filter((r) => r.isOpen && r.daysPending != null);
    const avgDaysPending =
      openWithDays.length > 0
        ? Math.round(
            openWithDays.reduce((s, r) => s + (r.daysPending ?? 0), 0) /
              openWithDays.length
          )
        : 0;
    const maxDaysPending =
      openWithDays.length > 0
        ? Math.max(...openWithDays.map((r) => r.daysPending ?? 0))
        : 0;
    const aged90 = filtered.filter((r) => r.isOpen && (r.daysPending ?? 0) > 90).length;
    const withWarranty = filtered.filter((r) => r.warrantyStatus === "Yes").length;
    return { total, open, closed, closureRate, avgDaysPending, maxDaysPending, aged90, withWarranty };
  }, [filtered]);

  // Monthly data
  const monthlyData = useMemo(() => {
    const map = new Map<string, { open: number; closed: number }>();
    MONTH_ORDER.forEach((m) => map.set(m, { open: 0, closed: 0 }));
    filtered.forEach((r) => {
      if (!r.monthYear) return;
      const entry = map.get(r.monthYear) ?? { open: 0, closed: 0 };
      if (r.isOpen) entry.open++;
      else entry.closed++;
      map.set(r.monthYear, entry);
    });
    return MONTH_ORDER.filter((m) => {
      const e = map.get(m)!;
      return e.open + e.closed > 0;
    }).map((m) => ({ month: m, ...map.get(m)!, total: (map.get(m)!.open + map.get(m)!.closed) }));
  }, [filtered]);

  // Issue types
  const issueData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const k = r.issueType || "Unknown";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .filter(([k]) => k !== "Unknown" && k !== "")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count }));
  }, [filtered]);

  // Products
  const productData = useMemo(() => {
    const map = new Map<string, { open: number; closed: number }>();
    filtered.forEach((r) => {
      if (!r.productName) return;
      const entry = map.get(r.productName) ?? { open: 0, closed: 0 };
      if (r.isOpen) entry.open++;
      else entry.closed++;
      map.set(r.productName, entry);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v, total: v.open + v.closed }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [filtered]);

  // Complaint type
  const complaintTypeData = useMemo(() => {
    const customer = filtered.filter((r) => r.complaintType === "Customer Complaint").length;
    const store = filtered.filter((r) => r.complaintType === "Store Complaint").length;
    return [
      { name: "Customer", value: customer },
      { name: "Store", value: store },
    ];
  }, [filtered]);

  // Request by
  const requestByData = useMemo(() => {
    const map = new Map<string, { open: number; closed: number }>();
    filtered.forEach((r) => {
      const k = r.requestBy || "Unknown";
      const entry = map.get(k) ?? { open: 0, closed: 0 };
      if (r.isOpen) entry.open++;
      else entry.closed++;
      map.set(k, entry);
    });
    return Array.from(map.entries())
      .filter(([k]) => k !== "Unknown" && k !== "")
      .map(([name, v]) => ({
        name,
        ...v,
        total: v.open + v.closed,
        closureRate: Math.round((v.closed / (v.open + v.closed)) * 100),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Open tickets
  const openTickets = useMemo(
    () => filtered.filter((r) => r.isOpen),
    [filtered]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">After Sales Dashboard</h1>
            <p className="text-xs text-slate-400">FY 2025–26 · UBOARD & TYGATEC</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-400 hidden sm:block">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
            >
              <LogOut size={13} />
              {loggingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle size={16} />
            {error} — showing cached data if available.
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
          <span className="text-xs font-medium text-slate-500 self-center">Filters:</span>
          <FilterSelect
            label="Brand"
            value={filterBrand}
            options={brands}
            onChange={setFilterBrand}
          />
          <FilterSelect
            label="Type"
            value={filterComplaintType}
            options={["All", "Customer Complaint", "Store Complaint"]}
            onChange={setFilterComplaintType}
          />
          <FilterSelect
            label="Month"
            value={filterMonth}
            options={months}
            onChange={setFilterMonth}
          />
          {(filterBrand !== "All" || filterComplaintType !== "All" || filterMonth !== "All") && (
            <button
              onClick={() => { setFilterBrand("All"); setFilterComplaintType("All"); setFilterMonth("All"); }}
              className="text-xs text-indigo-600 hover:underline self-center ml-1"
            >
              Clear all
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400 self-center">
            Showing {filtered.length.toLocaleString()} of {data.length.toLocaleString()} complaints
          </span>
        </div>

        {/* Hero: % Closed + headline numbers */}
        <HeroStats
          total={kpis.total}
          open={kpis.open}
          closed={kpis.closed}
          closureRate={kpis.closureRate}
        />

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="Avg Days Pending"
            value={kpis.avgDaysPending}
            color="purple"
            sub="across open tickets"
          />
          <KPICard
            label="Oldest Open Ticket"
            value={`${kpis.maxDaysPending}d`}
            color="orange"
            sub="longest still unresolved"
          />
          <KPICard
            label="Aged 90+ Days"
            value={kpis.aged90}
            color="slate"
            sub="open tickets over 90 days"
          />
          <KPICard
            label="Under Warranty"
            value={kpis.withWarranty}
            color="blue"
            sub={`${kpis.total > 0 ? Math.round((kpis.withWarranty / kpis.total) * 100) : 0}% of total`}
          />
        </div>

        {/* Accountability Board — who owns each open unit */}
        <AccountabilityBoard openRows={openTickets} />

        {/* Why are complaints open + Monthly trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OpenIssueBreakdown openRows={openTickets} />
          <MonthlyTrendChart data={monthlyData} />
        </div>

        {/* Complaint source + Issue types */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <ComplaintTypePie data={complaintTypeData} />
          </div>
          <div className="lg:col-span-2">
            <IssueTypeChart data={issueData} />
          </div>
        </div>

        {/* Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ProductChart data={productData} />
          <IssueByProductTable rows={filtered} />
        </div>

        {/* Request By Table */}
        <RequestByTable data={requestByData} />

        {/* Open Tickets Table */}
        <OpenTicketsTable rows={openTickets} />
      </main>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-400">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
