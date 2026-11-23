import { expect, test, type Page } from "@playwright/test";

async function demo(page: Page, role: string): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: role, exact: true }).click();
  await expect(page.getByTestId("user-menu")).toHaveText(role, {
    ignoreCase: true,
  });
}
async function equipment(page: Page, name: string): Promise<void> {
  await page.goto(`/equipment?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name: `View ${name}`, exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
async function chooseFirstSlot(page: Page): Promise<void> {
  const first = page
    .getByTestId("slot-button")
    .filter({ hasText: "Free" })
    .first();
  await first.focus();
  await first.press("Enter");
  await expect(first).toHaveAttribute("aria-pressed", "true");
}

test("F-20/21 guest booking resumes after sign-in and can be modified and cancelled", async ({
  page,
}) => {
  await equipment(page, "Raspberry Pi 5");
  await page.getByRole("button", { name: "List view" }).click();
  await chooseFirstSlot(page);
  await page.getByRole("button", { name: "Book this slot" }).click();
  const dialog = page.getByTestId("auth-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Raspberry Pi 5");
  await dialog.getByRole("button", { name: "Student", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Booking confirmed" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View my bookings" }).click();
  const booking = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Raspberry Pi 5" }) });
  await expect(booking).toContainText("Approved");
  await booking.getByRole("link", { name: "Modify booking" }).click();
  await page
    .getByTestId("slot-button")
    .filter({ hasText: "Free" })
    .nth(1)
    .click();
  await page.getByTestId("book-submit").click();
  await expect(
    page.getByRole("heading", { name: "Booking confirmed" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View my bookings" }).click();
  await booking.getByRole("button", { name: "Cancel booking" }).click();
  await booking.getByRole("button", { name: "Yes, cancel" }).click();
  await expect(booking).toHaveCount(0);
  await page.getByRole("link", { name: "Past", exact: true }).click();
  await expect(booking).toContainText("Cancelled");
});

test("F-30/31/33/50 faculty approves a project request and the student reads the notice", async ({
  page,
  browser,
}) => {
  await demo(page, "Student");
  await page.goto("/projects/new");
  await page.getByLabel("Project title").fill("Chromium bench project");
  await page
    .getByLabel("Description")
    .fill("Compare simulation results across two benchmarks.");
  await page
    .getByLabel("Faculty guide")
    .selectOption({ label: "Demo faculty" });
  const deadline = new Date(+new Date() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 16);
  await page.getByLabel("Deadline (IST)", { exact: true }).fill(deadline);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(
    page.getByRole("heading", { name: "Chromium bench project" }),
  ).toBeVisible();
  await equipment(page, "GPU Workstation A");
  await chooseFirstSlot(page);
  await page
    .getByLabel("Project", { exact: true })
    .selectOption({ label: "Chromium bench project" });
  await page.getByRole("button", { name: "Suggest justification" }).click();
  await expect(
    page.getByText("Rule-based suggestion. Review the text before sending."),
  ).toBeVisible();
  await page
    .getByLabel("Purpose")
    .fill("Benchmark a campus sensor simulation.");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(
    page.getByRole("heading", { name: "Request sent" }),
  ).toBeVisible();

  const guide = await browser.newPage();
  try {
    await demo(guide, "Faculty");
    await guide.goto("/approvals");
    const request = guide
      .getByRole("listitem")
      .filter({ hasText: "Chromium bench project" });
    await request.getByTestId("approve-request").click();
    await expect(request).toHaveCount(0);
  } finally {
    await guide.close();
  }
  await page.goto("/bookings");
  await expect(
    page.getByRole("listitem").filter({
      has: page.getByRole("heading", { name: "GPU Workstation A" }),
    }),
  ).toContainText("Approved");
  await page.goto("/notifications");
  const notice = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Booking approved" }) })
    .filter({ hasText: "GPU Workstation A" });
  await notice.getByRole("button", { name: "Mark as read" }).click();
  await expect(notice).toContainText("· Read");
});
