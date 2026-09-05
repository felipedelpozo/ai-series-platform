import { z } from "zod";
import {
  COPILOT_LIMITS,
  IntentPartSchema,
  MessageClassificationSchema,
  type IntentPart,
  type MessageClassification,
} from "./contracts";

const InputSchema = z.string().trim().min(1).max(COPILOT_LIMITS.message);

const APPROVAL_LANGUAGE =
  /\b(adelante|aplica(?:lo)?|apruebo|confirmo|sí[, ]+hazlo|go ahead|apply it|approved?)\b/iu;
const PAID_LANGUAGE =
  /\b(genera(?:r)?|renderiza(?:r)?|produce|vídeo|video|imagen|image|voz|voice|fal(?:\.ai)?|créditos?|credits?|paid job)\b/iu;
const MUTATION_LANGUAGE =
  /\b(crea(?:r)?|añade|agrega|modifica|actualiza|cambia|renombra|archiva|elimina|revisa|corrige|create|add|modify|update|change|rename|archive|delete|revise|fix)\b/iu;
const PROPOSAL_LANGUAGE =
  /\b(propón|propuesta|borrador|draft|suggest|proposal|idea|planifica|plan)\b/iu;
const QUERY_LANGUAGE =
  /(?:\?|\b(qué|cuál|cuándo|cómo|dónde|quién|muestra|dime|consulta|estado|what|which|when|how|where|who|show|tell|status)\b)/iu;
const UNSUPPORTED_SEASON = /\b(temporad(?:a|as)|season(?:s)?)\b/iu;
const PROMPT_INJECTION =
  /\b(ignore|ignora|olvida|revela|muestra)\b.{0,80}\b(instrucciones|instructions|system prompt|permisos|permissions|otro workspace|another workspace|secrets?|secretos?)\b/iu;

function classifyPart(text: string): IntentPart {
  const unsupportedResource = UNSUPPORTED_SEASON.test(text) ? "season" : undefined;
  const paid = PAID_LANGUAGE.test(text);
  const mutation = MUTATION_LANGUAGE.test(text);
  const proposal = PROPOSAL_LANGUAGE.test(text);
  const query = QUERY_LANGUAGE.test(text);

  let classification: IntentPart["classification"];
  if (paid) classification = "paid_job";
  else if (mutation) classification = "canonical_mutation";
  else if (proposal) classification = "proposal";
  else if (query) classification = "query";
  else classification = "query";

  return IntentPartSchema.parse({
    classification,
    text,
    requiresProvider: classification === "proposal" || classification === "paid_job",
    unsupportedResource,
  });
}

function overallClassification(parts: IntentPart[]): MessageClassification {
  const categories = new Set(parts.map((part) => part.classification));
  if (categories.size > 1) return "mixed";
  return MessageClassificationSchema.parse(parts[0]?.classification ?? "query");
}

export type ClassifiedIntent = {
  classification: MessageClassification;
  parts: IntentPart[];
  approvalLanguageDetected: boolean;
  promptInjectionDetected: boolean;
  mayAuthorizeCanonicalMutation: false;
  mayAuthorizePaidWork: false;
};

export function decomposeIntent(input: string): ClassifiedIntent {
  const content = InputSchema.parse(input);
  const segments = content
    .split(/(?:\n+|(?<=[.!?;])\s+|\s+\b(?:y también|además|then also|and also)\b\s+)/iu)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 20);
  const parts = (segments.length > 0 ? segments : [content]).map(classifyPart);
  return {
    classification: overallClassification(parts),
    parts,
    approvalLanguageDetected: APPROVAL_LANGUAGE.test(content),
    promptInjectionDetected: PROMPT_INJECTION.test(content),
    mayAuthorizeCanonicalMutation: false,
    mayAuthorizePaidWork: false,
  };
}

export function classifyIntent(input: string): MessageClassification {
  return decomposeIntent(input).classification;
}

export function buildUntrustedPromptInput(input: string): string {
  const content = InputSchema.parse(input);
  return escapePromptJson(JSON.stringify({ type: "untrusted_user_content", content }));
}

export const COPILOT_PROMPT_PAYLOAD_MAX_CHARS = 100_000;

function escapePromptJson(json: string): string {
  return json.replace(/[<>&\u2028\u2029]/gu, (character) => {
    switch (character) {
      case "<":
        return "\\u003c";
      case ">":
        return "\\u003e";
      case "&":
        return "\\u0026";
      case "\u2028":
        return "\\u2028";
      default:
        return "\\u2029";
    }
  });
}

/**
 * Produces one bounded JSON payload for prompt interpolation. Escaping angle
 * brackets makes delimiter-looking strings inert even if a future template
 * introduces markup around the payload.
 */
export function buildUntrustedPromptPayload(input: {
  userMessage: string;
  canonicalContext: Readonly<Record<string, unknown>>;
}): string {
  const userMessage = InputSchema.parse(input.userMessage);
  let serialized: string;
  try {
    serialized = JSON.stringify({
      schemaVersion: 1,
      canonicalContext: input.canonicalContext,
      userMessage,
    });
  } catch {
    throw new TypeError("Copilot prompt payload must be JSON serializable");
  }
  const escaped = escapePromptJson(serialized);
  if (escaped.length > COPILOT_PROMPT_PAYLOAD_MAX_CHARS) {
    throw new RangeError("Copilot prompt payload exceeds the maximum size");
  }
  return escaped;
}
