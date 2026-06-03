"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Bot, CheckCircle2, Link2, XCircle,
  Phone, Package, MessageSquareText, Clock, AlertTriangle,
  Undo2, Loader2, PhoneOff,
} from "lucide-react";
import type { ComplaintRow, ApiResponse } from "@/lib/types";

interface BotEntry {
  botId: string;
  timestamp: string;
  brand: string;
  product: string;
  issue: string;
  warranty: string;
  platform: string;
  mobile: string;
  mobileRaw: string;
  customerName: string;
  hasMobile: boolean;
  month: string;
}

interface Match {
  id: string;
  seq: string;
  date: string;
  product: string;
  status: string;
  matchedOn: string;
}

type Decision = { decision: "new" | "linked" | "rejected"; linkedTo?: string };

function findMatches(entry: BotEntry, rows: ComplaintRow[]): Match[] {
  const matches: Match[] = [];
  const seen = new Set<string>();

  rows.forEach((r) => {
    if (seen.has(r.id)) return;
    let matchedOn = "";

    // Strong: same cleaned mobile
    if (entry.hasMobile && r.customerMobile) {
      const rMobile = r.customerMobile.replace(/[\s\-().+]/g, "").replace(/^91/, "");
      if (rMobile === entry.mobile) matchedOn = "Same mobile number";
    }

    // Medium: similar name + open + recent
    if (!matchedOn && entry.customerName && r.customerName) {
      const a = entry.customerName.toLowerCase().trim();
      const b = r.customerName.toLowerCase().trim();
      if (a.length > 2 && b.length > 2 && (a.includes(b.split(" ")[0]) || b.includes(a.split(" ")[0]))) {
        matchedOn = "Similar customer name";
      }
    }

    if (matchedOn) {
      seen.add(r.id);
      matches.push({
        id: r.id,
        seq: r.sequenceNo,
        date: r.complaintDate,
        product: r.productName,
        status: r.actionTaken || "Complaint Register",
        matchedOn,
      });
    }
  });

  return matches.slice(0, 3);
}

