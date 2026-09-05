export type StudioNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  group: "Create" | "Manage";
};

export const studioNavigation = [
  {
    href: "/",
    label: "Creative copilot",
    shortLabel: "Copilot",
    description: "Turn creative intent into reviewable, approved canonical changes.",
    group: "Create",
  },
  {
    href: "/series",
    label: "Series",
    shortLabel: "Series",
    description: "Build canon, story state and episode plans.",
    group: "Create",
  },
  {
    href: "/assets",
    label: "Asset library",
    shortLabel: "Assets",
    description: "Review generated media and its provenance.",
    group: "Create",
  },
  {
    href: "/prompts",
    label: "Prompt registry",
    shortLabel: "Prompts",
    description: "Version and preview production instructions.",
    group: "Create",
  },
  {
    href: "/generations",
    label: "Generation lab",
    shortLabel: "Generations",
    description: "Submit and inspect asynchronous generation work.",
    group: "Create",
  },
  {
    href: "/ops",
    label: "Operations",
    shortLabel: "Operations",
    description: "Track health, cost, retries and blocked jobs.",
    group: "Manage",
  },
  {
    href: "/accounts",
    label: "Accounts & workspaces",
    shortLabel: "Accounts",
    description: "Manage identity and workspace access.",
    group: "Manage",
  },
  {
    href: "/settings",
    label: "Settings",
    shortLabel: "Settings",
    description: "Review configuration available to this workspace.",
    group: "Manage",
  },
] as const satisfies readonly StudioNavItem[];

export function getStudioRoute(pathname: string): StudioNavItem {
  if (pathname.startsWith("/studio/")) {
    return {
      href: pathname,
      label: "Episode studio",
      shortLabel: "Episode studio",
      description: "Direct scenes, shots, previews and quality review.",
      group: "Create",
    };
  }

  return (
    studioNavigation.find((item) =>
      item.href === "/" || item.href === "/series"
        ? pathname === item.href
        : pathname.startsWith(item.href),
    ) ?? studioNavigation[0]
  );
}
