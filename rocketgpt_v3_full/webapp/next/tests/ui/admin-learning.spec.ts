import { expect, test } from "@playwright/test";

test.describe("Admin Learning UI", () => {
  test("inbox and sources pages render", async ({ page }) => {
    const itemId = "00000000-0000-4000-8000-000000000099";

    await page.route("**/api/_admin/learning/items**", async (route, req) => {
      if (req.method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: itemId,
                title: "Mock learning item",
                status: "proposed",
                source_kind: "chat",
                source_ref: null,
                sanitized_content: "Mock sanitized text",
                created_at: new Date().toISOString(),
                topics: ["governance"],
                libraryPath: null,
              },
            ],
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: itemId, status: "approved" }) });
    });

    await page.route("**/api/_admin/learning/sources**", async (route, req) => {
      if (req.method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "00000000-0000-4000-8000-000000000111",
                kind: "rss",
                name: "Mock RSS",
                source_url: "https://example.com/rss.xml",
                enabled: true,
                interval_minutes: 60,
                last_run_at: null,
                last_error: null,
              },
            ],
          }),
        });
      }
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.route("**/api/_admin/learning/sources/*/run", async (route) => {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ sourceId: "x", fetchedCount: 1, proposedCount: 1 }) });
    });

    await page.goto("/admin/learning");
    await expect(page.getByRole("heading", { name: "Learning Inbox" })).toBeVisible();
    await expect(page.getByText("Mock learning item")).toBeVisible();

    await page.goto("/admin/learning/sources");
    await expect(page.getByRole("heading", { name: "Learning Sources" })).toBeVisible();
    await expect(page.getByText("Mock RSS")).toBeVisible();
  });
});
