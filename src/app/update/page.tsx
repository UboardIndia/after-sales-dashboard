"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, Loader2, Clock, User, Package,
  Phone, Calendar, AlertTriangle,
} from "lucide-react";
import type { ComplaintRow } from "@/lib/types";

const STATUS_OPTIONS = [
  "Complaint Register",
  "Pickup Arranged",
  "Pickup Delay From Cust.",
  "Pickup successful",
  "Received in Okhla",
  "Pending For Repair",
  "Repair Done But payment issue",
  "Dispatch Schduled",
  "Dispatch But Not Delivered",
  "Payment due from Customer",
  "Re-Open Ticket",
  "Close Ticket",
];

const STATUS_COLOR: Record<string, string> = {
  "Complaint Register":            "bg-blue-100 text-blue-700",
  "Pickup Arranged":               "bg-purple-100 text-purple-700",
  "Received in Okhla":             "bg-indigo-100 text-indigo-700",
  "Pending For Repair":            "bg-yellow-100 text-yellow-700",
  "Dispatch But Not Delivered":    "bg-teal-100 text-teal-700",
  "Payment due from Customer":     "bg-red-100 text-red-700",
  "Repair Done But payment issue": "bg-orange-100 text-orange-700",
  "Pickup successful":             "bg-cyan-100 text-cyan-700",
  "Pickup Delay From Cust.":       "bg-pink-100 text-pink-700",
  "Close Ticket":                  "bg-green-100 text-green-700",
};

const TEAM = ["Prachi", "Adil", "Altab", "Asis"];

function UpdatePageInner() {
  const params    = useSearchParams();
  const router    = useRouter();
  const id        = params.get("id") || "";

  const [complaint, setComplaint] = useState<ComplaintRow | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  // Form state
  const [status,   setStatus]   = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [remark,   setRemark]   = useState("");
  const [myName,   setMyName]   = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("prachi_name") || "" : ""
  );

  // History
  const [history,  setHistory]  = useState<{ field: string; value: string; by: string; at: string }[]>([]);

  // Save state
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // Load complaint
  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    fetch("/api/data")
      .then((r) => r.json())
      .then((json) => {
        const found = (json.rows as ComplaintRow[]).find((r) => r.id === id);
        if (!found) { setNotFound(true); }
        else {
          setComplaint(found);
          setStatus(found.actionTaken || "");
          setAssignTo(found.assignedTo || "");
          setRemark(found.dashboardRemark || "");
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Load history
  useEffect(() => {
    if (!id) return;
    fetch(`/api/updates?complaintId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((json) => setHistory(json.updates ?? []))
      .catch(() => {});
  }, [id, saved]);

  function saveName(n: string) {
    setMyName(n);
    if (typeof window !== "undefined") localStorage.setItem("prachi_name", n);
  }

  async function save() {
    if (!myName) { setSaveErr("Please select your name first."); return; }
    setSaving(true); setSaved(false); setSaveErr("");
    try {
      const updates: { field: string; value: string }[] = [];
      if (status   !== (complaint?.actionTaken    || "")) updates.push({ field: "status",      value: status });
      if (assignTo !== (complaint?.assignedTo     || "")) updates.push({ field: "assigned_to", value: assignTo });
      if (remark   !== (complaint?.dashboardRemark|| "")) updates.push({ field: "remark",      value: remark });

      if (updates.length === 0) { setSaveErr("No changes to save."); setSaving(false); return; }

      await Promise.all(
        updates.map((u) =>
          fetch("/api/updates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              complaintId: id,
              field: u.field,
              value: u.value,
              updatedBy: myName,
              customerMobile: complaint?.customerMobile || undefined,
            }),
          })
        )
      );
      setSaved(true);
      // Refresh complaint data
      const json = await fetch("/api/data").then((r) => r.json());
      const fresh = (json.rows as ComplaintRow[]).find((r) => r.id === id);
      if (fresh) setComplaint(fresh);
    } catch {
      setSaveErr("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !complaint) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <AlertTriangle size={40} className="text-orange-400" />
        <p className="text-slate-600 font-medium">Ticket not found</p>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

  const c = complaint;
  const urgencyColor =
    (c.daysPending ?? 0) > 90 ? "text-red-600" :
    (c.daysPending ?? 0) > 30 ? "text-orange-500" : "text-green-600";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sub-header */}
      <div className="max-w-2xl mx-auto px-4 pt-4 flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-700">Update Ticket</span>
        <span className="text-slate-300 text-xs">·</span>
        <span className="text-xs text-slate-400 font-mono">{c.sequenceNo}</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Complaint card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">{c.fiscalYear} · #{c.sequenceNo}</p>
              <h1 className="text-base font-bold text-slate-800">{c.productName || "Unknown Product"}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{c.brand} · {c.platform}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[c.actionTaken] ?? "bg-slate-100 text-slate-600"}`}>
              {c.actionTaken || "Registered"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Detail icon={<User size={12} />}     label="Customer"   value={c.customerName || "—"} />
            <Detail icon={<Phone size={12} />}    label="Mobile"
              value={c.customerMobile
                ? <a href={`tel:${c.customerMobile}`} className="text-indigo-600 hover:underline font-mono">{c.customerMobile}</a>
                : "—"} />
            <Detail icon={<Calendar size={12} />} label="Date"       value={c.complaintDate || "—"} />
            <Detail icon={<Clock size={12} />}    label="Days Open"
              value={<span className={`font-bold ${urgencyColor}`}>{c.daysPending ?? "—"}d</span>} />
            <Detail icon={<Package size={12} />}  label="Issue"      value={c.issueType || "—"} />
            <Detail icon={<User size={12} />}     label="Request By" value={c.requestBy || "—"} />
          </div>

          {c.headRemarks && (
            <div className="text-xs bg-slate-50 rounded-lg px-3 py-2 text-slate-600">
              <span className="font-medium text-slate-500">Head Remarks: </span>{c.headRemarks}
            </div>
          )}
        </div>

        {/* Update form */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-800">Make Update</h2>

          {/* Who is updating */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Updated by</label>
            <div className="flex gap-2 flex-wrap">
              {TEAM.map((n) => (
                <button
                  key={n}
                  onClick={() => saveName(n)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                    myName === n
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">— no change —</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {status === "Close Ticket" && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <CheckCircle2 size={11} /> WhatsApp message will be sent to customer automatically.
              </p>
            )}
          </div>

          {/* Assign to */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Assign to</label>
            <div className="flex gap-2 flex-wrap">
              {["—", ...TEAM].map((n) => (
                <button
                  key={n}
                  onClick={() => setAssignTo(n === "—" ? "" : n)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    (assignTo || "") === (n === "—" ? "" : n)
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Remark */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Remark</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder="Add a note about this update…"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Error / Success */}
          {saveErr && <p className="text-xs text-red-500">{saveErr}</p>}
          {saved && (
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <CheckCircle2 size={16} /> Saved successfully!
            </div>
          )}

          {/* Save button */}
          <button
            onClick={save}
            disabled={saving || !myName}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Save Update"}
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Update History</h2>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium text-slate-700 capitalize">{h.field.replace("_", " ")}</span>
                    <span className="text-slate-400"> → </span>
                    <span className="text-slate-800">{h.value}</span>
                  </div>
                  <div className="text-slate-400 text-right shrink-0">
                    <div>{h.by}</div>
                    <div>{timeAgo(h.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-slate-400 text-[10px] uppercase tracking-wide">{label}</p>
        <p className="text-slate-700 font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}

export default function UpdatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    }>
      <UpdatePageInner />
    </Suspense>
  );
}
