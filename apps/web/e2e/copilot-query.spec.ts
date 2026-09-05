import { expect, test, type Route } from "@playwright/test";

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("viewer receives grounded history without mutation controls", async ({ page }) => {
  const conversation = {
    id: "viewer-conversation",
    title: "Canon query",
    status: "collecting_context",
    context: {
      workspaceId: "workspace-1",
      workspaceName: "North Star Studio",
      role: "viewer",
      seriesId: "series-1",
      seriesName: "The Night Archive",
      fingerprint: "context-fingerprint",
    },
    messages: [
      {
        id: "answer-1",
        sequence: 1,
        role: "assistant",
        classification: "query",
        content: "Mara is the current protagonist in the active Series Bible.",
        createdAt: "2026-09-05T10:00:00.000Z",
        references: [{ label: "Open active Series", href: "/series?seriesId=series-1" }],
      },
    ],
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/copilot/conversations")
      return json(route, { conversations: [conversation] });
    if (path.endsWith("/viewer-conversation")) return json(route, conversation);
    if (path === "/api/me") {
      return json(route, {
        workspaces: [
          { workspace: { id: "workspace-1", name: "North Star Studio" }, role: "viewer" },
        ],
      });
    }
    if (path === "/api/series") return json(route, { series: [] });
    return json(route, {});
  });
  await page.goto("/");
  await expect(page.getByText("Read-only · viewer").filter({ visible: true })).toBeVisible();
  await expect(
    page.getByText(/Mara is the current protagonist/).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open active Series/ }).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Approve revision/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Apply approved revision/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Review paid-work cost/ })).toHaveCount(0);
});
