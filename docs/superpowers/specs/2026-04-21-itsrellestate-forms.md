# ItsRellEstate - Multi-Step Application Forms Design Spec

## Overview

Two multi-step application forms -- Tenant (6 steps) and Landlord (6 steps) -- built on shared form infrastructure. Both live under `/apply/tenant` and `/apply/landlord` as client-rendered Next.js App Router pages.

The forms collect structured data for manual review by Nyrell. There is no backend integration in V1 -- forms write to localStorage during completion and will submit via API route to Google Sheets in a future phase.

---

## 1. File Architecture

```
src/
  lib/
    form-types.ts           -- All TypeScript interfaces
    form-validators.ts      -- Validation functions (pure, no side effects)
    form-formatters.ts      -- Input formatting (phone, zip, EIN, SSN, DOB)
    form-storage.ts         -- localStorage save/restore/clear helpers
    form-constants.ts       -- Option lists, step definitions, labels
  components/
    forms/
      form-wizard.tsx        -- Step navigation + progress + prev/next/submit
      form-field.tsx         -- Label + input + error + aria wrapper
      form-section.tsx       -- Visual grouping with optional heading
      pill-select.tsx        -- Clickable pill/chip selector
      yes-no-toggle.tsx      -- Styled yes/no radio pair
      repeater-field.tsx     -- Dynamic add/remove rows
      payment-step.tsx       -- $20 fee instructions (tenant only)
      form-success.tsx       -- Post-submit confirmation screen
  app/
    apply/
      tenant/
        page.tsx             -- Server component shell (Navbar + Footer)
        tenant-form.tsx      -- "use client" -- wizard + all 6 steps
      landlord/
        page.tsx             -- Server component shell (Navbar + Footer)
        landlord-form.tsx    -- "use client" -- wizard + all 6 steps
```

Each step's field layout is defined inline within the tenant-form.tsx / landlord-form.tsx files. Steps are not separate files -- they are render functions selected by the wizard's `currentStep` state. This keeps each form self-contained while sharing the building-block components.

---

## 2. TypeScript Interfaces (`src/lib/form-types.ts`)

### Shared Primitives

```ts
/** A single step definition used by FormWizard. */
interface FormStepDef {
  /** Unique key, e.g. "contact", "assistance". */
  id: string;
  /** Human-readable label shown in progress indicator, e.g. "Contact Info". */
  label: string;
  /** Short label for mobile progress (optional -- falls back to label). */
  shortLabel?: string;
  /**
   * Validate only the fields belonging to this step.
   * Returns an object mapping field names to error strings.
   * An empty object means the step is valid.
   */
  validate: (data: Record<string, unknown>) => Record<string, string>;
}

/** Shape returned by every validator. Key = field name, value = error message. */
type ValidationErrors = Record<string, string>;
```

### Tenant Form Data

```ts
interface Occupant {
  name: string;
  relationship: string;
  over18: "yes" | "no" | "";
}

interface TenantFormData {
  /* --- Step 1: Contact Info --- */
  firstName: string;
  lastName: string;
  dateOfBirth: string;           // stored as formatted MM-DD-YYYY
  cellPhone: string;             // stored as formatted (XXX) XXX-XXXX
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string; // formatted
  preferredBorough: string;      // one of 5 boroughs or ""
  currentStreet: string;
  currentStreet2: string;
  currentCity: string;
  currentState: string;          // 2-letter state code
  currentZip: string;            // formatted XXXXX or XXXXX-XXXX
  viewedApartment: "yes" | "no" | "";
  viewingDate: string;           // YYYY-MM-DD (native date input value)

  /* --- Step 2: Rental Assistance + Background --- */
  hasAssistance: "yes" | "no" | "";
  assistProgram: string;
  otherProgramName: string;
  voucherBedrooms: string;
  voucherNumber: string;
  voucherExpDate: string;        // YYYY-MM-DD
  isTransferring: "yes" | "no" | "";
  fromShelter: "yes" | "no" | "";
  landlordName: string;
  landlordPhone: string;
  landlordEmail: string;
  cashAssistActive: "yes" | "no" | "";
  creditScore: string;

  /* --- Step 3: Occupants + Employment --- */
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

  /* --- Step 4: Income + Housing Specialist --- */
  incomeSources: string[];       // multi-select checkbox values
  otherIncomeSource: string;
  housingSpecName: string;
  housingSpecPhone: string;
  housingSpecEmail: string;

  /* --- Step 5: Payment --- */
  paymentConfirmed: boolean;     // checkbox acknowledgment

  /* --- Step 6: Authorization + Signature --- */
  isSmoker: "yes" | "no" | "";
  hasPets: "yes" | "no" | "";
  disclosureAgreed: boolean;
  signatureFirst: string;
  signatureLast: string;
}
```

### Landlord Form Data

```ts
interface RentalUnit {
  unitNumber: string;
  floor: string;
  bedrooms: string;
  rent: string;
}

interface LandlordFormData {
  /* --- Step 1: Property Address + Legal Ownership + Banking --- */
  propAddress: string;
  propAddress2: string;
  propCity: string;
  propState: string;
  propZip: string;
  ownershipType: string;
  taxId: string;                   // formatted EIN or SSN
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

  /* --- Step 2: Mailing Address + Contact + Auth Rep --- */
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

  /* --- Step 3: Building Details + Utilities --- */
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

  /* --- Step 4: Units for Rent --- */
  units: RentalUnit[];

  /* --- Step 5: Tenant Payment Methods + POC --- */
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

  /* --- Step 6: Submission + Signature --- */
  submitterTitle: string;
  signatureFirst: string;
  signatureLast: string;
  agreementConfirmed: boolean;
}
```

---

## 3. Shared Form Components

### 3.1 FormWizard

**File:** `src/components/forms/form-wizard.tsx`
**Directive:** `"use client"`

**Props Interface:**

```ts
interface FormWizardProps {
  /** Ordered step definitions. */
  steps: FormStepDef[];
  /** Current form data (untyped -- validated per-step). */
  data: Record<string, unknown>;
  /** Called when a field value changes. */
  onChange: (field: string, value: unknown) => void;
  /** Render function for each step's content. Receives stepIndex. */
  renderStep: (stepIndex: number) => React.ReactNode;
  /** Called when final step passes validation and user clicks Submit. */
  onSubmit: () => void;
  /** Optional: external loading state for submit button. */
  isSubmitting?: boolean;
  /** localStorage key for auto-save. */
  storageKey: string;
  /** Form title shown above progress bar. */
  title: string;
  className?: string;
}
```

**Behavior:**

- Maintains `currentStep` (0-indexed) in local state.
- On mount, checks `localStorage` for saved data via `storageKey`. If found, restores form data and asks user whether to resume or start fresh (inline banner, not a modal).
- Auto-saves to `localStorage` on every `onChange` call, debounced 500ms.
- "Next" button calls `steps[currentStep].validate(data)`. If errors exist, sets error state and scrolls to first error. If clean, advances `currentStep` by 1.
- "Previous" button decrements `currentStep` unconditionally (no validation on back).
- On final step, "Submit" button runs the final step's validation, then calls `onSubmit`.
- Clears `localStorage` on successful submit.
- Keyboard: Enter key on a field does NOT advance the step (prevents accidental navigation). Enter only submits on the final step when the submit button is focused.

**Progress Indicator:**

- Horizontal bar at the top of the form container.
- Shows numbered circles (1 through N) connected by a line.
- Completed steps: filled circle with checkmark icon, `bg-primary` background, white icon.
- Current step: filled circle with step number, `bg-primary` background, white text, pulsing ring animation (`ring-2 ring-primary/30`).
- Future steps: outlined circle with step number, `border-border` stroke, `text-text-muted`.
- Connecting line between circles: `bg-border` by default, `bg-primary` for completed segments.
- Below each circle: step label text, hidden on mobile (only visible `md:` and up). On mobile, show only the current step label centered below the progress bar.
- The progress bar is sticky within the form container on mobile (sticks below the navbar).

