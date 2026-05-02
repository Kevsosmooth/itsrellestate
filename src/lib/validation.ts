import { z } from "zod/v4";

const yesNo = z.enum(["yes", "no", ""]);
const phone = z.string().max(20);
const email = z.union([z.email(), z.literal("")]);
const shortText = z.string().max(200);
const mediumText = z.string().max(500);

const occupantSchema = z.object({
  id: z.number(),
  name: shortText,
  relationship: shortText,
  over18: yesNo,
});

export const tenantSchema = z.object({
  firstName: shortText,
  lastName: shortText,
  dateOfBirth: shortText,
  cellPhone: phone,
  email: email,
  emergencyContactName: shortText,
  emergencyContactPhone: phone,
  preferredBorough: shortText,
  currentStreet: shortText,
  currentStreet2: shortText,
  currentCity: shortText,
  currentState: shortText,
  currentZip: z.string().max(10),
  viewedApartment: yesNo,
  viewingDate: shortText,
  paymentPath: z.enum(["voucher", "out-of-pocket", "other", ""]),
  hasAssistance: yesNo,
  assistProgram: shortText,
  otherProgramName: shortText,
  voucherBedrooms: shortText,
  voucherNumber: shortText,
  voucherExpDate: shortText,
  isTransferring: yesNo,
  monthlyIncome: shortText,
  pathOtherNotes: mediumText,
  fromShelter: yesNo,
  landlordName: shortText,
  landlordPhone: phone,
  landlordEmail: email,
  cashAssistActive: yesNo,
  creditScore: shortText,
  hasOccupants: yesNo,
  occupantCount: shortText,
  occupants: z.array(occupantSchema).max(20),
  currentlyWorking: yesNo,
  employerName: shortText,
  employerAddress: mediumText,
  supervisorName: shortText,
  supervisorPhone: phone,
  payType: z.enum(["hourly", "salary", ""]),
  payAmount: shortText,
  hoursPerWeek: shortText,
  payFrequency: shortText,
  isVeteran: yesNo,
  filedTaxes: yesNo,
  incomeSources: z.array(shortText).max(20),
  otherIncomeSource: shortText,
  housingSpecName: shortText,
  housingSpecPhone: phone,
  housingSpecEmail: email,
  paymentConfirmed: z.boolean(),
  isSmoker: yesNo,
  hasPets: yesNo,
  disclosureAgreed: z.boolean(),
  signatureFirst: shortText,
  signatureLast: shortText,
});

const rentalUnitSchema = z.object({
  id: z.number(),
  unitNumber: shortText,
  floor: shortText,
  bedrooms: shortText,
  rent: shortText,
});

export const landlordSchema = z.object({
  propAddress: shortText,
  propAddress2: shortText,
  propCity: shortText,
  propState: shortText,
  propZip: z.string().max(10),
  ownershipType: shortText,
  taxId: z.string().max(20),
  legalBusinessName: shortText,
  legalName: shortText,
  paymentPreference: z.enum(["electronic", "check", ""]),
  bankName: shortText,
  bankNameOther: shortText,
  accountType: z.enum(["checking", "savings", ""]),
  accountName: shortText,
  bankAcct: z.string().max(30),
  bankAcctConfirm: z.string().max(30),
  bankRouting: z.string().max(20),
  bankRoutingConfirm: z.string().max(20),
  mailAddress: shortText,
  mailAddress2: shortText,
  mailCity: shortText,
  mailState: shortText,
  mailZip: z.string().max(10),
  llFirstName: shortText,
  llLastName: shortText,
  llPhone: phone,
  llEmail: email,
  hasAuthRep: yesNo,
  authRepFirst: shortText,
  authRepLast: shortText,
  authRepPhone: phone,
  authRepEmail: email,
  yearBuilt: shortText,
  totalStories: shortText,
  residentialUnits: shortText,
  commercialUnits: shortText,
  rentStabilized: yesNo,
  utilHeating: shortText,
  utilCooking: shortText,
  utilHotWater: shortText,
  utilElectric: shortText,
  utilWater: shortText,
  utilSewer: shortText,
  utilTrash: shortText,
  utilAC: shortText,
  units: z.array(rentalUnitSchema).max(50),
  payCheck: z.boolean(),
  payZelle: z.boolean(),
  payACH: z.boolean(),
  checkPayable: shortText,
  checkAddress: mediumText,
  checkCity: shortText,
  checkState: shortText,
  checkZip: z.string().max(10),
  zellePhone: phone,
  zelleEmail: email,
  achAccount: z.string().max(30),
  achRouting: z.string().max(20),
  pocFirstName: shortText,
  pocLastName: shortText,
  pocPhone: phone,
  pocEmail: email,
  submitterTitle: shortText,
  signatureFirst: shortText,
  signatureLast: shortText,
  agreementConfirmed: z.boolean(),
});

export function maskSensitiveField(value: string): string {
  if (value.length < 4) return "****";
  return "****" + value.slice(-4);
}

export function sanitizeForStorage(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    "bankAcct", "bankAcctConfirm",
    "bankRouting", "bankRoutingConfirm",
    "achAccount", "achRouting",
  ];

  const sanitized = { ...data };
  for (const key of sensitiveKeys) {
    if (typeof sanitized[key] === "string" && sanitized[key]) {
      sanitized[key] = maskSensitiveField(sanitized[key] as string);
    }
  }
  return sanitized;
}
