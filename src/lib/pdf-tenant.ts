import {
  ASSIST_PROGRAM_OPTIONS, BOROUGH_OPTIONS, CREDIT_SCORE_OPTIONS,
  DOC_CATEGORY_CONFIGS, INCOME_SOURCE_OPTIONS, PAY_FREQUENCY_OPTIONS,
  PAY_TYPE_OPTIONS, US_STATES, VOUCHER_BEDROOM_OPTIONS,
  type DocCategory,
} from "@/lib/form-constants";
import {
  createPdfContext, drawDisclosure, drawDocList, drawFieldGrid,
  drawHeader, drawSectionBar, drawSignature, drawTable, drawTitle,
  finalizeAndUpload, formatDateFromMMDDYYYY, formatDateFromYYYYMMDD,
  formatDateLong, lookupLabel, yesNoLabel,
  type FieldRow,
} from "@/lib/pdf-shared";
import type { TenantFormData } from "@/lib/form-types";
import { getDrive } from "@/lib/google";

interface GenerateArgs {
  folderId: string;
  uploadsFolderId: string;
  data: TenantFormData & { submittedAt: string };
}

const FOOTER_TEXT =
  "ItsRellEstate  |  Nyrell Nunez, Licensed NYS Real Estate Agent  |  Lic. #10401396493  |  itsrellestate.com";

const DISCLOSURE_TEXT =
  "I, the undersigned applicant, hereby authorize ItsRellEstate and Nyrell Nunez to verify any " +
  "and all information provided in this application, including but not limited to employment history, " +
  "rental history, credit history, and public records. I understand that providing false or misleading " +
  "information may result in denial of my application. I acknowledge that a non-refundable $20 processing " +
  "fee is required and that submission of this application does not guarantee housing placement.";

function programLabel(data: TenantFormData): string {
  if (data.hasAssistance !== "yes") return "None";
  if (data.assistProgram === "Other") return data.otherProgramName || "Other";
  return lookupLabel(ASSIST_PROGRAM_OPTIONS, data.assistProgram);
}

function listUploadedDocs(uploadsFolderId: string): Promise<string[]> {
  const drive = getDrive();
  return drive.files
    .list({
      q: [
        `'${uploadsFolderId}' in parents`,
        `mimeType != 'application/vnd.google-apps.folder'`,
        `name != 'application.pdf'`,
        `trashed = false`,
      ].join(" and "),
      fields: "files(name)",
      pageSize: 100,
    })
    .then((res) => {
      const files = res.data.files ?? [];
      const labels = new Set<string>();
      for (const f of files) {
        const label = labelForFilename(f.name ?? "");
        if (label) labels.add(label);
      }
      return Array.from(labels).sort();
    });
}

function labelForFilename(name: string): string | null {
  for (const [cat, config] of Object.entries(DOC_CATEGORY_CONFIGS) as [DocCategory, typeof DOC_CATEGORY_CONFIGS[DocCategory]][]) {
    void cat;
    const prefix = config.label.replace(/[^a-zA-Z0-9]+/g, "-");
    if (name.startsWith(`${prefix}_`) || name.startsWith(`${prefix}-`)) {
      return config.label;
    }
  }
  return null;
}

