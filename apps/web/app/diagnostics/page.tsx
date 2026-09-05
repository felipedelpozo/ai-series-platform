import { notFound } from "next/navigation";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ai-series/ui";
import { checkDb } from "@ai-series/db";
import { PageHeader, SectionPanel, StatusBadge } from "@/components/ui";
import { getAppConfig } from "@/lib/config";
import { isDiagnosticsEnabled } from "@/lib/diagnostics";

export default async function DiagnosticsPage() {
  if (!isDiagnosticsEnabled(process.env.NODE_ENV)) {
    notFound();
  }

  const config = getAppConfig();
  const database = await checkDb();

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader
          eyebrow="Runtime"
          title="Diagnostics"
          description="A read-only view of the local studio environment and its required subsystems."
          actions={<Badge variant="outline">{config.appEnv}</Badge>}
        />

        <dl className="grid border-y sm:grid-cols-2 sm:divide-x">
          <div className="flex min-w-0 items-center justify-between gap-4 py-4 sm:pr-5">
            <dt className="text-sm text-muted-foreground">Environment</dt>
            <dd className="break-all font-mono text-sm font-medium">{config.appEnv}</dd>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-4 border-t py-4 sm:border-t-0 sm:pl-5">
            <dt className="text-sm text-muted-foreground">Database</dt>
            <dd>
              <StatusBadge status={database.ok ? "up" : "down"} />
            </dd>
          </div>
        </dl>

        <SectionPanel
          title="Subsystems"
          description="Configuration health exposed by the current runtime."
        >
          <div className="overflow-x-auto border-y">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subsystem</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.subsystems.map((subsystem) => (
                  <TableRow key={subsystem.id}>
                    <TableCell className="font-medium">{subsystem.label}</TableCell>
                    <TableCell>
                      <StatusBadge status={subsystem.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionPanel>
      </div>
    </main>
  );
}
