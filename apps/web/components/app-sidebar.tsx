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
  SharedLayoutBackground,
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
    <div className="flex h-full min-h-0 flex-col rounded-[inherit] bg-background text-foreground">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 px-4",
          collapsed && !mobile && "justify-center px-2",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        {collapsed && !mobile ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">AI Series</p>
            <p className="truncate text-xs text-muted-foreground">Production desk</p>
          </div>
        )}
      </div>
      <Separator />
      <TooltipProvider delayDuration={150}>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
          {(["Create", "Manage"] as const).map((group) => (
            <div key={group} className="mb-4 last:mb-0">
              {collapsed && !mobile ? null : (
                <p className="mb-1.5 px-2 text-[0.6875rem] font-medium text-muted-foreground">
                  {group}
                </p>
              )}
              <SharedLayoutBackground
                as="ul"
                inset={0}
                className="gap-1"
                pillClassName="rounded-lg bg-accent/70"
              >
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
                          "group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                          active
                            ? "bg-accent font-medium text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground focus-visible:text-foreground",
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
              </SharedLayoutBackground>
            </div>
          ))}
        </nav>
      </TooltipProvider>
      <div className={cn("shrink-0 border-t p-3", collapsed && !mobile && "px-2")}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-2 py-2",
            collapsed && !mobile && "justify-center px-0",
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-muted font-mono text-[0.625rem] font-semibold">
            AI
          </span>
          {collapsed && !mobile ? null : (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">Local workspace</p>
              <p className="truncate text-[0.6875rem] text-muted-foreground">Creator environment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
