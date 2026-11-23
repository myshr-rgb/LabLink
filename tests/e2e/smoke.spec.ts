import { expect, test } from "@playwright/test";

test("F-72 guest can open the home page and health probe", async ({
  page,
  request,
}) => {
  const home = await page.goto("/");
  const policy = home?.headers()["content-security-policy"] ?? "";
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  expect(nonce).toBeTruthy();
  expect(
    await page
      .locator("script[nonce]")
      .first()
      .evaluate((script) => (script as HTMLScriptElement).nonce),
  ).toBe(nonce);
  await expect(
    page.getByRole("heading", { name: "Find the lab equipment you need" }),
  ).toBeVisible();
  const health = await request.get("/api/health");
  expect(health.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(health.headers()["x-content-type-options"]).toBe("nosniff");
  expect(health.headers()["content-security-policy"]).not.toBe(policy);
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ data: { status: "ok" } });
});
