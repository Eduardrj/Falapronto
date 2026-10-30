"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Film, UserRound } from "lucide-react";
import { APP_NAME, SUPABASE_ENABLED } from "@/lib/config";

const TABS = [
  { href: "/app/", label: "Roteiros", icon: FileText },
  { href: "/app/videos/", label: "Meus vídeos", icon: Film },
  ...(SUPABASE_ENABLED ? [{ href: "/app/conta/", label: "Conta", icon: UserRound }] : []),
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "";
  const fullscreen = path.startsWith("/app/gravar");
  if (fullscreen) return <>{children}</>;

  const norm = path.endsWith("/") ? path : path + "/";

  return (
    <div className="min-h-dvh bg-lav">
      <header className="safe-top sticky top-0 z-20 bg-ink text-lav">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link href="/app/" className="font-display text-xl font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <nav className="hidden gap-1 sm:flex" aria-label="Seções">
            {TABS.map((t) => {
              const active = norm === t.href || (t.href !== "/app/" && norm.startsWith(t.href));
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                    active ? "bg-band text-ink" : "text-lav/80 hover:bg-lav/10"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-28 pt-6 sm:pb-12">{children}</main>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-paper sm:hidden"
        aria-label="Seções"
      >
        <div className="flex justify-around pt-2">
          {TABS.map((t) => {
            const active = norm === t.href || (t.href !== "/app/" && norm.startsWith(t.href));
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex min-w-20 flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-xs font-bold ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                <span className={`rounded-full px-4 py-1 ${active ? "bg-band" : ""}`}>
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
