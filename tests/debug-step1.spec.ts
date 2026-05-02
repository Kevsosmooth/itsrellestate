import { test, expect, Page } from "@playwright/test";

async function dismissResumeBanner(page: Page) {
  const startFresh = page.getByRole("button", { name: "Start Fresh" });
  if (await startFresh.isVisible({ timeout: 2000 }).catch(() => false)) {
    await startFresh.click();
  }
}

test("debug tenant step 1 validation", async ({ page }) => {
  await page.goto("/apply/tenant");
  await dismissResumeBanner(page);

  await page.fill("#firstName", "Autotest");
  await page.fill("#lastName", "Submission");
  await page.fill("#dateOfBirth", "01-15-1990");
  await page.fill("#cellPhone", "(555) 000-0001");
  await page.fill("#email", "e2e-test@example.com");

  const boroughGroup = page.locator('[aria-label="preferredBorough"]');
  await boroughGroup.getByRole("radio", { name: "The Bronx" }).click();

  await page.fill("#currentStreet", "999 Test Ave");
  await page.fill("#currentCity", "New York");
  await page.locator("#currentState").selectOption("NY");
  await page.fill("#currentZip", "10001");

  const viewedGroup = page.locator('[aria-label="viewedApartment"]');
  await viewedGroup.getByRole("radio", { name: "Yes, I have" }).click();

  await page.screenshot({ path: "tests/debug-before-next.png", fullPage: true });

  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.waitForTimeout(1000);
  await page.screenshot({ path: "tests/debug-after-next.png", fullPage: true });

  // Check if we advanced or got an error
  const errorAlert = page.locator('[role="alert"]');
  if (await errorAlert.isVisible()) {
    const errorText = await errorAlert.textContent();
    console.log("VALIDATION ERROR:", errorText);

    // Find which fields have errors
    const errorMessages = page.locator(".text-error");
    const count = await errorMessages.count();
    for (let i = 0; i < count; i++) {
      const text = await errorMessages.nth(i).textContent();
      console.log(`  Error ${i + 1}:`, text);
    }
  }

  const step2Visible = await page.getByText("Rental Assistance").isVisible().catch(() => false);
  console.log("Advanced to step 2:", step2Visible);
});
