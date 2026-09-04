import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  audienceDecisions,
  audienceSignals,
  decisionCandidates,
  promptSnapshots,
  type Db,
} from "@ai-series/db";
import { generateStructured } from "@ai-series/ai";
import { getActivePrompt, renderTemplate } from "@ai-series/prompts";

export type DecisionRules = {
  weightVote: number;
  weightSuggestion: number;
  weightReaction: number;
  weightLike: number;
  maxRepeatedText: number;
};

export const DEFAULT_RULES: DecisionRules = {
  weightVote: 3,
  weightSuggestion: 1,
  weightReaction: 0.5,
  weightLike: 0.25,
  maxRepeatedText: 5,
};

export type SignalLike = {
  id: string;
  comment: string | null;
  liked: boolean;
  reaction: string | null;
  metadata: Record<string, unknown> | null;
};

export type ClassifiedSignal = {
  id: string;
  intent: "vote" | "suggestion" | "reaction";
  optionLabel?: string;
  text: string;
  liked: boolean;
};

export type DecisionCandidateOutput = {
  label: string;
  intent: "vote" | "suggestion";
  signalIds: string[];
  signalCount: number;
  effectiveCount: number;
  score: number;
};

export type DecisionResult = {
  rules: DecisionRules;
  signalCount: number;
  classifications: ClassifiedSignal[];
  candidates: DecisionCandidateOutput[];
  winnerLabel: string | null;
  confidence: number;
  title: string;
  summary: string;
  rationale: string;
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((w) => w.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const word of a) {
    if (b.has(word)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function optionLabelOf(signal: SignalLike): string | undefined {
  const metadata = signal.metadata ?? {};
  const label = metadata.optionLabel ?? metadata.option;
  if (typeof label === "string" && label.trim().length > 0) return label.trim();
  const id = metadata.optionId;
  if (typeof id === "string" && id.trim().length > 0) return id.trim();
  return undefined;
}

export function classifySignal(signal: SignalLike): ClassifiedSignal {
  const optionLabel = optionLabelOf(signal);
  if (optionLabel) {
    return {
      id: signal.id,
      intent: "vote",
      optionLabel,
      text: signal.comment ?? optionLabel,
      liked: signal.liked,
    };
  }
  const comment = (signal.comment ?? "").trim();
  if (comment.length > 0) {
    return { id: signal.id, intent: "suggestion", text: comment, liked: signal.liked };
  }
  return {
    id: signal.id,
    intent: "reaction",
    text: signal.reaction ?? "",
    liked: signal.liked,
  };
}

function clusterSuggestions(suggestions: ClassifiedSignal[], threshold = 0.35): ClassifiedSignal[][] {
  const clusters: ClassifiedSignal[][] = [];
  for (const signal of suggestions) {
    const tokens = tokenize(signal.text);
    let bestIndex = -1;
    let bestScore = threshold;
    for (let i = 0; i < clusters.length; i++) {
      const representative = clusters[i][0]!;
      const score = jaccard(tokens, tokenize(representative.text));
      if (score >= bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    if (bestIndex >= 0) {
      clusters[bestIndex]!.push(signal);
    } else {
      clusters.push([signal]);
    }
  }
  return clusters;
}

function effectiveSupport(signals: ClassifiedSignal[], cap: number): number {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    const key = normalizeText(signal.text);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let total = 0;
  for (const count of counts.values()) {
    total += Math.min(count, cap);
  }
  return total;
}

function scoreSignals(
  signals: ClassifiedSignal[],
  rules: DecisionRules,
): { score: number; effectiveCount: number } {
  const effectiveCount = effectiveSupport(signals, rules.maxRepeatedText);
  let score = 0;
  for (const signal of signals) {
    const likeBonus = signal.liked ? rules.weightLike : 0;
    if (signal.intent === "vote") score += rules.weightVote + likeBonus;
    else if (signal.intent === "suggestion") score += rules.weightSuggestion + likeBonus;
    else score += rules.weightReaction + likeBonus;
  }
  return { score, effectiveCount };
}

export function decideFromSignals(
  signals: SignalLike[],
  rulesInput?: Partial<DecisionRules>,
): DecisionResult {
  const rules: DecisionRules = { ...DEFAULT_RULES, ...rulesInput };
  const classifications = signals.map(classifySignal);

  const votes = new Map<string, ClassifiedSignal[]>();
  const suggestions: ClassifiedSignal[] = [];
  for (const classification of classifications) {
    if (classification.intent === "vote") {
      const key = classification.optionLabel!;
      const list = votes.get(key) ?? [];
      list.push(classification);
      votes.set(key, list);
    } else if (classification.intent === "suggestion") {
      suggestions.push(classification);
    }
  }

  const candidates: DecisionCandidateOutput[] = [];

  for (const [label, voteSignals] of votes) {
    const { score, effectiveCount } = scoreSignals(voteSignals, rules);
    candidates.push({
      label,
      intent: "vote",
      signalIds: voteSignals.map((s) => s.id),
      signalCount: voteSignals.length,
      effectiveCount,
      score,
    });
  }

  for (const cluster of clusterSuggestions(suggestions)) {
    const representative = cluster[0]!;
    const label = representative.text.slice(0, 80);
    const { score, effectiveCount } = scoreSignals(cluster, rules);
    candidates.push({
      label,
      intent: "suggestion",
      signalIds: cluster.map((s) => s.id),
      signalCount: cluster.length,
      effectiveCount,
      score,
    });
  }

  candidates.sort((a, b) => b.score - a.score || b.effectiveCount - a.effectiveCount);
  const winner = candidates[0] ?? null;
  const second = candidates[1] ?? null;

  let confidence = 0;
  if (winner) {
    if (!second) {
      confidence = clamp(winner.effectiveCount / 5, 0, 1);
    } else {
      confidence = clamp((winner.score - second.score) / winner.score, 0, 1);
    }
  }

  const winnerLabel = winner?.label ?? null;
  const title = winnerLabel ? `Decisión: ${winnerLabel}` : "Sin decisión";
  const summary = winnerLabel
    ? `El público apoya "${winnerLabel}" con ${winner.effectiveCount} señales efectivas.`
    : "No hay señales suficientes para decidir.";
  const rationale = winnerLabel
    ? `${title} — ${winner.score.toFixed(2)} puntos frente a ${second ? `${second.label} (${second.score.toFixed(2)})` : "ninguna alternativa"} a partir de ${signals.length} señales (${winner.signalCount} en el candidato ganador).`
    : "Sin candidatos puntuables tras moderación y clasificación.";

  return {
    rules,
    signalCount: signals.length,
    classifications,
    candidates,
    winnerLabel,
    confidence,
    title,
    summary,
    rationale,
  };
}

export async function proposeDecision(
  db: Db,
  input: {
    seriesId: string;
    episodeNumber: number;
    windowId?: string;
    rules?: Partial<DecisionRules>;
    useAi?: boolean;
  },
): Promise<{ decisionId: string; winnerLabel: string | null; candidateCount: number }> {
  const conditions = [
    eq(audienceSignals.seriesId, input.seriesId),
    eq(audienceSignals.episodeNumber, input.episodeNumber),
  ];
  if (input.windowId) conditions.push(eq(audienceSignals.windowId, input.windowId));
  const rows = await db
    .select()
    .from(audienceSignals)
    .where(and(...conditions));
  const clean = rows.filter((s) => !s.isSpam);
  const result = decideFromSignals(clean, input.rules);

  const [decision] = await db
    .insert(audienceDecisions)
    .values({
      seriesId: input.seriesId,
      episodeNumber: input.episodeNumber,
      windowId: input.windowId ?? null,
      status: "proposed",
      title: result.title,
      summary: result.summary,
      rationale: result.rationale,
      confidence: result.confidence,
      rules: result.rules as unknown as Record<string, unknown>,
      snapshot: {
        signalCount: result.signalCount,
        classifications: result.classifications,
        candidates: result.candidates,
        winnerLabel: result.winnerLabel,
        confidence: result.confidence,
      },
    })
    .returning({ id: audienceDecisions.id });

  let winnerId: string | null = null;
  for (const candidate of result.candidates) {
    const [row] = await db
      .insert(decisionCandidates)
      .values({
        decisionId: decision.id,
        label: candidate.label,
        summary: candidate.label,
        intent: candidate.intent,
        signalIds: candidate.signalIds,
        signalCount: candidate.signalCount,
        score: candidate.score,
        isWinner: candidate.label === result.winnerLabel,
        rationale: `${candidate.intent === "vote" ? "Voto explícito" : "Sugerencia espontánea"} con ${candidate.effectiveCount} señales efectivas.`,
      })
      .returning({ id: decisionCandidates.id });
    if (candidate.label === result.winnerLabel) winnerId = row.id;
  }

  if (winnerId) {
    await db
      .update(audienceDecisions)
      .set({ winningCandidateId: winnerId })
      .where(eq(audienceDecisions.id, decision.id));
  }

  if (input.useAi) {
    try {
      await enrichDecisionWithAi(db, decision.id);
    } catch {
      // Deterministic result remains authoritative when AI enrichment is unavailable.
    }
  }

  return {
    decisionId: decision.id,
    winnerLabel: result.winnerLabel,
    candidateCount: result.candidates.length,
  };
}

const ClassifyOutputSchema = z.object({
  classifications: z.array(z.object({ id: z.string(), intent: z.string() })),
});

const DecideOutputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  rationale: z.string(),
});

async function enrichDecisionWithAi(db: Db, decisionId: string): Promise<void> {
  if (!process.env.OPENAI_API_KEY) return;
  const [decision] = await db
    .select()
    .from(audienceDecisions)
    .where(eq(audienceDecisions.id, decisionId));
  if (!decision) return;
  const candidates = await db
    .select()
    .from(decisionCandidates)
    .where(eq(decisionCandidates.decisionId, decisionId));
  const snapshot = decision.snapshot as Record<string, unknown>;

  const classifyPrompt = await getActivePrompt(db, "audience.classify");
  if (classifyPrompt) {
    const variables = {
      signals: JSON.stringify(snapshot.classifications ?? []),
    };
    const { rendered } = renderTemplate(classifyPrompt.template, variables, classifyPrompt.variables);
    await generateStructured({ prompt: rendered, schema: ClassifyOutputSchema });
    const [snap] = await db
      .insert(promptSnapshots)
      .values({
        templateId: classifyPrompt.templateId,
        versionId: classifyPrompt.versionId,
        renderedText: rendered,
        variables,
        model: "gpt-4o-mini",
        params: {},
      })
      .returning({ id: promptSnapshots.id });
    await db
      .update(audienceDecisions)
      .set({ classifySnapshotId: snap.id })
      .where(eq(audienceDecisions.id, decisionId));
  }

  const decidePrompt = await getActivePrompt(db, "audience.decide");
  if (decidePrompt) {
    const variables = {
      candidates: JSON.stringify(candidates.map((c) => ({ label: c.label, intent: c.intent, score: c.score }))),
    };
    const { rendered } = renderTemplate(decidePrompt.template, variables, decidePrompt.variables);
    const object = await generateStructured({ prompt: rendered, schema: DecideOutputSchema });
    const [snap] = await db
      .insert(promptSnapshots)
      .values({
        templateId: decidePrompt.templateId,
        versionId: decidePrompt.versionId,
        renderedText: rendered,
        variables,
        model: "gpt-4o-mini",
        params: {},
      })
      .returning({ id: promptSnapshots.id });
    await db
      .update(audienceDecisions)
      .set({
        decideSnapshotId: snap.id,
        title: object.title,
        summary: object.summary,
        rationale: object.rationale,
      })
      .where(eq(audienceDecisions.id, decisionId));
  }
}

export async function approveDecision(
  db: Db,
  decisionId: string,
  input?: { candidateId?: string; by?: string },
): Promise<void> {
  const [decision] = await db
    .select()
    .from(audienceDecisions)
    .where(eq(audienceDecisions.id, decisionId));
  if (!decision) throw new Error("Decision not found");
  if (decision.status !== "proposed") throw new Error(`Decision is ${decision.status}, not proposed`);

  await db.transaction(async (tx) => {
    if (input?.candidateId) {
      const [candidate] = await tx
        .select()
        .from(decisionCandidates)
        .where(and(eq(decisionCandidates.id, input.candidateId), eq(decisionCandidates.decisionId, decisionId)));
      if (!candidate) throw new Error("Candidate not found for this decision");
      await tx
        .update(decisionCandidates)
        .set({ isWinner: false })
        .where(eq(decisionCandidates.decisionId, decisionId));
      await tx
        .update(decisionCandidates)
        .set({ isWinner: true })
        .where(eq(decisionCandidates.id, input.candidateId));
      await tx
        .update(audienceDecisions)
        .set({ winningCandidateId: input.candidateId, status: "approved", approvedBy: input.by ?? null, approvedAt: new Date(), updatedAt: new Date() })
        .where(eq(audienceDecisions.id, decisionId));
    } else {
      await tx
        .update(audienceDecisions)
        .set({ status: "approved", approvedBy: input?.by ?? null, approvedAt: new Date(), updatedAt: new Date() })
        .where(eq(audienceDecisions.id, decisionId));
    }
  });
}

export async function rejectDecision(db: Db, decisionId: string, by?: string): Promise<void> {
  const [decision] = await db
    .select()
    .from(audienceDecisions)
    .where(eq(audienceDecisions.id, decisionId));
  if (!decision) throw new Error("Decision not found");
  if (decision.status !== "proposed") throw new Error(`Decision is ${decision.status}, not proposed`);
  await db
    .update(audienceDecisions)
    .set({ status: "rejected", approvedBy: by ?? null, updatedAt: new Date() })
    .where(eq(audienceDecisions.id, decisionId));
}

export async function listDecisions(
  db: Db,
  seriesId: string,
  episodeNumber?: number,
): Promise<(typeof audienceDecisions.$inferSelect)[]> {
  return db
    .select()
    .from(audienceDecisions)
    .where(
      episodeNumber === undefined
        ? eq(audienceDecisions.seriesId, seriesId)
        : and(eq(audienceDecisions.seriesId, seriesId), eq(audienceDecisions.episodeNumber, episodeNumber)),
    )
    .orderBy(desc(audienceDecisions.createdAt));
}

export async function getDecision(db: Db, decisionId: string) {
  const [decision] = await db
    .select()
    .from(audienceDecisions)
    .where(eq(audienceDecisions.id, decisionId));
  if (!decision) return null;
  const candidates = await db
    .select()
    .from(decisionCandidates)
    .where(eq(decisionCandidates.decisionId, decisionId))
    .orderBy(desc(decisionCandidates.score));
  return { decision, candidates };
}
