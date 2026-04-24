import { test, expect, Page } from "@playwright/test";

test.setTimeout(120_000);

async function dismissResumeBanner(page: Page) {
  const startFresh = page.getByRole("button", { name: "Start Fresh" });
  if (await startFresh.isVisible({ timeout: 2000 }).catch(() => false)) {
    await startFresh.click();
  }
}

async function clickNext(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

// ---------------------------------------------------------------
// Tenant submission
// ---------------------------------------------------------------

test.describe("Tenant Form - Full Submission", () => {
  test("submits tenant application end-to-end", async ({ page }) => {
    await page.goto("/apply/tenant");
    await dismissResumeBanner(page);

    // Step 1: Contact Info
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
    await clickNext(page);

    // Step 2: Rental Assistance
    await expect(page.getByText("Rental Assistance").first()).toBeVisible();
    const assistGroup = page.locator('[aria-label="hasAssistance"]');
    await assistGroup.getByRole("radio", { name: "No" }).click();

    const shelterGroup = page.locator('[aria-label="fromShelter"]');
    await shelterGroup.getByRole("radio", { name: "No" }).click();

    await page.fill("#landlordName", "Test Landlord");
    await page.fill("#landlordPhone", "(555) 000-0002");
    await clickNext(page);

    // Step 3: Occupants & Work
    await expect(page.getByText("Additional Occupants").first()).toBeVisible();
    const occGroup = page.locator('[aria-label="hasOccupants"]');
    await occGroup.getByRole("radio", { name: "No" }).click();

    const workGroup = page.locator('[aria-label="currentlyWorking"]');
    await workGroup.getByRole("radio", { name: "No" }).click();

    const vetGroup = page.locator('[aria-label="isVeteran"]');
    await vetGroup.getByRole("radio", { name: "No" }).click();

    const taxGroup = page.locator('[aria-label="filedTaxes"]');
    await taxGroup.getByRole("radio", { name: "Yes" }).click();
    await clickNext(page);

    // Step 4: Income & Specialist
    await expect(page.getByText("Income Sources").first()).toBeVisible();
    await page.getByRole("checkbox", { name: "N/A" }).click();
    await clickNext(page);

    // Step 5: Documents -- upload required docs
    // No-assistance path requires: Photo ID, Social Security Card, Tax Returns, Bank Statement
    await expect(page.getByText("Required Documents").first()).toBeVisible();
    const fileInputs = page.locator("input[type='file']");
    const inputCount = await fileInputs.count();
    for (let i = 0; i < inputCount; i++) {
      await fileInputs.nth(i).setInputFiles("tests/.fixtures/test-doc.pdf");
    }
    await clickNext(page);

    // Step 6: Processing Fee
    await expect(page.getByText("Processing Fee").first()).toBeVisible();
    await page.getByRole("checkbox").click();
    await clickNext(page);

    // Step 7: Authorization
    await expect(page.getByText("Lifestyle").first()).toBeVisible();
    const smokerGroup = page.locator('[aria-label="isSmoker"]');
    await smokerGroup.getByRole("radio", { name: "No" }).click();

    const petsGroup = page.locator('[aria-label="hasPets"]');
    await petsGroup.getByRole("radio", { name: "No" }).click();

    await page.getByRole("checkbox", { name: /I have read and agree/ }).click();

    await page.fill("#signatureFirst", "Autotest");
    await page.fill("#signatureLast", "Submission");

    // Submit
    await page.getByRole("button", { name: "Submit Application" }).click();

    const result = await Promise.race([
      page.getByText("Application Submitted").waitFor({ timeout: 30000 }).then(() => "success"),
      page.getByText("Submission failed").waitFor({ timeout: 30000 }).then(() => "error"),
    ]);

    if (result === "error") {
      const errorText = await page.locator('[role="alert"]').textContent();
      throw new Error(`Submission failed with: ${errorText}`);
    }

    expect(result).toBe("success");
  });
});

// ---------------------------------------------------------------
// Landlord submission
// ---------------------------------------------------------------

test.describe("Landlord Form - Full Submission", () => {
  test("submits landlord application end-to-end", async ({ page }) => {
    await page.goto("/apply/landlord");
    await dismissResumeBanner(page);

    // Step 1: Property & Ownership
    await page.fill("#propAddress", "100 Test Property St");
    await page.fill("#propCity", "Brooklyn");
    await page.locator("#propState").selectOption("NY");
    await page.fill("#propZip", "11201");

    await page.locator("#ownershipType").selectOption("individual");
    await page.fill("#taxId", "123-45-6789");
    await page.fill("#legalName", "Autotest Owner");

    const payPrefGroup = page.locator('[aria-label="paymentPreference"]');
    await payPrefGroup.getByRole("radio", { name: "Check" }).click();
    await clickNext(page);

    // Step 2: Contact & Mailing
    await expect(page.getByText("Mailing Address").first()).toBeVisible();
    await page.fill("#mailAddress", "200 Mail Test St");
    await page.fill("#mailCity", "Brooklyn");
    await page.locator("#mailState").selectOption("NY");
    await page.fill("#mailZip", "11201");

    await page.fill("#llFirstName", "Autotest");
    await page.fill("#llLastName", "Landlord");
    await page.fill("#llPhone", "(555) 000-0003");
    await page.fill("#llEmail", "e2e-landlord@example.com");

    const authRepGroup = page.locator('[aria-label="hasAuthRep"]');
    await authRepGroup.getByRole("radio", { name: "No" }).click();
    await clickNext(page);

    // Step 3: Building & Utilities
    await expect(page.getByText("Building Information").first()).toBeVisible();
    await page.locator("#yearBuilt").selectOption({ index: 5 });
    await page.locator("#totalStories").selectOption({ index: 2 });
    await page.fill("#residentialUnits", "4");

    const rentStabGroup = page.locator('[aria-label="rentStabilized"]');
    await rentStabGroup.getByRole("radio", { name: "No" }).click();

    await page.locator("#utilHeating").selectOption({ index: 1 });
    await page.locator("#utilCooking").selectOption({ index: 1 });
    await page.locator("#utilHotWater").selectOption({ index: 1 });
    await page.locator("#utilElectric").selectOption({ index: 1 });
    await page.locator("#utilWater").selectOption({ index: 1 });
    await page.locator("#utilSewer").selectOption({ index: 1 });
    await page.locator("#utilTrash").selectOption({ index: 1 });
    await page.locator("#utilAC").selectOption({ index: 1 });
    await clickNext(page);

    // Step 4: Units for Rent
    await expect(page.getByText("Units for Rent").first()).toBeVisible();
    await page.fill('[id*="unitNumber"]', "1A");
    await page.locator('select[id*="floor"]').first().selectOption({ index: 1 });
    await page.locator('select[id*="bedrooms"]').first().selectOption({ index: 2 });
    await page.fill('[id*="rent"]', "2000");
    await clickNext(page);

    // Step 5: Documents (optional, skip)
    await expect(page.getByText("Supporting Documents").first()).toBeVisible();
    await clickNext(page);

    // Step 6: Payments & POC
    await expect(page.getByText("Accepted Payment Methods").first()).toBeVisible();
    await page.getByRole("checkbox", { name: "Zelle" }).click();
    await page.fill("#zellePhone", "(555) 000-0004");

    await page.fill("#pocFirstName", "Test");
    await page.fill("#pocLastName", "Contact");
    await page.fill("#pocPhone", "(555) 000-0005");
    await page.fill("#pocEmail", "poc@example.com");
    await clickNext(page);

    // Step 7: Review & Submit
    await expect(page.getByText("Submitter Information").first()).toBeVisible();
    await page.locator("#submitterTitle").selectOption({ index: 1 });
    await page.getByRole("checkbox", { name: /I have read and agree/ }).click();
    await page.fill("#signatureFirst", "Autotest");
    await page.fill("#signatureLast", "Landlord");

    // Submit
    await page.getByRole("button", { name: "Submit Application" }).click();

    const result = await Promise.race([
      page.getByText("Application Submitted").waitFor({ timeout: 30000 }).then(() => "success"),
      page.getByText("Submission failed").waitFor({ timeout: 30000 }).then(() => "error"),
    ]);

    if (result === "error") {
      const errorText = await page.locator('[role="alert"]').textContent();
      throw new Error(`Submission failed with: ${errorText}`);
    }

    expect(result).toBe("success");
  });
});
