import type { StagedFile } from "@/components/forms/file-upload";
import type { DocCategory } from "@/lib/form-constants";

export type StagedAttachments = Record<DocCategory, StagedFile[]>;

export interface FormStepDef {
  id: string;
  label: string;
  shortLabel?: string;
  validate: (data: Record<string, unknown>) => Record<string, string>;
}

export type ValidationErrors = Record<string, string>;

export interface Occupant {
  [key: string]: unknown;
  id: number;
  name: string;
  relationship: string;
  over18: "yes" | "no" | "";
}

export interface TenantFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  cellPhone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredBorough: string;
  currentStreet: string;
  currentStreet2: string;
  currentCity: string;
  currentState: string;
  currentZip: string;
  viewedApartment: "yes" | "no" | "";
  viewingDate: string;

  paymentPath: "voucher" | "out-of-pocket" | "other" | "";
  hasAssistance: "yes" | "no" | "";
  assistProgram: string;
  otherProgramName: string;
  voucherBedrooms: string;
  voucherNumber: string;
  voucherExpDate: string;
  isTransferring: "yes" | "no" | "";
  monthlyIncome: string;
  pathOtherNotes: string;
  fromShelter: "yes" | "no" | "";
  landlordName: string;
  landlordPhone: string;
  landlordEmail: string;
  cashAssistActive: "yes" | "no" | "";
  creditScore: string;

  hasOccupants: "yes" | "no" | "";
  occupantCount: string;
  occupants: Occupant[];
  currentlyWorking: "yes" | "no" | "";
  employerName: string;
  employerAddress: string;
  supervisorName: string;
  supervisorPhone: string;
  payType: "hourly" | "salary" | "";
  payAmount: string;
  hoursPerWeek: string;
  payFrequency: string;
  isVeteran: "yes" | "no" | "";
  filedTaxes: "yes" | "no" | "";

  incomeSources: string[];
  otherIncomeSource: string;
  housingSpecName: string;
  housingSpecPhone: string;
  housingSpecEmail: string;

  paymentConfirmed: boolean;

  isSmoker: "yes" | "no" | "";
  hasPets: "yes" | "no" | "";
  disclosureAgreed: boolean;
  /**
   * Marketing communications opt-in. Defaults to false. When true, the
   * applicant has consented to promotional emails / SMS. Stored in the
   * sheet (Tenant Applications column BH) and into contacts.
   * marketing_opt_in via the application webhook on the CMS side.
   */
  marketingOptIn: boolean;
  signatureFirst: string;
  signatureLast: string;
}

export interface RentalUnit {
  [key: string]: unknown;
  id: number;
  unitNumber: string;
  floor: string;
  bedrooms: string;
  rent: string;
}

export interface LandlordFormData {
  propAddress: string;
  propAddress2: string;
  propCity: string;
  propState: string;
  propZip: string;
  ownershipType: string;
  taxId: string;
  legalBusinessName: string;
  legalName: string;
  paymentPreference: "electronic" | "check" | "";
  bankName: string;
  bankNameOther: string;
  accountType: "checking" | "savings" | "";
  accountName: string;
  bankAcct: string;
  bankAcctConfirm: string;
  bankRouting: string;
  bankRoutingConfirm: string;

  mailAddress: string;
  mailAddress2: string;
  mailCity: string;
  mailState: string;
  mailZip: string;
  llFirstName: string;
  llLastName: string;
  llPhone: string;
  llEmail: string;
  hasAuthRep: "yes" | "no" | "";
  authRepFirst: string;
  authRepLast: string;
  authRepPhone: string;
  authRepEmail: string;

  yearBuilt: string;
  totalStories: string;
  residentialUnits: string;
  commercialUnits: string;
  rentStabilized: "yes" | "no" | "";
  utilHeating: string;
  utilCooking: string;
  utilHotWater: string;
  utilElectric: string;
  utilWater: string;
  utilSewer: string;
  utilTrash: string;
  utilAC: string;

