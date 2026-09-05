import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState, PageHeader } from "@/components/ui";

export function PlaceholderPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
  icon,
  action,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader eyebrow="Workspace configuration" title={title} description={description} />
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
        action={action}
        className="min-h-80"
      />
    </div>
  );
}
