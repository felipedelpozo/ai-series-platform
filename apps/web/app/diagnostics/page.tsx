import { notFound } from "next/navigation";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Environment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-lg font-semibold">{config.appEnv}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Database</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge status={database.ok ? "up" : "down"} />
            </CardContent>
          </Card>
        </div>

        <SectionPanel
          title="Subsystems"
          description="Configuration health exposed by the current runtime."
        >
          <div className="overflow-x-auto rounded-lg border">
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
