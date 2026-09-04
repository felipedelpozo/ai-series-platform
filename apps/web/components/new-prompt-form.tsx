"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@ai-series/ui";

export function NewPromptForm({ purposes }: { purposes: readonly string[] }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<string>(purposes[0] ?? "test.image");
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, name, template }),
    });
    setBusy(false);
    setName("");
    setTemplate("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold">New template</h3>
      <div className="mt-3 flex flex-col gap-2">
        <label className="text-xs text-muted-foreground">
          Purpose
          <select
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            className="mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm"
          >
            {purposes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Template
          <textarea
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            className="mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm"
            rows={3}
          />
        </label>
        <Button onClick={create} disabled={busy || !name || !template}>
          Create
        </Button>
      </div>
    </div>
  );
}
