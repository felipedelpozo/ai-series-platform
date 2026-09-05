"use client";

import type { RefObject } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button, Separator } from "@ai-series/ui";
import { getStudioRoute } from "@/lib/studio-navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader({
  collapsed,
  menuButtonRef,
  onMenuClick,
  onToggleSidebar,
}: {
  collapsed: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onMenuClick: () => void;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const route = getStudioRoute(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b bg-background/95 px-3 supports-[backdrop-filter]:backdrop-blur-sm sm:px-5">
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        className="rounded-full lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden rounded-full lg:inline-flex"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
      >
        {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
      </Button>
      <Separator orientation="vertical" className="mx-2 h-4 sm:mx-3" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight">{route.label}</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {route.description}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}
