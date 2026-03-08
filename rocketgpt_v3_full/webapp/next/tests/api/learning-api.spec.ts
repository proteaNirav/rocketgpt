import { expect, test } from "@playwright/test";

const tenantId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";

function adminHeaders() {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-governance-role": "admin",
    "x-admin-token": "dev-admin-token",
    "content-type": "application/json",
  };
}

test.describe("Learning API", () => {
  test("source -> ingest -> propose -> approve -> publish", async ({ request }) => {
    const rssXml = encodeURIComponent(
      `<rss><channel><item><title>Policy Update</title><link>https://example.com/policy</link><description>New governance process published.</description></item></channel></rss>`
    );
    const sourceRes = await request.post("/api/learning/sources", {
      headers: adminHeaders(),
      data: {
        kind: "rss",
        name: `RSS Source ${Date.now()}`,
        sourceUrl: `data:text/xml,${rssXml}`,
        enabled: true,
        intervalMinutes: 60,
      },
    });
    expect(sourceRes.status()).toBe(201);
    const source = await sourceRes.json();

    const runRes = await request.post(`/api/learning/sources/${source.id}/run`, {
      headers: adminHeaders(),
      data: {},
    });
    expect(runRes.status()).toBe(200);
    const run = await runRes.json();
    expect(run.proposedCount).toBeGreaterThanOrEqual(1);

    const chatRes = await request.post("/api/learning/items/propose-chat", {
      headers: adminHeaders(),
      data: {
        force: true,
        title: "Chat policy learning",
        text: "Please learn this governance checklist for incidents. Root cause, runbook update, policy update, and reviewer sign-off are required for production actions.",
      },
    });
    expect(chatRes.status()).toBe(200);
    const chat = await chatRes.json();
    expect(chat.accepted).toBeTruthy();

    const listRes = await request.get("/api/learning/items?status=proposed", {
      headers: adminHeaders(),
    });
    expect(listRes.status()).toBe(200);
    const listed = await listRes.json();
    expect(Array.isArray(listed.items)).toBeTruthy();
    const itemId = listed.items[0]?.id as string;
    expect(itemId).toBeTruthy();

    const approveRes = await request.post(`/api/learning/items/${itemId}/review`, {
      headers: adminHeaders(),
      data: { decision: "approve", rationale: "smoke approval" },
    });
    expect(approveRes.status()).toBe(200);

    const publishRes = await request.post(`/api/learning/items/${itemId}/publish`, {
      headers: adminHeaders(),
      data: { libraryId: "smoke-lib" },
    });
    expect(publishRes.status()).toBe(200);
    const published = await publishRes.json();
    expect(String(published.filePath || "")).toContain("docs/libraries/smoke-lib/");

    const publishedList = await request.get("/api/learning/published", { headers: adminHeaders() });
    expect(publishedList.status()).toBe(200);
    const body = await publishedList.json();
    expect((body.items || []).some((row: any) => row.id === itemId)).toBeTruthy();
  });
});
