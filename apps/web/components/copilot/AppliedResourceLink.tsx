import Link from "next/link";
import { ArrowUpRight, Clapperboard, ListChecks } from "lucide-react";

export function AppliedResourceLink({
  href,
  label,
  kind,
}: {
  href: string;
  label: string;
  kind: string;
}) {
  const isEpisode = href.startsWith("/studio/");
  const Icon = isEpisode ? ListChecks : Clapperboard;
  return (
    <Link
      href={href}
      className="group flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm outline-none transition hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{kind}</span>
        </span>
      </span>
      <ArrowUpRight
        className="size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Link>
  );
}
