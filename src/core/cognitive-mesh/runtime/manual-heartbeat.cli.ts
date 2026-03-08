import { runSingleManualHeartbeat } from "./manual-heartbeat-runner";

async function main(): Promise<void> {
  const result = await runSingleManualHeartbeat({
    runtimeId: process.env.RGPT_RUNTIME_ID,
    requestId: process.env.RGPT_HEARTBEAT_REQUEST_ID ?? `hb_req_${Date.now()}`,
    sessionId: process.env.RGPT_HEARTBEAT_SESSION_ID,
    killSwitchPath: process.env.RGPT_HEARTBEAT_KILL_SWITCH_PATH,
    env: process.env,
  });

  if (!result.emitted) {
    console.log(
      JSON.stringify(
        {
          status: "blocked",
          reasonCodes: result.decision.reasonCodes,
          metadata: result.decision.metadata,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(
    JSON.stringify(
      {
        status: "emitted",
        ledgerEntryId: result.ledgerEntryId,
        signalId: result.runtimeSignal?.signalId,
        heartbeat: result.heartbeatSignal,
      },
      null,
      2
    )
  );
}

void main();

