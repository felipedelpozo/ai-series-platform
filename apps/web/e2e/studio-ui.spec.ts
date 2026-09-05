import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const shellRoutes = [
  "/series",
  "/assets",
  "/prompts",
  "/generations",
  "/ops",
  "/accounts",
  "/settings",
  "/studio/test-plan",
] as const;

const viewports = [375, 768, 1024, 1280, 1440] as const;

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installEmptyApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/series") return json(route, { series: [] });
    if (path === "/api/assets") return json(route, { assets: [] });
    if (path === "/api/generations") return json(route, { jobs: [] });
    if (path === "/api/ops/overview") {
      return json(route, {
        health: {
          total: 0,
          active: 0,
          stuck: 0,
          succeeded: 0,
          failed: 0,
          successRate: 0,
          errorRate: 0,
          retryRate: 0,
        },
        durations: { avgDurationMs: 0, maxDurationMs: 0 },
        costByProviderModel: [],
        costBySeries: [],
        orphanCount: 0,
      });
    }
    if (path === "/api/ops/failures") return json(route, { trace: [] });
    if (path === "/api/ops/budget") return json(route, { totalCost: 0, limitUsd: 10, over: false });
    if (path === "/api/plans/test-plan/scenes") return json(route, { scenes: [] });
    if (path === "/api/plans/test-plan/qa") return json(route, { findings: [] });
    if (path === "/api/prompts") return json(route, { templates: [] });
    if (path === "/api/me")
      return json(route, { user: { email: "creator@example.com" }, workspaces: [] });
    return json(route, {});
  });
}

async function existingPromptPath(page: Page) {
  const response = await page.request.get("/api/prompts");
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as { templates?: { id: string }[] };
  expect(payload.templates?.length).toBeGreaterThan(0);
  return `/prompts/${payload.templates![0]!.id}`;
}

async function assertNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function assertMobileKeyboardJourney(page: Page) {
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation).toBeVisible();
  const undersizedSheetControls = await page
    .locator('[role="dialog"] button:visible, [role="dialog"] a:visible')
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const root = element.getRootNode();
          return !(
            element.getAttribute("aria-label") === "Open Next.js Dev Tools" ||
            element.closest("nextjs-portal") ||
            (root instanceof ShadowRoot && root.host.tagName.toLowerCase().includes("nextjs"))
          );
        })
        .map((element) => ({
          name: element.getAttribute("aria-label") ?? element.textContent?.trim(),
          height: element.getBoundingClientRect().height,
          width: element.getBoundingClientRect().width,
        }))
        .filter(({ height, width }) => height < 39.5 || width < 39.5),
    );
  expect(undersizedSheetControls).toEqual([]);
  await page.keyboard.press("Tab");
  const focusedControl = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"]');
    if (!element) return null;
    const style = getComputedStyle(element);
    return {
      insideDialog: dialog?.contains(element) ?? false,
      tag: element.tagName,
      name:
        element.getAttribute("aria-label") ||
        element.textContent?.trim() ||
        element.getAttribute("name") ||
        "",
      hasVisibleFocus:
        style.outlineStyle !== "none" || (style.boxShadow !== "none" && style.boxShadow.length > 0),
    };
  });
  expect(focusedControl?.insideDialog).toBe(true);
  expect(focusedControl?.tag).toMatch(/^(A|BUTTON)$/);
  expect(focusedControl?.name.length).toBeGreaterThan(0);
  expect(focusedControl?.hasVisibleFocus).toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator('[role="dialog"] :focus')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(trigger).toBeFocused();
}

