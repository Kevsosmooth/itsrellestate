import type { TenantFormData, LandlordFormData } from "@/lib/form-types";
import type { StagedFile } from "@/components/forms/file-upload";

export const isDev = process.env.NODE_ENV === "development";

const FAKE_PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a,
  0x25, 0xc4, 0xe5, 0xf2, 0xe5, 0xeb, 0xa7, 0xf3, 0xa0, 0xd0, 0xc4, 0xc6, 0x0a,
  0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a,
  0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a,
  0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a,
  0x32, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a,
  0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x2f, 0x4b, 0x69, 0x64, 0x73, 0x5b, 0x33, 0x20, 0x30, 0x20, 0x52, 0x5d, 0x2f, 0x43, 0x6f, 0x75, 0x6e, 0x74, 0x20, 0x31, 0x3e, 0x3e, 0x0a,
  0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a,
  0x33, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a,
  0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x2f, 0x4d, 0x65, 0x64, 0x69, 0x61, 0x42, 0x6f, 0x78, 0x5b, 0x30, 0x20, 0x30, 0x20, 0x36, 0x31, 0x32, 0x20, 0x37, 0x39, 0x32, 0x5d, 0x2f, 0x50, 0x61, 0x72, 0x65, 0x6e, 0x74, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a,
  0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a,
  0x78, 0x72, 0x65, 0x66, 0x0a,
  0x30, 0x20, 0x34, 0x0a,
  0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x36, 0x35, 0x35, 0x33, 0x35, 0x20, 0x66, 0x20, 0x0a,
  0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x31, 0x35, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6e, 0x20, 0x0a,
  0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x36, 0x32, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6e, 0x20, 0x0a,
  0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x31, 0x31, 0x33, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6e, 0x20, 0x0a,
  0x74, 0x72, 0x61, 0x69, 0x6c, 0x65, 0x72, 0x0a,
  0x3c, 0x3c, 0x2f, 0x53, 0x69, 0x7a, 0x65, 0x20, 0x34, 0x2f, 0x52, 0x6f, 0x6f, 0x74, 0x20, 0x31, 0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a,
  0x73, 0x74, 0x61, 0x72, 0x74, 0x78, 0x72, 0x65, 0x66, 0x0a,
  0x31, 0x37, 0x39, 0x0a,
  0x25, 0x25, 0x45, 0x4f, 0x46, 0x0a,
]);

let fakeIdCounter = 0;

export function makeFakeStagedFile(label: string, assignedTo?: string): StagedFile {
  fakeIdCounter += 1;
  const slug = label.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  const fileName = `dev-${slug}.pdf`;
  const file = new File([FAKE_PDF_BYTES], fileName, { type: "application/pdf" });
  return {
    id: `fake-${Date.now()}-${fakeIdCounter}`,
    file,
    fileName,
    mimeType: "application/pdf",
    sizeInBytes: FAKE_PDF_BYTES.byteLength,
    assignedTo,
  };
}

export function devTenantData(): TenantFormData {
  return {
    firstName: "Devon",
    lastName: "Test-Applicant",
    dateOfBirth: "06-15-1992",
    cellPhone: "(555) 123-4567",
    email: "nyrell@itsrellestate.com",
    emergencyContactName: "Emergency Person",
    emergencyContactPhone: "(555) 987-6543",
    preferredBorough: "brooklyn",
    currentStreet: "123 Dev Test Ave",
    currentStreet2: "Apt 4B",
    currentCity: "New York",
    currentState: "NY",
    currentZip: "11201",
    viewedApartment: "yes",
    viewingDate: "",

    paymentPath: "voucher",
    hasAssistance: "yes",
    assistProgram: "HCV",
    otherProgramName: "",
    voucherBedrooms: "2",
    voucherNumber: "DEV12345",
    voucherExpDate: nextYearDate(),
    isTransferring: "no",
    monthlyIncome: "",
    pathOtherNotes: "",
    fromShelter: "no",
    landlordName: "Current Landlord",
    landlordPhone: "(555) 222-3333",
    landlordEmail: "landlord@example.com",
    cashAssistActive: "no",
    creditScore: "650-699",

    hasOccupants: "yes",
    occupantCount: "2",
    occupants: [
      { id: 1001, name: "Alex Partner", relationship: "Spouse", over18: "yes" },
      { id: 1002, name: "Sam Child", relationship: "Child", over18: "no" },
    ],
    currentlyWorking: "yes",
    employerName: "DevCo Industries",
    employerAddress: "456 Employer Way, New York NY 10001",
    supervisorName: "Boss Person",
    supervisorPhone: "(555) 444-5555",
    payType: "hourly",
    payAmount: "28.50",
    hoursPerWeek: "40",
    payFrequency: "",
    isVeteran: "no",
    filedTaxes: "yes",

    incomeSources: ["food-stamps"],
    otherIncomeSource: "",
    housingSpecName: "",
    housingSpecPhone: "",
    housingSpecEmail: "",

    paymentConfirmed: true,

    isSmoker: "no",
    hasPets: "no",
    disclosureAgreed: true,
    marketingOptIn: false,
    signatureFirst: "Devon",
    signatureLast: "Test-Applicant",
  };
}

