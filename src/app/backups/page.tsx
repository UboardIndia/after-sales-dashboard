"use client";

import { useState, useEffect, useCallback } from "react";
import { DatabaseBackup, Download, Loader2, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";

interface BackupRow {
  id: number;
  fiscal_year: string;
  row_count: number | null;
  created_at: string;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupSql, setSetupSql] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backup", { cache: "no-store" });
      const json = await res.json();
      setBackups(json.backups ?? []);
      setNeedsSetup(Boolean(json.needsSetup));
    } catch {
      setMsg({ kind: "err", text: "Could not load backups." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runNow() {
    setRunning(true);
    setMsg(null);
    try {
      const res = await fetch("/api/backup/run", { cache: "no-store" });
      const json = await res.json();
      if (json.sql) {
        setNeedsSetup(true);
        setSetupSql(json.sql);
        setMsg({ kind: "err", text: json.error });
      } else if (json.ok) {
        const total = (json.results ?? []).reduce((s: number, r: { rows?: number }) => s + (r.rows ?? 0), 0);
        setMsg({ kind: "ok", text: `Backup complete — ${total} rows saved.` });
      } else {
        const errs = (json.results ?? []).filter((r: { error?: string }) => r.error);
        setMsg({ kind: "err", text: `Backup had errors: ${errs.map((e: { fiscalYear: string; error: string }) => `${e.fiscalYear}: ${e.error}`).join("; ")}` });
      }
      await load();
    } catch {
      setMsg({ kind: "err", text: "Backup failed — try again." });
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <DatabaseBackup size={18} className="text-indigo-600" />
          Sheet Backups
        </h1>
        <button
          onClick={runNow}
          disabled={running}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {running ? "Backing up…" : "Backup Now"}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
        <ShieldCheck size={13} className="text-emerald-600" />
        Both sheets are saved automatically every day. If a sheet is ever lost, download the latest copy here.
      </p>

      {msg && (
        <p className={`text-xs rounded-lg px-3 py-2 mb-4 border ${msg.kind === "ok" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"}`}>
          {msg.text}
        </p>
      )}

      {needsSetup && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
          <p className="flex items-center gap-1.5 font-semibold mb-2">
            <AlertTriangle size={13} /> One-time setup needed
          </p>
          <p className="mb-2">Run this SQL once in Supabase → SQL Editor, then click Backup Now:</p>
          <pre className="bg-white border border-amber-200 rounded p-2 overflow-x-auto text-[10px] leading-relaxed">
{setupSql || `create table if not exists sheet_backups (
  id bigint generated always as identity primary key,
  fiscal_year text not null,
  csv text not null,
  row_count integer,
  created_at timestamptz not null default now()
);`}
          </pre>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin text-indigo-400" />
        </div>
      ) : backups.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">
          No backups yet — click &ldquo;Backup Now&rdquo; to create the first one.
        </p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Sheet</th>
                <th className="px-4 py-2.5 font-medium text-right">Rows</th>
                <th className="px-4 py-2.5 font-medium text-right">Download</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">
                    {new Date(b.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 font-medium">{b.fiscal_year}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{b.row_count ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <a
                      href={`/api/backup?id=${b.id}`}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      <Download size={12} /> CSV
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
