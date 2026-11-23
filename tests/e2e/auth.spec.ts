import { expect, test } from "@playwright/test";

for (const [label, role] of [
  ["Student", "student"],
  ["Faculty", "faculty"],
  ["In-charge", "incharge"],
  ["Admin", "admin"],
]) {
  test(`UX-03 demo ${label} receives a protected role cookie and can sign out`, async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await page
      .getByRole("group", { name: "Try a demo account" })
      .getByRole("button", { name: label, exact: true })
      .click();
    await expect(page.getByTestId("user-menu")).toHaveText(label, {
      ignoreCase: true,
    });
    expect(await (await page.request.get("/api/auth/me")).json()).toMatchObject(
      { data: { role } },
    );
    expect(
      (await context.cookies()).find((cookie) => cookie.name === "lablink_sid"),
    ).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
    await page.getByTestId("user-menu").click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true }),
    ).toBeVisible();
    expect(await (await page.request.get("/api/auth/me")).json()).toEqual({
      data: null,
    });
  });
}

test("UX-02 signup signs a guest into a student account", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Name", { exact: true }).fill("Chromium Student");
  await page.getByLabel("Email", { exact: true }).fill("chromium@example.edu");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Desk lights and boards");
  await page.getByTestId("signup-submit").click();
  await expect(page.getByTestId("user-menu")).toHaveText("student");
});
