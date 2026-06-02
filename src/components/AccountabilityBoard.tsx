"use client";

import { useMemo, useState } from "react";
import { Factory, Truck, Wrench, UserCog } from "lucide-react";
import { BUCKET_OWNER, type ComplaintRow, type Bucket, type TrackingRecord } from "@/lib/types";
import { enrich, isInFactory, type EnrichedRow } from "@/lib/buckets";

interface Props {
  openRows: ComplaintRow[];
  tracking?: Map<string, TrackingRecord>;
}

const BUCKET_META: Record<
  Exclude<Bucket, "Other">,
  { label: string; icon: React.ReactNode; tile: string; badge: string }
> = {
  "Pending Pickup": {
    label: "Pending Pickup",
    icon: <Truck size={18} />,
    tile: "from-purple-500 to-purple-600",
    badge: "bg-purple-100 text-purple-700",
  },
  "Pending Repair": {
    label: "In Factory · Repair",
    icon: <Wrench size={18} />,
    tile: "from-blue-500 to-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
  "Pending Dispatch": {
    label: "Repaired · Dispatch",
    icon: <Truck size={18} />,
    tile: "from-green-500 to-green-600",
    badge: "bg-green-100 text-green-700",
  },
  "Pending Customer": {
    label: "Pending Customer",
    icon: <UserCog size={18} />,
    tile: "from-orange-500 to-orange-600",
    badge: "bg-orange-100 text-orange-700",
  },
};

const ORDER: Exclude<Bucket, "Other">[] = [
  "Pending Pickup",
  "Pending Repair",
  "Pending Dispatch",
  "Pending Customer",
];

export default function AccountabilityBoard({ openRows, tracking }: Props) {
  const [active, setActive] = useState<Bucket | "All">("All");

  const enriched: EnrichedRow[] = useMemo(
    () => openRows.map((r) => enrich(r, tracking?.get(r.sequenceNo))),
    [openRows, tracking]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    enriched.forEach((r) => {
      c[r.bucket] = (c[r.bucket] ?? 0) + 1;
    });
    return c;
  }, [enriched]);

  const inFactoryCount = useMemo(
    () => enriched.filter((r) => isInFactory(r.bucket)).length,
    [enriched]
  );

  const visible = useMemo(() => {
    const list = active === "All" ? enriched : enriched.filter((r) => r.bucket === active);
    // Sort by the most-aged first: days in factory, else days pending
    return [...list].sort((a, b) => {
      const av = a.daysInFactory ?? a.daysPending ?? 0;
      const bv = b.daysInFactory ?? b.daysPending ?? 0;
      return bv - av;
    });
  }, [enriched, active]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Factory size={16} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Accountability Board</h2>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Every open unit, by who owns the next move · {inFactoryCount} currently in factory
      </p>

      {/* Owner tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {ORDER.map((b) => {
          const meta = BUCKET_META[b];
          const isActive = active === b;
          return (
            <button
              key={b}
              onClick={() => setActive(isActive ? "All" : b)}
              className={`text-left bg-gradient-to-br ${meta.tile} rounded-xl p-4 text-white transition ${
                isActive ? "ring-2 ring-offset-2 ring-slate-400 scale-[1.02]" : "opacity-90 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="opacity-90">{meta.icon}</span>
                <span className="text-3xl font-bold">{counts[b] ?? 0}</span>
              </div>
              <p className="text-xs font-medium mt-2">{meta.label}</p>
              <p className="text-xs opacity-80">Owner: {BUCKET_OWNER[b]}</p>
            </button>
          );
        })}
      </div>

      {active !== "All" && (
        <button
          onClick={() => setActive("All")}
          className="text-xs text-indigo-600 hover:underline mb-2"
        >
          ← Show all open units
        </button>
      )}

      {/* Table */}
      <div className="overflow-x-auto table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              {["#", "Product", "Brand", "Bucket", "Owner", "In Factory", "Days Pending", "Status"].map((h) => (
                <th key={h} className="text-left font-medium text-slate-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 50).map((r) => {
              const meta = r.bucket !== "Other" ? BUCKET_META[r.bucket] : null;
              return (
                <tr key={r.sequenceNo} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="py-2 pr-3 text-slate-400 font-mono">{r.sequenceNo}</td>
                  <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{r.productName || "—"}</td>
                  <td className="py-2 pr-3">
                    <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{r.brand}</span>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta?.badge ?? "bg-slate-100 text-slate-600"}`}>
                      {meta?.label ?? "Other"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-medium text-slate-700">{BUCKET_OWNER[r.bucket]}</td>
                  <td className="py-2 pr-3 text-right">
                    {isInFactory(r.bucket) && r.daysInFactory != null ? (
                      <span className={`font-semibold ${r.daysInFactory > 30 ? "text-red-600" : r.daysInFactory > 14 ? "text-orange-500" : "text-slate-600"}`}>
                        {r.daysInFactory}d
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-600">
                    {r.daysPending != null ? `${r.daysPending}d` : "—"}
                  </td>
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{r.actionTaken || "Registered"}</td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">No open units in this bucket</td></tr>
            )}
          </tbody>
        </table>
        {visible.length > 50 && (
          <p className="text-xs text-slate-400 mt-2">Showing top 50 of {visible.length} (most-aged first).</p>
        )}
      </div>
    </div>
  );
}
