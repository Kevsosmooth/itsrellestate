export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatZip(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

const DOB_MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

// Normalizes a date of birth to MM-DD-YYYY. Tolerant of whatever a browser
// autofill injects — ISO "1985-05-05", text "May 5, 1985", slashes, or missing
// leading zeros — so a real applicant is never blocked because their saved
// birthday isn't already month-first. Falls back to a progressive digit mask so
// manual typing still auto-inserts the dashes as the user goes.
export function formatDOB(raw: string): string {
  if (!raw) return "";
  const text = raw.trim();

  const toMDY = (m: string, d: string, y: string) =>
    `${m.padStart(2, "0")}-${d.padStart(2, "0")}-${y}`;
  const expandYear = (y: string): string => {
    if (y.length >= 4) return y.slice(0, 4);
    if (y.length === 2) {
      const cutoff = new Date().getFullYear() % 100;
      return (parseInt(y, 10) <= cutoff ? "20" : "19") + y;
    }
    return y;
  };

  // ISO (YYYY-MM-DD / YYYY/MM/DD) — the digit mask never starts with 4 digits.
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return toMDY(iso[2], iso[3], iso[1]);

  // Text month ("May 5, 1985", "5 May 1985").
  const monthWord = text
    .toLowerCase()
    .match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/);
  if (monthWord) {
    const mm = DOB_MONTHS[monthWord[0]];
    const nums = text.replace(/[^\d ]/g, " ").match(/\d+/g) ?? [];
    const year = nums.find((n) => n.length === 4);
    const day = nums.find((n) => n !== year);
    if (mm && year && day) return toMDY(mm, day, year);
  }

  // Slash/dot separated, or dash-separated with a complete 4-digit year. Typing
  // never produces slashes, and the dash branch only matches once the full year
  // is entered, so partial typed values (e.g. "05-05-19") fall through untouched.
  const sep =
    text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/) ??
    text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (sep) return toMDY(sep[1], sep[2], expandYear(sep[3]));

  // Manual typing: progressive digit mask -> MM-DD-YYYY.
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export function formatEIN(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function formatSSN(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function formatCurrency(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return parts[0] + "." + parts[1];
  if (parts[1] !== undefined && parts[1].length > 2) {
    return parts[0] + "." + parts[1].slice(0, 2);
  }
  return cleaned;
}