**Step Transitions (Framer Motion):**

- Wrap step content in `AnimatePresence mode="wait"`.
- Direction-aware: advancing slides content left-to-right (exit left, enter from right). Going back reverses the direction.
- Animation config:
  ```ts
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -80 : 80,
      opacity: 0,
    }),
  };
  // transition: { duration: 0.25, ease: "easeInOut" }
  ```
- Respect `prefers-reduced-motion`: when motion is reduced, switch to a simple opacity crossfade with `duration: 0.15`.

**Bottom Navigation Bar:**

- Fixed to the bottom of the viewport on mobile (`fixed bottom-0 left-0 right-0`), static inside the form container on desktop.
- White background with top border and subtle shadow: `bg-card border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.04)]`.
- Layout: "Previous" button on the left (hidden on step 0), "Next"/"Submit" button on the right.
- "Next" button: `bg-primary text-primary-foreground`, full `rounded-xl`, `min-h-[48px]`.
- "Previous" button: `bg-transparent border border-border text-text-secondary`, same sizing.
- "Submit" button (final step): same styling as "Next" but with text "Submit Application".
- During submission: button shows a spinner (CSS-only, no library needed) and is disabled.
- On mobile, add `pb-[env(safe-area-inset-bottom)]` padding to account for iOS home indicator.

**Accessibility:**

- `role="form"` on the outer container with `aria-label` set to `title` prop.
- Each step wrapped in `role="group"` with `aria-labelledby` pointing to the step heading.
- Progress indicator uses `aria-current="step"` on the active step circle.
- Completed steps announced via `aria-label="Step N, completed"`.
- Live region (`aria-live="polite"`) announces step changes: "Step N of M: [step label]".
- Error summary uses `aria-live="assertive"` and `role="alert"`.

---

### 3.2 FormField

**File:** `src/components/forms/form-field.tsx`

**Props Interface:**

```ts
interface FormFieldProps {
  /** Unique field name, used for htmlFor / aria linking. */
  name: string;
  /** Visible label text. */
  label: string;
  /** Whether the field is required. Adds "(required)" sr-only text. */
  required?: boolean;
  /** Error message string. When truthy, field enters error state. */
  error?: string;
  /** Optional helper text shown below the input. */
  description?: string;
  /** The input element(s) -- passed as children. */
  children: React.ReactNode;
  className?: string;
}
```

**Behavior:**

- Renders a `<div>` wrapper containing: `<label>`, children (the input), optional description `<span>`, and error `<span>`.
- The label has `htmlFor={name}` and renders in `text-sm font-medium text-text-primary`.
- When `required` is true, a visual asterisk is shown after the label in `text-error`.
- The description span has `id={name}-desc}` and renders in `text-xs text-text-muted mt-1`.
- The error span has `id={name}-error` and renders in `text-xs text-error mt-1` with a small alert icon (inline SVG).
- The wrapper passes `aria-describedby` to the child input, joining `{name}-desc` (if description exists) and `{name}-error` (if error exists). This is done by cloning the child element and injecting the aria attributes.
- When error is present, also injects `aria-invalid="true"` onto the child input.
- Transition: error message fades in with Framer Motion `AnimatePresence` (opacity 0 to 1, height 0 to auto, duration 150ms).

**Styling for inputs within FormField:**

All text inputs rendered inside FormField should use these Tailwind classes (applied by the input components themselves, not by FormField):

```
w-full min-h-[48px] px-4 rounded-[10px] border border-border bg-card
text-base text-text-primary placeholder:text-text-muted
transition-colors duration-200
hover:border-primary/40
focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
```

Error state override (when `aria-invalid="true"`):

```
border-error focus:border-error focus:ring-error/20
```

---

### 3.3 FormSection

**File:** `src/components/forms/form-section.tsx`

**Props Interface:**

```ts
interface FormSectionProps {
  /** Optional heading text for the group. */
  heading?: string;
  /** Optional description below heading. */
  description?: string;
  children: React.ReactNode;
  className?: string;
}
```

**Behavior:**

- Renders a `<fieldset>` with optional `<legend>` (visually styled as a heading, not default browser legend).
- Heading: `text-lg font-semibold text-text-primary mb-1`.
- Description: `text-sm text-text-secondary mb-4`.
- Children rendered in a `flex flex-col gap-5` container.
- Visual separator: a subtle top border `border-t border-border pt-6 mt-6` when used after another FormSection (achieved via CSS adjacent sibling selector in globals.css or via a `divider` prop).

---

### 3.4 PillSelect

**File:** `src/components/forms/pill-select.tsx`

**Props Interface:**

```ts
interface PillSelectProps {
  /** Field name for form binding. */
  name: string;
  /** Currently selected value (single-select). */
  value: string;
  /** Called with the newly selected value. */
  onChange: (value: string) => void;
  /** Available options. */
  options: readonly { value: string; label: string }[];
  /** Allow deselecting by clicking the active pill again. Default false. */
  allowDeselect?: boolean;
  /** Number of columns on mobile. Default 2. */
  columns?: 2 | 3 | 4;
  /** Error state -- adds red ring. */
  error?: boolean;
  className?: string;
}
```

**Behavior:**

- Renders a `role="radiogroup"` container with `aria-label` derived from the parent FormField label.
- Each option is a `role="radio"` button with `aria-checked`.
- Clicking a pill sets it as selected. If `allowDeselect` is true and the pill is already selected, it deselects.
- Keyboard: arrow keys move focus between pills, Space/Enter selects.
- Only one pill can be selected at a time.

**Styling:**

