"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Pencil, User, Table2, Bot,
  Package, LogOut,
} from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function NavBar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const [botCount,   setBotCount]   = useState(0);
  const [myName,     setMyName]     = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  // ALL hooks must run before any conditional return
  useEffect(() => {
    const saved = localStorage.getItem("prachi_name") || localStorage.getItem("team_member") || "";
    setMyName(saved);
  }, []);

  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/bot")
      .then(r => r.json())
      .then(j => setBotCount(j.entries?.length ?? 0))
      .catch(() => {});
  }, [pathname]);

  // Hide on login page — after all hooks
  if (pathname === "/login") return null;

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  const navLink = (href: string, label: string, icon: React.ReactNode, badge?: number) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        className={`relative flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition font-medium whitespace-nowrap ${
          active
            ? "bg-indigo-100 text-indigo-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
        }`}
      >
        {icon}
        {label}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-4 px-1 bg-red-500 text-white text-[9px] font-bold leading-none">
              {badge > 99 ? "99+" : badge}
            </span>
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-2">

        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 hidden sm:block">After Sales</span>
          <span className="text-xs text-slate-400 hidden md:block">UBOARD · TYGATEC</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-wrap justify-end">
          {navLink("/",            "Dashboard",    <LayoutDashboard size={13} />)}

          {/* Update Ticket — always indigo */}
          <Link
            href="/update"
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition font-medium whitespace-nowrap ${
              pathname === "/update"
                ? "bg-indigo-700 text-white"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            <Pencil size={13} />
            Update Ticket
          </Link>

          {navLink("/my-work",    "My Work",      <User size={13} />)}
          {navLink("/live",       "Live Feed",    <Table2 size={13} />)}
          {navLink("/verify",     "Verification", <Bot size={13} />, botCount)}
          {navLink("/spareparts", "Spare Parts",  <Package size={13} />)}

          <NotificationBell me={myName} />

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">{loggingOut ? "…" : "Sign Out"}</span>
          </button>
        </nav>

      </div>
    </header>
  );
}