async function assertTouchTargets(page: Page) {
  const undersized = await page
    .locator(
      "button:visible, input:visible:not([aria-hidden=true]):not([type=hidden]), select:visible:not([aria-hidden=true]), textarea:visible, [role=tab]:visible",
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const root = element.getRootNode();
          return !(
            element.getAttribute("aria-label") === "Open Next.js Dev Tools" ||
            element.closest("nextjs-portal") ||
            (root instanceof ShadowRoot && root.host.tagName.toLowerCase().includes("nextjs"))
          );
        })
        .map((element) => ({
          name:
            element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
          height: element.getBoundingClientRect().height,
        }))
        .filter(({ height }) => height < 39.5),
    );
  expect(undersized).toEqual([]);

  const undersizedPrimaryActions = await page.locator("button:visible").evaluateAll((buttons) =>
    buttons
      .filter(
        (button) =>
          button.className.includes("bg-primary") && button.getAttribute("role") !== "tab",
      )
      .map((button) => ({
        name: button.textContent?.trim() ?? "button",
        height: button.getBoundingClientRect().height,
      }))
      .filter(({ height }) => height < 43.5),
  );
  expect(undersizedPrimaryActions).toEqual([]);
}

test("root opens the Creative copilot and preserves Series navigation", async ({ page }) => {
  await installEmptyApi(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Creative copilot", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Series", exact: true }).first()).toHaveAttribute(
    "href",
    "/series",
  );
});

for (const width of viewports) {
  test.describe(`${width}px route matrix`, () => {
    for (const routePath of [...shellRoutes, "prompt-detail", "/diagnostics"] as const) {
      test(`${routePath} renders without page overflow`, async ({ page }, testInfo) => {
        const consoleErrors: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        await page.setViewportSize({ width, height: 900 });
        const path = routePath === "prompt-detail" ? await existingPromptPath(page) : routePath;
        await installEmptyApi(page);
        const response = await page.goto(path);

        if (path === "/diagnostics" && response?.status() === 404) {
          await expect(page.getByText("This page could not be found")).toBeVisible();
          await assertNoPageOverflow(page);
          return;
        }

        const main = path === "/diagnostics" ? page.locator("main") : page.locator("#main-content");
        await expect(main).toBeVisible();
        await expect(page.locator("h1")).toHaveCount(1);
        await assertNoPageOverflow(page);

        if (path !== "/diagnostics" && width <= 768) await assertMobileKeyboardJourney(page);
        if (width === 375) await assertTouchTargets(page);
        const needsVisualEvidence =
          width === 1440 ||
          (([375, 768] as number[]).includes(width) &&
            ["/series", "/assets", "/studio/test-plan"].includes(path));
        if (needsVisualEvidence) {
          await testInfo.attach(`visual-${width}-${path.replaceAll("/", "-") || "root"}`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: "image/png",
          });
        }
        expect(consoleErrors, `${path} emitted browser console errors`).toEqual([]);
      });
    }
  });
}

test("Series separates load error, retry, and empty state", async ({ page }) => {
  let requests = 0;
  await installEmptyApi(page);
  await page.route("**/api/series", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    requests += 1;
    return requests === 1
      ? json(route, { error: "Deterministic outage" }, 503)
      : json(route, { series: [] });
  });

  await page.goto("/series");
  await expect(page.getByText("Series could not be loaded")).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("No series yet")).toBeVisible();
  expect(requests).toBe(2);
});

test("Assets exposes loading, read error, retry, and empty states", async ({ page }) => {
  let fail = true;
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await installEmptyApi(page);
  await page.route("**/api/assets**", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    if (fail) {
      await barrier;
      return json(route, { error: "fixture outage" }, 503);
    }
    return json(route, { assets: [] });
  });

  await page.goto("/assets");
  await expect(page.getByRole("status", { name: "Loading" }).first()).toBeVisible();
  release();
  await expect(page.getByText("Assets could not be loaded")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("No assets yet")).toBeVisible();
});

test("Generations exposes loading, read error, retry, and empty states", async ({ page }) => {
  let fail = true;
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await installEmptyApi(page);
  await page.route("**/api/generations**", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    if (fail) {
      await barrier;
      return json(route, { error: "fixture outage" }, 503);
    }
    return json(route, { jobs: [] });
  });

  await page.goto("/generations");
  await expect(page.getByRole("status", { name: "Loading" }).first()).toBeVisible();
  release();
  await expect(page.getByText("Generation history is unavailable")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("No generation jobs yet")).toBeVisible();
});