- Container: `grid gap-2` with `grid-cols-{columns}` on mobile, auto-fitting on desktop.
- Pill (default): `flex items-center justify-center min-h-[44px] px-4 py-2 rounded-full border border-border bg-card text-sm font-medium text-text-secondary cursor-pointer transition-all duration-200`.
- Pill (hover): `hover:border-primary/40 hover:text-text-primary`.
- Pill (selected): `border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30`.
- Pill (focus-visible): `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.
- Pill (error, none selected): all pills get `border-error/40` to indicate the group needs a selection.

**Animation:**

- On selection change, the selected pill scales briefly: `scale: [1, 1.03, 1]` over 150ms (Framer Motion `whileTap`).
- Respect `prefers-reduced-motion`: no scale animation.

---

### 3.5 YesNoToggle

**File:** `src/components/forms/yes-no-toggle.tsx`

**Props Interface:**

```ts
interface YesNoToggleProps {
  /** Field name for form binding. */
  name: string;
  /** Current value. Empty string = nothing selected. */
  value: "yes" | "no" | "";
  /** Called with "yes" or "no". */
  onChange: (value: "yes" | "no") => void;
  /** Custom labels. Default ["Yes", "No"]. */
  labels?: [string, string];
  /** Error state. */
  error?: boolean;
  className?: string;
}
```

**Behavior:**

- Renders as a `role="radiogroup"` with two `role="radio"` buttons side by side.
- Keyboard: Left/Right arrow keys toggle, Space/Enter selects focused option.
- Visual: two pill-shaped buttons joined together (like a segmented control).

**Styling:**

- Container: `inline-flex rounded-full border border-border bg-card p-1 gap-1`.
- Each option: `flex items-center justify-center min-h-[40px] min-w-[72px] px-5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer`.
- Unselected: `text-text-secondary hover:text-text-primary`.
- Selected "Yes": `bg-primary text-primary-foreground shadow-sm`.
- Selected "No": `bg-surface text-text-primary shadow-sm`.
- Focus-visible on each: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.
- Error (nothing selected): `border-error/60` on the container.

**Animation:**

- Selected state transitions with a sliding background indicator (Framer Motion `layoutId`). A shared `motion.div` with `layoutId="toggle-bg-{name}"` animates its position between the two options.
- Respect `prefers-reduced-motion`: instant switch, no slide.

---

### 3.6 RepeaterField

**File:** `src/components/forms/repeater-field.tsx`

**Props Interface:**

```ts
interface RepeaterFieldProps<T extends Record<string, unknown>> {
  /** Field name for the array in form data. */
  name: string;
  /** Current array of rows. */
  rows: T[];
  /** Called with the updated array. */
  onChange: (rows: T[]) => void;
  /** Factory function that returns a blank row object. */
  createRow: () => T;
  /** Render function for a single row. Receives row data, index, and change handler. */
  renderRow: (
    row: T,
    index: number,
    onRowChange: (field: keyof T, value: T[keyof T]) => void,
  ) => React.ReactNode;
  /** Minimum number of rows. Default 0. */
  minRows?: number;
  /** Maximum number of rows. Default 20. */
  maxRows?: number;
  /** Label for the "Add" button. Default "Add row". */
  addLabel?: string;
  className?: string;
}
```

**Behavior:**

- Renders a vertical list of rows, each with a remove button.
- "Add" button at the bottom creates a new row via `createRow()` and appends it.
- Remove button (X icon) on each row removes it. Disabled when `rows.length <= minRows`.
- Add button disabled when `rows.length >= maxRows`.
- Each row is numbered with a subtle label: "Occupant 1", "Occupant 2", etc. (or "Unit 1", "Unit 2" -- the label prefix comes from a `rowLabel` prop).

**Styling:**

- Each row: `rounded-xl border border-border bg-card p-4 md:p-5` with the row fields inside.
- Remove button: `absolute top-3 right-3` -- a small icon button (24x24 icon inside a 36x36 touch target), `text-text-muted hover:text-error transition-colors`.
- Add button: `inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-dashed border-border text-sm font-medium text-text-secondary hover:border-primary/40 hover:text-primary transition-colors`.
- Row label: `text-xs font-semibold text-text-muted uppercase tracking-wide mb-3`.

**Animation:**

- New rows animate in: `initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}` with `duration: 0.2`.
- Removed rows animate out: `exit={{ opacity: 0, height: 0 }}` with `duration: 0.15`.
- Wrapped in `AnimatePresence` with `key` set to a stable row ID (generated via incrementing counter on creation, NOT array index).

**Accessibility:**

- The add button has `aria-label="Add {rowLabel}"`.
- Each remove button has `aria-label="Remove {rowLabel} {index + 1}"`.
- When a row is added, focus moves to the first input in the new row.
- `aria-live="polite"` region announces additions and removals.

---

### 3.7 PaymentStep

**File:** `src/components/forms/payment-step.tsx`

**Props Interface:**

```ts
interface PaymentStepProps {
  /** Applicant's first + last name for the reference number. */
  applicantName: string;
  /** Whether the confirmation checkbox is checked. */
  confirmed: boolean;
  /** Called when checkbox state changes. */
  onConfirmChange: (confirmed: boolean) => void;
  className?: string;
}
```

**Behavior:**

- Generates a reference number from `applicantName` + current timestamp, formatted as: first 3 letters of first name (uppercased) + first 3 letters of last name (uppercased) + Unix timestamp last 6 digits. Example: "NYRNEL-482931". Stable per render (memoized).
- Displays the fee amount ($20.00), accepted payment methods, and instructions.
- Payment methods shown as visual cards (not interactive -- informational only):
  - Zelle -- with Zelle logo placeholder (text "Zelle" in a badge)
  - CashApp -- "$cashtag" style badge
  - Venmo -- Venmo badge
- Each method card shows: method name, Nyrell's payment handle/identifier (placeholder text: "Payment details provided after review"), and a note to include the reference number.
- Confirmation checkbox at the bottom.

**Styling:**

- Fee amount: `text-3xl font-bold text-text-primary` centered at the top.
- Fee label: `text-sm text-text-muted` above the amount.
- Reference number: displayed in a `rounded-lg bg-surface px-4 py-3 font-mono text-lg text-primary font-semibold` box, with a copy-to-clipboard button.
- Payment method cards: `flex items-center gap-4 rounded-xl border border-border bg-card p-4`. Method name in `font-semibold text-text-primary`, description in `text-sm text-text-secondary`.
- Instruction text: `text-sm text-text-secondary leading-relaxed` with key phrases in `font-medium text-text-primary`.
- Confirmation checkbox uses native checkbox styled via Tailwind (not HeroUI Checkbox, to keep it simple): `w-5 h-5 rounded accent-primary` with label in `text-sm text-text-primary`.

**Important note:** No actual payment processing. The reference number is for Nyrell to match manual payments to applications.

---

### 3.8 FormSuccess

**File:** `src/components/forms/form-success.tsx`

**Props Interface:**

```ts
interface FormSuccessProps {
  /** "tenant" or "landlord" -- adjusts messaging. */
  type: "tenant" | "landlord";
  /** Applicant's first name for personalization. */
  firstName: string;
  /** Reference number (tenant only, from payment step). */
  referenceNumber?: string;
  className?: string;
}
```

**Behavior:**

- Replaces the form content after successful submission.
- Animated entrance: checkmark icon scales in (Framer Motion spring), then text fades in below.

**Content -- Tenant:**

- Large animated checkmark icon in `text-success` (64px).
- Heading: "Application Submitted" in `text-2xl font-bold text-text-primary`.
- Body: "Thank you, {firstName}. Your application has been received and will be reviewed within 24 hours."
- Reference number reminder: "Your reference number is {referenceNumber}. Include this with your $20 processing fee payment."
- "Return Home" link styled as secondary button.

**Content -- Landlord:**

- Same checkmark and heading.
- Body: "Thank you, {firstName}. Your property listing has been received and will be reviewed within 24 hours."
- No reference number or payment reminder.
- "Return Home" link.

---

## 4. Tenant Application Form -- 6 Steps

### Step Definitions

```ts
const TENANT_STEPS: FormStepDef[] = [
  { id: "contact",       label: "Contact Info",       shortLabel: "Contact" },
  { id: "assistance",    label: "Rental Assistance",  shortLabel: "Assistance" },
  { id: "occupants",     label: "Occupants & Work",   shortLabel: "Occupants" },
  { id: "income",        label: "Income & Specialist", shortLabel: "Income" },
  { id: "payment",       label: "Processing Fee",     shortLabel: "Payment" },
  { id: "authorization", label: "Authorization",      shortLabel: "Sign" },
];
```

### Step 1: Contact Info

**Fields:**

| Field | Component | Validation | Notes |
|-------|-----------|------------|-------|
| firstName | Text input | Required, no digits | `autocomplete="given-name"` |
| lastName | Text input | Required, no digits | `autocomplete="family-name"` |
| dateOfBirth | Text input | Required, MM-DD-YYYY format | Auto-format: inserts dashes as user types. Placeholder "MM-DD-YYYY". `inputmode="numeric"`. |
| cellPhone | Text input | Required, 10 digits | Auto-format to (XXX) XXX-XXXX. `inputmode="tel"`, `autocomplete="tel"`. |
| email | Text input | Required, email format | `type="email"`, `autocomplete="email"`. |
| emergencyContactName | Text input | Optional, no digits if provided | |
| emergencyContactPhone | Text input | Optional, phone format if provided | |
| preferredBorough | PillSelect | Required | Options: Manhattan, Brooklyn, Queens, The Bronx, Staten Island. 2 columns mobile, 3 columns desktop. |
| currentStreet | Text input | Required | `autocomplete="address-line1"` |
| currentStreet2 | Text input | Optional | `autocomplete="address-line2"` |
| currentCity | Text input | Required | `autocomplete="address-level2"` |
| currentState | Select dropdown | Required | All 50 states + DC + territories. `autocomplete="address-level1"`. |
| currentZip | Text input | Required, 5 or 9 digits | Auto-format. `inputmode="numeric"`, `autocomplete="postal-code"`. |
| viewedApartment | YesNoToggle | Required | Labels: "Yes, I've viewed a unit" / "Not yet" |
| viewingDate | Date input | Required if viewedApartment = "no" | Label: "Preferred viewing date". `type="date"`, min = today. |

**Layout:**

- FormSection: "Personal Information" -- firstName + lastName on a 2-col grid, dateOfBirth full width, cellPhone + email on 2-col grid, emergencyContactName + emergencyContactPhone on 2-col grid.
- FormSection: "Preferred Borough" -- PillSelect full width.
- FormSection: "Current Address" -- currentStreet full width, currentStreet2 full width, currentCity + currentState + currentZip on a 3-col grid (city takes 2 cols on mobile).
- FormSection: "Apartment Viewing" -- viewedApartment full width, viewingDate conditional.

---

### Step 2: Rental Assistance + Background

**Fields:**

| Field | Component | Validation | Condition |
|-------|-----------|------------|-----------|
| hasAssistance | YesNoToggle | Required | Always shown |
| assistProgram | PillSelect | Required if hasAssistance=yes | Options: NYCHA, HPD, HCV (Section 8), CVR, HASA, CityFHEPS, Other. 3 columns. |
| otherProgramName | Text input | Required if assistProgram=Other | |
| voucherBedrooms | PillSelect | Required if hasAssistance=yes | Options: Studio, 1 Bed, 2 Bed, 3 Bed, 4 Bed, 5 Bed. 3 columns. |
| voucherNumber | Text input | Required if assistProgram in [HCV, NYCHA, HPD] | Label: "Voucher/Case Number" |
| voucherExpDate | Date input | Required if assistProgram in [HCV, NYCHA, HPD] | `type="date"` |
| isTransferring | YesNoToggle | Required if assistProgram in [HCV, NYCHA, HPD] | Label: "Are you transferring from another unit?" |
| fromShelter | YesNoToggle | Required | Always shown |
| landlordName | Text input | Required if fromShelter=no | Label: "Current Landlord Name" |
| landlordPhone | Text input | Required if fromShelter=no, phone format | |
| landlordEmail | Text input | Optional, email format if provided | |
| cashAssistActive | YesNoToggle | Required if hasAssistance=yes | Label: "Do you have active Cash Assistance?" |
| creditScore | PillSelect | Optional | Options: "Below 500", "500-549", "550-599", "600-649", "650-699", "700+". 3 columns. |

**Layout:**

- FormSection: "Rental Assistance" -- hasAssistance, then conditional block (assistProgram, otherProgramName, voucherBedrooms, voucherNumber + voucherExpDate on 2-col, isTransferring, cashAssistActive).
- FormSection: "Current Housing" -- fromShelter, then conditional landlord fields (landlordName, landlordPhone + landlordEmail on 2-col).
- FormSection: "Credit" -- creditScore.

**Conditional reveal animation:**

When `hasAssistance` changes to "yes", the assistance fields slide in from above with `initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}` at 200ms. When changed to "no", they slide out. Same pattern for all conditional blocks.

---

### Step 3: Occupants + Employment

**Fields:**

| Field | Component | Validation | Condition |
|-------|-----------|------------|-----------|
| hasOccupants | YesNoToggle | Required | |
| occupantCount | PillSelect | Required if hasOccupants=yes | Options: 1, 2, 3, 4, 5, 6, 7, 7+. 4 columns. |
| occupants | RepeaterField | Each row: name required, relationship required, over18 required | Shown if hasOccupants=yes. Pre-populate row count based on occupantCount. |
| currentlyWorking | YesNoToggle | Required | |
| employerName | Text input | Required if currentlyWorking=yes | |
| employerAddress | Text input | Optional | |
| supervisorName | Text input | Optional | |
| supervisorPhone | Text input | Optional, phone format | |
| payType | PillSelect (2 options) | Required if currentlyWorking=yes | Options: Hourly, Salary. 2 columns. |
| payAmount | Text input | Required if currentlyWorking=yes | `inputmode="decimal"`. Prefix "$" adornment. |
| hoursPerWeek | Text input | Required if payType=hourly | `inputmode="numeric"` |
| payFrequency | PillSelect | Required if payType=salary | Options: Weekly, Bi-Weekly, Monthly, Annually. 2 columns. |
| isVeteran | YesNoToggle | Required | |
| filedTaxes | YesNoToggle | Required | Label: "Did you file taxes last year?" |

**Occupant Row Layout:**

Each row renders: name (full width), relationship (full width), over18 as YesNoToggle (labels: "18 or over" / "Under 18"). Row label: "Occupant {n}".

**Layout:**

- FormSection: "Additional Occupants" -- hasOccupants, occupantCount, occupants repeater.
- FormSection: "Employment" -- currentlyWorking, conditional employment fields. payType + payAmount on same row, hoursPerWeek or payFrequency conditional below.
- FormSection: "Additional Info" -- isVeteran, filedTaxes side by side on desktop.

---

### Step 4: Income + Housing Specialist

**Fields:**

| Field | Component | Validation | Condition |
|-------|-----------|------------|-----------|
| incomeSources | Checkbox group | At least one selected | Options: Cash Assistance, SSI, Food Stamps (SNAP), Other, N/A. N/A is mutually exclusive -- selecting it deselects all others and vice versa. |
| otherIncomeSource | Text input | Required if "Other" is in incomeSources | |
| housingSpecName | Text input | Optional | |
| housingSpecPhone | Text input | Optional, phone format | |
| housingSpecEmail | Text input | Optional, email format | |

**Checkbox Group Implementation:**

Not a separate component -- built inline using native checkboxes styled with Tailwind. Each checkbox is a `min-h-[44px]` row with the checkbox input and label. The N/A mutual exclusivity logic:
- When user checks "N/A", uncheck all other options.
- When user checks any other option, uncheck "N/A".

**Layout:**

- FormSection: "Income Sources" -- checkboxes in a single column, otherIncomeSource conditional.
- FormSection: "Housing Specialist" -- description text: "If you have a housing specialist or case worker, provide their contact information." Fields: housingSpecName, housingSpecPhone + housingSpecEmail on 2-col.

---

### Step 5: Payment ($20 Processing Fee)

Uses the PaymentStep component. No additional fields beyond the confirmation checkbox.

The step is valid when `paymentConfirmed === true`.

---

### Step 6: Authorization + Signature

**Fields:**

| Field | Component | Validation |
|-------|-----------|------------|
| isSmoker | YesNoToggle | Required |
| hasPets | YesNoToggle | Required |
| disclosureAgreed | Checkbox | Required (must be true) |
| signatureFirst | Text input | Required, must match firstName from step 1 |
| signatureLast | Text input | Required, must match lastName from step 1 |

**Disclosure Text:**

A scrollable `<div>` with `max-h-[200px] overflow-y-auto rounded-lg bg-surface p-4 text-sm text-text-secondary leading-relaxed` containing:

> "I, the undersigned applicant, hereby authorize ItsRellEstate and Nyrell Nunez to verify any and all information provided in this application, including but not limited to employment history, rental history, credit history, and public records. I understand that providing false or misleading information may result in denial of my application. I acknowledge that a non-refundable $20 processing fee is required and that submission of this application does not guarantee housing placement. I agree to cooperate with all requests for additional documentation needed to process my application."

**Signature Section:**

- Heading: "Type Your Full Legal Name"
- Description: "Your typed name serves as your electronic signature."
- signatureFirst and signatureLast on a 2-col grid, pre-populated from step 1 data but editable.
- Validation: values must match the firstName/lastName from step 1 (case-insensitive trim comparison). If they don't match, error: "Signature must match the name provided in Step 1."
- Below the inputs, render the "signature" in a decorative display: the typed name in a cursive-style font. Use `font-style: italic` on Plus Jakarta Sans (no additional font needed) at `text-2xl` in `text-text-primary`, displayed in a `border-b-2 border-text-primary/20 pb-2 mt-4` container. This updates live as the user types.

**Layout:**

- FormSection: "Lifestyle" -- isSmoker + hasPets side by side.
- FormSection: "Disclosure" -- disclosure text block, then disclosureAgreed checkbox.
- FormSection: "Electronic Signature" -- signatureFirst + signatureLast, live preview.

---

## 5. Landlord Application Form -- 6 Steps

### Step Definitions

```ts
const LANDLORD_STEPS: FormStepDef[] = [
  { id: "property",   label: "Property & Ownership", shortLabel: "Property" },
  { id: "contact",    label: "Contact Info",         shortLabel: "Contact" },
  { id: "building",   label: "Building Details",     shortLabel: "Building" },
  { id: "units",      label: "Units for Rent",       shortLabel: "Units" },
  { id: "payments",   label: "Payment Methods",      shortLabel: "Payments" },
  { id: "submission", label: "Submit & Sign",        shortLabel: "Submit" },
];
```

### Step 1: Property Address + Legal Ownership + Banking

**Fields:**

| Field | Component | Validation | Condition |
|-------|-----------|------------|-----------|
| propAddress | Text input | Required | `autocomplete="address-line1"` |
| propAddress2 | Text input | Optional | |
| propCity | Text input | Required | |
| propState | Select | Required | |
| propZip | Text input | Required, zip format | |
| ownershipType | Select | Required | Options: LLC, Corporation, Individual, Partnership, Trust, Other |
| taxId | Text input | Required | Auto-format: EIN (XX-XXXXXXX) for non-Individual, SSN (XXX-XX-XXXX) for Individual. Label changes dynamically: "EIN" or "Social Security Number". |
| legalBusinessName | Text input | Required if ownershipType != Individual | |
| legalName | Text input | Required if ownershipType = Individual | Label: "Full Legal Name" |
| paymentPreference | PillSelect (2 options) | Required | Options: "Electronic (ACH)", "Check". 2 columns. |
| bankName | Select | Required if paymentPreference=electronic | Options: Bank of America, Capital One, Chase, Citibank, Citizens, Fifth Third, Goldman Sachs, HSBC, Huntington, KeyBank, M&T Bank, PNC, Regions, Santander, TD Bank, Truist, U.S. Bank, Wells Fargo, Other. |
| bankNameOther | Text input | Required if bankName=Other | |
| accountType | PillSelect | Required if paymentPreference=electronic | Options: Checking, Savings. 2 columns. |
| accountName | Text input | Required if paymentPreference=electronic | Label: "Name on Account" |
| bankAcct | Text input | Required if paymentPreference=electronic | `inputmode="numeric"`, masked display. |
| bankAcctConfirm | Text input | Required if paymentPreference=electronic | Must match bankAcct. |
| bankRouting | Text input | Required if paymentPreference=electronic | `inputmode="numeric"`, exactly 9 digits. |
| bankRoutingConfirm | Text input | Required if paymentPreference=electronic | Must match bankRouting. |

**Layout:**

- FormSection: "Property Address" -- propAddress, propAddress2, propCity + propState + propZip (3-col).
- FormSection: "Legal Ownership" -- ownershipType, taxId, legalBusinessName or legalName (conditional).
- FormSection: "Payment Preference" -- paymentPreference, then conditional banking fields: bankName, bankNameOther (conditional), accountType, accountName, bankAcct + bankAcctConfirm (2-col), bankRouting + bankRoutingConfirm (2-col).

---

### Step 2: Mailing Address + Contact + Authorized Rep

**Fields:**

| Field | Component | Validation | Condition |
|-------|-----------|------------|-----------|
| mailAddress | Text input | Required | |
| mailAddress2 | Text input | Optional | |
| mailCity | Text input | Required | |
| mailState | Select | Required | |
| mailZip | Text input | Required, zip format | |
| llFirstName | Text input | Required, no digits | |
| llLastName | Text input | Required, no digits | |
| llPhone | Text input | Required, phone format | |
| llEmail | Text input | Required, email format | |
| hasAuthRep | YesNoToggle | Required | Label: "Do you have an authorized representative?" |
| authRepFirst | Text input | Required if hasAuthRep=yes | |
| authRepLast | Text input | Required if hasAuthRep=yes | |
| authRepPhone | Text input | Required if hasAuthRep=yes, phone format | |
| authRepEmail | Text input | Required if hasAuthRep=yes, email format | |

**Layout:**

- FormSection: "Mailing Address" -- same layout pattern as property address.
- FormSection: "Owner/Manager Contact" -- llFirstName + llLastName (2-col), llPhone + llEmail (2-col).
- FormSection: "Authorized Representative" -- hasAuthRep, conditional rep fields: authRepFirst + authRepLast (2-col), authRepPhone + authRepEmail (2-col).

---

### Step 3: Building Details + Utilities

**Fields:**

| Field | Component | Validation |
|-------|-----------|------------|
| yearBuilt | Select | Required. Options: 1900 through 2026 (descending). |
| totalStories | Select | Required. Options: 1 through 50. |
| residentialUnits | Text input | Required, numeric. `inputmode="numeric"`. |
| commercialUnits | Text input | Optional, numeric. |
| rentStabilized | YesNoToggle | Required |

**Utility Fields (8 selects):**

Each utility field is a Select dropdown with specific options:

| Field | Label | Options |
|-------|-------|---------|
| utilHeating | Heating | "Gas (Owner Pays)", "Gas (Tenant Pays)", "Oil (Owner Pays)", "Oil (Tenant Pays)", "Electric (Owner Pays)", "Electric (Tenant Pays)", "Steam (Owner Pays)", "N/A" |
| utilCooking | Cooking Gas | "Owner Pays", "Tenant Pays", "Electric (Owner)", "Electric (Tenant)", "N/A" |
| utilHotWater | Hot Water | "Gas (Owner Pays)", "Gas (Tenant Pays)", "Oil (Owner Pays)", "Oil (Tenant Pays)", "Electric (Owner Pays)", "Electric (Tenant Pays)", "N/A" |
| utilElectric | Electricity | "Owner Pays", "Tenant Pays", "Shared Meter", "N/A" |
| utilWater | Water | "Owner Pays", "Tenant Pays", "Included", "N/A" |
| utilSewer | Sewer | "Owner Pays", "Tenant Pays", "Included", "N/A" |
| utilTrash | Trash Removal | "Owner Pays", "Tenant Pays", "Municipal", "N/A" |
| utilAC | Air Conditioning | "Central (Owner)", "Central (Tenant)", "Window Units (Tenant)", "None", "N/A" |

**Layout:**

- FormSection: "Building Information" -- yearBuilt + totalStories (2-col), residentialUnits + commercialUnits (2-col), rentStabilized.
- FormSection: "Utilities" -- description text: "Select who is responsible for each utility." Utilities in a 2-col grid (each select is one cell).

---

### Step 4: Units for Rent

Uses RepeaterField with `RentalUnit` rows.

**Row Layout:**

Each row renders: unitNumber + floor (2-col), bedrooms + rent (2-col). Row label: "Unit {n}".

| Field | Component | Validation |
|-------|-----------|------------|
| unitNumber | Text input | Required. Label: "Unit/Apt Number". |
| floor | Select | Required. Options: Basement, Ground, 1st through 20th. |
| bedrooms | Select | Required. Options: Studio, 1 Bedroom, 2 Bedrooms, 3 Bedrooms, 4 Bedrooms, 5 Bedrooms. |
| rent | Text input | Required, numeric. `inputmode="decimal"`. Prefix "$". Label: "Monthly Rent". |

**Constraints:**

- Minimum 1 row (cannot remove the last unit).
- Maximum 20 rows.
- The step is valid when at least 1 complete unit row exists.

---

### Step 5: Tenant Payment Methods + Point of Contact

**Fields:**

| Field | Component | Validation | Condition |
|-------|-----------|------------|-----------|
| payCheck | Checkbox | At least one payment method required | |
| payZelle | Checkbox | | |
| payACH | Checkbox | | |
| checkPayable | Text input | Required if payCheck=true | Label: "Make checks payable to" |
| checkAddress | Text input | Required if payCheck=true | |
| checkCity | Text input | Required if payCheck=true | |
| checkState | Select | Required if payCheck=true | |
| checkZip | Text input | Required if payCheck=true, zip format | |
| zellePhone | Text input | Required if payZelle=true, phone format | |
| zelleEmail | Text input | Optional if payZelle=true, email format | |
| achAccount | Text input | Required if payACH=true, numeric | |
| achRouting | Text input | Required if payACH=true, 9 digits | |
| pocFirstName | Text input | Required, no digits | |
| pocLastName | Text input | Required, no digits | |
| pocPhone | Text input | Required, phone format | |
| pocEmail | Text input | Required, email format | |

**Layout:**

- FormSection: "Accepted Payment Methods" -- description: "Select all methods you accept for tenant rent payments." Three checkboxes (payCheck, payZelle, payACH). Each checkbox reveals its conditional fields when checked.
- Check section: checkPayable, checkAddress, checkCity + checkState + checkZip (3-col).
- Zelle section: zellePhone + zelleEmail (2-col).
- ACH section: achAccount + achRouting (2-col).
- FormSection: "Point of Contact" -- description: "Who should tenants contact for maintenance and inquiries?" pocFirstName + pocLastName (2-col), pocPhone + pocEmail (2-col).

---

### Step 6: Submission + Signature

**Fields:**

| Field | Component | Validation |
|-------|-----------|------------|
| submitterTitle | Select | Required. Options: Owner, Property Manager, Assistant Manager, Managing Agent, Authorized Representative, Other. |
| agreementConfirmed | Checkbox | Required (must be true) |
| signatureFirst | Text input | Required |
| signatureLast | Text input | Required |

**Agreement Text:**

> "I certify that all information provided in this application is true and accurate to the best of my knowledge. I understand that providing false information may result in disqualification. I authorize ItsRellEstate and Nyrell Nunez to verify any information provided and to share relevant details with prospective tenants as needed for the matching process."

**Layout:**

- FormSection: "Submitter Information" -- submitterTitle full width.
- FormSection: "Agreement" -- agreement text block (same scrollable container style as tenant disclosure), agreementConfirmed checkbox.
- FormSection: "Electronic Signature" -- signatureFirst + signatureLast (2-col), live signature preview (same decorative display as tenant form).

---

## 6. Validation Rules (`src/lib/form-validators.ts`)

All validators are pure functions. Each takes a value and returns either `null` (valid) or an error message string.

### Individual Field Validators

```ts
/** Required field -- fails on empty string, null, undefined, empty array. */
function required(value: unknown, label: string): string | null;