export function devTenantDataCash(): TenantFormData {
  return {
    firstName: "Casey",
    lastName: "Cash-Applicant",
    dateOfBirth: "03-22-1988",
    cellPhone: "(555) 222-1111",
    email: "nyrell@itsrellestate.com",
    emergencyContactName: "Emergency Cash",
    emergencyContactPhone: "(555) 333-4444",
    preferredBorough: "queens",
    currentStreet: "78 Out-Of-Pocket Lane",
    currentStreet2: "",
    currentCity: "New York",
    currentState: "NY",
    currentZip: "11375",
    viewedApartment: "yes",
    viewingDate: "",

    paymentPath: "out-of-pocket",
    hasAssistance: "no",
    assistProgram: "",
    otherProgramName: "",
    voucherBedrooms: "",
    voucherNumber: "",
    voucherExpDate: "",
    isTransferring: "",
    monthlyIncome: "5200",
    pathOtherNotes: "",
    fromShelter: "no",
    landlordName: "Prior Landlord",
    landlordPhone: "(555) 999-1212",
    landlordEmail: "prior-landlord@example.com",
    cashAssistActive: "no",
    creditScore: "700+",

    hasOccupants: "no",
    occupantCount: "",
    occupants: [],
    currentlyWorking: "yes",
    employerName: "Cash Co LLC",
    employerAddress: "200 Pay Street, New York NY 10002",
    supervisorName: "Cash Boss",
    supervisorPhone: "(555) 888-7777",
    payType: "salary",
    payAmount: "62400",
    hoursPerWeek: "",
    payFrequency: "annually",
    isVeteran: "no",
    filedTaxes: "yes",

    incomeSources: ["na"],
    otherIncomeSource: "",
    housingSpecName: "",
    housingSpecPhone: "",
    housingSpecEmail: "",

    paymentConfirmed: true,

    isSmoker: "no",
    hasPets: "no",
    disclosureAgreed: true,
    marketingOptIn: false,
    signatureFirst: "Casey",
    signatureLast: "Cash-Applicant",
  };
}

export function devLandlordData(): LandlordFormData {
  return {
    propAddress: "789 Property St",
    propAddress2: "",
    propCity: "Brooklyn",
    propState: "NY",
    propZip: "11215",
    ownershipType: "individual",
    taxId: "111-22-3333",
    legalBusinessName: "",
    legalName: "Larry Landlord",
    paymentPreference: "check",
    bankName: "",
    bankNameOther: "",
    accountType: "",
    accountName: "",
    bankAcct: "",
    bankAcctConfirm: "",
    bankRouting: "",
    bankRoutingConfirm: "",

    mailAddress: "789 Property St",
    mailAddress2: "",
    mailCity: "Brooklyn",
    mailState: "NY",
    mailZip: "11215",
    llFirstName: "Larry",
    llLastName: "Landlord",
    llPhone: "(555) 777-8888",
    llEmail: "nyrell@itsrellestate.com",
    hasAuthRep: "no",
    authRepFirst: "",
    authRepLast: "",
    authRepPhone: "",
    authRepEmail: "",

    yearBuilt: "1985",
    totalStories: "3",
    residentialUnits: "6",
    commercialUnits: "0",
    rentStabilized: "no",
    utilHeating: "gas-owner",
    utilCooking: "tenant",
    utilHotWater: "gas-owner",
    utilElectric: "tenant",
    utilWater: "owner",
    utilSewer: "owner",
    utilTrash: "owner",
    utilAC: "window-tenant",

    units: [
      { id: 1, unitNumber: "1A", floor: "1", bedrooms: "2", rent: "2400" },
      { id: 2, unitNumber: "2B", floor: "2", bedrooms: "1", rent: "1900" },
    ],

    payCheck: true,
    payZelle: false,
    payACH: false,
    checkPayable: "Larry Landlord",
    checkAddress: "789 Property St",
    checkCity: "Brooklyn",
    checkState: "NY",
    checkZip: "11215",
    zellePhone: "",
    zelleEmail: "",
    achAccount: "",
    achRouting: "",
    pocFirstName: "Larry",
    pocLastName: "Landlord",
    pocPhone: "(555) 777-8888",
    pocEmail: "nyrell@itsrellestate.com",

    submitterTitle: "owner",
    signatureFirst: "Larry",
    signatureLast: "Landlord",
    agreementConfirmed: true,
  };
}

function nextYearDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}
