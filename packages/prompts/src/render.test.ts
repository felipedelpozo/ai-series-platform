import { describe, expect, it } from "bun:test";
import { renderTemplate } from "./render";

describe("renderTemplate", () => {
  it("renders a template with variables", () => {
    const result = renderTemplate("Hello {{name}}", { name: "Ada" }, [{ name: "name", required: true }]);
    expect(result.rendered).toBe("Hello Ada");
    expect(result.missing).toEqual([]);
  });

  it("detects missing required variables", () => {
    const result = renderTemplate("Hello {{name}}", {}, [{ name: "name", required: true }]);
    expect(result.missing).toEqual(["name"]);
  });

  it("leaves unknown placeholders untouched", () => {
    const result = renderTemplate("{{a}} {{b}}", { a: "1" }, []);
    expect(result.rendered).toBe("1 {{b}}");
  });

  it("does not require optional variables", () => {
    const result = renderTemplate(
      "{{subject}} {{style}}",
      { subject: "cat" },
      [
        { name: "subject", required: true },
        { name: "style", required: false },
      ],
    );
    expect(result.missing).toEqual([]);
  });
});
