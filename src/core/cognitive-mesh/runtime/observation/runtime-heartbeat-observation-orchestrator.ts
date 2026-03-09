import { runRuntimeHeartbeatObservationSession } from "./runtime-heartbeat-observation-session";
import type {
  RuntimeHeartbeatObservationRunInput,
  RuntimeHeartbeatObservationRunResult,
} from "./runtime-heartbeat-observation.types";

export async function runRuntimeHeartbeatObservationHarness(
  input: RuntimeHeartbeatObservationRunInput = {}
): Promise<RuntimeHeartbeatObservationRunResult> {
  return runRuntimeHeartbeatObservationSession(input);
}
