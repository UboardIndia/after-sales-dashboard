"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Calculator, ChevronDown, Search, Copy, Check } from "lucide-react";
import type { SparePartsData, PriceListRow } from "@/lib/spareparts-types";

interface Props { open: boolean; onClose: () => void; }

function parseNum(s: string): number | null {
  if (!s || s.toLowerCase() === "na") return null;
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

function calcPrice(row: PriceListRow, type: "B2C" | "B2B") {
  const raw = type === "B2C" ? row.MaxB2C : row.MinB2B;
  const base = parseNum(raw);
  const gstRaw = (row.GST ?? "").trim().toLowerCase();
  const gstIncluded = gstRaw === "included" || gstRaw === "gst included";
  const gstPct = gstIncluded ? 0 : (parseNum(row.GST) ?? 0);
  if (base == null) return { base: null, gstPct, gstIncluded, final: null, gstAmount: 0 };
  const gstAmount = Math.round(base * gstPct / 100);
  return { base, gstPct, gstIncluded, final: base + gstAmount, gstAmount };
}

export default function PriceCalculator({ open, onClose }: Props) {
  const [data, setData]           = useState<SparePartsData | null>(null);
  const [brand, setBrand]         = useState("");
  const [product, setProduct]     = useState("");
  const [priceType, setPriceType] = useState<"B2C" | "B2B">("B2C");
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [search, setSearch]       = useState("");
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    if (open && !data) fetch("/api/spareparts").then(r => r.json()).then(setData);
  }, [open, data]);

  useEffect(() => { setProduct(""); setSelected(new Set()); setSearch(""); }, [brand]);
  useEffect(() => { setSelected(new Set()); setSearch(""); }, [product]);

  const brands = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.priceList
      .filter(r => !r.Product.startsWith("REVIEW"))
      .map(r => data.productMaster.find(p => p.Product === r.Product)?.Brand ?? "")
      .filter(Boolean));
    return Array.from(s).sort();
  }, [data]);

  const products = useMemo(() => {
    if (!data || !brand) return [];
    const s = new Set(data.priceList
      .filter(r => !r.Product.startsWith("REVIEW") &&
        data.productMaster.find(p => p.Product === r.Product)?.Brand === brand)
      .map(r => r.Product));
    return Array.from(s).sort();
  }, [data, brand]);

  const allParts = useMemo(() => {
    if (!data || !product) return [];
    return data.priceList
      .filter(r => r.Product === product && (r.MaxB2C !== "" || r.MinB2B !== ""))
      .sort((a, b) => a.SparePart.localeCompare(b.SparePart));
  }, [data, product]);

  const filteredParts = useMemo(() => {
    const q = search.toLowerCase();
    return q ? allParts.filter(r => r.SparePart.toLowerCase().includes(q)) : allParts;
  }, [allParts, search]);

  function toggle(name: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const lineItems = useMemo(() =>
    allParts.filter(r => selected.has(r.SparePart)).map(r => ({ ...r, ...calcPrice(r, priceType) })),
    [allParts, selected, priceType]
  );

  const totalGST   = lineItems.reduce((s, r) => s + r.gstAmount, 0);
  const totalBase  = lineItems.reduce((s, r) => s + (r.base ?? 0), 0);
  const totalFinal = lineItems.reduce((s, r) => s + (r.final ?? 0), 0);
  const hasItems   = lineItems.length > 0;

  function copyQuotation() {
    const lines = [
      `Product: ${product}`,
      ``,
      `Spare Parts:`,
      ...lineItems.map(r =>
        r.final != null
          ? `  • ${r.SparePart}: ₹${r.final.toLocaleString("en-IN")}`
          : `  • ${r.SparePart}: Price not available`
      ),
      `─────────────────────`,
      `Total: ₹${totalFinal.toLocaleString("en-IN")}`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      {/* Fixed height modal so parts list never gets pushed away */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ height: "82vh", maxHeight: 620 }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Calculator size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">Price Calculator</p>
              <p className="text-[11px] text-slate-400">Select parts → copy quotation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        {/* ── Top controls (fixed, never scrolls) ── */}
        <div className="px-4 pt-3 pb-2 space-y-2.5 shrink-0">
          {/* Brand + Product */}
          <div className="grid grid-cols-2 gap-2">
            <Sel label="Brand" value={brand} onChange={setBrand} placeholder="Brand"
              options={brands.map(b => ({ value: b, label: b }))} />
            <Sel label="Product" value={product} onChange={setProduct}
              placeholder={brand ? "Product" : "Brand first"}
              options={products.map(p => ({ value: p, label: p }))} disabled={!brand} />
          </div>

          {/* B2C / B2B */}
          <div className="grid grid-cols-2 gap-2">
            {(["B2C", "B2B"] as const).map(t => (
              <button key={t} onClick={() => setPriceType(t)}
                className={`py-2 rounded-xl text-xs font-semibold border-2 transition leading-tight ${
                  priceType === t
                    ? t === "B2C" ? "border-indigo-600 bg-indigo-600 text-white" : "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 text-slate-500 bg-white hover:border-slate-300"
                }`}>
                {t === "B2C" ? "B2C — Customer" : "B2B — Dealer"}
                <span className="block text-[10px] font-normal opacity-75 mt-0.5">
                  {t === "B2C" ? "Walk-in / end user" : "Hamleys / in-warranty"}
                </span>
              </button>
            ))}
          </div>

          {/* Parts header + search */}
          {product && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-600">Spare Parts</span>
                  {selected.size > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {selected.size} selected
                    </span>
                  )}
                </div>
                {selected.size > 0 && (
                  <button onClick={() => setSelected(new Set())}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition">Clear</button>
                )}
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search parts…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-slate-50" />
                {search && (
                  <button onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={11} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Parts list — fills remaining space, scrolls ── */}
        <div className="flex-1 overflow-y-auto mx-4 rounded-xl border border-slate-200 divide-y divide-slate-100 min-h-0">
          {!product ? (
            <div className="flex items-center justify-center h-full text-slate-300 text-xs">
              Select a product to see parts
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-300 text-xs">
              No parts match "{search}"
            </div>
          ) : (
            filteredParts.map((r, i) => {
              const c = calcPrice(r, priceType);
              const on = selected.has(r.SparePart);
              const svc = r.SparePart.toLowerCase().includes("service");
              return (
                <button key={i} onClick={() => toggle(r.SparePart)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${
                    on ? "bg-indigo-50" : "bg-white hover:bg-slate-50"
                  }`}>
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border-2 transition ${
                    on ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                  }`}>
                    {on && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5l2 2L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  {/* Name */}
                  <span className={`flex-1 text-xs ${svc ? "italic text-slate-400" : on ? "text-slate-900 font-medium" : "text-slate-700"}`}>
                    {r.SparePart}
                  </span>
                  {/* Price */}
                  {c.final != null ? (
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${on ? "text-indigo-700" : "text-slate-600"}`}>
                        ₹{c.final.toLocaleString("en-IN")}
                      </p>
                      {c.gstPct > 0 && <p className="text-[10px] text-slate-400">+{c.gstPct}%</p>}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300 shrink-0">—</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* ── Footer: slim total bar + copy button ── */}
        <div className="px-4 py-3 shrink-0 border-t border-slate-100 space-y-2">
          {/* Total strip */}
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
            hasItems
              ? priceType === "B2C" ? "bg-indigo-600" : "bg-emerald-600"
              : "bg-slate-100"
          }`}>
            {!hasItems ? (
              <p className="text-xs text-slate-400 w-full text-center">Tap parts to add</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-white">
                    ₹{totalFinal.toLocaleString("en-IN")}
                  </span>
                  {totalGST > 0 && (
                    <span className="text-[11px] text-white/60">
                      ₹{totalBase.toLocaleString("en-IN")} +₹{totalGST.toLocaleString("en-IN")} GST
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-white/60">
                  {lineItems.length} part{lineItems.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>

          {/* Copy button */}
          {hasItems && (
            <button onClick={copyQuotation}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                copied
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
              }`}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy Quotation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, placeholder, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-slate-500 block mb-1">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
          className={`w-full appearance-none px-3 py-2 pr-7 text-xs border-2 rounded-xl focus:outline-none transition font-medium ${
            disabled ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
            : value ? "border-indigo-300 bg-white text-slate-800 focus:border-indigo-500"
            : "border-slate-200 bg-white text-slate-500 focus:border-indigo-400"
          }`}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
