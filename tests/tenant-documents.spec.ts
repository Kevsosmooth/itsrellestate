import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const DUMMY_DIR = path.join(__dirname, ".fixtures");
const DUMMY_PDF = path.join(DUMMY_DIR, "test-doc.pdf");
const DUMMY_JPG = path.join(DUMMY_DIR, "test-photo.jpg");

test.beforeAll(() => {
  fs.mkdirSync(DUMMY_DIR, { recursive: true });
  if (!fs.existsSync(DUMMY_PDF)) {
    fs.writeFileSync(DUMMY_PDF, "%PDF-1.4 dummy content for testing");
  }
  if (!fs.existsSync(DUMMY_JPG)) {
    const buf = Buffer.alloc(128);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    buf[3] = 0xe0;
    fs.writeFileSync(DUMMY_JPG, buf);
  }
});

async function fillStep1(page: Page) {
  await page.fill("#firstName", "Test");
  await page.fill("#lastName", "Applicant");
  await page.fill("#dateOfBirth", "01-15-1990");
  await page.fill("#cellPhone", "(555) 123-4567");
  await page.fill("#email", "test@example.com");

  const boroughGroup = page.locator('[aria-label="preferredBorough"]');
  await boroughGroup.getByRole("radio", { name: "The Bronx" }).click();

  await page.fill("#currentStreet", "123 Test St");
  await page.fill("#currentCity", "New York");
  await page.locator("#currentState").selectOption("NY");
  await page.fill("#currentZip", "10001");

  const viewedGroup = page.locator('[aria-label="viewedApartment"]');
  await viewedGroup.getByRole("radio", { name: "Yes, I have" }).click();
}

async function fillStep2Section8(page: Page) {
  const assistGroup = page.locator('[aria-label="hasAssistance"]');
  await assistGroup.getByRole("radio", { name: "Yes" }).click();

  const programGroup = page.locator('[aria-label="assistProgram"]');
  await programGroup.getByRole("radio", { name: "HCV (Section 8)" }).click();

  const bedroomGroup = page.locator('[aria-label="voucherBedrooms"]');
  await bedroomGroup.getByRole("radio", { name: "2 Bed" }).click();

  await page.fill("#voucherNumber", "V12345");
  await page.fill("#voucherExpDate", "2027-12-31");

  const transferGroup = page.locator('[aria-label="isTransferring"]');
  await transferGroup.getByRole("radio", { name: "No" }).click();

  const cashGroup = page.locator('[aria-label="cashAssistActive"]');
  await cashGroup.getByRole("radio", { name: "Yes" }).click();

  const shelterGroup = page.locator('[aria-label="fromShelter"]');
  await shelterGroup.getByRole("radio", { name: "Yes" }).click();
}

async function fillStep2NoProgram(page: Page) {
  const assistGroup = page.locator('[aria-label="hasAssistance"]');
  await assistGroup.getByRole("radio", { name: "No" }).click();

  const shelterGroup = page.locator('[aria-label="fromShelter"]');
  await shelterGroup.getByRole("radio", { name: "No" }).click();

  await page.fill("#landlordName", "John Landlord");
  await page.fill("#landlordPhone", "(555) 987-6543");
}

async function fillStep3(page: Page) {
  const occGroup = page.locator('[aria-label="hasOccupants"]');
  await occGroup.getByRole("radio", { name: "No" }).click();

  const workGroup = page.locator('[aria-label="currentlyWorking"]');
  await workGroup.getByRole("radio", { name: "No" }).click();

  const vetGroup = page.locator('[aria-label="isVeteran"]');
  await vetGroup.getByRole("radio", { name: "No" }).click();

  const taxGroup = page.locator('[aria-label="filedTaxes"]');
  await taxGroup.getByRole("radio", { name: "Yes" }).click();
}

async function fillStep4(page: Page) {
  await page.getByRole("checkbox", { name: "N/A" }).click();
}

async function fillStep4WithShelter(page: Page) {
  await page.getByRole("checkbox", { name: "Cash Assistance" }).click();

  await page.fill("#housingSpecName", "Jane Specialist");
  await page.fill("#housingSpecPhone", "(555) 111-2222");
  await page.fill("#housingSpecEmail", "specialist@example.com");
}

