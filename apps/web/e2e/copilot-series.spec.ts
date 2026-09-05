import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const context = {
  workspaceId: "workspace-1",
  workspaceName: "North Star Studio",
  role: "editor",
  fingerprint: "context-fingerprint",
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installBootstrap(page: Page) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/copilot/conversations") return json(route, { conversations: [] });
    if (path === "/api/me") {
      return json(route, {
        user: { email: "creator@example.com" },
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
}

test("root renders the copilot with simultaneous desktop panes and no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await installBootstrap(page);
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Create against the canon" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Conversation" }).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Draft & canonical review" }).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByText("North Star Studio").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Next:").filter({ visible: true })).toBeVisible();

  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("mobile tabs retain the unsent message and expose an accessible surface", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 820 });
  await installBootstrap(page);
  await page.goto("/");

  const message = page.getByRole("textbox", { name: "Message to creative copilot" });
  await message.fill("Create a noir mystery in a city that changes every night.");
  await page.getByRole("tab", { name: "Draft" }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Draft" }).getByText("The review surface is ready"),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Chat" }).click();
  await expect(message).toHaveValue("Create a noir mystery in a city that changes every night.");

  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
  const results = await new AxeBuilder({ page })
    .exclude("img, video, audio")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("real inference exposes a quote that can be cancelled without generation", async ({
  page,
}) => {
  let generateCalls = 0;
  const projection = {
    id: "conversation-1",
    title: "Night city",
    status: "preparing_draft",
    context,
    messages: [
      {
        id: "message-1",
        sequence: 1,
        role: "user",
        classification: "proposal",
        content: "Create a night city series",
        createdAt: "2026-09-05T10:00:00.000Z",
      },
    ],
    pendingMessageId: "message-1",
    inferenceQuote: {
      id: "quote-1",
      fingerprint: "quote-fingerprint",
      provider: "OpenAI",
      model: "gpt-5",
      modality: "structured draft",
      amount: "0.08",
      currency: "USD",
      units: "8,000 tokens",
      availableQuota: "14.20 USD",
      expiresAt: "2099-09-05T11:00:00.000Z",
      scope: "Draft series bundle",
    },
  };

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/me") {
      return json(route, {
        workspaces: [
          { workspace: { id: "workspace-1", name: "North Star Studio" }, role: "editor" },
        ],
      });
    }
    if (path === "/api/series") return json(route, { series: [] });
    if (path === "/api/copilot/conversations" && route.request().method() === "GET") {
      return json(route, { conversations: [] });
    }
    if (path === "/api/copilot/conversations" && route.request().method() === "POST") {
      return json(route, { ...projection, messages: [], inferenceQuote: undefined }, 201);
    }
    if (path.endsWith("/messages") && route.request().method() === "POST")
      return json(route, projection);
    if (path === "/api/copilot/conversations/conversation-1") return json(route, projection);
    if (path.endsWith("/generate")) {
      generateCalls += 1;
      return json(route, {});
    }
    return json(route, {});
  });

  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Message to creative copilot" })
    .fill("Create a night city series");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByRole("button", { name: "Review inference quote" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("0.08 USD");
  await page.getByRole("button", { name: "Cancel" }).click();
  expect(generateCalls).toBe(0);
  await expect(page.getByRole("button", { name: "Review inference quote" })).toBeVisible();
});
