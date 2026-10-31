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
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:min-h-16 sm:flex-nowrap sm:px-8 sm:py-0">
        <Link href="/" className="flex items-center gap-2.5 text-ink no-underline">
          <LogoMark />
          <span className="text-base font-bold tracking-tight">DisputeGuard</span>
        </Link>
        <span className="ml-auto rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn sm:order-last">Sandbox</span>
        <nav aria-label="Main" className="-mx-1 flex w-full gap-1 overflow-x-auto sm:mx-0 sm:w-auto sm:flex-grow">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 no-underline ${
                  active ? "bg-accent-soft font-semibold text-accent-ink" : "font-medium text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
