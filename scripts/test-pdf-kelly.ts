import { readFileSync } from "fs";

const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const KELLY_FOLDER_ID = "1Y9z2m6bvNASO4CbJu88fSxQMkhB6KV0d";
const KELLY_UPLOADS_FOLDER_ID = "1_EeqLTSfLzEaARLRC6NpHiI0fYJ9Fv-H";

async function main() {
  const { generateAndUploadTenantPdf } = await import("@/lib/pdf-tenant");
  const type = await import("@/lib/form-types");
  type;

  const data = {
    firstName: "Kelly",
    lastName: "Coppola",
    dateOfBirth: "01-09-1988",
    cellPhone: "(551) 800-9955",
    email: "kaycoppola64@gmail.com",
    emergencyContactName: "",
    emergencyContactPhone: "",
    preferredBorough: "brooklyn",
    currentStreet: "N/A",
    currentStreet2: "",
    currentCity: "New York",
    currentState: "NY",
    currentZip: "10036",
    viewedApartment: "yes" as const,
    viewingDate: "",
    paymentPath: "voucher" as const,
    hasAssistance: "yes" as const,
    assistProgram: "HCV",
    otherProgramName: "",
    voucherBedrooms: "1",
    voucherNumber: "14089043",
    voucherExpDate: "2026-05-04",
    isTransferring: "no" as const,
    monthlyIncome: "",
    pathOtherNotes: "",
    fromShelter: "no" as const,
    landlordName: "N/A",
    landlordPhone: "(551) 800-9955",
    landlordEmail: "",
    cashAssistActive: "yes" as const,
    creditScore: "600-649",
    hasOccupants: "no" as const,
    occupantCount: "",
    occupants: [],
    currentlyWorking: "no" as const,
    employerName: "",
    employerAddress: "",
    supervisorName: "",
    supervisorPhone: "",
    payType: "" as const,
    payAmount: "",
    hoursPerWeek: "",
    payFrequency: "",
    isVeteran: "no" as const,
    filedTaxes: "no" as const,
    incomeSources: ["food-stamps", "cash-assistance"],
    otherIncomeSource: "",
    housingSpecName: "",
    housingSpecPhone: "",
    housingSpecEmail: "",
    paymentConfirmed: false,
    isSmoker: "no" as const,
    hasPets: "yes" as const,
    disclosureAgreed: true,
    marketingOptIn: false,
    signatureFirst: "Kelly",
    signatureLast: "Coppola",
    submittedAt: "2026-04-27T12:07:08.972Z",
  };

  console.log("Generating Kelly's tenant PDF...");
  console.log(`  Application folder: ${KELLY_FOLDER_ID}`);
  console.log(`  Uploads folder:     ${KELLY_UPLOADS_FOLDER_ID}`);

  const fileId = await generateAndUploadTenantPdf({
    folderId: KELLY_FOLDER_ID,
    uploadsFolderId: KELLY_UPLOADS_FOLDER_ID,
    data,
  });

  console.log(`\nPDF uploaded successfully`);
  console.log(`   File ID: ${fileId}`);
  console.log(`   View:    https://drive.google.com/file/d/${fileId}/view`);
}

main().catch((err) => {
  console.error("PDF generation failed:");
  console.error(err);
  process.exit(1);
});
