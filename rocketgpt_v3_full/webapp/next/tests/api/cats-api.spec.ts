import { expect, test } from "@playwright/test";

const tenantId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";

function headers() {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
  };
}

test.describe("CATS API", () => {
  test("create, transition, publish version, list", async ({ request }) => {
    const name = `API Smoke CAT ${Date.now()}`;

    const createRes = await request.post("/api/cats", {
      headers: { ...headers(), "content-type": "application/json" },
      data: { name, description: "api smoke" },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    expect(created.name).toBe(name);
    expect(created.status).toBe("draft");

    const catId = created.id as string;

    const listRes = await request.get("/api/cats?page=1&pageSize=50", { headers: headers() });
    expect(listRes.status()).toBe(200);
    const listed = await listRes.json();
    expect(Array.isArray(listed.items)).toBeTruthy();
    expect(listed.items.some((row: any) => row.id === catId)).toBeTruthy();

    const transitionRes = await request.post(`/api/cats/${catId}/transition`, {
      headers: { ...headers(), "content-type": "application/json" },
      data: { targetStatus: "review" },
    });
    expect(transitionRes.status()).toBe(200);
    const transitioned = await transitionRes.json();
    expect(transitioned.status).toBe("review");

    const backToDraft = await request.post(`/api/cats/${catId}/transition`, {
      headers: { ...headers(), "content-type": "application/json" },
      data: { targetStatus: "draft" },
    });
    expect(backToDraft.status()).toBe(200);

    const publishRes = await request.post(`/api/cats/${catId}/versions`, {
      headers: { ...headers(), "content-type": "application/json" },
      data: {
        version: "1.0.0",
        manifestJson: { entrypoint: "run" },
        rulebookJson: { policy: "strict" },
        commandBundleRef: "cats/bundles/api-smoke",
      },
    });
    expect(publishRes.status()).toBe(201);
    const published = await publishRes.json();
    expect(published.version).toBe("1.0.0");
    expect(published.status).toBe("published");

    const versionsRes = await request.get(`/api/cats/${catId}/versions`, { headers: headers() });
    expect(versionsRes.status()).toBe(200);
    const versions = await versionsRes.json();
    expect(Array.isArray(versions.items)).toBeTruthy();
    expect(versions.items.some((row: any) => row.version === "1.0.0")).toBeTruthy();
  });
});