test("Episode Studio exposes loading, read error, retry, and empty states", async ({ page }) => {
  let fail = true;
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await installEmptyApi(page);
  await page.route("**/api/plans/test-plan/scenes", async (route) => {
    if (fail) {
      await barrier;
      return json(route, { error: "fixture outage" }, 503);
    }
    return json(route, { scenes: [] });
  });

  await page.goto("/studio/test-plan");
  await expect(page.getByRole("status", { name: "Loading" }).first()).toBeVisible();
  release();
  await expect(page.getByText("Scenes could not be loaded")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("No scenes yet")).toBeVisible();
});

test("Operations exposes partial loading, error recovery, and empty states", async ({ page }) => {
  let fail = true;
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await installEmptyApi(page);
  await page.route("**/api/ops/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (fail) {
      await barrier;
      return json(route, { error: "fixture outage" }, 503);
    }
    if (path === "/api/ops/overview") {
      return json(route, {
        health: {
          total: 0,
          active: 0,
          stuck: 0,
          succeeded: 0,
          failed: 0,
          successRate: 0,
          errorRate: 0,
          retryRate: 0,
        },
        durations: { avgDurationMs: 0, maxDurationMs: 0 },
        costByProviderModel: [],
        costBySeries: [],
        orphanCount: 0,
      });
    }
    if (path === "/api/ops/failures") return json(route, { trace: [] });
    return json(route, { totalCost: 0, limitUsd: 10, over: false });
  });

  await page.goto("/ops");
  await expect(page.getByRole("status", { name: "Loading" }).first()).toBeVisible();
  release();
  await expect(page.getByText("Some operational data could not be refreshed")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try refresh again" }).click();
  await expect(page.getByText("No production jobs yet")).toBeVisible();
});

test("failed login preserves inputs and blocks duplicate submission", async ({ page }) => {
  let requestBody: unknown;
  await installEmptyApi(page);
  await page.route("**/api/auth/login", async (route) => {
    requestBody = route.request().postDataJSON();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await json(route, { error: "Invalid credentials" }, 401);
  });

  await page.goto("/accounts");
  await page.getByLabel("Email address").fill("creator@example.com");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("button", { name: "Logging in…" })).toBeDisabled();
  await expect(page.getByText("Sign in failed")).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveValue("creator@example.com");
  await expect(page.getByLabel("Password")).toHaveValue("not-the-password");
  expect(requestBody).toEqual({ email: "creator@example.com", password: "not-the-password" });
});

test("prompt creation preserves its POST payload and input on failure", async ({ page }) => {
  let method = "";
  let requestBody: unknown;
  await installEmptyApi(page);
  await page.route("**/api/prompts", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    method = route.request().method();
    requestBody = route.request().postDataJSON();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await json(route, { error: "Registry unavailable" }, 503);
  });

  await page.goto("/prompts");
  const createPanel = page.locator("#new-prompt");
  const purpose = await createPanel.getByLabel("Purpose").inputValue();
  await createPanel.getByLabel("Name").fill("Shot continuity");
  await createPanel
    .getByRole("textbox", { name: "Template" })
    .fill("Keep {{character}} visually consistent.");
  await page.getByRole("button", { name: "Create template" }).click();
  await expect(page.getByRole("button", { name: "Creating template…" })).toBeDisabled();
  await expect(page.getByText("Template could not be created")).toBeVisible();
  await expect(createPanel.getByLabel("Name")).toHaveValue("Shot continuity");
  await expect(createPanel.getByRole("textbox", { name: "Template" })).toHaveValue(
    "Keep {{character}} visually consistent.",
  );
  expect(method).toBe("POST");
  expect(requestBody).toEqual({
    purpose,
    name: "Shot continuity",
    template: "Keep {{character}} visually consistent.",
  });
});

