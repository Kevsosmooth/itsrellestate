import type { TenantFormData, LandlordFormData, ValidationErrors } from "./form-types";
import { SECTION_8_PROGRAMS } from "./form-constants";
import * as v from "./form-validators";

function clean(errors: Record<string, string | null>): ValidationErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([, val]) => val !== null),
  ) as ValidationErrors;
}

export function validateTenantStep1(data: TenantFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  e.firstName = v.required(data.firstName, "First name") ?? v.noDigits(data.firstName, "First name");
  e.lastName = v.required(data.lastName, "Last name") ?? v.noDigits(data.lastName, "Last name");
  e.dateOfBirth = v.required(data.dateOfBirth, "Date of birth") ?? v.dateOfBirth(data.dateOfBirth);
  e.cellPhone = v.required(data.cellPhone, "Phone number") ?? v.phone(data.cellPhone);
  e.email = v.required(data.email, "Email") ?? v.email(data.email);
  if (data.emergencyContactName) e.emergencyContactName = v.noDigits(data.emergencyContactName, "Emergency contact name");
  if (data.emergencyContactPhone) e.emergencyContactPhone = v.phone(data.emergencyContactPhone);
  e.preferredBorough = v.required(data.preferredBorough, "Preferred borough");
  e.currentStreet = v.required(data.currentStreet, "Street address");
  e.currentCity = v.required(data.currentCity, "City");
  e.currentState = v.required(data.currentState, "State");
  e.currentZip = v.required(data.currentZip, "ZIP code") ?? v.zipCode(data.currentZip);
  e.viewedApartment = v.required(data.viewedApartment, "Apartment viewing");
  if (data.viewedApartment === "no") {
    e.viewingDate = v.required(data.viewingDate, "Preferred viewing date");
  }
  return clean(e);
}

export function validateTenantStep2(data: TenantFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  e.hasAssistance = v.required(data.hasAssistance, "Rental assistance");
  e.fromShelter = v.required(data.fromShelter, "Shelter status");

  if (data.hasAssistance === "yes") {
    e.assistProgram = v.required(data.assistProgram, "Assistance program");
    e.voucherBedrooms = v.required(data.voucherBedrooms, "Voucher bedrooms");
    e.cashAssistActive = v.required(data.cashAssistActive, "Cash assistance");

    if (data.assistProgram === "Other") {
      e.otherProgramName = v.required(data.otherProgramName, "Program name");
    }

    if (SECTION_8_PROGRAMS.includes(data.assistProgram as typeof SECTION_8_PROGRAMS[number])) {
      e.voucherNumber = v.required(data.voucherNumber, "Voucher number") ??
        v.voucherCaseNumber(data.voucherNumber);
      e.voucherExpDate = v.required(data.voucherExpDate, "Voucher expiration") ??
        v.voucherExpiration(data.voucherExpDate);
      e.isTransferring = v.required(data.isTransferring, "Transfer status");
    }
  }

  if (data.fromShelter === "no") {
    e.landlordName = v.required(data.landlordName, "Landlord name");
    e.landlordPhone = v.required(data.landlordPhone, "Landlord phone") ?? v.phone(data.landlordPhone);
    if (data.landlordEmail) e.landlordEmail = v.email(data.landlordEmail);
  }

  return clean(e);
}

export function validateTenantStep3(data: TenantFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  e.hasOccupants = v.required(data.hasOccupants, "Additional occupants");

  if (data.hasOccupants === "yes") {
    e.occupantCount = v.required(data.occupantCount, "Number of occupants");
    data.occupants.forEach((occ, i) => {
      if (!occ.name.trim()) e[`occupant-${i}-name`] = `Occupant ${i + 1} name is required`;
      if (!occ.relationship.trim()) e[`occupant-${i}-relationship`] = `Occupant ${i + 1} relationship is required`;
      if (!occ.over18) e[`occupant-${i}-over18`] = `Occupant ${i + 1} age is required`;
    });
  }

  e.currentlyWorking = v.required(data.currentlyWorking, "Employment status");
  if (data.currentlyWorking === "yes") {
    e.employerName = v.required(data.employerName, "Employer name");
    if (data.supervisorPhone) e.supervisorPhone = v.phone(data.supervisorPhone);
    e.payType = v.required(data.payType, "Pay type");
    e.payAmount = v.required(data.payAmount, "Pay amount") ?? v.numeric(data.payAmount, "Pay amount");
    if (data.payType === "hourly") {
      e.hoursPerWeek = v.required(data.hoursPerWeek, "Hours per week") ?? v.numeric(data.hoursPerWeek, "Hours per week");
    }
    if (data.payType === "salary") {
      e.payFrequency = v.required(data.payFrequency, "Pay frequency");
    }
  }

  e.isVeteran = v.required(data.isVeteran, "Veteran status");
  e.filedTaxes = v.required(data.filedTaxes, "Tax filing");
  return clean(e);
}

