"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const titles: Record<string, string> = {
  "/series": "Series",
  "/assets": "Assets",
  "/prompts": "Prompts",
  "/generations": "Generations",
  "/settings": "Settings",
};

export function AppHeader() {
  const pathname = usePathname();
  const title = Object.entries(titles).find(([href]) => pathname.startsWith(href))?.[1] ?? "Studio";

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <h1 className="text-base font-semibold">{title}</h1>
      <ThemeToggle />
    </header>
  );
}
