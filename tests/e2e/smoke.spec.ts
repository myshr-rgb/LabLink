import { expect, test } from "@playwright/test";

test("F-72 guest can open the home page and health probe", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "LabLink" })).toBeVisible();
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: "ok" });
});
