export const BOROUGH_OPTIONS = [
  { value: "manhattan", label: "Manhattan" },
  { value: "brooklyn", label: "Brooklyn" },
  { value: "queens", label: "Queens" },
  { value: "bronx", label: "The Bronx" },
  { value: "staten-island", label: "Staten Island" },
] as const;

export const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" }, { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" }, { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" }, { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "PR", label: "Puerto Rico" }, { value: "GU", label: "Guam" },
  { value: "VI", label: "U.S. Virgin Islands" }, { value: "AS", label: "American Samoa" },
  { value: "MP", label: "Northern Mariana Islands" },
] as const;

export const PAYMENT_PATH_OPTIONS = [
  { value: "voucher", label: "Voucher / Subsidy" },
  { value: "out-of-pocket", label: "Out of Pocket" },
  { value: "other", label: "Other" },
] as const;

export const ASSIST_PROGRAM_OPTIONS = [
  { value: "NYCHA", label: "NYCHA" },
  { value: "HPD", label: "HPD" },
  { value: "HCV", label: "HCV (Section 8)" },
  { value: "CVR", label: "CVR" },
  { value: "HASA", label: "HASA" },
  { value: "CityFHEPS", label: "CityFHEPS" },
  { value: "Other", label: "Other" },
] as const;

export const SECTION_8_PROGRAMS = ["HCV", "NYCHA", "HPD", "CVR"] as const;

export const VOUCHER_BEDROOM_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "1", label: "1 Bed" },
  { value: "2", label: "2 Bed" },
  { value: "3", label: "3 Bed" },
  { value: "4", label: "4 Bed" },
  { value: "5", label: "5 Bed" },
] as const;

export const CREDIT_SCORE_OPTIONS = [
  { value: "below-500", label: "Below 500" },
  { value: "500-549", label: "500 - 549" },
  { value: "550-599", label: "550 - 599" },
  { value: "600-649", label: "600 - 649" },
  { value: "650-699", label: "650 - 699" },
  { value: "700+", label: "700+" },
] as const;

export const OCCUPANT_COUNT_OPTIONS = [
  { value: "1", label: "1" }, { value: "2", label: "2" },
  { value: "3", label: "3" }, { value: "4", label: "4" },
  { value: "5", label: "5" }, { value: "6", label: "6" },
  { value: "7", label: "7" }, { value: "7+", label: "7+" },
] as const;

export const PAY_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "salary", label: "Salary" },
] as const;

export const PAY_FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
] as const;

export const INCOME_SOURCE_OPTIONS = [
  { value: "cash-assistance", label: "Cash Assistance" },
  { value: "ssi", label: "SSI" },
  { value: "food-stamps", label: "Food Stamps (SNAP)" },
  { value: "other", label: "Other" },
  { value: "na", label: "N/A" },
] as const;

export const DOC_CATEGORIES = [
  "photoId",
  "socialSecurityCard",
  "voucherCoverLetter",
  "pinLetter",
  "cashAssistBudgetLetter",
  "ssiAwardLetter",
  "foodStampsLetter",
  "fullVoucher",
  "taxReturns",
  "bankStatement",
  "letterOfResidency",
  "landlordRecommendation",
  "other",
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

export interface DocCategoryConfig {
  key: DocCategory;
  label: string;
  helperText?: string;
  maxFiles: number;
}

export const DOC_CATEGORY_CONFIGS: Record<DocCategory, DocCategoryConfig> = {
  photoId: { key: "photoId", label: "Photo ID", helperText: "Front of a valid government-issued photo ID.", maxFiles: 3 },
  socialSecurityCard: { key: "socialSecurityCard", label: "Social Security Card", helperText: "Front of your Social Security card.", maxFiles: 3 },
  voucherCoverLetter: { key: "voucherCoverLetter", label: "Voucher Cover Letter", maxFiles: 5 },
  pinLetter: { key: "pinLetter", label: "PIN Letter", maxFiles: 3 },
  cashAssistBudgetLetter: { key: "cashAssistBudgetLetter", label: "Cash Assistance Budget Letter", maxFiles: 5 },
  ssiAwardLetter: { key: "ssiAwardLetter", label: "SSI Award Letter", maxFiles: 5 },
  foodStampsLetter: { key: "foodStampsLetter", label: "Food Stamps (SNAP) Proof", helperText: "SNAP award letter or recent benefit notice.", maxFiles: 5 },
  fullVoucher: { key: "fullVoucher", label: "Full Voucher (All Pages)", maxFiles: 10 },
  taxReturns: { key: "taxReturns", label: "Tax Returns (Last 2 Years)", helperText: "Most recent and prior year.", maxFiles: 10 },
  bankStatement: { key: "bankStatement", label: "Most Recent Bank Statement", maxFiles: 10 },
  letterOfResidency: { key: "letterOfResidency", label: "Letter of Residency", maxFiles: 3 },
  landlordRecommendation: { key: "landlordRecommendation", label: "Landlord Recommendation Letter", maxFiles: 3 },
  other: { key: "other", label: "Other Supporting Documents", helperText: "Any additional documents not listed above.", maxFiles: 10 },
};

export const OWNERSHIP_TYPE_OPTIONS = [
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "individual", label: "Individual" },
  { value: "partnership", label: "Partnership" },
  { value: "trust", label: "Trust" },
  { value: "other", label: "Other" },
] as const;

