"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, AlertCircle, LogOut, Table2, Bot, Factory, Pencil, Package, User } from "lucide-react";
import NotificationBell from "./NotificationBell";
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
import UpdateTicketModal from "./UpdateTicketModal";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_ORDER: string[] = [];
for (let y = 2025; y <= 2028; y++) for (const m of MONTH_NAMES) MONTH_ORDER.push(`${m}-${y}`);

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<ComplaintRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [botCount, setBotCount] = useState(0);
  const [drill, setDrill] = useState<{ label: string; rows: ComplaintRow[]; color: string } | null>(null);
  const [myName, setMyName] = useState("");
  const [drillEditing, setDrillEditing] = useState<ComplaintRow | null>(null);

  function handleDrillSelect(label: string, rows: ComplaintRow[], color: string) {
    if (!label) { setDrill(null); return; }
    setDrill({ label, rows, color });
  }

  useEffect(() => {
    fetch("/api/bot").then(r => r.json()).then(j => setBotCount(j.entries?.length ?? 0)).catch(() => {});
    setMyName(localStorage.getItem("team_member") ?? "");
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Filters — filterYear starts empty and defaults to the LATEST fiscal year once data loads
  const [filterYear, setFilterYear] = useState("");
  const [filterBrand, setFilterBrand] = useState("All");
  const [filterComplaintType, setFilterComplaintType] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterRange, setFilterRange] = useState<"All" | "3m" | "6m" | "12m">("All");

  async function fetchData() {
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error("Failed to load");
      const json: ApiResponse = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.rows);
      setLastUpdated(json.lastUpdated);
      setError(null);
      // Default the FY filter to the newest fiscal year (only if user hasn't picked one)
      const fys = Array.from(new Set(json.rows.map((r) => r.fiscalYear).filter(Boolean))).sort();
      const latest = fys[fys.length - 1];
      if (latest) setFilterYear((prev) => prev || latest);
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

  // Compute cutoff for range filter
  const rangeCutoff = useMemo(() => {
    if (filterRange === "All") return 0;
    const months = filterRange === "3m" ? 3 : filterRange === "6m" ? 6 : 12;
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }, [filterRange]);

  function parseDMYNum(s: string): number {
    if (!s) return 0;
    const parts = s.split("/");
    if (parts.length !== 3) return 0;
    const [d, m, y] = parts.map(Number);
    return y * 10000 + m * 100 + d;
  }

  // Filtered data
  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (filterYear !== "All" && r.fiscalYear !== filterYear) return false;
      if (filterBrand !== "All" && r.brand !== filterBrand) return false;
      if (filterComplaintType !== "All" && r.complaintType !== filterComplaintType) return false;
      if (filterMonth !== "All" && r.monthYear !== filterMonth) return false;
      if (rangeCutoff > 0) {
        const cd = parseDMYNum(r.complaintDate);
        if (cd === 0 || cd < rangeCutoff) return false;
      }
      return true;
    });
  }, [data, filterYear, filterBrand, filterComplaintType, filterMonth, rangeCutoff]);

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

  // Date range label for the open complaints chart top-right corner
  const dateRangeLabel = useMemo(() => {
    const months = filtered
      .map((r) => r.monthYear)
      .filter(Boolean)
      .sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
    if (months.length === 0) return undefined;
    const first = months[0];
    const last = months[months.length - 1];
    return first === last ? first : `${first} → ${last}`;
  }, [filtered]);

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
            <Link
              href="/my-work"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
              <User size={13} />
              My Work
            </Link>
            <Link
              href="/live"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
              <Table2 size={13} />
              Live Feed
            </Link>
            <Link
              href="/verify"
              className="relative flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
              <Bot size={13} />
              Verification
              {botCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-4 px-1 bg-red-500 text-white text-[9px] font-bold leading-none">
                    {botCount}
                  </span>
                </span>
              )}
            </Link>
            <button
              onClick={() => router.push("/spareparts")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
              <Package size={13} /> Spare Parts
            </button>
            <NotificationBell me={myName} />
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

        {/* Prachi bot verification alert */}
        {botCount > 0 && (
          <Link href="/verify" className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 hover:bg-red-100 transition">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot size={16} className="shrink-0" />
              <span><b>Prachi — {botCount} bot complaints pending verification.</b> Review and approve before they are counted.</span>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 bg-red-500 text-white rounded-lg shrink-0">Review now →</span>
          </Link>
        )}

        {/* Filters — one row: Period buttons + dropdowns */}
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
          <span className="text-xs font-medium text-slate-500">Period:</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {(["3m", "6m", "12m", "All"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFilterRange(r)}
                className={`text-xs px-3 py-1.5 font-medium transition ${
                  filterRange === r
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r === "All" ? "All time" : r.toUpperCase()}
              </button>
            ))}
          </div>
          <FilterSelect label="FY"    value={filterYear}  options={years}  onChange={setFilterYear} />
          <FilterSelect label="Brand" value={filterBrand} options={brands} onChange={setFilterBrand} />
          <FilterSelect label="Type"  value={filterComplaintType} options={["All", "Customer Complaint", "Store Complaint"]} onChange={setFilterComplaintType} />
          <FilterSelect label="Month" value={filterMonth} options={months} onChange={setFilterMonth} />
          <button
            onClick={() => {
              const latest = years[years.length - 1] || "All";
              setFilterYear(latest); setFilterBrand("All"); setFilterComplaintType("All"); setFilterMonth("All"); setFilterRange("All");
            }}
            className="text-xs text-indigo-600 hover:underline self-center"
          >
            Reset
          </button>
          <span className="ml-auto text-xs text-slate-400">
            {filtered.length.toLocaleString()} of {data.length.toLocaleString()}
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

        {/* Combined filter panel — one card, cards on top, pills below, no divider */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Factory size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Open Complaints</span>
            <span className="text-xs text-slate-400">· {openTickets.length} open · click any card or status to filter</span>
          </div>
          <AccountabilityBoard
            openRows={openTickets}
            onSelect={handleDrillSelect}
            selectedLabel={drill?.label ?? null}
          />
          <div className="mt-4">
            <OpenIssueBreakdown
              openRows={openTickets}
              dateRangeLabel={dateRangeLabel}
              onSelect={handleDrillSelect}
              selectedLabel={drill?.label ?? null}
            />
          </div>
        </div>

        {/* Drill-down list — immediately below the filter box */}
        {drill && (
          <div className="bg-white rounded-xl border-2 overflow-hidden" style={{ borderColor: `${drill.color}50` }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: `${drill.color}10` }}>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: drill.color }} />
                <span className="text-sm font-semibold" style={{ color: drill.color }}>{drill.label}</span>
                <span className="text-xs text-slate-500">— {drill.rows.length} complaints, most-aged first</span>
              </div>
              <button onClick={() => setDrill(null)} className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded hover:bg-slate-100">✕ Close</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Seq", "Date", "Customer", "Product", "Brand", "Platform", "Status", "Days Pending", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-2 text-slate-400 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {drill.rows.slice(0, 100).map((r) => {
                    const blank = !r.actionTaken?.trim();
                    return (
                      <tr key={r.id} className={`hover:bg-slate-50 transition ${blank ? "bg-red-50" : ""}`}>
                        <td className="px-4 py-2 font-mono font-semibold text-indigo-600">#{r.sequenceNo}</td>
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{r.complaintDate}</td>
                        <td className="px-4 py-2 text-slate-700 font-medium">{r.customerName || "—"}</td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{r.productName || "—"}</td>
                        <td className="px-4 py-2"><span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">{r.brand || "—"}</span></td>
                        <td className="px-4 py-2 text-slate-500">{r.platform || "—"}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {blank ? <span className="text-red-500 font-semibold">⚠ No status</span> : <span className="text-slate-500">{r.actionTaken}</span>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {r.daysPending != null ? (
                            <span className={`font-bold ${r.daysPending > 30 ? "text-red-500" : r.daysPending > 14 ? "text-amber-500" : "text-slate-600"}`}>
                              {r.daysPending}d
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => setDrillEditing(r)}
                            className="p-1.5 rounded-md text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Update ticket"
                          >
                            <Pencil size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {drill.rows.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No complaints in this group</td></tr>
                  )}
                </tbody>
              </table>
              {drill.rows.length > 100 && <p className="text-xs text-slate-400 px-4 py-2">Showing top 100 of {drill.rows.length}</p>}
            </div>
          </div>
        )}

        {/* Monthly trend */}
        <MonthlyTrendChart data={monthlyData} />

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
          <ProductChart data={productData} allRows={filtered} />
          <IssueByProductTable rows={filtered} />
        </div>

        {/* Request By Table */}
        <RequestByTable data={requestByData} />

        {/* Open Tickets Table */}
        <OpenTicketsTable rows={openTickets} onSaved={handleRefresh} />
      </main>

      {/* Drill-down edit modal */}
      {drillEditing && (
        <UpdateTicketModal
          row={drillEditing}
          onClose={() => setDrillEditing(null)}
          onSaved={() => { setDrillEditing(null); handleRefresh(); }}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  display,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  display?: (v: string) => string;
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
            {display ? display(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}