test("series creation is keyboard operable and preserves its request", async ({ page }) => {
  let requestBody: unknown;
  await installEmptyApi(page);
  await page.route("**/api/series", async (route) => {
    if (route.request().method() === "POST") {
      requestBody = route.request().postDataJSON();
      return json(route, { id: "series-new" }, 201);
    }
    return json(route, { series: [] });
  });

  await page.goto("/series");
  const name = page.getByLabel("Series name");
  await name.fill("The Night Archive");
  await name.press("Enter");
  await expect(page.getByText("The library is up to date.")).toBeVisible();
  expect(requestBody).toEqual({ name: "The Night Archive" });
});

test("operations cleanup requires confirmation and preserves its request", async ({ page }) => {
  let cleanupCount = 0;
  await installEmptyApi(page);
  await page.route("**/api/ops/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/ops/overview") {
      return json(route, {
        health: {
          total: 1,
          active: 0,
          stuck: 0,
          succeeded: 0,
          failed: 1,
          successRate: 0,
          errorRate: 1,
          retryRate: 0,
        },
        durations: { avgDurationMs: 100, maxDurationMs: 100 },
        costByProviderModel: [],
        costBySeries: [],
        orphanCount: 0,
      });
    }
    if (path === "/api/ops/failures") {
      return json(route, {
        trace: [
          {
            job: { id: "job-failed", kind: "video", model: "fixture", error: "failed" },
            attempts: [],
          },
        ],
      });
    }
    if (path === "/api/ops/budget") {
      return json(route, { totalCost: 0, limitUsd: 10, over: false });
    }
    if (path === "/api/ops/jobs/job-failed/cleanup" && route.request().method() === "POST") {
      cleanupCount += 1;
      return json(route, { ok: true });
    }
    return route.fallback();
  });

  await page.goto("/ops");
  await page.getByRole("button", { name: "Cleanup" }).click();
  expect(cleanupCount).toBe(0);
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Clean up job" }).click();
  await expect.poll(() => cleanupCount).toBe(1);
});

test("asset deletion requires confirmation and preserves DELETE", async ({ page }) => {
  const asset = {
    id: "asset-1",
    kind: "image",
    source: "test",
    status: "draft",
    url: "/missing-image.jpg",
    mime: "image/jpeg",
    width: 1080,
    height: 1920,
    sizeBytes: 1024,
    provider: "fixture",
    model: "fixture-v1",
    createdAt: "2026-09-05T00:00:00.000Z",
  };
  let deleteCount = 0;
  await installEmptyApi(page);
  await page.route("**/api/assets**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/assets" && route.request().method() === "GET")
      return json(route, { assets: [asset] });
    if (path === "/api/assets/asset-1" && route.request().method() === "GET")
      return json(route, { asset, children: [] });
    if (path === "/api/assets/asset-1" && route.request().method() === "DELETE") {
      deleteCount += 1;
      return json(route, { ok: true });
    }
    return route.fallback();
  });

  await page.goto("/assets");
  await page.getByRole("button", { name: "Select image asset asset-1" }).click();
  await page.getByRole("button", { name: "Delete asset" }).click();
  expect(deleteCount).toBe(0);
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText("Delete this asset?")).toBeVisible();
  await dialog.getByRole("button", { name: "Delete asset" }).click();
  await expect.poll(() => deleteCount).toBe(1);
});

