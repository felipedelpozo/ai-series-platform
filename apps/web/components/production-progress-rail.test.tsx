import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionSetupRail } from "./production-progress-rail";

describe("ProductionSetupRail", () => {
  test("reports canonical setup facts without inventing workflow completion", () => {
    const markup = renderToStaticMarkup(
      <ProductionSetupRail hasActiveBible entityCount={2} planCount={1} />,
    );

    expect(markup).toContain('aria-label="Series setup"');
    expect(markup).toContain("Canon active");
    expect(markup).toContain("2 defined");
    expect(markup).toContain("1 active");
    expect(markup).not.toContain("aria-current");
    expect(markup).not.toContain(">complete<");
  });

  test("distinguishes missing and unavailable inputs", () => {
    const markup = renderToStaticMarkup(
      <ProductionSetupRail hasActiveBible={false} entityCount={0} planCount={null} />,
    );

    expect(markup).toContain("No active canon");
    expect(markup).toContain("None defined");
    expect(markup).toContain("Status unavailable");
  });
});
