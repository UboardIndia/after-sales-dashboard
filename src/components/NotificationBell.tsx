"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, X } from "lucide-react";

interface Notification {
  id: number;
  complaint_id: string;
  message: string;
  created_at: string;
}

const POLL_INTERVAL = 60_000; // 60 seconds
const LS_KEY = (me: string) => `notif_last_seen_${me}`;

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell({ me }: { me: string }) {
  const [notifications, setNotifications]   = useState<Notification[]>([]);
  const [lastSeenAt, setLastSeenAt]         = useState<string>("");
  const [open, setOpen]                     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // How many notifications arrived after the last time user opened the bell
  const unreadCount = notifications.filter(
    n => !lastSeenAt || new Date(n.created_at) > new Date(lastSeenAt)
  ).length;

  const fetchNotifications = useCallback(async () => {
    if (!me) return;
    try {
      const res = await fetch(`/api/notifications?recipient=${encodeURIComponent(me)}`);
      const json = await res.json();
      setNotifications(json.notifications ?? []);
    } catch {
      // fail silently — bell just shows nothing
    }
  }, [me]);

  // Load last-seen timestamp from localStorage
  useEffect(() => {
    if (!me) return;
    const saved = localStorage.getItem(LS_KEY(me));
    if (saved) setLastSeenAt(saved);
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [me, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function markAllRead() {
    const now = new Date().toISOString();
    setLastSeenAt(now);
    localStorage.setItem(LS_KEY(me), now);
  }

  function handleOpen() {
    setOpen(v => {
      if (!v) markAllRead(); // mark read when opening
      return !v;
    });
  }

  if (!me) return null;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 transition"
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-4 px-1 bg-red-500 text-white text-[9px] font-bold leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700">
              Notifications
              {unreadCount > 0 && <span className="ml-1 text-indigo-600">({unreadCount} new)</span>}
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline px-1"
                >
                  <Check size={11} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-xs">
                No notifications yet — you&apos;ll see when tickets are assigned to you.
              </div>
            ) : (
              notifications.map(n => {
                const isNew = !lastSeenAt || new Date(n.created_at) > new Date(lastSeenAt);
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition ${isNew ? "bg-indigo-50/50" : ""}`}
                  >
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isNew ? "bg-indigo-500" : "bg-slate-200"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${isNew ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-400">Last 30 assignments · {me}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
