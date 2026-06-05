"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, LogOut, LayoutDashboard, Package, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { SparePartsData, PriceListRow, ProductMasterRow } from "@/lib/spareparts-types";

const PER_PAGE = 20;

export default function SparePartsPage() {
  const router = useRouter();
  const [data, setData] = useState<SparePartsData | null>(null);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [filterProduct, setFilterProduct] = useState("All");
  const [filterBrand, setFilterBrand] = useState("All");
  const [filterMissing, setFilterMissing] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/spareparts")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const productMap = useMemo(() => {
    if (!data) return new Map<string, ProductMasterRow>();
    const m = new Map<string, ProductMasterRow>();
    data.productMaster.forEach((p) => m.set(p.Product, p));
    return m;
  }, [data]);

  const brands = useMemo(() => {
    if (!data) return ["All"];
    const s = new Set(data.productMaster.map((p) => p.Brand).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [data]);

  const products = useMemo(() => {
    if (!data) return ["All"];
    const s = new Set(data.priceList.map((r) => r.Product).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.priceList.filter((r) => {
      if (filterProduct !== "All" && r.Product !== filterProduct) return false;
      if (filterBrand !== "All") {
        const pm = productMap.get(r.Product);
        if (!pm || pm.Brand !== filterBrand) return false;
      }
      if (filterMissing && r.MaxB2C !== "" && r.MinB2B !== "") return false;
      if (q && !r.Product.toLowerCase().includes(q) && !r.SparePart.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, filterProduct, filterBrand, filterMissing, productMap]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Stats
  const stats = useMemo(() => {
    if (!data) return null;
    const total = data.productMaster.length;
    const hasPricing = data.productMaster.filter((p) => p.HasPriceList === "Yes").length;
    const missingPricing = total - hasPricing;
    const missingCells = data.priceList.filter((r) => r.MaxB2C === "" || r.MinB2B === "").length;
    const repairCosts = data.repairLog
      .map((r) => parseFloat(r.Cost))
      .filter((c) => !isNaN(c) && c > 0);
    const totalRepairCost = repairCosts.reduce((a, b) => a + b, 0);
    const avgRepairCost = repairCosts.length ? Math.round(totalRepairCost / repairCosts.length) : 0;

    // top repaired products
    const repairCount = new Map<string, number>();
    data.repairLog.forEach((r) => {
      if (r.Product && !r.Product.includes("REVIEW"))
        repairCount.set(r.Product, (repairCount.get(r.Product) ?? 0) + 1);
    });
    const topRepaired = Array.from(repairCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, hasPricing, missingPricing, missingCells, totalRepairCost, avgRepairCost, repairCount: data.repairLog.length, topRepaired };
  }, [data]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading spare parts data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-indigo-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Spare Parts Catalog</h1>
              <p className="text-xs text-slate-400">Price List · Product Master · Repair History</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
            >
              <LayoutDashboard size={13} /> Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Total Products" value={stats.total} color="slate" />
            <StatCard label="With Pricing" value={stats.hasPricing} color="green" sub={`of ${stats.total} products`} />
            <StatCard label="Missing Pricing" value={stats.missingPricing} color="orange" sub="need price list" />
            <StatCard label="Missing Cells" value={stats.missingCells} color="red" sub="yellow cells to fill" />
            <StatCard label="Avg Repair Cost" value={`₹${stats.avgRepairCost.toLocaleString()}`} color="purple" sub={`across ${stats.repairCount} repairs`} />
          </div>
        )}

        {/* Missing pricing alert */}
        {stats && stats.missingPricing > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {stats.missingPricing} products have no price list yet
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Tygatec products are highest priority — most repairs, zero pricing. Use the filter below to see them.
              </p>
            </div>
            <button
              onClick={() => { setFilterBrand("Tygatec"); setFilterMissing(false); setPage(1); }}
              className="ml-auto text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition whitespace-nowrap"
            >
              Show Tygatec
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Price List Table */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Price List</h2>
                <p className="text-xs text-slate-400">{filtered.length} parts · Min = B2B (dealer) · Max = B2C (customer)</p>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product or part..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-100">
              <TinySelect label="Product" value={filterProduct} options={["All", ...products.slice(1)]} onChange={(v) => { setFilterProduct(v); setPage(1); }} />
              <TinySelect label="Brand" value={filterBrand} options={brands} onChange={(v) => { setFilterBrand(v); setPage(1); }} />
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterMissing}
                  onChange={(e) => { setFilterMissing(e.target.checked); setPage(1); }}
                  className="rounded"
                />
                Missing prices only
              </label>
              {(filterProduct !== "All" || filterBrand !== "All" || filterMissing || search) && (
                <button
                  onClick={() => { setFilterProduct("All"); setFilterBrand("All"); setFilterMissing(false); setSearch(""); setPage(1); }}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Product", "Spare Part", "Max — B2C (Customer)", "Min — B2B (Dealer)", "GST"].map((h) => (
                      <th key={h} className="text-left font-medium text-slate-400 pb-2 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r, i) => {
                    const missingMax = r.MaxB2C === "";
                    const missingMin = r.MinB2B === "";
                    return (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition">
                        <td className="py-2 pr-4 font-medium text-slate-800 whitespace-nowrap">{r.Product}</td>
                        <td className="py-2 pr-4 text-slate-600">{r.SparePart}</td>
                        <td className="py-2 pr-4">
                          {missingMax ? (
                            <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs">Missing</span>
                          ) : (
                            <span className="font-medium text-slate-800">₹{r.MaxB2C}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {missingMin ? (
                            <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs">Missing</span>
                          ) : (
                            <span className="font-medium text-slate-700">₹{r.MinB2B}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-slate-500">{r.GST || "—"}</td>
                      </tr>
                    );
                  })}
                  {paged.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400">No parts match filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Top repaired products */}
            {stats && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Most Repaired Products</h3>
                <div className="space-y-2">
                  {stats.topRepaired.map(([product, count]) => {
                    const max = stats.topRepaired[0][1];
                    return (
                      <div key={product}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-700 truncate pr-2">{product}</span>
                          <span className="text-slate-500 shrink-0">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Master */}
            {data && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Product Master ({data.productMaster.length})</h3>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {data.productMaster.map((p) => (
                    <div key={p.Product} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                      <span className="text-slate-700 truncate pr-2">{p.Product}</span>
                      <div className="flex gap-1 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${p.HasPriceList === "Yes" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {p.HasPriceList === "Yes" ? "Priced" : "No price"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  const colors: Record<string, string> = {
    slate:  "bg-slate-50 border-slate-200 text-slate-900",
    green:  "bg-green-50 border-green-200 text-green-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    red:    "bg-red-50 border-red-200 text-red-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-4 ${colors[color] ?? colors.slate}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function TinySelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-400">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