  units: RentalUnit[];

  payCheck: boolean;
  payZelle: boolean;
  payACH: boolean;
  checkPayable: string;
  checkAddress: string;
  checkCity: string;
  checkState: string;
  checkZip: string;
  zellePhone: string;
  zelleEmail: string;
  achAccount: string;
  achRouting: string;
  pocFirstName: string;
  pocLastName: string;
  pocPhone: string;
  pocEmail: string;

  submitterTitle: string;
  signatureFirst: string;
  signatureLast: string;
  agreementConfirmed: boolean;
}

export function createEmptyTenantForm(): TenantFormData {
  return {
    firstName: "", lastName: "", dateOfBirth: "", cellPhone: "", email: "",
    emergencyContactName: "", emergencyContactPhone: "", preferredBorough: "",
    currentStreet: "", currentStreet2: "", currentCity: "", currentState: "",
    currentZip: "", viewedApartment: "", viewingDate: "",
    paymentPath: "",
    hasAssistance: "", assistProgram: "", otherProgramName: "",
    voucherBedrooms: "", voucherNumber: "", voucherExpDate: "",
    isTransferring: "", monthlyIncome: "", pathOtherNotes: "",
    fromShelter: "", landlordName: "", landlordPhone: "",
    landlordEmail: "", cashAssistActive: "", creditScore: "",
    hasOccupants: "", occupantCount: "", occupants: [],
    currentlyWorking: "", employerName: "", employerAddress: "",
    supervisorName: "", supervisorPhone: "",
    payType: "", payAmount: "", hoursPerWeek: "", payFrequency: "",
    isVeteran: "", filedTaxes: "",
    incomeSources: [], otherIncomeSource: "",
    housingSpecName: "", housingSpecPhone: "", housingSpecEmail: "",
    paymentConfirmed: false,
    isSmoker: "", hasPets: "", disclosureAgreed: false,
    marketingOptIn: false,
    signatureFirst: "", signatureLast: "",
  };
}

export function createEmptyStagedAttachments(): StagedAttachments {
  return {
    photoId: [], socialSecurityCard: [], voucherCoverLetter: [], pinLetter: [],
    cashAssistBudgetLetter: [], ssiAwardLetter: [], foodStampsLetter: [],
    fullVoucher: [], taxReturns: [], bankStatement: [], letterOfResidency: [],
    landlordRecommendation: [], other: [],
  };
}

export function createEmptyLandlordForm(): LandlordFormData {
  return {
    propAddress: "", propAddress2: "", propCity: "", propState: "", propZip: "",
    ownershipType: "", taxId: "", legalBusinessName: "", legalName: "",
    paymentPreference: "", bankName: "", bankNameOther: "",
    accountType: "", accountName: "", bankAcct: "", bankAcctConfirm: "",
    bankRouting: "", bankRoutingConfirm: "",
    mailAddress: "", mailAddress2: "", mailCity: "", mailState: "", mailZip: "",
    llFirstName: "", llLastName: "", llPhone: "", llEmail: "",
    hasAuthRep: "", authRepFirst: "", authRepLast: "",
    authRepPhone: "", authRepEmail: "",
    yearBuilt: "", totalStories: "", residentialUnits: "", commercialUnits: "",
    rentStabilized: "",
    utilHeating: "", utilCooking: "", utilHotWater: "", utilElectric: "",
    utilWater: "", utilSewer: "", utilTrash: "", utilAC: "",
    units: [{ id: 1, unitNumber: "", floor: "", bedrooms: "", rent: "" }],
    payCheck: false, payZelle: false, payACH: false,
    checkPayable: "", checkAddress: "", checkCity: "", checkState: "", checkZip: "",
    zellePhone: "", zelleEmail: "", achAccount: "", achRouting: "",
    pocFirstName: "", pocLastName: "", pocPhone: "", pocEmail: "",
    submitterTitle: "", signatureFirst: "", signatureLast: "",
    agreementConfirmed: false,
  };
}
