export function required(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return `${label} is required`;
  if (typeof value === "string" && value.trim() === "") return `${label} is required`;
  if (Array.isArray(value) && value.length === 0) return `${label} is required`;
  if (typeof value === "boolean" && !value) return `${label} is required`;
  return null;
}

export function noDigits(value: string, label: string): string | null {
  if (!value) return null;
  if (/\d/.test(value)) return `${label} must not contain numbers`;
  return null;
}

export function email(value: string): string | null {
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address";
  return null;
}

export function phone(value: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10) return "Enter a valid 10-digit phone number";
  return null;
}

export function zipCode(value: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!/^\d{5}(\d{4})?$/.test(digits)) return "Enter a valid ZIP code (XXXXX or XXXXX-XXXX)";
  return null;
}

export function dateOfBirth(value: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return "Enter a valid date of birth (MM-DD-YYYY)";

  const month = parseInt(digits.slice(0, 2), 10);
  const day = parseInt(digits.slice(2, 4), 10);
  const year = parseInt(digits.slice(4, 8), 10);
  const currentYear = new Date().getFullYear();

  if (month < 1 || month > 12) return "Enter a valid date of birth (MM-DD-YYYY)";
  if (day < 1 || day > 31) return "Enter a valid date of birth (MM-DD-YYYY)";
  if (year < 1900 || year > currentYear) return "Enter a valid date of birth (MM-DD-YYYY)";

  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return "Enter a valid date of birth (MM-DD-YYYY)";
  }

  const today = new Date();
  const age = today.getFullYear() - year -
    (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day) ? 1 : 0);
  if (age < 18) return "Applicant must be at least 18 years old";

  return null;
}

export function ein(value: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 9) return "Enter a valid EIN (XX-XXXXXXX)";
  return null;
}

export function ssn(value: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 9) return "Enter a valid Social Security Number";
  return null;
}

export function numeric(value: string, label: string): string | null {
  if (!value) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(value)) return `${label} must be a number`;
  return null;
}

export function routingNumber(value: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 9) return "Routing number must be 9 digits";
  return null;
}

export function confirmMatch(value: string, compareValue: string, label: string): string | null {
  if (!value) return null;
  if (value !== compareValue) return `${label} does not match`;
  return null;
}

export function signatureMatch(typed: string, original: string): string | null {
  if (!typed) return null;
  if (typed.trim().toLowerCase() !== original.trim().toLowerCase()) {
    return "Signature must match the name provided in Step 1";
  }
  return null;
}

export function voucherExpiration(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Enter a valid expiration date";

  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const exp = new Date(year, month - 1, day);
  if (exp.getFullYear() !== year || exp.getMonth() !== month - 1 || exp.getDate() !== day) {
    return "Enter a valid expiration date";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (exp.getTime() <= today.getTime()) return "Voucher expiration must be in the future";

  const maxFuture = new Date(today);
  maxFuture.setMonth(maxFuture.getMonth() + 18);
  if (exp.getTime() > maxFuture.getTime()) {
    return "Expiration is too far in the future, double-check the date";
  }

  return null;
}

export function voucherCaseNumber(value: string): string | null {
  if (!value) return null;
  if (value.length > 20) return "Number is too long";
  if (!/^[a-zA-Z0-9-]+$/.test(value)) return "Use letters, numbers, or dashes only";
  return null;
}

export function sanitizeVoucherCaseNumber(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 20).toUpperCase();
}
