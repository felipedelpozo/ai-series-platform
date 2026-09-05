"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  Gauge,
  Images,
  MessageSquareText,
  Settings,
  Sparkles,
  Users,
  WandSparkles,
} from "lucide-react";
import {
  cn,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ai-series/ui";
import { studioNavigation } from "@/lib/studio-navigation";

const icons = {
  "/": Sparkles,
  "/series": Clapperboard,
  "/assets": Images,
  "/prompts": MessageSquareText,
  "/generations": WandSparkles,
  "/ops": Gauge,
  "/accounts": Users,
  "/settings": Settings,
} as const;

function isActive(pathname: string, href: string) {
  return href === "/" || href === "/series" ? pathname === href : pathname.startsWith(href);
}

export function AppSidebar({
  collapsed = false,
  mobile = false,
  onNavigate,
}: {
  collapsed?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 px-4",
          collapsed && !mobile && "justify-center px-2",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        {collapsed && !mobile ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">AI Series</p>
            <p className="truncate font-mono text-[0.625rem] uppercase tracking-[0.18em] text-sidebar-foreground/70">
              Production desk
            </p>
          </div>
        )}
      </div>
      <Separator className="bg-sidebar-border" />
      <TooltipProvider delayDuration={150}>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-4" aria-label="Main navigation">
          {(["Create", "Manage"] as const).map((group) => (
            <div key={group} className="mb-5 last:mb-0">
              {collapsed && !mobile ? null : (
                <p className="mb-2 px-2 font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/70">
                  {group}
                </p>
              )}
              <ul className="space-y-1">
                {studioNavigation
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = icons[item.href];
                    const active = isActive(pathname, item.href);
                    const link = (
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex min-h-10 items-center gap-3 rounded-md px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-sidebar-primary",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]"
                            : "text-sidebar-foreground/68 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                          collapsed && !mobile && "justify-center px-2",
                        )}
                      >
                        <Icon className="size-[1.125rem] shrink-0" aria-hidden="true" />
                        {collapsed && !mobile ? (
                          <span className="sr-only">{item.shortLabel}</span>
                        ) : (
                          item.shortLabel
                        )}
                      </Link>
                    );
                    return (
                      <li key={item.href}>
                        {collapsed && !mobile ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right">{item.label}</TooltipContent>
                          </Tooltip>
                        ) : (
                          link
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>
      </TooltipProvider>
      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border p-3",
          collapsed && !mobile && "px-2",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-2",
            collapsed && !mobile && "justify-center px-0",
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-sidebar-border bg-sidebar-accent font-mono text-[0.625rem] font-semibold">
            AI
          </span>
          {collapsed && !mobile ? null : (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">Local workspace</p>
              <p className="truncate text-[0.6875rem] text-sidebar-foreground/70">
                Creator environment
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
