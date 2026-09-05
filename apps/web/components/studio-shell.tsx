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
    <div className="min-h-svh bg-muted/30 lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <aside
        className={`sticky top-0 hidden h-svh shrink-0 overflow-hidden p-2 pr-0 transition-[width] duration-200 lg:block ${collapsed ? "w-20" : "w-[16.5rem]"}`}
      >
        <div className="h-full overflow-hidden rounded-lg border bg-background">
          <AppSidebar collapsed={collapsed} />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileNavigationOpen}>
        <SheetContent side="left" className="w-[min(20rem,88vw)] bg-background p-0 text-foreground">
          <SheetHeader className="sr-only">
            <SheetTitle>Studio navigation</SheetTitle>
            <SheetDescription>Open another production area.</SheetDescription>
          </SheetHeader>
          <AppSidebar mobile onNavigate={() => setMobileNavigationOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 bg-background lg:my-2 lg:mr-2 lg:min-h-[calc(100svh-1rem)] lg:overflow-clip lg:rounded-lg lg:border">
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
