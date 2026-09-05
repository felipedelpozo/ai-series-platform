import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { studioActionContracts } from "./studio-action-contracts";
import { studioMutation } from "./studio-mutation";
import { getStudioRoute, studioNavigation } from "./studio-navigation";

describe("studio navigation contract", () => {
  test("preserves every existing shell destination exactly once", () => {
    expect(studioNavigation.map(({ href }) => href)).toEqual([
      "/series",
      "/assets",
      "/prompts",
      "/generations",
      "/ops",
      "/accounts",
      "/settings",
    ]);
    expect(new Set(studioNavigation.map(({ href }) => href)).size).toBe(studioNavigation.length);
  });

  test("maps static and episode routes to useful context", () => {
    expect(getStudioRoute("/assets").label).toBe("Asset library");
    expect(getStudioRoute("/prompts/template-1").label).toBe("Prompt registry");
    expect(getStudioRoute("/studio/plan-1").label).toBe("Episode studio");
  });
});

describe("studio state contract", () => {
  test("keeps explicit loading, empty, error, and recovery affordances on data surfaces", () => {
    const stateSources = [
      "apps/web/app/(studio)/series/page.tsx",
      "apps/web/app/(studio)/assets/page.tsx",
      "apps/web/app/(studio)/generations/page.tsx",
      "apps/web/app/(studio)/ops/page.tsx",
      "apps/web/app/(studio)/studio/[planId]/page.tsx",
      "apps/web/components/series-entities.tsx",
      "apps/web/components/series-story-state.tsx",
      "apps/web/components/series-plans.tsx",
      "apps/web/components/series-decisions.tsx",
      "apps/web/components/series-loops.tsx",
      "apps/web/components/series-tiktok.tsx",
    ];

    for (const sourcePath of stateSources) {
      const source = readFileSync(resolve(process.cwd(), sourcePath), "utf8");
      expect(source, `${sourcePath} lost its loading state`).toContain("LoadingSkeleton");
      expect(source, `${sourcePath} lost its empty state`).toContain("EmptyState");
      expect(source, `${sourcePath} lost its error state`).toContain("InlineNotice");
      expect(source, `${sourcePath} lost its recovery action`).toMatch(/Retry|Try again|Refresh/);
    }
  });
});

