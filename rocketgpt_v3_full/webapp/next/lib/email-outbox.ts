const OUTBOX_KEY = "rgpt.email.outbox.v1";
const MAX_EMAILS = 100;

export type DemoEmail = {
  id: string;
  subject: string;
  to: string;
  body: string;
  createdAt: string;
};

function safeParse(raw: string | null): DemoEmail[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DemoEmail[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadEmailOutbox(): DemoEmail[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(OUTBOX_KEY));
}

export function pushEmailOutbox(input: Omit<DemoEmail, "id" | "createdAt">): DemoEmail {
  if (typeof window === "undefined") {
    return {
      id: "server-noop",
      createdAt: new Date().toISOString(),
      ...input,
    };
  }

  const next: DemoEmail = {
    ...input,
    id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  const existing = loadEmailOutbox();
  const updated = [next, ...existing].slice(0, MAX_EMAILS);
  window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(updated));
  return next;
}

export function buildWorkflowRunReportEmail(runId: string, workflowId: string, lines: Array<{ step: string; status: string; durationMs: number }>): Omit<DemoEmail, "id" | "createdAt"> {
  const summary = lines
    .map((item, index) => `${index + 1}. ${item.step}: ${item.status} (${item.durationMs}ms)`)
    .join("\n");

  return {
    to: "demo@rocketgpt.local",
    subject: `Workflow Run Report - ${runId}`,
    body: [
      `Workflow: ${workflowId}`,
      `Run: ${runId}`,
      "",
      "Step Results:",
      summary || "No steps executed.",
      "",
      "TODO: SMTP delivery is intentionally disabled in demo mode.",
    ].join("\n"),
  };
}

export { OUTBOX_KEY as EMAIL_OUTBOX_KEY };
