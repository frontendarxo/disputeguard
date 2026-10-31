"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "./logo";

const NAV = [
  { href: "/", label: "Dashboard", match: (p: string) => p === "/" },
  { href: "/disputes", label: "Disputes", match: (p: string) => p.startsWith("/disputes") },
  { href: "/rules", label: "Rules", match: (p: string) => p.startsWith("/rules") },
  { href: "/activity", label: "Activity", match: (p: string) => p.startsWith("/activity") },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex min-h-16 max-w-[1280px] flex-wrap items-center gap-6 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-ink no-underline">
          <LogoMark />
          <span className="text-base font-bold tracking-tight">DisputeGuard</span>
        </Link>
        <nav aria-label="Main" className="flex flex-grow flex-wrap gap-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 no-underline ${
                  active ? "bg-accent-soft font-semibold text-accent-ink" : "font-medium text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">Sandbox</span>
          <span
            aria-label="Signed in as Test Store"
            className="flex size-9 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white"
          >
            TS
          </span>
        </div>
      </div>
    </header>
  );
}