/** No digits allowed in the string. */
function noDigits(value: string, label: string): string | null;
// Regex: /\d/
// Error: "{label} must not contain numbers"

/** Email format. */
function email(value: string): string | null;
// Regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Error: "Enter a valid email address"

/** Phone: exactly 10 digits after stripping non-digits. */
function phone(value: string): string | null;
// Strip all non-digits, check length === 10
// Error: "Enter a valid 10-digit phone number"

/** Zip code: 5 digits, or 5+4 with dash. */
function zipCode(value: string): string | null;
// Regex after stripping dashes: /^\d{5}(\d{4})?$/
// Error: "Enter a valid ZIP code (XXXXX or XXXXX-XXXX)"

/** Date of birth: MM-DD-YYYY, valid ranges. */
function dateOfBirth(value: string): string | null;
// Parse MM, DD, YYYY from the formatted string
// Month 1-12, Day 1-31, Year 1900-currentYear
// Must be a real date (no Feb 31)
// Must be at least 18 years old
// Error: "Enter a valid date of birth (MM-DD-YYYY)" or "Applicant must be at least 18 years old"

/** EIN: 9 digits, format XX-XXXXXXX. */
function ein(value: string): string | null;
// Strip non-digits, check length === 9
// Error: "Enter a valid EIN (XX-XXXXXXX)"

