import { JOB_TYPES } from "../lib/jobs/queue.mjs";
import { runWorkerLoop } from "../lib/jobs/worker.mjs";

function parseArgs(argv) {
  const out = {
    once: false,
    pollMs: 300,
    idleExitMs: 3_000,
    jobTypes: null,
  };
  for (const arg of argv) {
    if (arg === "--once") out.once = true;
    else if (arg.startsWith("--poll-ms=")) out.pollMs = Number(arg.split("=")[1] || 300);
    else if (arg.startsWith("--idle-exit-ms=")) out.idleExitMs = Number(arg.split("=")[1] || 3_000);
    else if (arg.startsWith("--types=")) {
      const parsed = String(arg.split("=")[1] || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      out.jobTypes = parsed.length > 0 ? parsed : null;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const jobTypes = args.jobTypes || Object.values(JOB_TYPES);
  const result = await runWorkerLoop({
    workerId: "worker-cli",
    pollMs: args.pollMs,
    idleExitMs: args.once ? 50 : args.idleExitMs,
    maxIterations: args.once ? 1 : 100_000,
    jobTypes,
  });
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exitCode = 1;
});

