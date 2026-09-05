import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "../index";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("shared UI primitives", () => {
  test("renders semantic status and destructive variants", () => {
    const markup = renderToStaticMarkup(
      <div>
        <Badge variant="success">approved</Badge>
        <Button variant="destructive">Delete</Button>
        <Alert variant="warning">
          <AlertDescription>Needs review</AlertDescription>
        </Alert>
      </div>,
    );

    expect(markup).toContain("bg-success/12");
    expect(markup).toContain("bg-destructive");
    expect(markup).toContain('role="alert"');
  });

  test("renders accessible native structure without wrapper regressions", () => {
    const markup = renderToStaticMarkup(
      <Card>
        <Input aria-label="Series name" />
        <Skeleton className="h-4" />
        <Table aria-label="Jobs">
          <TableBody>
            <TableRow>
              <TableCell>queued</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>,
    );

    expect(markup).toContain('aria-label="Series name"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('aria-label="Jobs"');
  });

  test("keeps Button server-renderable with asChild and CSS-only press feedback", () => {
    const markup = renderToStaticMarkup(
      <Button asChild>
        <a href="/series">Open series</a>
      </Button>,
    );

    expect(markup).toContain('href="/series"');
    expect(markup).not.toContain("<button");

    const source = readSource("packages/ui/src/components/button.tsx");
    expect(source).not.toContain('"use client"');
    expect(source).not.toContain("motion.");
    expect(source).toContain("active:scale-[0.98]");
    expect(source).toContain("motion-reduce:transform-none");
  });

  test("adapts the pinned BeUI shared-layout source without owning route state", () => {
    const source = readSource("packages/ui/src/components/shared-layout-background.tsx");
    const notice = readSource("packages/ui/THIRD_PARTY_NOTICES.md");

    expect(source).toContain("beui.dev/components/motion/shared-layout-bg");
    expect(source).toContain("04d6f76e9e67e35cded996b1b8d08a5ddcebc13a");
    expect(source).toContain("useReducedMotion");
    expect(source).toContain("onPointerEnter");
    expect(source).toContain("onFocus");
    expect(source).toContain('pointerType !== "mouse"');
    expect(source).not.toContain("aria-current");
    expect(notice).toContain("Copyright (c) 2026 Saurabh Chauhan");
    expect(notice).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  });

  test("uses near-stock semantic tokens without rejected decorative utilities", () => {
    const packageCss = readSource("packages/ui/styles/globals.css");
    const appCss = readSource("apps/web/app/globals.css");

    expect(packageCss).toContain("--background: oklch(1 0 0)");
    expect(packageCss).toContain("--radius: 0.625rem");
    expect(appCss).not.toContain(".continuity-line");
    expect(appCss).not.toContain(".font-display");
    expect(appCss).toContain("prefers-reduced-motion: reduce");
  });
});