export function validateTenantStep4(data: TenantFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  if (data.incomeSources.length === 0) e.incomeSources = "Select at least one income source";
  if (data.incomeSources.includes("other") && !data.otherIncomeSource.trim()) {
    e.otherIncomeSource = "Specify the other income source";
  }
  if (data.fromShelter === "yes") {
    e.housingSpecName = v.required(data.housingSpecName, "Housing specialist name");
    e.housingSpecPhone = v.required(data.housingSpecPhone, "Housing specialist phone") ?? v.phone(data.housingSpecPhone);
    e.housingSpecEmail = v.required(data.housingSpecEmail, "Housing specialist email") ?? v.email(data.housingSpecEmail);
  } else {
    if (data.housingSpecPhone) e.housingSpecPhone = v.phone(data.housingSpecPhone);
    if (data.housingSpecEmail) e.housingSpecEmail = v.email(data.housingSpecEmail);
  }
  return clean(e);
}

export function validateTenantStep5(data: TenantFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  if (!data.paymentConfirmed) e.paymentConfirmed = "You must acknowledge the processing fee";
  return clean(e);
}

export function validateTenantStep6(data: TenantFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  e.isSmoker = v.required(data.isSmoker, "Smoking status");
  e.hasPets = v.required(data.hasPets, "Pets");
  if (!data.disclosureAgreed) e.disclosureAgreed = "You must agree to the disclosure";
  e.signatureFirst = v.required(data.signatureFirst, "First name signature") ??
    v.signatureMatch(data.signatureFirst, data.firstName);
  e.signatureLast = v.required(data.signatureLast, "Last name signature") ??
    v.signatureMatch(data.signatureLast, data.lastName);
  return clean(e);
}

export function validateLandlordStep1(data: LandlordFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  e.propAddress = v.required(data.propAddress, "Property address");
  e.propCity = v.required(data.propCity, "City");
  e.propState = v.required(data.propState, "State");
  e.propZip = v.required(data.propZip, "ZIP code") ?? v.zipCode(data.propZip);
  e.ownershipType = v.required(data.ownershipType, "Ownership type");

  if (data.ownershipType === "individual") {
    e.legalName = v.required(data.legalName, "Legal name");
    e.taxId = v.required(data.taxId, "Social Security Number") ?? v.ssn(data.taxId);
  } else if (data.ownershipType) {
    e.legalBusinessName = v.required(data.legalBusinessName, "Business name");
    e.taxId = v.required(data.taxId, "EIN") ?? v.ein(data.taxId);
  }

  e.paymentPreference = v.required(data.paymentPreference, "Payment preference");
  if (data.paymentPreference === "electronic") {
    e.bankName = v.required(data.bankName, "Bank name");
    if (data.bankName === "other") e.bankNameOther = v.required(data.bankNameOther, "Bank name");
    e.accountType = v.required(data.accountType, "Account type");
    e.accountName = v.required(data.accountName, "Name on account");
    e.bankAcct = v.required(data.bankAcct, "Account number");
    e.bankAcctConfirm = v.required(data.bankAcctConfirm, "Confirm account number") ??
      v.confirmMatch(data.bankAcctConfirm, data.bankAcct, "Account number");
    e.bankRouting = v.required(data.bankRouting, "Routing number") ?? v.routingNumber(data.bankRouting);
    e.bankRoutingConfirm = v.required(data.bankRoutingConfirm, "Confirm routing number") ??
      v.confirmMatch(data.bankRoutingConfirm, data.bankRouting, "Routing number");
  }

  return clean(e);
}

export function validateLandlordStep2(data: LandlordFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  e.mailAddress = v.required(data.mailAddress, "Mailing address");
  e.mailCity = v.required(data.mailCity, "City");
  e.mailState = v.required(data.mailState, "State");
  e.mailZip = v.required(data.mailZip, "ZIP code") ?? v.zipCode(data.mailZip);
  e.llFirstName = v.required(data.llFirstName, "First name") ?? v.noDigits(data.llFirstName, "First name");
  e.llLastName = v.required(data.llLastName, "Last name") ?? v.noDigits(data.llLastName, "Last name");
  e.llPhone = v.required(data.llPhone, "Phone") ?? v.phone(data.llPhone);
  e.llEmail = v.required(data.llEmail, "Email") ?? v.email(data.llEmail);
  e.hasAuthRep = v.required(data.hasAuthRep, "Authorized representative");

  if (data.hasAuthRep === "yes") {
    e.authRepFirst = v.required(data.authRepFirst, "Rep first name");
    e.authRepLast = v.required(data.authRepLast, "Rep last name");
    e.authRepPhone = v.required(data.authRepPhone, "Rep phone") ?? v.phone(data.authRepPhone);
    e.authRepEmail = v.required(data.authRepEmail, "Rep email") ?? v.email(data.authRepEmail);
  }

  return clean(e);
}

