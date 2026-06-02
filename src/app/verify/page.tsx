"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Bot, CheckCircle2, Link2, XCircle, Phone, Package,
  MessageSquareText, Clock, AlertTriangle, Undo2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* MOCK DATA — preview only. Real version reads the bot sheet +        */
/* suggests matches from the helpdesk sheets by mobile number.         */
/* ------------------------------------------------------------------ */

interface BotEntry {
  botId: string;
  timestamp: string;
  customerName: string;
  mobile: string;
  brand: string;
  product: string;
  issue: string;
  /** suggested helpdesk matches (auto-found by mobile / name) */
  matches: { id: string; seq: string; date: string; product: string; status: string; matchedOn: string }[];
}

const MOCK_ENTRIES: BotEntry[] = [
  {
    botId: "BOT-0041",
    timestamp: "02/06/2026 14:32",
    customerName: "Ramesh Verma",
    mobile: "9811045672",
    brand: "UBOARD",
    product: "360 Drifter",
    issue: "Scooter not charging, red light blinking continuously",
    matches: [
      { id: "FY 2026-27::204", seq: "204", date: "28/05/2026", product: "360 Drifter", status: "Pickup Arranged", matchedOn: "Same mobile number" },
    ],
  },
  {
    botId: "BOT-0042",
    timestamp: "02/06/2026 15:10",
    customerName: "Sunita Devi",
    mobile: "9990812345",
    brand: "TYGATEC",
    product: "Rc Car",
    issue: "Remote not pairing after battery change",
    matches: [],
  },
  {
    botId: "BOT-0043",
    timestamp: "02/06/2026 16:05",
    customerName: "Vikram S",
    mobile: "8800943210",
    brand: "UBOARD",
    product: "X7",
    issue: "Handle loose, making noise while riding",
    matches: [
      { id: "FY 2026-27::217", seq: "217", date: "01/06/2026", product: "Infinity", status: "Complaint Register", matchedOn: "Similar name + recent date" },
      { id: "FY 2026-27::198", seq: "198", date: "25/05/2026", product: "X7", status: "Close Ticket", matchedOn: "Same mobile number" },
    ],
  },
  {
    botId: "BOT-0044",
    timestamp: "02/06/2026 16:48",
    customerName: ".",
    mobile: "7012398765",
    brand: "",
    product: "test",
    issue: "asdfgh",
    matches: [],
  },
];

type Decision = { decision: "new" | "linked" | "rejected"; linkedTo?: string };

export default function VerifyPage() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [linkPicker, setLinkPicker] = useState<string | null>(null); // botId with link picker open

  const pending = MOCK_ENTRIES.filter((e) => !decisions[e.botId]);
  const done = MOCK_ENTRIES.filter((e) => decisions[e.botId]);

  function decide(botId: string, d: Decision) {
    setDecisions((prev) => ({ ...prev, [botId]: d }));
    setLinkPicker(null);
  }

  function undo(botId: string) {
    setDecisions((prev) => {
      const next = { ...prev };
      delete next[botId];
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
              <ArrowLeft size={13} />
              Dashboard
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bot size={18} className="text-indigo-600" />
                Bot Complaint Verification
              </h1>
              <p className="text-xs text-slate-400">Prachi reviews every bot entry before it becomes a complaint</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
            {pending.length} pending
          </span>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Preview banner */}
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle size={15} />
          <b>PREVIEW</b> — sample data. Will connect to Alok&apos;s bot sheet when it&apos;s ready. Decisions here are not saved.
        </div>

        {/* Pending queue */}
        {pending.map((e) => (
          <div key={e.botId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Entry header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-slate-500">{e.botId}</span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={11} /> {e.timestamp}
                </span>
              </div>
              {e.matches.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  ⚠ {e.matches.length} possible duplicate{e.matches.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Entry body */}
            <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-slate-800">{e.customerName || "—"}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone size={11} /> {e.mobile}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Package size={11} /> {e.product} {e.brand && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{e.brand}</span>}
                </p>
              </div>
              <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5">
                <MessageSquareText size={12} className="mt-0.5 shrink-0 text-slate-400" />
                <span>{e.issue}</span>
              </div>
            </div>

            {/* Suggested matches */}
            {e.matches.length > 0 && (
              <div className="px-4 pb-3">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Possible existing complaints</p>
                <div className="space-y-1.5">
                  {e.matches.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-slate-700">#{m.seq}</span>
                        <span className="text-slate-500">{m.date}</span>
                        <span className="text-slate-600">{m.product}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white text-slate-500">{m.status}</span>
                      </div>
                      <span className="text-[10px] text-amber-600 font-medium">{m.matchedOn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-100">
              <button
                onClick={() => decide(e.botId, { decision: "new" })}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
              >
                <CheckCircle2 size={13} /> Approve as New Complaint
              </button>
              {e.matches.length > 0 && (
                linkPicker === e.botId ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    Link to:
                    {e.matches.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => decide(e.botId, { decision: "linked", linkedTo: m.seq })}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-mono font-medium"
                      >
                        #{m.seq}
                      </button>
                    ))}
                    <button onClick={() => setLinkPicker(null)} className="text-slate-400 hover:text-slate-600 px-1">cancel</button>
                  </span>
                ) : (
                  <button
                    onClick={() => setLinkPicker(e.botId)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium"
                  >
                    <Link2 size={13} /> Link to Existing
                  </button>
                )
              )}
              <button
                onClick={() => decide(e.botId, { decision: "rejected" })}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium ml-auto"
              >
                <XCircle size={13} /> Reject (spam / invalid)
              </button>
            </div>
          </div>
        ))}

        {pending.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            ✅ Queue clear — no bot entries waiting for verification.
          </div>
        )}

        {/* Decided entries */}
        {done.length > 0 && (
          <div className="pt-2">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Decided just now</p>
            <div className="space-y-1.5">
              {done.map((e) => {
                const d = decisions[e.botId];
                return (
                  <div key={e.botId} className="flex items-center justify-between text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 opacity-80">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500">{e.botId}</span>
                      <span className="text-slate-600">{e.customerName}</span>
                      {d.decision === "new" && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">✓ New complaint</span>}
                      {d.decision === "linked" && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">🔗 Linked to #{d.linkedTo}</span>}
                      {d.decision === "rejected" && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600">✕ Rejected</span>}
                    </div>
                    <button onClick={() => undo(e.botId)} className="flex items-center gap-1 text-slate-400 hover:text-indigo-600">
                      <Undo2 size={11} /> undo
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