async function clickNext(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

async function dismissResumeBanner(page: Page) {
  const startFresh = page.getByRole("button", { name: "Start Fresh" });
  if (await startFresh.isVisible({ timeout: 2000 }).catch(() => false)) {
    await startFresh.click();
  }
}

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

test.describe("Tenant Form - Documents Step", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/apply/tenant");
    await dismissResumeBanner(page);
  });

  test("Section 8 applicant sees correct required document categories", async ({ page }) => {
    await fillStep1(page);
    await clickNext(page);

    await fillStep2Section8(page);
    await clickNext(page);

    await fillStep3(page);
    await clickNext(page);

    await fillStep4WithShelter(page);
    await clickNext(page);

    // Should be on documents step now
    await expect(page.getByText("Required Documents")).toBeVisible();
    await expect(page.getByText("Please upload the following documents:")).toBeVisible();

    // Section 8 required docs should appear in the requirements list
    await expect(page.locator("li", { hasText: "Photo ID" })).toBeVisible();
    await expect(page.locator("li", { hasText: "Social Security Card" })).toBeVisible();
    await expect(page.locator("li", { hasText: "Voucher Cover Letter" })).toBeVisible();
    await expect(page.locator("li", { hasText: "PIN Letter" })).toBeVisible();
    await expect(page.locator("li", { hasText: "Cash Assistance Budget Letter" })).toBeVisible();

    // Upload zones should be visible
    await expect(page.getByText("Upload Documents")).toBeVisible();

    // Each required category should have a labeled upload zone
    const uploadLabels = [
      "Photo ID",
      "Social Security Card",
      "Voucher Cover Letter",
      "PIN Letter",
      "Cash Assistance Budget Letter",
      "Other Supporting Documents",
    ];
    for (const label of uploadLabels) {
      await expect(
        page.locator("label", { hasText: label }).first(),
      ).toBeVisible();
    }
  });

  test("No-program applicant sees tax returns and bank statement required", async ({ page }) => {
    await fillStep1(page);
    await clickNext(page);

    await fillStep2NoProgram(page);
    await clickNext(page);

    await fillStep3(page);
    await clickNext(page);

    await fillStep4(page);
    await clickNext(page);

    await expect(page.locator("li", { hasText: "Photo ID" })).toBeVisible();
    await expect(page.locator("li", { hasText: "Tax Returns" })).toBeVisible();
    await expect(page.locator("li", { hasText: "Bank Statement" })).toBeVisible();

    // Letter of Residency and Landlord Recommendation should show as upload zones (optional)
    await expect(
      page.locator("label", { hasText: "Letter of Residency" }).first(),
    ).toBeVisible();
    await expect(
      page.locator("label", { hasText: "Landlord Recommendation" }).first(),
    ).toBeVisible();
  });

  test("Documents step blocks next when required uploads are missing", async ({ page }) => {
    await fillStep1(page);
    await clickNext(page);

    await fillStep2NoProgram(page);
    await clickNext(page);

    await fillStep3(page);
    await clickNext(page);

    await fillStep4(page);
    await clickNext(page);

    // On documents step -- try to advance without uploading
    await clickNext(page);

    // Should see error summary inside the form
    const form = page.locator('[role="form"]');
    await expect(form.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/Please fix/)).toBeVisible();

    // Should still be on documents step
    await expect(page.getByText("Required Documents")).toBeVisible();
  });

  test("Housing specialist is required when from shelter", async ({ page }) => {
    await fillStep1(page);
    await clickNext(page);

    await fillStep2Section8(page);
    await clickNext(page);

    await fillStep3(page);
    await clickNext(page);

    // On income/specialist step -- shelter was "yes" in step 2
    // Housing specialist fields should be required
    const specSection = page.locator("fieldset", { hasText: "Housing Specialist" });
    await expect(specSection.getByText("Since you are coming from a shelter")).toBeVisible();

    // Try to advance without filling specialist
    await page.getByRole("checkbox", { name: "Cash Assistance" }).click();
    await clickNext(page);

    // Should show error for missing specialist fields
    await expect(page.getByText(/Please fix/)).toBeVisible();
  });

  test("Housing specialist is optional when not from shelter", async ({ page }) => {
    await fillStep1(page);
    await clickNext(page);

    await fillStep2NoProgram(page);
    await clickNext(page);

    await fillStep3(page);
    await clickNext(page);

    // On income/specialist step -- shelter was "no"
    const specSection = page.locator("fieldset", { hasText: "Housing Specialist" });
    await expect(specSection.getByText("If you have a housing specialist")).toBeVisible();

    // Should be able to advance without filling specialist
    await fillStep4(page);
    await clickNext(page);

    // Should advance to documents step
    await expect(page.getByText("Required Documents")).toBeVisible();
  });
});

test.describe("Tenant Form - File Upload Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/apply/tenant");
    await dismissResumeBanner(page);
  });

  test("uploaded file does not stretch page width on mobile", async ({ page }) => {
    await fillStep1(page);
    await clickNext(page);
    await fillStep2NoProgram(page);
    await clickNext(page);
    await fillStep3(page);
    await clickNext(page);
    await fillStep4(page);
    await clickNext(page);

    // On documents step -- upload a file to Photo ID
    const photoIdUpload = page.locator("label", { hasText: "Photo ID" }).first()
      .locator("..").locator("input[type='file']");

    await photoIdUpload.setInputFiles(DUMMY_PDF);

    // Wait for file to appear in staged list
    await expect(page.getByText("test-doc.pdf")).toBeVisible();

    // Page width should not exceed viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test("file row shows trash icon instead of Remove text", async ({ page }) => {
    await fillStep1(page);
    await clickNext(page);
    await fillStep2NoProgram(page);
    await clickNext(page);
    await fillStep3(page);
    await clickNext(page);
    await fillStep4(page);
    await clickNext(page);

    const photoIdUpload = page.locator("label", { hasText: "Photo ID" }).first()
      .locator("..").locator("input[type='file']");
    await photoIdUpload.setInputFiles(DUMMY_PDF);
    await expect(page.getByText("test-doc.pdf")).toBeVisible();

    // Should have trash icon button with aria-label, not plain "Remove" text
    await expect(page.getByRole("button", { name: /Remove test-doc/ })).toBeVisible();

    // The button should contain an SVG icon, not visible "Remove" text
    const removeBtn = page.getByRole("button", { name: /Remove test-doc/ });
    const btnText = await removeBtn.textContent();
    expect(btnText?.trim()).toBe("");

    // Should NOT show "Ready" badge
    await expect(page.getByText("Ready")).not.toBeVisible();
  });
});
