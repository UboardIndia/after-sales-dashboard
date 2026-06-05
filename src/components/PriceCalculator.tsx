"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { X, Calculator, IndianRupee, ChevronDown, Search, Minus, Copy, Check } from "lucide-react";
import type { SparePartsData, PriceListRow } from "@/lib/spareparts-types";

interface Props {
  open: boolean;
  onClose: () => void;
}

function parseNum(s: string): number | null {
  if (!s || s.toLowerCase() === "na") return null;
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

function calcPrice(row: PriceListRow, type: "B2C" | "B2B") {
  const rawStr = type === "B2C" ? row.MaxB2C : row.MinB2B;
  const base = parseNum(rawStr);
  const gstRaw = (row.GST ?? "").trim().toLowerCase();
  const gstIncluded = gstRaw === "included" || gstRaw === "gst included";
  const gstPct = gstIncluded ? 0 : (parseNum(row.GST) ?? 0);
  if (base == null) return { base: null, gstPct, gstIncluded, final: null, gstAmount: 0 };
  const gstAmount = Math.round(base * gstPct / 100);
  return { base, gstPct, gstIncluded, final: base + gstAmount, gstAmount };
}

export default function PriceCalculator({ open, onClose }: Props) {
  const [data, setData]             = useState<SparePartsData | null>(null);
  const [brand, setBrand]           = useState("");
  const [product, setProduct]       = useState("");
  const [priceType, setPriceType]   = useState<"B2C" | "B2B">("B2C");
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [search, setSearch]         = useState("");
  const [copied, setCopied]         = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !data) fetch("/api/spareparts").then(r => r.json()).then(setData);
  }, [open, data]);

  useEffect(() => { setProduct(""); setSelected(new Set()); setSearch(""); }, [brand]);
  useEffect(() => { setSelected(new Set()); setSearch(""); }, [product]);

  const brands = useMemo(() => {
    if (!data) return [];
    const s = new Set(
      data.priceList
        .filter(r => !r.Product.startsWith("REVIEW"))
        .map(r => data.productMaster.find(p => p.Product === r.Product)?.Brand ?? "")
        .filter(Boolean)
    );
    return Array.from(s).sort();
  }, [data]);

  const products = useMemo(() => {
    if (!data || !brand) return [];
    const s = new Set(
      data.priceList
        .filter(r => !r.Product.startsWith("REVIEW") &&
          data.productMaster.find(p => p.Product === r.Product)?.Brand === brand)
        .map(r => r.Product)
    );
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

  const totalBase  = lineItems.reduce((s, r) => s + (r.base  ?? 0), 0);
  const totalGST   = lineItems.reduce((s, r) => s + r.gstAmount, 0);
  const totalFinal = lineItems.reduce((s, r) => s + (r.final ?? 0), 0);
  const hasItems   = lineItems.length > 0;

  function copyQuotation() {
    const typeLabel = priceType === "B2C" ? "B2C (Customer)" : "B2B (Dealer/Warranty)";
    const lines: string[] = [
      `Product: ${product}`,
      `Price Type: ${typeLabel}`,
      ``,
      `Spare Parts:`,
      ...lineItems.map(r =>
        r.final != null
          ? `  • ${r.SparePart}: ₹${r.final.toLocaleString("en-IN")}${r.gstPct > 0 ? ` (incl. ${r.gstPct}% GST)` : r.gstIncluded ? ` (GST incl.)` : ""}`
          : `  • ${r.SparePart}: Price not available`
      ),
      ``,
      totalGST > 0
        ? `Subtotal (before GST): ₹${totalBase.toLocaleString("en-IN")}\nTotal GST: ₹${totalGST.toLocaleString("en-IN")}`
        : "",
      `─────────────────────`,
      `TOTAL: ₹${totalFinal.toLocaleString("en-IN")}`,
    ].filter(l => l !== "");

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "92vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <Calculator size={17} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Price Calculator</h2>
              <p className="text-[11px] text-slate-400">Select parts → copy quotation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Brand + Product */}
          <div className="grid grid-cols-2 gap-3">
            <CalcSelect label="Brand" value={brand} onChange={setBrand}
              placeholder="Brand…" options={brands.map(b => ({ value: b, label: b }))} />
            <CalcSelect label="Product" value={product} onChange={setProduct}
              placeholder={brand ? "Product…" : "Select brand first"}
              options={products.map(p => ({ value: p, label: p }))} disabled={!brand} />
          </div>

          {/* B2C / B2B */}
          <div className="grid grid-cols-2 gap-2">
            {(["B2C", "B2B"] as const).map(t => (
              <button key={t} onClick={() => setPriceType(t)}
                className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition ${
                  priceType === t
                    ? t === "B2C" ? "border-indigo-600 bg-indigo-600 text-white shadow-sm" : "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                }`}>
                {t === "B2C" ? "B2C — Customer" : "B2B — Dealer"}
                <span className="block text-[10px] font-normal opacity-75 mt-0.5">
                  {t === "B2C" ? "Walk-in / end user" : "Hamleys / in-warranty"}
                </span>
              </button>
            ))}
          </div>

          {/* Parts list with search */}
          {product && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">
                  Spare Parts
                  {selected.size > 0 && (
                    <span className="ml-2 bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {selected.size} selected
                    </span>
                  )}
                </span>
                {selected.size > 0 && (
                  <button onClick={() => setSelected(new Set())}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition">
                    Clear
                  </button>
                )}
              </div>

              {/* Search bar */}
              <div className="relative mb-2">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search parts…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-slate-50"
                />
                {search && (
                  <button onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Parts checklist */}
              <div className="border-2 border-slate-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-slate-50/50">
                {filteredParts.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No parts match "{search}"</p>
                )}
                {filteredParts.map((r, i) => {
                  const c = calcPrice(r, priceType);
                  const isSelected = selected.has(r.SparePart);
                  const isService  = r.SparePart.toLowerCase().includes("service");
                  return (
                    <button key={i} onClick={() => toggle(r.SparePart)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 border-b border-slate-100 last:border-0 text-left transition ${
                        isSelected ? "bg-indigo-50" : "hover:bg-white"
                      }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-4 h-4 rounded-md shrink-0 flex items-center justify-center border-2 transition ${
                          isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs truncate ${isService ? "italic text-slate-400" : isSelected ? "text-slate-800 font-medium" : "text-slate-600"}`}>
                          {r.SparePart}
                        </span>
                      </div>
                      <div className="shrink-0 ml-3 text-right">
                        {c.final != null ? (
                          <div>
                            <span className={`text-xs font-semibold ${isSelected ? "text-indigo-700" : "text-slate-600"}`}>
                              ₹{c.final.toLocaleString("en-IN")}
                            </span>
                            {c.gstPct > 0 && (
                              <span className="block text-[10px] text-slate-400">+{c.gstPct}% GST</span>
                            )}
                            {c.gstIncluded && (
                              <span className="block text-[10px] text-slate-400">GST incl.</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected summary */}
          {hasItems && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Quotation Summary · {product}
              </p>
              <div className="space-y-1.5">
                {lineItems.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button onClick={() => toggle(r.SparePart)}
                        className="text-slate-300 hover:text-red-400 transition shrink-0">
                        <Minus size={11} />
                      </button>
                      <span className="text-slate-700 truncate">{r.SparePart}</span>
                    </div>
                    <span className="shrink-0 ml-3 font-medium text-slate-800">
                      {r.final != null ? `₹${r.final.toLocaleString("en-IN")}` : "N/A"}
                      {r.gstPct > 0 && <span className="text-[10px] text-slate-400 ml-1">(+{r.gstPct}%)</span>}
                    </span>
                  </div>
                ))}
              </div>
              {totalGST > 0 && (
                <div className="flex justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-200">
                  <span>Before GST: ₹{totalBase.toLocaleString("en-IN")}</span>
                  <span>GST: +₹{totalGST.toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Total + Copy */}
        <div className="px-5 pb-5 pt-3 shrink-0 space-y-3 border-t border-slate-100">
          {/* Total box */}
          <div className={`rounded-2xl p-4 ${
            hasItems
              ? priceType === "B2C" ? "bg-indigo-600" : "bg-emerald-600"
              : "bg-slate-100"
          }`}>
            {!product ? (
              <div className="text-center text-slate-400 py-0.5">
                <IndianRupee size={20} className="mx-auto mb-1 opacity-30" />
                <p className="text-xs">Select brand and product</p>
              </div>
            ) : !hasItems ? (
              <p className="text-xs text-slate-400 text-center py-0.5">Tap parts above to add them</p>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70 mb-0.5">
                    {priceType === "B2C" ? "Customer Total" : "Dealer Total"} · {lineItems.length} part{lineItems.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-4xl font-extrabold text-white tracking-tight">
                    ₹{totalFinal.toLocaleString("en-IN")}
                  </p>
                  {totalGST > 0 && (
                    <p className="text-xs text-white/60 mt-0.5">
                      ₹{totalBase.toLocaleString("en-IN")} + ₹{totalGST.toLocaleString("en-IN")} GST
                    </p>
                  )}
                </div>
                <p className="text-xs text-white/40 text-right max-w-28 truncate">{product}</p>
              </div>
            )}
          </div>

          {/* Copy quotation button */}
          {hasItems && (
            <button
              onClick={copyQuotation}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                copied
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied to clipboard!" : "Copy Quotation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CalcSelect({ label, value, onChange, placeholder, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 block mb-1.5">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
          className={`w-full appearance-none px-3 py-2.5 pr-8 text-sm border-2 rounded-xl focus:outline-none transition font-medium ${
            disabled ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
            : value ? "border-indigo-300 bg-white text-slate-800 focus:border-indigo-500"
            : "border-slate-200 bg-white text-slate-500 focus:border-indigo-400"
          }`}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