test("an asset mutation cannot clear a newer selection", async ({ page }) => {
  const makeAsset = (id: string) => ({
    id,
    kind: "image",
    source: `source-${id}`,
    status: "draft",
    url: `/missing-${id}.jpg`,
    mime: "image/jpeg",
    width: 1080,
    height: 1920,
    sizeBytes: 1024,
    provider: "fixture",
    model: "fixture-v1",
    createdAt: "2026-09-05T00:00:00.000Z",
  });
  const assets = [makeAsset("asset-1"), makeAsset("asset-2")];
  let finishMutation!: () => void;
  const mutationGate = new Promise<void>((resolve) => {
    finishMutation = resolve;
  });

  await installEmptyApi(page);
  await page.route("**/api/assets**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/assets" && route.request().method() === "GET") {
      return json(route, { assets });
    }
    const asset = assets.find((candidate) => path === `/api/assets/${candidate.id}`);
    if (asset && route.request().method() === "GET") {
      return json(route, { asset, children: [] });
    }
    if (path === "/api/assets/asset-1" && route.request().method() === "PATCH") {
      await mutationGate;
      return json(route, { ok: true });
    }
    return route.fallback();
  });

  await page.goto("/assets");
  const first = page.getByRole("button", { name: "Select image asset asset-1" });
  const second = page.getByRole("button", { name: "Select image asset asset-2" });
  await first.click();
  await page.getByRole("button", { name: "Set Approved" }).click();
  await second.click();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  finishMutation();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("source-asset-2")).toBeVisible();
});

test("episode generation stays locked and cannot overwrite a newer shot preview", async ({
  page,
}) => {
  let generationSubmitted = false;
  let finishGeneration!: () => void;
  const generationGate = new Promise<void>((resolve) => {
    finishGeneration = resolve;
  });
  const shots = [
    {
      id: "shot-a",
      order: 0,
      status: "draft",
      data: { imagePrompt: "A", videoPrompt: "Move A" },
    },
    {
      id: "shot-b",
      order: 1,
      status: "draft",
      data: { imagePrompt: "B", videoPrompt: "Move B" },
    },
  ];

  await installEmptyApi(page);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path === "/api/plans/test-plan/scenes" && method === "GET") {
      return json(route, {
        scenes: [{ id: "scene-1", order: 0, data: { purpose: "Opening" }, shots }],
      });
    }
    if (path === "/api/shots/shot-a/generate" && method === "POST") {
      generationSubmitted = true;
      return json(route, { stepId: "step-a", reused: false }, 201);
    }
    if (path === "/api/shots/shot-a/preview" && method === "GET") {
      if (generationSubmitted) {
        await generationGate;
        return json(route, {
          keyframeAsset: { url: "/a2.jpg" },
          videoAsset: null,
          steps: [{ id: "step-a", kind: "keyframe", status: "succeeded" }],
        });
      }
      return json(route, {
        keyframeAsset: { url: "/a.jpg" },
        videoAsset: null,
        steps: [],
      });
    }
    if (path === "/api/shots/shot-b/preview" && method === "GET") {
      return json(route, {
        keyframeAsset: { url: "/b.jpg" },
        videoAsset: null,
        steps: [],
      });
    }
    return route.fallback();
  });

  await page.goto("/studio/test-plan");
  await page.getByRole("button", { name: /Shot 1/ }).click();
  await expect(page.getByRole("img", { name: "Keyframe for shot 1" })).toHaveAttribute(
    "src",
    "/a.jpg",
  );
  await page.getByRole("button", { name: "Regenerate keyframe" }).click();
  await expect(page.getByRole("button", { name: "Generating…" })).toBeDisabled();
  await page.getByRole("button", { name: /Shot 2/ }).click();
  const shotBPreview = page.getByRole("img", { name: "Keyframe for shot 2" });
  await expect(shotBPreview).toHaveAttribute("src", "/b.jpg");
  finishGeneration();
  await expect(page.getByRole("button", { name: "Regenerate keyframe" })).toBeEnabled();
  await expect(shotBPreview).toHaveAttribute("src", "/b.jpg");
  await expect(page.getByText("Keyframe generated")).toHaveCount(0);
});

