import type { PromptVariable } from "@ai-series/db";

export type RenderResult = {
  rendered: string;
  missing: string[];
};

export function renderTemplate(
  template: string,
  variables: Record<string, string>,
  declared: PromptVariable[],
): RenderResult {
  const provided = new Set(Object.keys(variables));
  const missing = declared
    .filter((variable) => variable.required && !provided.has(variable.name))
    .map((variable) => variable.name);

  const rendered = template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, name: string) =>
    name in variables ? variables[name]! : match,
  );

  return { rendered, missing };
}
