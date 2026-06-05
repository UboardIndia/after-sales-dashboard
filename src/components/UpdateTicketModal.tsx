"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";

/** Exact status vocabulary already used in the sheets — keeps bucket logic working. */
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

const TEAM = ["Prachi", "Adil", "Altab", "Asis"];

export default function UpdateTicketModal({
  row,
  onClose,
  onSaved,
}: {
  row: ComplaintRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [remark, setRemark] = useState("");
  const [me, setMe] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remember who's using this browser
  useEffect(() => {
    const saved = localStorage.getItem("team_member");
    if (saved) setMe(saved);
  }, []);

  async function handleSave() {
    setError(null);
    if (!me) { setError("Select your name first."); return; }
    const updates: { field: string; value: string }[] = [];
    if (status) updates.push({ field: "status", value: status });
    if (assignTo) updates.push({ field: "assigned_to", value: assignTo });
    if (remark.trim()) updates.push({ field: "remark", value: remark.trim() });
    if (updates.length === 0) { setError("Nothing to save — change at least one field."); return; }

    setSaving(true);
    try {
      localStorage.setItem("team_member", me);
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId: row.id, updates, updatedBy: me }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Update #{row.sequenceNo} — {row.customerName || "Unknown"}
            </h3>
            <p className="text-xs text-slate-400">
              {row.productName} · {row.brand} · currently: {row.actionTaken || "—"}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <Field label="New status (optional)">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— no change —</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Assign to (optional)">
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— no change —</option>
              {TEAM.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Remark (optional)">
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              placeholder="e.g. Customer not reachable, retry tomorrow"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </Field>

          <Field label="Your name (recorded with the update)">
            <select value={me} onChange={(e) => setMe(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— select —</option>
              {TEAM.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? "Saving…" : "Save Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
