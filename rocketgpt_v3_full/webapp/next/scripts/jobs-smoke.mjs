import { JOB_TYPES, enqueue, getJob } from "../lib/jobs/queue.mjs";
import { runWorkerLoop } from "../lib/jobs/worker.mjs";

async function main() {
  const queued = enqueue(JOB_TYPES.RESEARCH_PACK_BUILD, {
    topic: "demo research pack",
  });
  console.log(JSON.stringify({ step: "enqueued", runId: queued.runId, telemetry: queued.telemetry }, null, 2));

  const worker = await runWorkerLoop({
    workerId: "smoke-cli-worker",
    jobTypes: [JOB_TYPES.RESEARCH_PACK_BUILD],
    pollMs: 20,
    idleExitMs: 300,
    maxIterations: 10,
  });
  console.log(JSON.stringify({ step: "worker", worker }, null, 2));

  const job = getJob(queued.runId);
  console.log(JSON.stringify({ step: "result", job }, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exitCode = 1;
});

