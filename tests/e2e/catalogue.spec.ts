import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("F-10/11 guest search combines URL filters and passes catalogue accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  const home = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(home.violations).toEqual([]);
  await page.getByTestId("search-input").fill("FPGA");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Equipment", exact: true }),
  ).toBeVisible();
  const filters = page.getByTestId("equipment-filters");
  await filters.getByLabel("Department").selectOption("ECE");
  await filters.getByLabel("Category").selectOption("electronics");
  await filters.getByLabel("Access type").selectOption("open");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/department=ECE/);
  const filtersUrl = new URL(page.url());
  expect(
    Object.fromEntries(filtersUrl.searchParams),
    filtersUrl.href,
  ).toMatchObject({
    q: "FPGA",
    department: "ECE",
    category: "electronics",
    accessType: "open",
  });
  await expect(
    page.getByRole("heading", { name: "FPGA Board B" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "FPGA Board A" })).toHaveCount(
    0,
  );
  const catalogue = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(catalogue.violations).toEqual([]);
  await page.getByRole("link", { name: "View FPGA Board B" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a time" }),
  ).toBeVisible();
});
