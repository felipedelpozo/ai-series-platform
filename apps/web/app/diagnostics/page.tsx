import { notFound } from "next/navigation";
import { getAppConfig } from "@/lib/config";
import { isDiagnosticsEnabled } from "@/lib/diagnostics";

export default function DiagnosticsPage() {
  if (!isDiagnosticsEnabled(process.env.NODE_ENV)) {
    notFound();
  }

  const config = getAppConfig();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Diagnostics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Runtime environment: <code>{config.appEnv}</code>
      </p>
      <table className="mt-6 w-full max-w-lg border text-sm">
        <thead>
          <tr className="border-b bg-muted">
            <th className="px-3 py-2 text-left">Subsystem</th>
            <th className="px-3 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {config.subsystems.map((subsystem) => (
            <tr key={subsystem.id} className="border-b">
              <td className="px-3 py-2">{subsystem.label}</td>
              <td className="px-3 py-2">{subsystem.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
