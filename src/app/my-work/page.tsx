"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Phone, AlertTriangle, CheckCircle2, Clock, User } from "lucide-react";
import type { ComplaintRow, ApiResponse } from "@/lib/types";
import { deriveBucket } from "@/lib/buckets";
import { BUCKET_OWNER } from "@/lib/types";
import UpdateTicketModal from "@/components/UpdateTicketModal";
import NotificationBell from "@/components/NotificationBell";

const TEAM = ["Prachi", "Adil", "Altab", "Asis"];

const STATUS_BADGE: Record<string, string> = {
  "Complaint Register":            "bg-blue-100 text-blue-700",
  "Pickup Arranged":               "bg-purple-100 text-purple-700",
  "Received in Okhla":             "bg-indigo-100 text-indigo-700",
  "Pending For Repair":            "bg-yellow-100 text-yellow-700",
  "Dispatch But Not Delivered":    "bg-teal-100 text-teal-700",
  "Payment due from Customer":     "bg-red-100 text-red-700",
  "Repair Done But payment issue": "bg-orange-100 text-orange-700",
  "Pickup successful":             "bg-cyan-100 text-cyan-700",
  "Pickup Delay From Cust.":       "bg-pink-100 text-pink-700",
};

function urgency(r: ComplaintRow): "critical" | "warning" | "ok" {
  const d = r.daysPending ?? 0;
  if (d > 90) return "critical";
  if (d > 30) return "warning";
  return "ok";
}

