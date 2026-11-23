import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, role: string): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: role, exact: true }).click();
  await expect(page.getByTestId("user-menu")).toHaveText(role, {
    ignoreCase: true,
  });
}

test("F-44 lab in-charge resolves the seeded FPGA conflict and the winner is notified", async ({
  page,
  browser,
}) => {
  await signIn(page, "In-charge");
  await page.goto("/conflicts");
  await page.getByRole("link", { name: "FPGA Board A" }).click();
  const table = page.getByRole("table");
  await expect(table.getByRole("row").nth(1)).toContainText(
    "Low-power sensor network",
  );
  await expect(table.getByRole("row").nth(1)).toContainText("Rule-based");
  await page.getByTestId("conflict-accept").click();
  await expect(
    page.getByRole("heading", { name: "Resolution", exact: true }),
  ).toBeVisible();
  const student = await browser.newPage();
  try {
    await signIn(student, "Student");
    await student.goto("/notifications");
    await expect(
      student.getByRole("listitem").filter({ hasText: "FPGA Board A" }),
    ).toContainText("Booking approved");
  } finally {
    await student.close();
  }
});

test("F-12 guest equipment suggestions work without Gemini credentials", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("search-input").fill("a board for FPGA prototyping");
  await page.getByRole("button", { name: "Get suggestions" }).click();
  const suggestions = page.getByRole("region", {
    name: "Equipment suggestions",
  });
  await expect(suggestions).toContainText("Smart suggestions (rule-based)");
  await expect(
    suggestions.getByRole("link", { name: "FPGA Board A" }),
  ).toBeVisible();
});