describe("studio action compatibility contract", () => {
  test("keeps every mutating action uniquely identified", () => {
    const ids = studioActionContracts.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(46);
  });

  test("preserves the high-risk and easy-to-drift request shapes", () => {
    const byId = Object.fromEntries(
      studioActionContracts.map((contract) => [contract.id, contract]),
    );

    expect(byId["plans.generateShots"]).toEqual({
      id: "plans.generateShots",
      method: "POST",
      path: "/api/plans/:id/generate-shots",
      fields: ["kind"],
    });
    expect(byId["loops.scenes"]?.path).toBe("/api/loops/:id/scenes");
    expect(byId["prompts.create"]?.fields).toEqual(["purpose", "name", "template"]);
    expect(byId["series.generateBible"]?.fields).toEqual(["details?"]);
    expect(byId["entities.generate"]?.fields).toEqual(["details?"]);
    expect(byId["plans.create"]?.fields).toEqual(["episodeNumber", "details?"]);
    expect(byId["assets.delete"]?.method).toBe("DELETE");
    expect(byId["studio.resolveQa"]?.fields).toEqual(["status"]);
  });

  test("ties every declared mutation to the request emitted by its owning component", () => {
    const sourceByPrefix: Record<string, string> = {
      series: "apps/web/app/(studio)/series/page.tsx",
      entities: "apps/web/components/series-entities.tsx",
      story: "apps/web/components/series-story-state.tsx",
      plans: "apps/web/components/series-plans.tsx",
      decisions: "apps/web/components/series-decisions.tsx",
      loops: "apps/web/components/series-loops.tsx",
      tiktok: "apps/web/components/series-tiktok.tsx",
      assets: "apps/web/app/(studio)/assets/page.tsx",
      generations: "apps/web/components/generation-lab.tsx",
      ops: "apps/web/app/(studio)/ops/page.tsx",
      accounts: "apps/web/app/(studio)/accounts/page.tsx",
    };

    const sourceFor = (id: string) => {
      if (id === "prompts.create") return "apps/web/components/new-prompt-form.tsx";
      if (id.startsWith("prompts.")) return "apps/web/components/prompt-editor.tsx";
      if (id === "studio.qa" || id === "studio.resolveQa") {
        return "apps/web/components/plan-qa.tsx";
      }
      if (id.startsWith("studio.")) {
        return "apps/web/app/(studio)/studio/[planId]/page.tsx";
      }
      return sourceByPrefix[id.split(".")[0]!]!;
    };

    const normalizeSource = (value: string) => value.replace(/\$\{[^}]+\}/g, ":param");
    const normalizeContractPath = (value: string) => value.replace(/:[^/]+/g, ":param");

    for (const contract of studioActionContracts) {
      const sourcePath = sourceFor(contract.id);
      expect(sourcePath, `missing source owner for ${contract.id}`).toBeTruthy();
      const source = readFileSync(resolve(process.cwd(), sourcePath), "utf8");
      if (
        contract.id.startsWith("loops.") &&
        ["plan", "scenes", "generate"].includes(contract.id.split(".")[1]!)
      ) {
        expect(source).toContain("studioMutation(actionId");
      } else if (contract.id.startsWith("ops.")) {
        expect(source).toContain("studioMutation(");
        expect(source).toContain("`ops.${action}`");
      } else {
        expect(source).toMatch(new RegExp(`studioMutation\\(\\s*"${contract.id}"`));
      }
      const normalizedSource = normalizeSource(source);
      let normalizedPath = normalizeContractPath(contract.path);

      if (
        contract.id.startsWith("loops.") &&
        ["plan", "scenes", "generate"].includes(contract.id.split(".")[1]!)
      ) {
        normalizedPath = "/api/loops/:param/:param";
        expect(source).toContain('stage: "plan" | "scenes" | "generate"');
      }
      if (contract.id.startsWith("ops.")) {
        normalizedPath = "/api/ops/jobs/:param/:param";
        expect(source).toContain('type JobAction = "reprocess" | "cleanup"');
      }

      const occurrences: string[] = [];
      if (contract.id.startsWith("loops.") || contract.id.startsWith("ops.")) {
        let offset = normalizedSource.indexOf(normalizedPath);
        while (offset >= 0) {
          occurrences.push(normalizedSource.slice(offset, offset + 1_400));
          offset = normalizedSource.indexOf(normalizedPath, offset + 1);
        }
      } else {
        const actionPattern = new RegExp(`studioMutation\\(\\s*"${contract.id}"`, "g");
        for (const match of normalizedSource.matchAll(actionPattern)) {
          occurrences.push(
            normalizedSource.slice(Math.max(0, match.index - 1_200), match.index + 1_400),
          );
        }
      }

      expect(occurrences.length, `${contract.id} action is not emitted`).toBeGreaterThan(0);
      expect(occurrences.some((window) => window.includes(normalizedPath))).toBe(true);
      const requestWindow = occurrences.find((window) =>
        window.includes(`method: "${contract.method}"`),
      );
      expect(requestWindow, `${contract.id} no longer emits ${contract.method}`).toBeTruthy();

      for (const field of contract.fields) {
        if (field.startsWith("<")) continue;
        const normalizedField = field.endsWith("?") ? field.slice(0, -1) : field;
        expect(requestWindow, `${contract.id} lost body field ${normalizedField}`).toContain(
          normalizedField,
        );
      }
    }
  });

  test("executes every mutation contract through the runtime guard", async () => {
    const originalFetch = globalThis.fetch;
    const calls: { path: string; method: string }[] = [];
    globalThis.fetch = (async (input, init) => {
      calls.push({ path: String(input), method: init?.method ?? "GET" });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      for (const contract of studioActionContracts) {
        const path = contract.path.replace(/:[^/]+/g, "fixture-id");
        const body = Object.fromEntries(
          contract.fields
            .filter((field) => !field.startsWith("<"))
            .map((field) => [field.replace(/\?$/, ""), "fixture"]),
        );
        await studioMutation(contract.id, path, {
          method: contract.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contract.fields[0]?.startsWith("<") ? { title: "Bible" } : body),
        });
      }
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toHaveLength(studioActionContracts.length);
    expect(calls.map(({ method }) => method)).toEqual(
      studioActionContracts.map(({ method }) => method),
    );
  });
});