function UrgencyDot({ level }: { level: "critical" | "warning" | "ok" }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
      level === "critical" ? "bg-red-500" :
      level === "warning"  ? "bg-amber-400" :
                             "bg-emerald-400"
    }`} />
  );
}

export default function MyWorkPage() {
  const [me, setMe] = useState("");
  const [data, setData] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ComplaintRow | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("team_member");
    if (saved) setMe(saved);
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error("Failed to load");
      const json: ApiResponse = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.rows);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function handleMeChange(name: string) {
    setMe(name);
    if (name) localStorage.setItem("team_member", name);
  }

  // Rows that belong to this agent:
  // 1. Explicitly assigned to them via Supabase overlay
  // 2. Their accountability bucket (deriveBucket matches their owned buckets)
  const myRows = useMemo(() => {
    if (!me) return [];
    const open = data.filter(r => r.isOpen);

    // Buckets owned by this person
    const myBuckets = Object.entries(BUCKET_OWNER)
      .filter(([, owner]) => owner === me)
      .map(([bucket]) => bucket);

    return open.filter(r => {
      // Explicitly assigned
      if (r.assignedTo === me) return true;
      // Their accountability bucket
      const bucket = deriveBucket(r);
      if (myBuckets.includes(bucket)) return true;
      return false;
    }).sort((a, b) => (b.daysPending ?? 0) - (a.daysPending ?? 0));
  }, [data, me]);

  // Group by urgency
  const critical = myRows.filter(r => urgency(r) === "critical");
  const warning  = myRows.filter(r => urgency(r) === "warning");
  const ok       = myRows.filter(r => urgency(r) === "ok");

  // Stats
  const stats = useMemo(() => ({
    total: myRows.length,
    critical: critical.length,
    warning: warning.length,
    ok: ok.length,
    noStatus: myRows.filter(r => !r.actionTaken?.trim()).length,
  }), [myRows, critical, warning, ok]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-indigo-500" size={28} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition shrink-0">
            <ArrowLeft size={13} /> Dashboard
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User size={18} className="text-indigo-600" />
              My Work
            </h1>
            <p className="text-xs text-slate-400">Your assigned + accountability-bucket tickets</p>
          </div>
          {/* Who am I */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Viewing as:</span>
            <select
              value={me}
              onChange={e => handleMeChange(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">— select —</option>
              {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <NotificationBell me={me} />
            <button
              onClick={() => { setRefreshing(true); fetchData(); }}
              disabled={refreshing}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition disabled:opacity-50"
            >
              <Loader2 size={13} className={refreshing ? "animate-spin" : "hidden"} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-5 space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {!me ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <User size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Select your name above to see your work queue.</p>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total on my plate" value={stats.total} color="indigo" />
              <StatCard label="Critical (90+ days)" value={stats.critical} color="red" />
              <StatCard label="Aging (30-90 days)" value={stats.warning} color="amber" />
              <StatCard label="On track (<30 days)" value={stats.ok} color="emerald" />
            </div>

            {stats.noStatus > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">
                <AlertTriangle size={14} className="shrink-0" />
                <span><b>{stats.noStatus} tickets</b> have no status — please update them.</span>
              </div>
            )}

            {myRows.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3" />
                <p className="text-slate-500 font-medium">Nothing on your plate right now. Nice!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {critical.length > 0 && (
                  <WorkGroup
                    label="🔴 Critical — Over 90 days"
                    rows={critical}
                    onEdit={setEditing}
                    color="red"
                  />
                )}
                {warning.length > 0 && (
                  <WorkGroup
                    label="🟡 Aging — 30 to 90 days"
                    rows={warning}
                    onEdit={setEditing}
                    color="amber"
                  />
                )}
                {ok.length > 0 && (
                  <WorkGroup
                    label="🟢 On track — Under 30 days"
                    rows={ok}
                    onEdit={setEditing}
                    color="emerald"
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {editing && (
        <UpdateTicketModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setRefreshing(true); fetchData(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const bg: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    red:    "bg-red-50 border-red-100 text-red-700",
    amber:  "bg-amber-50 border-amber-100 text-amber-700",
    emerald:"bg-emerald-50 border-emerald-100 text-emerald-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${bg[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </div>
  );
}

function WorkGroup({
  label, rows, onEdit, color,
}: {
  label: string;
  rows: ComplaintRow[];
  onEdit: (r: ComplaintRow) => void;
  color: string;
}) {
  const border: Record<string, string> = {
    red:    "border-red-200",
    amber:  "border-amber-200",
    emerald:"border-slate-200",
  };
  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${border[color] ?? "border-slate-200"}`}>
      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-xs text-slate-400">{rows.length} ticket{rows.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map(r => {
          const u = urgency(r);
          const bucket = deriveBucket(r);
          const owner = BUCKET_OWNER[bucket];
          const blank = !r.actionTaken?.trim();
          return (
            <div key={r.id} className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition ${blank ? "bg-red-50" : ""}`}>
              <UrgencyDot level={u} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-bold text-indigo-600">#{r.sequenceNo}</span>
                  <span className="text-xs text-slate-400">{r.complaintDate}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{r.brand}</span>
                  {r.assignedTo && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                      → {r.assignedTo}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto font-medium">
                    Bucket: {bucket} ({owner})
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-slate-800 truncate">{r.customerName || "—"}</span>
                  {r.customerMobile && (
                    <a
                      href={`tel:${r.customerMobile}`}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-mono"
                    >
                      <Phone size={11} /> {r.customerMobile}
                    </a>
                  )}
                  <span className="text-xs text-slate-500">{r.productName}</span>
                  <span className="text-xs text-slate-400 italic truncate max-w-xs">{r.issueType}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {blank ? (
                    <span className="text-xs text-red-500 font-semibold flex items-center gap-1">
                      <AlertTriangle size={11} /> No status — update now
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[r.actionTaken] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.actionTaken}
                    </span>
                  )}
                  {r.daysPending != null && (
                    <span className={`text-xs font-bold flex items-center gap-1 ${
                      u === "critical" ? "text-red-600" : u === "warning" ? "text-amber-600" : "text-slate-500"
                    }`}>
                      <Clock size={11} /> {r.daysPending}d pending
                    </span>
                  )}
                  {r.dashboardRemark && (
                    <span className="text-xs text-slate-400 italic">"{r.dashboardRemark}"</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onEdit(r)}
                className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition"
              >
                <Pencil size={12} /> Update
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
