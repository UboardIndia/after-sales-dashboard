"use client";

import { CheckCircle2, Clock, Layers } from "lucide-react";

interface Props {
  total: number;
  open: number;
  closed: number;
  closureRate: number;
}

export default function HeroStats({ total, open, closed, closureRate }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Hero: % Closed */}
      <div className="lg:col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -right-6 -top-6 opacity-10">
          <CheckCircle2 size={140} />
        </div>
        <p className="text-indigo-100 text-sm font-medium">Complaints Closed</p>
        <div className="flex items-end gap-2 mt-2">
          <span className="text-6xl font-extrabold leading-none">{closureRate}</span>
          <span className="text-3xl font-bold text-indigo-200 mb-1">%</span>
        </div>
        <div className="mt-4 h-2 bg-indigo-800/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${closureRate}%` }}
          />
        </div>
        <p className="text-indigo-100 text-xs mt-3">
          {closed.toLocaleString()} of {total.toLocaleString()} complaints resolved
        </p>
      </div>

      {/* Supporting numbers */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatBox
          icon={<Layers size={18} />}
          label="Total Complaints"
          value={total}
          accent="text-slate-700 bg-slate-100"
        />
        <StatBox
          icon={<Clock size={18} />}
          label="Still Open"
          value={open}
          sub={`${total > 0 ? Math.round((open / total) * 100) : 0}% of total`}
          accent="text-orange-600 bg-orange-100"
          big
        />
        <StatBox
          icon={<CheckCircle2 size={18} />}
          label="Closed Tickets"
          value={closed}
          accent="text-green-600 bg-green-100"
        />
      </div>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  sub,
  accent,
  big,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  accent: string;
  big?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border ${big ? "border-orange-200" : "border-slate-200"} p-5 flex flex-col justify-between`}>
      <div className={`inline-flex w-9 h-9 rounded-lg items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div className="mt-4">
        <p className="text-4xl font-bold text-slate-900">{value.toLocaleString()}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
