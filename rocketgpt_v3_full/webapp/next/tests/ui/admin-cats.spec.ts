import { expect, test } from "@playwright/test";

test.describe("Admin CATS UI", () => {
  test("loads admin list and creates a CAT", async ({ page }) => {
    const catName = `UI Smoke CAT ${Date.now()}`;
    const createdCatId = "00000000-0000-4000-8000-000000000010";

    await page.route("**/api/_admin/cats*", async (route, request) => {
      const pathname = new URL(request.url()).pathname;
      const method = request.method();
      if (method === "GET" && pathname === "/api/_admin/cats") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ page: 1, pageSize: 50, total: 0, items: [] }),
        });
      }
      if (method === "POST" && pathname === "/api/_admin/cats") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: createdCatId,
            tenant_id: "00000000-0000-4000-8000-000000000001",
            owner_user_id: "00000000-0000-4000-8000-000000000002",
            name: catName,
            description: "created from playwright",
            status: "draft",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      }
      return route.fallback();
    });

    await page.route(`**/api/_admin/cats/${createdCatId}*`, async (route, request) => {
      if (request.method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: createdCatId,
            tenant_id: "00000000-0000-4000-8000-000000000001",
            owner_user_id: "00000000-0000-4000-8000-000000000002",
            name: catName,
            description: "created from playwright",
            status: "draft",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      }
      return route.fallback();
    });

    await page.route(`**/api/_admin/cats/${createdCatId}/versions*`, async (route, request) => {
      if (request.method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [] }),
        });
      }
      return route.fallback();
    });

    await page.goto("/admin/cats");
    await expect(page.getByText("Admin CATS Registry")).toBeVisible();

    await page.getByRole("link", { name: "Create CAT" }).click();
    await expect(page.getByRole("heading", { name: "Create CAT" })).toBeVisible();

    await page.getByLabel("Name").fill(catName);
    await page.getByLabel("Description").fill("created from playwright");
    await page.getByRole("button", { name: "Create Draft CAT" }).click();

    await expect(page).toHaveURL(`/admin/cats/${createdCatId}`, { timeout: 20000 });
    await expect(page.getByText("CAT Detail")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Metadata" })).toBeVisible();
  });
});
