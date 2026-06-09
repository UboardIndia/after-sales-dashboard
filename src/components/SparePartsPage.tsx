"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, LogOut, LayoutDashboard, Package, Calculator, X } from "lucide-react";
import PriceCalculator from "./PriceCalculator";
import type { SparePartsData, PriceListRow } from "@/lib/spareparts-types";

/* ─────────────────────────── helpers ─────────────────────────── */

const BRANDS = ["All", "Uboard", "Tygatec"];

function parseNum(s: string): number | null {
  if (!s || s.toLowerCase() === "na") return null;
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

function fmtRs(s: string): { val: number | null; display: string } {
  const v = parseNum(s);
  return { val: v, display: v != null ? `₹${v.toLocaleString("en-IN")}` : "" };
}

function hasPricing(row: PriceListRow) {
  return parseNum(row.MaxB2C) != null || parseNum(row.MinB2B) != null;
}

/* ─────────────────────────── main component ─────────────────────── */

export default function SparePartsPage() {
  const router = useRouter();
  const [data, setData] = useState<SparePartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calcOpen, setCalcOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [brand, setBrand] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/spareparts")
      .then((r) => r.json())
      .then((d: SparePartsData) => { setData(d); setLoading(false); });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  /* products with at least one priced part */
  const pricedProducts = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { brand: string; rows: PriceListRow[] }>();
    data.priceList.forEach((r) => {
      if (r.Product.startsWith("REVIEW")) return;
      if (!map.has(r.Product)) {
        const pm = data.productMaster.find((p) => p.Product === r.Product);
        map.set(r.Product, { brand: pm?.Brand ?? "", rows: [] });
      }
      map.get(r.Product)!.rows.push(r);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        brand: v.brand,
        rows: v.rows,
        pricedRows: v.rows.filter(hasPricing),
        missingCount: v.rows.filter((r) => !hasPricing(r)).length,
      }))
      .filter((p) => p.pricedRows.length > 0)   // only show if has ≥1 priced part
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  /* products with ZERO pricing */
  const unpricedProducts = useMemo(() => {
    if (!data) return [];
    return data.productMaster
      .filter((p) => p.HasPriceList !== "Yes" && p.HasRepairHistory && p.HasRepairHistory !== "No")
      .map((p) => {
        const repairMatch = p.HasRepairHistory.match(/\((\d+)\)/);
        const repairs = repairMatch ? parseInt(repairMatch[1]) : 0;
        return { ...p, repairs };
      })
      .sort((a, b) => b.repairs - a.repairs);
  }, [data]);

  /* filtered product list */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return pricedProducts.filter((p) => {
      if (brand !== "All" && p.brand !== brand) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.rows.some((r) => r.SparePart.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [pricedProducts, brand, search]);

  /* auto-select first product */
  useEffect(() => {
    if (filtered.length > 0 && !selectedProduct) setSelectedProduct(filtered[0].name);
    if (filtered.length > 0 && selectedProduct && !filtered.find((p) => p.name === selectedProduct))
      setSelectedProduct(filtered[0].name);
  }, [filtered, selectedProduct]);

  const activeProduct = useMemo(
    () => filtered.find((p) => p.name === selectedProduct) ?? null,
    [filtered, selectedProduct]
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Spare Parts Price List</h1>
              <p className="text-xs text-slate-400">UBOARD & TYGATEC · Repair Pricing Reference</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCalcOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition font-medium">
              <Calculator size={13} /> Price Calculator
            </button>
            <button onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition">
              <LayoutDashboard size={13} /> Dashboard
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
          <PriceCalculator open={calcOpen} onClose={() => setCalcOpen(false)} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-5 gap-5">

        {/* ── LEFT: product list ── */}
        <aside className="w-72 shrink-0 flex flex-col gap-3">

          {/* Search + brand filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search product or part…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {search && (
                <button onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={11} />
                </button>
              )}
              {/* Autocomplete dropdown */}
              {showSuggestions && search.length > 0 && (
                <div ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-56 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-slate-400 px-3 py-2.5">No matches for "{search}"</p>
                  ) : (
                    filtered.map((p) => {
                      // Highlight matching text
                      const q = search.toLowerCase();
                      const name = p.name;
                      const idx = name.toLowerCase().indexOf(q);
                      const matchingParts = p.rows
                        .filter(r => r.SparePart.toLowerCase().includes(q))
                        .slice(0, 2);
                      return (
                        <button key={p.name}
                          onMouseDown={() => {
                            setSelectedProduct(p.name);
                            setSearch("");
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition">
                          <p className="text-xs font-medium text-slate-800">
                            {idx >= 0 ? (
                              <>
                                {name.slice(0, idx)}
                                <span className="bg-indigo-100 text-indigo-700 rounded">{name.slice(idx, idx + q.length)}</span>
                                {name.slice(idx + q.length)}
                              </>
                            ) : name}
                          </p>
                          {matchingParts.length > 0 && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              Part: {matchingParts.map(r => r.SparePart).join(", ")}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-300">{p.brand} · {p.pricedRows.length} parts</p>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              {BRANDS.map((b) => (
                <button key={b} onClick={() => setBrand(b)}
                  className={`flex-1 text-xs py-1 rounded-md font-medium transition ${brand === b ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Product buttons */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1">
              {filtered.length} products with pricing
            </p>
            <div className="overflow-y-auto max-h-[calc(100vh-320px)]">
              {filtered.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedProduct(p.name)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-50 transition flex items-start justify-between gap-2 ${
                    selectedProduct === p.name
                      ? "bg-indigo-50 border-l-2 border-l-indigo-500"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${selectedProduct === p.name ? "text-indigo-700" : "text-slate-700"}`}>
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.pricedRows.length} parts priced</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-medium ${
                    p.brand === "Tygatec" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                  }`}>{p.brand}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-slate-400 p-4 text-center">No products match</p>
              )}
            </div>
          </div>
        </aside>

        {/* ── RIGHT: parts table + missing ── */}
        <main className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Parts table */}
          {activeProduct ? (
            <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
              {/* Product header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-bold text-slate-900">{activeProduct.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      activeProduct.brand === "Tygatec" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                    }`}>{activeProduct.brand}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {activeProduct.pricedRows.length} spare parts with pricing
                    {activeProduct.missingCount > 0 && (
                      <span className="ml-2 text-amber-500">· {activeProduct.missingCount} parts missing prices (hidden)</span>
                    )}
                  </p>
                </div>

                {/* Legend */}
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-slate-600"><strong>Min (B2B)</strong> — Dealer / In-warranty rate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-indigo-500" />
                    <span className="text-slate-600"><strong>Max (B2C)</strong> — Customer / Out-of-warranty rate</span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs">Spare Part</th>
                      <th className="text-right px-5 py-3 font-medium text-xs w-44">
                        <span className="text-green-700 bg-green-50 px-2 py-1 rounded-md">Min — B2B</span>
                      </th>
                      <th className="text-right px-5 py-3 font-medium text-xs w-44">
                        <span className="text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">Max — B2C</span>
                      </th>
                      <th className="text-center px-5 py-3 font-medium text-slate-500 text-xs w-24">GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeProduct.pricedRows.map((r, i) => {
                      const b2b = fmtRs(r.MinB2B);
                      const b2c = fmtRs(r.MaxB2C);
                      const isService = r.SparePart.toLowerCase().includes("service");
                      return (
                        <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 transition ${isService ? "bg-slate-50/50" : ""}`}>
                          <td className="px-5 py-3 text-slate-800">
                            {isService
                              ? <span className="italic text-slate-500">{r.SparePart}</span>
                              : r.SparePart}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {b2b.val != null
                              ? <span className="font-semibold text-green-700">{b2b.display}</span>
                              : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {b2c.val != null
                              ? <span className="font-bold text-indigo-700 text-base">{b2c.display}</span>
                              : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3 text-center text-xs text-slate-400">
                            {r.GST || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom note */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                <p className="text-xs text-slate-400">
                  <strong className="text-slate-500">In-warranty repair:</strong> charge customer <strong>₹0</strong>, internal cost = Min (B2B) price. &nbsp;·&nbsp;
                  <strong className="text-slate-500">Out-of-warranty:</strong> charge customer Max (B2C) price.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center h-64">
              <div className="text-center text-slate-400">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select a product to see its parts pricing</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
