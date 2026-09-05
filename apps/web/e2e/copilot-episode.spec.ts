import { expect, test, type Route } from "@playwright/test";

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("episode context stays visible and applied receipt returns to Episode Studio", async ({
  page,
}) => {
  const conversation = {
    id: "episode-conversation",
    title: "Episode one",
    status: "applied",
    context: {
      workspaceId: "workspace-1",
      workspaceName: "North Star Studio",
      role: "editor",
      seriesId: "series-1",
      seriesName: "The Night Archive",
      episodePlanId: "plan-1",
      episodeNumber: 1,
      fingerprint: "context-fingerprint",
    },
    messages: [],
    receipt: {
      id: "receipt-1",
      committedAt: "2026-09-05T10:00:00.000Z",
      links: [{ kind: "EpisodePlan", label: "Open episode 1", href: "/studio/plan-1" }],
    },
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/copilot/conversations")
      return json(route, { conversations: [conversation] });
    if (path === "/api/copilot/conversations/episode-conversation")
      return json(route, conversation);
    if (path === "/api/me") {
      return json(route, {
        workspaces: [
          { workspace: { id: "workspace-1", name: "North Star Studio" }, role: "editor" },
        ],
      });
    }
    if (path === "/api/series") {
      return json(route, {
        series: [{ id: "series-1", name: "The Night Archive", workspaceId: "workspace-1" }],
      });
    }
    return json(route, {});
  });
  await page.goto("/");
  await expect(page.getByText("The Night Archive").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Episode 1").filter({ visible: true }).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open episode 1/ }).filter({ visible: true }),
  ).toHaveAttribute("href", "/studio/plan-1");
});

test("authorized workspace, Series, Episode and resource selection persists and is submitted exactly", async ({
  page,
}) => {
  let createdContext: unknown;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/copilot/conversations" && route.request().method() === "GET")
      return json(route, { conversations: [] });
    if (path === "/api/copilot/conversations" && route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { context: unknown };
      createdContext = body.context;
      return json(
        route,
        {
          conversation: {
            id: "new-conversation",
            title: "New conversation",
            status: "collecting_context",
          },
          context: {
            workspaceId: "workspace-2",
            role: "editor",
            ...(body.context as object),
            fingerprint: "context-fingerprint",
          },
          messages: [],
        },
        201,
      );
    }
    if (path === "/api/copilot/conversations/new-conversation/messages") return json(route, {});
    if (path === "/api/copilot/conversations/new-conversation")
      return json(route, {
        conversation: {
          id: "new-conversation",
          title: "New conversation",
          status: "collecting_context",
        },
        context: {
          workspaceId: "workspace-2",
          role: "editor",
          seriesId: "series-2",
          episodePlanId: "plan-2",
          resource: { type: "scene", id: "scene-2" },
          fingerprint: "context-fingerprint",
        },
        messages: [],
      });
    if (path === "/api/me") {
      return json(route, {
        workspaces: [
          { workspace: { id: "workspace-1", name: "North Star Studio" }, role: "editor" },
          { workspace: { id: "workspace-2", name: "Second Unit" }, role: "editor" },
        ],
      });
    }
    if (path === "/api/series") {
      return json(route, {
        series: [
          { id: "series-1", name: "The Night Archive", workspaceId: "workspace-1" },
          { id: "series-2", name: "Harbor Signal", workspaceId: "workspace-2" },
        ],
      });
    }
    if (path === "/api/series/series-2")
      return json(route, {
        bibles: [{ id: "bible-2", title: "Harbor Bible", version: 2, isActive: true }],
      });
    if (path === "/api/series/series-2/plans")
      return json(route, {
        plans: [{ id: "plan-2", episodeNumber: 2, version: 1, isActive: true }],
      });
    if (path === "/api/entities" && url.searchParams.get("seriesId") === "series-2")
      return json(route, {
        entities: [{ id: "entity-2", type: "character", name: "Mara", status: "active" }],
      });
    if (path === "/api/plans/plan-2/scenes") {
      return json(route, {
        scenes: [{ id: "scene-2", order: 0, shots: [{ id: "shot-2", order: 0 }] }],
      });
    }
    return json(route, {});
  });

  await page.goto("/");
  await choose(page, "Workspace context", "Second Unit");
  await choose(page, "Series context", "Harbor Signal");
  await choose(page, "Episode context", "Episode 2 · v1");
  await choose(page, "Resource context", "Scene 1");

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Workspace context" })).toContainText(
    "Second Unit",
  );
  await expect(page.getByRole("combobox", { name: "Series context" })).toContainText(
    "Harbor Signal",
  );
  await expect(page.getByRole("combobox", { name: "Episode context" })).toContainText("Episode 2");
  await expect(page.getByRole("combobox", { name: "Resource context" })).toContainText("Scene 1");

  await page
    .getByRole("textbox", { name: "Message to creative copilot" })
    .fill("Describe this scene.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect
    .poll(() => createdContext)
    .toEqual({
      seriesId: "series-2",
      episodePlanId: "plan-2",
      resource: { type: "scene", id: "scene-2" },
    });
});

