import { expect, test, type Route } from "@playwright/test";

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("reload reconstructs a stale revision and offers safe recovery", async ({ page }) => {
  const conversation = {
    id: "recovery-conversation",
    title: "Interrupted episode",
    status: "stale_draft",
    stateCause: "The active Series Bible changed after validation.",
    nextAction: "Recalculate against the current canon.",
    context: {
      workspaceId: "workspace-1",
      workspaceName: "North Star Studio",
      role: "editor",
      seriesId: "series-1",
      seriesName: "The Night Archive",
      fingerprint: "context-fingerprint",
    },
    messages: [
      {
        id: "message-1",
        sequence: 1,
        role: "user",
        classification: "proposal",
        content: "Revise episode one",
        createdAt: "2026-09-05T10:00:00.000Z",
      },
    ],
    revision: {
      id: "revision-2",
      proposalId: "proposal-1",
      revisionNumber: 2,
      fingerprint: "revision-fingerprint",
      payload: { kind: "episode" },
      diff: [
        { id: "d1", operation: "update", resourceType: "EpisodePlan", resourceLabel: "Episode 1" },
      ],
      findings: [],
      validationStatus: "stale",
    },
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/copilot/conversations")
      return json(route, { conversations: [conversation] });
    if (path.endsWith("/recovery-conversation")) return json(route, conversation);
    if (path === "/api/me") {
      return json(route, {
        workspaces: [
          { workspace: { id: "workspace-1", name: "North Star Studio" }, role: "editor" },
        ],
      });
    }
    if (path === "/api/series") return json(route, { series: [] });
    return json(route, {});
  });
  await page.goto("/");
  await expect(page.getByText("Stale draft").filter({ visible: true })).toBeVisible();
  await expect(
    page.getByText("The active Series Bible changed after validation.").filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Create revision on current canon" })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Revise episode one").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Revision 2").filter({ visible: true }).first()).toBeVisible();
});

test("recovery consumes long paginated history and projects an exceptional state", async ({
  page,
}) => {
  const requestedCursors: Array<string | null> = [];
  const messages = Array.from({ length: 205 }, (_, index) => ({
    id: `long-message-${index + 1}`,
    sequence: index + 1,
    role: index % 2 === 0 ? "user" : "assistant",
    classification: "proposal",
    content: `Recovered message ${index + 1}`,
    createdAt: "2026-09-05T10:00:00.000Z",
  }));
  const conversation = {
    id: "long-recovery",
    title: "Long interrupted conversation",
    status: "recoverable_error",
    stateCause: "Provider result requires reconciliation.",
    nextAction: "Reconcile persisted effects before retrying.",
    retryable: true,
  };
  const context = {
    workspaceId: "workspace-1",
    workspaceName: "North Star Studio",
    role: "editor",
    seriesId: "series-1",
    seriesName: "The Night Archive",
    fingerprint: "context-fingerprint",
  };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/copilot/conversations") {
      return json(route, { conversations: [{ ...conversation, context }] });
    }
    if (path.endsWith("/long-recovery")) {
      const cursor = url.searchParams.get("cursor");
      requestedCursors.push(cursor);
      const pageNumber = cursor ? Number(cursor.split("-")[1]) : 0;
      const pageMessages = messages.slice(pageNumber * 50, (pageNumber + 1) * 50);
      return json(route, {
        conversation,
        context,
        revision: recoveryRevision("proposal-2", 3, "invalid"),
        history: {
          messages: pageMessages,
          proposals:
            pageNumber === 0
              ? [
                  {
                    id: "proposal-2",
                    revisions: [
                      recoveryRevision("proposal-2", 3, "invalid"),
                      recoveryRevision("proposal-2", 2, "valid"),
                    ],
                  },
                ]
              : pageNumber === 2
                ? [
                    {
                      id: "proposal-1",
                      revisions: [
                        recoveryRevision("proposal-1", 2, "valid"),
                        recoveryRevision("proposal-1", 1, "valid"),
                      ],
                    },
                  ]
                : [],
        },
        timeline: pageMessages.map((message) => ({
          id: `event-${message.sequence}`,
          sequence: message.sequence,
          type: "message.created",
          createdAt: message.createdAt,
        })),
        ...(pageNumber < 4 ? { nextCursor: `cursor-${pageNumber + 1}` } : {}),
      });
    }
    if (path === "/api/me") {
      return json(route, {
        workspaces: [
          { workspace: { id: "workspace-1", name: "North Star Studio" }, role: "editor" },
        ],
      });
    }
    if (path === "/api/series") return json(route, { series: [] });
    return json(route, {});
  });

  await page.goto("/");
  await expect(page.getByText("Recoverable error").filter({ visible: true })).toBeVisible();
  await expect(
    page.getByText("Provider result requires reconciliation.").filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Reconcile persisted effects before retrying.").filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Recovered message 1", { exact: true }).filter({ visible: true }),
  ).toBeAttached();
  await expect(
    page.getByText("Recovered message 205", { exact: true }).filter({ visible: true }),
  ).toBeAttached();
  expect(requestedCursors).toEqual([null, "cursor-1", "cursor-2", "cursor-3", "cursor-4"]);

  await page.getByRole("tab", { name: "History" }).filter({ visible: true }).click();
  const revisionHistory = page
    .getByRole("list", { name: "Proposal revision history" })
    .filter({ visible: true });
  await expect(revisionHistory.getByRole("listitem")).toHaveCount(4);
  await expect(revisionHistory).toContainText("Revision 3");
  await expect(revisionHistory).toContainText("Revision 1");
});

function recoveryRevision(
  proposalId: string,
  revisionNumber: number,
  validationStatus: "valid" | "invalid",
) {
  return {
    id: `${proposalId}-revision-${revisionNumber}`,
    proposalId,
    revisionNumber,
    fingerprint: `${proposalId}-${revisionNumber}-fingerprint`,
    payload: { operations: [] },
    diff: [],
    findings: [],
    validationStatus,
  };
}