export default function VerifyPage() {
  const [botEntries, setBotEntries] = useState<BotEntry[]>([]);
  const [helpdeskRows, setHelpdeskRows] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [linkPicker, setLinkPicker] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "duplicates" | "no-mobile">("newest");

  useEffect(() => {
    async function load() {
      try {
        const [botRes, dataRes] = await Promise.all([
          fetch("/api/bot"),
          fetch("/api/data"),
        ]);
        const botJson = await botRes.json();
        const dataJson: ApiResponse = await dataRes.json();
        setBotEntries(botJson.entries ?? []);
        setHelpdeskRows(dataJson.rows ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Only show entries not yet decided in Supabase (for now: all unverified)
  function parseTs(ts: string): number {
    const [day, month, year] = ts.split(/[/\s]/);
    return new Date(`${year}-${month}-${day}`).getTime() || 0;
  }

  const pending = botEntries
    .filter((e) => !decisions[e.botId])
    .sort((a, b) => {
      if (sortBy === "newest") {
        const dateDiff = parseTs(b.timestamp) - parseTs(a.timestamp);
        if (dateDiff !== 0) return dateDiff;
        return parseInt(b.botId.replace(/\D/g, "")) - parseInt(a.botId.replace(/\D/g, ""));
      }
      if (sortBy === "oldest") {
        const dateDiff = parseTs(a.timestamp) - parseTs(b.timestamp);
        if (dateDiff !== 0) return dateDiff;
        return parseInt(a.botId.replace(/\D/g, "")) - parseInt(b.botId.replace(/\D/g, ""));
      }
      if (sortBy === "duplicates") {
        const aM = findMatches(a, helpdeskRows).length;
        const bM = findMatches(b, helpdeskRows).length;
        return bM - aM;
      }
      if (sortBy === "no-mobile") return (a.hasMobile ? 1 : 0) - (b.hasMobile ? 1 : 0);
      return 0;
    });
  const done    = botEntries.filter((e) =>  decisions[e.botId]);
  const noMobileCount = botEntries.filter((e) => !e.hasMobile).length;

  function decide(botId: string, d: Decision) {
    setDecisions((prev) => ({ ...prev, [botId]: d }));
    setLinkPicker(null);
  }

  function undo(botId: string) {
    setDecisions((prev) => { const n = { ...prev }; delete n[botId]; return n; });
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="animate-spin mx-auto mb-3 text-indigo-600" size={28} />
        <p className="text-sm text-slate-500">Loading bot complaints…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
              <ArrowLeft size={13} /> Dashboard
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bot size={18} className="text-indigo-600" />
                Bot Complaint Verification
              </h1>
              <p className="text-xs text-slate-400">
                {botEntries.length} bot entries · Prachi reviews before counting as complaints
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
            {pending.length} pending
          </span>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Data quality warning */}
        {noMobileCount > 0 && (
          <div className="flex items-start gap-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-4 py-3 text-sm">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <div>
              <b>{noMobileCount} older entries have no mobile number</b> — duplicate detection won&apos;t work for them. New bot entries will include name &amp; number automatically.
            </div>
          </div>
        )}

        {/* Sort controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Sort by:</span>
          {(["newest", "oldest", "duplicates", "no-mobile"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                sortBy === s
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === "newest" && "Newest first"}
              {s === "oldest" && "Oldest first"}
              {s === "duplicates" && "⚠ Duplicates first"}
              {s === "no-mobile" && "📵 No mobile first"}
            </button>
          ))}
        </div>

        {/* Pending queue */}
        {pending.map((e) => {
          const matches = findMatches(e, helpdeskRows);
          return (
            <div key={e.botId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Entry header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-indigo-600">{e.botId}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={11} /> {e.timestamp}
                  </span>
                  {e.brand && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      {e.brand}
                    </span>
                  )}
                </div>
                {matches.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                    ⚠ {matches.length} possible duplicate{matches.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Entry body */}
              <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-800">{e.customerName || "—"}</p>
                  <p className="flex items-center gap-1.5 text-xs">
                    {e.hasMobile ? (
                      <><Phone size={11} className="text-slate-400" /><span className="text-slate-600 font-mono">{e.mobile}</span></>
                    ) : (
                      <><PhoneOff size={11} className="text-red-400" /><span className="text-red-500 font-medium">No valid number ({e.mobileRaw || "blank"})</span></>
                    )}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Package size={11} />
                    {e.product || "Product not specified"}
                    {e.warranty && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">{e.warranty}</span>}
                  </p>
                  {e.platform && (
                    <p className="text-xs text-slate-400">Platform: {e.platform}</p>
                  )}
                </div>
                <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5">
                  <MessageSquareText size={12} className="mt-0.5 shrink-0 text-slate-400" />
                  <span>{e.issue || "No issue description"}</span>
                </div>
              </div>

              {/* Suggested matches */}
              {matches.length > 0 && (
                <div className="px-4 pb-3">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Possible existing helpdesk complaints
                  </p>
                  <div className="space-y-1.5">
                    {matches.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono font-semibold text-slate-700">#{m.seq}</span>
                          <span className="text-slate-500">{m.date}</span>
                          <span className="text-slate-600">{m.product}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white text-slate-500">{m.status}</span>
                        </div>
                        <span className="text-[10px] text-amber-600 font-medium shrink-0 ml-2">{m.matchedOn}</span>
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
                {matches.length > 0 && (
                  linkPicker === e.botId ? (
                    <span className="flex items-center gap-1.5 text-xs flex-wrap">
                      <span className="text-slate-500">Link to:</span>
                      {matches.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => decide(e.botId, { decision: "linked", linkedTo: m.seq })}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-mono font-medium text-xs"
                        >
                          #{m.seq}
                        </button>
                      ))}
                      <button onClick={() => setLinkPicker(null)} className="text-slate-400 hover:text-slate-600 px-1 text-xs">cancel</button>
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
                  <XCircle size={13} /> Reject
                </button>
              </div>
            </div>
          );
        })}

        {pending.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            ✅ Queue clear — no bot entries waiting for verification.
          </div>
        )}

        {/* Decided */}
        {done.length > 0 && (
          <div className="pt-2">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Decided this session</p>
            <div className="space-y-1.5">
              {done.map((e) => {
                const d = decisions[e.botId];
                return (
                  <div key={e.botId} className="flex items-center justify-between text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 opacity-80">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-slate-500">{e.botId}</span>
                      <span className="text-slate-600">{e.customerName || "—"}</span>
                      <span className="text-slate-400">{e.product}</span>
                      {d.decision === "new"     && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">✓ New complaint</span>}
                      {d.decision === "linked"  && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">🔗 Linked to #{d.linkedTo}</span>}
                      {d.decision === "rejected"&& <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600">✕ Rejected</span>}
                    </div>
                    <button onClick={() => undo(e.botId)} className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 text-xs">
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