/** SSN: 9 digits, format XXX-XX-XXXX. */
function ssn(value: string): string | null;
// Strip non-digits, check length === 9
// Error: "Enter a valid Social Security Number"

/** Numeric only (for rent, units, etc.). Allows decimals. */
function numeric(value: string, label: string): string | null;
// Regex: /^\d+(\.\d{0,2})?$/
// Error: "{label} must be a number"

/** Routing number: exactly 9 digits. */
function routingNumber(value: string): string | null;
// Strip non-digits, check length === 9
// Error: "Routing number must be 9 digits"

/** Confirm match: two values must be identical. */
function confirmMatch(value: string, compareValue: string, label: string): string | null;
// Error: "{label} does not match"

/** Signature match: typed name must match original (case-insensitive, trimmed). */
function signatureMatch(typed: string, original: string, label: string): string | null;
// Error: "Signature must match the name provided in Step 1"
```

### Input Formatters (`src/lib/form-formatters.ts`)

Formatters are applied onChange, transforming raw input into formatted display values. They strip invalid characters and insert formatting characters.

```ts
/** Phone: strips non-digits, formats as (XXX) XXX-XXXX. Max 10 digits. */
function formatPhone(raw: string): string;

/** Zip: strips non-digits, formats as XXXXX or XXXXX-XXXX. Max 9 digits. */
function formatZip(raw: string): string;

