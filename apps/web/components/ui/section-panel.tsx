import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from "@ai-series/ui";

export function SectionPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row items-start justify-between gap-4 border-b bg-muted/20">
        <div className="min-w-0">
          <CardTitle asChild>
            <h2>{title}</h2>
          </CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}
