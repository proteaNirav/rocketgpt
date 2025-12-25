import { NextResponse } from "next/server";
import type { OrchestratorResponse, OrchestratorStage } from "./responseEnvelope";
import type { ErrorEnvelope } from "./errorEnvelope";

type JsonResponseInit = {
  status?: number;
  headers?: HeadersInit;
};

/**
 * Build a JSON response for a successful orchestrator call,
 * including correlation + run id headers.
 */
export function respondSuccess<T>(
  run_id: string,
  stage: OrchestratorStage,
  data: T,
  correlationId: string,
  init?: JsonResponseInit
) {
  const body: OrchestratorResponse<T> = {
    success: true,
    run_id,
    stage,
    data,
    error: null,
  };

  const baseHeaders: HeadersInit = {
    "x-correlation-id": correlationId,
    "x-run-id": run_id,
  };

  const headers: HeadersInit = {
    ...baseHeaders,
    ...(init?.headers ?? {}),
  };

  return NextResponse.json(body, {
    ...(init ?? {}),
    headers,
  });
}

/**
 * Build a JSON response for a failed orchestrator call,
 * including correlation + run id headers.
 */
export function respondError(
  run_id: string,
  stage: OrchestratorStage,
  error: ErrorEnvelope,
  correlationId: string,
  init?: JsonResponseInit
) {
  const body: OrchestratorResponse<null> = {
    success: false,
    run_id,
    stage,
    data: null,
    error,
  };

  const baseHeaders: HeadersInit = {
    "x-correlation-id": correlationId,
    "x-run-id": run_id,
  };

  const headers: HeadersInit = {
    ...baseHeaders,
    ...(init?.headers ?? {}),
  };

  const status = init?.status ?? 500;

  return NextResponse.json(body, {
    ...(init ?? {}),
    status,
    headers,
  });
}
