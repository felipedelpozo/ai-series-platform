"use client";

import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@ai-series/ui";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

export function StudioShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  function setMobileNavigationOpen(open: boolean) {
    setMobileOpen(open);
    if (!open) requestAnimationFrame(() => mobileTriggerRef.current?.focus());
  }

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <aside
        className={`sticky top-0 hidden h-svh shrink-0 overflow-hidden border-r border-sidebar-border transition-[width] duration-200 lg:block ${collapsed ? "w-[4.5rem]" : "w-64"}`}
      >
        <AppSidebar collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileNavigationOpen}>
        <SheetContent
          side="left"
          className="w-[min(20rem,88vw)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Studio navigation</SheetTitle>
            <SheetDescription>Open another production area.</SheetDescription>
          </SheetHeader>
          <AppSidebar mobile onNavigate={() => setMobileNavigationOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <AppHeader
          collapsed={collapsed}
          menuButtonRef={mobileTriggerRef}
          onMenuClick={() => setMobileNavigationOpen(true)}
          onToggleSidebar={() => setCollapsed((value) => !value)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          <div className="mx-auto w-full max-w-[96rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