test("context changes create snapshots on the current conversation and survive reload", async ({
  page,
}) => {
  const contextBodies: unknown[] = [];
  let createConversationCalls = 0;
  let current = {
    id: "conversation-stable",
    title: "Context continuity",
    status: "collecting_context",
    context: {
      workspaceId: "workspace-1",
      workspaceName: "North Star Studio",
      role: "editor",
      seriesId: "series-1",
      fingerprint: "context-one",
    } as Record<string, unknown>,
    messages: [
      {
        id: "message-existing",
        sequence: 1,
        role: "assistant",
        classification: "query",
        content: "Existing conversation history.",
        createdAt: "2026-09-05T10:00:00.000Z",
      },
    ],
  };
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/copilot/conversations" && route.request().method() === "GET")
      return json(route, { conversations: [current] });
    if (path === "/api/copilot/conversations" && route.request().method() === "POST") {
      createConversationCalls += 1;
      return json(route, {}, 500);
    }
    if (path === "/api/copilot/conversations/conversation-stable") return json(route, current);
    if (
      path === "/api/copilot/conversations/conversation-stable/context" &&
      route.request().method() === "POST"
    ) {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      contextBodies.push(body);
      current = {
        ...current,
        context: {
          workspaceId: "workspace-1",
          workspaceName: "North Star Studio",
          role: "editor",
          ...body,
          fingerprint: `context-${contextBodies.length + 1}`,
        },
      };
      return json(route, current, 201);
    }
    if (path === "/api/me") {
      return json(route, {
        workspaces: [
          { workspace: { id: "workspace-1", name: "North Star Studio" }, role: "editor" },
        ],
      });
    }
    if (path === "/api/series") {
      return json(route, {
        series: [
          { id: "series-1", name: "The Night Archive", workspaceId: "workspace-1" },
          { id: "series-2", name: "Harbor Signal", workspaceId: "workspace-1" },
        ],
      });
    }
    if (path === "/api/series/series-1" || path === "/api/series/series-2")
      return json(route, { bibles: [] });
    if (path === "/api/series/series-1/plans") return json(route, { plans: [] });
    if (path === "/api/series/series-2/plans")
      return json(route, {
        plans: [{ id: "plan-2", episodeNumber: 2, version: 1, isActive: true }],
      });
    if (path === "/api/entities") return json(route, { entities: [] });
    if (path === "/api/plans/plan-2/scenes")
      return json(route, { scenes: [{ id: "scene-2", order: 0, shots: [] }] });
    return json(route, {});
  });

  await page.goto("/");
  await expect(
    page.getByText("Existing conversation history.").filter({ visible: true }),
  ).toBeVisible();
  await choose(page, "Series context", "Harbor Signal");
  await expect.poll(() => contextBodies.length).toBe(1);
  await choose(page, "Episode context", "Episode 2 · v1");
  await expect.poll(() => contextBodies.length).toBe(2);
  await choose(page, "Resource context", "Scene 1");
  await expect.poll(() => contextBodies.length).toBe(3);

  expect(contextBodies).toEqual([
    { seriesId: "series-2" },
    { seriesId: "series-2", episodePlanId: "plan-2" },
    {
      seriesId: "series-2",
      episodePlanId: "plan-2",
      resource: { type: "scene", id: "scene-2" },
    },
  ]);
  expect(createConversationCalls).toBe(0);

  await page.reload();
  await expect(
    page.getByText("Existing conversation history.").filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Series context" })).toContainText(
    "Harbor Signal",
  );
  await expect(page.getByRole("combobox", { name: "Episode context" })).toContainText("Episode 2");
  await expect(page.getByRole("combobox", { name: "Resource context" })).toContainText("Scene 1");
  expect(createConversationCalls).toBe(0);
});

async function choose(page: import("@playwright/test").Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
