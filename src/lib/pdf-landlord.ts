import {
  ACCOUNT_TYPE_OPTIONS, BANK_OPTIONS, FLOOR_OPTIONS, OWNERSHIP_TYPE_OPTIONS,
  PAYMENT_PREFERENCE_OPTIONS, STORIES_OPTIONS, SUBMITTER_TITLE_OPTIONS,
  UNIT_BEDROOM_OPTIONS, US_STATES, UTIL_AC_OPTIONS, UTIL_COOKING_OPTIONS,
  UTIL_ELECTRIC_OPTIONS, UTIL_HEATING_OPTIONS, UTIL_HOT_WATER_OPTIONS,
  UTIL_SEWER_OPTIONS, UTIL_TRASH_OPTIONS, UTIL_WATER_OPTIONS, YEAR_BUILT_OPTIONS,
} from "@/lib/form-constants";
import {
  createPdfContext, drawDisclosure, drawDocList, drawFieldGrid,
  drawHeader, drawSectionBar, drawSignature, drawTable, drawTitle,
  finalizeAndUpload, formatDateLong, lookupLabel, yesNoLabel,
  type FieldRow,
} from "@/lib/pdf-shared";
import type { LandlordFormData } from "@/lib/form-types";
import { getDrive } from "@/lib/google";

interface GenerateArgs {
  folderId: string;
  uploadsFolderId: string;
  data: LandlordFormData & { submittedAt: string };
}

const FOOTER_TEXT =
  "ItsRellEstate  |  Nyrell Nunez, Licensed NYS Real Estate Agent  |  Lic. #10401396493  |  itsrellestate.com";

const DISCLOSURE_TEXT =
  "I certify that all information provided in this application is true and accurate to the best of " +
  "my knowledge. I understand that providing false information may result in disqualification. I authorize " +
  "ItsRellEstate and Nyrell Nunez to verify any information provided and to share relevant details with " +
  "prospective tenants as needed for the matching process.";

function maskedTaxId(value: string): string {
  if (!value) return "";
  return value.length > 4 ? `****${value.slice(-4)}` : "****";
}

async function listUploadedDocs(uploadsFolderId: string): Promise<string[]> {
  const drive = getDrive();
  const res = await drive.files.list({
    q: [
      `'${uploadsFolderId}' in parents`,
      `mimeType != 'application/vnd.google-apps.folder'`,
      `name != 'application.pdf'`,
      `trashed = false`,
    ].join(" and "),
    fields: "files(name)",
    pageSize: 100,
  });
  return (res.data.files ?? []).map((f) => f.name ?? "").filter(Boolean);
}