/** DOB: strips non-digits, formats as MM-DD-YYYY. Max 8 digits. */
function formatDOB(raw: string): string;

/** EIN: strips non-digits, formats as XX-XXXXXXX. Max 9 digits. */
function formatEIN(raw: string): string;

/** SSN: strips non-digits, formats as XXX-XX-XXXX. Max 9 digits. */
function formatSSN(raw: string): string;

/** Currency: strips non-numeric except decimal, formats with 2 decimal places. */
function formatCurrency(raw: string): string;
```

**Formatter behavior:** Each formatter receives the raw input value on every keystroke. It strips all characters that don't belong, then inserts the formatting characters at the correct positions. The cursor position should be maintained as much as possible (this is handled by storing the digit count before formatting and repositioning the cursor after React re-renders via a `useEffect`).

### Step-Level Validators

Each step has a validate function that calls the individual validators on relevant fields and returns a `ValidationErrors` object.

```ts
function validateTenantStep1(data: TenantFormData): ValidationErrors;
function validateTenantStep2(data: TenantFormData): ValidationErrors;
function validateTenantStep3(data: TenantFormData): ValidationErrors;
function validateTenantStep4(data: TenantFormData): ValidationErrors;
function validateTenantStep5(data: TenantFormData): ValidationErrors;
function validateTenantStep6(data: TenantFormData): ValidationErrors;

