"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@ai-series/ui";

type PromptVariable = { name: string; required: boolean; default?: string };

type PromptEditorProps = {
  template: {
    id: string;
    name: string;
    description: string | null;
    purpose: string;
    status: string;
  };
  versions: {
    id: string;
    version: number;
    template: string;
    variables: PromptVariable[];
    isActive: boolean;
  }[];
};

export function PromptEditor({ template, versions }: PromptEditorProps) {
  const router = useRouter();
  const active = versions.find((version) => version.isActive) ?? versions[0];

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [text, setText] = useState(active?.template ?? "");
  const [variablesJson, setVariablesJson] = useState(
    JSON.stringify(active?.variables ?? [], null, 2),
  );
  const [previewVars, setPreviewVars] = useState("{}");
  const [preview, setPreview] = useState<{ rendered: string; missing: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/prompts/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        template: text,
        variables: JSON.parse(variablesJson),
      }),
    });
    setBusy(false);
    router.refresh();
  }

  async function runPreview() {
    const response = await fetch("/api/prompts/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: text,
        variables: JSON.parse(previewVars),
        declared: JSON.parse(variablesJson),
      }),
    });
    setPreview(await response.json());
  }

  async function activate(versionId: string) {
    await fetch(`/api/prompts/${template.id}/versions/${versionId}/activate`, { method: "POST" });
    router.refresh();
  }

  async function archive() {
    await fetch(`/api/prompts/${template.id}/archive`, { method: "POST" });
    router.refresh();
  }

  async function clone() {
    await fetch(`/api/prompts/${template.id}/clone`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{template.name}</h2>
          <p className="text-sm text-muted-foreground">
            {template.purpose} · {template.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clone}>
            Clone
          </Button>
          <Button variant="outline" onClick={archive}>
            Archive
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm"
              rows={2}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Template
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1 font-mono text-sm"
              rows={6}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Variables (JSON)
            <textarea
              value={variablesJson}
              onChange={(event) => setVariablesJson(event.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1 font-mono text-sm"
              rows={4}
            />
          </label>
          <Button onClick={save} disabled={busy}>
            Save (new version)
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="rounded-lg border p-3">
            <h3 className="text-sm font-semibold">Preview</h3>
            <label className="mt-2 block text-xs text-muted-foreground">
              Variables (JSON)
              <textarea
                value={previewVars}
                onChange={(event) => setPreviewVars(event.target.value)}
                className="mt-1 block w-full rounded-md border bg-background px-2 py-1 font-mono text-sm"
                rows={3}
              />
            </label>
            <Button variant="outline" onClick={runPreview} className="mt-2">
              Render preview
            </Button>
            {preview && (
              <div className="mt-3">
                {preview.missing.length > 0 && (
                  <p className="text-sm text-destructive">
                    Missing: {preview.missing.join(", ")}
                  </p>
                )}
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                  {preview.rendered}
                </pre>
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <h3 className="text-sm font-semibold">Versions</h3>
            <ul className="mt-2 flex flex-col gap-1">
              {versions.map((version) => (
                <li key={version.id} className="flex items-center justify-between text-sm">
                  <span>
                    v{version.version} {version.isActive ? "(active)" : ""}
                  </span>
                  {!version.isActive && (
                    <Button size="sm" variant="outline" onClick={() => activate(version.id)}>
                      Activate
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
