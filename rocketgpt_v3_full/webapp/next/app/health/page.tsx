export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import HealthDashboard, {
  OrchestratorHealthResponse,
} from "./HealthDashboard";

function getOrchestratorBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_ORCH_BASE_URL &&
    process.env.NEXT_PUBLIC_ORCH_BASE_URL.length > 0
      ? process.env.NEXT_PUBLIC_ORCH_BASE_URL
      : "http://localhost:3000";

  return raw.replace(/\/$/, "");
}

async function fetchOrchestratorHealth(): Promise<OrchestratorHealthResponse | null> {
  const base = getOrchestratorBaseUrl();
  const url = `${base}/api/orchestrator/health`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[/health] Initial fetch failed:", res.status);
      return null;
    }

    const data = (await res.json()) as OrchestratorHealthResponse;
    return data;
  } catch (err) {
    console.error("[/health] Initial fetch error:", err);
    return null;
  }
}

export default async function HealthPage() {
  const initialData = await fetchOrchestratorHealth();
  return <HealthDashboard initialData={initialData} />;
}
