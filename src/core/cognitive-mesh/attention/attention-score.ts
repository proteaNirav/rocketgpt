import type { AttentionBand } from "./attention-types";

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function computeDeadlinePressure(deadlineTs: number | undefined, nowTs: number): number {
  if (!deadlineTs || !Number.isFinite(deadlineTs)) {
    return 0;
  }
  if (deadlineTs <= nowTs) {
    return 1;
  }
  const remainingMs = deadlineTs - nowTs;
  if (remainingMs <= 15 * 60 * 1_000) {
    return 0.95;
  }
  if (remainingMs <= 60 * 60 * 1_000) {
    return 0.75;
  }
  if (remainingMs <= 6 * 60 * 60 * 1_000) {
    return 0.5;
  }
  return 0.1;
}

export function toAttentionBand(score: number): AttentionBand {
  if (score >= 80) {
    return "critical";
  }
  if (score >= 60) {
    return "high";
  }
  if (score >= 35) {
    return "normal";
  }
  return "low";
}

