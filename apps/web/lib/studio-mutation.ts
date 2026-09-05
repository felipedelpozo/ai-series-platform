import { studioActionContracts } from "./studio-action-contracts";

export type StudioActionId = (typeof studioActionContracts)[number]["id"];

function matchesContractPath(contractPath: string, actualPath: string) {
  const pattern = contractPath
    .split("/")
    .map((segment) =>
      segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/");
  return new RegExp(`^${pattern}$`).test(actualPath.split("?")[0]!);
}

export function studioMutation(
  id: StudioActionId,
  path: string,
  init: RequestInit & { method: "DELETE" | "PATCH" | "POST" },
) {
  const contract = studioActionContracts.find((candidate) => candidate.id === id);
  if (!contract) throw new Error(`Unknown studio mutation: ${id}`);
  if (contract.method !== init.method || !matchesContractPath(contract.path, path)) {
    throw new Error(
      `${id} drifted from ${contract.method} ${contract.path} to ${init.method} ${path}`,
    );
  }

  const fields = contract.fields.filter((field) => !field.startsWith("<"));
  if (fields.length > 0) {
    const body =
      typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    for (const declaredField of fields) {
      const optional = declaredField.endsWith("?");
      const field = optional ? declaredField.slice(0, -1) : declaredField;
      if (!optional && !Object.prototype.hasOwnProperty.call(body, field)) {
        throw new Error(`${id} is missing required body field ${field}`);
      }
    }
  }

  return fetch(path, init);
}
