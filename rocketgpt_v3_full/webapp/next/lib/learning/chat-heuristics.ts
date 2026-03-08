export function isLearningWorthyChatText(input: string): boolean {
  const text = String(input ?? "").trim();
  if (text.length < 80) return false;
  if (text.split(/\s+/).length < 12) return false;
  const lowered = text.toLowerCase();
  const signals = [
    "learn",
    "remember",
    "policy",
    "postmortem",
    "incident",
    "runbook",
    "root cause",
    "standard operating",
    "governance",
    "checklist",
    "playbook",
  ];
  let score = 0;
  for (const signal of signals) {
    if (lowered.includes(signal)) score += 1;
  }
  return score >= 2;
}