test("an active generation remains locked against duplicate submission", async ({ page }) => {
  let generationPayload: unknown;
  let generationPosts = 0;
  let releasePost!: () => void;
  const postBarrier = new Promise<void>((resolve) => {
    releasePost = resolve;
  });
  await installEmptyApi(page);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path === "/api/generations" && method === "GET") return json(route, { jobs: [] });
    if (path === "/api/prompts" && method === "GET")
      return json(route, {
        templates: [{ id: "prompt-1", name: "Image", purpose: "image.generate" }],
      });
    if (path === "/api/prompts/prompt-1" && method === "GET")
      return json(route, {
        versions: [{ id: "version-1", template: "Draw", variables: [], isActive: true }],
      });
    if (path === "/api/generations" && method === "POST") {
      generationPosts += 1;
      generationPayload = route.request().postDataJSON();
      await postBarrier;
      return json(route, { jobId: "job-1" });
    }
    if (path === "/api/generations/job-1" && method === "GET")
      return json(route, {
        job: {
          id: "job-1",
          status: "queued",
          error: null,
          kind: "image",
          model: null,
          providerRequestId: null,
        },
      });
    return route.fallback();
  });

  await page.goto("/generations");
  await page.getByRole("combobox", { name: "Prompt template" }).click();
  await page.getByRole("option", { name: /Image/ }).click();
  const generate = page.getByRole("button", { name: "Generate image" });
  await generate.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect.poll(() => generationPosts).toBe(1);
  releasePost();
  await expect(page.getByRole("button", { name: "Generation in progress…" })).toBeDisabled();
  expect(generationPayload).toEqual({
    type: "image",
    templateId: "prompt-1",
    variables: {},
    params: {},
    idempotencyKey: expect.any(String),
  });
});

test("QA keeps each pending finding locked independently", async ({ page }) => {
  const counts = { a: 0, b: 0 };
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await installEmptyApi(page);
  await page.route("**/api/plans/test-plan/qa", async (route) => {
    if (route.request().method() === "GET") {
      return json(route, {
        findings: [
          { id: "a", check: "Continuity A", severity: "high", status: "open" },
          { id: "b", check: "Continuity B", severity: "medium", status: "open" },
        ],
      });
    }
    return route.fallback();
  });
  await page.route("**/api/findings/*/resolve", async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").at(-2) as "a" | "b";
    counts[id] += 1;
    await barrier;
    return json(route, { ok: true });
  });

  await page.goto("/studio/test-plan");
  const first = page.getByLabel("Resolve Continuity A").getByRole("button", { name: "Accept" });
  const second = page.getByLabel("Resolve Continuity B").getByRole("button", { name: "Accept" });
  await first.evaluate((button) => (button as HTMLButtonElement).click());
  await second.evaluate((button) => (button as HTMLButtonElement).click());
  await first.evaluate((button) => (button as HTMLButtonElement).click());
  await expect.poll(() => counts).toEqual({ a: 1, b: 1 });
  await expect(first).toBeDisabled();
  await expect(second).toBeDisabled();
  release();
});

test("every primary route exposes a complete visible keyboard focus path", async ({ page }) => {
  const detailPath = await existingPromptPath(page);
  await installEmptyApi(page);

  for (const path of [...shellRoutes, detailPath]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const expected = await page
      .locator(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const root = element.getRootNode();
            return (
              element instanceof HTMLElement &&
              element.tabIndex >= 0 &&
              element.getAttribute("role") !== "tablist" &&
              element.getAttribute("aria-label") !== "Open Next.js Dev Tools" &&
              !element.closest("nextjs-portal") &&
              !(root instanceof ShadowRoot && root.host.tagName.toLowerCase().includes("nextjs")) &&
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden"
            );
          })
          .map((element, index) => {
            const id = `${index}`;
            element.setAttribute("data-e2e-focus-id", id);
            return id;
          }),
      );
    const seen = new Set<string>();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    for (let step = 0; step < expected.length + 10 && seen.size < expected.length; step += 1) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return null;
        const id = element.getAttribute("data-e2e-focus-id");
        const labels = "labels" in element ? (element as HTMLInputElement).labels : null;
        const style = getComputedStyle(element);
        return {
          id,
          name:
            element.getAttribute("aria-label") ||
            labels?.[0]?.textContent?.trim() ||
            element.textContent?.trim() ||
            element.getAttribute("name") ||
            "",
          hasVisibleFocus:
            style.outlineStyle !== "none" ||
            (style.boxShadow !== "none" && style.boxShadow.length > 0),
        };
      });
      if (!focused) continue;
      if (focused.id !== null) seen.add(focused.id);
      expect(focused.name, `${path} has an unnamed keyboard control`).not.toBe("");
      expect(focused.hasVisibleFocus, `${path} hides focus for ${focused.name}`).toBe(true);
    }

    expect([...seen].sort(), `${path} has unreachable keyboard controls`).toEqual(expected.sort());
  }
});

