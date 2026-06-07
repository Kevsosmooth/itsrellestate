/**
 * required-docs.ts
 *
 * Pure module — no env vars, no external service imports.
 * Computes which documents are required for a given application.
 *
 * Used by:
 *   - Client forms (requiredDocCategories) to display required-doc lists
 *   - Server routes (requiredDocSlots) to verify completeness before billing
 */

import {
  SECTION_8_PROGRAMS,
} from "./form-constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocSlot {
  category: string;
  person: string;
}

// Minimal shape of an occupant as it appears in form data.
interface OccupantLike {
  name: string;
  over18: string;
}

// The per-person doc categories (photoId + socialSecurityCard are required for
// every adult occupant, including the primary applicant).
const PER_PERSON_DOC_CATEGORIES: readonly string[] = [
  "photoId",
  "socialSecurityCard",
];

// Used as the person identifier for the primary applicant in DocSlot.
// The client form uses "__primary__" as its internal key; the shared module
// uses "primary" (the server-visible stable identifier).
export const PRIMARY_APPLICANT_KEY = "primary";

// ---------------------------------------------------------------------------
// Internal helpers (mirror the client-side helpers verbatim)
// ---------------------------------------------------------------------------

function getAdultOccupantsFromData(
  data: Record<string, unknown>,
): { key: string; label: string }[] {
  const occupants = data.occupants;
  if (!Array.isArray(occupants)) return [];
  return (occupants as OccupantLike[])
    .filter((o) => o.over18 === "yes" && typeof o.name === "string" && o.name.trim())
    .map((o) => ({ key: o.name.trim(), label: o.name.trim() }));
}

function getTenantRequiredCategories(data: Record<string, unknown>): string[] {
  const required: string[] = ["photoId", "socialSecurityCard"];

  const paymentPath = data.paymentPath as string | undefined;
  const assistProgram = data.assistProgram as string | undefined;
  const incomeSources = Array.isArray(data.incomeSources)
    ? (data.incomeSources as string[])
    : [];

  const isVoucher = paymentPath === "voucher";
  const isOutOfPocket = paymentPath === "out-of-pocket";
  const isOtherPath = paymentPath === "other";
  const isSection8 =
    isVoucher &&
    SECTION_8_PROGRAMS.includes(
      assistProgram as (typeof SECTION_8_PROGRAMS)[number],
    );
  const isCityFHEPS = isVoucher && assistProgram === "CityFHEPS";
  const isHASA = isVoucher && assistProgram === "HASA";
  const isOtherProgram = isVoucher && assistProgram === "Other";

  if (isSection8) {
    required.push("voucherCoverLetter", "pinLetter");
  }
  if (incomeSources.includes("cash-assistance")) {
    required.push("cashAssistBudgetLetter");
  }
  if (incomeSources.includes("ssi")) {
    required.push("ssiAwardLetter");
  }
  if (incomeSources.includes("food-stamps")) {
    required.push("foodStampsLetter");
  }
  if (isCityFHEPS) {
    required.push("fullVoucher");
  }
  if (isHASA || isOtherProgram || isOutOfPocket || isOtherPath) {
    required.push("taxReturns", "bankStatement");
  }

  return required;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the list of required document category keys for the given
 * application type and form data.
 *
 * This is the same category-level rule the client already uses; importing this
 * function keeps both sides in sync.
 */
export function requiredDocCategories(
  formType: "tenant" | "landlord",
  data: Record<string, unknown>,
): string[] {
  if (formType === "landlord") return [];
  return getTenantRequiredCategories(data);
}

/**
 * Expands required categories into individual {category, person} slots.
 *
 * Per-person categories (photoId, socialSecurityCard) produce one slot per
 * adult in the household: one for the primary applicant (person =
 * PRIMARY_APPLICANT_KEY) and one per named adult occupant (person = their
 * trimmed name).
 *
 * All other categories produce a single slot with person = PRIMARY_APPLICANT_KEY.
 *
 * The server uses this to know the exact set of required uploads before
 * considering a submission complete.
 */
export function requiredDocSlots(
  formType: "tenant" | "landlord",
  data: Record<string, unknown>,
): DocSlot[] {
  const categories = requiredDocCategories(formType, data);
  if (categories.length === 0) return [];

  const adults = getAdultOccupantsFromData(data);
  const slots: DocSlot[] = [];

  for (const category of categories) {
    if (PER_PERSON_DOC_CATEGORIES.includes(category)) {
      // Primary applicant always gets a slot.
      slots.push({ category, person: PRIMARY_APPLICANT_KEY });
      // Each named adult occupant also gets a slot.
      for (const adult of adults) {
        slots.push({ category, person: adult.key });
      }
    } else {
      slots.push({ category, person: PRIMARY_APPLICANT_KEY });
    }
  }

  return slots;
}