function validateLandlordStep1(data: LandlordFormData): ValidationErrors;
function validateLandlordStep2(data: LandlordFormData): ValidationErrors;
function validateLandlordStep3(data: LandlordFormData): ValidationErrors;
function validateLandlordStep4(data: LandlordFormData): ValidationErrors;
function validateLandlordStep5(data: LandlordFormData): ValidationErrors;
function validateLandlordStep6(data: LandlordFormData): ValidationErrors;
```

Conditional required logic lives inside these step validators. Example for tenant step 2:

```ts
function validateTenantStep2(data: TenantFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  errors.hasAssistance = required(data.hasAssistance, "Rental assistance");
  errors.fromShelter = required(data.fromShelter, "Shelter status");

  if (data.hasAssistance === "yes") {
    errors.assistProgram = required(data.assistProgram, "Assistance program");
    errors.voucherBedrooms = required(data.voucherBedrooms, "Voucher bedrooms");
    errors.cashAssistActive = required(data.cashAssistActive, "Cash assistance");

    if (data.assistProgram === "Other") {
      errors.otherProgramName = required(data.otherProgramName, "Program name");
    }

    const sectionEightPrograms = ["HCV", "NYCHA", "HPD"];
    if (sectionEightPrograms.includes(data.assistProgram)) {
      errors.voucherNumber = required(data.voucherNumber, "Voucher number");
      errors.voucherExpDate = required(data.voucherExpDate, "Voucher expiration");
      errors.isTransferring = required(data.isTransferring, "Transfer status");
    }
  }

  if (data.fromShelter === "no") {
    errors.landlordName = required(data.landlordName, "Landlord name");
    const phoneErr = phone(data.landlordPhone);
    if (phoneErr) errors.landlordPhone = phoneErr;
  }

  // Remove null entries (valid fields)
  return Object.fromEntries(
    Object.entries(errors).filter(([, v]) => v !== null)
  ) as ValidationErrors;
}
```

### Validation Timing

- **On blur**: Individual field validation runs when the user leaves a field. The error is shown immediately. This gives instant feedback without being intrusive during typing.
- **On "Next" click**: Full step validation runs. All errors for the current step are shown simultaneously. The page scrolls to the first error field.
- **On field change (after error shown)**: If a field has a visible error, re-validate on every change so the error clears immediately when the user fixes it. Do NOT show new errors on change -- only clear existing ones.
- **Error display**: FormField shows the error message with a red left border accent on the input and red error text below. The error message fades in with AnimatePresence.

---

## 7. localStorage Auto-Save (`src/lib/form-storage.ts`)

```ts
const TENANT_STORAGE_KEY = "itsrellestate-tenant-draft";
const LANDLORD_STORAGE_KEY = "itsrellestate-landlord-draft";

interface SavedFormState<T> {
  data: T;
  currentStep: number;
  savedAt: number; // Unix timestamp
}

/** Save form state. Called by FormWizard on debounced onChange. */
function saveFormState<T>(key: string, data: T, currentStep: number): void;

/** Load saved form state. Returns null if nothing saved or if data is older than 7 days. */
function loadFormState<T>(key: string): SavedFormState<T> | null;

/** Clear saved form state. Called on successful submit. */
function clearFormState(key: string): void;

/** Check if a saved state exists (for showing the "resume" banner). */
function hasSavedState(key: string): boolean;
```

**Expiration:** Saved drafts expire after 7 days. The `loadFormState` function checks `savedAt` and returns `null` if expired.

**Resume Banner:** When FormWizard mounts and detects saved state, it shows a banner at the top of the form:

- Background: `bg-primary/5 border border-primary/20 rounded-xl p-4`.
- Text: "You have a saved draft from {relative time ago}. Would you like to continue where you left off?"
- Two buttons: "Resume Draft" (primary style) and "Start Fresh" (text button).
- "Start Fresh" clears localStorage and resets form to initial state.
- "Resume Draft" loads the saved data and jumps to the saved step.
- The banner dismisses after the user makes a choice.

---

## 8. UX / UI Specification

### Page Layout (Both Forms)

- Navbar renders in its scrolled (pill) state by default on form pages. This is already the case -- the form pages include the Navbar component and the page scrolls.
- Below navbar: page title and subtitle (already exist in the placeholder pages).
- Form container: `max-w-[640px] mx-auto`. This width keeps form fields at a comfortable reading width and avoids overly wide inputs on desktop.
- Form card: `rounded-2xl bg-card border border-border shadow-card p-6 md:p-8`.
- Footer below the form.

### Progress Indicator (Detailed Visual Spec)

```
Desktop:
  [1]----[2]----[3]----[4]----[5]----[6]
  Label  Label  Label  Label  Label  Label

Mobile:
  [1]--[2]--[3]--[4]--[5]--[6]
         "Current Step Label"