test("all primary surfaces meet critical accessibility rules in both themes", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const promptPath = await existingPromptPath(page);
  await installEmptyApi(page);

  for (const theme of ["light", "dark"] as const) {
    for (const path of [...shellRoutes, promptPath, "/diagnostics"]) {
      await page.goto(path);
      if (path === "/diagnostics" && (await page.locator("h1").count()) === 0) continue;
      await page.evaluate((nextTheme) => localStorage.setItem("ai-series-theme", nextTheme), theme);
      await page.reload();
      const results = await new AxeBuilder({ page })
        .exclude("img, video, audio")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations, `${theme} ${path}: ${JSON.stringify(results.violations)}`).toEqual(
        [],
      );
      await testInfo.attach(`visual-${theme}-${path.replaceAll("/", "-") || "root"}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    }
  }
});

test("semantic status badges meet AA contrast with populated data", async ({ page }) => {
  const asset = {
    id: "contrast-asset",
    kind: "image",
    source: "fixture",
    status: "draft",
    url: "/missing-contrast.jpg",
    mime: "image/jpeg",
    width: 1080,
    height: 1920,
    sizeBytes: 1024,
    provider: "fixture",
    model: "fixture-v1",
    createdAt: "2026-09-05T00:00:00.000Z",
  };
  const job = {
    id: "contrast-job",
    kind: "video",
    status: "failed",
    model: "fixture-v1",
    attemptCount: 1,
    maxAttempts: 3,
    error: "Fixture failure",
    providerRequestId: "fixture-request",
    createdAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
  };

  await installEmptyApi(page);
  await page.route("**/api/assets**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/assets") return json(route, { assets: [asset] });
    if (path === `/api/assets/${asset.id}`) return json(route, { asset, children: [] });
    return route.fallback();
  });
  await page.route("**/api/generations**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/generations") return json(route, { jobs: [job] });
    if (path === `/api/generations/${job.id}`) {
      return json(route, { job, attempts: [], events: [] });
    }
    return route.fallback();
  });

  for (const theme of ["light", "dark"] as const) {
    await page.goto("/assets");
    await page.evaluate((nextTheme) => localStorage.setItem("ai-series-theme", nextTheme), theme);
    await page.reload();
    await expect(page.getByText("draft").first()).toBeVisible();
    let results = await new AxeBuilder({ page })
      .exclude("img, video, audio")
      .withTags(["wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations, `${theme} asset badges`).toEqual([]);

    await page.goto("/generations");
    await expect(page.getByText("failed").first()).toBeVisible();
    results = await new AxeBuilder({ page }).withTags(["wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations, `${theme} generation badges`).toEqual([]);
  }
});

test("reduced motion collapses interface transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installEmptyApi(page);
  await page.goto("/accounts");
  const durations = await page
    .getByRole("button")
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return { animation: style.animationDuration, transition: style.transitionDuration };
    });
  expect(Number.parseFloat(durations.animation)).toBeLessThanOrEqual(0.00001);
  expect(Number.parseFloat(durations.transition)).toBeLessThanOrEqual(0.00001);
});
