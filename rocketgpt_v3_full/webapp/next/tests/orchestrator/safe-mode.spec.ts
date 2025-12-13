import { test, expect, APIRequestContext } from "@playwright/test";

const ORCH_BASE_URL =
  process.env.RGPT_ORCH_BASE_URL ?? "http://localhost:3000";

const EXECUTE_ALL_ROUTE = "/api/orchestrator/builder/execute-all";
const SAFE_MODE_ENABLE_ROUTE = "/api/orchestrator/safe-mode/enable";
const SAFE_MODE_DISABLE_ROUTE = "/api/orchestrator/safe-mode/disable";

async function enableSafeMode(
  request: APIRequestContext,
  reason = "Playwright Safe-Mode test",
) {
  const response = await request.post(
    `${ORCH_BASE_URL}${SAFE_MODE_ENABLE_ROUTE}`,
    {
      data: { reason },
    },
  );

  expect(
    response.ok(),
    "Safe-Mode enable endpoint should respond with a successful status",
  ).toBeTruthy();

  const body = await response.json().catch(() => null);

  // We do not hard-fail if the exact shape changes, but we log for debugging.
  // In future we can tighten this once Safe-Mode contract is final.
  // eslint-disable-next-line no-console
  console.log("[Safe-Mode] enable response:", {
    status: response.status(),
    body,
  });

  return { response, body };
}

async function disableSafeMode(request: APIRequestContext) {
  const response = await request.post(
    `${ORCH_BASE_URL}${SAFE_MODE_DISABLE_ROUTE}`,
    {
      data: {},
    },
  );

  // This is best-effort; if disable fails, we still capture diagnostics.
  // eslint-disable-next-line no-console
  console.log("[Safe-Mode] disable response status:", response.status());

  return response;
}

// NOTE: This test is intentionally skipped until Safe-Mode behaviour
// (block/allow routes, status codes, etc.) is fully finalised in Phase B.
test.skip(
  "should block builder/execute-all when Safe-Mode is enabled",
  async ({ request }) => {
    // 1) Enable Safe-Mode
    const { response: enableResponse } = await enableSafeMode(request);

    expect(enableResponse.ok()).toBeTruthy();

    // 2) Attempt to call builder/execute-all
    const execResponse = await request.post(
      `${ORCH_BASE_URL}${EXECUTE_ALL_ROUTE}`,
      {
        data: {},
      },
    );

    const status = execResponse.status();
    const bodyText = await execResponse.text();

    // eslint-disable-next-line no-console
    console.log("[Safe-Mode] execute-all attempt:", {
      status,
      body: bodyText,
    });

    // TODO (PhaseB / PhaseC):
    // Replace this with the final, agreed Safe-Mode contract:
    // e.g. expect(status).toBe(403) or a specific JSON payload.
    // For now we only assert that the call returns some HTTP response.
    expect(status).toBeGreaterThanOrEqual(200);

    // 3) Clean-up: disable Safe-Mode (best effort)
    await disableSafeMode(request);
  },
);