```

- Circle size: `w-8 h-8` (32px) on mobile, `w-10 h-10` (40px) on desktop.
- Circle text: `text-xs font-semibold` on mobile, `text-sm font-semibold` on desktop.
- Connecting line: `h-0.5` (2px height), spans between circles.
- Completed circle: `bg-primary text-primary-foreground` with a checkmark SVG icon (16px).
- Current circle: `bg-primary text-primary-foreground` with the step number. Subtle pulse: `shadow-[0_0_0_4px_rgba(var(--color-primary-rgb),0.15)]` animated.
- Future circle: `bg-card border-2 border-border text-text-muted`.
- Completed line segment: `bg-primary`.
- Future line segment: `bg-border`.
- Step labels below circles: `text-xs text-text-muted` for future, `text-xs font-medium text-primary` for current, `text-xs text-text-secondary` for completed. Hidden on mobile.
- Mobile current label: centered `text-sm font-medium text-text-primary mt-2`.
- Top margin from page subtitle: `mt-8`.
- Bottom margin to form content: `mb-8`.

### Color Token Usage

| Element | Token |
|---------|-------|
| Form card background | `bg-card` |
| Form card border | `border-border` |
| Form card shadow | `shadow-card` |
| Input background | `bg-card` |
| Input border (default) | `border-border` |
| Input border (hover) | `border-primary/40` |
| Input border (focus) | `border-primary` with `ring-primary/20` |
| Input border (error) | `border-error` with `ring-error/20` |
| Input text | `text-text-primary` |
| Input placeholder | `text-text-muted` |
| Label text | `text-text-primary` |
| Required asterisk | `text-error` |
| Error message text | `text-error` |
| Helper/description text | `text-text-muted` |
| Section heading | `text-text-primary` |
| Section description | `text-text-secondary` |
| Primary button | `bg-primary text-primary-foreground` |
| Secondary button | `bg-transparent border-border text-text-secondary` |
| Pill (default) | `bg-card border-border text-text-secondary` |
| Pill (selected) | `bg-primary/10 border-primary text-primary` |
| Pill (hover) | `border-primary/40 text-text-primary` |
| Progress completed | `bg-primary text-primary-foreground` |
| Progress current | `bg-primary text-primary-foreground` |
| Progress future | `bg-card border-border text-text-muted` |
| Success icon | `text-success` |
| Payment ref number | `text-primary` on `bg-surface` |

### Conditional Field Reveals

When a toggle or selection causes new fields to appear:

1. The conditional block is wrapped in `AnimatePresence`.
2. Enter animation: `initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}` with `transition={{ duration: 0.2, ease: "easeOut" }}`.
3. Exit animation: `exit={{ opacity: 0, height: 0 }}` with `transition={{ duration: 0.15, ease: "easeIn" }}`.
4. The block has `overflow: hidden` during animation to prevent content from spilling.
5. With `prefers-reduced-motion`: instant show/hide, no animation.

### Mobile-Specific Adaptations

- All form fields are single-column on mobile (`< md`). The 2-col and 3-col grids collapse to 1 column.
- Bottom navigation bar is fixed to viewport bottom on mobile with safe area padding.
- When bottom nav is fixed, the form content has `pb-[80px]` (navigation height + breathing room) to prevent content from being hidden behind it.
- PillSelect columns: use the `columns` prop. Most pill groups use 2 columns on mobile.
- Select dropdowns use native `<select>` on mobile for the best UX (native picker). On desktop, they use a styled custom select (HeroUI Select or a Tailwind-styled `<select>`).
- Date inputs use native `<input type="date">` on all devices.
- Progress indicator labels hidden on mobile, replaced by a single centered label for the current step.

### Desktop Enhancements

- 2-col and 3-col field grids active at `md:` breakpoint.
- Bottom navigation is static (inside the form card, not fixed to viewport).
- Progress indicator shows all step labels.
- Form card has more padding: `p-8` vs `p-6` on mobile.

### Success Screen

After successful form submission:

1. Form content replaced by FormSuccess component.
2. Animated checkmark: a circle with `bg-success/10` scales from 0 to 1 (spring animation, 400ms), then the checkmark SVG inside strokes in (SVG path animation, 300ms delay).
3. Title fades in: 200ms delay after checkmark.
4. Body text fades in: 100ms after title.
5. Button fades in: 100ms after body.
6. The page scrolls to the top of the success content.
7. With `prefers-reduced-motion`: all elements appear immediately, no animation.

---

## 9. Constants (`src/lib/form-constants.ts`)

### Borough Options

```ts
const BOROUGH_OPTIONS = [
  { value: "manhattan", label: "Manhattan" },
  { value: "brooklyn", label: "Brooklyn" },
  { value: "queens", label: "Queens" },
  { value: "bronx", label: "The Bronx" },
  { value: "staten-island", label: "Staten Island" },
] as const;
```

### US State Options

```ts
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  // ... all 50 states + DC + territories
  { value: "WY", label: "Wyoming" },
] as const;
```

### Assistance Program Options

```ts
const ASSIST_PROGRAM_OPTIONS = [
  { value: "NYCHA", label: "NYCHA" },
  { value: "HPD", label: "HPD" },
  { value: "HCV", label: "HCV (Section 8)" },
  { value: "CVR", label: "CVR" },
  { value: "HASA", label: "HASA" },
  { value: "CityFHEPS", label: "CityFHEPS" },
  { value: "Other", label: "Other" },
] as const;
```

### Voucher Bedroom Options

```ts
const VOUCHER_BEDROOM_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "1", label: "1 Bed" },
  { value: "2", label: "2 Bed" },
  { value: "3", label: "3 Bed" },
  { value: "4", label: "4 Bed" },
  { value: "5", label: "5 Bed" },
] as const;
```

### Credit Score Options

```ts
const CREDIT_SCORE_OPTIONS = [
  { value: "below-500", label: "Below 500" },
  { value: "500-549", label: "500 - 549" },
  { value: "550-599", label: "550 - 599" },
  { value: "600-649", label: "600 - 649" },
  { value: "650-699", label: "650 - 699" },
  { value: "700+", label: "700+" },
] as const;
```

### Occupant Count Options

```ts
const OCCUPANT_COUNT_OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "7+", label: "7+" },
] as const;
```

### Pay Frequency Options

```ts
const PAY_FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
] as const;
```

### Income Source Options

```ts
const INCOME_SOURCE_OPTIONS = [
  { value: "cash-assistance", label: "Cash Assistance" },
  { value: "ssi", label: "SSI" },
  { value: "food-stamps", label: "Food Stamps (SNAP)" },
  { value: "other", label: "Other" },
  { value: "na", label: "N/A" },
] as const;
```

### Ownership Type Options

```ts
const OWNERSHIP_TYPE_OPTIONS = [
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "individual", label: "Individual" },
  { value: "partnership", label: "Partnership" },
  { value: "trust", label: "Trust" },
  { value: "other", label: "Other" },
] as const;
```

### Bank Options

```ts
const BANK_OPTIONS = [
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
```

### Floor Options (Landlord)

```ts
const FLOOR_OPTIONS = [
  { value: "basement", label: "Basement" },
  { value: "ground", label: "Ground" },
  ...Array.from({ length: 20 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}${ordinalSuffix(i + 1)} Floor`,
  })),
] as const;
```

### Bedroom Options (Landlord Units)

```ts
const UNIT_BEDROOM_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "1", label: "1 Bedroom" },
  { value: "2", label: "2 Bedrooms" },
  { value: "3", label: "3 Bedrooms" },
  { value: "4", label: "4 Bedrooms" },
  { value: "5", label: "5 Bedrooms" },
] as const;
```

### Submitter Title Options

```ts
const SUBMITTER_TITLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "property-manager", label: "Property Manager" },
  { value: "assistant-manager", label: "Assistant Manager" },
  { value: "managing-agent", label: "Managing Agent" },
  { value: "authorized-rep", label: "Authorized Representative" },
  { value: "other", label: "Other" },
] as const;
```

### Utility Options

All 8 utility option sets are defined as named constants following the patterns listed in Step 3 of the landlord form above. They follow the format:

```ts
const UTIL_HEATING_OPTIONS = [
  { value: "gas-owner", label: "Gas (Owner Pays)" },
  { value: "gas-tenant", label: "Gas (Tenant Pays)" },
  // ... etc
] as const;
```

---

## 10. Form Submission

### V1 Behavior (No Backend)

On submit:

1. Final step validation runs.
2. If valid, set `isSubmitting = true` (shows spinner on button).
3. Simulate a brief delay: `await new Promise(r => setTimeout(r, 1200))`. This gives the user feedback that something is happening.
4. Log the complete form data to `console.info` (development only -- strip in production via environment check).
5. Clear localStorage.
6. Set state to show FormSuccess.
7. Scroll to top.

### Future Backend (V2)

The submit handler will be refactored to POST to a Next.js API route (`/api/apply/tenant` or `/api/apply/landlord`) that:

1. Validates server-side (reuses the same validator functions).
2. Writes to Google Sheets via API.
3. Sends confirmation email.
4. Returns success/error response.

The form infrastructure is designed to make this swap trivial -- replace the simulated delay with an actual fetch call.

---

## 11. Accessibility Checklist

- [ ] `role="form"` with `aria-label` on form container.
- [ ] Each step uses `role="group"` with `aria-labelledby`.
- [ ] Progress indicator: `aria-current="step"` on active, `aria-label` on each circle.
- [ ] `aria-live="polite"` region announces step transitions.
- [ ] `aria-live="assertive"` + `role="alert"` on error summary.
- [ ] Every input has a `<label>` with matching `htmlFor`.
- [ ] `aria-describedby` links inputs to error messages and helper text.
- [ ] `aria-invalid="true"` on fields with errors.
- [ ] `aria-required="true"` on required fields.
- [ ] PillSelect and YesNoToggle use `role="radiogroup"` / `role="radio"` with `aria-checked`.
- [ ] RepeaterField add/remove buttons have descriptive `aria-label`.
- [ ] All interactive elements have visible `:focus-visible` states.
- [ ] Touch targets minimum 44x44px (`min-h-[44px]` or `min-h-[48px]`).
- [ ] Color contrast WCAG AA minimum on all text.
- [ ] Form is fully operable via keyboard (Tab, Shift+Tab, Arrow keys, Space, Enter).
- [ ] Animations respect `prefers-reduced-motion`.
- [ ] Error messages are not conveyed by color alone (icon + text).

---

## 12. Implementation Order

### Phase 1: Shared Infrastructure
1. `form-types.ts` -- all interfaces
2. `form-constants.ts` -- all option lists
3. `form-validators.ts` -- all validation functions
4. `form-formatters.ts` -- all input formatters
5. `form-storage.ts` -- localStorage helpers

### Phase 2: Shared Components
1. `form-field.tsx`
2. `form-section.tsx`
3. `pill-select.tsx`
4. `yes-no-toggle.tsx`
5. `repeater-field.tsx`
6. `form-wizard.tsx` (depends on all above)
7. `payment-step.tsx`
8. `form-success.tsx`

### Phase 3: Tenant Form
1. Build step 1 (Contact Info) and test
2. Build step 2 (Assistance + Background) and test
3. Build step 3 (Occupants + Employment) and test
4. Build step 4 (Income + Housing Specialist) and test
5. Build step 5 (Payment) and test
6. Build step 6 (Authorization + Signature) and test
7. End-to-end flow test

### Phase 4: Landlord Form
1. Build step 1 (Property + Ownership + Banking) and test
2. Build step 2 (Mailing + Contact + Auth Rep) and test
3. Build step 3 (Building Details + Utilities) and test
4. Build step 4 (Units for Rent) and test
5. Build step 5 (Payment Methods + POC) and test
6. Build step 6 (Submission + Signature) and test
7. End-to-end flow test

### Phase 5: Polish
1. Test at 375px, 768px, 1280px breakpoints
2. Keyboard-only navigation test
3. Screen reader test (VoiceOver / NVDA)
4. `prefers-reduced-motion` test
5. localStorage save/restore test
6. Error state edge cases
7. Performance audit (no unnecessary re-renders)