export async function generateAndUploadTenantPdf(args: GenerateArgs): Promise<string> {
  void args.folderId;
  const { uploadsFolderId, data } = args;

  const ctx = await createPdfContext(FOOTER_TEXT);

  drawHeader(ctx, {
    submittedDisplay: formatDateLong(data.submittedAt),
    agentLine: "Nyrell Nunez, Lic. #10401396493",
  });

  drawTitle(ctx, "Tenant Application", "Subsidy Housing Placement");

  // Personal Information
  drawSectionBar(ctx, "Personal Information");
  drawFieldGrid(ctx, [
    { label: "First Name", value: data.firstName.trim() },
    { label: "Last Name", value: data.lastName.trim() },
    { label: "Date of Birth", value: formatDateFromMMDDYYYY(data.dateOfBirth) },
    { label: "Phone", value: data.cellPhone },
    { label: "Email", value: data.email },
    { label: "Preferred Borough", value: lookupLabel(BOROUGH_OPTIONS, data.preferredBorough) },
    { label: "Emergency Contact Name", value: data.emergencyContactName },
    { label: "Emergency Contact Phone", value: data.emergencyContactPhone },
  ]);

  // Current Address
  drawSectionBar(ctx, "Current Address");
  const fullStreet = [data.currentStreet, data.currentStreet2].filter(Boolean).join(" ").trim();
  drawFieldGrid(ctx, [
    { label: "Street Address", value: fullStreet },
  ], 1);
  drawFieldGrid(ctx, [
    { label: "City", value: data.currentCity.trim() },
    { label: "State", value: lookupLabel(US_STATES, data.currentState) },
    { label: "ZIP", value: data.currentZip },
  ], 3);

  // Rental Assistance
  drawSectionBar(ctx, "Rental Assistance");
  const assistanceRows: FieldRow[] = [
    { label: "Receives Assistance", value: yesNoLabel(data.hasAssistance) },
    { label: "Program", value: programLabel(data) },
  ];
  if (data.hasAssistance === "yes") {
    assistanceRows.push(
      { label: "Voucher Bedrooms", value: lookupLabel(VOUCHER_BEDROOM_OPTIONS, data.voucherBedrooms) },
    );
    if (data.voucherNumber) {
      assistanceRows.push({ label: "Voucher / Case Number", value: data.voucherNumber });
    }
    if (data.voucherExpDate) {
      assistanceRows.push({ label: "Voucher Expiration", value: formatDateFromYYYYMMDD(data.voucherExpDate) });
    }
    assistanceRows.push(
      { label: "Transferring", value: yesNoLabel(data.isTransferring) },
      { label: "Active Cash Assistance", value: yesNoLabel(data.cashAssistActive) },
    );
  }
  assistanceRows.push({ label: "Currently in Shelter", value: yesNoLabel(data.fromShelter) });
  drawFieldGrid(ctx, assistanceRows);

  // Apartment Viewing
  drawSectionBar(ctx, "Apartment Viewing");
  drawFieldGrid(ctx, [
    { label: "Has Viewed Apartment", value: yesNoLabel(data.viewedApartment) },
    { label: "Preferred Viewing Date", value: data.viewingDate ? formatDateFromYYYYMMDD(data.viewingDate) : "Not applicable" },
  ]);

  // Current Landlord
  if (data.fromShelter !== "yes") {
    drawSectionBar(ctx, "Current Landlord");
    drawFieldGrid(ctx, [
      { label: "Landlord Name", value: data.landlordName },
      { label: "Landlord Phone", value: data.landlordPhone },
      { label: "Landlord Email", value: data.landlordEmail },
      { label: "Credit Score Range", value: lookupLabel(CREDIT_SCORE_OPTIONS, data.creditScore) },
    ]);
  }

  // Household
  drawSectionBar(ctx, "Household");
  drawFieldGrid(ctx, [
    { label: "Additional Occupants", value: yesNoLabel(data.hasOccupants) },
    { label: "Occupant Count", value: data.hasOccupants === "yes" ? data.occupantCount : "0" },
  ]);

  if (data.hasOccupants === "yes" && data.occupants.length > 0) {
    drawTable(
      ctx,
      ["Name", "Relationship", "Age"],
      data.occupants.map((o) => [
        o.name,
        o.relationship,
        o.over18 === "yes" ? "18 or older" : "Under 18",
      ]),
    );
  }

  // Employment & Income
  drawSectionBar(ctx, "Employment & Income");
  const employmentRows: FieldRow[] = [
    { label: "Currently Employed", value: yesNoLabel(data.currentlyWorking) },
    { label: "Filed Taxes Last Year", value: yesNoLabel(data.filedTaxes) },
    { label: "Veteran", value: yesNoLabel(data.isVeteran) },
  ];

  const incomeLabels = data.incomeSources
    .map((s) => lookupLabel(INCOME_SOURCE_OPTIONS, s))
    .filter((l) => l && l !== "N/A");
  if (data.otherIncomeSource) incomeLabels.push(data.otherIncomeSource);
  employmentRows.push({
    label: "Income Sources",
    value: incomeLabels.join(", ") || "None",
  });

  if (data.currentlyWorking === "yes") {
    employmentRows.push(
      { label: "Employer", value: data.employerName },
      { label: "Employer Address", value: data.employerAddress },
      { label: "Supervisor", value: data.supervisorName },
      { label: "Supervisor Phone", value: data.supervisorPhone },
      { label: "Pay Type", value: lookupLabel(PAY_TYPE_OPTIONS, data.payType) },
      { label: "Pay Amount", value: data.payAmount ? `$${data.payAmount}` : "" },
    );
    if (data.payType === "hourly" && data.hoursPerWeek) {
      employmentRows.push({ label: "Hours / Week", value: data.hoursPerWeek });
    }
    if (data.payType === "salary" && data.payFrequency) {
      employmentRows.push({ label: "Pay Frequency", value: lookupLabel(PAY_FREQUENCY_OPTIONS, data.payFrequency) });
    }
  }
  drawFieldGrid(ctx, employmentRows);

  // Housing Specialist
  if (data.housingSpecName || data.housingSpecPhone || data.housingSpecEmail) {
    drawSectionBar(ctx, "Housing Specialist / Caseworker");
    drawFieldGrid(ctx, [
      { label: "Name", value: data.housingSpecName },
      { label: "Phone", value: data.housingSpecPhone },
      { label: "Email", value: data.housingSpecEmail },
    ]);
  }

  // Lifestyle
  drawSectionBar(ctx, "Lifestyle");
  drawFieldGrid(ctx, [
    { label: "Smoker", value: yesNoLabel(data.isSmoker) },
    { label: "Has Pets", value: yesNoLabel(data.hasPets) },
  ]);

  // Documents on File
  drawSectionBar(ctx, "Documents on File");
  const docs = await listUploadedDocs(uploadsFolderId);
  drawDocList(ctx, docs);

  // Authorization & Signature
  drawSectionBar(ctx, "Authorization & Signature");
  drawDisclosure(ctx, DISCLOSURE_TEXT);
  drawSignature(
    ctx,
    `${data.signatureFirst} ${data.signatureLast}`.trim(),
    formatDateLong(data.submittedAt),
  );

  return finalizeAndUpload(ctx, uploadsFolderId, "application.pdf");
}
