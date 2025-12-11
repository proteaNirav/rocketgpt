export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import { ensureCorrelationId, newCorrelationId } from "@/app/api/orchestrator/utils/correlation";
import { wrapError } from "@/app/api/orchestrator/utils/errorEnvelope";
import { respondSuccess, respondError } from "@/app/api/orchestrator/utils/httpResponse";

const STAGE = "orchestrator-test";

export async function GET(request: Request) {
  const headers = request.headers;

  const correlationId = ensureCorrelationId(headers);
  const existingRunId = headers.get("x-run-id");
  const run_id = existingRunId ?? newCorrelationId();

  try {
    // Build a small diagnostic echo of selected incoming headers
    const echoHeaders: Record<string, string | null> = {
      "user-agent": headers.get("user-agent"),
      "x-correlation-id": headers.get("x-correlation-id"),
    };

    const data = {
      status: "ok",
      service: "orchestrator",
      stage: STAGE,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      echo_headers: echoHeaders,
    };

    return respondSuccess(run_id, STAGE, data, correlationId);
  } catch (error: any) {
    const errEnvelope = wrapError(error, STAGE);

    return respondError(run_id, STAGE, errEnvelope, correlationId, {
      status: 500,
    });
  }
}

