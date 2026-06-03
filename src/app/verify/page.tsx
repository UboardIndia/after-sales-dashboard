"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Bot, CheckCircle2, Link2, XCircle,
  Phone, Package, Clock, AlertTriangle,
  Undo2, Loader2, PhoneOff, ChevronDown, ChevronUp, User,
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
  customerName: string;
  customerMobile: string;
  issueType: string;
}

interface Draft {
  customerName: string;
  mobile: string;
  product: string;
  issue: string;
  platform: string;
  brand: string;
}

type Decision = { decision: "new" | "linked" | "rejected"; linkedTo?: string; draft?: Draft };

function isUrl(s: string) {
  return s?.startsWith("http");
}

function findMatches(entry: BotEntry, rows: ComplaintRow[]): Match[] {
  if (!entry.hasMobile) return [];
  const matches: Match[] = [];
  const seen = new Set<string>();

  rows.forEach((r) => {
    if (seen.has(r.id)) return;
    if (!r.customerMobile) return;
    if (r.actionTaken === "Close Ticket") return;
    const rMobile = r.customerMobile.replace(/[\s\-().+]/g, "").replace(/^91/, "");
    if (rMobile === entry.mobile) {
      seen.add(r.id);
      matches.push({
        id: r.id,
        seq: r.sequenceNo,
        date: r.complaintDate,
        product: r.productName,
        status: r.actionTaken || "Complaint Register",
        matchedOn: "Same mobile number",
        customerName: r.customerName || "",
        customerMobile: r.customerMobile || "",
        issueType: r.issueType || "",
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
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

  function getDraft(e: BotEntry): Draft {
    return drafts[e.botId] ?? {
      customerName: e.customerName || "",
      mobile: e.mobile || "",
      product: e.product || "",
      issue: isUrl(e.issue) ? "" : (e.issue || ""),
      platform: e.platform || "",
      brand: e.brand || "",
    };
  }

  function updateDraft(botId: string, field: keyof Draft, value: string) {
    setDrafts(prev => {
      const existing = prev[botId] ?? {};
      return { ...prev, [botId]: { ...existing, [field]: value } as Draft };
    });
  }

  function parseTs(ts: string): number {
    const [day, month, year] = ts.split(/[/\s]/);
    return new Date(`${year}-${month}-${day}`).getTime() || 0;
  }

  const pending = botEntries
    .filter((e) => !decisions[e.botId])
    .sort((a, b) => {
      if (sortBy === "newest") {
        const d = parseTs(b.timestamp) - parseTs(a.timestamp);
        if (d !== 0) return d;
        return parseInt(b.botId.replace(/\D/g, "")) - parseInt(a.botId.replace(/\D/g, ""));
      }
      if (sortBy === "oldest") {
        const d = parseTs(a.timestamp) - parseTs(b.timestamp);
        if (d !== 0) return d;
        return parseInt(a.botId.replace(/\D/g, "")) - parseInt(b.botId.replace(/\D/g, ""));
      }
      if (sortBy === "duplicates") {
        return findMatches(b, helpdeskRows).length - findMatches(a, helpdeskRows).length;
      }
      if (sortBy === "no-mobile") return (a.hasMobile ? 1 : 0) - (b.hasMobile ? 1 : 0);
      return 0;
    });

  const done = botEntries.filter((e) => decisions[e.botId]);
  const noMobileCount = botEntries.filter((e) => !e.hasMobile).length;

  function decide(botId: string, d: Decision) {
    setDecisions(prev => ({ ...prev, [botId]: d }));
    setExpandedId(null);
    setLinkPicker(null);
  }

  function undo(botId: string) {
    setDecisions(prev => { const n = { ...prev }; delete n[botId]; return n; });
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

      <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-5 space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

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
                sortBy === s ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
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
          const isExpanded = expandedId === e.botId;
          const draft = getDraft(e);
          const hasMatch = matches.length > 0;

          return (
            <div
              key={e.botId}
              className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 transition-all ${
                hasMatch ? "border-amber-300" : "border-slate-200"
              }`}
            >
              {/* Collapsed row — click to expand */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : e.botId)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition text-left gap-2"
              >
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <span className="font-mono text-xs font-bold text-indigo-600 shrink-0">{e.botId}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                    <Clock size={11} /> {e.timestamp}
                  </span>
                  {e.brand && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 shrink-0">{e.brand}</span>
                  )}
                  {e.customerName ? (
                    <span className="flex items-center gap-1 text-xs text-slate-700 font-medium truncate">
                      <User size={11} className="text-slate-400 shrink-0" /> {e.customerName}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No name</span>
                  )}
                  {e.hasMobile ? (
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-mono shrink-0">
                      <Phone size={11} className="text-slate-400" /> {e.mobile}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400 shrink-0">
                      <PhoneOff size={11} /> No number
                    </span>
                  )}
                  {e.product && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
                      <Package size={11} className="text-slate-400 shrink-0" /> {e.product}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasMatch && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                      ⚠ {matches.length} open match{matches.length > 1 ? "es" : ""}
                    </span>
                  )}
                  {isExpanded
                    ? <ChevronUp size={15} className="text-slate-400" />
                    : <ChevronDown size={15} className="text-slate-400" />}
                </div>
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <>
                  <div className={`border-t-2 ${hasMatch ? "border-amber-200" : "border-slate-100"} grid grid-cols-1 ${hasMatch ? "lg:grid-cols-2" : ""} divide-y lg:divide-y-0 lg:divide-x divide-slate-100`}>

                    {/* LEFT — editable form */}
                    <div className="p-4 space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bot Entry — Fill before approving</p>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Customer Name</label>
                          <input
                            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            value={draft.customerName}
                            onChange={ev => updateDraft(e.botId, "customerName", ev.target.value)}
                            placeholder="Customer name"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Mobile</label>
                          <input
                            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono"
                            value={draft.mobile}
                            onChange={ev => updateDraft(e.botId, "mobile", ev.target.value)}
                            placeholder="Mobile number"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Product</label>
                          <input
                            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            value={draft.product}
                            onChange={ev => updateDraft(e.botId, "product", ev.target.value)}
                            placeholder="Product"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Platform</label>
                          <input
                            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            value={draft.platform}
                            onChange={ev => updateDraft(e.botId, "platform", ev.target.value)}
                            placeholder="Platform"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Brand</label>
                          <input
                            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            value={draft.brand}
                            onChange={ev => updateDraft(e.botId, "brand", ev.target.value)}
                            placeholder="Brand"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Warranty</label>
                          <input
                            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-500"
                            value={e.warranty || "—"}
                            readOnly
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Issue Description</label>
                        {isUrl(e.issue) && (
                          <p className="text-[11px] text-amber-600 flex items-center gap-1 mb-1">
                            <AlertTriangle size={11} /> Customer sent an image — describe the issue manually below
                          </p>
                        )}
                        <textarea
                          className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                          rows={3}
                          value={draft.issue}
                          onChange={ev => updateDraft(e.botId, "issue", ev.target.value)}
                          placeholder="Describe the issue..."
                        />
                      </div>
                    </div>

                    {/* RIGHT — matched helpdesk complaint(s) */}
                    {hasMatch && (
                      <div className="p-4 bg-amber-50 space-y-3">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">⚠ Open Helpdesk Match — Same Mobile</p>
                        {matches.map((m) => {
                          const row = helpdeskRows.find(r => r.id === m.id);
                          return (
                            <div key={m.id} className="bg-white border-2 border-amber-200 rounded-xl p-3 space-y-2 text-sm">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-slate-700">#{m.seq}</span>
                                <span className="text-slate-400 text-xs">{m.date}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">{m.status}</span>
                              </div>
                              {row && (
                                <div className="space-y-1 text-xs">
                                  <div className="flex gap-2"><span className="text-slate-400 w-16 shrink-0">Customer</span><span className="text-slate-700 font-medium">{row.customerName || "—"}</span></div>
                                  <div className="flex gap-2"><span className="text-slate-400 w-16 shrink-0">Mobile</span><span className="text-slate-700 font-mono">{row.customerMobile || "—"}</span></div>
                                  <div className="flex gap-2"><span className="text-slate-400 w-16 shrink-0">Product</span><span className="text-slate-700">{row.productName || "—"}</span></div>
                                  <div className="flex gap-2"><span className="text-slate-400 w-16 shrink-0">Issue</span><span className="text-slate-700">{row.issueType || "—"}</span></div>
                                  <div className="flex gap-2"><span className="text-slate-400 w-16 shrink-0">Platform</span><span className="text-slate-700">{row.platform || "—"}</span></div>
                                  {row.headRemarks && <div className="flex gap-2"><span className="text-slate-400 w-16 shrink-0">Remarks</span><span className="text-slate-600 italic">{row.headRemarks}</span></div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t-2 border-slate-100 bg-slate-50">
                    <button
                      onClick={() => decide(e.botId, { decision: "new", draft })}
                      className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                    >
                      <CheckCircle2 size={13} /> Approve as New Complaint
                    </button>
                    {hasMatch && (
                      linkPicker === e.botId ? (
                        <span className="flex items-center gap-1.5 text-xs flex-wrap">
                          <span className="text-slate-500 font-medium">Link to:</span>
                          {matches.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => decide(e.botId, { decision: "linked", linkedTo: m.seq, draft })}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-mono font-semibold text-xs"
                            >
                              #{m.seq}
                            </button>
                          ))}
                          <button onClick={() => setLinkPicker(null)} className="text-slate-400 hover:text-slate-600 px-1 text-xs">cancel</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setLinkPicker(e.botId)}
                          className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold border border-indigo-200"
                        >
                          <Link2 size={13} /> Link to Existing
                        </button>
                      )
                    )}
                    <button
                      onClick={() => decide(e.botId, { decision: "rejected" })}
                      className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold border border-red-200 ml-auto"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {pending.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border-2 border-slate-200">
            ✅ Queue clear — no bot entries waiting for verification.
          </div>
        )}

        {/* Decided this session */}
        {done.length > 0 && (
          <div className="pt-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Decided this session</p>
            <div className="space-y-1.5">
              {done.map((e) => {
                const d = decisions[e.botId];
                return (
                  <div key={e.botId} className="flex items-center justify-between text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 opacity-80">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-slate-500">{e.botId}</span>
                      <span className="text-slate-600">{d.draft?.customerName || e.customerName || "—"}</span>
                      <span className="text-slate-400">{d.draft?.product || e.product}</span>
                      {d.decision === "new"      && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">✓ New complaint</span>}
                      {d.decision === "linked"   && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">🔗 Linked to #{d.linkedTo}</span>}
                      {d.decision === "rejected" && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600">✕ Rejected</span>}
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
