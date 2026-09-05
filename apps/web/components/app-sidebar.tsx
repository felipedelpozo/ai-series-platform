"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Gauge, Images, MessageSquareText, Settings, Sparkles, Users } from "lucide-react";
import { cn, Separator } from "@ai-series/ui";

const navItems = [
  { href: "/series", label: "Series", icon: Clapperboard },
  { href: "/assets", label: "Assets", icon: Images },
  { href: "/prompts", label: "Prompts", icon: MessageSquareText },
  { href: "/generations", label: "Generations", icon: Sparkles },
  { href: "/ops", label: "Operations", icon: Gauge },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-background">
      <div className="flex h-14 items-center gap-2 px-4">
        <Sparkles className="size-5" aria-hidden="true" />
        <span className="text-base font-semibold">AI Series Platform</span>
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Main">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/series" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
