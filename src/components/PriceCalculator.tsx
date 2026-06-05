"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Calculator, IndianRupee, ChevronDown } from "lucide-react";
import type { SparePartsData, PriceListRow } from "@/lib/spareparts-types";

interface Props {
  open: boolean;
  onClose: () => void;
}

function parseNum(s: string): number | null {
  if (!s || s.toLowerCase() === "na" || s === "") return null;
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

function parseGST(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

export default function PriceCalculator({ open, onClose }: Props) {
  const [data, setData] = useState<SparePartsData | null>(null);
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [sparePart, setSparePart] = useState("");
  const [priceType, setPriceType] = useState<"B2C" | "B2B">("B2C");
  const [gstMode, setGstMode] = useState<"included" | "add">("included");

  useEffect(() => {
    if (open && !data) {
      fetch("/api/spareparts").then(r => r.json()).then(setData);
    }
  }, [open, data]);

  // Reset downstream on parent change
  useEffect(() => { setProduct(""); setSparePart(""); }, [brand]);
  useEffect(() => { setSparePart(""); }, [product]);

  const brands = useMemo(() => {
    if (!data) return [];
    const s = new Set(
      data.priceList
        .filter(r => !r.Product.startsWith("REVIEW"))
        .map(r => {
          const pm = data.productMaster.find(p => p.Product === r.Product);
          return pm?.Brand ?? "";
        }).filter(Boolean)
    );
    return Array.from(s).sort();
  }, [data]);

  const products = useMemo(() => {
    if (!data || !brand) return [];
    const s = new Set(
      data.priceList
        .filter(r => {
          if (r.Product.startsWith("REVIEW")) return false;
          const pm = data.productMaster.find(p => p.Product === r.Product);
          return pm?.Brand === brand;
        })
        .map(r => r.Product)
    );
    return Array.from(s).sort();
  }, [data, brand]);

  const parts = useMemo(() => {
    if (!data || !product) return [];
    return data.priceList
      .filter(r => r.Product === product && (r.MaxB2C !== "" || r.MinB2B !== ""))
      .sort((a, b) => a.SparePart.localeCompare(b.SparePart));
  }, [data, product]);

  const selectedRow: PriceListRow | null = useMemo(
    () => parts.find(r => r.SparePart === sparePart) ?? null,
    [parts, sparePart]
  );

  const result = useMemo(() => {
    if (!selectedRow) return null;
    const rawStr = priceType === "B2C" ? selectedRow.MaxB2C : selectedRow.MinB2B;
    const base = parseNum(rawStr);
    const gstPct = parseGST(selectedRow.GST);

    if (base == null) return { unavailable: true, priceType, rawStr };

    let final: number;
    let gstAmount: number;

    if (gstMode === "add") {
      gstAmount = Math.round(base * gstPct / 100);
      final = base + gstAmount;
    } else {
      // price as-is (already includes GST or no GST applicable)
      final = base;
      gstAmount = gstPct > 0 ? Math.round(base - base / (1 + gstPct / 100)) : 0;
    }

    return {
      unavailable: false,
      base,
      gstPct,
      gstAmount,
      final,
      priceType,
      label: priceType === "B2C" ? "Customer Price (B2C)" : "Dealer / In-warranty Price (B2B)",
    };
  }, [selectedRow, priceType, gstMode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Calculator size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Price Calculator</h2>
              <p className="text-[11px] text-slate-400">Select part → get customer price</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">

          {/* Brand */}
          <CalcSelect
            label="Brand"
            value={brand}
            onChange={setBrand}
            placeholder="Select brand…"
            options={brands.map(b => ({ value: b, label: b }))}
          />

          {/* Product */}
          <CalcSelect
            label="Product"
            value={product}
            onChange={setProduct}
            placeholder={brand ? "Select product…" : "Select brand first"}
            options={products.map(p => ({ value: p, label: p }))}
            disabled={!brand}
          />

          {/* Spare Part */}
          <CalcSelect
            label="Spare Part"
            value={sparePart}
            onChange={setSparePart}
            placeholder={product ? "Select spare part…" : "Select product first"}
            options={parts.map(r => ({ value: r.SparePart, label: r.SparePart }))}
            disabled={!product}
          />

          {/* B2B / B2C toggle */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Customer Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPriceType("B2C")}
                className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition ${
                  priceType === "B2C"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 text-slate-500 hover:border-indigo-300"
                }`}
              >
                B2C — Customer
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">Walk-in / end user</span>
              </button>
              <button
                onClick={() => setPriceType("B2B")}
                className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition ${
                  priceType === "B2B"
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-200 text-slate-500 hover:border-green-300"
                }`}
              >
                B2B — Dealer
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">Hamleys / partner</span>
              </button>
            </div>
          </div>

          {/* GST toggle */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">GST</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setGstMode("included")}
                className={`py-2 rounded-xl text-xs font-semibold border-2 transition ${
                  gstMode === "included"
                    ? "border-slate-700 bg-slate-700 text-white"
                    : "border-slate-200 text-slate-500 hover:border-slate-400"
                }`}
              >
                GST Included
                <span className="block text-[10px] font-normal opacity-70">Price as-is</span>
              </button>
              <button
                onClick={() => setGstMode("add")}
                className={`py-2 rounded-xl text-xs font-semibold border-2 transition ${
                  gstMode === "add"
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-slate-200 text-slate-500 hover:border-orange-300"
                }`}
              >
                + Add GST
                <span className="block text-[10px] font-normal opacity-70">Add on top</span>
              </button>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className={`mx-5 mb-5 rounded-2xl p-4 transition-all ${
          result && !result.unavailable
            ? priceType === "B2C" ? "bg-indigo-600" : "bg-green-600"
            : "bg-slate-100"
        }`}>
          {!selectedRow ? (
            <div className="text-center text-slate-400 py-2">
              <IndianRupee size={28} className="mx-auto mb-1 opacity-30" />
              <p className="text-xs">Select all options above</p>
            </div>
          ) : result?.unavailable ? (
            <div className="text-center py-2">
              <p className="text-sm font-semibold text-slate-600">Price not available</p>
              <p className="text-xs text-slate-400 mt-1">
                {result.priceType === "B2C" ? "B2C (Max)" : "B2B (Min)"} price not set for this part
              </p>
            </div>
          ) : result && !result.unavailable && result.final != null ? (
            <div>
              <p className="text-xs text-white/70 mb-1">{result.label}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-extrabold text-white">
                    ₹{result.final.toLocaleString("en-IN")}
                  </p>
                  {gstMode === "add" && result.gstPct > 0 && result.base != null && (
                    <p className="text-xs text-white/70 mt-1">
                      ₹{result.base.toLocaleString("en-IN")} + GST {result.gstPct}% (₹{result.gstAmount?.toLocaleString("en-IN")})
                    </p>
                  )}
                  {gstMode === "included" && result.gstPct > 0 && (
                    <p className="text-xs text-white/70 mt-1">
                      GST {result.gstPct}% included · ₹{result.gstAmount?.toLocaleString("en-IN")} tax component
                    </p>
                  )}
                  {result.gstPct === 0 && (
                    <p className="text-xs text-white/70 mt-1">No GST applicable</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/60">{sparePart}</p>
                  <p className="text-xs text-white/50">{product}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CalcSelect({ label, value, onChange, placeholder, options, disabled }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 block mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none px-3 py-2.5 pr-8 text-sm border-2 rounded-xl focus:outline-none transition ${
            disabled
              ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
              : value
              ? "border-indigo-300 bg-white text-slate-800 focus:border-indigo-500"
              : "border-slate-200 bg-white text-slate-400 focus:border-indigo-400"
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