export const BANK_OPTIONS = [
  { value: "bank-of-america", label: "Bank of America" },
  { value: "capital-one", label: "Capital One" },
  { value: "chase", label: "Chase" },
  { value: "citibank", label: "Citibank" },
  { value: "citizens", label: "Citizens" },
  { value: "fifth-third", label: "Fifth Third" },
  { value: "goldman-sachs", label: "Goldman Sachs" },
  { value: "hsbc", label: "HSBC" },
  { value: "huntington", label: "Huntington" },
  { value: "keybank", label: "KeyBank" },
  { value: "mt-bank", label: "M&T Bank" },
  { value: "pnc", label: "PNC" },
  { value: "regions", label: "Regions" },
  { value: "santander", label: "Santander" },
  { value: "td-bank", label: "TD Bank" },
  { value: "truist", label: "Truist" },
  { value: "us-bank", label: "U.S. Bank" },
  { value: "wells-fargo", label: "Wells Fargo" },
  { value: "other", label: "Other" },
] as const;

export const PAYMENT_PREFERENCE_OPTIONS = [
  { value: "electronic", label: "Electronic (ACH)" },
  { value: "check", label: "Check" },
] as const;

export const ACCOUNT_TYPE_OPTIONS = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
] as const;

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export const FLOOR_OPTIONS = [
  { value: "basement", label: "Basement" },
  { value: "ground", label: "Ground" },
  ...Array.from({ length: 20 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}${ordinalSuffix(i + 1)} Floor`,
  })),
] as const;

export const UNIT_BEDROOM_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "1", label: "1 Bedroom" },
  { value: "2", label: "2 Bedrooms" },
  { value: "3", label: "3 Bedrooms" },
  { value: "4", label: "4 Bedrooms" },
  { value: "5", label: "5 Bedrooms" },
] as const;

export const SUBMITTER_TITLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "property-manager", label: "Property Manager" },
  { value: "assistant-manager", label: "Assistant Manager" },
  { value: "managing-agent", label: "Managing Agent" },
  { value: "authorized-rep", label: "Authorized Representative" },
  { value: "other", label: "Other" },
] as const;

export const YEAR_BUILT_OPTIONS = Array.from({ length: 127 }, (_, i) => {
  const year = 2026 - i;
  return { value: String(year), label: String(year) };
});

export const STORIES_OPTIONS = Array.from({ length: 50 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

export const UTIL_HEATING_OPTIONS = [
  { value: "gas-owner", label: "Gas (Owner Pays)" },
  { value: "gas-tenant", label: "Gas (Tenant Pays)" },
  { value: "oil-owner", label: "Oil (Owner Pays)" },
  { value: "oil-tenant", label: "Oil (Tenant Pays)" },
  { value: "electric-owner", label: "Electric (Owner Pays)" },
  { value: "electric-tenant", label: "Electric (Tenant Pays)" },
  { value: "steam-owner", label: "Steam (Owner Pays)" },
  { value: "na", label: "N/A" },
] as const;

export const UTIL_COOKING_OPTIONS = [
  { value: "owner", label: "Owner Pays" },
  { value: "tenant", label: "Tenant Pays" },
  { value: "electric-owner", label: "Electric (Owner)" },
  { value: "electric-tenant", label: "Electric (Tenant)" },
  { value: "na", label: "N/A" },
] as const;

export const UTIL_HOT_WATER_OPTIONS = [
  { value: "gas-owner", label: "Gas (Owner Pays)" },
  { value: "gas-tenant", label: "Gas (Tenant Pays)" },
  { value: "oil-owner", label: "Oil (Owner Pays)" },
  { value: "oil-tenant", label: "Oil (Tenant Pays)" },
  { value: "electric-owner", label: "Electric (Owner Pays)" },
  { value: "electric-tenant", label: "Electric (Tenant Pays)" },
  { value: "na", label: "N/A" },
] as const;

export const UTIL_ELECTRIC_OPTIONS = [
  { value: "owner", label: "Owner Pays" },
  { value: "tenant", label: "Tenant Pays" },
  { value: "shared", label: "Shared Meter" },
  { value: "na", label: "N/A" },
] as const;

export const UTIL_WATER_OPTIONS = [
  { value: "owner", label: "Owner Pays" },
  { value: "tenant", label: "Tenant Pays" },
  { value: "included", label: "Included" },
  { value: "na", label: "N/A" },
] as const;

export const UTIL_SEWER_OPTIONS = [
  { value: "owner", label: "Owner Pays" },
  { value: "tenant", label: "Tenant Pays" },
  { value: "included", label: "Included" },
  { value: "na", label: "N/A" },
] as const;

export const UTIL_TRASH_OPTIONS = [
  { value: "owner", label: "Owner Pays" },
  { value: "tenant", label: "Tenant Pays" },
  { value: "municipal", label: "Municipal" },
  { value: "na", label: "N/A" },
] as const;

export const UTIL_AC_OPTIONS = [
  { value: "central-owner", label: "Central (Owner)" },
  { value: "central-tenant", label: "Central (Tenant)" },
  { value: "window-tenant", label: "Window Units (Tenant)" },
  { value: "none", label: "None" },
  { value: "na", label: "N/A" },
] as const;
