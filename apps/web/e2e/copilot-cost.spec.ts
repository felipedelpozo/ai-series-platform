import { expect, test, type Route } from "@playwright/test";

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("paid work uses a separate exact cost dialog and blocks duplicate clicks", async ({
  page,
}) => {
  let confirmCalls = 0;
  let startCalls = 0;
  let quoteCalls = 0;
  const requestedQuotes: unknown[] = [];
  const conversation = {
    id: "cost-conversation",
    title: "Generate keyframes",
    status: "awaiting_approval",
    context: {
      workspaceId: "workspace-1",
      workspaceName: "North Star Studio",
      role: "editor",
      fingerprint: "context-fingerprint",
    },
    messages: [],
    revision: {
      id: "revision-1",
      proposalId: "proposal-1",
      revisionNumber: 1,
      fingerprint: "revision-fingerprint",
      payload: {
        schemaVersion: 1,
        operations: [
          {
            type: "paid_job.request",
            clientRef: "job:keyframes",
            jobType: "keyframe.generate",
            targetRefs: ["shot:1", "shot:2"],
            executionDependency: "requires_application_receipt",
            parameters: { provider: "fal.ai", model: "flux-pro", units: 2 },
          },
          {
            type: "paid_job.request",
            clientRef: "job:motion",
            jobType: "motion.generate",
            targetRefs: ["shot:3"],
            executionDependency: "independent",
            parameters: { provider: "untrusted-client-value", units: 99 },
          },
        ],
      },
      diff: [{ id: "d1", operation: "create", resourceType: "Shot", resourceLabel: "Shot 1" }],
      findings: [],
      validationStatus: "valid",
      validationRunId: "validation-1",
      approvalId: "approval-1",
      decision: "approved",
    },
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/copilot/conversations")
      return json(route, { conversations: [conversation] });
    if (path === "/api/copilot/conversations/cost-conversation") return json(route, conversation);
    if (path === "/api/me") {
      return json(route, {
        workspaces: [
          { workspace: { id: "workspace-1", name: "North Star Studio" }, role: "editor" },
        ],
      });
    }
    if (path === "/api/series") return json(route, { series: [] });
    if (path.endsWith("/cost/quote")) {
      quoteCalls += 1;
      const requestBody = route.request().postDataJSON();
      requestedQuotes.push(requestBody);
      const scope = (requestBody as { scope?: Record<string, unknown> }).scope ?? {};
      if (Object.keys(scope).length !== 1 || typeof scope.clientRef !== "string") {
        return json(
          route,
          { error: { code: "invalid_scope", message: "Paid scope is server-derived" } },
          400,
        );
      }
      const motion = scope.clientRef === "job:motion";
      return json(
        route,
        {
          quote: {
            id: "quote-1",
            quoteFingerprint: "quote-fingerprint",
            provider: "fal.ai",
            model: "flux-pro",
            kind: "keyframe",
            maximumAmount: "1.25",
            currency: "USD",
            units: "2",
            availableQuota: "18",
            expiresAt: "2099-09-05T11:00:00.000Z",
            scope: {
              kind: "proposal_job",
              provider: "fal.ai",
              model: "flux-pro",
              purpose: motion ? "motion.generate" : "keyframe.generate",
              units: motion ? 1 : 2,
              targetRefs: motion ? ["shot:3"] : ["shot:1", "shot:2"],
              executionDependency: motion ? "independent" : "requires_application_receipt",
            },
          },
        },
        201,
      );
    }
    if (path.endsWith("/cost/confirm")) {
      confirmCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 80));
      return json(route, { confirmationId: "confirmation-1" });
    }
    if (path.endsWith("/cost/start")) {
      startCalls += 1;
      return json(route, { jobId: "job-1", created: true, status: "queued" });
    }
    return json(route, {});
  });
  await page.goto("/");
  await expect(page.getByText("Approved · ready to apply").filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: "Request cost quote" }).filter({ visible: true }).click();
  await expect.poll(() => quoteCalls).toBe(1);
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("1.25 USD");
  await expect(dialog).toContainText("keyframe.generate");
  await expect(dialog).toContainText("shot:1, shot:2");
  await expect(dialog).toContainText("Requires canonical application receipt");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page
    .getByRole("combobox", { name: "Approved operation" })
    .filter({ visible: true })
    .click();
  await page.getByRole("option", { name: "motion.generate · job:motion", exact: true }).click();
  await expect(page.getByRole("button", { name: "Review current quote" })).toHaveCount(0);
  await page.getByRole("button", { name: "Request cost quote" }).filter({ visible: true }).click();
  await expect.poll(() => quoteCalls).toBe(2);
  expect(requestedQuotes).toEqual([
    {
      revisionId: "revision-1",
      fingerprint: "revision-fingerprint",
      scope: { clientRef: "job:keyframes" },
    },
    {
      revisionId: "revision-1",
      fingerprint: "revision-fingerprint",
      scope: { clientRef: "job:motion" },
    },
  ]);
  const confirm = page.getByRole("button", { name: "Confirm and start · up to 1.25 USD" });
  await confirm.dblclick();
  await expect.poll(() => confirmCalls).toBe(1);
  await expect.poll(() => startCalls).toBe(1);
});

test("an expired quote is visible but cannot be confirmed", async ({ page }) => {
  const conversation = {
    id: "expired-conversation",
    title: "Expired generation quote",
    status: "awaiting_approval",
    context: {
      workspaceId: "workspace-1",
      workspaceName: "North Star Studio",
      role: "editor",
      fingerprint: "context-fingerprint",
    },
    messages: [],
    revision: {
      id: "revision-1",
      proposalId: "proposal-1",
      revisionNumber: 1,
      fingerprint: "revision-fingerprint",
      payload: {
        schemaVersion: 1,
        operations: [
          {
            type: "paid_job.request",
            clientRef: "job:keyframes",
            jobType: "keyframe.generate",
            targetRefs: ["shot:1"],
            executionDependency: "independent",
            parameters: { provider: "fal.ai", model: "flux-pro", units: 1 },
          },
        ],
      },
      diff: [{ id: "d1", operation: "create", resourceType: "Shot", resourceLabel: "Shot 1" }],
      findings: [],
      validationStatus: "valid",
      validationRunId: "validation-1",
      approvalId: "approval-1",
      decision: "approved",
    },
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/copilot/conversations") {
      return json(route, { conversations: [conversation] });
    }
    if (path === "/api/copilot/conversations/expired-conversation") {
      return json(route, conversation);
    }
    if (path === "/api/me") {
      return json(route, {
        workspaces: [
          { workspace: { id: "workspace-1", name: "North Star Studio" }, role: "editor" },
        ],
      });
    }
    if (path === "/api/series") return json(route, { series: [] });
    if (path.endsWith("/cost/quote")) {
      return json(
        route,
        {
          quote: {
            id: "quote-expired",
            quoteFingerprint: "quote-fingerprint",
            provider: "fal.ai",
            maximumAmount: "1.25",
            currency: "USD",
            units: "1",
            availableQuota: "18",
            expiresAt: "2026-01-01T00:00:00.000Z",
            expired: true,
            scope: {
              kind: "proposal_job",
              provider: "fal.ai",
              model: "flux-pro",
              purpose: "keyframe.generate",
              units: 1,
              targetRefs: ["shot:1"],
              executionDependency: "independent",
            },
          },
        },
        201,
      );
    }
    return json(route, {});
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Request cost quote" }).filter({ visible: true }).click();
  await expect(page.getByText("This quote has expired.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm and start · up to 1.25 USD" }),
  ).toBeDisabled();
});
