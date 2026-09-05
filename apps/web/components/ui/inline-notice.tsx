import { Alert, AlertDescription, AlertTitle } from "@ai-series/ui";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

const icons = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: TriangleAlert,
} as const;

export function InlineNotice({
  title,
  children,
  variant = "default",
}: {
  title: string;
  children?: ReactNode;
  variant?: keyof typeof icons;
}) {
  const Icon = icons[variant];
  return (
    <Alert variant={variant} aria-live={variant === "destructive" ? "assertive" : "polite"}>
      <Icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {children ? <AlertDescription>{children}</AlertDescription> : null}
    </Alert>
  );
}