export async function generateAndUploadLandlordPdf(args: GenerateArgs): Promise<string> {
  void args.folderId;
  const { uploadsFolderId, data } = args;

  const ctx = await createPdfContext(FOOTER_TEXT);

  drawHeader(ctx, {
    submittedDisplay: formatDateLong(data.submittedAt),
    agentLine: "Nyrell Nunez, Lic. #10401396493",
  });

  drawTitle(ctx, "Landlord Application", "Property Listing for Subsidy Tenants");

  // Property
  drawSectionBar(ctx, "Property Address");
  const propStreet = [data.propAddress, data.propAddress2].filter(Boolean).join(" ").trim();
  drawFieldGrid(ctx, [
    { label: "Street Address", value: propStreet },
  ], 1);
  drawFieldGrid(ctx, [
    { label: "City", value: data.propCity },
    { label: "State", value: lookupLabel(US_STATES, data.propState) },
    { label: "ZIP", value: data.propZip },
  ], 3);

  // Legal Ownership
  drawSectionBar(ctx, "Legal Ownership");
  const isIndividual = data.ownershipType === "individual";
  drawFieldGrid(ctx, [
    { label: "Ownership Type", value: lookupLabel(OWNERSHIP_TYPE_OPTIONS, data.ownershipType) },
    { label: isIndividual ? "Legal Name" : "Legal Business Name", value: isIndividual ? data.legalName : data.legalBusinessName },
    { label: isIndividual ? "Social Security Number" : "EIN", value: maskedTaxId(data.taxId) },
  ]);

  // Mailing Address
  drawSectionBar(ctx, "Mailing Address");
  const mailStreet = [data.mailAddress, data.mailAddress2].filter(Boolean).join(" ").trim();
  drawFieldGrid(ctx, [
    { label: "Street Address", value: mailStreet },
  ], 1);
  drawFieldGrid(ctx, [
    { label: "City", value: data.mailCity },
    { label: "State", value: lookupLabel(US_STATES, data.mailState) },
    { label: "ZIP", value: data.mailZip },
  ], 3);

  // Owner / Manager Contact
  drawSectionBar(ctx, "Owner / Manager Contact");
  drawFieldGrid(ctx, [
    { label: "First Name", value: data.llFirstName },
    { label: "Last Name", value: data.llLastName },
    { label: "Phone", value: data.llPhone },
    { label: "Email", value: data.llEmail },
    { label: "Authorized Representative", value: yesNoLabel(data.hasAuthRep) },
  ]);

  if (data.hasAuthRep === "yes") {
    drawFieldGrid(ctx, [
      { label: "Rep First Name", value: data.authRepFirst },
      { label: "Rep Last Name", value: data.authRepLast },
      { label: "Rep Phone", value: data.authRepPhone },
      { label: "Rep Email", value: data.authRepEmail },
    ]);
  }

  // Building & Utilities
  drawSectionBar(ctx, "Building & Utilities");
  drawFieldGrid(ctx, [
    { label: "Year Built", value: lookupLabel(YEAR_BUILT_OPTIONS, data.yearBuilt) },
    { label: "Total Stories", value: lookupLabel(STORIES_OPTIONS, data.totalStories) },
    { label: "Residential Units", value: data.residentialUnits },
    { label: "Commercial Units", value: data.commercialUnits || "0" },
    { label: "Rent Stabilized", value: yesNoLabel(data.rentStabilized) },
  ]);
  drawFieldGrid(ctx, [
    { label: "Heating", value: lookupLabel(UTIL_HEATING_OPTIONS, data.utilHeating) },
    { label: "Cooking", value: lookupLabel(UTIL_COOKING_OPTIONS, data.utilCooking) },
    { label: "Hot Water", value: lookupLabel(UTIL_HOT_WATER_OPTIONS, data.utilHotWater) },
    { label: "Electricity", value: lookupLabel(UTIL_ELECTRIC_OPTIONS, data.utilElectric) },
    { label: "Water", value: lookupLabel(UTIL_WATER_OPTIONS, data.utilWater) },
    { label: "Sewer", value: lookupLabel(UTIL_SEWER_OPTIONS, data.utilSewer) },
    { label: "Trash", value: lookupLabel(UTIL_TRASH_OPTIONS, data.utilTrash) },
    { label: "Air Conditioning", value: lookupLabel(UTIL_AC_OPTIONS, data.utilAC) },
  ]);

  // Units for Rent
  drawSectionBar(ctx, "Units for Rent");
  drawTable(
    ctx,
    ["Unit", "Floor", "Bedrooms", "Monthly Rent"],
    data.units.map((u) => [
      u.unitNumber,
      lookupLabel(FLOOR_OPTIONS, u.floor),
      lookupLabel(UNIT_BEDROOM_OPTIONS, u.bedrooms),
      u.rent ? `$${u.rent}` : "",
    ]),
  );

  // Payment Methods
  drawSectionBar(ctx, "Accepted Payment Methods");
  const paymentRows: FieldRow[] = [
    { label: "Payment Preference", value: lookupLabel(PAYMENT_PREFERENCE_OPTIONS, data.paymentPreference) },
  ];
  if (data.paymentPreference === "electronic") {
    const bankDisplay = data.bankName === "other" ? data.bankNameOther : lookupLabel(BANK_OPTIONS, data.bankName);
    paymentRows.push(
      { label: "Bank", value: bankDisplay },
      { label: "Account Type", value: lookupLabel(ACCOUNT_TYPE_OPTIONS, data.accountType) },
      { label: "Name on Account", value: data.accountName },
    );
  }
  paymentRows.push(
    { label: "Accepts Check / Money Order", value: data.payCheck ? "Yes" : "No" },
    { label: "Accepts Zelle", value: data.payZelle ? "Yes" : "No" },
    { label: "Accepts ACH / Direct Deposit", value: data.payACH ? "Yes" : "No" },
  );
  drawFieldGrid(ctx, paymentRows);

  if (data.payCheck) {
    drawFieldGrid(ctx, [
      { label: "Check Payable To", value: data.checkPayable },
      { label: "Check Mailing Address", value: [data.checkAddress, data.checkCity, lookupLabel(US_STATES, data.checkState), data.checkZip].filter(Boolean).join(", ") },
    ], 1);
  }
  if (data.payZelle) {
    drawFieldGrid(ctx, [
      { label: "Zelle Phone", value: data.zellePhone },
      { label: "Zelle Email", value: data.zelleEmail },
    ]);
  }

  // Point of Contact
  drawSectionBar(ctx, "Point of Contact");
  drawFieldGrid(ctx, [
    { label: "First Name", value: data.pocFirstName },
    { label: "Last Name", value: data.pocLastName },
    { label: "Phone", value: data.pocPhone },
    { label: "Email", value: data.pocEmail },
  ]);

  // Documents
  drawSectionBar(ctx, "Documents on File");
  const docs = await listUploadedDocs(uploadsFolderId);
  drawDocList(ctx, docs);

  // Disclosure & Signature
  drawSectionBar(ctx, "Authorization & Signature");
  drawFieldGrid(ctx, [
    { label: "Submitter Title", value: lookupLabel(SUBMITTER_TITLE_OPTIONS, data.submitterTitle) },
  ], 1);
  drawDisclosure(ctx, DISCLOSURE_TEXT);
  drawSignature(
    ctx,
    `${data.signatureFirst} ${data.signatureLast}`.trim(),
    formatDateLong(data.submittedAt),
  );

  return finalizeAndUpload(ctx, uploadsFolderId, "application.pdf");
}
