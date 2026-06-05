"use client";

import { useMemo, useState } from "react";
import { Factory, Truck, Wrench, UserCog } from "lucide-react";
import { BUCKET_OWNER, type ComplaintRow, type Bucket, type TrackingRecord } from "@/lib/types";
import { enrich, isInFactory, type EnrichedRow } from "@/lib/buckets";

interface Props {
  openRows: ComplaintRow[];
  tracking?: Map<string, TrackingRecord>;
  onSelect: (label: string, rows: ComplaintRow[], color: string) => void;
  selectedLabel: string | null;
}

const BUCKET_META: Record<
  Exclude<Bucket, "Other">,
  { label: string; icon: React.ReactNode; tile: string; color: string }
> = {
  "Pending Pickup":   { label: "Pending Pickup",    icon: <Truck size={18} />,   tile: "from-purple-500 to-purple-600", color: "#9333EA" },
  "Pending Repair":   { label: "In Factory · Repair",icon: <Wrench size={18} />, tile: "from-blue-500 to-blue-600",    color: "#2563EB" },
  "Pending Dispatch": { label: "Repaired · Dispatch",icon: <Truck size={18} />,   tile: "from-green-500 to-green-600",  color: "#16A34A" },
  "Pending Customer": { label: "Pending Customer",   icon: <UserCog size={18} />, tile: "from-orange-500 to-orange-600",color: "#EA580C" },
};

const ORDER: Exclude<Bucket, "Other">[] = [
  "Pending Pickup", "Pending Repair", "Pending Dispatch", "Pending Customer",
];

export default function AccountabilityBoard({ openRows, tracking, onSelect, selectedLabel }: Props) {
  const enriched: EnrichedRow[] = useMemo(
    () => openRows.map((r) => enrich(r, tracking?.get(r.sequenceNo))),
    [openRows, tracking]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    enriched.forEach((r) => { c[r.bucket] = (c[r.bucket] ?? 0) + 1; });
    return c;
  }, [enriched]);

  const inFactoryCount = useMemo(
    () => enriched.filter((r) => isInFactory(r.bucket)).length,
    [enriched]
  );

  function handleClick(b: Exclude<Bucket, "Other">) {
    const meta = BUCKET_META[b];
    const list = enriched
      .filter((r) => r.bucket === b)
      .sort((a, b2) => {
        const av = a.daysInFactory ?? a.daysPending ?? 0;
        const bv = b2.daysInFactory ?? b2.daysPending ?? 0;
        return bv - av;
      });
    const label = meta.label;
    if (selectedLabel === label) {
      onSelect("", [], "");
    } else {
      onSelect(label, list as ComplaintRow[], meta.color);
    }
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {ORDER.map((b) => {
        const meta = BUCKET_META[b];
        const isActive = selectedLabel === meta.label;
        return (
          <button
            key={b}
            onClick={() => handleClick(b)}
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
  );
}