export function validateLandlordStep3(data: LandlordFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  e.yearBuilt = v.required(data.yearBuilt, "Year built");
  e.totalStories = v.required(data.totalStories, "Total stories");
  e.residentialUnits = v.required(data.residentialUnits, "Residential units") ?? v.numeric(data.residentialUnits, "Residential units");
  if (data.commercialUnits) e.commercialUnits = v.numeric(data.commercialUnits, "Commercial units");
  e.rentStabilized = v.required(data.rentStabilized, "Rent stabilized");
  e.utilHeating = v.required(data.utilHeating, "Heating");
  e.utilCooking = v.required(data.utilCooking, "Cooking");
  e.utilHotWater = v.required(data.utilHotWater, "Hot water");
  e.utilElectric = v.required(data.utilElectric, "Electricity");
  e.utilWater = v.required(data.utilWater, "Water");
  e.utilSewer = v.required(data.utilSewer, "Sewer");
  e.utilTrash = v.required(data.utilTrash, "Trash");
  e.utilAC = v.required(data.utilAC, "Air conditioning");
  return clean(e);
}

export function validateLandlordStep4(data: LandlordFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  if (data.units.length === 0) {
    e.units = "Add at least one unit";
    return clean(e);
  }
  data.units.forEach((unit, i) => {
    if (!unit.unitNumber.trim()) e[`unit-${i}-unitNumber`] = `Unit ${i + 1} number is required`;
    if (!unit.floor) e[`unit-${i}-floor`] = `Unit ${i + 1} floor is required`;
    if (!unit.bedrooms) e[`unit-${i}-bedrooms`] = `Unit ${i + 1} bedrooms is required`;
    if (!unit.rent.trim()) e[`unit-${i}-rent`] = `Unit ${i + 1} rent is required`;
    else {
      const numErr = v.numeric(unit.rent, `Unit ${i + 1} rent`);
      if (numErr) e[`unit-${i}-rent`] = numErr;
    }
  });
  return clean(e);
}

export function validateLandlordStep5(data: LandlordFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  if (!data.payCheck && !data.payZelle && !data.payACH) {
    e.paymentMethod = "Select at least one payment method";
  }

  if (data.payCheck) {
    e.checkPayable = v.required(data.checkPayable, "Payable to");
    e.checkAddress = v.required(data.checkAddress, "Check address");
    e.checkCity = v.required(data.checkCity, "City");
    e.checkState = v.required(data.checkState, "State");
    e.checkZip = v.required(data.checkZip, "ZIP code") ?? v.zipCode(data.checkZip);
  }

  if (data.payZelle) {
    e.zellePhone = v.required(data.zellePhone, "Zelle phone") ?? v.phone(data.zellePhone);
    if (data.zelleEmail) e.zelleEmail = v.email(data.zelleEmail);
  }

  if (data.payACH) {
    e.achAccount = v.required(data.achAccount, "Account number");
    e.achRouting = v.required(data.achRouting, "Routing number") ?? v.routingNumber(data.achRouting);
  }

  e.pocFirstName = v.required(data.pocFirstName, "First name") ?? v.noDigits(data.pocFirstName, "First name");
  e.pocLastName = v.required(data.pocLastName, "Last name") ?? v.noDigits(data.pocLastName, "Last name");
  e.pocPhone = v.required(data.pocPhone, "Phone") ?? v.phone(data.pocPhone);
  e.pocEmail = v.required(data.pocEmail, "Email") ?? v.email(data.pocEmail);
  return clean(e);
}

export function validateLandlordStep6(data: LandlordFormData): ValidationErrors {
  const e: Record<string, string | null> = {};
  e.submitterTitle = v.required(data.submitterTitle, "Title");
  if (!data.agreementConfirmed) e.agreementConfirmed = "You must agree to the terms";
  e.signatureFirst = v.required(data.signatureFirst, "First name signature");
  e.signatureLast = v.required(data.signatureLast, "Last name signature");
  return clean(e);
}
